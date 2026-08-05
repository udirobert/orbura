#!/usr/bin/env python3
"""Generate a small, deterministic seed dataset for the AutoScientist Data Visualization track."""
import random
import json
from pathlib import Path

OUT_DIR = Path(__file__).parent / "data"

CATEGORIES = {
    "line": {"title": "Monthly Trend", "xlabel": "Month", "ylabel": "Value"},
    "bar": {"title": "Category Comparison", "xlabel": "Category", "ylabel": "Count"},
    "scatter": {"title": "Scatter Analysis", "xlabel": "Index", "ylabel": "Measurement"},
    "pie": {"title": "Share Breakdown", "xlabel": "", "ylabel": ""},
}


def make_series(n=5):
    labels = [f"P{i+1}" for i in range(n)]
    values = [random.randint(5, 100) for _ in range(n)]
    return labels, values


def data_table(labels, values):
    return "\n".join(f"- {label}: {value}" for label, value in zip(labels, values))


def chart_code(chart_type, labels, values, meta):
    labels_str = ", ".join(f'"{l}"' for l in labels)
    values_str = ", ".join(str(v) for v in values)
    if chart_type == "line":
        code = (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"plt.plot(labels, values, marker='o')\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.xlabel('{meta['xlabel']}')\n"
            f"plt.ylabel('{meta['ylabel']}')\n"
            f"plt.show()"
        )
    elif chart_type == "bar":
        code = (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"plt.bar(labels, values, color='steelblue')\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.xlabel('{meta['xlabel']}')\n"
            f"plt.ylabel('{meta['ylabel']}')\n"
            f"plt.show()"
        )
    elif chart_type == "scatter":
        code = (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"plt.scatter(range(len(values)), values)\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.xlabel('{meta['xlabel']}')\n"
            f"plt.ylabel('{meta['ylabel']}')\n"
            f"plt.show()"
        )
    elif chart_type == "pie":
        code = (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"plt.pie(values, labels=labels, autopct='%1.1f%%')\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.show()"
        )
    else:
        raise ValueError(chart_type)
    return code


def chart_to_code_example(chart_type, labels, values, meta):
    instruction = f"Write Python matplotlib code for a {chart_type} chart using the data below."
    input_text = f"Chart type: {chart_type}\n{data_table(labels, values)}"
    output = chart_code(chart_type, labels, values, meta)
    return instruction, input_text, output


def chart_qa_example(chart_type, labels, values, meta):
    q_type = random.choice(["max", "min", "sum", "value", "compare"])
    if q_type == "max":
        answer = max(values)
        idx = values.index(answer)
        question = "What is the maximum value and which category has it?"
        output = f"{answer} ({labels[idx]})"
    elif q_type == "min":
        answer = min(values)
        idx = values.index(answer)
        question = "What is the minimum value and which category has it?"
        output = f"{answer} ({labels[idx]})"
    elif q_type == "sum":
        output = str(sum(values))
        question = "What is the sum of all values?"
    elif q_type == "value":
        idx = random.randrange(len(labels))
        output = str(values[idx])
        question = f"What is the value for category {labels[idx]}?"
    else:  # compare
        i, j = random.sample(range(len(labels)), 2)
        output = labels[i] if values[i] > values[j] else labels[j]
        question = f"Which category has a higher value, {labels[i]} or {labels[j]}?"
    instruction = "Answer the question using the chart data."
    input_text = f"Data:\n{data_table(labels, values)}\nQuestion: {question}"
    return instruction, input_text, output


def code_to_desc_example(chart_type, labels, values, meta):
    code = chart_code(chart_type, labels, values, meta)
    max_val = max(values)
    min_val = min(values)
    max_label = labels[values.index(max_val)]
    min_label = labels[values.index(min_val)]
    instruction = "Describe what the following matplotlib code will plot."
    input_text = code
    output = (
        f"The code creates a {chart_type} chart titled '{meta['title']}'. "
        f"It shows {len(values)} categories. "
        f"The highest value is {max_val} ({max_label}) and the lowest is {min_val} ({min_label})."
    )
    return instruction, input_text, output


def fix_code_example(chart_type, labels, values, meta):
    correct = chart_code(chart_type, labels, values, meta)
    # Inject one common typo/bug depending on chart type
    buggy = (
        correct.replace("plt.bar", "plt.barr", 1)
        .replace("plt.plot", "plt.plt", 1)
        .replace("plt.pie", "plt.piee", 1)
        .replace("plt.scatter", "plt.scater", 1)
    )
    instruction = "The following matplotlib code contains a bug. Fix it."
    input_text = buggy
    output = correct
    return instruction, input_text, output


def make_example(task):
    chart_type = random.choice(list(CATEGORIES.keys()))
    labels, values = make_series(n=random.randint(4, 7))
    meta = CATEGORIES[chart_type]
    if task == "chart_to_code":
        inst, inp, out = chart_to_code_example(chart_type, labels, values, meta)
    elif task == "chart_qa":
        inst, inp, out = chart_qa_example(chart_type, labels, values, meta)
    elif task == "code_to_desc":
        inst, inp, out = code_to_desc_example(chart_type, labels, values, meta)
    elif task == "fix_code":
        inst, inp, out = fix_code_example(chart_type, labels, values, meta)
    else:
        raise ValueError(task)
    messages = [
        {"role": "user", "content": f"{inst}\n\n{inp}"},
        {"role": "assistant", "content": out},
    ]
    return {
        "task": task,
        "category": "data_visualization",
        "instruction": inst,
        "input": inp,
        "output": out,
        "messages": messages,
    }


def generate(count, seed, filename):
    random.seed(seed)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tasks = ["chart_to_code", "chart_qa", "code_to_desc", "fix_code"]
    examples = [make_example(random.choice(tasks)) for _ in range(count)]
    path = OUT_DIR / filename
    with open(path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")
    print(f"Wrote {count} examples to {path}")


if __name__ == "__main__":
    generate(100, seed=42, filename="seed_100.jsonl")
    generate(20, seed=2024, filename="val_20.jsonl")

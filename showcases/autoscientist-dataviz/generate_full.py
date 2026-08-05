#!/usr/bin/env python3
"""Full-scale, deterministic dataset generator for the AutoScientist Data Visualization track."""
import random
import json
import re
import statistics
from pathlib import Path

OUT_DIR = Path(__file__).parent / "data"

CATEGORIES = {
    "line": {"title": "Monthly Trend", "xlabel": "Month", "ylabel": "Value"},
    "bar": {"title": "Category Comparison", "xlabel": "Category", "ylabel": "Count"},
    "scatter": {"title": "Scatter Analysis", "xlabel": "Index", "ylabel": "Measurement"},
    "pie": {"title": "Share Breakdown", "xlabel": "", "ylabel": ""},
}

LABEL_POOLS = {
    "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    "products": ["Phone", "Laptop", "Tablet", "Watch", "Speaker", "Camera", "Drone", "Console"],
    "regions": ["NA", "EU", "APAC", "LATAM", "MENA", "Africa", "Oceania"],
    "teams": ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"],
}

TITLE_POOLS = {
    "line": ["Monthly Sales", "Weekly Traffic", "Daily Active Users", "Temperature Trend", "Stock Price"],
    "bar": ["Sales by Region", "Revenue by Product", "Scores by Team", "Counts by Category", "Units Sold"],
    "scatter": ["Height vs Weight", "Price vs Rating", "Age vs Income", "Ads vs Clicks", "Stress vs Performance"],
    "pie": ["Market Share", "Budget Allocation", "Device Mix", "Channel Distribution", "Category Share"],
}


def sample_labels(n):
    eligible = [v for v in LABEL_POOLS.values() if len(v) >= n]
    pool = random.choice(eligible)
    return random.sample(pool, n)


def sample_meta(chart_type):
    return {
        "title": random.choice(TITLE_POOLS[chart_type]),
        "xlabel": "Category" if chart_type in ("bar", "pie") else ("X" if chart_type == "scatter" else "Period"),
        "ylabel": "Value" if chart_type == "line" else ("Y" if chart_type == "scatter" else "Count"),
    }

TASK_WEIGHTS = [
    ("chart_qa", 45),
    ("chart_choice", 5),
    ("chart_to_code", 15),
    ("fix_code", 10),
    ("code_to_desc", 10),
    ("style_transfer", 10),
    ("data_to_code", 5),
]

BUG_TYPES = [
    "typo",
    "missing_import",
    "show_before_labels",
    "mismatched_lengths",
    "invalid_kwarg",
    "string_values",
    "swapped_axes",
]


def weighted_task():
    population = []
    for task, weight in TASK_WEIGHTS:
        population.extend([task] * weight)
    return random.choice(population)


def make_series(n=None):
    if n is None:
        n = random.randint(4, 8)
    labels = sample_labels(n)
    values = [random.randint(5, 200) for _ in range(n)]
    return labels, values


def data_table(labels, values):
    return "\n".join(f"- {label}: {value}" for label, value in zip(labels, values))


def csv_table(labels, values):
    return "category,value\n" + "\n".join(f"{label},{value}" for label, value in zip(labels, values))


def chart_code(chart_type, labels, values, meta):
    labels_str = ", ".join(f'"{l}"' for l in labels)
    values_str = ", ".join(str(v) for v in values)
    if chart_type == "line":
        return (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"plt.plot(labels, values, marker='o')\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.xlabel('{meta['xlabel']}')\n"
            f"plt.ylabel('{meta['ylabel']}')\n"
            f"plt.grid(True, linestyle='--', alpha=0.5)\n"
            f"plt.show()"
        )
    if chart_type == "bar":
        return (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"plt.bar(labels, values, color='steelblue')\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.xlabel('{meta['xlabel']}')\n"
            f"plt.ylabel('{meta['ylabel']}')\n"
            f"plt.xticks(rotation=45)\n"
            f"plt.tight_layout()\n"
            f"plt.show()"
        )
    if chart_type == "scatter":
        return (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"x = list(range(len(values)))\n"
            f"plt.scatter(x, values, color='coral')\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.xlabel('{meta['xlabel']}')\n"
            f"plt.ylabel('{meta['ylabel']}')\n"
            f"plt.show()"
        )
    if chart_type == "pie":
        return (
            f"import matplotlib.pyplot as plt\n"
            f"labels = [{labels_str}]\n"
            f"values = [{values_str}]\n"
            f"plt.pie(values, labels=labels, autopct='%1.1f%%')\n"
            f"plt.title('{meta['title']}')\n"
            f"plt.show()"
        )
    raise ValueError(chart_type)


def style_transfer_code(original_code, target, chart_type):
    if target == "line_to_bar":
        code = original_code.replace("plt.plot(", "plt.bar(")
        code = re.sub(r"marker='[^']*'", "color='seagreen'", code)
        return code
    if target == "bar_to_line":
        code = original_code.replace("plt.bar(", "plt.plot(")
        code = re.sub(r"color='[^']*'", "marker='o', color='crimson'", code)
        if "plt.grid(" not in code:
            code = code.replace("plt.show()", "plt.grid(True)\nplt.show()")
        return code
    if target == "add_grid":
        if "plt.grid(" not in original_code:
            return original_code.replace("plt.show()", "plt.grid(True, color='gray', linestyle=':')\nplt.show()")
        return original_code
    if target == "rotate_labels":
        return original_code.replace("plt.show()", "plt.xticks(rotation=90)\nplt.tight_layout()\nplt.show()")
    if target == "change_color":
        new_color = random.choice(["darkorange", "crimson", "seagreen", "mediumpurple", "coral"])
        if chart_type == "line":
            return re.sub(r"marker='o'", f"marker='o', color='{new_color}'", original_code)
        if chart_type in ("bar", "scatter"):
            return re.sub(r"color='[^']*'", f"color='{new_color}'", original_code)
        return original_code
    raise ValueError(target)


def chart_to_code_example(chart_type, labels, values, meta):
    instruction = f"Write Python matplotlib code for a {chart_type} chart using the data below."
    input_text = f"Chart type: {chart_type}\n{data_table(labels, values)}"
    output = chart_code(chart_type, labels, values, meta)
    return instruction, input_text, output


def data_to_code_example(chart_type, labels, values, meta):
    instruction = f"Convert the CSV data into a Python matplotlib {chart_type} chart."
    input_text = csv_table(labels, values)
    output = chart_code(chart_type, labels, values, meta)
    return instruction, input_text, output


def code_to_desc_example(chart_type, labels, values, meta):
    code = chart_code(chart_type, labels, values, meta)
    max_val, min_val = max(values), min(values)
    max_label = labels[values.index(max_val)]
    min_label = labels[values.index(min_val)]
    avg = round(statistics.mean(values), 1)
    median = round(statistics.median(values), 1)
    increasing = all(values[i] <= values[i + 1] for i in range(len(values) - 1))
    trend = "increasing" if increasing else "mixed"
    instruction = "Describe what the following matplotlib code will plot, including key statistics."
    input_text = code
    output = (
        f"This code creates a {chart_type} chart titled '{meta['title']}'. "
        f"It has {len(values)} categories, an average of {avg}, a median of {median}, "
        f"a maximum of {max_val} ({max_label}), a minimum of {min_val} ({min_label}), "
        f"and an overall {trend} trend."
    )
    return instruction, input_text, output


def style_transfer_example(chart_type, labels, values, meta):
    code = chart_code(chart_type, labels, values, meta)
    if chart_type == "line":
        target = random.choice(["line_to_bar", "add_grid", "rotate_labels", "change_color"])
    elif chart_type == "bar":
        target = random.choice(["bar_to_line", "add_grid", "rotate_labels", "change_color"])
    elif chart_type == "scatter":
        target = random.choice(["add_grid", "rotate_labels", "change_color"])
    else:
        target = random.choice(["add_grid", "rotate_labels"])
    instruction = "Modify the following matplotlib code according to the request."
    request = {
        "line_to_bar": "Change this to a bar chart with green bars.",
        "bar_to_line": "Change this to a line chart with red markers and grid.",
        "add_grid": "Add a dotted grid to the plot.",
        "rotate_labels": "Rotate the x-axis labels by 90 degrees.",
        "change_color": "Change the color of the chart.",
    }[target]
    input_text = f"{request}\n\n{code}"
    output = style_transfer_code(code, target, chart_type)
    return instruction, input_text, output


def fix_code_example(chart_type, labels, values, meta):
    correct = chart_code(chart_type, labels, values, meta)
    allowed_bugs = {
        "line": ["typo", "missing_import", "show_before_labels", "mismatched_lengths", "invalid_kwarg", "string_values", "swapped_axes"],
        "bar": ["typo", "missing_import", "show_before_labels", "mismatched_lengths", "string_values", "swapped_axes"],
        "scatter": ["typo", "missing_import", "show_before_labels", "mismatched_lengths", "string_values", "swapped_axes"],
        "pie": ["typo", "missing_import", "show_before_labels", "mismatched_lengths", "string_values"],
    }[chart_type]
    attempts = 0
    while attempts < 10:
        bug = random.choice(allowed_bugs)
        buggy = correct
        if bug == "typo":
            buggy = (
                correct.replace("plt.bar", "plt.barr", 1)
                .replace("plt.plot", "plt.plt", 1)
                .replace("plt.pie", "plt.piee", 1)
                .replace("plt.scatter", "plt.scater", 1)
            )
        elif bug == "missing_import":
            buggy = correct.replace("import matplotlib.pyplot as plt\n", "")
        elif bug == "show_before_labels":
            lines = correct.split("\n")
            show_idx = lines.index("plt.show()")
            plot_idx = next(i for i, l in enumerate(lines) if l.startswith("plt.plot") or l.startswith("plt.bar") or l.startswith("plt.scatter") or l.startswith("plt.pie"))
            lines.pop(show_idx)
            lines.insert(plot_idx + 1, "plt.show()")
            buggy = "\n".join(lines)
        elif bug == "mismatched_lengths":
            buggy = correct.replace(str(values[-1]), str(values[-1]) + ", 0", 1)
        elif bug == "invalid_kwarg":
            buggy = correct.replace("plt.plot(labels, values, marker='o')", "plt.plot(labels, values, kind='bar')", 1)
        elif bug == "string_values":
            values_str = ", ".join(f'"{v}"' for v in values)
            buggy = correct.replace(", ".join(str(v) for v in values), values_str, 1)
        elif bug == "swapped_axes":
            buggy = correct.replace(f"plt.{chart_type}(labels, values", f"plt.{chart_type}(values, labels", 1)
        if buggy != correct:
            break
        attempts += 1
    instruction = "The following matplotlib code has a bug. Return the corrected code."
    input_text = buggy
    output = correct
    return instruction, input_text, output


def complete_code_example(chart_type, labels, values, meta):
    full = chart_code(chart_type, labels, values, meta)
    lines = full.split("\n")
    # Remove the last 1-2 plotting lines
    drop = random.randint(1, min(2, len(lines) - 2))
    prefix = "\n".join(lines[:-drop])
    instruction = "Complete the following matplotlib code so it renders the chart correctly."
    input_text = prefix
    output = full
    return instruction, input_text, output


def hard_chart_qa_example(chart_type, labels, values, meta):
    qa_type = random.choice([
        "max", "min", "sum", "avg", "median", "range", "pct_total", "ratio",
        "rank", "above_avg", "trend", "difference", "doubled_total", "pct_of_max",
        "combined_greater", "percentage_change", "counterfactual", "new_average"
    ])
    total = sum(values)
    avg = statistics.mean(values)
    if qa_type == "max":
        val = max(values)
        label = labels[values.index(val)]
        question = "What is the maximum value and which category has it?"
        output = f"{val} ({label})"
    elif qa_type == "min":
        val = min(values)
        label = labels[values.index(val)]
        question = "What is the minimum value and which category has it?"
        output = f"{val} ({label})"
    elif qa_type == "sum":
        question = "What is the sum of all values?"
        output = str(total)
    elif qa_type == "avg":
        question = "What is the average value across all categories?"
        output = str(round(avg, 1))
    elif qa_type == "median":
        question = "What is the median value?"
        output = str(round(statistics.median(values), 1))
    elif qa_type == "range":
        question = "What is the range of the values?"
        output = str(max(values) - min(values))
    elif qa_type == "pct_total":
        idx = random.randrange(len(labels))
        pct = round(100 * values[idx] / total, 1)
        question = f"What percentage of the total does {labels[idx]} represent?"
        output = f"{pct}%"
    elif qa_type == "ratio":
        i, j = random.sample(range(len(labels)), 2)
        ratio = round(values[i] / values[j], 2)
        question = f"What is the ratio of {labels[i]} to {labels[j]}?"
        output = str(ratio)
    elif qa_type == "rank":
        sorted_labels = [l for _, l in sorted(zip(values, labels), reverse=True)]
        rank = random.randint(1, min(3, len(sorted_labels)))
        question = f"Which category has the {['', 'first', 'second', 'third'][rank]} highest value?"
        output = sorted_labels[rank - 1]
    elif qa_type == "above_avg":
        count = sum(1 for v in values if v > avg)
        question = "How many categories have values above the average?"
        output = str(count)
    elif qa_type == "trend":
        increasing = all(values[i] <= values[i + 1] for i in range(len(values) - 1))
        decreasing = all(values[i] >= values[i + 1] for i in range(len(values) - 1))
        if increasing:
            output = "Increasing"
        elif decreasing:
            output = "Decreasing"
        else:
            output = "Mixed"
        question = "Describe the overall trend of the values."
    elif qa_type == "difference":
        i, j = random.sample(range(len(labels)), 2)
        diff = values[i] - values[j]
        question = f"How much larger is {labels[i]} than {labels[j]}?"
        output = str(diff)
    elif qa_type == "doubled_total":
        idx = random.randrange(len(labels))
        new_total = total + values[idx]
        question = f"If {labels[idx]}'s value doubled, what would the new total be?"
        output = str(new_total)
    elif qa_type == "pct_of_max":
        idx = random.randrange(len(labels))
        pct = round(100 * values[idx] / max(values), 1)
        question = f"What percentage of the maximum value is {labels[idx]}?"
        output = f"{pct}%"
    elif qa_type == "combined_greater":
        i, j = random.sample(range(len(labels)), 2)
        combined = values[i] + values[j]
        question = f"Do {labels[i]} and {labels[j]} together make up more than half the total?"
        output = "Yes" if combined > total / 2 else "No"
    elif qa_type == "percentage_change":
        i, j = random.sample(range(len(labels)), 2)
        change = round((values[j] - values[i]) / values[i] * 100, 1)
        question = f"What is the percentage change from {labels[i]} to {labels[j]}?"
        output = f"{change}%"
    elif qa_type == "counterfactual":
        idx = random.randrange(len(labels))
        hypothetical = random.randint(20, 200)
        new_total = total - values[idx] + hypothetical
        question = f"If {labels[idx]} were {hypothetical} instead of {values[idx]}, what would the new total be?"
        output = str(new_total)
    elif qa_type == "new_average":
        idx = random.randrange(len(labels))
        hypothetical = random.randint(20, 200)
        new_total = total - values[idx] + hypothetical
        new_avg = round(new_total / len(values), 1)
        question = f"If {labels[idx]} were {hypothetical} instead of {values[idx]}, what would the new average be?"
        output = str(new_avg)
    else:
        raise ValueError(qa_type)
    instruction = "Answer the question using the chart data."
    input_text = f"Data:\n{data_table(labels, values)}\nQuestion: {question}"
    return instruction, input_text, output


def chart_choice_example(chart_type, labels, values, meta):
    instruction = "Which matplotlib chart type is most appropriate for the data below?"
    input_text = data_table(labels, values)
    answer = chart_type
    if chart_type == "line":
        reason = "A line chart is best for showing trends across ordered categories."
    elif chart_type == "bar":
        reason = "A bar chart is best for comparing values across distinct categories."
    elif chart_type == "scatter":
        reason = "A scatter chart is best for showing the relationship between two numerical variables."
    elif chart_type == "pie":
        reason = "A pie chart is best for showing proportions of a whole."
    output = f"{answer} — {reason}"
    return instruction, input_text, output


def make_example():
    chart_type = random.choice(list(CATEGORIES.keys()))
    labels, values = make_series()
    meta = sample_meta(chart_type)
    task = weighted_task()
    if chart_type == "pie" and task == "style_transfer":
        chart_type = random.choice(["line", "bar", "scatter"])
        meta = sample_meta(chart_type)
    if task == "chart_to_code":
        inst, inp, out = chart_to_code_example(chart_type, labels, values, meta)
    elif task == "data_to_code":
        inst, inp, out = data_to_code_example(chart_type, labels, values, meta)
    elif task == "code_to_desc":
        inst, inp, out = code_to_desc_example(chart_type, labels, values, meta)
    elif task == "style_transfer":
        inst, inp, out = style_transfer_example(chart_type, labels, values, meta)
    elif task == "fix_code":
        inst, inp, out = fix_code_example(chart_type, labels, values, meta)
    elif task == "chart_qa":
        inst, inp, out = hard_chart_qa_example(chart_type, labels, values, meta)
    elif task == "chart_choice":
        inst, inp, out = chart_choice_example(chart_type, labels, values, meta)
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
    path = OUT_DIR / filename
    with open(path, "w") as f:
        for _ in range(count):
            ex = make_example()
            f.write(json.dumps(ex) + "\n")
    print(f"Wrote {count} examples to {path}")


if __name__ == "__main__":
    generate(10_000, seed=42, filename="train_10k.jsonl")
    generate(2_000, seed=2024, filename="val_2k.jsonl")

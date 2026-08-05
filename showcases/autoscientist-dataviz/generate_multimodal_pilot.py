#!/usr/bin/env python3
"""Generate a 100-row multimodal chart QA pilot for Adaption AutoScientist."""
import io
import json
import os
import random
import statistics
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image

try:
    from datasets import Dataset, Features, Value, Image as HFImage
    from huggingface_hub import HfApi
except ImportError:
    raise SystemExit("pip install datasets huggingface_hub")

REPO_ROOT = Path(__file__).parents[2]
ENV_PATH = REPO_ROOT / ".env"
OUT_DIR = Path(__file__).parent / "data" / "multimodal_pilot"

def load_env():
    if os.environ.get("HF_TOKEN"):
        return
    if ENV_PATH.exists():
        with open(ENV_PATH) as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                if line.startswith("export "):
                    line = line[7:]
                k, _, v = line.partition("=")
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k == "HF_TOKEN":
                    os.environ["HF_TOKEN"] = v


def savefig_to_image(fig, dpi=120):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=dpi)
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert('RGB')


def fig_bytes(fig, dpi=120):
    img = savefig_to_image(fig, dpi)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


LABEL_POOLS = {
    "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "regions": ["NA", "EU", "APAC", "LATAM", "MENA", "Oceania", "Africa"],
    "products": ["Phone", "Laptop", "Tablet", "Watch", "Speaker", "Camera", "Drone", "Console"],
    "teams": ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"],
}

COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f']


def sample_labels(n, pool_name=None):
    if pool_name is None:
        pool_name = random.choice(list(LABEL_POOLS.keys()))
    pool = LABEL_POOLS[pool_name]
    return random.sample(pool, n)


def make_values(n, min_val=20, max_val=200, allow_neg=False):
    if allow_neg:
        return [random.randint(-max_val, max_val) for _ in range(n)]
    return [random.randint(min_val, max_val) for _ in range(n)]


def bar_chart(labels, values, title):
    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(labels, values, color=COLORS[0])
    ax.bar_label(bars, fmt='%d')
    ax.set_title(title)
    ax.set_xlabel('Category')
    ax.set_ylabel('Value')
    return fig


def grouped_bar(labels, groups, title):
    # labels are categories, groups is list of series names, data is list of list
    x = range(len(labels))
    width = 0.8 / len(groups)
    fig, ax = plt.subplots(figsize=(7, 4))
    for i, (group, vals) in enumerate(groups):
        offset = width * (i - (len(groups) - 1) / 2)
        bars = ax.bar([xi + offset for xi in x], vals, width, label=group, color=COLORS[i % len(COLORS)])
        ax.bar_label(bars, fmt='%d', fontsize=7)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_title(title)
    ax.set_xlabel('Category')
    ax.set_ylabel('Value')
    ax.legend(title='Series')
    return fig


def stacked_bar(labels, groups, title):
    x = range(len(labels))
    fig, ax = plt.subplots(figsize=(7, 4))
    bottom = [0] * len(labels)
    for i, (group, vals) in enumerate(groups):
        ax.bar(x, vals, bottom=bottom, label=group, color=COLORS[i % len(COLORS)])
        bottom = [b + v for b, v in zip(bottom, vals)]
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    for j, label in enumerate(labels):
        total = bottom[j]
        ax.text(j, total + 3, str(total), ha='center', fontsize=8)
    ax.set_title(title)
    ax.set_xlabel('Category')
    ax.set_ylabel('Value')
    ax.legend(title='Series')
    return fig


def line_chart(labels, values, title, multi=None):
    fig, ax = plt.subplots(figsize=(6, 4))
    if multi is None:
        ax.plot(labels, values, marker='o', color=COLORS[0])
        for i, v in enumerate(values):
            ax.text(i, v + 5, str(v), ha='center', fontsize=7)
    else:
        for idx, (name, vals) in enumerate(multi):
            ax.plot(labels, vals, marker='o', label=name, color=COLORS[idx % len(COLORS)])
        ax.legend(title='Series')
    ax.set_title(title)
    ax.set_xlabel('Period')
    ax.set_ylabel('Value')
    ax.tick_params(axis='x', rotation=45)
    return fig


def scatter_chart(labels, values, title):
    fig, ax = plt.subplots(figsize=(6, 4))
    x = list(range(len(values)))
    ax.scatter(x, values, color=COLORS[0], s=100)
    for i, (xi, v, label) in enumerate(zip(x, values, labels)):
        ax.text(xi, v + 4, str(v), ha='center', fontsize=7)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45)
    ax.set_title(title)
    ax.set_xlabel('Category')
    ax.set_ylabel('Value')
    return fig


def pie_chart(labels, values, title, donut=False):
    fig, ax = plt.subplots(figsize=(5, 5))
    wedges, texts, autotexts = ax.pie(values, labels=labels, autopct='%1.1f%%', startangle=140, pctdistance=0.75 if donut else 0.6)
    if donut:
        centre_circle = plt.Circle((0, 0), 0.50, fc='white')
        ax.add_artist(centre_circle)
    ax.set_title(title)
    return fig


def area_chart(labels, values, title, multi=None):
    fig, ax = plt.subplots(figsize=(6, 4))
    x = range(len(labels))
    if multi is None:
        ax.fill_between(x, values, alpha=0.5, color=COLORS[0])
        ax.plot(x, values, marker='o', color=COLORS[0])
        for i, v in enumerate(values):
            ax.text(i, v + 5, str(v), ha='center', fontsize=7)
    else:
        for idx, (name, vals) in enumerate(multi):
            ax.fill_between(x, vals, alpha=0.3, color=COLORS[idx % len(COLORS)])
            ax.plot(x, vals, marker='o', label=name, color=COLORS[idx % len(COLORS)])
        ax.legend(title='Series')
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45)
    ax.set_title(title)
    ax.set_xlabel('Period')
    ax.set_ylabel('Value')
    return fig


def mixed_chart(labels, values, title):
    # bar + line overlay
    fig, ax1 = plt.subplots(figsize=(6, 4))
    bars = ax1.bar(labels, values, color=COLORS[1], alpha=0.6, label='Values')
    ax1.bar_label(bars, fmt='%d')
    ax1.set_xlabel('Category')
    ax1.set_ylabel('Value', color=COLORS[1])
    ax2 = ax1.twinx()
    cumulative = [sum(values[:i+1]) for i in range(len(values))]
    ax2.plot(labels, cumulative, color=COLORS[0], marker='o', linewidth=2, label='Cumulative')
    ax2.set_ylabel('Cumulative', color=COLORS[0])
    ax1.set_title(title)
    fig.tight_layout()
    return fig


def answer_format(answer, reasoning):
    return f"ANSWER: {answer}\nREASONING: {reasoning}"


def make_row(seed=None):
    if seed is not None:
        random.seed(seed)
    n = random.randint(4, 7)
    labels = sample_labels(n)
    values = make_values(n)
    total = sum(values)
    avg = round(statistics.mean(values), 1)
    max_val = max(values)
    min_val = min(values)
    max_label = labels[values.index(max_val)]
    min_label = labels[values.index(min_val)]

    chart = random.choice([
        "bar", "grouped_bar", "stacked_bar", "line", "multi_line", "scatter",
        "pie", "donut", "area", "mixed"
    ])

    if chart == "bar":
        title = random.choice(["Sales by Region", "Revenue by Product", "Scores by Team"])
        fig = bar_chart(labels, values, title)
        qtype = random.choice(["max", "sum", "pct_total"])
        if qtype == "max":
            question = "Which category has the highest value in the bar chart?"
            ans = f"{max_label} with {max_val}"
            reason = f"{max_label} has the tallest bar at {max_val}; the highest value in the dataset is {max_val}."
        elif qtype == "sum":
            question = "What is the sum of all values shown in the bar chart?"
            ans = str(total)
            reason = f"The values are {', '.join(map(str, values))}. Their sum is {total}."
        else:
            idx = random.randrange(n)
            pct = round(100 * values[idx] / total, 1)
            question = f"What percentage of the total does {labels[idx]} represent in the bar chart?"
            ans = f"{pct}%"
            reason = f"{labels[idx]} is {values[idx]} out of a total of {total}. {values[idx]}/{total} × 100 = {pct}%."

    elif chart == "grouped_bar":
        g1 = make_values(n)
        g2 = make_values(n)
        groups = [("Q1", g1), ("Q2", g2)]
        title = "Quarterly Comparison"
        fig = grouped_bar(labels, groups, title)
        qtype = random.choice(["max_group", "sum_group"])
        if qtype == "max_group":
            sums = [(name, sum(vals)) for name, vals in groups]
            best = max(sums, key=lambda x: x[1])
            question = "Which group has the largest combined value across all categories?"
            ans = f"{best[0]} with {best[1]}"
            reason = f"{best[0]} totals {best[1]}, larger than the other group."
        else:
            sums = [(name, sum(vals)) for name, vals in groups]
            ans = '; '.join(f"{name}: {s}" for name, s in sums)
            question = "What are the total values for each group in the grouped bar chart?"
            reason = f"Summing each series gives {ans}."

    elif chart == "stacked_bar":
        s1 = make_values(n)
        s2 = make_values(n)
        groups = [("Online", s1), ("Retail", s2)]
        title = "Stacked Channel Sales"
        fig = stacked_bar(labels, groups, title)
        totals = [s1[i] + s2[i] for i in range(n)]
        max_total = max(totals)
        max_total_label = labels[totals.index(max_total)]
        question = "Which category has the largest total stacked value?"
        ans = f"{max_total_label} with {max_total}"
        reason = f"{max_total_label}'s stacked total is {max_total}, the highest."

    elif chart == "line":
        title = random.choice(["Monthly Sales", "Weekly Traffic", "Stock Price"])
        fig = line_chart(labels, values, title)
        qtype = random.choice(["trend", "max", "change"])
        if qtype == "trend":
            increasing = all(values[i] <= values[i+1] for i in range(n-1))
            decreasing = all(values[i] >= values[i+1] for i in range(n-1))
            trend = "increasing" if increasing else ("decreasing" if decreasing else "mixed")
            question = "Describe the overall trend in the line chart."
            ans = trend.capitalize()
            reason = f"The values move in a {trend} pattern across the categories."
        elif qtype == "max":
            question = "Which point reaches the highest value in the line chart?"
            ans = f"{max_label} at {max_val}"
            reason = f"The peak of the line is at {max_label} with value {max_val}."
        else:
            i, j = random.sample(range(n), 2)
            change = round((values[j] - values[i]) / values[i] * 100, 1)
            question = f"What is the percentage change from {labels[i]} to {labels[j]} in the line chart?"
            ans = f"{change}%"
            reason = f"From {values[i]} to {values[j]} is a change of {values[j] - values[i]}, which is {change}% of {values[i]}."

    elif chart == "multi_line":
        s1 = make_values(n)
        s2 = make_values(n)
        multi = [("Series A", s1), ("Series B", s2)]
        title = "Multi-line Comparison"
        fig = line_chart(labels, values, title, multi=multi)
        sums = [(name, sum(vals)) for name, vals in multi]
        best = max(sums, key=lambda x: x[1])
        question = "Which series has the highest total value across all categories?"
        ans = f"{best[0]} with {best[1]}"
        reason = f"{best[0]} sums to {best[1]}, which is the largest total."

    elif chart == "scatter":
        title = random.choice(["Price vs Rating", "Age vs Income"])
        fig = scatter_chart(labels, values, title)
        question = "Which point is the highest on the y-axis in the scatter chart?"
        ans = f"{max_label} with {max_val}"
        reason = f"The highest point corresponds to {max_label} at y={max_val}."

    elif chart in ("pie", "donut"):
        title = random.choice(["Market Share", "Budget Allocation", "Device Mix"])
        fig = pie_chart(labels, values, title, donut=(chart == "donut"))
        idx = random.randrange(n)
        pct = round(100 * values[idx] / total, 1)
        question = f"What percentage of the whole does {labels[idx]} represent in the {chart} chart?"
        ans = f"{pct}%"
        reason = f"{labels[idx]} is {values[idx]} of {total} total. {values[idx]}/{total} × 100 = {pct}%."

    elif chart == "area":
        title = "Cumulative Trend"
        fig = area_chart(labels, values, title)
        question = "What is the total area under the curve (sum of all values) in the area chart?"
        ans = str(total)
        reason = f"The values are {', '.join(map(str, values))}, summing to {total}."

    elif chart == "mixed":
        title = "Values and Cumulative"
        fig = mixed_chart(labels, values, title)
        cumulative = [sum(values[:i+1]) for i in range(len(values))]
        max_cum = max(cumulative)
        max_cum_label = labels[cumulative.index(max_cum)]
        question = "At which category does the cumulative line reach its maximum?"
        ans = f"{max_cum_label} with {max_cum}"
        reason = f"The cumulative line reaches {max_cum} at {max_cum_label}, the last category."

    img = savefig_to_image(fig)
    return {
        "question": question,
        "answer": answer_format(ans, reason),
        "chart_image": img,
        "chart_type": chart,
    }


def main(count=100):
    load_env()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "images").mkdir(exist_ok=True)
    random.seed(1234)

    rows = []
    for i in range(count):
        row = make_row(seed=1234 + i)
        # Save PNG to disk as well for inspection
        img_path = OUT_DIR / "images" / f"chart_{i:03d}.png"
        row["chart_image"].save(img_path)
        rows.append({
            "question": row["question"],
            "answer": row["answer"],
            "chart_image": img_path,
            "chart_type": row["chart_type"],
        })

    # Write local metadata JSONL
    with open(OUT_DIR / "metadata.jsonl", "w") as f:
        for r in rows:
            rec = {"question": r["question"], "answer": r["answer"], "chart_type": r["chart_type"], "chart_image": str(r["chart_image"])}
            f.write(json.dumps(rec) + "\n")

    # Build a HF dataset with PIL images
    questions = [r["question"] for r in rows]
    answers = [r["answer"] for r in rows]
    images = [Image.open(r["chart_image"]) for r in rows]
    chart_types = [r["chart_type"] for r in rows]

    ds = Dataset.from_dict(
        {
            "question": questions,
            "answer": answers,
            "chart_image": images,
            "chart_type": chart_types,
        },
        features=Features({
            "question": Value("string"),
            "answer": Value("string"),
            "chart_image": HFImage(),
            "chart_type": Value("string"),
        }),
    )

    api = HfApi()
    user = api.whoami()["name"]
    repo_id = f"{user}/orbura-autoscientist-dataviz-multimodal-pilot"
    ds.push_to_hub(repo_id, token=os.environ.get("HF_TOKEN"))
    print(f"Pushed {count} rows to https://huggingface.co/datasets/{repo_id}")
    print(f"Local images: {OUT_DIR / 'images'}")
    print(f"Local metadata: {OUT_DIR / 'metadata.jsonl'}")


if __name__ == "__main__":
    main()

import json
from pathlib import Path

import matplotlib.pyplot as plt


INPUT_FILES = [
    (3, Path('ai-grading-concurrent-3.json')),
    (5, Path('ai-grading-concurrent-5.json')),
    (10, Path('ai-grading-concurrent-10.json')),
    (20, Path('ai-grading-concurrent-20.json')),
    (30, Path('ai-grading-concurrent-30.json')),
    (40, Path('ai-grading-concurrent-40.json')),
    (50, Path('ai-grading-concurrent-50-timeout500.json')),
    (60, Path('ai-grading-concurrent-60-timeout500.json')),
]

OUTPUT_PATH = Path('ai-grading-concurrency-line-chart.png')


def load_summary(file_path: Path) -> dict:
    with file_path.open('r', encoding='utf-8') as file:
        data = json.load(file)
    return data['summary']


def main() -> None:
    concurrency_values = []
    avg_completion_seconds = []
    p95_completion_seconds = []

    for concurrency, file_path in INPUT_FILES:
        summary = load_summary(file_path)
        concurrency_values.append(concurrency)
        avg_completion_seconds.append(summary['avgCompletionMs'] / 1000)
        p95_completion_seconds.append(summary['p95CompletionMs'] / 1000)

    plt.figure(figsize=(10, 6))
    plt.plot(
        concurrency_values,
        avg_completion_seconds,
        marker='o',
        linewidth=2,
        color='#4E79A7',
        label='Average Completion Time',
    )
    plt.plot(
        concurrency_values,
        p95_completion_seconds,
        marker='s',
        linewidth=2,
        color='#E15759',
        label='P95 Completion Time',
    )

    plt.xticks(concurrency_values, [str(value) for value in concurrency_values])
    plt.xlabel('Concurrent Users')
    plt.ylabel('Completion Time (s)')
    plt.title('AI Grading Completion Time by Concurrent Users')
    plt.grid(True, linestyle='--', alpha=0.4)
    plt.legend()

    for x, value in zip(concurrency_values, avg_completion_seconds):
        if x in {3, 5}:
            plt.text(x, value - 2.5, f'{value:.1f}', ha='center', va='top', fontsize=9)
        else:
            plt.text(x, value + 2.5, f'{value:.1f}', ha='center', va='bottom', fontsize=9)

    for x, value in zip(concurrency_values, p95_completion_seconds):
        plt.text(x, value + 4.0, f'{value:.1f}', ha='center', va='bottom', fontsize=9)

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300)
    plt.show()


if __name__ == '__main__':
    main()

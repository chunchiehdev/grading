import json
from pathlib import Path

import matplotlib.pyplot as plt


INPUT_PATH = Path('ai-grading-concurrent-results.json')
OUTPUT_PATH = Path('ai-grading-dual-chart.png')


def main() -> None:
    with INPUT_PATH.open('r', encoding='utf-8') as file:
        data = json.load(file)

    completed_results = [item for item in data['results'] if item['status'] == 'COMPLETED']
    user_labels = [f"User {item['userIndex']}" for item in completed_results]
    completion_seconds = [item['completionMs'] / 1000 for item in completed_results]
    grading_seconds = [item['gradingDuration'] / 1000 for item in completed_results]

    fig, axes = plt.subplots(2, 1, figsize=(12, 10))

    completion_bars = axes[0].bar(user_labels, completion_seconds, color='#4E79A7')
    axes[0].set_title('Concurrent AI Grading Completion Time by User')
    axes[0].set_xlabel('Concurrent User')
    axes[0].set_ylabel('Completion Time (s)')
    axes[0].grid(axis='y', linestyle='--', alpha=0.4)

    for bar, value in zip(completion_bars, completion_seconds):
        axes[0].text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.2,
            f'{value:.1f}',
            ha='center',
            va='bottom',
            fontsize=9,
        )

    grading_bars = axes[1].bar(user_labels, grading_seconds, color='#F28E2B')
    axes[1].set_title('Concurrent AI Grading Model Processing Time by User')
    axes[1].set_xlabel('Concurrent User')
    axes[1].set_ylabel('Grading Duration (s)')
    axes[1].grid(axis='y', linestyle='--', alpha=0.4)

    for bar, value in zip(grading_bars, grading_seconds):
        axes[1].text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.1,
            f'{value:.1f}',
            ha='center',
            va='bottom',
            fontsize=9,
        )

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300)
    plt.show()


if __name__ == '__main__':
    main()

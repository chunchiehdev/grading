import json
from pathlib import Path

import matplotlib.pyplot as plt


INPUT_PATH = Path('ai-grading-concurrent-results.json')
OUTPUT_PATH = Path('ai-grading-concurrent-completion-chart.png')


def main() -> None:
    with INPUT_PATH.open('r', encoding='utf-8') as file:
        data = json.load(file)

    completed_results = [item for item in data['results'] if item['status'] == 'COMPLETED']
    user_labels = [f"User {item['userIndex']}" for item in completed_results]
    completion_seconds = [item['completionMs'] / 1000 for item in completed_results]

    plt.figure(figsize=(12, 6))
    bars = plt.bar(user_labels, completion_seconds, color='#4E79A7')

    plt.xlabel('Concurrent User')
    plt.ylabel('Completion Time (s)')
    plt.title('Concurrent AI Grading Completion Time by User')
    plt.grid(axis='y', linestyle='--', alpha=0.4)

    for bar, value in zip(bars, completion_seconds):
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.2,
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

import json
from pathlib import Path

import matplotlib.pyplot as plt


SUMMARY_PATH = Path('health-summary.json')
OUTPUT_PATH = Path('health-response-times.png')


def main() -> None:
    with SUMMARY_PATH.open('r', encoding='utf-8') as file:
        data = json.load(file)

    duration_metric = data['metrics']['http_req_duration']
    metrics = duration_metric.get('values') or duration_metric.get('thresholds') or {}

    if not metrics:
        metrics = {
            'avg': duration_metric.get('avg'),
            'med': duration_metric.get('med'),
            'p(90)': duration_metric.get('p(90)'),
            'p(95)': duration_metric.get('p(95)'),
            'max': duration_metric.get('max'),
        }

    missing_keys = [key for key in ['avg', 'med', 'p(90)', 'p(95)', 'max'] if metrics.get(key) is None]
    if missing_keys:
        raise KeyError(f'Missing expected metric keys in health-summary.json: {missing_keys}')

    labels = ['Average', 'Median', 'P90', 'P95', 'Max']
    values_ms = [
        metrics['avg'],
        metrics['med'],
        metrics['p(90)'],
        metrics['p(95)'],
        metrics['max'],
    ]

    plt.figure(figsize=(10, 6))
    bars = plt.bar(labels, values_ms, color=['#4E79A7', '#59A14F', '#F28E2B', '#E15759', '#B07AA1'])

    plt.title('Health Endpoint Load Test Response Time Statistics')
    plt.ylabel('Response Time (ms)')
    plt.xlabel('Metric')
    plt.grid(axis='y', linestyle='--', alpha=0.4)

    for bar, value in zip(bars, values_ms):
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height(),
            f'{value:.2f}',
            ha='center',
            va='bottom',
            fontsize=10,
        )

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300)
    plt.show()


if __name__ == '__main__':
    main()

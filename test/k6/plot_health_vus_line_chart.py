import json
from pathlib import Path

import matplotlib.pyplot as plt


INPUT_FILES = [
    ('10 VUs', Path('health-10.json')),
    ('50 VUs', Path('health-50.json')),
    ('100 VUs', Path('health-100.json')),
    ('150 VUs', Path('health-150.json')),
]

OUTPUT_PATH = Path('health-vus-line-chart.png')


def load_metric(file_path: Path) -> dict:
    with file_path.open('r', encoding='utf-8') as file:
        data = json.load(file)
    return data['metrics']['http_req_duration']


def main() -> None:
    labels = []
    avg_values = []
    p95_values = []

    for label, file_path in INPUT_FILES:
        metric = load_metric(file_path)
        labels.append(label)
        avg_values.append(metric['avg'])
        p95_values.append(metric['p(95)'])

    x_positions = list(range(len(labels)))

    plt.figure(figsize=(10, 6))
    plt.plot(x_positions, avg_values, marker='o', linewidth=2, label='Average Response Time')
    plt.plot(x_positions, p95_values, marker='s', linewidth=2, label='P95 Response Time')

    plt.xticks(x_positions, labels)
    plt.xlabel('Virtual Users')
    plt.ylabel('Response Time (ms)')
    plt.title('Health Endpoint Load Test Response Time by Virtual Users')
    plt.grid(True, linestyle='--', alpha=0.4)
    plt.legend()

    for x, value in zip(x_positions, avg_values):
        plt.text(x, value + 40, f'{value:.1f}', ha='center', va='bottom', fontsize=9)

    for x, value in zip(x_positions, p95_values):
        plt.text(x, value - 40, f'{value:.1f}', ha='center', va='top', fontsize=9)

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300)
    plt.show()


if __name__ == '__main__':
    main()

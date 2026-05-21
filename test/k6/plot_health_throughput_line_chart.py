import json
from pathlib import Path

import matplotlib.pyplot as plt


INPUT_FILES = [
    ('10 VUs', Path('health-10.json')),
    ('50 VUs', Path('health-50.json')),
    ('100 VUs', Path('health-100.json')),
    ('150 VUs', Path('health-150.json')),
]

OUTPUT_PATH = Path('health-vus-throughput-line-chart.png')


def load_request_rate(file_path: Path) -> float:
    with file_path.open('r', encoding='utf-8') as file:
        data = json.load(file)
    return data['metrics']['http_reqs']['rate']


def main() -> None:
    labels = []
    throughput_values = []

    for label, file_path in INPUT_FILES:
        labels.append(label)
        throughput_values.append(load_request_rate(file_path))

    x_positions = list(range(len(labels)))

    plt.figure(figsize=(10, 6))
    plt.plot(x_positions, throughput_values, marker='o', linewidth=2, color='#4E79A7', label='Throughput (req/s)')

    plt.xticks(x_positions, labels)
    plt.xlabel('Virtual Users')
    plt.ylabel('Requests per Second (req/s)')
    plt.title('Health Endpoint Throughput by Virtual Users')
    plt.grid(True, linestyle='--', alpha=0.4)
    plt.legend()

    for x, value in zip(x_positions, throughput_values):
        plt.text(x, value + 1, f'{value:.2f}', ha='center', va='bottom', fontsize=9)

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300)
    plt.show()


if __name__ == '__main__':
    main()

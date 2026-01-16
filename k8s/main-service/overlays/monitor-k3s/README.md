# Monitor Stack Deployment (K3s)

This overlay contains Helm values for the monitoring stack.

## Prerequisites

```bash
# Add Bitnami Helm repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create namespace
kubectl create namespace monitoring
```

## Installation

```bash
# Install InfluxDB
helm install influxdb bitnami/influxdb \
  -f helm-values/influxdb-values.yaml \
  -n monitoring

# Install Grafana
helm install grafana bitnami/grafana \
  -f helm-values/grafana-values.yaml \
  -n monitoring
```

## Access

- **Grafana**: https://grafana.grading.software
- **Default credentials**: admin / admin123

## Uninstall

```bash
helm uninstall grafana -n monitoring
helm uninstall influxdb -n monitoring
```

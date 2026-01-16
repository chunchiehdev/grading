# Grading PDF - Kubernetes Development Deployment

This directory contains Kubernetes manifests for deploying the grading-pdf service to a development environment.

## Architecture

- **Namespace**: `grading-pdf-dev`
- **Components**:
  - `grading-pdf-api-dev`: FastAPI service (2 replicas)
  - `grading-pdf-worker-dev`: Celery worker (2 replicas)
  - `redis-dev`: Redis for task queue and caching (1 replica with persistence)
- **Domain**: `https://devgradingpdf.grading.software`
- **TLS**: Automated via cert-manager with Let's Encrypt

## Prerequisites

Before deploying, ensure your Kubernetes cluster has:

1. **Traefik Ingress Controller** installed and configured
2. **cert-manager** installed for automatic TLS certificate management
3. **StorageClass** available for dynamic PVC provisioning (default or specified)
4. DNS record for `devgradingpdf.grading.software` pointing to your cluster's ingress IP

### Check Prerequisites

```bash
# Check Traefik
kubectl get ingressclass traefik

# Check cert-manager
kubectl get pods -n cert-manager

# Check ClusterIssuer (should already exist)
kubectl get clusterissuer letsencrypt-prod

# Check StorageClass
kubectl get storageclass
```

## Files Overview

| File | Description |
|------|-------------|
| `namespace-dev.yaml` | Creates `grading-pdf-dev` namespace |
| `configmap-dev.yaml` | Non-sensitive configuration (APP_MODE, REDIS_URL, etc.) |
| `redis-dev.yaml` | Redis deployment, service, and PVC |
| `deployment-dev.yaml` | API and Worker deployments |
| `service-dev.yaml` | ClusterIP service for API |
| `ingress-dev.yaml` | Traefik ingress with TLS |

## Deployment Instructions

### Option 1: Deploy All at Once

```bash
# From the repository root or this directory
kubectl apply -f k8s/grading-pdf-dev/
```

### Option 2: Deploy Step by Step (Recommended)

```bash
# 1. Create namespace
kubectl apply -f namespace-dev.yaml

# 2. Apply configuration
kubectl apply -f configmap-dev.yaml

# 3. Deploy Redis (with persistent storage)
kubectl apply -f redis-dev.yaml

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app=redis-dev -n grading-pdf-dev --timeout=120s

# 4. Deploy application services
kubectl apply -f deployment-dev.yaml

# 5. Create service
kubectl apply -f service-dev.yaml

# 6. Configure ingress (this will trigger TLS certificate request)
kubectl apply -f ingress-dev.yaml
```

## Verification

### Check Deployment Status

```bash
# Check all resources in namespace
kubectl get all -n grading-pdf-dev

# Check pods status
kubectl get pods -n grading-pdf-dev

# Check ingress and certificate
kubectl get ingress -n grading-pdf-dev
kubectl get certificate -n grading-pdf-dev
```

### Check TLS Certificate

```bash
# Check certificate status (may take 1-2 minutes to issue)
kubectl describe certificate grading-pdf-dev-tls -n grading-pdf-dev

# Check cert-manager logs if certificate fails
kubectl logs -n cert-manager deploy/cert-manager
```

### View Logs

```bash
# API logs
kubectl logs -l app=grading-pdf-api-dev -n grading-pdf-dev --tail=50 -f

# Worker logs
kubectl logs -l app=grading-pdf-worker-dev -n grading-pdf-dev --tail=50 -f

# Redis logs
kubectl logs -l app=redis-dev -n grading-pdf-dev --tail=50 -f
```

### Test the Service

```bash
# Test health endpoint (after DNS propagation and certificate issuance)
curl https://devgradingpdf.grading.software/health

# Expected response:
# {"status":"healthy"}
```

## Updating the Deployment

### Update Configuration

```bash
# Edit configmap
kubectl edit configmap grading-pdf-config-dev -n grading-pdf-dev

# Restart pods to pick up changes
kubectl rollout restart deployment/grading-pdf-api-dev -n grading-pdf-dev
kubectl rollout restart deployment/grading-pdf-worker-dev -n grading-pdf-dev
```

### Update Docker Image

```bash
# The deployment uses imagePullPolicy: Always
# Just restart the deployments to pull latest :master tag
kubectl rollout restart deployment/grading-pdf-api-dev -n grading-pdf-dev
kubectl rollout restart deployment/grading-pdf-worker-dev -n grading-pdf-dev

# Monitor rollout status
kubectl rollout status deployment/grading-pdf-api-dev -n grading-pdf-dev
kubectl rollout status deployment/grading-pdf-worker-dev -n grading-pdf-dev
```

## Scaling

```bash
# Scale API replicas
kubectl scale deployment/grading-pdf-api-dev --replicas=3 -n grading-pdf-dev

# Scale Worker replicas
kubectl scale deployment/grading-pdf-worker-dev --replicas=4 -n grading-pdf-dev
```

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n grading-pdf-dev

# Check pod logs
kubectl logs <pod-name> -n grading-pdf-dev
```

### Redis Connection Issues

```bash
# Test Redis connection from a pod
kubectl exec -it <api-pod-name> -n grading-pdf-dev -- redis-cli -h redis-dev ping

# Expected response: PONG
```

### Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress grading-pdf-ingress-dev -n grading-pdf-dev

# Verify Traefik is routing correctly
kubectl logs -n traefik <traefik-pod-name> | grep devgradingpdf
```

### Certificate Issues

```bash
# Check certificate request
kubectl get certificaterequest -n grading-pdf-dev

# Check certificate order
kubectl get order -n grading-pdf-dev

# Check challenge
kubectl get challenge -n grading-pdf-dev

# Describe certificate for detailed status
kubectl describe certificate grading-pdf-dev-tls -n grading-pdf-dev
```

## Uninstalling

```bash
# Delete all resources in namespace
kubectl delete namespace grading-pdf-dev

# This will remove:
# - All deployments
# - All services
# - All configmaps
# - The persistent volume claim (Redis data will be deleted)
# - The TLS certificate
```

## Resource Limits

Current resource allocation per pod:

### API Pods (2 replicas)
- Requests: 256Mi RAM, 250m CPU
- Limits: 512Mi RAM, 500m CPU
- Total: ~512Mi RAM, 500m CPU (requests)

### Worker Pods (2 replicas)
- Requests: 512Mi RAM, 200m CPU
- Limits: 1Gi RAM, 1000m CPU
- Total: ~1Gi RAM, 400m CPU (requests)

### Redis
- Requests: 128Mi RAM, 100m CPU
- Limits: 256Mi RAM, 250m CPU
- Storage: 1Gi PVC

**Total Cluster Requirements** (minimum):
- RAM: ~1.6Gi
- CPU: ~900m (0.9 cores)
- Storage: 1Gi

## Notes

1. **Image Tag**: The deployment uses `chunchiehdev/grading-pdf:master` - ensure this image is built and pushed to Docker Hub
2. **Domain**: Ensure DNS is configured before applying ingress.yaml
3. **Certificate**: TLS certificate will be automatically requested from Let's Encrypt after ingress is applied
4. **Redis Persistence**: Redis data is persisted in a PVC. To reset Redis, delete the PVC: `kubectl delete pvc redis-data-pvc-dev -n grading-pdf-dev`
5. **Ingress Class**: Uses `traefik` - if your cluster uses a different ingress controller (e.g., nginx), update `ingress-dev.yaml`
6. **Health Checks**: Both API and Worker have liveness/readiness probes configured for automatic restart on failure

## Differences from k3s Deployment

This Kubernetes configuration differs from the k3s version in:

1. **Naming Convention**: All resources suffixed with `-dev` to match the dev.k8s pattern
2. **Namespace**: Uses `grading-pdf-dev` instead of `grading-pdf`
3. **Resource Metadata**: Added pod metadata (POD_NAME, POD_IP, NODE_NAME) for observability
4. **Domain**: Uses `devgradingpdf.grading.software` instead of `gradingpdf.grading.software`
5. **TLS Secret**: Uses `grading-pdf-dev-tls` for consistency

## Support

For issues or questions, please check:
- Pod logs: `kubectl logs -n grading-pdf-dev <pod-name>`
- Events: `kubectl get events -n grading-pdf-dev --sort-by='.lastTimestamp'`
- Cluster status: `kubectl get nodes` and `kubectl top nodes`

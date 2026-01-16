#!/bin/bash
# deploy.sh - Quick deployment script for grading-pdf-dev

set -e  # Exit on error

echo "======================================"
echo "Grading PDF Development Deployment"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi

# Check cluster connection
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Cannot connect to Kubernetes cluster. Please check your kubeconfig.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ kubectl and cluster connection OK${NC}"
echo ""

# Deploy step by step
echo -e "${YELLOW}Step 1/6: Creating namespace...${NC}"
kubectl apply -f "$SCRIPT_DIR/namespace-dev.yaml"
echo ""

echo -e "${YELLOW}Step 2/6: Applying ConfigMap...${NC}"
kubectl apply -f "$SCRIPT_DIR/configmap-dev.yaml"
echo ""

echo -e "${YELLOW}Step 3/6: Deploying Redis...${NC}"
kubectl apply -f "$SCRIPT_DIR/redis-dev.yaml"
echo "Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis-dev -n grading-pdf-dev --timeout=120s || true
echo ""

echo -e "${YELLOW}Step 4/6: Deploying application...${NC}"
kubectl apply -f "$SCRIPT_DIR/deployment-dev.yaml"
echo ""

echo -e "${YELLOW}Step 5/6: Creating service...${NC}"
kubectl apply -f "$SCRIPT_DIR/service-dev.yaml"
echo ""

echo -e "${YELLOW}Step 6/6: Configuring ingress...${NC}"
kubectl apply -f "$SCRIPT_DIR/ingress-dev.yaml"
echo ""

echo -e "${GREEN}======================================"
echo "Deployment completed!"
echo "======================================${NC}"
echo ""
echo "Checking deployment status..."
echo ""

kubectl get pods -n grading-pdf-dev
echo ""

echo -e "${YELLOW}Useful commands:${NC}"
echo "  - Check all resources:    kubectl get all -n grading-pdf-dev"
echo "  - Check ingress:          kubectl get ingress -n grading-pdf-dev"
echo "  - Check certificate:      kubectl get certificate -n grading-pdf-dev"
echo "  - View API logs:          kubectl logs -l app=grading-pdf-api-dev -n grading-pdf-dev -f"
echo "  - View worker logs:       kubectl logs -l app=grading-pdf-worker-dev -n grading-pdf-dev -f"
echo ""
echo -e "${YELLOW}Service URL:${NC} https://devgradingpdf.grading.software"
echo ""
echo -e "${YELLOW}Note:${NC} TLS certificate may take 1-2 minutes to issue. Check with:"
echo "  kubectl describe certificate grading-pdf-dev-tls -n grading-pdf-dev"

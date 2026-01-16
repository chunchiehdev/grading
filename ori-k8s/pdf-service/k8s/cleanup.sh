#!/bin/bash
# cleanup.sh - Cleanup script for grading-pdf-dev

set -e  # Exit on error

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}======================================"
echo "Grading PDF Development Cleanup"
echo "======================================${NC}"
echo ""
echo -e "${YELLOW}WARNING: This will delete ALL resources in the grading-pdf-dev namespace!${NC}"
echo "This includes:"
echo "  - All deployments (API and Worker)"
echo "  - Redis and its persistent data"
echo "  - All services and ingress"
echo "  - TLS certificates"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${GREEN}Cleanup cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Deleting namespace and all resources...${NC}"
kubectl delete namespace grading-pdf-dev

echo ""
echo -e "${GREEN}======================================"
echo "Cleanup completed!"
echo "======================================${NC}"
echo ""
echo "All resources in grading-pdf-dev have been removed."

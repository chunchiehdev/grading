#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Vite Cache Status Check ===${NC}\n"

# Check host
echo -e "${YELLOW}1. 主機狀態:${NC}"
if [ -d "node_modules/.vite" ]; then
    echo -e "  ${GREEN}✓${NC} node_modules/.vite 存在"
    echo "    檔案數量: $(find node_modules/.vite -type f 2>/dev/null | wc -l)"
    echo "    大小: $(du -sh node_modules/.vite 2>/dev/null | cut -f1)"
else
    echo -e "  ${RED}✗${NC} node_modules/.vite 不存在"
fi

# Check container
echo -e "\n${YELLOW}2. 容器狀態:${NC}"
if docker compose -f docker-compose.dev.yaml ps app | grep -q "Up"; then
    if docker compose -f docker-compose.dev.yaml exec -T app test -d /app/node_modules/.vite; then
        echo -e "  ${GREEN}✓${NC} /app/node_modules/.vite 存在"
        file_count=$(docker compose -f docker-compose.dev.yaml exec -T app find /app/node_modules/.vite -type f 2>/dev/null | wc -l)
        echo "    檔案數量: $file_count"
        size=$(docker compose -f docker-compose.dev.yaml exec -T app du -sh /app/node_modules/.vite 2>/dev/null | cut -f1)
        echo "    大小: $size"
    else
        echo -e "  ${RED}✗${NC} /app/node_modules/.vite 不存在"
    fi
else
    echo -e "  ${RED}✗${NC} 容器未運行"
fi

# Check Docker volume
echo -e "\n${YELLOW}3. Docker Volume:${NC}"
if docker volume ls | grep -q "grading_app_node_modules"; then
    echo -e "  ${GREEN}✓${NC} Docker volume 存在"
    mountpoint=$(docker volume inspect grading_app_node_modules --format '{{.Mountpoint}}' 2>/dev/null)
    echo "    掛載點: $mountpoint"
    if [ -n "$mountpoint" ] && sudo test -d "$mountpoint/.vite" 2>/dev/null; then
        echo -e "    ${GREEN}✓${NC} .vite 目錄存在於 volume 中"
    else
        echo -e "    ${RED}✗${NC} .vite 目錄不存在於 volume 中"
    fi
else
    echo -e "  ${RED}✗${NC} Docker volume 不存在"
fi

# Check isolation
echo -e "\n${YELLOW}4. 隔離狀態:${NC}"
host_exists=false
container_exists=false

[ -d "node_modules/.vite" ] && host_exists=true
docker compose -f docker-compose.dev.yaml exec -T app test -d /app/node_modules/.vite 2>/dev/null && container_exists=true

if [ "$host_exists" = true ] && [ "$container_exists" = true ]; then
    echo -e "  ${YELLOW}⚠${NC}  主機和容器都有 .vite (不正常)"
elif [ "$host_exists" = false ] && [ "$container_exists" = true ]; then
    echo -e "  ${GREEN}✓${NC} 正確隔離 (只有容器有 .vite)"
elif [ "$host_exists" = true ] && [ "$container_exists" = false ]; then
    echo -e "  ${YELLOW}⚠${NC}  只有主機有 .vite (容器未啟動或有問題)"
else
    echo -e "  ${RED}✗${NC} 兩者都沒有 .vite (可能剛清除緩存)"
fi

echo -e "\n${BLUE}=== 建議 ===${NC}"
if [ "$host_exists" = true ]; then
    echo -e "${YELLOW}主機有 .vite 目錄，這通常是不需要的${NC}"
    echo "建議刪除: rm -rf node_modules/.vite"
fi

if [ "$container_exists" = false ]; then
    echo -e "${YELLOW}容器沒有 .vite 緩存${NC}"
    echo "這是正常的，會在首次請求時自動創建"
fi

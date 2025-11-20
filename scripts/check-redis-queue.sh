#!/bin/bash

# Redis Queue Status Checker
# 檢查 BullMQ 評分任務佇列狀態

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 BullMQ 評分佇列狀態檢查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 執行 Redis 命令
docker compose -f docker-compose.dev.yaml exec -T redis redis-cli -a password --no-auth-warning << 'REDIS_EOF'

ECHO "🔍 佇列統計："
ECHO "----------------------------------------"
ECHO "等待中的任務 (waiting):"
LLEN bull:grading:wait

ECHO ""
ECHO "處理中的任務 (active):"
LLEN bull:grading:active

ECHO ""
ECHO "已完成的任務 (completed):"
LLEN bull:grading:completed

ECHO ""
ECHO "失敗的任務 (failed):"
LLEN bull:grading:failed

ECHO ""
ECHO "延遲的任務 (delayed):"
LLEN bull:grading:delayed

ECHO ""
ECHO "暫停的任務 (paused):"
LLEN bull:grading:paused

ECHO ""
ECHO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ECHO "📋 等待中的任務列表 (前5個):"
ECHO "----------------------------------------"
LRANGE bull:grading:wait 0 4

ECHO ""
ECHO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ECHO "❌ 失敗的任務列表 (前5個):"
ECHO "----------------------------------------"
LRANGE bull:grading:failed 0 4

REDIS_EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  檢查完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

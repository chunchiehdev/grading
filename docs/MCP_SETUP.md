# MCP (Model Context Protocol) 設定指南

## 概述

本指南說明如何在評分系統中設定和使用 MCP (Model Context Protocol) 功能，以取代傳統的 AI API 呼叫。

## 架構概覽

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   React Router  │    │     MCP      │    │   AI Services   │
│   Application   │◄───┤   Client     │◄───┤   (Claude, etc) │
│                 │    │              │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Legacy APIs    │
                    │   (Fallback)     │
                    └──────────────────┘
```

## 環境變數設定

### 必要變數

```bash
# 啟用 MCP 功能
USE_MCP=true

# MCP 服務器 URL
MCP_GRADING_SERVER_URL="http://localhost:3001/mcp"

# MCP 認證 (擇一使用)
MCP_AUTH_TOKEN="your_mcp_bearer_token"
# 或
MCP_API_KEY="your_mcp_api_key"
```

### 可選變數

```bash
# 文件分析專用服務器 (預設與評分服務器相同)
MCP_DOCUMENT_SERVER_URL="http://localhost:3001/mcp"

# 超時設定 (毫秒)
MCP_TIMEOUT=120000
MCP_DOCUMENT_TIMEOUT=60000

# 重試設定
MCP_RETRIES=3
MCP_DOCUMENT_RETRIES=2

# 回退機制 (MCP 失敗時使用傳統 API)
MCP_FALLBACK_TO_API=true

# 健康檢查
MCP_HEALTH_CHECKS=true
MCP_HEALTH_CHECK_INTERVAL=30000

# 日誌
MCP_LOGGING=true
```

## MCP 服務器設定

### 1. 安裝 MCP SDK

```bash
npm install @anthropic/mcp-server
# 或
pip install mcp
```

### 2. 建立 MCP 服務器

```typescript
// mcp-server.ts
import { MCPServer } from '@anthropic/mcp-server';

const server = new MCPServer('grading-mcp-server');

// 文件分析工具
server.addTool('analyze_document', {
  description: '分析文件內容並提取文字',
  parameters: {
    type: 'object',
    properties: {
      document: {
        type: 'object',
        properties: {
          fileName: { type: 'string' },
          contentType: { type: 'string' },
          buffer: { type: 'string' } // base64 encoded
        }
      }
    }
  },
  handler: async (params) => {
    // 實現文件分析邏輯
    return {
      text: "提取的文件內容...",
      content: "處理後的內容..."
    };
  }
});

// 評分工具
server.addTool('grade_document', {
  description: '使用指定評分標準對文件進行評分',
  parameters: {
    type: 'object',
    properties: {
      document: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          fileName: { type: 'string' },
          contentType: { type: 'string' }
        }
      },
      rubric: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          criteria: { type: 'array' }
        }
      }
    }
  },
  handler: async (params) => {
    // 實現評分邏輯
    return {
      overallScore: 85,
      analysis: "詳細分析...",
      criteriaScores: [
        {
          name: "內容品質",
          score: 4,
          comments: "內容豐富且具深度"
        }
      ],
      strengths: ["優點1", "優點2"],
      areasForImprovement: ["改進點1", "改進點2"]
    };
  }
});

server.start(3001);
```

### 3. 啟動服務器

```bash
node mcp-server.js
# 或使用 PM2
pm2 start mcp-server.js --name "mcp-grading-server"
```

## 功能特性

### 1. 自動回退機制

當 MCP 服務不可用時，系統會自動回退到傳統 API：

```typescript
// 自動檢測 MCP 健康狀態
const mcpHealthy = await mcpClient.healthCheck();
if (!mcpHealthy && MCP_FALLBACK_TO_API) {
  // 使用傳統 API
  return await processWithLegacyAPI(document);
}
```

### 2. 健康監控

系統會定期檢查 MCP 服務器狀態：

```bash
# 檢查 MCP 健康狀態
curl http://localhost:3000/api/mcp/health
```

### 3. 錯誤處理和重試

內建指數退避重試機制：

- 第一次失敗：立即重試
- 第二次失敗：等待 1 秒後重試
- 第三次失敗：等待 2 秒後重試
- 最大重試次數：3 次

## 部署選項

### 選項 1：本地部署

```bash
# 啟動 MCP 服務器
npm run mcp:start

# 啟動評分系統
npm run dev
```

### 選項 2：Docker 部署

```dockerfile
# Dockerfile.mcp
FROM node:18-alpine
WORKDIR /app
COPY mcp-server/ .
RUN npm install
EXPOSE 3001
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile.mcp
    ports:
      - "3001:3001"
    environment:
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
  
  grading-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - USE_MCP=true
      - MCP_GRADING_SERVER_URL=http://mcp-server:3001/mcp
```

### 選項 3：雲端部署

```bash
# 部署到 Cloudflare Workers
wrangler deploy mcp-server

# 更新環境變數
MCP_GRADING_SERVER_URL="https://your-mcp-server.workers.dev"
```

## 監控和調試

### 1. 健康檢查端點

```bash
# 應用程式健康狀態
GET /api/mcp/health

# 回應格式
{
  "success": true,
  "data": {
    "isHealthy": true,
    "lastChecked": "2024-01-15T10:30:00Z",
    "gradingServer": {
      "url": "http://localhost:3001/mcp",
      "status": "healthy",
      "responseTime": 145
    },
    "configuration": {
      "enabled": true,
      "fallbackToApi": true
    }
  }
}
```

### 2. 日誌監控

系統會記錄以下事件：

- MCP 服務器連線狀態
- 請求/回應時間
- 錯誤和重試次數
- 回退機制觸發

### 3. 效能指標

- 平均回應時間
- 成功率
- 錯誤率
- 回退頻率

## 遷移策略

### 階段 1：並行運行 (1-2 週)

```bash
USE_MCP=true
MCP_FALLBACK_TO_API=true  # 保持回退機制
```

### 階段 2：監控和優化 (2-4 週)

- 監控 MCP 效能
- 調整超時和重試參數
- 收集使用者反饋

### 階段 3：完全切換 (1 週)

```bash
USE_MCP=true
MCP_FALLBACK_TO_API=false  # 移除回退機制
```

## 故障排除

### 常見問題

1. **MCP 服務器無法連線**
   ```bash
   # 檢查服務器狀態
   curl http://localhost:3001/health
   
   # 檢查防火牆設定
   netstat -tulpn | grep 3001
   ```

2. **認證失敗**
   ```bash
   # 驗證認證令牌
   curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
        http://localhost:3001/mcp
   ```

3. **高延遲**
   - 調整 `MCP_TIMEOUT` 參數
   - 檢查網路連線
   - 監控服務器資源使用

### 效能調優

```bash
# 調整並發設定
MCP_TIMEOUT=60000          # 較短超時
MCP_RETRIES=2              # 較少重試
MCP_HEALTH_CHECK_INTERVAL=60000  # 較長健康檢查間隔
```

## 安全注意事項

1. **認證令牌管理**
   - 使用強密碼生成令牌
   - 定期輪換令牌
   - 限制令牌權限範圍

2. **網路安全**
   - 使用 HTTPS 連線
   - 設定適當的 CORS 原則
   - 限制訪問 IP 範圍

3. **資料保護**
   - 加密傳輸中的敏感資料
   - 不在日誌中記錄敏感資訊
   - 實施資料保留原則

## 支援和資源

- [MCP 官方文檔](https://spec.modelcontextprotocol.io/)
- [Anthropic MCP SDK](https://github.com/anthropics/mcp)
- [React Router v7 文檔](https://reactrouter.com/) 
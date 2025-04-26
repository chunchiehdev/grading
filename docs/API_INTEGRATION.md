# API 整合文檔

本文檔說明如何將評分系統與其他教育平台或應用程式整合。

## 內容目錄

1. [RESTful API](#restful-api)
2. [LTI 整合](#lti-整合)
3. [批量評分](#批量評分)
4. [API 身份驗證](#api-身份驗證)
5. [錯誤處理](#錯誤處理)

## RESTful API

評分系統提供了 RESTful API，可用於與其他系統整合。所有 API 端點都接受和返回 JSON 格式的數據。

### 可用端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/grading` | POST | 評分單一作業提交 |
| `/api/batch-grading` | POST | 批量評分多個作業 |
| `/api/batch-grading?batch_id=xxx` | GET | 查詢批量評分狀態 |
| `/api/lti/launch` | POST | LTI 啟動端點 |

### 單一評分請求

**請求:**

```http
POST /api/grading
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "sections": [
    {
      "id": "summary",
      "title": "摘要",
      "content": "學生提交的摘要內容",
      "order": 1,
      "required": true
    },
    {
      "id": "reflection",
      "title": "反思",
      "content": "學生提交的反思內容",
      "order": 2,
      "required": true
    },
    {
      "id": "questions",
      "title": "問題",
      "content": "學生提交的問題內容",
      "order": 3,
      "required": true
    }
  ],
  "metadata": {
    "authorId": "student123",
    "submittedAt": "2023-06-01T10:30:00Z"
  }
}
```

**成功回應:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "requestId": "50c3d980-7c9a-11ec-90d6-0242ac120003",
  "feedback": {
    "score": 85,
    "summaryComments": "摘要評論...",
    "reflectionComments": "反思評論...",
    "questionComments": "問題評論...",
    "overallSuggestions": "整體建議...",
    "strengths": ["優點1", "優點2", "優點3"],
    "createdAt": "2023-06-01T10:35:00Z",
    "gradingDuration": 5000
  }
}
```

**錯誤回應:**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "驗證失敗: 缺少必要欄位",
  "requestId": "50c3d980-7c9a-11ec-90d6-0242ac120003"
}
```

## LTI 整合

本系統支援 Learning Tools Interoperability (LTI) 標準，可與各種學習管理系統 (LMS) 如 Moodle、Canvas、Blackboard 等整合。

### 支援的 LTI 版本

- LTI 1.1
- LTI 1.3 (即將支援)

### LTI 設定步驟

1. 在管理界面獲取 LTI 消費者金鑰和共享密鑰
2. 在 LMS 中配置外部工具:
   - 工具 URL: `https://your-domain.com/api/lti/launch`
   - 消費者金鑰: `YOUR_CONSUMER_KEY`
   - 共享密鑰: `YOUR_SHARED_SECRET`
   - 啟動容器: 新窗口或嵌入式
   - 隱私設置: 根據需要設置，建議發送姓名和電子郵件

### 自定義參數

LTI 整合支援下列自定義參數:

- `custom_assignment_id`: 指定作業 ID
- `custom_course_id`: 指定課程 ID
- `custom_return_url`: 完成後的返回 URL

## 批量評分

對於需要處理大量作業提交的情況，可以使用批量評分 API。

### 批量評分請求

**請求:**

```http
POST /api/batch-grading
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "assignments": [
    {
      "sections": [...],
      "metadata": {
        "authorId": "student1",
        "submittedAt": "2023-06-01T10:30:00Z"
      }
    },
    {
      "sections": [...],
      "metadata": {
        "authorId": "student2",
        "submittedAt": "2023-06-01T10:35:00Z"
      }
    }
  ],
  "options": {
    "callback_url": "https://your-callback-url.com/webhook",
    "webhook_secret": "your_webhook_secret",
    "batch_id": "custom-batch-id-123"
  }
}
```

**成功回應:**

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "message": "批量評分請求已接受，正在處理中",
  "batch_id": "custom-batch-id-123"
}
```

### 查詢批量評分狀態

**請求:**

```http
GET /api/batch-grading?batch_id=custom-batch-id-123
Authorization: Bearer YOUR_API_KEY
```

**成功回應:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "batch_id": "custom-batch-id-123",
  "status": "processing",
  "total": 2,
  "processed": 1,
  "results": {
    "request-id-1": {
      "score": 85,
      "summaryComments": "...",
      "reflectionComments": "...",
      "questionComments": "...",
      "overallSuggestions": "...",
      "strengths": ["優點1", "優點2", "優點3"],
      "createdAt": "2023-06-01T10:40:00Z",
      "gradingDuration": 5000
    }
  }
}
```

### 回調通知

批量處理完成後，系統可以向指定的回調 URL 發送通知:

```http
POST https://your-callback-url.com/webhook
Content-Type: application/json
X-Webhook-Signature: 05d58bf3e4b63e7b6e13ecf849aa854e907...

{
  "batch_id": "custom-batch-id-123",
  "status": "completed",
  "total": 2,
  "processed": 2,
  "results": {
    "request-id-1": { ... },
    "request-id-2": { ... }
  }
}
```

## API 身份驗證

所有 API 請求都需要使用 API 金鑰進行身份驗證。API 金鑰應在 HTTP 標頭中提供:

```
Authorization: Bearer YOUR_API_KEY
```

### 獲取 API 金鑰

1. 登錄管理界面
2. 導航至 "API 金鑰管理"
3. 點擊 "創建新 API 金鑰"
4. 輸入名稱並選擇適當的權限範圍
5. 複製並安全存儲生成的 API 金鑰

### 權限範圍

可用的權限範圍:

- `grading:read`: 允許讀取評分數據
- `grading:write`: 允許提交評分請求
- `batch:read`: 允許讀取批量評分狀態
- `batch:write`: 允許提交批量評分請求
- `lti:launch`: 允許 LTI 整合

## 錯誤處理

API 使用標準 HTTP 狀態碼和 JSON 錯誤訊息。

### 常見狀態碼

- `200 OK`: 請求成功
- `202 Accepted`: 請求已接受，正在處理中
- `400 Bad Request`: 請求格式錯誤或參數無效
- `401 Unauthorized`: 身份驗證失敗
- `403 Forbidden`: 沒有足夠的權限
- `404 Not Found`: 資源不存在
- `415 Unsupported Media Type`: 內容類型不支援
- `429 Too Many Requests`: 請求過於頻繁
- `500 Internal Server Error`: 服務器內部錯誤

### 錯誤回應格式

```json
{
  "error": "錯誤描述",
  "requestId": "請求ID (如果有)"
}
```

## 限制與注意事項

- API 請求頻率限制: 每分鐘最多 60 個請求
- 批量評分限制: 每批次最多 100 個作業
- API 金鑰應妥善保管，不應在前端代碼中暴露
- 所有 API 通信應使用 HTTPS 進行加密 
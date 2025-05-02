# 評分系統 (Grading System)

基於 Remix 和 Vite 構建的評分系統，使用 Docker 進行開發與部署。

## 開發環境設置

### 前置需求

- Docker
- Docker Compose
- Node.js 20+ (可選，本地開發使用)

### 環境變數設置

1. 複製環境變數範本

```bash
cp .env.example .env
```

2. 根據需要修改 `.env` 檔案

### 啟動開發環境

```bash
docker-compose -f docker-compose.dev.yaml up
```

系統將在 http://localhost:3000 啟動

### 熱重載開發

開發環境設置了代碼熱重載，修改代碼後將自動重新構建應用。

## 資料庫操作

### 執行資料庫遷移

```bash
# 在開發容器中執行
docker-compose -f docker-compose.dev.yaml exec app npx prisma migrate dev
```

### 訪問開發資料庫

```bash
docker-compose -f docker-compose.dev.yaml exec db psql -U admin -d grading_db
```

## 部署到生產環境

### 生產環境部署

```bash
# 確保已正確設置所有生產環境變數
docker-compose -f docker-compose.prod.yaml up -d
```

### 檢查服務狀態

```bash
docker-compose -f docker-compose.prod.yaml ps
```

### 查看日誌

```bash
docker-compose -f docker-compose.prod.yaml logs -f app
```

## 服務端口

- Web 應用: 3000
- PostgreSQL: 5432 (開發時映射到主機)
- Redis: 6379 (開發時映射到主機)
- MinIO: 9000 (API), 9001 (Console)

# AI 輔助教育評分系統

## 環境設置

### 設置環境變數

本系統需要一些環境變數來正常運行。請按照以下步驟設置：

1. 複製 `.env.example` 文件為 `.env`

   ```bash
   cp .env.example .env
   ```

2. 填寫以下必要的環境變數：

   - `DATABASE_URL`: 資料庫連線字串
   - `THEME_SECRET`: 主題 cookie 加密密鑰
   - `AUTH_SECRET`: 認證 cookie 加密密鑰

3. **Google OAuth 設置** (可選但建議)：
   如果要啟用 Google 登入功能，需要設置以下環境變數：

   - `GOOGLE_CLIENT_ID`: 從 Google Cloud Console 獲取的客戶端 ID
   - `GOOGLE_CLIENT_SECRET`: 從 Google Cloud Console 獲取的客戶端密鑰
   - `GOOGLE_REDIRECT_URI`: Google 登入成功後的重定向 URI (預設: http://localhost:3000/auth/google/callback)

   若未設置 Google OAuth 環境變數，系統仍可運行，但 Google 登入功能將不可用。

4. 其他可選環境變數：
   - AI 功能相關: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_API_KEY`
   - 存儲相關: `MINIO_ENDPOINT`, `MINIO_PORT`
   - 快取相關: `REDIS_HOST`, `REDIS_PASSWORD`

## 開發

### 啟動開發服務器

```bash
npm run dev
```

## Setting

## Validation with Zod

This project uses [Zod](https://github.com/colinhacks/zod) for data validation. Zod is a TypeScript-first schema validation library that allows us to:

- Define schemas with strong type inference
- Validate data at runtime
- Automatically generate TypeScript types from schemas

### Validation Schemas

The main validation schemas are located in:

- `app/schemas/assignment.ts` - Schemas for assignment submission validation
- `app/schemas/feedback.ts` - Schemas for feedback data validation

### How to Use

1. Import the validation function:

```ts
import { validateAssignmentWithZod } from '@/schemas/assignment';
```

2. Use it to validate data:

```ts
const validationResult = validateAssignmentWithZod(data);

if (validationResult.isValid) {
  // Access validated (and typed) data
  const validData = validationResult.data;
  // Proceed with valid data
} else {
  // Handle validation errors
  const errors = validationResult.errors;
  // Process errors appropriately
}
```

### Benefits

- **Type Safety**: Zod validates the runtime data and provides TypeScript types
- **Cleaner Code**: Validation logic is centralized in schema definitions
- **Better Error Messages**: Structured error messages that are easy to process
- **Schema Reuse**: Schemas can be composed and reused across the application

## API Integration

The grading system supports various integration options to work with external systems:

### RESTful API

The system provides a RESTful API for programmatic integration:

- **Single Assignment Grading**: `POST /api/grading`
- **Batch Assignment Grading**: `POST /api/batch-grading`
- **Batch Status Checking**: `GET /api/batch-grading?batch_id=xxx`

All API endpoints require authentication using API keys. You can manage API keys through the admin interface at `/admin/api-keys`.

### LTI Integration

The system supports Learning Tools Interoperability (LTI) standard for integration with Learning Management Systems (LMS) like Moodle, Canvas, and Blackboard.

- **LTI Launch Endpoint**: `POST /api/lti/launch`
- **LTI Grading Page**: `/assignments/lti-grading`

### Webhook Support

For batch processing, the system can send notifications to a callback URL when processing is complete, allowing for asynchronous workflows.

### Documentation

For detailed API documentation, see:

- `docs/API_INTEGRATION.md` - Complete API integration guide
- Admin interface at `/admin/api-keys` - API key management and example requests

# PDF Parser API 使用文檔

## 📋 概述

這是一個基於 FastAPI 和 Celery 的高性能 PDF 解析服務，支持異步處理和多用戶並發訪問。使用 MarkItDown 引擎將 PDF 文件轉換為 Markdown 格式文本。

## 🚀 快速開始

### 服務地址

- **API 基礎 URL**: `http://localhost:8000`
- **API 文檔**: `http://localhost:8000/docs`

## 📖 API 端點

### 1. 健康檢查

```http
GET /health
```

**響應示例**:

```json
{
  "status": "healthy",
  "service": "pdf-parser"
}
```

### 2. 上傳 PDF 進行解析（異步）

```http
POST /parse
```

**請求參數**:

- `file` (required): PDF 文件（multipart/form-data）
- `user_id` (optional): 用戶識別碼，預設為 "default"
- `file_id` (optional): 文件識別碼，用於追蹤特定文件

**文件限制**:

- 僅支持 PDF 格式（`application/pdf`）
- 最大文件大小: 50MB

**響應示例**:

```json
{
  "task_id": "abc123-def456-789ghi",
  "status": "pending",
  "message": "PDF parsing task submitted successfully"
}
```

### 3. 查詢解析結果

```http
GET /task/{task_id}
```

**路徑參數**:

- `task_id`: 上傳時返回的任務 ID

**響應狀態**:

- `pending`: 任務排隊中
- `processing`: 正在處理
- `success`: 處理成功
- `failed`: 處理失敗

**成功響應示例**:

```json
{
  "task_id": "abc123-def456-789ghi",
  "status": "success",
  "content": "解析出的 PDF 文本內容...",
  "user_id": "user123",
  "file_id": "document001",
  "error": null
}
```

**失敗響應示例**:

```json
{
  "task_id": "abc123-def456-789ghi",
  "status": "failed",
  "content": null,
  "user_id": "user123",
  "file_id": "document001",
  "error": "解析失敗的具體原因"
}
```

## 💻 使用示例

### Command Line (curl)

#### 1. 基本上傳

```bash
curl -X POST \
  -F "file=@/path/to/document.pdf" \
  http://localhost:8000/parse
```

#### 2. 帶用戶和文件識別的上傳

```bash
curl -X POST \
  -F "file=@/path/to/document.pdf" \
  -F "user_id=john_doe" \
  -F "file_id=report_2024_q1" \
  http://localhost:8000/parse
```

#### 3. 查詢結果

```bash
# 使用返回的 task_id
curl http://localhost:8000/task/abc123-def456-789ghi
```

#### 4. 完整流程腳本

```bash
#!/bin/bash
PDF_PATH="/path/to/document.pdf"
USER_ID="john_doe"
FILE_ID="report_001"

# 上傳文件
echo "上傳 PDF..."
RESPONSE=$(curl -s -X POST \
  -F "file=@$PDF_PATH" \
  -F "user_id=$USER_ID" \
  -F "file_id=$FILE_ID" \
  http://localhost:8000/parse)

# 提取 task_id
TASK_ID=$(echo $RESPONSE | jq -r '.task_id')
echo "任務 ID: $TASK_ID"

# 輪詢結果
echo "等待處理完成..."
while true; do
  RESULT=$(curl -s http://localhost:8000/task/$TASK_ID)
  STATUS=$(echo $RESULT | jq -r '.status')

  if [ "$STATUS" = "success" ]; then
    echo "處理成功！"
    echo $RESULT | jq -r '.content' > parsed_content.txt
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "處理失敗: $(echo $RESULT | jq -r '.error')"
    break
  else
    echo "狀態: $STATUS，繼續等待..."
    sleep 2
  fi
done
```

### Python 示例

```python
import requests
import time
import json

class PDFParserClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url

    def upload_pdf(self, file_path, user_id=None, file_id=None):
        """上傳 PDF 文件"""
        url = f"{self.base_url}/parse"

        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {}
            if user_id:
                data['user_id'] = user_id
            if file_id:
                data['file_id'] = file_id

            response = requests.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json()

    def get_result(self, task_id):
        """查詢解析結果"""
        url = f"{self.base_url}/task/{task_id}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()

    def wait_for_completion(self, task_id, timeout=300):
        """等待處理完成"""
        start_time = time.time()

        while time.time() - start_time < timeout:
            result = self.get_result(task_id)
            status = result['status']

            if status == 'success':
                return result['content']
            elif status == 'failed':
                raise Exception(f"處理失敗: {result['error']}")

            time.sleep(2)

        raise TimeoutError("處理超時")

# 使用示例
if __name__ == "__main__":
    client = PDFParserClient()

    # 上傳文件
    upload_result = client.upload_pdf(
        "document.pdf",
        user_id="alice",
        file_id="contract_v2"
    )

    task_id = upload_result['task_id']
    print(f"任務 ID: {task_id}")

    # 等待完成並獲取結果
    try:
        content = client.wait_for_completion(task_id)
        print("解析完成:")
        print(content)
    except Exception as e:
        print(f"錯誤: {e}")
```

### JavaScript 示例

```javascript
class PDFParserAPI {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
  }

  async uploadPDF(file, userId = null, fileId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);
    if (fileId) formData.append('file_id', fileId);

    const response = await fetch(`${this.baseURL}/parse`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getResult(taskId) {
    const response = await fetch(`${this.baseURL}/task/${taskId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async waitForCompletion(taskId, timeout = 300000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.getResult(taskId);

      if (result.status === 'success') {
        return result.content;
      } else if (result.status === 'failed') {
        throw new Error(`處理失敗: ${result.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('處理超時');
  }
}

// 使用示例
async function parseDocument() {
  const api = new PDFParserAPI();
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  try {
    // 上傳文件
    const uploadResult = await api.uploadPDF(file, 'user123', 'doc001');
    console.log('任務 ID:', uploadResult.task_id);

    // 等待完成
    const content = await api.waitForCompletion(uploadResult.task_id);
    console.log('解析結果:', content);

    // 顯示結果
    document.getElementById('result').textContent = content;
  } catch (error) {
    console.error('錯誤:', error);
  }
}
```

## 🏗️ 多用戶並發處理

### 用戶和文件識別

系統通過 `user_id` 和 `file_id` 參數來區分不同用戶和文件：

```bash
# 用戶 A 上傳文件
curl -X POST \
  -F "file=@report.pdf" \
  -F "user_id=alice" \
  -F "file_id=monthly_report_2024_01" \
  http://localhost:8000/parse

# 用戶 B 上傳文件
curl -X POST \
  -F "file=@contract.pdf" \
  -F "user_id=bob" \
  -F "file_id=contract_abc_corp" \
  http://localhost:8000/parse
```

### 任務追蹤最佳實踐

1. **使用有意義的 user_id**:

   ```
   user_id=alice_marketing
   user_id=bob_legal_dept
   user_id=system_batch_job
   ```

2. **使用有意義的 file_id**:

   ```
   file_id=invoice_2024_001
   file_id=contract_vendor_xyz
   file_id=report_q1_2024
   ```

3. **任務 ID 管理**:
   - 每次上傳都會獲得唯一的 `task_id`
   - 建議在客戶端記錄 `task_id` 與業務邏輯的對應關係
   - 可以建立任務狀態追蹤表

## ⚡ 性能特點

### 系統容量

- **並發處理**: 8 個同時處理槽位（2 worker × 4 concurrency）
- **佇列容量**: 無限制（Redis 支撐）
- **處理速度**: 平均 10-50ms per PDF（取決於文件大小）

### 自動擴展

- 系統會自動處理並發請求
- 超出處理能力的請求會自動排隊
- 先進先出 (FIFO) 處理順序

## 🔍 監控和除錯

### 系統狀態查詢

```bash
# 查看佇列長度
docker exec grading-pdf-redis-1 redis-cli llen celery

# 查看活躍任務
docker exec grading-pdf-worker-1 celery -A app.worker.celery_app inspect active

# 查看系統統計
docker exec grading-pdf-worker-1 celery -A app.worker.celery_app inspect stats
```

### 日誌查看

```bash
# 查看所有服務日誌
docker compose logs -f

# 查看特定服務日誌
docker compose logs -f api
docker compose logs -f worker
```

## ❌ 錯誤處理

### 常見錯誤碼

| 狀態碼 | 說明           | 解決方案                  |
| ------ | -------------- | ------------------------- |
| 400    | 非 PDF 文件    | 確保上傳的是 PDF 格式文件 |
| 413    | 文件過大       | 文件大小不能超過 50MB     |
| 500    | 服務器內部錯誤 | 檢查服務狀態或聯繫管理員  |

### 任務失敗處理

```python
def handle_parsing_result(task_id):
    result = client.get_result(task_id)

    if result['status'] == 'failed':
        error_msg = result['error']
        if 'file format' in error_msg.lower():
            print("文件格式錯誤，請確保是有效的 PDF 文件")
        elif 'timeout' in error_msg.lower():
            print("處理超時，請稍後重試")
        else:
            print(f"處理失敗: {error_msg}")
    elif result['status'] == 'success':
        return result['content']
```

## 🔧 部署說明

### 啟動服務

```bash
docker compose up -d
```

### 停止服務

```bash
docker compose down
```

### 查看服務狀態

```bash
docker compose ps
```

這個 API 提供了完整的 PDF 解析解決方案，支持高並發、任務追蹤和用戶隔離，適用於各種規模的應用場景。

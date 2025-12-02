# PDF Parser API Usage Documentation

## Overview

This is a high-performance PDF parsing service based on FastAPI and Celery, supporting asynchronous processing and multi-user concurrent access. It uses the MarkItDown engine to convert PDF files into Markdown format text.

-----

## Quick Start

### Service Address

  - **API Base URL**: `http://localhost:8000`
  - **API Documentation**: `http://localhost:8000/docs`

-----

## API Endpoints

### 1\. Health Check

```http
GET /health
```

**Response Example**:

```json
{
  "status": "healthy",
  "service": "pdf-parser"
}
```

### 2\. Upload PDF for Parsing (Async)

```http
POST /parse
```

**Request Parameters**:

  - `file` (required): PDF file (multipart/form-data)
  - `user_id` (optional): User identifier, defaults to "default"
  - `file_id` (optional): File identifier, used for tracking a specific file

**File Limits**:

  - Only supports PDF format (`application/pdf`)
  - Max file size: 50MB

**Response Example**:

```json
{
  "task_id": "abc123-def456-789ghi",
  "status": "pending",
  "message": "PDF parsing task submitted successfully"
}
```

### 3\. Query Parsing Result

```http
GET /task/{task_id}
```

**Path Parameters**:

  - `task_id`: The Task ID returned upon upload

**Response Status**:

  - `pending`: Task is queued
  - `processing`: Processing in progress
  - `success`: Processing successful
  - `failed`: Processing failed

**Success Response Example**:

```json
{
  "task_id": "abc123-def456-789ghi",
  "status": "success",
  "content": "Parsed PDF text content...",
  "user_id": "user123",
  "file_id": "document001",
  "error": null
}
```

**Failed Response Example**:

```json
{
  "task_id": "abc123-def456-789ghi",
  "status": "failed",
  "content": null,
  "user_id": "user123",
  "file_id": "document001",
  "error": "Specific reason for parsing failure"
}
```

-----

## Usage Examples

### Command Line (curl)

#### 1\. Basic Upload

```bash
curl -X POST \
  -F "file=@/path/to/document.pdf" \
  http://localhost:8000/parse
```

#### 2\. Upload with User and File Identifiers

```bash
curl -X POST \
  -F "file=@/path/to/document.pdf" \
  -F "user_id=john_doe" \
  -F "file_id=report_2024_q1" \
  http://localhost:8000/parse
```

#### 3\. Query Result

```bash
# Use the returned task_id
curl http://localhost:8000/task/abc123-def456-789ghi
```

#### 4\. Complete Process Script

```bash
#!/bin/bash
PDF_PATH="/path/to/document.pdf"
USER_ID="john_doe"
FILE_ID="report_001"

# Upload file
echo "Uploading PDF..."
RESPONSE=$(curl -s -X POST \
  -F "file=@$PDF_PATH" \
  -F "user_id=$USER_ID" \
  -F "file_id=$FILE_ID" \
  http://localhost:8000/parse)

# Extract task_id
TASK_ID=$(echo $RESPONSE | jq -r '.task_id')
echo "Task ID: $TASK_ID"

# Poll for result
echo "Waiting for processing to complete..."
while true; do
  RESULT=$(curl -s http://localhost:8000/task/$TASK_ID)
  STATUS=$(echo $RESULT | jq -r '.status')

  if [ "$STATUS" = "success" ]; then
    echo "Processing successful!"
    echo $RESULT | jq -r '.content' > parsed_content.txt
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Processing failed: $(echo $RESULT | jq -r '.error')"
    break
  else
    echo "Status: $STATUS, continuing to wait..."
    sleep 2
  fi
done
```

### Python Example

```python
import requests
import time
import json

class PDFParserClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url

    def upload_pdf(self, file_path, user_id=None, file_id=None):
        """Upload PDF file"""
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
        """Query parsing result"""
        url = f"{self.base_url}/task/{task_id}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()

    def wait_for_completion(self, task_id, timeout=300):
        """Wait for processing to complete"""
        start_time = time.time()

        while time.time() - start_time < timeout:
            result = self.get_result(task_id)
            status = result['status']

            if status == 'success':
                return result['content']
            elif status == 'failed':
                raise Exception(f"Processing failed: {result['error']}")

            time.sleep(2)

        raise TimeoutError("Processing timed out")

# Usage Example
if __name__ == "__main__":
    client = PDFParserClient()

    # Upload file
    upload_result = client.upload_pdf(
        "document.pdf",
        user_id="alice",
        file_id="contract_v2"
    )

    task_id = upload_result['task_id']
    print(f"Task ID: {task_id}")

    # Wait for completion and get result
    try:
        content = client.wait_for_completion(task_id)
        print("Parsing complete:")
        print(content)
    except Exception as e:
        print(f"Error: {e}")
```

### JavaScript Example

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
        throw new Error(`Processing failed: ${result.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Processing timed out');
  }
}

// Usage Example
async function parseDocument() {
  const api = new PDFParserAPI();
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  try {
    // Upload file
    const uploadResult = await api.uploadPDF(file, 'user123', 'doc001');
    console.log('Task ID:', uploadResult.task_id);

    // Wait for completion
    const content = await api.waitForCompletion(uploadResult.task_id);
    console.log('Parsing result:', content);

    // Display result
    document.getElementById('result').textContent = content;
  } catch (error) {
    console.error('Error:', error);
  }
}
```

-----

## 🏗️ Multi-User Concurrency Handling

### User and File Identification

The system uses `user_id` and `file_id` parameters to differentiate between different users and files:

```bash
# User A uploads a file
curl -X POST \
  -F "file=@report.pdf" \
  -F "user_id=alice" \
  -F "file_id=monthly_report_2024_01" \
  http://localhost:8000/parse

# User B uploads a file
curl -X POST \
  -F "file=@contract.pdf" \
  -F "user_id=bob" \
  -F "file_id=contract_abc_corp" \
  http://localhost:8000/parse
```

### Task Tracking Best Practices

1.  **Use meaningful user\_id**:

    ```
    user_id=alice_marketing
    user_id=bob_legal_dept
    user_id=system_batch_job
    ```

2.  **Use meaningful file\_id**:

    ```
    file_id=invoice_2024_001
    file_id=contract_vendor_xyz
    file_id=report_q1_2024
    ```

3.  **Task ID Management**:

      - A unique `task_id` is obtained for each upload.
      - It is recommended to map the `task_id` to your business logic on the client-side.
      - You can create a task status tracking table.

-----

## ⚡ Performance Characteristics

### System Capacity

  - **Concurrent Processing**: 8 simultaneous processing slots (2 workers × 4 concurrency)
  - **Queue Capacity**: Unlimited (Backed by Redis)
  - **Processing Speed**: Average 10-50ms per PDF (depends on file size)

### Auto-scaling

  - The system automatically handles concurrent requests.
  - Requests exceeding processing capacity are automatically queued.
  - First-In, First-Out (FIFO) processing order.

-----

## 🔍 Monitoring and Debugging

### System Status Query

```bash
# Check queue length
docker exec grading-pdf-redis-1 redis-cli llen celery

# Check active tasks
docker exec grading-pdf-worker-1 celery -A app.worker.celery_app inspect active

# Check system stats
docker exec grading-pdf-worker-1 celery -A app.worker.celery_app inspect stats
```

### View Logs

```bash
# View all service logs
docker compose logs -f

# View specific service logs
docker compose logs -f api
docker compose logs -f worker
```

-----

## ❌ Error Handling

### Common Error Codes

| Status Code | Description | Solution |
| :--- | :--- | :--- |
| 400 | Non-PDF file | Ensure the uploaded file is in PDF format |
| 413 | File too large | File size must not exceed 50MB |
| 500 | Internal Server Error | Check service status or contact admin |

### Task Failure Handling

```python
def handle_parsing_result(task_id):
    result = client.get_result(task_id)

    if result['status'] == 'failed':
        error_msg = result['error']
        if 'file format' in error_msg.lower():
            print("File format error, please ensure it is a valid PDF file")
        elif 'timeout' in error_msg.lower():
            print("Processing timed out, please try again later")
        else:
            print(f"Processing failed: {error_msg}")
    elif result['status'] == 'success':
        return result['content']
```


This API provides a complete PDF parsing solution, supporting high concurrency, task tracking, and user isolation, suitable for various application scenarios.
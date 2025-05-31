
我來幫你規劃這個功能的實作。先讓我看看目前專案的結構，然後為你設計一個詳細的 To Do List。

Ran tool

Ran tool

Ran tool

Read file: app/api/upload/index.ts

Search files...

Read file: package.json

Search files...
根據分析的專案結構和你提供的 Gemini API 文檔，我為你設計了一個詳細的 To Do List：

## 🚀 Google Gemini 整合實作計劃

### 當前狀況分析
✅ **已完成**：
- PDF 上傳系統 (已有 mock 解析功能)
- 評分標準管理系統
- 評分結果展示系統 
- 基礎的評分引擎架構 (使用 mock LLM)

🔄 **需要實作**：
- 真正的 Google Gemini API 整合
- PDF 文字解析 (替換 mock 資料)
- 提示工程最佳化

---

## 📋 To Do List 

### 階段 1: 環境設定和配置 (30 mins)

#### 1.1 安裝和配置 Gemini SDK ✅
```bash
# 已安裝: "@google/genai": "^1.0.1"
```

#### 1.2 環境變數設置
- [ ] 新增 `GEMINI_API_KEY` 到環境變數
- [ ] 更新 `docker-compose.dev.yaml` 和 `docker-compose.prod.yaml`
- [ ] 建立 Gemini 配置檔案

### 階段 2: Gemini 服務實作 (2 hours)

#### 2.1 建立 Gemini 服務類別
- [ ] 建立 `app/services/gemini.server.ts`
- [ ] 實作基本的 Gemini 客戶端連接
- [ ] 建立提示模板系統
- [ ] 錯誤處理和重試機制

#### 2.2 評分提示工程
- [ ] 設計評分系統提示 (system instruction)
- [ ] 建立結構化輸出格式
- [ ] 多語言支援 (中文評分)
- [ ] 評分標準動態注入

### 階段 3: PDF 文字解析整合 (1.5 hours)

#### 3.1 PDF 解析服務
- [ ] 實作真正的 PDF 文字擷取 (使用 `pdf-parse` 或 `@react-pdf/renderer`)
- [ ] 取代 mock `parsedContent`
- [ ] 處理不同 PDF 格式和編碼

#### 3.2 文字預處理
- [ ] 清理和格式化解析後的文字
- [ ] 長文件分塊處理 (token 限制)
- [ ] 保留文件結構資訊

### 階段 4: 評分引擎重構 (2 hours)

#### 4.1 替換 Mock LLM
- [ ] 修改 `app/services/grading-engine.server.ts`
- [ ] 整合真正的 Gemini API 呼叫
- [ ] 實作 `gradWithLLM` 函式

#### 4.2 提示優化
- [ ] 設計多回合對話策略 (如需要)
- [ ] 實作評分一致性檢查
- [ ] 加入評分解釋和建議生成

### 階段 5: API 整合和測試 (1.5 hours)

#### 5.1 API 端點修改
- [ ] 更新評分 API 以使用真正的 Gemini
- [ ] 加強錯誤處理和 fallback 機制
- [ ] 實作 rate limiting 防止 API 濫用

#### 5.2 測試和驗證
- [ ] 單元測試 Gemini 服務
- [ ] 整合測試完整評分流程
- [ ] 效能測試和最佳化

### 階段 6: 使用者體驗優化 (1 hour)

#### 6.1 進度追蹤
- [ ] 更新進度訊息以反映真實 AI 處理階段
- [ ] 估算評分時間並顯示給使用者
- [ ] 錯誤訊息本地化

#### 6.2 結果展示
- [ ] 優化評分結果的呈現格式
- [ ] 加入 AI 信心度指標 (如果可能)
- [ ] 支援重新評分功能

---

## 🎯 關鍵實作重點

### 1. **Gemini 服務架構**
```typescript
// app/services/gemini.server.ts
export class GeminiService {
  private client: GoogleGenAI;
  
  async gradeDocument(content: string, rubric: Rubric): Promise<GradingResult>
  async generatePrompt(content: string, criteria: any[]): Promise<string>
  private handleRetry(): Promise<any>
}
```

### 2. **提示工程策略**
- 使用 system instruction 設定評分員角色
- 結構化輸出 (JSON format)
- Few-shot examples 提升評分品質
- 中文評分和回饋

### 3. **錯誤處理**
- API 限制和重試邏輯
- Fallback 到備用模型
- 部分失敗的優雅降級

### 4. **效能考量**
- 並行處理多個檔案
- 分塊處理長文件
- 快取常用評分標準


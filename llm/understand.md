# 專案分析與理解

## 1. 技術棧

### 核心語言與框架

- **語言**: TypeScript/JavaScript
- **前端框架**: React
- **全端框架**: Remix (基於React的全端框架)
- **CSS框架**: Tailwind CSS (使用shadcn/ui UI元件系統)

### 後端與資料庫

- **資料庫**: PostgreSQL (透過Prisma ORM操作)
- **快取**: Redis (用於存儲進度、上傳狀態)
- **檔案儲存**: MinIO (S3相容的對象存儲服務)

### 主要套件

- **ORM**: Prisma
- **UI元件**: shadcn/ui (基於Radix UI的元件庫)
- **狀態管理**: 主要使用React hooks和context
- **動畫**: Framer Motion, react-spring
- **圖表**: Recharts
- **表單處理**: 原生Form + 自定義驗證
- **認證**: 自建認證系統 + Google OAuth
- **AI整合**: OpenAI API, Google AI (Gemini)
- **檔案處理**: AWS SDK (S3), PapaParse

### 容器化

- Docker & Docker Compose (用於開發和部署)

## 2. 資料夾結構與檔案作用

### 主要資料夾

- **/app**: 應用程式主要代碼

  - **/components**: React元件
    - **/ui**: 基礎UI元件 (基於shadcn/ui)
    - **/grading**: 評分相關元件
    - **/navbar**: 導航相關元件
    - **/sidebar**: 側邊欄元件
    - **/landing**: 著陸頁元件
  - **/routes**: Remix路由與頁面
  - **/services**: 服務層 (API調用、資料處理等)
  - **/lib**: 公用函式庫
  - **/types**: TypeScript型別定義
  - **/config**: 應用程式配置
  - **/utils**: 工具函數
  - **/state**: 狀態管理相關

- **/prisma**: Prisma ORM相關檔案
  - **/migrations**: 資料庫變更記錄
  - **schema.prisma**: 資料庫模型定義

### 重要檔案

- **docker-compose.yaml**: 容器化服務定義
- **Dockerfile**: Docker容器建構指令
- **package.json**: 專案依賴
- **tailwind.config.ts**: Tailwind CSS配置
- **vite.config.ts**: Vite建構工具配置
- **tsconfig.json**: TypeScript配置

## 3. 專案的主要功能與核心邏輯

### 核心功能

1. **AI輔助評分系統**

   - 上傳文件 (PDF, DOCX)
   - 分析文件內容
   - 應用評分標準進行評分
   - 生成詳細反饋與建議

2. **評分標準管理**

   - 創建、編輯、管理評分標準
   - 設置評分條目與權重
   - 應用評分標準到文件評分

3. **用戶管理**

   - 註冊/登入系統
   - 第三方登入整合 (Google)
   - 使用者權限管理

4. **文件處理**
   - 文件上傳與進度追蹤
   - 文件存儲與管理
   - 文件分析與提取內容

### 核心邏輯

1. **評分流程**:

   - 文件上傳 → 內容分析 → 應用評分標準 → 生成反饋 → 顯示評分結果

2. **AI處理流程**:

   - 透過OpenAI/Gemini/Ollama API進行文件內容理解與分析
   - 根據評分標準應用AI模型評估內容
   - 處理AI回應並格式化為結構化反饋

3. **進度追蹤機制**:
   - 使用Redis存儲上傳與評分進度
   - 使用SSE (Server-Sent Events)實時更新進度

## 4. 模組/元件之間的互動方式

### 資料流

1. **前端到後端**:

   - Remix Form提交 → 路由處理 → 服務層處理 → 資料庫/外部API
   - 使用fetcher/loader APIs管理異步狀態

2. **後端到前端**:
   - 路由loader/action → Remix useLoaderData/ActionData hooks → 元件渲染
   - 實時更新透過SSE (useEventSource)

### 主要模組互動

1. **UI元件與業務邏輯**:

   - 透過hooks和props進行狀態管理
   - 透過context提供全域狀態 (如主題、認證)

2. **評分服務與AI整合**:

   - 服務層封裝API調用邏輯
   - 錯誤處理與重試機制
   - 結果格式化與轉換

3. **檔案處理與儲存**:
   - 上傳進度追蹤與實時更新
   - 檔案分析與內容提取
   - 通過MinIO/S3進行永久儲存

## 5. 專案整體架構與開發邏輯摘要

這是一個基於Remix框架的AI輔助教育評分系統，採用現代React全端架構。核心功能圍繞著文件上傳、AI分析、評分標準應用與結果反饋展開。

系統架構採用清晰的層次分離:

- **UI層**: React元件，基於shadcn/ui構建統一介面
- **路由層**: Remix路由處理頁面載入與動作
- **服務層**: 封裝業務邏輯與API調用
- **資料層**: Prisma ORM + PostgreSQL + Redis

核心開發邏輯體現在:

1. **關注點分離**: UI/服務/資料層職責明確
2. **型別安全**: 完整TypeScript型別定義確保開發質量
3. **實時性**: 使用SSE實現評分進度的實時更新
4. **可擴展性**: 模組化設計允許輕鬆整合新的評分標準與AI模型
5. **用戶體驗**: 細節處理如上傳進度、評分動畫增強互動體驗

整體而言，這是一個功能完整的現代全端應用，使用React生態系統的最佳實踐，針對教育評分場景提供AI輔助功能。

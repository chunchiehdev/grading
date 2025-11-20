# 如何引導 Code Assistant 進行 AIRubricAssistant 優化

## 🎯 核心原則

1. **具體而非籠統**：不說「優化」，說「移除 Dialog 改用 flex div」
2. **提供參考**：引用相似的成功實現
3. **限制範圍**：明確不修改的部分
4. **設定驗證標準**：清晰的完成條件

---

## 📝 優質 Prompt 範本

### 完整優化 Prompt（推薦使用）

```markdown
## 任務：優化 AIRubricAssistant 組件架構

### 背景
我們需要簡化 AIRubricAssistant 組件，移除不必要的嵌套設計。
當前組件使用 Dialog 包裹全屏佈局，造成層級過深且代碼重複。

### 參考
- 查看這個成功的實現：`/app/components/agent/AgentChatBoxWithSteps.tsx`
- 該組件使用簡單的 flex div，不用 Dialog
- 我們要應用類似的模式到 AIRubricAssistant

### 需求

#### 1. 移除 Dialog 包裝（使用 Fullscreen Flex Div）
- 改用 `fixed inset-0 z-50 flex flex-col` 替代 Dialog + DialogContent
- 保留所有現有的 ESC 鍵和點擊事件行為
- 為 div 添加 `role="dialog"` 和 `aria-label="AI 評分標準助手"`

#### 2. 簡化 Container 結構
- 使用 ScrollArea 直接包裹訊息
- 移除重複的 max-w-4xl 包裝（只在 max-w-4xl container 內定義一次）
- 使用 flex 佈局管理上下區域

#### 3. 統一 Loading 狀態
- 將 `{isLoading && rubric && ...}` 和 `{isLoading && !rubric && ...}` 合併為單一 LoadingState
- 新建 LoadingRubricState 組件
- 保持原有的 UI 視覺效果

#### 4. 代碼清理
- 移除不必要的 DialogTitle（如有）
- 更新類名确保 Mobile 相容性保持
- 保留所有的 aria 標籤和無障礙特性

### 限制條件

**不修改的部分：**
- ❌ Props 接口（AIRubricAssistantProps）
- ❌ API 調用邏輯（useObject hook 呼叫）
- ❌ RubricPreview 組件
- ❌ MessageItem 內部邏輯（暫不提取）
- ❌ 後端 endpoint

**保留的功能：**
-   ESC 鍵關閉對話
-   所有訊息功能
-   評分標準生成和套用
-   歡迎界面和快速開始
-   Mobile 響應式設計

### 成功標準

完成後應該滿足：
- [ ] `npm run build` 無 TypeScript 錯誤
- [ ] 功能與原組件完全相同
- [ ] 代碼行數減少 15-20%
- [ ] 嵌套層級從 8 層減少到 5 層
- [ ] Mobile 上所有互動元素 ≥ 44x44px
- [ ] 無視覺或交互上的差異

### 提供的參考代碼

見下方 "目標結構" 部分

### 問題排查

如果遇到問題，請：
1. 保留 `role="dialog"` 和 `aria-label` 確保無障礙
2. 確保 z-50 正確應用
3. 驗證 ESC 鍵事件監聽器正確添加
4. 測試 Mobile 鍵盤顯示時的行為

### 目標結構

```tsx
// 大致結構（保留原有細節）
<div 
  className="fixed inset-0 z-50 bg-background flex flex-col"
  role="dialog"
  aria-label="AI 評分標準助手"
  onClick={handleBackdropClick}
>
  <ScrollArea className="flex-1 overflow-y-auto">
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-4">
      {/* 訊息、歡迎、loading */}
    </div>
  </ScrollArea>
  
  <div className="flex-shrink-0 border-t bg-background/95">
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 w-full">
      {/* input form */}
    </div>
  </div>
</div>
```

### 完成後
- 提交 PR 時附上截圖對比
- 加上 commit message: `refactor: simplify AIRubricAssistant architecture`
- 更新組件的 JSDoc comment
```

---

## 🔑 分步驟引導方式

### Prompt 1: 移除 Dialog（第一階段）

```markdown
## 第一步：移除 Dialog 包裝

### 現在的結構
AIRubricAssistant 目前使用 Dialog 組件包裹全屏佈局：
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="fixed inset-0 ... ">
    <DialogTitle className="sr-only">...</DialogTitle>
    {/* ... */}
  </DialogContent>
</Dialog>
```
```

### 目標結構
改用簡單的 flex div：
```tsx
<div 
  className="fixed inset-0 z-50 bg-background flex flex-col"
  role="dialog"
  aria-label="AI 評分標準助手"
>
  {/* 保留內容不變 */}
</div>
```

### 要做的事
1. 移除 `<Dialog>` 和 `<DialogContent>` 包裹
2. 改用上方的 `fixed inset-0 z-50 flex flex-col` div
3. 移除 `<DialogTitle>`
4. 添加 `onClick` 處理程序關閉（點擊背景）
5. 驗證 ESC 鍵功能還有效

### 驗證
```bash
npm run build  # 無 TypeScript 錯誤
```
```

### Prompt 2: 統一 Loading 狀態（第二階段）

```markdown
## 第二步：統一 Loading 狀態

### 問題
目前有兩個獨立的 loading 渲染分支，邏輯重複：

分支 1（有 rubric 時）：
```tsx
{isLoading && rubric && (
  <div className="rounded-xl border border-primary/30 ...">
    <Loader2 ... />
    <span>正在生成評分標準...</span>
    {rubric.name && ...}
  </div>
)}
```

分支 2（無 rubric 時）：
```tsx
{isLoading && !rubric && (
  <div className="flex items-center gap-2 ...">
    <Loader2 ... />
    AI 正在生成評分標準...
  </div>
)}
```

### 解決方案
提取一個 LoadingRubricState 組件合併邏輯

### 新組件代碼位置
`/app/components/rubrics/AIRubricAssistant.tsx` 內（不必新建文件）

### 要做的事
1. 在組件內創建 `LoadingRubricState` 組件
2. 接收 `rubric?: GeneratedRubric` prop
3. 當有 rubric.name 時顯示詳細信息，否則顯示簡單加載
4. 替換兩個分支為 `{isLoading && <LoadingRubricState rubric={rubric} />}`

### 驗證
- 有 rubric 時顯示詳細 loading UI
- 無 rubric 時顯示簡單 loading UI
- 功能與原相同
```

### Prompt 3: 提取常數（第三階段）

```markdown
## 第三步：提取常數和樣式

### 創建新文件
`/app/constants/rubric-assistant.ts`

### 內容
```tsx
export const RUBRIC_ASSISTANT = {
  LABELS: {
    WELCOME_TITLE: 'AI 評分標準助手',
    WELCOME_DESC: '描述您需要的評分標準，我會幫您生成專業的評分項目和等級描述。',
    RUBRIC_GENERATED: '評分標準已生成',
    GENERATING: '正在生成評分標準...',
    ERROR_DEFAULT: '發生錯誤，請稍後再試',
  },
  SUGGESTIONS: [
    '幫我生成一個程式設計作業的評分標準，包含程式碼品質、功能完整性和創意性',
    '我需要一個寫作作業的評分標準，重點在內容深度和文字表達',
  ],
} as const;
```

### 在 AIRubricAssistant.tsx 中使用
import 後替換所有硬編碼的字符串

### 例如
```tsx
// 之前
<h2>AI 評分標準助手</h2>

// 之後
<h2>{RUBRIC_ASSISTANT.LABELS.WELCOME_TITLE}</h2>
```
```

---

## ❌ 要避免的錯誤 Prompt

### ❌ 錯誤 1: 過於籠統
```markdown
"請優化 AIRubricAssistant 組件"
```
**問題**：Code Assistant 不知道優化什麼，可能亂改

### ❌ 錯誤 2: 無上下文
```markdown
"移除 Dialog"
```
**問題**：沒有說明原因和目標結構

### ❌ 錯誤 3: 限制不清
```markdown
"重構這個組件使其更好"
```
**問題**：沒有明確哪些不能改，可能破壞功能

### ❌ 錯誤 4: 無驗證標準
```markdown
"簡化代碼"
```
**問題**：Code Assistant 不知道什麼時候算完成

---

##   優質 Prompt 檢查清單

提交 Prompt 前，檢查以下項目：

- [ ] **具體**：明確說出要改什麼（移除 Dialog，不是「優化」）
- [ ] **目標**：明確結果應該是什麼樣（提供目標代碼結構）
- [ ] **參考**：引用相似的成功實現（AgentChatBoxWithSteps）
- [ ] **限制**：明確說不改什麼（Props、API、其他組件）
- [ ] **標準**：設定清晰的驗證條件（npm build 無錯、功能相同）
- [ ] **範圍**：限制在一個組件或明確的文件
- [ ] **上下文**：提供相關的代碼片段
- [ ] **步驟**：分階段的任務清單

---

## 📊 Prompt 模板汇总

### 模板 1: 簡單修改
```markdown
## 任務：[清晰的修改標題]

### 問題
[當前代碼的問題]

### 解決方案
[目標結構或方法]

### 範圍
文件：[具體文件路徑]
不改：[列出不修改的部分]

### 驗證標準
- [ ] npm run build 通過
- [ ] [其他驗證項]
```

### 模板 2: 複雜重構
```markdown
## 任務：[標題]

### 背景
[為什麼要做這個改變]

### 參考
[類似的成功實現]

### 需求（按優先級）
1. [第一個需求，最具體]
2. [第二個需求]
3. [...]

### 限制條件
**修改：** [可以改的東西]
**不改：** [不能改的東西]

### 成功標準
完成時應該滿足：
- [ ] 項目 1
- [ ] 項目 2
- [ ] ...

### 需要提供的參考
- 相似實現：[文件路徑]
- 設計文檔：[文件路徑]
- ...
```

---

## 🎓 技巧和最佳實踐

### 技巧 1: 提供視覺對比
```markdown
## 改進前後

### 改進前（問題）
[展示當前結構]

### 改進後（目標）
[展示目標結構]

### 為什麼要改
[說明優點]
```

### 技巧 2: 分解複雜任務
不要一次要求太多：
```
❌ 移除 Dialog、統一 Loading、提取常數、重構 MessageItem

  
第一階段：移除 Dialog
第二階段：統一 Loading  
第三階段：提取常數
```

### 技巧 3: 提供測試步驟
```markdown
### 測試步驟
1. 打開組件頁面
2. 點擊打開 AIRubricAssistant
3. 輸入訊息
4. 驗證 loading 顯示
5. 按 ESC 關閉
```

### 技巧 4: 包含無障礙要求
```markdown
### 無障礙要求
- 保留 role="dialog"
- 保留 aria-label="AI 評分標準助手"
- ESC 鍵仍然可用
- 焦點管理正確
```

---

## 🚨 常見問題和解決方案

### Q1: Code Assistant 修改了不應該修改的部分
**原因**：限制條件不夠明確
**解決**：在 Prompt 中明確列出每個不修改的原因
```markdown
### 為什麼不改 RubricPreview?
因為它用在其他地方，改動可能破壞其他組件
```

### Q2: Code Assistant 沒有移除嵌套
**原因**：目標結構太籠統
**解決**：提供具體的目標代碼結構（copy-paste 前 10 行）

### Q3: 修改後功能變了
**原因**：驗證標準不夠詳細
**解決**：提供具體的用戶流程測試步驟

### Q4: 代碼風格不一致
**原因**：沒有提供風格指南
**解決**：引用現有組件的風格，或提供 `.prettierrc` 相關規則

---

## 📋 完整優化的多步驟 Prompt 序列

### Day 1: 架構優化
```markdown
## 周期 1：移除 Dialog 架構（優先級：高）

[使用上方的 "Prompt 1: 移除 Dialog" 內容]
```

### Day 2: 代碼清理
```markdown
## 周期 2：統一 Loading 狀態（優先級：高）

[使用上方的 "Prompt 2: 統一 Loading" 內容]
```

### Day 3: 可維護性
```markdown
## 周期 3：提取常數（優先級：中）

[使用上方的 "Prompt 3: 提取常數" 內容]
```

---

## 🎯 最後的建議

1. **不要一次性大改** → 分階段、可驗證
2. **提供具體範例** → 不要只說「簡化」
3. **明確邊界** → 說清楚什麼不改
4. **測試優先** → 驗證標準要明確
5. **保持溝通** → 如果結果不符預期，迭代調整

記住：好的 Prompt = 節省時間 = Code Assistant 更高效

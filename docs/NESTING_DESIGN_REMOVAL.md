# AIRubricAssistant 嵌套設計移除方案

## 📊 視覺嵌套層次圖

### 當前嵌套（8 層）
```
AIRubricAssistant (1)
└─ Dialog (2)
   └─ DialogContent (3)
      └─ DialogTitle (4) [隱藏]
      └─ flex-col h-screen (5)
         └─ Messages Area (6)
            └─ max-w-4xl container (7)
               └─ space-y-4 items (8)
```

### 問題代碼片段

```tsx
// 問題 1: 不必要的 Dialog 包裝
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="fixed inset-0 ... p-0">
    {/* 實際上用 DialogContent 本身就是全屏 */}
    <DialogTitle className="sr-only" /> {/* 隱藏 */}
    
    {/* 問題 2: 訊息區有兩層 container */}
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4">
        {/* 問題 3: 這裡又是全屏，max-w-4xl 重複 */}
      </div>
    </div>

    {/* 問題 4: 輸入區也有兩層 container */}
    <div className="flex-shrink-0 ...">
      <div className="mx-auto max-w-4xl px-4">
        {/* 重複的 max-w-4xl 邏輯 */}
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

##   解決方案 A: 簡化 Dialog 方案（推薦用於現有代碼）

### 步驟 1: 修改 DialogContent 結構

```tsx
// 移除之前的雙層 container
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="fixed inset-0 max-w-none h-screen p-0 flex flex-col">
    <DialogTitle className="sr-only">AI 評分標準助手</DialogTitle>

    {/* 直接使用 ScrollArea，不再嵌套 max-w-4xl div */}
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-4">
        {/* 歡迎、訊息、loading 內容 */}
      </div>
    </ScrollArea>

    {/* 輸入區：粘性底部 */}
    <div className="flex-shrink-0 border-t bg-background/95">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-4 w-full">
        {/* form 內容 */}
      </div>
    </div>
  </DialogContent>
</Dialog>
```

### 改進效果
-   減少嵌套層級（8 → 6 層）
-   移除重複的 px-4 padding 邏輯
-   ScrollArea 提供更好的行為
-   max-w-4xl 只定義一次

---

## 🚀 解決方案 B: 完全去除 Dialog（高效方案）

### 為什麼要去除 Dialog?

| Dialog 特性 | 實際需要? | 替代方案 |
|-----------|---------|--------|
| Modal overlay | 否 - 想要全屏 | 背景色 |
| ESC 關閉 | 是 | Keyboard event listener |
| 焦點管理 | 是 | useEffect + ref.focus() |
| A11y attributes | 是 | role="dialog" + aria-label |

### 新結構（5 層）

```tsx
export const AIRubricAssistant = ({ 
  isOpen, 
  onClose, 
  onApplyRubric, 
  currentRubric 
}: AIRubricAssistantProps) => {
  
  // 如果不顯示，return null
  if (!isOpen) return null;

  return (
    // 層級 1: 全屏容器
    <div 
      className="fixed inset-0 z-50 bg-background flex flex-col"
      role="dialog"
      aria-label="AI 評分標準助手"
    >
      
      {/* 層級 2: Header（可選） */}
      <div className="flex-shrink-0 border-b bg-background p-4">
        <div className="mx-auto max-w-4xl flex justify-between items-center">
          <h1 className="text-lg font-semibold">AI 評分標準助手</h1>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 層級 3: 訊息區 */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-4">
          {/* 訊息內容 */}
        </div>
      </ScrollArea>

      {/* 層級 4: 輸入區 */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 sm:py-4 w-full">
          {/* input form */}
        </div>
      </div>

      {/* ESC 鍵關閉 */}
      <Keyboard key event listener />
    </div>
  );
};
```

### 實現細節

```tsx
// ESC 鍵支持
useEffect(() => {
  if (!isOpen) return;
  
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, [isOpen, onClose]);

// 點擊背景關閉（如需要）
const handleBackdropClick = (e: React.MouseEvent) => {
  if (e.target === e.currentTarget) onClose();
};

// 搭配 handleBackdropClick
<div ... onClick={handleBackdropClick} />
```

### 改進效果
-   減少嵌套層級（8 → 5 層）
-   移除 Dialog/DialogContent 開銷
-   更簡單的 DOM 結構
-   代碼行數減少 ~40 行

---

## 🔍 MessageItem 嵌套問題

### 當前問題

```tsx
// 訊息渲染
{messages.map((msg, index) => (
  <MessageItem
    key={index}
    role={msg.role}
    content={msg.content}
    rubric={msg.rubric}  // ← 這在訊息氣泡內
    index={index}
    user={user}
    onApplyRubric={handleApplyRubric}
  />
))}

// MessageItem 內部
const MessageItem = ({ role, content, rubric, ... }) => {
  // 氣泡內包含 RubricPreview - 層級過深
  return (
    <div className="flex gap-3">
      <div>
        <Markdown>{content}</Markdown>
        
        {rubric && (
          <div className="mt-4 rounded-xl ...">
            {/* RubricPreview 卡在訊息內 */}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 改進方案

```tsx
// 分離 rubric 顯示到訊息外
{messages.map((msg, index) => (
  <div key={index}>
    <MessageItem
      role={msg.role}
      content={msg.content}
      index={index}
      user={user}
    />
    
    {/* RubricPreview 平行顯示，不嵌套 */}
    {msg.rubric && (
      <div className="mt-4 ml-4 sm:ml-0">
        <RubricPreviewInline 
          rubric={msg.rubric}
          onApply={() => onApplyRubric(msg.rubric)}
        />
      </div>
    )}
  </div>
))}
```

### 優點
-   訊息和 rubric 職責分離
-   MessageItem 更簡單
-   RubricPreview 可獨立定位
-   層級更扁平

---

## 📋 提取常數消除魔法字符串

### 當前問題

```tsx
// 散落的字符串常數
<span className="font-medium text-sm sm:text-base">評分標準已生成</span>
<span className="font-medium text-base sm:text-sm">正在生成評分標準...</span>

// 多次使用相同的類名
className="flex items-center gap-2 text-primary mb-3"
className="flex items-center gap-2 text-primary mb-4"
```

### 改進方案

```tsx
// constants/rubric-assistant.ts
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
  STYLES: {
    HEADER_ICON: 'w-7 h-7 sm:w-8 sm:h-8 text-primary',
    TITLE: 'text-3xl sm:text-3xl font-semibold leading-tight',
    BUTTON_PRIMARY: 'flex items-center gap-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/50 px-4 py-3 sm:py-2.5 text-left text-sm hover:bg-muted transition-colors active:scale-95 touch-manipulation',
  },
} as const;
```

### 使用

```tsx
import { RUBRIC_ASSISTANT } from '@/constants/rubric-assistant';

// 使用
<h2 className={RUBRIC_ASSISTANT.STYLES.TITLE}>
  {RUBRIC_ASSISTANT.LABELS.WELCOME_TITLE}
</h2>

<button className={RUBRIC_ASSISTANT.STYLES.BUTTON_PRIMARY}>
  {RUBRIC_ASSISTANT.SUGGESTIONS[0]}
</button>
```

---

## 🧪 Loading 狀態統一

### 當前問題

```tsx
// 問題 1: 兩個獨立的 loading 分支
{isLoading && rubric && (
  <div className="...">
    {/* 有 rubric 的 loading 狀態 */}
  </div>
)}

{isLoading && !rubric && (
  <div className="flex items-center gap-2">
    {/* 無 rubric 的 loading 狀態 */}
  </div>
)}

// 問題 2: 邏輯重複
<Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
<span>正在生成評分標準...</span>
```

### 改進方案

```tsx
// 提取到組件
const LoadingRubricState = ({ rubric }: { rubric?: GeneratedRubric }) => {
  return (
    <div 
      className="rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-5"
      role="status"
      aria-label="AI 正在處理中"
    >
      <div className="flex items-center gap-2 text-primary mb-4">
        <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" aria-hidden="true" />
        <span className="font-medium text-base sm:text-sm">正在生成評分標準...</span>
      </div>
      
      {rubric?.name && (
        <div>
          <div className="font-medium text-base sm:text-sm text-foreground">
            {rubric.name}
          </div>
          {rubric.description && (
            <div className="text-sm sm:text-xs text-muted-foreground mt-2">
              {rubric.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 使用
{isLoading && <LoadingRubricState rubric={rubric} />}
```

---

## 📈 嵌套複雜度指標

### 改進前後對比

```
改進前 (方案 A)
├─ Dialog (不必要)
├─ DialogContent (不必要)
├─ flex-col (必要)
├─ ScrollArea (必要)
├─ max-w-4xl container (必要)
├─ space-y-4 (必要)
├─ MessageItem (必要)
└─ RubricPreview (嵌套在訊息內 - 不佳)

改進後 (方案 B)
├─ fixed div (必要)
├─ flex-col (必要)
├─ ScrollArea (必要)
├─ max-w-4xl container (必要)
├─ Messages (必要)
├─ MessageItem (必要)
└─ RubricPreview (平行顯示 - 佳)

嵌套層級: 8 → 5 (-37%)
```

---

## 🎯 優化優先級

### 第 1 優先級（必做）
- [ ] 移除 Dialog/DialogContent（節省代碼行數）
- [ ] 統一 Loading 狀態（減少邏輯重複）
- [ ] 提取常數（改進可維護性）

### 第 2 優先級（應做）
- [ ] MessageItem 和 RubricPreview 分離（改進層次感）
- [ ] 提取 LoadingState 組件（可重用）

### 第 3 優先級（可做）
- [ ] 添加 Header（與 AgentChatBoxWithSteps 對齐）
- [ ] 動畫優化（過渡效果）

---

## ⚠️ 注意事項

1. **z-index**: 去除 Dialog 後，需要確保 z-50 適用
2. **焦點管理**: 需要手動管理初始焦點
3. **背景鎖定**: 需要防止背景滾動
4. **Mobile**: 驗證 iOS Safari 的表現
5. **無障礙**: 保留 role="dialog" 和 aria-label

---

## 🔗 參考鏈接

- [React 嵌套組件最佳實踐](https://react.dev/learn/thinking-in-react)
- [shadcn/ui Dialog 文檔](https://ui.shadcn.com/docs/components/dialog)
- [AgentChatBoxWithSteps 實現](./AgentChatBoxWithSteps.tsx)

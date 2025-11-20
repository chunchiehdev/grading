# Sources UI/UX 設計說明

## 完成的改進

### 1.   移除 Debug Logs
- 移除所有 `console.log` debug 語句
- 保持代碼整潔

### 2.   新增 Favicon 顯示
- 使用 Google Favicon Service: `https://www.google.com/s2/favicons?domain={domain}&sz=32`
- 可靠且快速
- 自動 fallback（如果 favicon 載入失敗會隱藏）

### 3.   改進的 UI 設計

#### 新的組件結構

**`SourcesList`**：
- 顯示來源總數
- 使用 grid layout（手機單欄，桌面雙欄）
- 統一的標題和圖示

**`SourceCard`**：
- 引用編號（藍色圓圈）
- Favicon
- 標題（最多 50 字元，自動截斷）
- 域名顯示
- External link 圖示
- Hover 效果
- 完整的無障礙支援（title attribute）

### 4.   URL 處理

**Domain 提取**：
```typescript
function getDomainFromUrl(url: string): string {
  const urlObj = new URL(url);
  return urlObj.hostname.replace('www.', '');
}
```

**文字截斷**：
```typescript
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
```

---

## UI 特色

### 視覺設計

1. **引用編號**
   - 藍色圓形背景
   - 白色數字
   - 清晰易讀

2. **Favicon**
   - 16x16 圖示
   - 圓角處理
   - 如果載入失敗會自動隱藏

3. **內容區域**
   - 標題：較粗字體，限制 2 行（line-clamp-2）
   - 域名：較小字體，半透明，單行截斷

4. **互動效果**
   - Hover：背景變亮
   - Hover：邊框變深
   - Hover：標題顏色變化
   - Smooth transition（200ms）

### 顏色主題

**Light Mode**：
- 背景：`bg-blue-50/30`
- 邊框：`border-blue-200`
- 文字：`text-blue-900`
- Hover：`bg-blue-100/50`

**Dark Mode**：
- 背景：`bg-blue-950/20`
- 邊框：`border-blue-800`
- 文字：`text-blue-100`
- Hover：`bg-blue-900/30`

### 響應式設計

```css
grid grid-cols-1 sm:grid-cols-2
```

- 手機：單欄顯示
- 平板/桌面：雙欄顯示
- 自動調整間距

---

## 使用範例

### 在 StepCard 中
```tsx
{hasSources && <SourcesList sources={step.sources} />}
```

### 在簡單訊息中
```tsx
{steps.length === 1 && steps[0].sources.length > 0 && (
  <SourcesList sources={steps[0].sources} />
)}
```

---

## 效果展示

### 顯示效果

```
┌─────────────────────────────────────────────┐
│ 🔗 參考來源 (9)                              │
├─────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐    │
│ │ ① 🌐 Wikipedia  │ │ ② 🌐 ETtoday    │    │
│ │ 台灣 2024...    │ │ 最新新聞...      │    │
│ │ wikipedia.org ↗ │ │ ettoday.net ↗   │    │
│ └─────────────────┘ └─────────────────┘    │
│                                             │
│ ┌─────────────────┐ ┌─────────────────┐    │
│ │ ③ 🌐 UDN News   │ │ ④ 🌐 CNA        │    │
│ │ 中央社報導...    │ │ 新聞快報...      │    │
│ │ udn.com ↗       │ │ cna.com.tw ↗    │    │
│ └─────────────────┘ └─────────────────┘    │
└─────────────────────────────────────────────┘
```

### 與之前對比

**之前**：
```
📚 參考來源：
[1] wikipedia.org
[2] ettoday.net
[3] udn.com
```
- 純文字連結
- 沒有視覺層次
- 缺少 favicon
- 沒有 hover 效果

**現在**：
-   視覺化卡片
-   Favicon 顯示
-   清晰的引用編號
-   完整的 hover 互動
-   響應式佈局
-   Dark mode 支援

---

## 技術細節

### Favicon Service

使用 Google 的公開服務：
```
https://www.google.com/s2/favicons?domain={domain}&sz=32
```

**優點**：
- 免費且穩定
- 不需要額外配置
- 自動快取
- 支援幾乎所有網站

**備選方案**（未使用）：
- `https://favicon.io/` - 需要 API key
- `https://icons.duckduckgo.com/ip3/{domain}.ico` - 解析度較低
- 直接從網站抓取 - 不可靠

### 效能考量

1. **Lazy loading**：Favicon 由瀏覽器自動 lazy load
2. **Error handling**：如果 favicon 載入失敗，自動隱藏
3. **CSS Grid**：高效的響應式佈局
4. **Tailwind CSS**：最小化 CSS bundle size

---

## 未來改進建議

### 可選的增強功能

1. **來源預覽**
   - Hover 時顯示 URL 預覽
   - 可能包含網站截圖

2. **來源過濾**
   - 按域名分組
   - 顯示/隱藏特定來源

3. **引用追蹤**
   - 點擊來源編號，高亮文字中的引用
   - 實作 inline citations

4. **可訪問性**
   - 添加 ARIA labels
   - 鍵盤導航支援

5. **分析功能**
   - 追蹤哪些來源被點擊
   - 顯示來源可信度評分

---

## 總結

現在的 Sources UI：
- 🎨 **美觀**：現代化的卡片設計
- 📱 **響應式**：適配所有螢幕尺寸
- 🌓 **主題**：完整的 dark mode 支援
- 🔗 **實用**：Favicon、域名、引用編號
- ⚡ **效能**：優化的圖片載入
- ♿ **無障礙**：完整的 title 和語意化 HTML

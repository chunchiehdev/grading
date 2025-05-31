### **所有 Grading 相關文件清單**

#### **📁 服務端文件 (`app/services/`)**
```typescript
grading-engine.server.ts     // 核心評分引擎
grading-result.server.ts     // 評分結果處理 
grading-session.server.ts    // 評分會話管理
grading-progress.server.ts   // 進度追蹤服務
```

#### **🌐 API 路由**
```typescript
app/api/grade/with-rubric.ts    // 使用 grading-session.server
app/api/grade/progress.ts       // 使用 grading-progress.server
app/api/grade/init.ts          // 使用 grading-progress.server
app/api/grading/results.ts     // 使用 grading-result.server
app/api/grading/session.ts     // 使用 grading-session.server
app/api/grading/session.$sessionId.ts // 使用 grading-session.server
```

#### **🎨 UI 組件**
```typescript
app/components/grading/GradingProgress.tsx
app/components/grading/GradingResultDisplay.tsx
```

#### **📄 頁面路由**
```typescript
app/routes/grading-with-rubric.tsx
app/routes/grading-history.tsx
```

#### **🏪 狀態管理**
```typescript
app/stores/gradingStore.ts      // Zustand store
app/types/grading.ts           // TypeScript 類型
```

### **使用關係圖**

```
服務端架構:
grading-session.server ← API routes
    ↓ 
grading-engine.server  ← 核心處理
    ↓
grading-result.server  ← 結果存儲
    ↑
grading-progress.server ← 進度追蹤 (SSE)


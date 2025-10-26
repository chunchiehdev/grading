# 責任分離：Prompt vs Schema

## 問題診斷

### 之前的重複

**Prompt 層說：**
```markdown
## 輸出格式

回應遵循此 JSON 結構：
{
  "totalScore": 數字,
  "breakdown": [{
    "criteriaId": "ID",
    "score": 數字,
    "feedback": "詳細反饋"
  }],
  "overallFeedback": "整體評價"
}
```

**Schema 層也說：**
```javascript
breakdown: {
  minItems: criteriaCount,      // ← 強制：至少 N 個
  maxItems: criteriaCount,      // ← 強制：最多 N 個
  items: {
    required: ['criteriaId', 'score', 'feedback']  // ← 強制：feedback 必須有
  }
}
```

**結論：兩層都在教 AI 同一件事。**

---

## Linus 原則：單一責任

在軟體架構中，每一層應該只負責一件事。應用到 Prompt 工程：

```
┌─────────────────────────────────────────┐
│  System Instruction                     │
│  ├─ 角色定義（教育評分員）               │
│  ├─ 能力定義（基於標準、引用原文等）     │
│  └─ 價值定義（幫助學生改進）             │
└─────────────────────────────────────────┘
                   ↓
        定義 AI 是誰、能做什麼

┌─────────────────────────────────────────┐
│  JSON Schema (responseMimeType)         │
│  ├─ type: OBJECT                        │
│  ├─ properties: {...}                   │
│  ├─ required: [...]                     │
│  ├─ minItems/maxItems                   │
│  └─ 結構強制執行                         │
└─────────────────────────────────────────┘
                   ↓
        強制 AI 的輸出結構（機器級別）
        Google Generative AI 負責驗證

┌─────────────────────────────────────────┐
│  User Prompt (generateTextGradingPrompt)│
│  ├─ 評分標準（具體內容）                 │
│  ├─ 學生作品（具體內容）                 │
│  ├─ 評分任務（具體指示）                 │
│  └─ 內容品質指南（描述性的）             │
└─────────────────────────────────────────┘
                   ↓
        引導 AI 的反饋品質（內容層面）
```

---

## 新的責任分工

### 第 1 層：System Instruction（4 項核心要求）

**責任：** AI 的能力定義

```markdown
## 核心要求

1. **基於標準**：嚴格按照提供的評分標準評分
2. **引用原文**：所有分析必須引用具體的學生原文（用「」標示）
3. **具體反饋**：不要空泛評語，要有可執行的建議
4. **有價值**：反饋應該幫助學生改進，而不只是指出問題
```

**為什麼保留：** AI 需要知道「做什麼樣的評分員」

---

### 第 2 層：JSON Schema（結構強制）

**責任：** 強制輸出結構

```javascript
{
  breakdown: {
    minItems: criteriaCount,     // ← 強制：必須有所有評分項目
    maxItems: criteriaCount,     // ← 強制：不能多，不能少
    items: {
      required: ['criteriaId', 'score', 'feedback']  // ← 強制：feedback 必須有
    }
  }
}
```

**為什麼強大：**
- Gemini API 會在生成時驗證此 schema
- 如果 AI 試圖跳過某個 feedback，API 會拒絕並要求 AI 重新生成
- 這是**硬約束**，不可違反

**實現方式：**
```javascript
const response = await this.client.models.generateContent({
  config: {
    responseMimeType: 'application/json',
    responseSchema,  // ← API 層級強制執行
  }
});
```

**為什麼保留：** 機器必須強制結構，人類指導無法替代

---

### 第 3 層：User Prompt（內容指導）

**責任：** 引導 feedback 的品質

```markdown
## 輸出要求

提供詳細的 JSON 格式評分反饋。每個評分項目的 feedback 應包含：

1. **原文引用和分析**（150-200字）
2. **優點說明**（100-150字）
3. **改進建議**（100-150字）
4. **分數理由**（50-100字）
```

**刪除了什麼：**
- ❌ JSON 格式示例（Schema 已經定義了）
- ❌ 「回應僅包含 JSON」（Schema 已經強制了 `responseMimeType`）
- ❌ 「每個 breakdown 項目必須有 feedback」（Schema 的 `required` 字段已經強制了）

**為什麼刪除：** 這些是 Schema 的責任，Prompt 不應該重複

**為什麼保留：** 字數要求（150-200字等）是 AI 無法從 Schema 推斷的，需要人類指導

---

## 架構對比

### 改進前

```
System Instruction (600 行)
  ├─ 4 部分反饋結構 ✅
  ├─ JSON 格式規則 ✅
  ├─ 字數要求 ✅
  └─ 品質檢查清單 ✅

User Prompt (200 行)
  ├─ 評分標準 ✅
  ├─ 學生作品 ✅
  ├─ 評分任務 ✅
  └─ JSON 格式示例 ❌ (重複！)

JSON Schema (30 行)
  └─ minItems/maxItems/required ✅

結果：三層都在說「回應 JSON」和「feedback 必須有」
```

### 改進後

```
System Instruction (100 行)
  ├─ 角色定義 ✅
  └─ 4 項核心能力 ✅

User Prompt (50 行)
  ├─ 評分標準 ✅
  ├─ 學生作品 ✅
  ├─ 評分任務 ✅
  └─ 內容品質指南（無結構示例）✅

JSON Schema (40 行)
  ├─ minItems/maxItems/required ✅ (強制！)
  └─ 字段描述 ✅

結果：每一層只說自己該說的話
```

---

## 為什麼這樣是安全的

### 風險 #1：「AI 可能不知道該返回 JSON」

**答案：** Schema 強制執行了

```javascript
responseMimeType: 'application/json'  // ← 不是建議，是命令
responseSchema: {...}                 // ← 強制驗證
```

Gemini 2.5 Flash 會：
1. 讀 prompt（了解任務）
2. 讀 schema（了解結構）
3. 生成 JSON（API 驗證，如果格式錯誤就拒絕）

---

### 風險 #2：「AI 可能遺漏某個 feedback」

**答案：** Schema 的 `minItems/maxItems` 強制了

```javascript
breakdown: {
  minItems: 2,    // ← 必須有至少 2 個
  maxItems: 2,    // ← 必須有最多 2 個（精確控制）
  items: {
    required: ['criteriaId', 'score', 'feedback']  // ← 每個都要 feedback
  }
}
```

如果 AI 生成的 breakdown 只有 1 個或 3 個，API 會拒絕。

---

### 風險 #3：「Prompt 應該更詳細地說明 JSON 格式」

**答案：** 沒必要

根據 Google Generative AI 的文件，當使用 `responseSchema` 時：

> The model will follow the schema you provide. Schema validation happens on the server side, so you don't need to worry about the format in your prompt.

**關鍵點：** Schema 驗證發生在**伺服器端**，不是客戶端。AI 會被強制遵守。

---

## 測試驗證

### 新 Prompt 結構的有效性

**測試場景：** 評分一份 2 個評分標準的作業

```
評分標準：
1. 內容完整性 (10 分)
2. 邏輯清晰性 (10 分)

Schema 要求：
breakdown: {
  minItems: 2,
  maxItems: 2,
  items: { required: ['criteriaId', 'score', 'feedback'] }
}

User Prompt 要求：
- 每個 feedback 應包含：
  1. 原文引用和分析（150-200字）
  2. 優點說明（100-150字）
  3. 改進建議（100-150字）
  4. 分數理由（50-100字）
```

**預期結果：**
- ✅ breakdown 中有 2 個項目（不多不少）
- ✅ 每個項目都有 criteriaId、score、feedback
- ✅ 每個 feedback 內容詳細（遵循人類指導）
- ✅ JSON 格式有效（Schema 驗證）

**如果 AI 違反：**
- ❌ 只返回 1 個 breakdown → API 拒絕，要求重新生成
- ❌ feedback 字段為空 → API 拒絕，要求重新生成
- ❌ feedback 只有 50 字 → AI 遵循（Prompt 指導，非強制）

---

## 總結

### 改動內容

| 層級 | 改動前 | 改動後 | 原因 |
|------|--------|--------|------|
| System Instruction | 600 行 | 100 行 | 移除 JSON/字數/結構説明（由 Schema 和 Prompt 負責） |
| User Prompt | 包含 JSON 示例 | 無示例 | Schema 已經定義結構 |
| JSON Schema | 30 行 | 40 行 | 加強 descriptions（指導 AI） |

### 責任分工清晰

- **System Instruction** → 角色和能力（「你是什麼」）
- **JSON Schema** → 結構強制（「你必須這樣輸出」）
- **User Prompt** → 內容品質（「你應該怎麼說」）

### Linus 的智慧

> 「如果你發現自己在用文字重複說明機器可以強制執行的事情，那就是設計不良。」

**改進後**：
- ✅ Prompt 精簡（節省 token）
- ✅ Schema 強化（機器層級強制）
- ✅ 責任清晰（每層只做一件事）

---

## 參考資源

- [Google Generative AI - Response Schema](https://ai.google.dev/api/rest/v1beta/models/generateContent#GenerateContentRequest)
- [JSON Schema - Validation with minItems/maxItems](https://json-schema.org/understanding-json-schema/reference/array.html)
- Linus Torvalds: "Good programmers worry about data structures"

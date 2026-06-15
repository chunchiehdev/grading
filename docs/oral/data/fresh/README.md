# Fresh Data — RQ3 分析資料夾

> **資料夾路徑**：`docs/oral/data/fresh/`
> **資料來源**：生產資料庫直接匯出（PostgreSQL）
> **匯出時間**：2026-05-22
> **資料時間範圍**：2026-03-04（第一份作業）— 2026-05-18（最後一份作業）
> **對應論文章節**：§4 研究方法、§5 研究結果（RQ3）、§6 研究限制

---

## ⚠️ 給下一次 session 的注意事項

讀完這份 README，你應該知道：

1. **不要動 CSV**——這是論文的原始證據，動到就破壞研究紀錄。
2. **要重跑分析**——直接 `python3 run_analysis.py` 即可（見 §6）。
3. **N 數字看不懂時**——對照 §4「N 對照表」，所有數字都從這 5 個 CSV 推算得出。
4. **TAM 問卷原始資料不在這資料夾**——它在 Google Form / 紙本，N=33 是學生自填的問卷統計結果。
5. **🚫 排除規則：「Welcome & System Practice」系統練習作業已於 `run_analysis.py` 中排除**——此作業為 onboarding 任務，非正式反思作業；7 筆提交皆無 AI 評分，僅 2 筆事後測試按鈕之決策。排除規則寫在 `run_analysis.py` 第 19–28 行，CSV 維持原樣不動。下次跑出來看到 「採納決策 = 34（非 36）、採納率 = 94.1%（非 94.4%）」是正常的。

---

## 一、資料夾內容總覽

```
fresh/
├── README.md                    本檔
├── parsed_scores.csv            ★ RQ3 主分析檔（117 列，18 欄）
├── ai_analysis_full.csv         AI 評分原始 JSON（117 列，溯源用）
├── submissions_full.csv         所有作業版本含草稿（135 列）
├── users_students.csv           DB 中所有 STUDENT 角色（41 列，含測試帳號）
├── student_mapping.csv          受測學生 curated roster（31 列）
├── run_analysis.py              一鍵重跑分析的 Python 腳本
└── figures/
    ├── fig38_order_trend.png    投稿次序 × 三向度趨勢線圖
    ├── fig39_heatmap.png        17 位學生反思軌跡熱圖
    ├── fig40_trajectory_pie.png 軌跡分群圓餅圖
    └── fig41_early_late_box.png 早期 vs 晚期分數箱形圖
```

---

## 二、各檔案 schema 與用途

### 2.1 `parsed_scores.csv` ★（RQ3 主分析檔）

**用途**：所有 RQ3 統計分析（混合效應、Mann-Whitney、Spearman）都讀這個檔。
**列數**：117（每位學生最新版本的每份作業 1 列）
**欄位數**：18

| 欄位 | 型別 | 說明 |
|------|------|------|
| `submission_id` | UUID | 作業唯一識別碼 |
| `student_email` | str | 學生 email（join key）|
| `assignment_name` | str | 作業名稱（含週次與標題）|
| `upload_date` | date | 上傳日期（YYYY-MM-DD）|
| `sparringDecision` | enum | `adopt` / `keep` / `null`（僅 P2 有值）|
| `sparringDecisionReason` | str | 學生填寫的決策理由文字 |
| `totalScore` | int | AI 給的「Completion」向度分數（0–4）|
| `maxScore` | int | 滿分上限（恆為 4）|
| `chat_len` | int | 對話訊息數（0 = 沒對話、>0 = 進入對話流程）|
| `completion` | float | 完成度向度（0–4，多為 1）|
| `reflection` | float | **REF：反思向度（0–4）** ⭐ |
| `connection` | float | **CON：學術連結向度（0–4）** ⭐ |
| `development` | float | **DEV：發展向度（0–4）** ⭐ |
| `order` | int | 該學生第 N 次提交（從 1 計起）|
| `phase` | enum | `P1`（採納功能上線前）/ `P2`（上線後）|
| `email` | str | 學生 email（同 student_email）|
| `name` | str | 學生姓名 |
| `nationality` | enum | `S` = 本國生（Self）／`F` = 外籍生（Foreign）|

**過濾規則**：
- 已過濾為 `isLatest = true`（每作業每學生只取最新版）
- 包含尚未評分的草稿，欲分析 AI 評分時需 `dropna(subset=['reflection','connection','development'])`

---

### 2.2 `ai_analysis_full.csv`（AI 評分原始 JSON）

**用途**：當需要追溯某筆作業的「AI 為什麼這樣評分」時，去這裡看 `ai_analysis_json` 欄位。
**列數**：117
**欄位數**：7

| 欄位 | 說明 |
|------|------|
| `submission_id`, `student_email`, `assignment_name`, `upload_date`, `sparringDecision`, `sparringDecisionReason` | 同 `parsed_scores.csv` |
| `ai_analysis_json` | AI 評分完整 JSON 字串（含 breakdown、feedback、reasoning）|

**典型 JSON 結構**（節錄）：
```json
{
  "maxScore": 4,
  "breakdown": [
    {"name": "Reflection on Prior Knowledge", "score": 3, "reasoning": "..."},
    {"name": "Connection to Academic Concepts", "score": 4, "reasoning": "..."},
    {"name": "Evidence of Development/Growth", "score": 3, "reasoning": "..."}
  ],
  "totalScore": 10,
  "feedback": "..."
}
```

---

### 2.3 `submissions_full.csv`（含所有版本歷史）

**用途**：查作業修訂歷程、版本演進、修改延遲時間時使用。
**列數**：135（含同一作業的多版本草稿）
**欄位數**：22

| 欄位 | 說明 |
|------|------|
| `submission_id`, `student_id`, `student_email`, `student_name` | 學生與作業識別 |
| `assignment_name`, `assignment_id`, `course_name` | 作業與課程資訊 |
| `uploadedAt` | 上傳時間戳記（含時分秒）|
| `version` | 版本號（同一作業可有多版）|
| `isLatest` | `t`/`f` — 是否為最新版本 |
| `status` | `DRAFT` / `FINALIZED` / `SUBMITTED` |
| `normalizedScore`, `finalScore` | 標準化分數、最終分數 |
| `sparringDecision`, `sparringDecisionReason`, `sparringDecisionAt` | 採納決策三欄 |
| `sparringRoundsBeforeDecision` | 採納前進行了幾輪挑戰式對話 |
| `sparringDecisionLatencyMs` | 採納決策的反應時間（毫秒）|
| `chat_msg_count` | 對話訊息數 |
| `ai_total_score`, `ai_max_score` | AI 評分總分與上限 |
| `phase` | `P1` / `P2` |

---

### 2.4 `users_students.csv`（DB 全部 STUDENT 角色）

**用途**：理論上的所有可受測者，含測試帳號、未活躍者。**不要直接用這個當分母**——請用 `student_mapping.csv`。
**列數**：41
**欄位數**：5

| 欄位 | 說明 |
|------|------|
| `id` | 使用者 UUID |
| `email` | 登入 email |
| `name` | 顯示姓名 |
| `role` | 角色（此檔已過濾為 `STUDENT`）|
| `createdAt` | 帳號建立時間 |

---

### 2.5 `student_mapping.csv`（受測 curated roster）

**用途**：研究團隊整理後的「實際參與課程的學生名單」，包含國籍標註。是 `parsed_scores.csv` 國籍欄位的來源。
**列數**：31
**欄位數**：3

| 欄位 | 說明 |
|------|------|
| `email` | 學生 email（join key）|
| `name` | 姓名 |
| `nationality` | `S` = 本國生（26 位）／`F` = 外籍生（5 位）|

> ⚠️ **31 ≠ 33**：本檔列出 31 位有 join 進名單的學生；TAM 問卷 N=33 是另外的填答統計。詳見 §4。

---

## 三、N 對照表（最重要！）

下次有人問「為什麼是這個數字」，看這張表：

| N | 來源 | 用於哪個研究問題 | 怎麼算出來 |
|---|------|-----------------|-----------|
| **41** | `users_students.csv` 列數 | （不直接使用）| DB 中所有 `role = STUDENT` 的使用者，含測試帳號與未活躍者 |
| **33** | TAM 問卷統計（不在本資料夾）| **RQ1、RQ2** | Google Form 線上問卷有效填答數 |
| **31** | `student_mapping.csv` 列數 | （內部對照用）| 研究團隊整理的受測學生名單 |
| **30** | `parsed_scores.csv` 唯一 `student_email` | （內部對照用）| 至少上傳過 1 份作業的學生 |
| **28** | `parsed_scores.csv` `dropna(REF/CON/DEV)` 後唯一 `student_email` | **RQ3 主分析** ⭐ | 至少有 1 份 AI 評分作業的學生 |
| **17** | 28 位中提交 ≥ 3 次的學生 | **RQ3 軌跡分群（Spearman）** | 需 ≥ 3 次提交才能計算個人 ρ |
| **5** | 外籍學生（`nationality = F`）| 質性對照 | 28 位中外籍生人數，樣本不足以做跨文化統計比較 |
| **23** | 本國學生（`nationality = S`）| 質性對照 | 28 位中本國生人數 |

### 33 與 28 的差異說明（**口委必問**）

5 位學生填了 TAM 但未在系統留下完整 AI 評分紀錄，可能原因：
- 個人作業時程因素，未在課程期間完成提交
- 檔案提交流程出錯（格式不符、上傳失敗）
- AI 評分服務暫時當機未順利完成評分流程
- 旁聽或課程後期才加入

**論文處理方式**：§4.1 受測者基本資料 + §6 研究限制都已明確揭露，不需補資料、不能補資料。

---

## 四、作業層次的 N（不是學生）

| N | 說明 |
|---|------|
| **135** | `submissions_full.csv` 所有列（含所有版本草稿）|
| **118** | 過濾 `isLatest = t` 後的最新版本數 |
| **117** | `parsed_scores.csv` 列數（CSV 原始；含 Welcome 7 筆）|
| **110** | `parsed_scores.csv` 排除 Welcome 後之有效作業數（**= 正式論文採用**） |
| **110** | 有 AI 評分的作業數（與上一行重合，因 Welcome 7 筆皆無評分）|
| **94** | 有進入對話的作業數（`chat_len > 0`）|
| **90** | 有 AI 評分且有對話的作業數（兩者交集）|
| **34** | **正式採納/保留決策數**（排除 Welcome 2 筆事後測試後）|
| **48** | 早期作業（`order ≤ 2`）|
| **34** | 晚期作業（`order ≥ 5`）|

### 階段分布（110 份有評分作業）

| 階段 | 期間 | 作業數 | 對話場次 |
|------|------|--------|----------|
| **P1** | 2026-03-05 ~ 2026-04-05 | 66 | 56 |
| **P2** | 2026-04-06 ~ 2026-05-18 | 44 | 34 |

---

## 五、論文章節 ↔ 資料對應

| 論文章節 | 資料來源 | 關鍵數字 |
|---------|---------|---------|
| §4.1 受測者背景 | TAM 問卷 + `student_mapping.csv` | TAM N=33；行為分析 N=28 |
| §5 RQ1 結果（科技接受度）| TAM 問卷量化 | N=33；α ∈ [0.934, 0.962]；α_total = 0.958 |
| §5 RQ2 結果（功能知覺有用性）| 功能問卷量化 | N=33；27 題；α ∈ [0.890, 0.943]；α_total = 0.977 |
| §5 RQ3 結果（反思軌跡）| `parsed_scores.csv` | N=28；110 份作業；混合效應 僅 REF β=0.054, p=.086；Mann-Whitney 全部 p<.05 |
| §5 RQ3 軌跡分群 | `parsed_scores.csv`（≥3 次提交者）| N=17；天花板 47.1% / 進步 29.4% / 穩定 17.6% / 下降 5.9% |
| §5 RQ3 採納行為 | `parsed_scores.csv` (`sparringDecision`)| **34 筆決策**（排除 Welcome 後）；採納率 **94.1%**（32/34）|
| §5 RQ4 開放性回饋 | 問卷開放題（不在本資料夾）| 質性歸納 |
| §6 研究限制 | 全部 | 33/28 差異說明、外籍 5 人、p=.086 邊緣顯著 |

---

## 六、跑出來的關鍵統計值（速查）

> 直接在論文或口試引用，不用再跑。但如要驗證，執行 `python3 run_analysis.py`。

### 6.1 混合效應模型（提交順序固定效應）

| 依變項 | β | SE | p 值 | 顯著性 |
|--------|---|----|------|--------|
| REF（反思）| **0.054** | 0.032 | **.086** | 邊緣顯著（𐤟）|
| CON（學術連結）| 0.001 | 0.027 | .976 | 不顯著 |
| DEV（發展）| 0.028 | 0.034 | .399 | 不顯著 |
| 總分 | 0.071 | 0.082 | .383 | 不顯著 |

### 6.2 Mann-Whitney U（早期 n=48 vs 晚期 n=34）

| 依變項 | M_early | M_late | p 值 |
|--------|---------|--------|------|
| REF | 2.96 | 3.68 | **< .001** ★★★ |
| CON | 3.23 | 3.71 | **.018** ★ |
| DEV | 2.94 | 3.59 | **.001** ★★ |
| 總分 | 9.12 | 10.97 | **< .001** ★★★ |

### 6.3 Spearman 軌跡分群（≥3 次提交，N=17）

| 類型 | 判準 | 人數 | 比例 |
|------|------|------|------|
| 天花板型 | 平均 ≥ 11、ρ ≈ 0 | 8 | 47.1% |
| 進步型 | ρ > 0.3 | 5 | 29.4% |
| 穩定型 | -0.3 < ρ < 0.3 | 3 | 17.6% |
| 下降型 | ρ < -0.3 | 1 | 5.9% |

### 6.4 採納行為（P2，N=34）

| 決策 | 人數 | 比例 |
|------|------|------|
| adopt（採納）| 32 | 94.1% |
| keep（保留）| 2 | 5.9% |

---

## 七、如何重跑分析

```bash
cd docs/oral/data/fresh
python3 run_analysis.py
```

**會輸出**：所有 §6 的統計值（混合效應、Mann-Whitney、軌跡分群）到 stdout。
**會產生**：`figures/` 下的 4 張 PNG（已預先存在，會被覆蓋）。

**依賴套件**：`pandas`, `numpy`, `scipy`, `statsmodels`, `matplotlib`

---

## 八、不在本資料夾的相關資料

| 資料 | 位置 | N |
|------|------|---|
| TAM 量化問卷 33 份原始填答 | Google Form / 老師研究室紙本 | 33 |
| 功能知覺有用性問卷 33 份 | 同上 | 33 |
| 開放性回饋問卷（5 題）| 同上 | 33 |
| 論文 PDF | `docs/oral/stable/thesis-jack-final-v2.pdf` | — |
| 修改後論文段落（複製貼上用）| `docs/oral/plans/論文修改版本v1.md` | — |
| 白話統計解說 | `docs/oral/plans/RQ3-我看得懂版.md` | — |

---

## 九、更新紀錄

| 日期 | 變更 |
|------|------|
| 2026-05-22 | 從生產資料庫初次匯出 5 個 CSV |
| 2026-05-23 | 確認 N=28（去除 mean imputation）、4 張圖以 N=28 重繪、撰寫本 README |
| 2026-05-24 | 校正混合效應模型 CON/DEV/總分數字、軌跡分群人數（天花板 8、進步 5、穩定 3、下降 1）；於 `run_analysis.py` 加入「排除 Welcome & System Practice」之規則，採納決策由 36→34、採納率由 94.4%→94.1% |

---

## 十、聯絡資訊

- **研究者**：Jack Kuo (chunchiehdev@gmail.com)
- **系統 GitHub**：`/home/user/workspace/grading`
- **論文路徑**：`docs/oral/stable/thesis-jack-final-v2.pdf`

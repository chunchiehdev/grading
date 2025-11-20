# 作業批改流程圖比較

## HI (Human Intelligence) - 人工批改流程

```mermaid
flowchart LR
    T1[👨‍🏫 教師派發作業] --> S1[👨‍🎓 學生撰寫作業]
    S1 --> S2[👨‍🎓 學生上傳作業]
    S2 --> T2[👨‍🏫 教師收集作業]
    T2 --> T3[👨‍🏫 教師逐一批改]
    T3 --> T4[👨‍🏫 教師記錄成績]
    T4 --> S3[👨‍🎓 學生收到回饋]

    style T1 fill:#fff4e1
    style T2 fill:#fff4e1
    style T3 fill:#fff4e1
    style T4 fill:#fff4e1
    style S1 fill:#e1f5ff
    style S2 fill:#e1f5ff
    style S3 fill:#e1f5ff
```

**時間軸：**
- 派發作業 → 批改完成：**7-14 天**
- 學生等待回饋時間：**5-10 天**

**特點：**
-   深度個人化回饋
-   理解學生思維
- ❌ 批改時間長
- ❌ 學生等待久

---

## AI (Artificial Intelligence) - 自動批改流程

```mermaid
flowchart LR
    T1[👨‍🏫 教師派發作業] --> S1[👨‍🎓 學生撰寫作業]
    S1 --> S2[👨‍🎓 學生上傳作業]
    S2 --> A1[🤖 AI 自動批改]
    A1 --> A2[🤖 AI 生成回饋]
    A2 --> S3[👨‍🎓 學生收到回饋]

    style T1 fill:#fff4e1
    style S1 fill:#e1f5ff
    style S2 fill:#e1f5ff
    style S3 fill:#e1f5ff
    style A1 fill:#e8f5e9
    style A2 fill:#e8f5e9
```

**時間軸：**
- 派發作業 → 批改完成：**2-3 天**
- 學生等待回饋時間：**1 分鐘內**

**特點：**
-   即時回饋
-   評分一致
- ❌ 缺乏人性溫度
- ❌ 難以理解創意思維

---

## HI + AI 協作批改流程

```mermaid
flowchart LR
    T1[👨‍🏫 教師派發作業] --> S1[👨‍🎓 學生撰寫作業]
    S1 --> S2[👨‍🎓 學生上傳作業]
    S2 --> A1[🤖 AI 初步批改]
    A1 --> T2[👨‍🏫 教師審閱調整]
    T2 --> T3[👨‍🏫 教師補充回饋]
    T3 --> S3[👨‍🎓 學生收到回饋]

    style T1 fill:#fff4e1
    style T2 fill:#fff4e1
    style T3 fill:#fff4e1
    style S1 fill:#e1f5ff
    style S2 fill:#e1f5ff
    style S3 fill:#e1f5ff
    style A1 fill:#e8f5e9
```

**時間軸：**
- 派發作業 → 批改完成：**3-5 天**
- 學生等待回饋時間：**2-3 天**

**特點：**
-   兼顧速度與品質
-   評分一致且有溫度
-   教師專注高價值工作
-   學生獲得完整回饋

---

## 三種方式比較表

| 項目 | HI 人工批改 | AI 自動批改 | HI + AI 協作 |
|------|-----------|-----------|------------|
| **批改速度** | 慢 (10-30min/份) | 快 (30-60sec/份) | 中 (2-5min/份) |
| **一致性** | 低-中 | 高 | 高 |
| **成本** | 高 | 低 | 中 |
| **個人化** | 高 | 中 | 高 |
| **可擴展性** | 低 | 高 | 中-高 |
| **適用情境** | 小班、主觀題 | 大班、客觀題 | 中大班、混合題型 |
| **教師負擔** | 重 | 輕 | 中 |
| **學生體驗** | 溫暖但等待久 | 快速但制式 | 兼顧速度與溫度 |

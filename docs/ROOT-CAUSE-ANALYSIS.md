# 🔴 根本原因分析：85% 的 Gemini 反馈丢失

**发现日期**: 2025-10-29 19:40
**严重程度**: 🔴 **Critical**
**影响**: 17/20 学生（85%）收到虚假反馈

---

## 问题总结

虽然 E2E 测试报告 20/20 成功，但数据库中只有 3/20 结果有有效的 Gemini 反馈：

```
  有效反馈: 3 (15%)
❌ 虚假反馈: 17 (85%) - 硬编码默认值
```

---

## 🎯 根本原因

**文件**: `test/mocks/handlers.ts` (第 9 行)

```typescript
// ❌ 这个 mock handler 始终被激活，即使 USE_REAL_APIS=true！
export const handlers = [
  // Mock Gemini API
  http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  totalScore: 85,           // ← 硬编码
                  maxScore: 100,            // ← 硬编码（应该是 4）
                  breakdown: [
                    {
                      criteriaId: '1',      // ← 硬编码（不匹配真实 UUID）
                      name: 'Content Quality',
                      score: 85,            // ← 硬编码
                      feedback: 'Excellent analysis...',
                    },
                  ],
                  overallFeedback: 'Great work overall!',  // ← 硬编码
                }),
              },
            ],
          },
        },
      ],
    });
  }),
  // ...
];
```

---

## 📍 问题链条

### 步骤 1: 环境变量被忽略

```typescript
// test/mocks/handlers.ts 第 4 行
const useRealApis = process.env.USE_REAL_APIS === 'true';  //   被检查

// 但 Gemini mock 始终被应用！❌
http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
  // 这个 handler 无条件激活，无论 useRealApis 的值
  return HttpResponse.json({...});
}),
```

### 步骤 2: MSW 拦截真实 API 请求

当测试运行时，即使环境变量正确：
```
USE_REAL_APIS=true
↓
代码尝试调用真实 Gemini API
↓
MSW mock handler 仍然拦截请求 ❌
↓
返回硬编码的 { totalScore: 85, maxScore: 100, ... }
```

### 步骤 3: criteriaId 不匹配导致反馈丢失

Mock 返回:
```json
{
  "breakdown": [
    {
      "criteriaId": "1",  // ← 硬编码的字符串 ID
      "score": 85,
      "feedback": "Excellent analysis..."
    }
  ]
}
```

实际 rubric 有:
```json
{
  "criteriaId": "4494d809-6ee4-4af0-b710-23a1ba7b2d17"  // ← 真实 UUID
}
```

当 `gemini-simple.server.ts` 第 251-253 行尝试匹配：
```typescript
const feedbackItem = parsed.breakdown?.find(
  (item: Record<string, unknown>) =>
    item.criteriaId === criterion.id ||  // '1' !== 'uuid' ❌
    item.criteriaId === criterion.name   // '1' !== 'Content Quality' ❌
);

if (!feedbackItem) {
  logger.warn(`⚠️ Missing feedback for criterion: ${criterion.id}`);
}

return {
  // ...
  feedback: (feedbackItem?.feedback as string) || 'No feedback available',  // ← 使用默认值
};
```

### 步骤 4: 所有 17 个错误的结果都有相同的硬编码值

因为所有请求都被同一个 mock 拦截了，所有的虚假结果都有：
- `totalScore: 85`
- `maxScore: 100`
- `overallFeedback: 'Great work overall!'`
- `feedback: 'No feedback available'` (匹配失败后的默认值)

---

## 🔬 问题验证

### 数据库中的证据

```sql
SELECT id, result->>'totalScore' as total_score, result->>'maxScore' as max_score,
       result->'breakdown'->0->>'feedback' as feedback FROM grading_results
WHERE result->>'totalScore' = '85' LIMIT 5;
```

结果：
```
| id                                   | total_score | max_score | feedback                |
|--------------------------------------|-------------|-----------|-------------------------|
| 4e1401dc-6cbe-4076-a217-92e90b01193e | 85          | 100       | No feedback available   |
| b7f48280-b2a1-4d65-89f0-9124135debbd | 85          | 100       | No feedback available   |
| 81a58b14-1ccf-4216-8e59-57e8fe1756da | 85          | 100       | No feedback available   |
| 54dae3fd-abd0-4458-84b6-f9dbfa3e3216 | 85          | 100       | No feedback available   |
| 3220af37-d393-4f32-bc59-ef9554a9b3a6 | 85          | 100       | No feedback available   |
```

**所有 17 个"虚假"结果都有完全相同的硬编码值！**

### 3 个有效结果的对比

```
| id                                   | total_score | max_score | feedback                                     |
|--------------------------------------|-------------|-----------|----------------------------------------------|
| 3caa06a9-9bde-4c07-876b-af7db09d5b73 | 3           | 4         | 原文引用和分析：學生在開頭便明確指出... [详细中文反馈] |
| ...                                  | ...         | ...       | ... |
```

**这 3 个有真实的 UUID criteriaId 匹配和详细的中文反馈！**

---

## 🐛 Bug 位置

**文件**: `/home/chunc/workspace/grading/test/mocks/handlers.ts`
**问题**: MSW mock handler 没有被条件性地应用

**当前代码** (错误):
```typescript
const useRealApis = process.env.USE_REAL_APIS === 'true';

export const handlers = [
  // ❌ 这个总是被应用，不管 useRealApis
  http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
    return HttpResponse.json({...});
  }),

  //   这个正确地被条件性应用
  ...(useRealApis ? [] : [
    http.post('https://gradingpdf.grading.software/parse', () => {...}),
  ]),
];
```

**应该是**:
```typescript
const useRealApis = process.env.USE_REAL_APIS === 'true';

export const handlers = [
  //   只在不使用真实 API 时应用 mock
  ...(useRealApis ? [] : [
    http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
      return HttpResponse.json({...});
    }),
  ]),

  // PDF parser 的条件也是对的
  ...(useRealApis ? [] : [
    http.post('https://gradingpdf.grading.software/parse', () => {...}),
  ]),
];
```

---

## 🧪 为什么 E2E 测试没有发现这个问题？

### 原因 1: 测试只检查"成功"状态，不检查数据质量

```typescript
// test/integration/e2e-20-students.test.ts 第 450 行
expect(submissionSuccesses).toBe(STUDENT_COUNT);  // ← 只检查是否创建

// 没有检查：
// - Feedback 是否有意义
// - criteriaId 是否正确匹配
// - maxScore 是否与 rubric 一致
```

### 原因 2: 没有验证反馈内容

```typescript
// PHASE 6 中
const submission = await SubmissionFactory.create({
  aiAnalysisResult: gradingResult?.result,  // ← 接受任何值，包括虚假的
  finalScore: extractTotalScore(gradingResult?.result),  // ← 提取 85
  // ...
});

results[i].submissionStatus = 'success';  // ← 标记为成功，即使反馈虚假
```

---

##   修复方案

### 方案 A: 修改 mock handlers（推荐，快速修复）

```typescript
// test/mocks/handlers.ts
const useRealApis = process.env.USE_REAL_APIS === 'true';

export const handlers = [
  //   只在测试模式下使用 mock
  ...(useRealApis ? [] : [
    http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
      return HttpResponse.json({
        // mock 数据
      });
    }),
  ]),

  ...(useRealApis ? [] : [
    http.post('https://gradingpdf.grading.software/parse', () => {
      // PDF parser mock
    }),
  ]),
];
```

### 方案 B: 增强 E2E 测试验证（长期修复）

```typescript
// test/integration/e2e-20-students.test.ts

// 添加数据质量检查
const validFeedbackResults = results.filter(r => {
  const gradingResult = await db.gradingResult.findUnique({
    where: { /* ... */ }
  });

  return (
    //   maxScore 应该与 rubric 匹配
    gradingResult.result?.maxScore === rubric.criteria.reduce((sum, c) => sum + c.maxScore) &&

    //   totalScore 应该是合理的数值
    typeof gradingResult.result?.totalScore === 'number' &&

    //   feedback 不应该是默认的 "No feedback available"
    gradingResult.result?.breakdown?.every(
      (item) => item.feedback !== 'No feedback available'
    ) &&

    //   overallFeedback 应该是有意义的文本
    gradingResult.result?.overallFeedback?.length > 20
  );
});

expect(validFeedbackResults.length).toBe(STUDENT_COUNT);
```

---

## 📊 影响分析

| 受影响部分 | 当前状态 | 风险 |
|-----------|---------|------|
| **E2E 测试** | 虚假通过 | 🔴 高 - 测试结果不可信 |
| **学生反馈** | 85% 虚假 | 🔴 高 - 学生收不到真实反馈 |
| **教师可见性** | 无法看出差异 | 🟡 中 - 无法察觉问题 |
| **API 配额** | 未被使用 | 🟢 低 - 但隐藏了成本 |

---

## 🚨 立即行动

### 1. 临时禁用 mock（现在）
```bash
# 如果不在测试环境，确保不加载 msw
unset USE_REAL_APIS
```

### 2. 修复 handlers.ts（今天）
将 Gemini mock 包装在 `...(useRealApis ? [] : [...])`

### 3. 增强测试（今天）
添加数据质量检查，不仅检查状态

### 4. 重新运行测试（今天）
```bash
USE_REAL_APIS=true npm run test -- e2e-20-students.test.ts
```

期望结果: 要么所有 20 个都有有效反馈，要么看到明确的 API 错误

---

## 🔗 相关代码文件

- ❌ `/test/mocks/handlers.ts` - **问题根源**
- ⚠️ `/app/services/gemini-simple.server.ts:251-263` - fallback 默认值
- ⚠️ `/test/integration/e2e-20-students.test.ts:450` - 测试不够严格

---

**根本原因确认**: MSW mock handler 覆盖了真实 API，导致所有 Gemini 调用都返回硬编码的虚假数据。

**严重程度**: 🔴 Critical - 测试结果完全不可信

**修复难度**: 🟢 Easy - 只需改一个文件

**预期修复时间**: 5 分钟

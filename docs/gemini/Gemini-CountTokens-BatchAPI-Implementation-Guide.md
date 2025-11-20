# Gemini API 增强指南：Token 计数与批处理 API

**报告日期**: 2025-10-29
**目标**: 在评分系统中实施 countTokens 和 Batch API 功能

---

## 📋 执行摘要

本报告分析了 Gemini 官方文档中的两项关键功能：**Token 计数** 和 **批处理 API**，并提出了在现有评分系统中的实现方案。这两项功能可以显著降低成本并提升系统效率。

### 核心收益
- **Token 计数**: 精确成本预测，防止配额超限
- **Batch API**: 降低 50% 的 API 费用，特别适合批量评分场景

---

## 一、Token 计数 (countTokens) 解析

### 1.1 什么是 Token 计数？

Token 计数是在发送请求 **之前** 精确计算所需 token 数的功能。目前你们的系统使用粗略估算（每 3.5 个字符 = 1 token），这导致成本计算不准确。

### 1.2 当前问题

```typescript
// 现有的粗略估算方法（在 gemini-simple.server.ts）
const tokenEstimate = Math.ceil(totalPromptLength / 3.5);  // 精度低
```

**问题**:
- ❌ 无法准确预测费用
- ❌ 可能触发超配额错误
- ❌ 无法优化 token 使用

### 1.3 Token 计数的工作原理

Gemini API 提供了 `countTokens` 方法来获取精确的 token 数：

```typescript
// 精确的 Token 计数
const response = await ai.models.countTokens({
  model: 'gemini-2.5-flash',
  contents: prompt
});

console.log(`精确 Token 数: ${response.totalTokens}`);
```

### 1.4 应用场景分析

#### A. 成本预测
```typescript
interface TokenCostAnalysis {
  totalTokens: number;
  estimatedCost: number;      // 基于实际 token 数
  costPerToken: number;        // gemini-2.5-flash: $0.075/M input
  maxTokenBudget?: number;     // 教师设定的最大 token
}
```

#### B. 配额管理
```typescript
// 防止超过日配额
async function checkQuotaBeforeGrading(
  submissions: Submission[],
  rubric: Rubric
): Promise<{ canProceed: boolean; totalTokens: number }> {
  let totalTokens = 0;

  for (const submission of submissions) {
    const prompt = buildGradingPrompt(submission, rubric);
    const { totalTokens: count } = await ai.models.countTokens({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    totalTokens += count;
  }

  const dailyQuota = 250000; // 免费层限制
  return {
    canProceed: totalTokens <= dailyQuota,
    totalTokens
  };
}
```

#### C. 动态调整
```typescript
// 根据 token 数调整参数
async function optimizeRequest(
  prompt: string,
  maxTokens: number = 8192
): Promise<{ adjusted: boolean; recommendation: string }> {
  const { totalTokens } = await ai.models.countTokens({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  if (totalTokens > 128000) {  // 接近上限
    return {
      adjusted: true,
      recommendation: '使用文件 API 上传大文档，而不是嵌入文本'
    };
  }

  return { adjusted: false, recommendation: '参数已优化' };
}
```

---

## 二、批处理 API (Batch API) 深度解析

### 2.1 Batch API 是什么？

**Batch API** 是 Gemini 的异步批处理功能，用于同时处理多个请求：

| 特性 | 标准 API | Batch API |
|------|---------|----------|
| 响应时间 | 实时（秒级） | 异步（24 小时内） |
| 成本 | 100% | **50%**   |
| 使用场景 | 实时交互 | 批量/非紧急任务 |
| 请求数 | 单个或少量 | 成百上千 |

### 2.2 两种提交方式对比

#### 方式 A：内联请求 (Inline Requests)
**适用**: ≤ 20MB 的小批量

```typescript
// 用于小批量（< 50 个请求）
const inlineRequests = [
  {
    contents: [{
      parts: [{
        text: '请根据以下标准评分: ...'
      }],
      role: 'user'
    }]
  },
  {
    contents: [{
      parts: [{
        text: '请根据以下标准评分: ...'
      }],
      role: 'user'
    }]
  }
];

const batchJob = await ai.batches.create({
  model: 'gemini-2.5-flash',
  src: inlineRequests,
  config: {
    displayName: 'grading-batch-001'
  }
});

console.log(`创建批处理任务: ${batchJob.name}`);
```

**优点**:
- 简单直接
- 不需要上传文件
- 结果直接返回

**缺点**:
- 限制在 20MB
- 不适合大规模批处理

---

#### 方式 B：文件输入 (Input File - JSONL)
**适用**: > 50 个请求的大批量

**第一步：生成 JSONL 文件**
```typescript
import * as fs from 'fs';

interface BatchRequest {
  key: string;
  request: {
    contents: any[];
    config?: any;
  };
}

async function generateBatchJsonl(
  submissions: Submission[],
  rubric: Rubric
): Promise<string> {
  const requests: BatchRequest[] = submissions.map((sub, idx) => ({
    key: `submission-${sub.id}`,
    request: {
      contents: [{
        parts: [{
          text: buildGradingPrompt(sub, rubric)
        }],
        role: 'user'
      }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 8192
      }
    }
  }));

  const jsonlContent = requests
    .map(req => JSON.stringify(req))
    .join('\n');

  const filePath = '/tmp/grading-batch.jsonl';
  fs.writeFileSync(filePath, jsonlContent);

  return filePath;
}
```

**JSONL 文件格式示例** (`grading-batch.jsonl`):
```jsonl
{"key": "submission-123", "request": {"contents": [{"parts": [{"text": "请评分此作业..."}], "role": "user"}], "config": {"responseMimeType": "application/json", "temperature": 0.3}}}
{"key": "submission-124", "request": {"contents": [{"parts": [{"text": "请评分此作业..."}], "role": "user"}], "config": {"responseMimeType": "application/json", "temperature": 0.3}}}
{"key": "submission-125", "request": {"contents": [{"parts": [{"text": "请评分此作业..."}], "role": "user"}], "config": {"responseMimeType": "application/json", "temperature": 0.3}}}
```

**第二步：上传文件**
```typescript
async function uploadBatchFile(filePath: string) {
  const uploadedFile = await ai.files.upload({
    file: filePath,
    config: {
      displayName: 'grading-batch-001',
      mimeType: 'jsonl'
    }
  });

  return uploadedFile;
}
```

**第三步：创建批处理任务**
```typescript
async function createBatchJob(uploadedFile: any) {
  const batchJob = await ai.batches.create({
    model: 'gemini-2.5-flash',
    src: uploadedFile.name,  // 使用上传的文件
    config: {
      displayName: 'grading-batch-001'
    }
  });

  return batchJob;
}
```

---

### 2.3 批处理任务的完整工作流

```typescript
interface BatchJobWorkflow {
  step1: '创建请求';
  step2: '上传文件（如需要）';
  step3: '提交批处理任务';
  step4: '轮询检查状态';
  step5: '下载结果';
}
```

#### 完整实现示例

```typescript
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ============ 步骤 1-3：创建并提交批处理 ============
async function submitGradingBatch(submissions: Submission[], rubric: Rubric) {
  // 生成 JSONL
  const requests = submissions.map(sub => ({
    key: `submission-${sub.id}`,
    request: {
      contents: [{
        parts: [{
          text: buildGradingPrompt(sub, rubric)
        }],
        role: 'user'
      }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 8192
      }
    }
  }));

  // 使用小批量（< 20MB），直接使用内联方式
  if (submissions.length < 50) {
    const batchJob = await ai.batches.create({
      model: 'gemini-2.5-flash',
      src: requests.map(r => r.request),
      config: {
        displayName: `grading-batch-${Date.now()}`
      }
    });

    return {
      jobId: batchJob.name,
      jobName: batchJob.displayName,
      submittedAt: new Date(),
      totalRequests: submissions.length
    };
  }

  // 大批量：上传 JSONL 文件
  const jsonlContent = requests
    .map(r => JSON.stringify(r))
    .join('\n');

  fs.writeFileSync('/tmp/batch.jsonl', jsonlContent);

  const uploadedFile = await ai.files.upload({
    file: '/tmp/batch.jsonl',
    config: { displayName: 'grading-batch', mimeType: 'jsonl' }
  });

  const batchJob = await ai.batches.create({
    model: 'gemini-2.5-flash',
    src: uploadedFile.name,
    config: {
      displayName: `grading-batch-${Date.now()}`
    }
  });

  return {
    jobId: batchJob.name,
    jobName: batchJob.displayName,
    submittedAt: new Date(),
    totalRequests: submissions.length
  };
}

// ============ 步骤 4：轮询检查状态 ============
async function pollBatchStatus(jobId: string) {
  const completedStates = new Set([
    'JOB_STATE_SUCCEEDED',
    'JOB_STATE_FAILED',
    'JOB_STATE_CANCELLED',
    'JOB_STATE_EXPIRED'
  ]);

  let isComplete = false;
  let job: any = null;

  while (!isComplete) {
    job = await ai.batches.get({ name: jobId });

    console.log(`状态: ${job.state} | 检查时间: ${new Date().toISOString()}`);

    if (completedStates.has(job.state)) {
      isComplete = true;
    } else {
      // 等待 30 秒后重新检查
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  return job;
}

// ============ 步骤 5：下载并处理结果 ============
async function processBatchResults(job: any) {
  if (job.state !== 'JOB_STATE_SUCCEEDED') {
    console.error(`批处理失败: ${job.state}`);
    if (job.error) {
      console.error(`错误详情: ${job.error}`);
    }
    return [];
  }

  const results: any[] = [];

  // 情况 A：内联结果
  if (job.dest?.inlinedResponses) {
    for (const inlineResponse of job.dest.inlinedResponses) {
      if (inlineResponse.response) {
        results.push({
          success: true,
          data: JSON.parse(inlineResponse.response.text)
        });
      } else if (inlineResponse.error) {
        results.push({
          success: false,
          error: inlineResponse.error
        });
      }
    }
  }

  // 情况 B：文件结果（JSONL）
  if (job.dest?.fileName) {
    const fileContent = await ai.files.download({
      file: job.dest.fileName
    });

    const lines = fileContent
      .toString('utf-8')
      .split('\n')
      .filter(line => line.trim());

    for (const line of lines) {
      try {
        const { key, response, error } = JSON.parse(line);

        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          results.push({
            submissionId: key.replace('submission-', ''),
            success: true,
            data: JSON.parse(response.candidates[0].content.parts[0].text)
          });
        } else if (error) {
          results.push({
            submissionId: key.replace('submission-', ''),
            success: false,
            error: error.message
          });
        }
      } catch (e) {
        console.error(`解析结果行失败: ${line}`);
      }
    }
  }

  return results;
}

// ============ 使用示例 ============
async function gradeSubmissionsInBatch(
  submissions: Submission[],
  rubric: Rubric
) {
  try {
    // 步骤 1-3: 提交批处理
    console.log('📤 提交批处理任务...');
    const batchInfo = await submitGradingBatch(submissions, rubric);
    console.log(`  任务已提交: ${batchInfo.jobId}`);

    // 步骤 4: 轮询状态
    console.log('⏳ 等待批处理完成...');
    const completedJob = await pollBatchStatus(batchInfo.jobId);

    // 步骤 5: 处理结果
    console.log('📥 下载并处理结果...');
    const results = await processBatchResults(completedJob);

    // 保存到数据库
    for (const result of results) {
      if (result.success) {
        await saveBatchGradingResult(result.submissionId, result.data);
      } else {
        console.error(`评分失败 - ${result.submissionId}: ${result.error}`);
      }
    }

    return {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error('批处理出错:', error);
    throw error;
  }
}
```

---

### 2.4 Batch API 的任务状态管理

```typescript
enum BatchJobState {
  JOB_STATE_PENDING = 'JOB_STATE_PENDING',      // 待处理
  JOB_STATE_RUNNING = 'JOB_STATE_RUNNING',      // 运行中
  JOB_STATE_SUCCEEDED = 'JOB_STATE_SUCCEEDED',  //   成功
  JOB_STATE_FAILED = 'JOB_STATE_FAILED',        // ❌ 失败
  JOB_STATE_CANCELLED = 'JOB_STATE_CANCELLED',  // 已取消
  JOB_STATE_EXPIRED = 'JOB_STATE_EXPIRED'       // 已过期（> 48 小时）
}
```

**状态转换图**:
```
PENDING → RUNNING → SUCCEEDED  
                  → FAILED ❌
                  → CANCELLED ❌
                  → EXPIRED ❌
```

---

## 三、在评分系统中的集成策略

### 3.1 架构整合

```typescript
// app/services/gemini-batch-grading.server.ts (新增)

interface BatchGradingRequest {
  submissions: Submission[];
  rubric: Rubric;
  classId: string;
  assignmentId: string;
  priority?: 'immediate' | 'normal' | 'low';
}

interface BatchGradingJob {
  jobId: string;
  status: BatchJobState;
  createdAt: Date;
  estimatedCompletion?: Date;
  totalRequests: number;
  successCount: number;
  failureCount: number;
}

export class BatchGradingService {
  async submitBatch(request: BatchGradingRequest): Promise<BatchGradingJob> {
    // 选择合适的提交方式
    if (request.submissions.length < 50) {
      return this.submitInlineBatch(request);
    } else {
      return this.submitFileBatch(request);
    }
  }

  private async submitInlineBatch(request: BatchGradingRequest) {
    // 内联方式
  }

  private async submitFileBatch(request: BatchGradingRequest) {
    // 文件方式
  }

  async checkStatus(jobId: string): Promise<BatchGradingJob> {
    // 检查任务状态
  }

  async retrieveResults(jobId: string): Promise<GradingResult[]> {
    // 获取并保存结果
  }
}
```

### 3.2 与 BullMQ 的整合

```typescript
// 在 bullmq-grading.server.ts 中添加批处理支持

export const gradingQueue = new Queue('grading', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

// 快速评分（实时）- 使用标准 API
gradingQueue.add('grade-single', data, { priority: 1 });

// 批量评分（非实时）- 使用 Batch API
gradingQueue.add('grade-batch', data, { priority: 10 });

// Worker 选择合适的处理方式
gradingQueue.process('grade-batch', async (job) => {
  const batchService = getBatchGradingService();
  const batchJob = await batchService.submitBatch(job.data);

  // 保存 jobId 用于后续检查
  job.data.batchJobId = batchJob.jobId;

  // 异步检查并更新结果
  scheduleBatchStatusCheck(batchJob.jobId);
});
```

### 3.3 UI 实现（React 组件）

```typescript
// app/components/batch-grading-status.tsx

export function BatchGradingStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<BatchGradingJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/batch-status/${jobId}`);
        const data = await response.json();
        setJob(data);

        if (!['JOB_STATE_SUCCEEDED', 'JOB_STATE_FAILED'].includes(data.status)) {
          // 继续轮询
          setTimeout(pollStatus, 30000);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('获取批处理状态失败:', error);
      }
    };

    pollStatus();
  }, [jobId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <p>批处理进行中...</p>
        <p className="text-sm text-gray-500">
          当前状态: {job?.status || '待处理'}
        </p>
        <p className="text-sm text-gray-500">
          已完成: {job?.successCount || 0} / {job?.totalRequests || 0}
        </p>
      </div>
    );
  }

  return (
    <div>
      {job?.status === 'JOB_STATE_SUCCEEDED' && (
        <div className="text-green-600">
            批处理完成！{job.successCount} 个评分成功
        </div>
      )}
      {job?.status === 'JOB_STATE_FAILED' && (
        <div className="text-red-600">
          ❌ 批处理失败。成功: {job.successCount}, 失败: {job.failureCount}
        </div>
      )}
    </div>
  );
}
```

---

## 四、成本与性能分析

### 4.1 成本对比（100 个作业）

```
假设条件：
- 100 个学生作业
- 平均每个 2000 tokens
- 总计 200,000 tokens
- gemini-2.5-flash: $0.075 / 百万 input tokens

┌─────────────────────────────────────────────────────────────┐
│ 方式           │ 费用        │ 响应时间     │ 适用场景      │
├─────────────────────────────────────────────────────────────┤
│ 标准 API       │ $0.015      │ 实时(秒级)   │ 单个/少量评分 │
│ Batch API      │ $0.0075    │ 异步(24h)    │ 批量/非紧急   │
│ 节省比例       │ 50% 节省    │             │             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 速度权衡

```
Token 计数影响：
- countTokens API 调用: ~100ms per request
- 100 个作业: +10 秒开销
- 但能精确预测成本和防止超配额  

Batch API 权衡：
- 提交: 立即完成
- 轮询: 每 30 秒检查一次
- 总耗时: 通常 < 1 小时（大多数情况）
- 最长: 24 小时（SLO）
```

---

## 五、实施路线图

### 阶段 1：Token 计数（第 1-2 周）
```
[ ] 1. 在 gemini-simple.server.ts 添加 countTokens 方法
[ ] 2. 创建 TokenCostAnalysis 接口
[ ] 3. 在批处理前进行成本检查
[ ] 4. 记录 token 使用统计
```

### 阶段 2：Batch API 集成（第 2-4 周）
```
[ ] 1. 创建 gemini-batch-grading.server.ts
[ ] 2. 实现内联批处理（< 50 个请求）
[ ] 3. 实现文件批处理（> 50 个请求）
[ ] 4. 集成状态轮询机制
[ ] 5. 结果处理和数据库保存
```

### 阶段 3：UI 优化（第 4-5 周）
```
[ ] 1. 添加批处理任务队列界面
[ ] 2. 实现实时状态更新
[ ] 3. 成本预测显示
[ ] 4. 批处理历史记录
```

---

## 六、常见问题与解决方案

### Q1: 什么时候选择内联 vs 文件方式？

| 条件 | 选择 |
|------|------|
| 请求数 < 50 | **内联** (更简单) |
| 请求数 50-1000 | **文件** (更稳定) |
| 请求数 > 1000 | **分多个批次** + 文件 |
| 总大小 < 20MB | 两者均可 |
| 需要立即结果 | **标准 API** |

### Q2: 如何处理批处理失败？

```typescript
// 错误恢复策略
if (job.state === 'JOB_STATE_FAILED') {
  // 1. 保存失败的 submission IDs
  const failedIds = extractFailedSubmissions(job);

  // 2. 使用标准 API 重试（成本稍高但保证完成）
  for (const id of failedIds) {
    await gradeWithFallback(id);
  }
}
```

### Q3: 如何监控 API 配额？

```typescript
interface QuotaMonitor {
  dailyLimit: 250000;      // 免费层日限
  currentUsage: number;
  remainingTokens: number;
  warningThreshold: 0.8;   // 80% 时警告
}

async function checkQuotaHealth(): Promise<QuotaMonitor> {
  const usage = await getTokenUsageForDay();
  return {
    dailyLimit: 250000,
    currentUsage: usage,
    remainingTokens: 250000 - usage,
    warningThreshold: 0.8
  };
}
```

---

## 七、安全与最佳实践

### 7.1 错误处理

```typescript
try {
  const batchJob = await submitBatch(...);
} catch (error) {
  if (error.code === 'BATCH_SIZE_EXCEEDED') {
    // 批次过大，分割后重试
    await submitInChunks(requests, 50);
  } else if (error.code === 'QUOTA_EXCEEDED') {
    // 配额不足，延迟处理
    scheduleRetry(requests, '24h');
  } else if (error.code === 'INVALID_REQUEST') {
    // 请求格式错误，记录日志
    logInvalidRequest(error, requests);
  }
}
```

### 7.2 监听和告警

```typescript
// 在 app/services/batch-monitoring.server.ts

export async function monitorBatchJob(jobId: string) {
  const startTime = Date.now();
  const maxDuration = 24 * 60 * 60 * 1000; // 24 小时

  while (true) {
    const job = await ai.batches.get({ name: jobId });

    // 记录状态变化
    if (job.state === 'JOB_STATE_RUNNING') {
      console.log(`[${jobId}] 运行中...`);
    }

    // 检查超时
    if (Date.now() - startTime > maxDuration) {
      await notifyAdmin(`批处理任务超时: ${jobId}`);
      break;
    }

    // 检查完成
    if (['JOB_STATE_SUCCEEDED', 'JOB_STATE_FAILED'].includes(job.state)) {
      await notifyCompletion(jobId, job.state);
      break;
    }

    // 等待后重试
    await sleep(30000);
  }
}
```

---

## 八、总结与建议

### 推荐实施顺序

1. **立即实施（Week 1）**: Token 计数 + 成本追踪
2. **接下来（Week 2-3）**: Batch API 内联方式
3. **最后（Week 4+）**: 文件方式 + 完整监控

### 预期收益

```
┌────────────────────────────────────────────────────────────┐
│ 功能         │ 成本节省    │ 实施时间  │ 优先级          │
├────────────────────────────────────────────────────────────┤
│ countTokens  │ 精确预算    │ 2 天      │ 🔴 高 (先做)    │
│ Batch API    │ 50% 费用    │ 2 周      │ 🟡 中 (跟进)    │
│ 文件上传 API │ 更大文档    │ 1 周      │ 🟢 低 (可选)    │
└────────────────────────────────────────────────────────────┘
```

### 注意事项

- ⚠️ **Batch API 不是幂等的**: 重复提交会创建多个批处理任务
- ⚠️ **超过 48 小时的任务会过期**: 需要重新提交
- ⚠️ **缓存可用**: 即使在批处理中也能使用上下文缓存（成本不变）
-   **立即实施**: Token 计数（无缺点，只有收益）
-   **灵活选择**: 为不同的评分场景选择合适的 API

---

**文档版本**: 1.0
**最后更新**: 2025-10-29
**下一步行动**: 联系开发团队，规划 Token 计数的实施

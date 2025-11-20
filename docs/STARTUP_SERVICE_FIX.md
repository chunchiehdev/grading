# Startup Service Fix - Removed Unused WebSocket Dependencies

## Issues
1. The `startup.server.ts` file was importing and trying to initialize `aiHandlerService` from `./ai-handler.server.js`, but this file doesn't exist in the codebase. This would cause a runtime error on application startup.
2. The `ChatCacheService` warmup was being called, but it's only used by the old WebSocket chat system (via `pagination.server.ts` which is no longer used anywhere).

## Root Cause
The AI handler service was part of the old WebSocket + Redis-based chat architecture that we removed during the AIRubricAssistant refactoring. The service listened to Redis pub/sub events to generate AI responses for WebSocket chat messages.

Since we migrated to direct HTTP streaming with Vercel AI SDK, this service is **no longer needed**.

## Changes Made

### File: [app/services/startup.server.ts](app/services/startup.server.ts)

#### 1. Removed Imports (Lines 2-3)
```diff
- import { ChatCacheService } from './cache.server.js';
- import { aiHandlerService } from './ai-handler.server.js';
```

#### 2. Removed Initialization Calls (Lines 54-58)
```diff
  try {
-   // 1. 初始化快取預熱（非關鍵）
-   await this.initializeCacheWarmup();
-
-   // 2. 啟動 AI 處理服務（關鍵服務）
-   await this.initializeAIHandlerService();
-
-   // 3. 初始化 Circuit Breakers（非關鍵）
+   // 1. 初始化 Circuit Breakers（非關鍵）
    await this.initializeCircuitBreakers();
```

#### 3. Removed `initializeCacheWarmup()` Method (Lines 84-95)
```diff
- /**
-  * 初始化快取預熱
-  */
- private static async initializeCacheWarmup(): Promise<void> {
-   try {
-     logger.info('Starting cache warmup...');
-     await ChatCacheService.warmupCache();
-     logger.info('Cache warmup completed');
-   } catch (error) {
-     logger.error('Cache warmup failed:', error);
-     // 非關鍵錯誤，繼續啟動
-   }
- }
```

#### 4. Removed `initializeAIHandlerService()` Method (Lines 97-109)
```diff
- /**
-  * 啟動 AI 處理服務
-  */
- private static async initializeAIHandlerService(): Promise<void> {
-   try {
-     logger.info('🤖 Starting AI Handler Service...');
-     await aiHandlerService.start();
-     logger.info('  AI Handler Service started successfully');
-   } catch (error) {
-     logger.error('❌ Failed to start AI Handler Service:', error);
-     throw error; // AI 服務是關鍵組件，啟動失敗應該停止系統
-   }
- }
```

#### 5. Removed Graceful Shutdown Calls (Lines 152-155, 163)
```diff
  const gracefulShutdown = async (signal: string) => {
    logger.info(`📋 Received ${signal}, starting graceful shutdown...`);

    try {
-     // 1. 停止 AI 處理服務
-     logger.info('⏳ Stopping AI Handler Service...');
-     await aiHandlerService.stop();
-     logger.info('  AI Handler Service stopped');
-
-     // 2. 給 BullMQ Worker 時間完成當前處理的 jobs
+     // 1. 給 BullMQ Worker 時間完成當前處理的 jobs
```

#### 5. Renumbered Remaining Steps
Updated numbering in shutdown process from 3-4 to 2-3.

## Impact

### Before
- Application would crash on startup with `Cannot find module './ai-handler.server.js'`
- Startup sequence included unnecessary AI handler initialization
- Graceful shutdown tried to stop non-existent service

### After
- Clean startup without errors
- Simplified initialization sequence:
  1. Circuit breakers
  2. BullMQ worker
  3. Graceful shutdown handlers
- Graceful shutdown only handles BullMQ services (10s grace period + cleanup)

## Verification

```bash
# No TypeScript errors related to aiHandlerService
npx tsc --noEmit app/services/startup.server.ts
```

## Related Files That Can Be Cleaned Up
- `app/services/ai-handler.server.ts` - Already removed or never existed
- `app/services/cache.server.ts` - ChatCacheService no longer used (only referenced by unused pagination service)
- `app/services/pagination.server.ts` - Not used anywhere in the codebase
- No longer needed with direct HTTP streaming approach

## Date
2025-11-02

# AI SDK v5 Migration Summary

## Issue
The component was trying to import `useChat` from `ai/react`, but AI SDK v5 changed the package structure. The error was:
```
Cannot find module 'ai/react' or its corresponding type declarations
```

## Root Cause
In AI SDK v5, the package structure was reorganized:
- **Old (v4)**: `import { useChat } from 'ai/react'`
- **New (v5)**: React-specific hooks moved to `@ai-sdk/react`

## Changes Made

### 1. Installed Missing Package
```bash
npm install @ai-sdk/react
```

This package contains the React-specific hooks like `useChat`.

### 2. Fixed Imports

**File**: `app/components/rubrics/AIRubricAssistant.tsx`

```diff
- import { useChat, type Message } from 'ai/react';
+ import { useChat } from '@ai-sdk/react';
+ import { DefaultChatTransport, type UIMessage } from 'ai';
```

**Key Changes**:
- `useChat` now comes from `@ai-sdk/react`
- `DefaultChatTransport` comes from `ai` (core package)
- `Message` type is now `UIMessage` in v5

### 3. Updated Message Type Handling

In AI SDK v5, messages use a `parts` array structure instead of direct `content`:

```typescript
// Added helper function
function getMessageContent(msg: UIMessage): string {
  return msg.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as any).text)
    .join('');
}
```

Updated all message references to use this helper:
- `msg.content` → `getMessageContent(msg)`

### 4. Updated useChat API

AI SDK v5 uses a transport-based architecture:

```diff
- const { messages, status, input, handleInputChange, handleSubmit, error } = useChat({
-   api: '/api/ai/rubric-chat',
-   body: { currentRubric },
- });
+ const { messages, status, sendMessage: sendChatMessage, error } = useChat({
+   transport: new DefaultChatTransport({
+     api: '/api/ai/rubric-chat',
+     body: { currentRubric },
+   }),
+   onError: (error) => {
+     console.error('Chat error:', error);
+   },
+ });
```

**Key Differences**:
- v5 doesn't manage input state internally (removed `input`, `handleInputChange`, `handleSubmit`)
- Uses `transport` parameter with `DefaultChatTransport`
- `sendMessage` expects message object: `sendMessage({ text: input.trim() })`

### 5. Updated Message Sending Logic

```diff
- const sendMessage = (e?: React.FormEvent) => {
-   e?.preventDefault();
-   setChatInput(input.trim());
-   setTimeout(() => {
-     const form = document.getElementById('rubric-chat-form') as HTMLFormElement;
-     if (form) {
-       form.requestSubmit();
-     }
-   }, 0);
-   setInput('');
- };
+ const handleSendMessage = () => {
+   if (!input.trim() || status === 'submitted' || status === 'streaming') {
+     return;
+   }
+   // Send message using AI SDK - sendMessage expects a message object
+   sendChatMessage({ text: input.trim() });
+   setInput('');
+ };
```

## Package Structure Summary

### Installed Packages
```json
{
  "ai": "^5.0.86",              // Core AI SDK
  "@ai-sdk/google": "^2.0.26",  // Google Gemini provider
  "@ai-sdk/react": "^2.0.86"    // React hooks
}
```

### Import Patterns in v5

**For React hooks**:
```typescript
import { useChat } from '@ai-sdk/react';
```

**For core types and utilities**:
```typescript
import { DefaultChatTransport, type UIMessage, convertToCoreMessages } from 'ai';
```

**For AI providers**:
```typescript
import { google } from '@ai-sdk/google';
```

## Breaking Changes in v5

1. **No more `/react` subpath**: Use `@ai-sdk/react` package
2. **Transport-based architecture**: Must use `transport` parameter
3. **No internal input management**: Manage your own input state
4. **Message type changed**: `Message` → `UIMessage` with `parts` array
5. **sendMessage signature**: Takes message object, not string

## Migration Checklist

- [x] Install `@ai-sdk/react` package
- [x] Update imports from `ai/react` to `@ai-sdk/react`
- [x] Import `DefaultChatTransport` from `ai`
- [x] Change `Message` type to `UIMessage`
- [x] Add `getMessageContent()` helper for extracting text from parts
- [x] Update `useChat` to use `transport` parameter
- [x] Remove references to `input`, `handleInputChange`, `handleSubmit`
- [x] Update `sendMessage` calls to pass message objects
- [x] Manage input state manually with `useState`

## Testing

To verify the fix works:
1. Start dev server: `npm run dev`
2. Navigate to: `/teacher/rubrics/new`
3. Click AI assistant button (Sparkles icon)
4. Component should load without import errors
5. Try sending a message - should work with streaming

## References

- AI SDK v5 Documentation: https://sdk.vercel.ai/docs
- Migration Guide: https://sdk.vercel.ai/docs/ai-sdk-ui/migration-guide
- useChat API Reference: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat

## Date
2025-11-02

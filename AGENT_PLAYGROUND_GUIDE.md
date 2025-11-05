# 🤖 AI Agent Playground - Implementation Guide

## What We Built

A fully functional AI agent playground that helps you learn AI SDK 6 Beta through interactive conversations with a multi-step reasoning agent.

---

## 📁 Files Created

### 1. Backend - Learning Agent Service
**File**: `app/services/learning-agent.server.ts`

**What it does:**
- Implements a learning agent with 4 demonstration tools
- Uses AI SDK 6 Beta with `streamText()` and `tool()`
- Demonstrates multi-step reasoning (up to 10 steps)
- Uses Gemini 2.5 Flash model

**Tools implemented:**
1. **Calculator** - Math operations (add, subtract, multiply, divide)
2. **Code Explainer** - Explains programming concepts
3. **Memory Saver** - Remembers information during conversation
4. **Web Search** - Simulates web search (can be replaced with real API)

**Key features:**
```typescript
export async function createLearningAgentStream(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
}) {
  const result = streamText({
    model: gemini('gemini-2.5-flash'),
    system: LEARNING_AGENT_SYSTEM_PROMPT,
    messages: formattedMessages,
    tools: learningAgentTools,
    stopWhen: stepCountIs(10), // Multi-step reasoning
    temperature: 0.7,
  });

  return result;
}
```

---

### 2. API Route
**File**: `app/routes/api.agent-chat.ts`

**What it does:**
- Handles POST requests to `/api/agent-chat`
- Streams responses using AI SDK
- Works without authentication (guest mode)
- Returns proper streaming response with `toTextStreamResponse()`

**Usage:**
```typescript
POST /api/agent-chat
Body: { messages: [{ role: 'user', content: '...' }] }
Response: Streaming text response
```

---

### 3. UI Component - AgentChatBox
**File**: `app/components/agent/AgentChatBox.tsx`

**What it does:**
- Interactive chat interface using `useChat` from `@ai-sdk/react`
- Follows the same pattern as AIRubricAssistant
- Shows welcome message with example prompts
- Displays tool calls in special cards
- Auto-scrolls as messages arrive
- Handles loading and error states

**Key features:**
- Uses `DefaultChatTransport` for API communication
- Extracts text from `UIMessage.parts`
- Shows tool invocations with icons
- Real-time streaming responses

**Code pattern:**
```typescript
const { messages, status, sendMessage, error } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/agent-chat',
  }),
});

// Send message
sendMessage({ text: input.trim() });

// Extract content
function getMessageContent(msg: UIMessage): string {
  return msg.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
```

---

### 4. Page Route
**File**: `app/routes/agent-playground.tsx`

**What it does:**
- Full-page playground interface
- Info cards explaining features
- Embedded chatbox
- Code example showing implementation
- Links to AI SDK documentation

---

### 5. Route Registration
**File**: `app/routes.ts` (updated)

Added two routes:
```typescript
// Public page
route('/agent-playground', './routes/agent-playground.tsx'),

// API endpoint
route('/api/agent-chat', './routes/api.agent-chat.ts'),
```

---

### 6. Navigation Link
**File**: `app/components/landing/HeroSection.tsx` (updated)

Added "🤖 Try AI Agent" button on the landing page.

---

## 🚀 How to Use

### 1. Start the Development Server

```bash
# If using Docker
docker-compose -f docker-compose.dev.yaml up -d

# Or npm
npm run dev
```

### 2. Visit the Playground

Open your browser to:
```
http://localhost:3000/agent-playground
```

### 3. Try Example Prompts

Click on any of the welcome prompts:
- "Calculate 234 * 567"
- "Explain async/await in JavaScript"
- "Remember that my name is Alice"
- "Search for latest AI trends"

### 4. Watch the Agent Work

You'll see:
1. Agent receives your message
2. Agent thinks and decides which tools to use
3. Tool calls appear with their inputs/outputs
4. Agent provides a final answer

---

## 📚 What You'll Learn

### 1. Multi-Step Reasoning

The agent doesn't just give an answer - it breaks down the task:

**Example**: "Calculate 234 * 567 and explain the result"

```
Step 1: Agent calls calculator tool
  Input: { operation: 'multiply', a: 234, b: 567 }
  Output: { result: 132678, explanation: '234 multiply 567 = 132678' }

Step 2: Agent generates explanation
  "The result is 132,678. This is a large number because..."
```

### 2. Tool Calling

See how the agent decides when to use tools:

**User**: "What's the weather like?"
**Agent**: Calls `web_search` tool → Returns answer

**User**: "What's 25 + 75?"
**Agent**: Calls `calculator` tool → Returns 100

### 3. Conversation Memory

The agent can remember context:

**User**: "My name is Alice"
**Agent**: Calls `memory_saver` → Saves: key='user_name', value='Alice'

**User**: "What's my name?"
**Agent**: "Your name is Alice!" (remembers from context)

### 4. Streaming Responses

Watch the agent's response appear word-by-word in real-time.

---

## 🔧 How It Works (Technical)

### AI SDK 6 Beta Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│                                         │
│  useChat() hook                         │
│    ├─ DefaultChatTransport              │
│    ├─ messages state                    │
│    └─ sendMessage()                     │
└──────────────┬──────────────────────────┘
               │ POST /api/agent-chat
               ▼
┌─────────────────────────────────────────┐
│       API Route (Server)                │
│                                         │
│  createLearningAgentStream()            │
│    └─ streamText()                      │
└──────────────┬──────────────────────────┘
               │ Uses tools
               ▼
┌─────────────────────────────────────────┐
│      Learning Agent (Server)            │
│                                         │
│  System Prompt + Tools                  │
│    ├─ calculator                        │
│    ├─ code_explainer                    │
│    ├─ memory_saver                      │
│    └─ web_search                        │
└──────────────┬──────────────────────────┘
               │ Calls Gemini API
               ▼
┌─────────────────────────────────────────┐
│       Gemini 2.5 Flash                  │
│  (Multi-step reasoning model)           │
└─────────────────────────────────────────┘
```

### Message Flow

1. **User types message** → `sendMessage({ text: 'Calculate 5 + 3' })`
2. **Frontend sends to API** → `POST /api/agent-chat`
3. **Backend calls agent** → `streamText()` with tools
4. **Agent reasons** → "I need to use calculator tool"
5. **Tool executes** → `calculator({ operation: 'add', a: 5, b: 3 })`
6. **Tool returns result** → `{ result: 8 }`
7. **Agent continues** → "The answer is 8"
8. **Frontend receives stream** → Updates UI in real-time

---

## 🎓 Learning Resources

### AI SDK 6 Beta Documentation

- **Official Docs**: https://v6.ai-sdk.dev
- **Tool API**: https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool
- **streamText API**: https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text
- **useChat Hook**: https://v6.ai-sdk.dev/docs/reference/ai-sdk-react/use-chat

### Key Concepts to Explore

1. **Tool Definition** - How to create tools with Zod schemas
2. **Multi-step Reasoning** - `stopWhen: stepCountIs(n)`
3. **Streaming** - `streamText()` vs `generateText()`
4. **Message Parts** - Understanding `UIMessage.parts` structure
5. **Transport** - `DefaultChatTransport` configuration

---

## 🛠️ Extending the Agent

### Add a New Tool

1. Create the tool in `learning-agent.server.ts`:

```typescript
export const myNewTool = tool({
  description: 'Description of what this tool does',
  inputSchema: z.object({
    param1: z.string().describe('First parameter'),
    param2: z.number().describe('Second parameter'),
  }),
  execute: async ({ param1, param2 }) => {
    // Your logic here
    return {
      result: 'something',
    };
  },
});
```

2. Add to tools collection:

```typescript
export const learningAgentTools = {
  calculator: calculatorTool,
  code_explainer: codeExplainerTool,
  memory_saver: memorySaverTool,
  web_search: webSearchTool,
  my_new_tool: myNewTool, // ← Add here
};
```

3. Update the UI to show the new tool icon (optional):

```typescript
const toolIcons: Record<string, string> = {
  calculator: '🧮',
  code_explainer: '💻',
  memory_saver: '💾',
  web_search: '🔍',
  my_new_tool: '🔧', // ← Add here
};
```

---

## 🐛 Troubleshooting

### Issue: Agent doesn't call tools

**Solution**: Check the system prompt. Make sure it encourages tool usage:

```typescript
const SYSTEM_PROMPT = `You are a helpful assistant.
When the user asks you to calculate something, use the calculator tool.
When asked about code, use the code_explainer tool.
...
`;
```

### Issue: Streaming not working

**Check**:
1. API route returns `result.toTextStreamResponse()`
2. Frontend uses `DefaultChatTransport`
3. Endpoint is `POST` not `GET`

### Issue: Tool results not showing

**Check**:
1. `message.parts` contains `type: 'tool-call'` items
2. ToolCallCard component is rendering
3. Look for console errors in browser

---

## 🎯 Next Steps

### For Learning:
1. Try adding your own custom tool
2. Modify the system prompt to change agent behavior
3. Experiment with `stopWhen` limits
4. Add conversation history persistence

### For Production:
1. Add authentication (currently guest mode)
2. Implement real web search API
3. Add RAG (vector database) for knowledge retrieval
4. Add conversation history to database
5. Implement rate limiting
6. Add cost tracking (token usage)

---

## 📊 Comparison with Your Grading Agent

| Feature | Learning Agent | Grading Agent |
|---------|---------------|---------------|
| Purpose | Educational demo | Production grading |
| Tools | 4 simple tools | 6 specialized grading tools |
| Model | Gemini 2.5 Flash | Gemini 2.5 Flash |
| Max Steps | 10 | 15 |
| Auth | Optional | Required |
| Persistence | None | Database logging |
| UI | Simple chat | Complex review UI |
| Use Case | Learning/demo | Mission-critical |

**Key Difference**: The grading agent has the token limit issues we discussed in the code review. The learning agent is simpler and won't hit those limits in normal use.

---

## ✅ Success Checklist

After implementation, you should be able to:

- [ ] Visit `/agent-playground` and see the welcome screen
- [ ] Click an example prompt and see it populate the input
- [ ] Send a message and see streaming response
- [ ] See tool calls displayed when agent uses tools
- [ ] Ask for calculations and see calculator tool used
- [ ] Ask about code and see code explainer tool used
- [ ] Have multi-turn conversations
- [ ] See proper error messages if something fails

---

**Built with AI SDK 6 Beta • Powered by Gemini 2.5 Flash • React Router v7**

**Created**: 2025-11-05
**Status**: ✅ Complete and Working

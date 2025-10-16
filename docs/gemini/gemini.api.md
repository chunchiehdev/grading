以下是你提供的文件內容，轉換成 Markdown 格式：

---

# Text Generation

The Gemini API can generate text output from various inputs, including text, images, video, and audio, leveraging Gemini models.

## Basic Example

Takes a single text input:

```js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

async function main() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'How does AI work?',
  });
  console.log(response.text);
}

await main();
```

---

# System Instructions and Configurations

Guide the model's behavior using `GenerateContentConfig`.

### Example with system instruction:

```js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

async function main() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Hello there',
    config: {
      systemInstruction: 'You are a cat. Your name is Neko.',
    },
  });
  console.log(response.text);
}

await main();
```

### Example overriding generation parameters:

```js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

async function main() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Explain how AI works',
    config: {
      maxOutputTokens: 500,
      temperature: 0.1,
    },
  });
  console.log(response.text);
}

await main();
```

Refer to the API reference for full `GenerateContentConfig` options.

---

# Multimodal Inputs

Supports combining text with media files (e.g., images):

```js
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

async function main() {
  const image = await ai.files.upload({
    file: '/path/to/organ.png',
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [createUserContent(['Tell me about this instrument', createPartFromUri(image.uri, image.mimeType)])],
  });

  console.log(response.text);
}

await main();
```

Also supports document, video, and audio inputs.

---

# Streaming Responses

Get responses incrementally as they're generated:

```js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

async function main() {
  const response = await ai.models.generateContentStream({
    model: 'gemini-2.0-flash',
    contents: 'Explain how AI works',
  });

  for await (const chunk of response) {
    console.log(chunk.text);
  }
}

await main();
```

---

# Multi-turn Conversations (Chat)

Use SDKs to maintain conversation history.

```js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

async function main() {
  const chat = ai.chats.create({
    model: 'gemini-2.0-flash',
    history: [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Great to meet you. What would you like to know?' }] },
    ],
  });

  const response1 = await chat.sendMessage({ message: 'I have 2 dogs in my house.' });
  console.log('Chat response 1:', response1.text);

  const response2 = await chat.sendMessage({ message: 'How many paws are in my house?' });
  console.log('Chat response 2:', response2.text);
}

await main();
```

## Chat with Streaming

```js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

async function main() {
  const chat = ai.chats.create({
    model: 'gemini-2.0-flash',
    history: [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Great to meet you. What would you like to know?' }] },
    ],
  });

  const stream1 = await chat.sendMessageStream({ message: 'I have 2 dogs in my house.' });
  for await (const chunk of stream1) {
    console.log(chunk.text);
    console.log('_'.repeat(80));
  }

  const stream2 = await chat.sendMessageStream({ message: 'How many paws are in my house?' });
  for await (const chunk of stream2) {
    console.log(chunk.text);
    console.log('_'.repeat(80));
  }
}

await main();
```

---

# Supported Models

All Gemini models support text generation. Visit the **Models** page for full capabilities.

---

# Best Practices

## Prompting Tips

- Zero-shot prompts work for basic generation.
- Use system instructions for guidance.
- Use few-shot examples to tailor outputs.
- Fine-tune for advanced needs.
- Refer to the **prompt engineering guide** for more.

## Structured Output

Need structured output like JSON? See the **structured output guide**.

---

# What's Next

- Try the **Gemini API getting started Colab**.
- Explore image, video, audio, and document understanding.
- Learn about multimodal file prompting strategies.

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Gemini client as backup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

// Helper for Groq Generate
async function groqGenerate(prompt, format = '') {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not configured');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      response_format: format === 'json' ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Helper for Groq Chat
async function groqChat(messages) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not configured');

  const groqMessages = messages.map(msg => ({
    role: msg.role === 'ai' || msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
    content: msg.text || (msg.parts && msg.parts[0]?.text) || ' ',
  }));

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
      messages: groqMessages,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Helper for local ollama generate
async function ollamaGenerate(prompt, format = '') {
  const response = await fetch(`${process.env.LOCAL_LLM_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3',
      prompt: prompt,
      stream: false,
      format: format === 'json' ? 'json' : undefined
    })
  });
  if (!response.ok) throw new Error('Ollama connection failed');
  const data = await response.json();
  return data.response;
}

// Helper for local ollama chat
async function ollamaChat(messages) {
  const ollamaMessages = messages.map(msg => ({
    role: msg.role === 'ai' || msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
    content: msg.text || (msg.parts && msg.parts[0]?.text) || " "
  }));

  const response = await fetch(`${process.env.LOCAL_LLM_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3',
      messages: ollamaMessages,
      stream: false
    })
  });
  if (!response.ok) throw new Error('Ollama connection failed');
  const data = await response.json();
  return data.message.content;
}

/**
 * Send a prompt and return the text response. Prioritizes Groq / Ollama.
 */
export async function generateText(prompt, options = {}) {
  // 1. Groq LLM (High-speed cloud LLM)
  if (process.env.GROQ_API_KEY && (process.env.LLM_PROVIDER === 'groq' || process.env.USE_LOCAL_LLM === 'true')) {
    try {
      console.log(`[Groq LLM] Routing text generation to ${process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'}...`);
      return await groqGenerate(prompt);
    } catch (err) {
      console.warn(`[Groq LLM] Warning (${err.message}), checking next fallback...`);
    }
  }

  // 2. Local Ollama (Offline Local LLM)
  if (process.env.USE_LOCAL_LLM === 'true' && process.env.LOCAL_LLM_URL) {
    try {
      console.log(`[Ollama] Routing text generation to ${process.env.OLLAMA_MODEL}...`);
      return await ollamaGenerate(prompt);
    } catch (err) {
      console.warn(`[Ollama] Failed (${err.message}), falling back to Gemini...`);
    }
  }

  // 3. Google Gemini 2.5 Flash fallback
  const config = {
    temperature: 0.7,
    maxOutputTokens: 2048,
    ...options,
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: config,
    });

    if (!result.response) {
      throw new Error('No response from Gemini');
    }

    return result.response.text();
  } catch (error) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('AI_QUOTA_EXCEEDED');
    }
    throw error;
  }
}

/**
 * Send a prompt and parse the JSON response.
 */
export async function generateJSON(prompt, options = {}) {
  // 1. Groq JSON Mode
  if (process.env.GROQ_API_KEY && (process.env.LLM_PROVIDER === 'groq' || process.env.USE_LOCAL_LLM === 'true')) {
    try {
      console.log(`[Groq LLM] Routing JSON generation to ${process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'}...`);
      const response = await groqGenerate(prompt, 'json');
      const cleaned = response.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn(`[Groq LLM] JSON parsing error (${err.message}), checking next fallback...`);
    }
  }

  // 2. Ollama JSON Mode
  if (process.env.USE_LOCAL_LLM === 'true' && process.env.LOCAL_LLM_URL) {
    try {
      console.log(`[Ollama] Routing JSON generation to ${process.env.OLLAMA_MODEL}...`);
      const response = await ollamaGenerate(prompt, 'json');
      return JSON.parse(response);
    } catch (err) {
      console.warn(`[Ollama] Failed (${err.message}), falling back to Gemini JSON generation...`);
    }
  }

  // 3. Gemini fallback
  const text = await generateText(prompt, {
    temperature: 0.4,
    ...options,
  });

  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt regex extraction of JSON object or array
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        // Continue to error
      }
    }
    throw new Error(`Invalid JSON: ${cleaned.slice(0, 300)}`);
  }
}

/**
 * Handle a conversational sequence.
 */
export async function generateChat(messages, options = {}) {
  // 1. Groq Chat
  if (process.env.GROQ_API_KEY && (process.env.LLM_PROVIDER === 'groq' || process.env.USE_LOCAL_LLM === 'true')) {
    try {
      console.log(`[Groq LLM] Routing chat to ${process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'}...`);
      return await groqChat(messages);
    } catch (err) {
      console.warn(`[Groq LLM] Chat error (${err.message}), falling back...`);
    }
  }

  // 2. Ollama Chat
  if (process.env.USE_LOCAL_LLM === 'true' && process.env.LOCAL_LLM_URL) {
    try {
      console.log(`[Ollama] Routing chat to ${process.env.OLLAMA_MODEL}...`);
      return await ollamaChat(messages);
    } catch (err) {
      console.warn(`[Ollama] Failed (${err.message}), falling back to Gemini chat...`);
    }
  }

  // 3. Gemini Chat
  const config = {
    temperature: 0.7,
    maxOutputTokens: 2048,
    ...options,
  };

  const rawContents = messages.map(msg => {
    const parts = [];
    if (msg.text) parts.push({ text: msg.text });
    if (msg.file && msg.file.data && msg.file.mimeType) {
      parts.push({ inlineData: { data: msg.file.data, mimeType: msg.file.mimeType } });
    }
    if (parts.length === 0) parts.push({ text: " " });
    return {
      role: msg.role === 'ai' || msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts
    };
  });

  const contents = [];
  rawContents.forEach((msg) => {
    if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
      contents[contents.length - 1].parts.push(...msg.parts);
    } else {
      contents.push({ role: msg.role, parts: msg.parts });
    }
  });

  try {
    const result = await model.generateContent({
      contents,
      generationConfig: config,
    });
    if (!result.response) throw new Error('No response from Gemini');
    return result.response.text();
  } catch (error) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('AI_QUOTA_EXCEEDED');
    }
    throw error;
  }
}

export default { generateText, generateJSON, generateChat };

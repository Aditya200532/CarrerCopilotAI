import OpenAI from 'openai';
import { env, LLM_AVAILABLE } from '../config/env.js';

/**
 * Thin wrapper around any OpenAI-compatible API (OpenAI, Groq, Together,
 * LM Studio, Ollama proxy...). Centralizing this means the rest of the
 * codebase never imports the SDK directly — swapping providers touches one file.
 */
let client = null;
if (LLM_AVAILABLE) {
  client = new OpenAI({ apiKey: env.llm.apiKey, baseURL: env.llm.baseUrl });
}

export function isLLMConfigured() {
  return LLM_AVAILABLE;
}

/**
 * Chat completion that demands JSON back and parses it defensively.
 * @param {string} system  system prompt (role + output contract)
 * @param {string} user    user content
 * @param {{temperature?: number, maxTokens?: number}} [opts]
 */
export async function completeJSON(system, user, { temperature = 0.3, maxTokens = 2000 } = {}) {
  if (!client) throw new Error('LLM is not configured');

  const completion = await client.chat.completions.create({
    model: env.llm.model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    return JSON.parse(raw);
  } catch {
    // Some models wrap JSON in prose despite response_format — extract it.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM returned no parseable JSON');
    return JSON.parse(match[0]);
  }
}

/** Plain-text completion (used for topic explanations shown in the UI). */
export async function completeText(system, user, { temperature = 0.4, maxTokens = 1200 } = {}) {
  if (!client) throw new Error('LLM is not configured');
  const completion = await client.chat.completions.create({
    model: env.llm.model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? '';
}

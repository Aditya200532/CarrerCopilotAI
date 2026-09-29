import { aiService } from '../ai/aiService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const aiController = {
  /**
   * Generic topic explanation — the Redis cache showcase endpoint.
   * First student asking about "binary search" triggers one LLM call; every
   * later request is served from cache (response includes `cached: true`).
   */
  explainTopic: asyncHandler(async (req, res) => {
    const { topic } = req.body;
    const result = await aiService.explainTopic(topic);
    res.json({
      success: true,
      data: result,
      meta: { cached: result.cached, source: result.source },
    });
  }),

  /** Health/config info so the UI can show whether live AI or fallback mode is active. */
  status: asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      data: {
        llmConfigured: aiService.isConfigured(),
        mode: aiService.isConfigured() ? 'llm' : 'local-fallback',
      },
    });
  }),
};

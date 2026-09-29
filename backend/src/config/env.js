import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: required('MONGO_URI', 'mongodb://localhost:27017/careerpilot'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: required('JWT_SECRET', 'dev-secret-do-not-use-in-prod'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  llm: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    aiMax: Number(process.env.AI_RATE_LIMIT_MAX || 20),
  },
  cache: {
    topicTtl: Number(process.env.CACHE_TTL_TOPIC || 7 * 24 * 3600),
    questionTtl: Number(process.env.CACHE_TTL_QUESTION || 24 * 3600),
  },
};

export const LLM_AVAILABLE = Boolean(env.llm.apiKey);

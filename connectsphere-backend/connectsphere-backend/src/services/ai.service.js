const config = require('../config');
const ApiError = require('../utils/ApiError');

let client = null;
function getClient() {
  if (!config.ai.configured) {
    throw new ApiError(503, 'AI features are not configured on this server');
  }
  if (client) return client;
  // Works with any OpenAI-compatible API (OpenAI, Gemini compat, OpenRouter, Groq...).
  const OpenAIPkg = require('openai');
  const OpenAI = OpenAIPkg.OpenAI || OpenAIPkg;
  client = new OpenAI({ apiKey: config.ai.apiKey, baseURL: config.ai.baseUrl });
  return client;
}

// Calls the model and parses a JSON object response, tolerating code fences.
async function jsonCompletion(system, user, { temperature = 0.7 } = {}) {
  const res = await getClient().chat.completions.create({
    model: config.ai.model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const raw = res.choices?.[0]?.message?.content || '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    throw new ApiError(502, 'AI returned an unexpected response, please retry');
  }
}

async function generateCaptions({ topic, tone = 'casual', count = 3 }) {
  const system =
    'You are a social media copywriter. Always respond with ONLY valid minified JSON, no markdown.';
  const user = `Write ${count} ${tone} social media captions about: "${topic}".
Then suggest 8 relevant lowercase hashtags (no # symbol).
Respond as JSON: {"captions": string[], "hashtags": string[]}.`;
  const data = await jsonCompletion(system, user, { temperature: 0.9 });
  return {
    captions: Array.isArray(data.captions) ? data.captions.slice(0, count) : [],
    hashtags: Array.isArray(data.hashtags) ? data.hashtags.slice(0, 12) : [],
  };
}

async function improveText({ text, action }) {
  const instructions = {
    grammar: 'Fix grammar, spelling and punctuation. Keep meaning and tone identical.',
    tone: 'Improve clarity and tone to sound more polished and engaging.',
    expand: 'Expand into a richer, more detailed version while staying on topic.',
    rewrite: 'Rewrite professionally and concisely.',
  };
  const system =
    'You are a writing assistant. Always respond with ONLY valid minified JSON, no markdown.';
  const user = `${instructions[action]}
Text: "${text}"
Respond as JSON: {"result": string}.`;
  const data = await jsonCompletion(system, user, { temperature: 0.4 });
  return { result: typeof data.result === 'string' ? data.result : '' };
}

async function moderateContent(content) {
  const system =
    'You are a strict but fair content moderation classifier. Always respond with ONLY valid minified JSON, no markdown.';
  const user = `Classify the following content for policy violations.
Content: "${content}"
Respond as JSON:
{"flagged": boolean, "categories": {"toxic": boolean, "spam": boolean, "hate": boolean, "abuse": boolean}, "score": number between 0 and 1, "reason": string}.`;
  const data = await jsonCompletion(system, user, { temperature: 0 });
  return {
    flagged: Boolean(data.flagged),
    categories: data.categories || { toxic: false, spam: false, hate: false, abuse: false },
    score: typeof data.score === 'number' ? data.score : 0,
    reason: data.reason || '',
  };
}

module.exports = { generateCaptions, improveText, moderateContent };

const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');
const aiService = require('../services/ai.service');

const status = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: { configured: config.ai.configured, model: config.ai.configured ? config.ai.model : null },
  });
});

const caption = asyncHandler(async (req, res) => {
  const { topic, tone, count } = req.body;
  const data = await aiService.generateCaptions({ topic, tone, count });
  res.json({ success: true, data });
});

const improve = asyncHandler(async (req, res) => {
  const { text, action } = req.body;
  const data = await aiService.improveText({ text, action });
  res.json({ success: true, data });
});

const moderate = asyncHandler(async (req, res) => {
  const data = await aiService.moderateContent(req.body.content);
  res.json({ success: true, data });
});

module.exports = { status, caption, improve, moderate };

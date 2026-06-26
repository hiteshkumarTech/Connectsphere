/** Extracts unique lowercase hashtags (without the # symbol) from text. */
function extractHashtags(text = '') {
  const matches = text.match(/#([a-zA-Z0-9_]{1,50})/g) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

/** Extracts unique lowercase @usernames mentioned in text. */
function extractMentionUsernames(text = '') {
  const matches = text.match(/@([a-zA-Z0-9_]{3,30})/g) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

module.exports = { extractHashtags, extractMentionUsernames };

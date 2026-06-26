// The six reactions, matched to the backend Reaction enum.
export const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'laugh', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'applause', emoji: '👏', label: 'Applause' },
];

export const REACTION_EMOJI = REACTIONS.reduce((m, r) => ({ ...m, [r.type]: r.emoji }), {});

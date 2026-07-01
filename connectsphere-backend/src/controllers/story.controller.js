const Story = require('../models/Story');
const Follow = require('../models/Follow');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, uploadVideoBuffer } = require('../utils/cloudinaryUpload');

const AUTHOR_FIELDS = 'username name avatar verifiedBadge';
const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function followingIdsOf(userId) {
  const docs = await Follow.find({ follower: userId }).select('following').lean();
  return docs.map((d) => d.following);
}

// POST /stories  (field: media = a single image or video)
const createStory = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('A story needs a photo or video');
  const isVideo = req.file.mimetype.startsWith('video/');
  const caption = (req.body.caption || '').trim();

  const uploaded = isVideo
    ? await uploadVideoBuffer(req.file.buffer, 'connectsphere/stories')
    : await uploadBuffer(req.file.buffer, 'connectsphere/stories');

  const story = await Story.create({
    author: req.user.id,
    mediaType: isVideo ? 'video' : 'image',
    media: {
      url: uploaded.url,
      publicId: uploaded.publicId,
      thumbnail: uploaded.thumbnail || '',
      duration: uploaded.duration || 0,
    },
    caption,
    expiresAt: new Date(Date.now() + STORY_TTL_MS),
  });

  const populated = await story.populate('author', AUTHOR_FIELDS);
  res.status(201).json({ success: true, message: 'Story added', data: { story: populated } });
});

// GET /stories  -> active stories from me + people I follow, grouped by author
const getStoriesFeed = asyncHandler(async (req, res) => {
  const me = String(req.user.id);
  const followingIds = await followingIdsOf(req.user.id);
  const authorIds = [...followingIds, req.user.id];

  const stories = await Story.find({
    author: { $in: authorIds },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: 1 })
    .populate('author', AUTHOR_FIELDS)
    .lean();

  const groups = new Map();
  for (const st of stories) {
    const aid = String(st.author._id);
    if (!groups.has(aid)) {
      groups.set(aid, { author: st.author, isMe: aid === me, hasUnviewed: false, items: [] });
    }
    const viewed = (st.viewers || []).some((v) => String(v) === me);
    const group = groups.get(aid);
    group.items.push({
      _id: st._id,
      mediaType: st.mediaType,
      media: st.media,
      caption: st.caption,
      createdAt: st.createdAt,
      expiresAt: st.expiresAt,
      viewed,
      viewersCount: (st.viewers || []).length,
    });
    if (!viewed) group.hasUnviewed = true;
  }

  const result = [...groups.values()].sort((a, b) => {
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1; // my story first
    if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1; // unseen next
    const aLast = a.items[a.items.length - 1].createdAt;
    const bLast = b.items[b.items.length - 1].createdAt;
    return new Date(bLast) - new Date(aLast); // most recent first
  });

  res.json({ success: true, data: { stories: result } });
});

// POST /stories/:id/view
const viewStory = asyncHandler(async (req, res) => {
  await Story.updateOne({ _id: req.params.id }, { $addToSet: { viewers: req.user.id } });
  res.json({ success: true, data: { viewed: true } });
});

// DELETE /stories/:id
const deleteStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) throw ApiError.notFound('Story not found');
  if (String(story.author) !== String(req.user.id)) throw ApiError.forbidden('Not your story');
  await story.deleteOne();
  res.json({ success: true, message: 'Story deleted' });
});

module.exports = { createStory, getStoriesFeed, viewStory, deleteStory };

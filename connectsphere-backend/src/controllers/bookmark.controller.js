const Bookmark = require('../models/Bookmark');
const Post = require('../models/Post');
const Reaction = require('../models/Reaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, meta } = require('../utils/pagination');

const AUTHOR_FIELDS = 'username name avatar verifiedBadge';

const savePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).select('_id');
  if (!post) throw ApiError.notFound('Post not found');
  await Bookmark.updateOne(
    { user: req.user.id, post: post._id },
    { $setOnInsert: { user: req.user.id, post: post._id } },
    { upsert: true }
  );
  res.json({ success: true, data: { saved: true } });
});

const unsavePost = asyncHandler(async (req, res) => {
  await Bookmark.findOneAndDelete({ user: req.user.id, post: req.params.postId });
  res.json({ success: true, data: { saved: false } });
});

// Returns the viewer's saved posts in the same shape as the main feed so the
// existing feed components render them unchanged.
const getSavedPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { user: req.user.id };

  const [bookmarks, total] = await Promise.all([
    Bookmark.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'post', populate: { path: 'author', select: AUTHOR_FIELDS } })
      .lean(),
    Bookmark.countDocuments(filter),
  ]);

  // Skip bookmarks whose post has since been deleted.
  const posts = bookmarks.map((b) => b.post).filter(Boolean);

  const ids = posts.map((p) => p._id);
  if (ids.length) {
    const reactions = await Reaction.find({
      user: req.user.id,
      targetType: 'post',
      target: { $in: ids },
    })
      .select('target type')
      .lean();
    const map = new Map(reactions.map((r) => [String(r.target), r.type]));
    posts.forEach((p) => {
      p.myReaction = map.get(String(p._id)) || null;
      p.saved = true;
    });
  }

  res.json({ success: true, data: { posts, pagination: meta(page, limit, total) } });
});

module.exports = { savePost, unsavePost, getSavedPosts };

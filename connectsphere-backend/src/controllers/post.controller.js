const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const Follow = require('../models/Follow');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, meta } = require('../utils/pagination');
const { uploadBuffer, deleteImage } = require('../utils/cloudinaryUpload');
const { extractHashtags, extractMentionUsernames } = require('../utils/text');
const { notify } = require('../services/notification.service');
const { moderateContent } = require('../services/ai.service');
const config = require('../config');

const AUTHOR_FIELDS = 'username name avatar verifiedBadge';

async function resolveMentions(text) {
  const usernames = extractMentionUsernames(text);
  if (!usernames.length) return [];
  const users = await User.find({ username: { $in: usernames } }).select('_id').lean();
  return users.map((u) => u._id);
}

// Annotates lean post objects with the viewer's own reaction (or null).
async function attachMyReactions(posts, userId) {
  if (!userId || posts.length === 0) {
    posts.forEach((p) => {
      p.myReaction = null;
    });
    return posts;
  }
  const ids = posts.map((p) => p._id);
  const reactions = await Reaction.find({
    user: userId,
    targetType: 'post',
    target: { $in: ids },
  })
    .select('target type')
    .lean();
  const map = new Map(reactions.map((r) => [String(r.target), r.type]));
  posts.forEach((p) => {
    p.myReaction = map.get(String(p._id)) || null;
  });
  return posts;
}

async function followingIdsOf(userId) {
  const docs = await Follow.find({ follower: userId }).select('following').lean();
  return docs.map((d) => d.following);
}

const createPost = asyncHandler(async (req, res) => {
  const content = (req.body.content || '').trim();
  const visibility = req.body.visibility || 'public';
  const files = req.files || [];

  let images = [];
  if (files.length) {
    images = await Promise.all(files.map((f) => uploadBuffer(f.buffer, 'connectsphere/posts')));
  }
  if (!content && images.length === 0) {
    throw ApiError.badRequest('A post needs text or at least one image');
  }

  const hashtags = extractHashtags(content);
  const mentions = await resolveMentions(content);

  let moderation = { status: 'clean', reason: '' };
  if (config.ai.moderationOnPost && content) {
    try {
      const result = await moderateContent(content);
      if (result.flagged) {
        moderation = { status: 'flagged', reason: result.reason || 'Flagged by AI moderation' };
      }
    } catch (_e) {
      /* never block posting because the AI provider failed */
    }
  }

  const post = await Post.create({
    author: req.user.id,
    type: images.length ? 'image' : 'text',
    content,
    images,
    hashtags,
    mentions,
    visibility,
    moderation,
  });

  await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } });

  await Promise.all(
    mentions
      .filter((id) => String(id) !== req.user.id)
      .map((id) => notify({ recipient: id, sender: req.user.id, type: 'mention', post: post._id }))
  );

  const populated = await post.populate('author', AUTHOR_FIELDS);
  const obj = populated.toObject();
  obj.myReaction = null;
  res.status(201).json({ success: true, message: 'Post created', data: { post: obj } });
});

const getFeed = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const followingIds = await followingIdsOf(req.user.id);

  // New users with an empty graph see recent public posts instead of a blank feed.
  const filter = followingIds.length
    ? { author: { $in: [...followingIds, new mongoose.Types.ObjectId(req.user.id)] } }
    : { visibility: 'public' };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);

  await attachMyReactions(posts, req.user.id);
  res.json({ success: true, data: { posts, pagination: meta(page, limit, total) } });
});

const getExplore = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { visibility: 'public' };
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);
  await attachMyReactions(posts, req.user?.id);
  res.json({ success: true, data: { posts, pagination: meta(page, limit, total) } });
});

const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
  if (!post) throw ApiError.notFound('Post not found');

  if (post.visibility === 'followers') {
    const isAuthor = req.user && String(post.author._id) === req.user.id;
    const isFollower =
      req.user && (await Follow.exists({ follower: req.user.id, following: post.author._id }));
    if (!isAuthor && !isFollower) throw ApiError.forbidden('This post is for followers only');
  }

  await Post.updateOne({ _id: post._id }, { $inc: { viewsCount: 1 } });

  let myReaction = null;
  if (req.user) {
    const r = await Reaction.findOne({ user: req.user.id, targetType: 'post', target: post._id })
      .select('type')
      .lean();
    myReaction = r?.type || null;
  }

  const obj = post.toObject();
  obj.viewsCount += 1;
  obj.myReaction = myReaction;
  res.json({ success: true, data: { post: obj } });
});

const getUserPosts = asyncHandler(async (req, res) => {
  const author = await User.findOne({ username: req.params.username.toLowerCase() }).select(
    '_id privacy'
  );
  if (!author) throw ApiError.notFound('User not found');

  const isMe = req.user && req.user.id === String(author._id);
  const isFollower =
    req.user && !isMe && (await Follow.exists({ follower: req.user.id, following: author._id }));

  if (author.privacy === 'private' && !isMe && !isFollower) {
    throw ApiError.forbidden('This account is private');
  }

  const filter = { author: author._id };
  if (!isMe && !isFollower) filter.visibility = 'public';

  const { page, limit, skip } = getPagination(req);
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);
  await attachMyReactions(posts, req.user?.id);
  res.json({ success: true, data: { posts, pagination: meta(page, limit, total) } });
});

const getByHashtag = asyncHandler(async (req, res) => {
  const tag = req.params.tag.toLowerCase();
  const filter = { hashtags: tag, visibility: 'public' };
  const { page, limit, skip } = getPagination(req);
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);
  await attachMyReactions(posts, req.user?.id);
  res.json({ success: true, data: { tag, posts, pagination: meta(page, limit, total) } });
});

// Full-text search across public posts, ranked by relevance then recency.
const searchPosts = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const { page, limit, skip } = getPagination(req, { defaultLimit: 10, maxLimit: 30 });
  if (!q) {
    return res.json({ success: true, data: { query: '', posts: [], pagination: meta(page, limit, 0) } });
  }
  const filter = { visibility: 'public', $text: { $search: q } };
  const [posts, total] = await Promise.all([
    Post.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);
  await attachMyReactions(posts, req.user?.id);
  res.json({ success: true, data: { query: q, posts, pagination: meta(page, limit, total) } });
});

// Most-used hashtags across public posts in the last 14 days.
const getTrendingHashtags = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const hashtags = await Post.aggregate([
    {
      $match: {
        visibility: 'public',
        createdAt: { $gte: since },
        'hashtags.0': { $exists: true },
      },
    },
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 12 },
    { $project: { _id: 0, tag: '$_id', count: 1 } },
  ]);
  res.json({ success: true, data: { hashtags } });
});

const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  if (String(post.author) !== req.user.id) throw ApiError.forbidden('Not your post');

  if (req.body.content !== undefined) {
    const content = req.body.content.trim();
    post.content = content;
    post.hashtags = extractHashtags(content);
    post.mentions = await resolveMentions(content);
  }
  if (req.body.visibility) post.visibility = req.body.visibility;
  post.editedAt = new Date();
  await post.save();

  const populated = await post.populate('author', AUTHOR_FIELDS);
  res.json({ success: true, message: 'Post updated', data: { post: populated } });
});

const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  const isOwner = String(post.author) === req.user.id;
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden('Not allowed');

  const commentIds = (await Comment.find({ post: post._id }).select('_id').lean()).map((c) => c._id);

  await Promise.all([
    ...(post.images || []).map((img) => deleteImage(img.publicId)),
    Comment.deleteMany({ post: post._id }),
    Reaction.deleteMany({
      $or: [
        { targetType: 'post', target: post._id },
        { targetType: 'comment', target: { $in: commentIds } },
      ],
    }),
    Notification.deleteMany({ post: post._id }),
  ]);

  await post.deleteOne();
  await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });
  res.json({ success: true, message: 'Post deleted' });
});

const reactToPost = asyncHandler(async (req, res) => {
  const { type } = req.body;
  const post = await Post.findById(req.params.id).select('author');
  if (!post) throw ApiError.notFound('Post not found');

  let isNew = false;
  let reaction = await Reaction.findOne({ user: req.user.id, targetType: 'post', target: post._id });
  if (reaction) {
    reaction.type = type;
    await reaction.save();
  } else {
    reaction = await Reaction.create({
      user: req.user.id,
      targetType: 'post',
      target: post._id,
      type,
    });
    isNew = true;
  }

  const reactionsCount = await Reaction.countDocuments({ targetType: 'post', target: post._id });
  await Post.updateOne({ _id: post._id }, { reactionsCount });

  if (isNew) {
    await notify({
      recipient: post.author,
      sender: req.user.id,
      type: 'reaction',
      post: post._id,
      reactionType: type,
    });
  }
  res.json({ success: true, data: { reacted: true, type, reactionsCount } });
});

const unreactToPost = asyncHandler(async (req, res) => {
  await Reaction.findOneAndDelete({ user: req.user.id, targetType: 'post', target: req.params.id });
  const reactionsCount = await Reaction.countDocuments({
    targetType: 'post',
    target: req.params.id,
  });
  await Post.updateOne({ _id: req.params.id }, { reactionsCount });
  res.json({ success: true, data: { reacted: false, reactionsCount } });
});

const pinPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  if (String(post.author) !== req.user.id) throw ApiError.forbidden('Not your post');
  post.pinned = !post.pinned;
  await post.save();
  res.json({ success: true, data: { pinned: post.pinned } });
});

const sharePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $inc: { sharesCount: 1 } },
    { new: true }
  ).select('sharesCount');
  if (!post) throw ApiError.notFound('Post not found');
  res.json({ success: true, data: { sharesCount: post.sharesCount } });
});

module.exports = {
  createPost,
  getFeed,
  getExplore,
  getPost,
  getUserPosts,
  getByHashtag,
  searchPosts,
  getTrendingHashtags,
  updatePost,
  deletePost,
  reactToPost,
  unreactToPost,
  pinPost,
  sharePost,
};

const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Reaction = require('../models/Reaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, meta } = require('../utils/pagination');
const { extractMentionUsernames } = require('../utils/text');
const { notify } = require('../services/notification.service');

const AUTHOR_FIELDS = 'username name avatar verifiedBadge';

async function resolveMentions(text) {
  const usernames = extractMentionUsernames(text);
  if (!usernames.length) return [];
  const users = await User.find({ username: { $in: usernames } }).select('_id').lean();
  return users.map((u) => u._id);
}

async function attachMyReactions(comments, userId) {
  if (!userId || comments.length === 0) {
    comments.forEach((c) => {
      c.myReaction = null;
    });
    return comments;
  }
  const ids = comments.map((c) => c._id);
  const reactions = await Reaction.find({
    user: userId,
    targetType: 'comment',
    target: { $in: ids },
  })
    .select('target type')
    .lean();
  const map = new Map(reactions.map((r) => [String(r.target), r.type]));
  comments.forEach((c) => {
    c.myReaction = map.get(String(c._id)) || null;
  });
  return comments;
}

const createComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).select('author');
  if (!post) throw ApiError.notFound('Post not found');

  const content = req.body.content.trim();
  let parentDoc = null;
  if (req.body.parent) {
    parentDoc = await Comment.findById(req.body.parent).select('post author');
    if (!parentDoc || String(parentDoc.post) !== String(post._id)) {
      throw ApiError.badRequest('Invalid parent comment');
    }
  }

  const mentions = await resolveMentions(content);
  const comment = await Comment.create({
    post: post._id,
    author: req.user.id,
    content,
    parent: parentDoc ? parentDoc._id : null,
    mentions,
  });

  await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
  if (parentDoc) await Comment.updateOne({ _id: parentDoc._id }, { $inc: { repliesCount: 1 } });

  if (parentDoc) {
    await notify({
      recipient: parentDoc.author,
      sender: req.user.id,
      type: 'reply',
      post: post._id,
      comment: comment._id,
    });
  } else {
    await notify({
      recipient: post.author,
      sender: req.user.id,
      type: 'comment',
      post: post._id,
      comment: comment._id,
    });
  }

  await Promise.all(
    mentions
      .filter((id) => String(id) !== req.user.id)
      .map((id) =>
        notify({
          recipient: id,
          sender: req.user.id,
          type: 'mention',
          post: post._id,
          comment: comment._id,
        })
      )
  );

  const populated = await comment.populate('author', AUTHOR_FIELDS);
  const obj = populated.toObject();
  obj.myReaction = null;
  res.status(201).json({ success: true, message: 'Comment added', data: { comment: obj } });
});

const getComments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { post: req.params.postId, parent: null };
  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Comment.countDocuments(filter),
  ]);
  await attachMyReactions(comments, req.user?.id);
  res.json({ success: true, data: { comments, pagination: meta(page, limit, total) } });
});

const getReplies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { parent: req.params.commentId };
  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Comment.countDocuments(filter),
  ]);
  await attachMyReactions(comments, req.user?.id);
  res.json({ success: true, data: { comments, pagination: meta(page, limit, total) } });
});

const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found');
  if (String(comment.author) !== req.user.id) throw ApiError.forbidden('Not your comment');

  const content = req.body.content.trim();
  comment.content = content;
  comment.mentions = await resolveMentions(content);
  comment.editedAt = new Date();
  await comment.save();

  const populated = await comment.populate('author', AUTHOR_FIELDS);
  res.json({ success: true, message: 'Comment updated', data: { comment: populated } });
});

const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found');

  const post = await Post.findById(comment.post).select('author');
  const isOwner = String(comment.author) === req.user.id;
  const isPostAuthor = post && String(post.author) === req.user.id;
  if (!isOwner && !isPostAuthor && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not allowed');
  }

  const replyIds = (await Comment.find({ parent: comment._id }).select('_id').lean()).map(
    (c) => c._id
  );
  const allIds = [comment._id, ...replyIds];

  await Promise.all([
    Comment.deleteMany({ _id: { $in: allIds } }),
    Reaction.deleteMany({ targetType: 'comment', target: { $in: allIds } }),
    Notification.deleteMany({ comment: { $in: allIds } }),
  ]);

  await Post.updateOne({ _id: comment.post }, { $inc: { commentsCount: -allIds.length } });
  if (comment.parent) {
    await Comment.updateOne({ _id: comment.parent }, { $inc: { repliesCount: -1 } });
  }
  res.json({ success: true, message: 'Comment deleted' });
});

const reactToComment = asyncHandler(async (req, res) => {
  const { type } = req.body;
  const comment = await Comment.findById(req.params.id).select('author');
  if (!comment) throw ApiError.notFound('Comment not found');

  let isNew = false;
  let reaction = await Reaction.findOne({
    user: req.user.id,
    targetType: 'comment',
    target: comment._id,
  });
  if (reaction) {
    reaction.type = type;
    await reaction.save();
  } else {
    reaction = await Reaction.create({
      user: req.user.id,
      targetType: 'comment',
      target: comment._id,
      type,
    });
    isNew = true;
  }

  const reactionsCount = await Reaction.countDocuments({
    targetType: 'comment',
    target: comment._id,
  });
  await Comment.updateOne({ _id: comment._id }, { reactionsCount });

  if (isNew) {
    await notify({
      recipient: comment.author,
      sender: req.user.id,
      type: 'reaction',
      comment: comment._id,
      reactionType: type,
    });
  }
  res.json({ success: true, data: { reacted: true, type, reactionsCount } });
});

const unreactToComment = asyncHandler(async (req, res) => {
  await Reaction.findOneAndDelete({
    user: req.user.id,
    targetType: 'comment',
    target: req.params.id,
  });
  const reactionsCount = await Reaction.countDocuments({
    targetType: 'comment',
    target: req.params.id,
  });
  await Comment.updateOne({ _id: req.params.id }, { reactionsCount });
  res.json({ success: true, data: { reacted: false, reactionsCount } });
});

module.exports = {
  createComment,
  getComments,
  getReplies,
  updateComment,
  deleteComment,
  reactToComment,
  unreactToComment,
};

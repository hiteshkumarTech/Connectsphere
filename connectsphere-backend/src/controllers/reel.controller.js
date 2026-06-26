const Reel = require('../models/Reel');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, meta } = require('../utils/pagination');
const { deleteVideo, signParams } = require('../utils/cloudinaryUpload');
const { extractHashtags } = require('../utils/text');
const config = require('../config');

const AUTHOR_FIELDS = 'username name avatar verifiedBadge';
const UPLOAD_FOLDER = 'connectsphere/reels';

// Annotates lean reels with whether the viewer has liked them.
async function attachMyLikes(reels, userId) {
  if (!userId || reels.length === 0) {
    reels.forEach((r) => {
      r.liked = false;
    });
    return reels;
  }
  const ids = reels.map((r) => r._id);
  const likes = await Reaction.find({ user: userId, targetType: 'reel', target: { $in: ids } })
    .select('target')
    .lean();
  const set = new Set(likes.map((l) => String(l.target)));
  reels.forEach((r) => {
    r.liked = set.has(String(r._id));
  });
  return reels;
}

// Cloudinary can render a JPG poster from the first frame of the video.
function videoThumbnail(publicId) {
  if (!config.cloudinary.configured || !publicId) return '';
  return `https://res.cloudinary.com/${config.cloudinary.cloudName}/video/upload/so_0,c_fill,w_640,h_1138,q_auto,f_jpg/${publicId}.jpg`;
}

// GET /reels/upload-signature — short-lived signature for a direct browser upload.
const getUploadSignature = asyncHandler(async (req, res) => {
  if (!config.cloudinary.configured) {
    throw ApiError.badRequest('Video uploads are not configured on this server');
  }
  const timestamp = Math.round(Date.now() / 1000);
  const signature = signParams({ timestamp, folder: UPLOAD_FOLDER });
  res.json({
    success: true,
    data: {
      timestamp,
      signature,
      folder: UPLOAD_FOLDER,
      apiKey: config.cloudinary.apiKey,
      cloudName: config.cloudinary.cloudName,
    },
  });
});

// POST /reels — save metadata after the browser uploaded the video to Cloudinary.
const createReel = asyncHandler(async (req, res) => {
  const { videoUrl, publicId, duration = 0, width, height } = req.body;
  const caption = String(req.body.caption || '').trim().slice(0, 2200);

  if (!videoUrl || !publicId) throw ApiError.badRequest('A reel needs an uploaded video');

  // Only accept assets that came from our own Cloudinary account + folder.
  if (config.cloudinary.configured) {
    const prefix = `https://res.cloudinary.com/${config.cloudinary.cloudName}/`;
    if (!String(videoUrl).startsWith(prefix) || !String(publicId).startsWith(UPLOAD_FOLDER)) {
      throw ApiError.badRequest('Invalid video reference');
    }
  }

  const reel = await Reel.create({
    author: req.user.id,
    videoUrl,
    publicId,
    thumbnailUrl: videoThumbnail(publicId),
    caption,
    hashtags: extractHashtags(caption),
    duration: Number(duration) || 0,
    width,
    height,
  });

  const populated = await reel.populate('author', AUTHOR_FIELDS);
  const obj = populated.toObject();
  obj.liked = false;
  res.status(201).json({ success: true, message: 'Reel published', data: { reel: obj } });
});

// GET /reels — newest-first feed (powers both the grid and the swiper).
const getReels = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { defaultLimit: 12, maxLimit: 30 });
  const [reels, total] = await Promise.all([
    Reel.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Reel.countDocuments({}),
  ]);
  await attachMyLikes(reels, req.user?.id);
  res.json({ success: true, data: { reels, pagination: meta(page, limit, total) } });
});

// GET /reels/:id — single reel (deep links / shares).
const getReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id).populate('author', AUTHOR_FIELDS);
  if (!reel) throw ApiError.notFound('Reel not found');
  let liked = false;
  if (req.user) {
    liked = Boolean(
      await Reaction.exists({ user: req.user.id, targetType: 'reel', target: reel._id })
    );
  }
  const obj = reel.toObject();
  obj.liked = liked;
  res.json({ success: true, data: { reel: obj } });
});

// POST /reels/:id/view — count a view (deduped client-side per session).
const viewReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewsCount: 1 } },
    { new: true }
  ).select('viewsCount');
  if (!reel) throw ApiError.notFound('Reel not found');
  res.json({ success: true, data: { viewsCount: reel.viewsCount } });
});

const likeReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id).select('_id');
  if (!reel) throw ApiError.notFound('Reel not found');
  await Reaction.updateOne(
    { user: req.user.id, targetType: 'reel', target: reel._id },
    { $setOnInsert: { type: 'like' } },
    { upsert: true }
  );
  const reactionsCount = await Reaction.countDocuments({ targetType: 'reel', target: reel._id });
  await Reel.updateOne({ _id: reel._id }, { reactionsCount });
  res.json({ success: true, data: { liked: true, reactionsCount } });
});

const unlikeReel = asyncHandler(async (req, res) => {
  await Reaction.findOneAndDelete({
    user: req.user.id,
    targetType: 'reel',
    target: req.params.id,
  });
  const reactionsCount = await Reaction.countDocuments({
    targetType: 'reel',
    target: req.params.id,
  });
  await Reel.updateOne({ _id: req.params.id }, { reactionsCount });
  res.json({ success: true, data: { liked: false, reactionsCount } });
});

const shareReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findByIdAndUpdate(
    req.params.id,
    { $inc: { sharesCount: 1 } },
    { new: true }
  ).select('sharesCount');
  if (!reel) throw ApiError.notFound('Reel not found');
  res.json({ success: true, data: { sharesCount: reel.sharesCount } });
});

const deleteReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) throw ApiError.notFound('Reel not found');
  const isOwner = String(reel.author) === req.user.id;
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden('Not allowed');

  await Promise.all([
    deleteVideo(reel.publicId),
    Comment.deleteMany({ reel: reel._id }),
    Reaction.deleteMany({ targetType: 'reel', target: reel._id }),
  ]);
  await reel.deleteOne();
  res.json({ success: true, message: 'Reel deleted' });
});

// ---- Reel comments (flat) ----

const listReelComments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { defaultLimit: 20, maxLimit: 50 });
  const filter = { reel: req.params.id };
  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .lean(),
    Comment.countDocuments(filter),
  ]);
  res.json({ success: true, data: { comments, pagination: meta(page, limit, total) } });
});

const addReelComment = asyncHandler(async (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content) throw ApiError.badRequest('Comment cannot be empty');
  if (content.length > 2000) throw ApiError.badRequest('Comment is too long');

  const reel = await Reel.findById(req.params.id).select('_id');
  if (!reel) throw ApiError.notFound('Reel not found');

  const comment = await Comment.create({ reel: reel._id, author: req.user.id, content });
  await Reel.updateOne({ _id: reel._id }, { $inc: { commentsCount: 1 } });

  const populated = await comment.populate('author', AUTHOR_FIELDS);
  res
    .status(201)
    .json({ success: true, message: 'Comment added', data: { comment: populated.toObject() } });
});

const deleteReelComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, reel: req.params.id });
  if (!comment) throw ApiError.notFound('Comment not found');

  const reel = await Reel.findById(req.params.id).select('author');
  const isCommentAuthor = String(comment.author) === req.user.id;
  const isReelOwner = reel && String(reel.author) === req.user.id;
  if (!isCommentAuthor && !isReelOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not allowed');
  }

  await comment.deleteOne();
  await Reel.updateOne({ _id: req.params.id }, { $inc: { commentsCount: -1 } });
  res.json({ success: true, message: 'Comment deleted' });
});

module.exports = {
  getUploadSignature,
  createReel,
  getReels,
  getReel,
  viewReel,
  likeReel,
  unlikeReel,
  shareReel,
  deleteReel,
  listReelComments,
  addReelComment,
  deleteReelComment,
};

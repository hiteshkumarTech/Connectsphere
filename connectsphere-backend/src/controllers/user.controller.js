const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, meta } = require('../utils/pagination');
const { uploadBuffer, deleteImage } = require('../utils/cloudinaryUpload');
const { notify } = require('../services/notification.service');

const PUBLIC_FIELDS = 'username name avatar bio verifiedBadge followersCount';

async function getFollowingIds(userId) {
  const docs = await Follow.find({ follower: userId }).select('following').lean();
  return docs.map((d) => d.following);
}

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!user || user.isBanned) throw ApiError.notFound('User not found');

  let isMe = false;
  let isFollowing = false;
  if (req.user) {
    isMe = req.user.id === user.id;
    if (!isMe) isFollowing = Boolean(await Follow.exists({ follower: req.user.id, following: user.id }));
  }
  const isPrivate = user.privacy === 'private' && !isMe && !isFollowing;

  res.json({ success: true, data: { user, isMe, isFollowing, isPrivate } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'bio', 'location', 'website', 'skills', 'interests', 'privacy'];
  const user = await User.findById(req.user.id);
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  });
  if (req.body.socialLinks) {
    ['github', 'linkedin', 'twitter'].forEach((k) => {
      if (req.body.socialLinks[k] !== undefined) user.socialLinks[k] = req.body.socialLinks[k];
    });
  }
  await user.save();
  res.json({ success: true, message: 'Profile updated', data: { user } });
});

const updateUsername = asyncHandler(async (req, res) => {
  const username = req.body.username.toLowerCase();
  const taken = await User.exists({ username, _id: { $ne: req.user.id } });
  if (taken) throw ApiError.conflict('That username is already taken');
  const user = await User.findByIdAndUpdate(req.user.id, { username }, { new: true });
  res.json({ success: true, message: 'Username updated', data: { user } });
});

async function setUserImage(req, res, { field, publicIdField, folder }) {
  if (!req.file) throw ApiError.badRequest('No image uploaded');
  const user = await User.findById(req.user.id).select(`+${publicIdField}`);
  const oldPublicId = user[publicIdField];
  const media = await uploadBuffer(req.file.buffer, folder);
  user[field] = media.url;
  user[publicIdField] = media.publicId;
  await user.save();
  if (oldPublicId) await deleteImage(oldPublicId);
  res.json({ success: true, message: 'Image updated', data: { [field]: media.url } });
}

const uploadAvatar = asyncHandler((req, res) =>
  setUserImage(req, res, {
    field: 'avatar',
    publicIdField: 'avatarPublicId',
    folder: 'connectsphere/avatars',
  })
);

const uploadCover = asyncHandler((req, res) =>
  setUserImage(req, res, {
    field: 'coverPhoto',
    publicIdField: 'coverPublicId',
    folder: 'connectsphere/covers',
  })
);

const followUser = asyncHandler(async (req, res) => {
  const target = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!target || target.isBanned) throw ApiError.notFound('User not found');
  if (target.id === req.user.id) throw ApiError.badRequest('You cannot follow yourself');

  try {
    await Follow.create({ follower: req.user.id, following: target.id });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ success: true, message: 'Already following', data: { following: true } });
    }
    throw err;
  }

  await Promise.all([
    User.findByIdAndUpdate(target.id, { $inc: { followersCount: 1 } }),
    User.findByIdAndUpdate(req.user.id, { $inc: { followingCount: 1 } }),
  ]);
  await notify({ recipient: target.id, sender: req.user.id, type: 'follow' });

  res.json({ success: true, message: 'Followed', data: { following: true } });
});

const unfollowUser = asyncHandler(async (req, res) => {
  const target = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!target) throw ApiError.notFound('User not found');

  const removed = await Follow.findOneAndDelete({ follower: req.user.id, following: target.id });
  if (removed) {
    await Promise.all([
      User.findByIdAndUpdate(target.id, { $inc: { followersCount: -1 } }),
      User.findByIdAndUpdate(req.user.id, { $inc: { followingCount: -1 } }),
    ]);
  }
  res.json({ success: true, message: 'Unfollowed', data: { following: false } });
});

// Marks which of the given users the current viewer already follows.
async function withFollowState(users, viewerId) {
  if (!viewerId) return users.map((u) => ({ ...u, isFollowing: false }));
  const ids = users.map((u) => u._id);
  const following = await Follow.find({ follower: viewerId, following: { $in: ids } })
    .select('following')
    .lean();
  const set = new Set(following.map((f) => String(f.following)));
  return users.map((u) => ({ ...u, isFollowing: set.has(String(u._id)), isMe: String(u._id) === String(viewerId) }));
}

const getFollowers = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
  if (!user) throw ApiError.notFound('User not found');
  const { page, limit, skip } = getPagination(req);

  const [docs, total] = await Promise.all([
    Follow.find({ following: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('follower', PUBLIC_FIELDS)
      .lean(),
    Follow.countDocuments({ following: user._id }),
  ]);

  const users = await withFollowState(docs.map((d) => d.follower), req.user?.id);
  res.json({ success: true, data: { users, pagination: meta(page, limit, total) } });
});

const getFollowing = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
  if (!user) throw ApiError.notFound('User not found');
  const { page, limit, skip } = getPagination(req);

  const [docs, total] = await Promise.all([
    Follow.find({ follower: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('following', PUBLIC_FIELDS)
      .lean(),
    Follow.countDocuments({ follower: user._id }),
  ]);

  const users = await withFollowState(docs.map((d) => d.following), req.user?.id);
  res.json({ success: true, data: { users, pagination: meta(page, limit, total) } });
});

// Suggests users to follow, scored by shared interests/skills and popularity.
const getSuggestions = asyncHandler(async (req, res) => {
  const me = req.user;
  const followingIds = await getFollowingIds(me.id);
  const exclude = [new mongoose.Types.ObjectId(me.id), ...followingIds];

  const suggestions = await User.aggregate([
    { $match: { _id: { $nin: exclude }, isBanned: false } },
    {
      $addFields: {
        mutualInterests: {
          $size: { $setIntersection: [{ $ifNull: ['$interests', []] }, me.interests || []] },
        },
        mutualSkills: {
          $size: { $setIntersection: [{ $ifNull: ['$skills', []] }, me.skills || []] },
        },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ['$mutualInterests', 3] },
            { $multiply: ['$mutualSkills', 2] },
            { $divide: ['$followersCount', 10] },
          ],
        },
      },
    },
    { $sort: { score: -1, followersCount: -1, createdAt: -1 } },
    { $limit: 10 },
    {
      $project: {
        username: 1,
        name: 1,
        avatar: 1,
        bio: 1,
        verifiedBadge: 1,
        followersCount: 1,
        mutualInterests: 1,
        mutualSkills: 1,
      },
    },
  ]);

  res.json({ success: true, data: { users: suggestions } });
});

const searchUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ success: true, data: { users: [] } });
  const { limit } = getPagination(req, { defaultLimit: 10, maxLimit: 20 });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const docs = await User.find({ isBanned: false, $or: [{ username: rx }, { name: rx }] })
    .select(PUBLIC_FIELDS)
    .sort({ followersCount: -1 })
    .limit(limit)
    .lean();

  const users = await withFollowState(docs, req.user?.id);
  res.json({ success: true, data: { users } });
});

module.exports = {
  getProfile,
  updateProfile,
  updateUsername,
  uploadAvatar,
  uploadCover,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getSuggestions,
  searchUsers,
};

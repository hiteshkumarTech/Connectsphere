const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    userAgent: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores'],
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },

    avatar: { type: String, default: '' },
    avatarPublicId: { type: String, default: '', select: false },
    coverPhoto: { type: String, default: '' },
    coverPublicId: { type: String, default: '', select: false },

    bio: { type: String, default: '', maxlength: 300 },
    location: { type: String, default: '', maxlength: 100 },
    website: { type: String, default: '' },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    socialLinks: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
    },

    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },

    emailVerified: { type: Boolean, default: false },
    verifiedBadge: { type: Boolean, default: false }, // blue check (admin-granted)
    isBanned: { type: Boolean, default: false },

    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postsCount: { type: Number, default: 0, min: 0 },

    lastSeen: { type: Date, default: Date.now },

    // Auth internals — never serialized to clients.
    sessions: { type: [sessionSchema], default: [], select: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.sessions;
        delete ret.emailVerifyToken;
        delete ret.emailVerifyExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.passwordChangedAt;
        delete ret.avatarPublicId;
        delete ret.coverPublicId;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Hash password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// True if the password changed after a given JWT was issued (forces re-login).
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtIatSeconds) {
  if (!this.passwordChangedAt) return false;
  const changedAt = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtIatSeconds < changedAt;
};

// Creates a one-time token, stores only its hash, returns the raw token.
function makeToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

userSchema.methods.createEmailVerifyToken = function createEmailVerifyToken() {
  const { raw, hash } = makeToken();
  this.emailVerifyToken = hash;
  this.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return raw;
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const { raw, hash } = makeToken();
  this.passwordResetToken = hash;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  return raw;
};

module.exports = mongoose.model('User', userSchema);

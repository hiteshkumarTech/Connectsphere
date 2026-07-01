const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Buffer files in memory, then stream to Cloudinary (no local disk writes).
const storage = multer.memoryStorage();

const imageFilter = (_req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest('Only JPEG, PNG, WEBP or GIF images are allowed'));
};

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB each, up to 10 (carousel)
});

const videoFilter = (_req, file, cb) => {
  if (/^video\/(mp4|quicktime|webm|x-m4v|3gpp)$/.test(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest('Only MP4, MOV, WEBM or M4V videos are allowed'));
};

const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 60 * 1024 * 1024, files: 1 }, // 60MB, single video
});

// Stories accept a single image OR video.
const mediaFilter = (_req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
  if (/^video\/(mp4|quicktime|webm|x-m4v|3gpp)$/.test(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest('Only images or videos are allowed'));
};

const uploadMedia = multer({
  storage,
  fileFilter: mediaFilter,
  limits: { fileSize: 60 * 1024 * 1024, files: 1 }, // 60MB, single file
});

module.exports = { uploadImage, uploadVideo, uploadMedia };

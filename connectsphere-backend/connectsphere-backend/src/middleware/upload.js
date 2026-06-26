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

module.exports = { uploadImage };

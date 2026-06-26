const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const config = require('../config');
const ApiError = require('./ApiError');

/** Streams an in-memory buffer to Cloudinary. Returns normalized media info. */
function uploadBuffer(buffer, folder = 'connectsphere') {
  if (!config.cloudinary.configured) {
    return Promise.reject(ApiError.badRequest('Image uploads are not configured on this server'));
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

function deleteImage(publicId) {
  if (!publicId || !config.cloudinary.configured) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId).catch(() => {});
}

/** Removes a video asset (resource_type must be 'video' for videos). */
function deleteVideo(publicId) {
  if (!publicId || !config.cloudinary.configured) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId, { resource_type: 'video' }).catch(() => {});
}

/** Signs upload params with the API secret so the browser can upload directly. */
function signParams(paramsToSign) {
  return cloudinary.utils.api_sign_request(paramsToSign, config.cloudinary.apiSecret);
}

module.exports = { uploadBuffer, deleteImage, deleteVideo, signParams };

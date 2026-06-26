import { api } from './api';

// Uploads a video straight to Cloudinary using a short-lived signature minted
// by our backend (so big files never tunnel through the API server).
// onProgress receives 0..100 during the upload.
export async function uploadReelVideo(file, onProgress) {
  const { data } = await api.get('/reels/upload-signature');
  const { timestamp, signature, folder, apiKey, cloudName } = data.data;

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (_e) {
          reject(new Error('Unexpected response from upload service.'));
        }
      } else {
        let message = 'Upload failed. Please try again.';
        try {
          message = JSON.parse(xhr.responseText)?.error?.message || message;
        } catch (_e) {
          /* keep default */
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(form);
  });

  return {
    videoUrl: result.secure_url,
    publicId: result.public_id,
    duration: result.duration,
    width: result.width,
    height: result.height,
  };
}

const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');
const { maxImageSizeMb } = require('../config/env');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

// Files are buffered in memory, validated (type, size, count, magic bytes) and then
// handed to services/storageService.js which writes them to disk or Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSizeMb * 1024 * 1024, files: 8, fields: 40 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
      return cb(new AppError('Only JPG, JPEG, PNG and WEBP images are allowed.', 400));
    }
    return cb(null, true);
  },
});

module.exports = {
  productImages: upload.array('images', 6),
  applicationImages: upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'storePhoto', maxCount: 1 },
    { name: 'images', maxCount: 6 },
  ]),
};

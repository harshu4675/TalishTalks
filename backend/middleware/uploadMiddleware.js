const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../utils/cloudinary");

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");

    return {
      folder: `talish-talks/${isVideo ? "videos" : "images"}`,
      resource_type: isVideo ? "video" : "image",
      allowed_formats: isVideo
        ? ["mp4", "webm", "mov", "avi"]
        : ["jpg", "jpeg", "png", "webp", "gif"],
      // Auto-optimize
      transformation: isVideo
        ? [
            { quality: "auto" },
            { duration: 120 }, // Max 120 seconds
          ]
        : [
            { quality: "auto:good" },
            { fetch_format: "auto" },
            { width: 1920, height: 1920, crop: "limit" },
          ],
    };
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  const allowedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max (videos)
  },
});

// Middleware for single file upload
const uploadMedia = upload.single("media");

// Wrapper to handle errors gracefully
const handleUpload = (req, res, next) => {
  uploadMedia(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Max 25MB for videos, 5MB for images.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Additional validation for image size
    if (req.file && req.file.mimetype.startsWith("image/")) {
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Image size must be less than 5MB",
        });
      }
    }

    next();
  });
};

module.exports = { handleUpload };

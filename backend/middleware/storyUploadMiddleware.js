const multer = require("multer");
const { Readable } = require("node:stream");
const { cloudinary, deleteFromCloudinary } = require("../utils/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 500 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return callback(new Error("Choose a JPEG, PNG, WebP or GIF image"));
    }
    callback(null, true);
  },
});

const parseStoryImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Story images must be 5 MB or smaller"
      : error.message || "Could not read story image";
    return res.status(400).json({ success: false, message });
  });
};

const validateStoryInput = (req, res, next) => {
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  if (text.length > 500) return res.status(400).json({ success: false, message: "Story text must be 500 characters or fewer" });
  if (!text && !req.file) return res.status(400).json({ success: false, message: "Add text or choose an image for your story" });
  next();
};

const storeStoryImage = async (req, res, next) => {
  if (!req.file) return next();
  if (!["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every((key) => process.env[key])) {
    return res.status(503).json({ success: false, message: "Image stories are not configured on this server" });
  }
  let stream;
  let settled = false;
  const timeout = setTimeout(() => {
    stream?.destroy();
    finish(new Error("Image upload timed out"));
  }, 60000);
  const finish = (error, result) => {
    if (settled) {
      if (result?.public_id) void deleteFromCloudinary(result.public_id);
      return;
    }
    settled = true;
    clearTimeout(timeout);
    req.off("aborted", abort);
    if (error) {
      if (!req.aborted && !res.headersSent) res.status(502).json({ success: false, message: "Image storage is temporarily unavailable" });
      return;
    }
    req.storyMedia = { url: result.secure_url, publicId: result.public_id, width: result.width || 0, height: result.height || 0 };
    next();
  };
  const abort = () => { stream?.destroy(); finish(new Error("Upload cancelled")); };
  stream = cloudinary.uploader.upload_stream({
    folder: "talish-talks/stories",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ quality: "auto:good", fetch_format: "auto", width: 1920, height: 1920, crop: "limit" }],
  }, finish);
  stream.on("error", finish);
  if (req.aborted) abort();
  else { req.once("aborted", abort); Readable.from(req.file.buffer).pipe(stream); }
};

module.exports = { parseStoryImage, validateStoryInput, storeStoryImage };

const multer = require("multer");
const { Readable } = require("node:stream");
const { cloudinary, deleteFromCloudinary } = require("../utils/cloudinary");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { validId, isParticipant } = require("../utils/messageUtils");
const asyncHandler = require("./asyncHandler");

const authorizeMediaUpload = asyncHandler(async (req, res, next) => {
  if (!["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every((key) => process.env[key])) {
    return res.status(503).json({ success: false, message: "Media uploads are not configured on this server" });
  }
  if (!validId(req.body.chatId)) return res.status(400).json({ success: false, message: "Invalid chat ID" });
  const chat = await Chat.findById(req.body.chatId).select("participants");
  if (!chat || !isParticipant(chat, req.user._id)) return res.status(403).json({ success: false, message: "Not authorized to upload to this chat" });
  const recipient = chat.participants.find((id) => !id.equals(req.user._id));
  if (!recipient) return res.status(403).json({ success: false, message: "Invalid conversation" });
  const [sender, otherUser] = await Promise.all([
    User.findById(req.user._id).select("blockedUsers"),
    User.findById(recipient).select("blockedUsers"),
  ]);
  if (!sender || !otherUser || sender.hasBlocked(recipient) || otherUser.hasBlocked(req.user._id)) {
    return res.status(403).json({ success: false, message: "Messaging is unavailable for this contact" });
  }
  next();
});

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 4, fieldSize: 5000 },
  fileFilter: (_req, file, callback) => {
    if (![...imageTypes, ...videoTypes].includes(file.mimetype)) return callback(new Error("Only supported images and videos are allowed"));
    callback(null, true);
  },
});
const parseUpload = (req, res) => new Promise((resolve, reject) => {
  upload.single("media")(req, res, (error) => error ? reject(error) : resolve());
});

// Buffer locally, then upload with explicit teardown. Never leave a remote asset after an aborted request.
const uploadBuffer = (req, file) => new Promise((resolve, reject) => {
  const video = file.mimetype.startsWith("video/");
  let settled = false;
  let stream;
  const finish = (error, result) => {
    if (settled) {
      if (result?.public_id) void deleteFromCloudinary(result.public_id, video ? "video" : "image");
      return;
    }
    settled = true;
    clearTimeout(timeout);
    req.off("aborted", abort);
    error ? reject(error) : resolve(result);
  };
  const abort = () => { stream?.destroy(); finish(new Error("Upload cancelled")); };
  const timeout = setTimeout(() => { stream?.destroy(); finish(new Error("Media upload timed out")); }, 90000);
  stream = cloudinary.uploader.upload_stream({
    folder: `talish-talks/${video ? "videos" : "images"}`,
    resource_type: video ? "video" : "image",
    allowed_formats: video ? ["mp4", "webm", "mov", "avi"] : ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: video ? [{ quality: "auto" }] : [{ quality: "auto:good", fetch_format: "auto", width: 1920, height: 1920, crop: "limit" }],
  }, finish);
  stream.on("error", finish);
  if (req.aborted) abort();
  else { req.once("aborted", abort); Readable.from(file.buffer).pipe(stream); }
});

const parseMediaUpload = async (req, res, next) => {
  try {
    await parseUpload(req, res);
    if (!req.file) return res.status(400).json({ success: false, message: "No media file uploaded" });
    if (req.file.mimetype.startsWith("image/") && req.file.size > 5 * 1024 * 1024) return res.status(400).json({ success: false, message: "Image size must be less than 5 MB" });
    next();
  } catch (error) {
    if (req.aborted || res.headersSent) return;
    const status = error instanceof multer.MulterError || /Only supported/.test(error.message) ? 400 : 500;
    const message = error.code === "LIMIT_FILE_SIZE" ? "File too large. Maximum 25 MB for videos and 5 MB for images." : status === 400 ? error.message : "Could not read upload";
    res.status(status).json({ success: false, message });
  }
};

const handleUpload = async (req, res, next) => {
  const file = req.file;
  try {
    const video = file.mimetype.startsWith("video/");
    if (!video && file.size > 5 * 1024 * 1024) return res.status(400).json({ success: false, message: "Image size must be less than 5 MB" });
    const result = await uploadBuffer(req, file);
    if (!result?.secure_url || !result?.public_id) throw new Error("Invalid storage response");
    if (video && result.duration > 120) {
      await deleteFromCloudinary(result.public_id, "video");
      return res.status(400).json({ success: false, message: "Videos must be two minutes or shorter" });
    }
    Object.assign(file, { path: result.secure_url, filename: result.public_id, width: result.width, height: result.height, duration: result.duration });
    file.buffer = undefined;
    next();
  } catch (error) {
    if (file?.filename) await deleteFromCloudinary(file.filename, file.mimetype.startsWith("video/") ? "video" : "image");
    if (res.headersSent || req.aborted) return;
    const status = error instanceof multer.MulterError || /Only supported|Image size|Videos must/.test(error.message) ? 400 : 502;
    const message = error.code === "LIMIT_FILE_SIZE" ? "File too large. Maximum 25 MB for videos and 5 MB for images."
      : status === 400 ? error.message : "Media storage is temporarily unavailable. Please retry.";
    res.status(status).json({ success: false, message });
  }
};

module.exports = { parseMediaUpload, handleUpload, authorizeMediaUpload };

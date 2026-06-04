const express = require("express");
const {
  getChats,
  createChat,
  clearChat,
  setDisappearing,
  lockChat,
  unlockChat,
  removeLock,
  getLockedChats,
  togglePinChat,
  toggleMuteChat,
  toggleMarkUnread,
  deleteChat,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/", getChats);
router.get("/locked", getLockedChats);
router.post("/create", createChat);
router.put("/:chatId/clear", clearChat);
router.put("/:chatId/disappearing", setDisappearing);
router.put("/:chatId/lock", lockChat);
router.put("/:chatId/unlock", unlockChat);
router.put("/:chatId/remove-lock", removeLock);

// 🔥 NEW ROUTES
router.put("/:chatId/pin", togglePinChat);
router.put("/:chatId/mute", toggleMuteChat);
router.put("/:chatId/mark-unread", toggleMarkUnread);
router.delete("/:chatId", deleteChat);

module.exports = router;

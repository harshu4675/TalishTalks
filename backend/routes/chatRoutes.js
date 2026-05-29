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

module.exports = router;

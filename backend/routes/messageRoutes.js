const express = require("express");
const {
  getMessages,
  sendMessage,
  markSeen,
  deleteForMe,
  deleteForEveryone,
  searchMessages,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/search", searchMessages);
router.get("/:chatId", getMessages);
router.post("/send", sendMessage);
router.put("/:chatId/seen", markSeen);
router.delete("/:messageId/me", deleteForMe);
router.delete("/:messageId/everyone", deleteForEveryone);

module.exports = router;

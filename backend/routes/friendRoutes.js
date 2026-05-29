const express = require("express");
const {
  sendFriendRequest,
  getFriendRequests,
  respondToRequest,
  getFriendsList,
  removeFriend,
  cancelFriendRequest,
} = require("../controllers/friendController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/friends/request - Send friend request
router.post("/request", sendFriendRequest);

// GET /api/friends/requests - Get all requests
router.get("/requests", getFriendRequests);

// PUT /api/friends/respond - Accept/Reject request
router.put("/respond", respondToRequest);

// GET /api/friends/list - Get friends list
router.get("/list", getFriendsList);

// DELETE /api/friends/request/:requestId - Cancel sent request
router.delete("/request/:requestId", cancelFriendRequest);

// DELETE /api/friends/:friendId - Remove friend
router.delete("/:friendId", removeFriend);

module.exports = router;

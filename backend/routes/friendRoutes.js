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

router.use(protect);

router.post("/request", sendFriendRequest);

router.get("/requests", getFriendRequests);

router.put("/respond", respondToRequest);

router.get("/list", getFriendsList);

router.delete("/request/:requestId", cancelFriendRequest);

router.delete("/:friendId", removeFriend);

module.exports = router;

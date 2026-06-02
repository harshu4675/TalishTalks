const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const { sendPushToUser } = require("../utils/pushService");

const sendFriendRequest = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const receiver = await User.findOne({
      username: username.toLowerCase().trim(),
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "No user found with that username",
      });
    }

    if (receiver._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You can't send a friend request to yourself 😅",
      });
    }

    const currentUser = await User.findById(req.user._id);
    if (currentUser.friends.includes(receiver._id)) {
      return res.status(400).json({
        success: false,
        message: `You are already friends with @${receiver.username}`,
      });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiver._id },
        { sender: receiver._id, receiver: req.user._id },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        if (existingRequest.sender.toString() === req.user._id.toString()) {
          return res.status(400).json({
            success: false,
            message: "Friend request already sent. Waiting for response.",
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `@${receiver.username} has already sent you a friend request. Check your requests!`,
          });
        }
      } else if (existingRequest.status === "rejected") {
        existingRequest.sender = req.user._id;
        existingRequest.receiver = receiver._id;
        existingRequest.status = "pending";
        await existingRequest.save();
      }
    } else {
      await FriendRequest.create({
        sender: req.user._id,
        receiver: receiver._id,
        status: "pending",
      });
    }

    // Real-time socket notification
    const io = req.app.get("io");
    if (io) {
      io.to(receiver._id.toString()).emit("friend_request_received", {
        sender: {
          _id: req.user._id,
          fullName: req.user.fullName,
          username: req.user.username,
          avatar: req.user.avatar,
        },
        message: `${req.user.fullName} sent you a friend request!`,
      });
    }

    // 🔔 Push notification (works even when app is closed)
    sendPushToUser(receiver._id.toString(), {
      title: "New Friend Request",
      body: `${req.user.fullName} sent you a friend request`,
      tag: "friend-request",
      data: {
        type: "friend-request",
        url: "/",
      },
    });

    return res.status(201).json({
      success: true,
      message: `Friend request sent to @${receiver.username} 🚀`,
    });
  } catch (error) {
    console.error("Send friend request error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while sending friend request",
    });
  }
};

// ============================================
// @desc    Get all friend requests (received + sent)
// @route   GET /api/friends/requests
// @access  Private
// ============================================
const getFriendRequests = async (req, res) => {
  try {
    const received = await FriendRequest.find({
      receiver: req.user._id,
      status: "pending",
    })
      .populate("sender", "fullName username avatar about isOnline")
      .sort({ createdAt: -1 });

    const sent = await FriendRequest.find({
      sender: req.user._id,
      status: "pending",
    })
      .populate("receiver", "fullName username avatar about isOnline")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      received,
      sent,
      receivedCount: received.length,
      sentCount: sent.length,
    });
  } catch (error) {
    console.error("Get friend requests error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching friend requests",
    });
  }
};

// ============================================
// @desc    Respond to a friend request (accept/reject)
// @route   PUT /api/friends/respond
// @access  Private
// ============================================
const respondToRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({
        success: false,
        message: "Request ID and action are required",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'accept' or 'reject'",
      });
    }

    const request = await FriendRequest.findById(requestId).populate(
      "sender receiver",
      "fullName username avatar socketId",
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found",
      });
    }

    if (request.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to respond to this request",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This request has already been responded to",
      });
    }

    const io = req.app.get("io");

    if (action === "accept") {
      request.status = "accepted";
      await request.save();

      await User.findByIdAndUpdate(request.sender._id, {
        $addToSet: { friends: request.receiver._id },
      });

      await User.findByIdAndUpdate(request.receiver._id, {
        $addToSet: { friends: request.sender._id },
      });

      // Socket notification
      if (io) {
        io.to(request.sender._id.toString()).emit("friend_request_accepted", {
          friend: {
            _id: request.receiver._id,
            fullName: request.receiver.fullName,
            username: request.receiver.username,
            avatar: request.receiver.avatar,
          },
          message: `${request.receiver.fullName} accepted your friend request! 🎉`,
        });
      }

      // 🔔 Push notification to sender
      sendPushToUser(request.sender._id.toString(), {
        title: "Friend Request Accepted 🎉",
        body: `${request.receiver.fullName} accepted your friend request`,
        tag: "friend-accepted",
        data: {
          type: "friend-accepted",
          url: "/",
        },
      });

      return res.status(200).json({
        success: true,
        message: `You are now friends with @${request.sender.username} 🎉`,
        friend: {
          _id: request.sender._id,
          fullName: request.sender.fullName,
          username: request.sender.username,
          avatar: request.sender.avatar,
        },
      });
    } else {
      await FriendRequest.findByIdAndDelete(requestId);

      if (io) {
        io.to(request.sender._id.toString()).emit("friend_request_rejected", {
          userId: request.receiver._id,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Friend request rejected",
      });
    }
  } catch (error) {
    console.error("Respond to request error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while responding to request",
    });
  }
};

// ============================================
// @desc    Get friends list
// @route   GET /api/friends/list
// @access  Private
// ============================================
const getFriendsList = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "fullName username avatar about isOnline lastSeen",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      count: user.friends.length,
      friends: user.friends,
    });
  } catch (error) {
    console.error("Get friends list error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching friends list",
    });
  }
};

// ============================================
// @desc    Remove a friend
// @route   DELETE /api/friends/:friendId
// @access  Private
// ============================================
const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user._id },
    });

    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user._id, receiver: friendId },
        { sender: friendId, receiver: req.user._id },
      ],
    });

    const io = req.app.get("io");
    if (io) {
      io.to(friendId).emit("friend_removed", {
        userId: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: `@${friend.username} has been removed from your friends`,
    });
  } catch (error) {
    console.error("Remove friend error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while removing friend",
    });
  }
};

// ============================================
// @desc    Cancel a sent friend request
// @route   DELETE /api/friends/request/:requestId
// @access  Private
// ============================================
const cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found",
      });
    }

    if (request.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own requests",
      });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    const io = req.app.get("io");
    if (io) {
      io.to(request.receiver.toString()).emit("friend_request_cancelled", {
        requestId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Friend request cancelled",
    });
  } catch (error) {
    console.error("Cancel friend request error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  sendFriendRequest,
  getFriendRequests,
  respondToRequest,
  getFriendsList,
  removeFriend,
  cancelFriendRequest,
};

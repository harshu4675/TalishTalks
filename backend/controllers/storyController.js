const Story = require("../models/Story");
const User = require("../models/User");
const { validId } = require("../utils/messageUtils");
const { deleteFromCloudinary } = require("../utils/cloudinary");

const getStories = async (req, res) => {
  const me = await User.findById(req.user._id).select("friends blockedUsers");
  if (!me) return res.status(401).json({ success: false, message: "Account not found" });
  const blocked = new Set((me.blockedUsers || []).map(String));
  const friendIds = (me.friends || []).filter((id) => !blocked.has(String(id))).map(String);
  const authorsBlockingMe = await User.find({ _id: { $in: friendIds }, blockedUsers: me._id }).distinct("_id");
  const hiddenAuthors = new Set([...blocked, ...authorsBlockingMe.map(String)]);
  const allowedAuthors = [...new Set([String(me._id), ...friendIds])].filter((id) => id === String(me._id) || !hiddenAuthors.has(id));
  const stories = await Story.find({ author: { $in: allowedAuthors }, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: 1 })
    .populate("author", "fullName username avatar");
  const visible = stories.filter((story) => !blocked.has(String(story.author?._id)));
  const ownStories = visible.filter((story) => String(story.author._id) === String(me._id));
  await Promise.all(ownStories.map((story) => story.populate("viewers.user", "fullName username avatar")));
  const groups = new Map();
  for (const story of visible) {
    const owner = String(story.author._id);
    if (!groups.has(owner)) groups.set(owner, { author: story.author, stories: [] });
    groups.get(owner).stories.push({
      _id: String(story._id),
      text: story.text,
      media: story.media,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewedByMe: story.viewers.some((entry) => String(entry.user?._id || entry.user) === String(me._id)),
      viewerCount: story.viewers.length,
      viewers: owner === String(me._id) ? story.viewers.map((entry) => ({
        user: entry.user,
        viewedAt: entry.viewedAt,
      })) : undefined,
    });
  }
  const feed = [...groups.values()].sort((a, b) => {
    if (String(a.author._id) === String(me._id)) return -1;
    if (String(b.author._id) === String(me._id)) return 1;
    const aLatest = a.stories[a.stories.length - 1]?.createdAt || 0;
    const bLatest = b.stories[b.stories.length - 1]?.createdAt || 0;
    return new Date(bLatest) - new Date(aLatest);
  });
  return res.json({ success: true, stories: feed });
};

const createStory = async (req, res) => {
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  if (text.length > 500) return res.status(400).json({ success: false, message: "Story text must be 500 characters or fewer" });
  if (!text && !req.storyMedia) return res.status(400).json({ success: false, message: "Add text or choose an image for your story" });
  const activeCount = await Story.countDocuments({ author: req.user._id, expiresAt: { $gt: new Date() } });
  if (activeCount >= 50) {
    if (req.storyMedia?.publicId) await deleteFromCloudinary(req.storyMedia.publicId);
    return res.status(429).json({ success: false, message: "You have reached the limit of 50 active stories" });
  }
  const createdAt = new Date();
  let story;
  try {
    story = await Story.create({
      author: req.user._id,
      text,
      media: req.storyMedia || {},
      createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    if (req.storyMedia?.publicId) await deleteFromCloudinary(req.storyMedia.publicId);
    throw error;
  }
  await story.populate("author", "fullName username avatar");
  return res.status(201).json({ success: true, story: {
    _id: String(story._id), author: story.author, text: story.text, media: story.media,
    createdAt: story.createdAt, expiresAt: story.expiresAt, viewedByMe: false, viewerCount: 0, viewers: [],
  } });
};

const viewStory = async (req, res) => {
  if (!validId(req.params.storyId)) return res.status(400).json({ success: false, message: "Invalid story ID" });
  const story = await Story.findOne({ _id: req.params.storyId, expiresAt: { $gt: new Date() } }).select("author viewers");
  if (!story) return res.status(404).json({ success: false, message: "Story not found or expired" });
  const me = await User.findById(req.user._id).select("friends blockedUsers");
  const ownerId = String(story.author);
  const viewerId = String(req.user._id);
  if (ownerId !== viewerId) {
    const isFriend = me?.friends.some((id) => String(id) === ownerId);
    const blockedEitherWay = me?.blockedUsers.some((id) => String(id) === ownerId)
      || await User.exists({ _id: story.author, blockedUsers: req.user._id });
    if (!isFriend || blockedEitherWay) return res.status(404).json({ success: false, message: "Story not found" });
    await Story.updateOne(
      { _id: story._id, "viewers.user": { $ne: req.user._id } },
      { $push: { viewers: { user: req.user._id, viewedAt: new Date() } } },
    );
  }
  return res.json({ success: true, viewed: ownerId !== viewerId });
};

const deleteStory = async (req, res) => {
  if (!validId(req.params.storyId)) return res.status(400).json({ success: false, message: "Invalid story ID" });
  const story = await Story.findOneAndDelete({ _id: req.params.storyId, author: req.user._id });
  if (!story) return res.status(404).json({ success: false, message: "Story not found" });
  if (story.media?.publicId) await deleteFromCloudinary(story.media.publicId);
  return res.json({ success: true, deletedId: String(story._id) });
};

module.exports = { getStories, createStory, viewStory, deleteStory };

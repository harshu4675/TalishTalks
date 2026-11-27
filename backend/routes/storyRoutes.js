const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const { parseStoryImage, validateStoryInput, storeStoryImage } = require("../middleware/storyUploadMiddleware");
const { getStories, createStory, viewStory, deleteStory } = require("../controllers/storyController");

const router = express.Router();
router.use(protect);
router.get("/", asyncHandler(getStories));
router.post("/", parseStoryImage, validateStoryInput, storeStoryImage, asyncHandler(createStory));
router.post("/:storyId/view", asyncHandler(viewStory));
router.delete("/:storyId", asyncHandler(deleteStory));
module.exports = router;

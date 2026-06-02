const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Delete media from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @param {string} resourceType - 'image' or 'video'
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log(`🗑️  Deleted from Cloudinary: ${publicId} (${result.result})`);
    return result;
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
    return null;
  }
};

module.exports = { cloudinary, deleteFromCloudinary };

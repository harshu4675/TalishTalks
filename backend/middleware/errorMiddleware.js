const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = error.message || "Request failed";
  if (error.name === "CastError") { status = 400; message = "Invalid ID"; }
  if (error.name === "ValidationError") { status = 400; message = Object.values(error.errors)[0]?.message || "Invalid data"; }
  if (error.code === 11000) { status = 400; message = "This account or request already exists"; }
  if (error.type === "entity.too.large") { status = 413; message = "Request is too large"; }
  if (error instanceof SyntaxError && "body" in error) { status = 400; message = "Invalid JSON body"; }
  if (status >= 500) {
    console.error("Request failed:", error.message);
    if (process.env.NODE_ENV === "production") message = "An unexpected server error occurred";
  }
  res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };

// routes/event.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  createEvent,
  getAllEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
  contributeToEvent,
} = require("../controllers/event.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const {
  validateCreateEvent,
  validateObjectIdParam,
} = require("../middlewares/validation.middleware");

// Configure multer temporary upload destination
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP) are allowed!"), false);
    }
  },
});

// Public routes
router.get("/events", getAllEvents);
router.get("/events/:id", validateObjectIdParam("id"), getEventById);
router.patch("/events/:id/contribute", validateObjectIdParam("id"), contributeToEvent);

// Protected routes
router.post(
  "/events",
  authenticateToken,
  upload.single("imageFile"),
  validateCreateEvent,
  createEvent,
);

router.get("/my-events", authenticateToken, getMyEvents);
router.put(
  "/events/:id",
  authenticateToken,
  validateObjectIdParam("id"),
  upload.single("imageFile"),
  updateEvent,
);
router.delete("/events/:id", authenticateToken, validateObjectIdParam("id"), deleteEvent);

module.exports = router;

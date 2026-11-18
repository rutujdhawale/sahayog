// controllers/event.controller.js
const Event = require("../models/Event.js");
const Contribution = require("../models/Contribution.js");
const cloudinary = require("../config/cloudinary.js");
const fs = require("fs");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../utils/errors");

// Helper to remove temporary uploaded file
const cleanupTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      logger.warn("Failed to delete temp file:", { path: filePath, error: err.message });
    }
  }
};

// POST /api/events
const createEvent = async (req, res, next) => {
  try {
    const { title, description, amountToRaise, imageUrl } = req.body;
    let tags = [];

    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      } else if (typeof req.body.tags === "string") {
        try {
          tags = JSON.parse(req.body.tags);
        } catch {
          tags = req.body.tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    const userId = req.user.id || req.user._id;
    const eventData = {
      title,
      description,
      amountToRaise: Number(amountToRaise),
      tags,
      createdBy: userId,
    };

    // Handle image file upload to Cloudinary if provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "sahayog-events",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 800, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        });

        eventData.imageUrl = result.secure_url;
        eventData.imagePublicId = result.public_id;
        cleanupTempFile(req.file.path);
      } catch (uploadError) {
        cleanupTempFile(req.file.path);
        logger.error("Cloudinary upload failed:", { error: uploadError.message });
        throw new ValidationError("Image upload failed. Please try again or provide a direct image URL.");
      }
    } else if (imageUrl) {
      eventData.imageUrl = imageUrl;
    }

    const eventDoc = await Event.create(eventData);
    await eventDoc.populate("createdBy", "firstName lastName email avatar");

    logger.info(`Campaign created: "${title}" by user ${userId}`);
    res.status(201).json(eventDoc);
  } catch (e) {
    if (req.file) cleanupTempFile(req.file.path);
    next(e);
  }
};

// GET /api/events
const getAllEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 9, tags, search, isActive = true, sort = "newest" } = req.query;
    const query = { isActive: isActive === "true" || isActive === true };

    // Tag filtering
    if (tags && tags.trim()) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        query.tags = { $in: tagList };
      }
    }

    // Text search by title or description
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { description: { $regex: escapedSearch, $options: "i" } },
        { tags: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === "most-funded") {
      sortOptions = { currentAmount: -1 };
    } else if (sort === "target-high") {
      sortOptions = { amountToRaise: -1 };
    } else if (sort === "target-low") {
      sortOptions = { amountToRaise: 1 };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit) || 9));

    const events = await Event.find(query)
      .populate("createdBy", "firstName lastName email avatar")
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Event.countDocuments(query);

    res.json({
      events,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      total,
    });
  } catch (e) {
    next(e);
  }
};

// GET /api/events/:id
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email avatar",
    );
    if (!event) {
      throw new NotFoundError("Campaign not found");
    }
    const supportersCount = await Contribution.countDocuments({
      eventId: req.params.id,
      status: "completed",
    });
    const eventObj = event.toObject ? event.toObject() : event;
    res.json({
      ...eventObj,
      supportersCount,
    });
  } catch (e) {
    next(e);
  }
};

// GET /api/my-events
const getMyEvents = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const events = await Event.find({ createdBy: userId })
      .populate("createdBy", "firstName lastName email avatar")
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (e) {
    next(e);
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req.user.id || req.user._id).toString();

    const event = await Event.findById(id);
    if (!event) {
      throw new NotFoundError("Campaign not found");
    }

    if (event.createdBy.toString() !== userId) {
      throw new ForbiddenError("Not authorized to update this campaign");
    }

    const { title, description, amountToRaise, imageUrl } = req.body;
    let tags = event.tags;

    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      } else if (typeof req.body.tags === "string") {
        try {
          tags = JSON.parse(req.body.tags);
        } catch {
          tags = req.body.tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    const updateData = {
      title: title || event.title,
      description: description || event.description,
      amountToRaise: amountToRaise ? Number(amountToRaise) : event.amountToRaise,
      tags,
    };

    if (req.file) {
      try {
        if (event.imagePublicId) {
          await cloudinary.uploader.destroy(event.imagePublicId);
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "sahayog-events",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 800, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        });

        updateData.imageUrl = result.secure_url;
        updateData.imagePublicId = result.public_id;
        cleanupTempFile(req.file.path);
      } catch (uploadError) {
        cleanupTempFile(req.file.path);
        throw new ValidationError("Image upload failed. Please try again.");
      }
    } else if (imageUrl && imageUrl !== event.imageUrl) {
      if (event.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(event.imagePublicId);
        } catch (delErr) {
          logger.warn("Failed to delete old Cloudinary image:", { error: delErr.message });
        }
      }
      updateData.imageUrl = imageUrl;
      updateData.imagePublicId = null;
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "firstName lastName email avatar");

    logger.info(`Campaign updated: "${updatedEvent.title}"`);
    res.json(updatedEvent);
  } catch (e) {
    if (req.file) cleanupTempFile(req.file.path);
    next(e);
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req.user.id || req.user._id).toString();

    const event = await Event.findById(id);
    if (!event) {
      throw new NotFoundError("Campaign not found");
    }

    if (event.createdBy.toString() !== userId) {
      throw new ForbiddenError("Not authorized to delete this campaign");
    }

    if (event.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(event.imagePublicId);
      } catch (deleteError) {
        logger.warn("Failed to delete image from Cloudinary:", { error: deleteError.message });
      }
    }

    await Event.findByIdAndDelete(id);
    logger.info(`Campaign deleted: id ${id}`);
    res.json({ success: true, message: "Campaign deleted successfully" });
  } catch (e) {
    next(e);
  }
};

// PATCH /api/events/:id/contribute
const contributeToEvent = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestError("Invalid contribution amount. Must be greater than 0.");
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      throw new NotFoundError("Campaign not found");
    }

    event.currentAmount = (event.currentAmount || 0) + numericAmount;
    await event.save();

    res.json({
      success: true,
      message: "Donation recorded successfully",
      currentAmount: event.currentAmount,
      progress: Math.min((event.currentAmount / event.amountToRaise) * 100, 100),
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
  contributeToEvent,
};

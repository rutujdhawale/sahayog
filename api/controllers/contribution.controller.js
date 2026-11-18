const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

// POST /api/contributions - Create new contribution
const createContribution = async (req, res, next) => {
  try {
    const { eventId, amount, contributorEmail } = req.body;
    const userId = req.user.id || req.user._id;

    if (!eventId || !amount || Number(amount) <= 0) {
      throw new ValidationError('Invalid contribution data. Amount must be positive.');
    }

    // Get event and user details
    const event = await Event.findById(eventId).populate('createdBy', 'firstName lastName email');
    const user = await User.findById(userId);

    if (!event) {
      throw new NotFoundError('Campaign not found');
    }

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    const numericAmount = Number(amount);
    const count = await Contribution.countDocuments();
    const invoiceNum = `INV-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;

    // Create contribution record
    const contributionData = {
      userId,
      eventId,
      amount: numericAmount,
      status: 'completed',
      invoiceNumber: invoiceNum,
      paymentMethod: 'sahayog_direct',
      invoiceData: {
        contributorName: `${user.firstName} ${user.lastName}`.trim(),
        contributorEmail: contributorEmail || user.email,
        eventTitle: event.title,
        eventCreator: event.createdBy ? `${event.createdBy.firstName} ${event.createdBy.lastName}`.trim() : 'Sahayog Creator',
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        invoiceDate: new Date(),
        dueDate: new Date(),
      },
    };

    const contribution = await Contribution.create(contributionData);

    // Update event's current amount atomically
    event.currentAmount = (event.currentAmount || 0) + numericAmount;
    await event.save();

    // Populate contribution for response
    await contribution.populate([
      { path: 'userId', select: 'firstName lastName email avatar' },
      { path: 'eventId', select: 'title description createdBy amountToRaise currentAmount imageUrl' },
    ]);

    logger.info(`Contribution of ₹${numericAmount} made to campaign: ${event.title}`, {
      contributionId: contribution._id,
      userId,
      eventId,
    });

    res.status(201).json({
      success: true,
      message: 'Contribution created successfully',
      contribution,
      eventCurrentAmount: event.currentAmount,
      progress: Math.min((event.currentAmount / event.amountToRaise) * 100, 100),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/contributions/user/:userId - Get user contributions
const getUserContributions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req.user.id || req.user._id).toString();

    // Ensure user can only access their own contributions
    if (currentUserId !== userId.toString()) {
      throw new ForbiddenError('Access denied: You can only view your own contributions.');
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));

    const contributions = await Contribution.find({ userId })
      .populate('eventId', 'title description imageUrl createdBy amountToRaise currentAmount')
      .populate('userId', 'firstName lastName email avatar')
      .sort({ contributionDate: -1, createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Contribution.countDocuments({ userId });

    res.json({
      contributions,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      total,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/contributions/:id/invoice - Get contribution invoice
const getContributionInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = (req.user.id || req.user._id).toString();

    const contribution = await Contribution.findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('eventId', 'title description createdBy');

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    const contributionOwnerId = contribution.userId?._id?.toString() || contribution.userId?.toString();
    if (currentUserId !== contributionOwnerId) {
      throw new ForbiddenError('Access denied: You can only access your own invoice.');
    }

    res.json({
      invoice: {
        invoiceNumber: contribution.invoiceNumber,
        contributionDate: contribution.contributionDate,
        amount: contribution.amount,
        status: contribution.status,
        ...contribution.invoiceData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/contributions/:id/email-invoice - Email invoice
const emailInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const currentUserId = (req.user.id || req.user._id).toString();

    const contribution = await Contribution.findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('eventId', 'title description createdBy');

    if (!contribution) {
      throw new NotFoundError('Contribution not found');
    }

    const contributionOwnerId = contribution.userId?._id?.toString() || contribution.userId?.toString();
    if (currentUserId !== contributionOwnerId) {
      throw new ForbiddenError('Access denied: You can only email your own invoice.');
    }

    const recipientEmail = email || contribution.invoiceData?.contributorEmail || contribution.userId?.email;

    if (!recipientEmail) {
      throw new BadRequestError('No email address provided for invoice delivery.');
    }

    // Attempt to send email
    try {
      await emailService.sendInvoiceEmail(recipientEmail, {
        invoiceNumber: contribution.invoiceNumber,
        contributionDate: contribution.contributionDate,
        amount: contribution.amount,
        status: contribution.status,
        ...contribution.invoiceData,
      });

      contribution.emailSent = true;
      contribution.emailSentAt = new Date();
      await contribution.save();

      res.json({ success: true, message: 'Invoice sent successfully to ' + recipientEmail });
    } catch (emailErr) {
      logger.warn('Nodemailer delivery skipped or failed', { error: emailErr.message });
      res.status(200).json({
        success: false,
        warning: 'Email delivery failed (check SMTP settings), but contribution is intact.',
        message: 'Could not send email automatically.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/contributions/stats/:userId - Get contribution statistics
const getContributionStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req.user.id || req.user._id).toString();

    if (currentUserId !== userId.toString()) {
      throw new ForbiddenError('Access denied: You can only access your own stats.');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const stats = await Contribution.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: null,
          totalContributions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgContribution: { $avg: '$amount' },
          completedContributions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalContributions: 0,
      totalAmount: 0,
      avgContribution: 0,
      completedContributions: 0,
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContribution,
  getUserContributions,
  getContributionInvoice,
  emailInvoice,
  getContributionStats,
};

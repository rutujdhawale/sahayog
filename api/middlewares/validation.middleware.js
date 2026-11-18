// middlewares/validation.middleware.js
const { ValidationError, BadRequestError } = require('../utils/errors');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const validateRegister = (req, res, next) => {
  const { firstName, lastName, email, password } = req.body || {};
  const errors = [];

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) {
    errors.push({ field: 'firstName', message: 'First name is required and must be at least 2 characters.' });
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1) {
    errors.push({ field: 'lastName', message: 'Last name is required.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push({ field: 'password', message: 'Password is required and must be at least 6 characters.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Registration validation failed', errors));
  }

  req.body.firstName = firstName.trim();
  req.body.lastName = lastName.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || !password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Login validation failed', errors));
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

const validateGoogleAuth = (req, res, next) => {
  const token = req.body?.credential || req.body?.idToken || req.body?.token;

  if (!token || typeof token !== 'string') {
    return next(new BadRequestError('Google credential or ID token is required.'));
  }

  req.googleToken = token;
  next();
};

const validateCreateEvent = (req, res, next) => {
  const { title, description, amountToRaise } = req.body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Title is required and must be at least 3 characters.' });
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push({ field: 'description', message: 'Description is required and must be at least 10 characters.' });
  }

  const parsedAmount = Number(amountToRaise);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.push({ field: 'amountToRaise', message: 'Target amount must be a positive number greater than 0.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Campaign validation failed', errors));
  }

  req.body.title = title.trim();
  req.body.description = description.trim();
  req.body.amountToRaise = parsedAmount;
  next();
};

const validateContribution = (req, res, next) => {
  const { eventId, amount, contributorEmail } = req.body || {};
  const errors = [];

  if (!eventId || !OBJECT_ID_REGEX.test(String(eventId))) {
    errors.push({ field: 'eventId', message: 'A valid 24-character campaign ID is required.' });
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount < 1) {
    errors.push({ field: 'amount', message: 'Contribution amount must be at least 1.' });
  }

  if (contributorEmail && !EMAIL_REGEX.test(contributorEmail.trim())) {
    errors.push({ field: 'contributorEmail', message: 'Invalid email address provided for invoice.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Contribution validation failed', errors));
  }

  req.body.amount = parsedAmount;
  if (contributorEmail) req.body.contributorEmail = contributorEmail.trim().toLowerCase();
  next();
};

const validateObjectIdParam = (paramName = 'id') => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || !OBJECT_ID_REGEX.test(String(id))) {
    return next(new BadRequestError(`Invalid identifier format for '${paramName}'. Expected a valid MongoDB ObjectId.`));
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  validateCreateEvent,
  validateContribution,
  validateObjectIdParam,
};

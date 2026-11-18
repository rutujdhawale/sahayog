const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: function() {
      // Password is only required for users not authenticated through OAuth
      return !this.googleId;
    },
  },
  avatar: {
    type: String,
    default: '',
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
}, { timestamps: true });

// Virtual to ensure clean id/JSON output
UserSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    avatar: this.avatar,
    authProvider: this.authProvider,
    createdAt: this.createdAt,
  };
};

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;

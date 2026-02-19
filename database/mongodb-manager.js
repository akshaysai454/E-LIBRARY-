// mongodb-manager.js
// MongoDB Database Manager with logical data handling and security

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * MongoDB Database Manager
 * Handles all database operations with validation, security, and logical workflows
 */
class MongoDBManager {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.User = null;
    this.Profile = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      await mongoose.connect(this.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('✓ MongoDB connected successfully');
      
      // Initialize models
      this.User = mongoose.model('User');
      this.Profile = mongoose.model('Profile');
      
      return true;
    } catch (error) {
      console.error('✗ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    await mongoose.disconnect();
    console.log('✓ MongoDB disconnected');
  }

  /**
   * Register new user with automatic profile creation
   */
  async registerUser(userData, profileData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate user data
      const { Validator, ValidationRules } = require('./schemas');
      
      const userValidation = Validator.validateUser(userData);
      if (!userValidation.valid) {
        throw new Error('User validation failed: ' + JSON.stringify(userValidation.errors));
      }

      const profileValidation = Validator.validateProfile(profileData);
      if (!profileValidation.valid) {
        throw new Error('Profile validation failed: ' + JSON.stringify(profileValidation.errors));
      }

      // Normalize data
      const normalizedUser = Validator.normalize(userData, ValidationRules);
      const normalizedProfile = Validator.normalize(profileData, ValidationRules);

      // Check for duplicate email
      const existingUser = await this.User.findOne({ email: normalizedUser.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Create user
      const user = new this.User({
        email: normalizedUser.email,
        password_hash: normalizedUser.password, // Will be hashed by pre-save hook
        status: normalizedUser.status || 'active'
      });

      await user.save({ session });

      // Create profile automatically
      const profile = new this.Profile({
        user_id: user._id,
        full_name: normalizedProfile.full_name,
        bio: normalizedProfile.bio || '',
        avatar_url: normalizedProfile.avatar_url || null,
        zone: normalizedProfile.zone || 'general'
      });

      await profile.save({ session });

      await session.commitTransaction();
      session.endSession();

      console.log('✓ User registered successfully:', user.email);

      return {
        user: user.toSafeObject(),
        profile: profile.toObject()
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('✗ User registration failed:', error.message);
      throw error;
    }
  }

  /**
   * Authenticate user
   */
  async authenticateUser(email, password) {
    try {
      // Find user with password field
      const user = await this.User.findOne({ email: email.toLowerCase() })
        .select('+password_hash');

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new Error('Account is not active');
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      console.log('✓ User authenticated:', user.email);

      return user.toSafeObject();
    } catch (error) {
      console.error('✗ Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Get user with profile (one-to-one relationship)
   */
  async getUserWithProfile(userId) {
    try {
      const user = await this.User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const profile = await this.Profile.findOne({ user_id: userId });
      if (!profile) {
        throw new Error('Profile not found');
      }

      return {
        user: user.toSafeObject(),
        profile: profile.toObject()
      };
    } catch (error) {
      console.error('✗ Failed to fetch user with profile:', error.message);
      throw error;
    }
  }

  /**
   * Get user by email with profile
   */
  async getUserByEmail(email) {
    try {
      const user = await this.User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error('User not found');
      }

      const profile = await this.Profile.findOne({ user_id: user._id });

      return {
        user: user.toSafeObject(),
        profile: profile ? profile.toObject() : null
      };
    } catch (error) {
      console.error('✗ Failed to fetch user by email:', error.message);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    try {
      // Check if user exists and is active
      const user = await this.User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('Cannot update profile for inactive user');
      }

      // Validate updates
      const { Validator } = require('./schemas');
      const validation = Validator.validateProfile(updates);
      if (!validation.valid) {
        throw new Error('Validation failed: ' + JSON.stringify(validation.errors));
      }

      // Update profile
      const profile = await this.Profile.findOneAndUpdate(
        { user_id: userId },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!profile) {
        throw new Error('Profile not found');
      }

      console.log('✓ Profile updated for user:', userId);

      return profile.toObject();
    } catch (error) {
      console.error('✗ Profile update failed:', error.message);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId, status) {
    try {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const user = await this.User.findByIdAndUpdate(
        userId,
        { status },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      console.log('✓ User status updated:', user.email, '→', status);

      return user.toSafeObject();
    } catch (error) {
      console.error('✗ Status update failed:', error.message);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Validate new password
      const { Validator, ValidationRules } = require('./schemas');
      const validation = Validator.validate('password', newPassword, ValidationRules.password);
      
      if (!validation.valid) {
        throw new Error('Password validation failed: ' + validation.errors.join(', '));
      }

      // Get user with password
      const user = await this.User.findById(userId).select('+password_hash');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password_hash = newPassword; // Will be hashed by pre-save hook
      await user.save();

      console.log('✓ Password changed for user:', user.email);

      return true;
    } catch (error) {
      console.error('✗ Password change failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete user (cascade delete profile)
   */
  async deleteUser(userId, softDelete = true) {
    try {
      const user = await this.User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (softDelete) {
        // Soft delete: set status to inactive
        user.status = 'inactive';
        await user.save();
        console.log('✓ User soft deleted:', user.email);
      } else {
        // Hard delete: remove user and profile
        await this.Profile.deleteOne({ user_id: userId });
        await user.remove();
        console.log('✓ User hard deleted:', user.email);
      }

      return true;
    } catch (error) {
      console.error('✗ User deletion failed:', error.message);
      throw error;
    }
  }

  /**
   * Search users by zone
   */
  async getUsersByZone(zone) {
    try {
      const profiles = await this.Profile.find({ zone: zone.toLowerCase() })
        .populate('user_id');

      return profiles.map(profile => ({
        user: profile.user_id.toSafeObject(),
        profile: profile.toObject()
      }));
    } catch (error) {
      console.error('✗ Search by zone failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all active users with profiles
   */
  async getActiveUsers(limit = 100, skip = 0) {
    try {
      const users = await this.User.find({ status: 'active' })
        .limit(limit)
        .skip(skip)
        .sort({ created_at: -1 });

      const userIds = users.map(u => u._id);
      const profiles = await this.Profile.find({ user_id: { $in: userIds } });

      const profileMap = {};
      profiles.forEach(p => {
        profileMap[p.user_id.toString()] = p.toObject();
      });

      return users.map(user => ({
        user: user.toSafeObject(),
        profile: profileMap[user._id.toString()] || null
      }));
    } catch (error) {
      console.error('✗ Failed to fetch active users:', error.message);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const totalUsers = await this.User.countDocuments();
      const activeUsers = await this.User.countDocuments({ status: 'active' });
      const inactiveUsers = await this.User.countDocuments({ status: 'inactive' });
      const suspendedUsers = await this.User.countDocuments({ status: 'suspended' });
      const totalProfiles = await this.Profile.countDocuments();

      // Zone distribution
      const zoneStats = await this.Profile.aggregate([
        { $group: { _id: '$zone', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          suspended: suspendedUsers
        },
        profiles: {
          total: totalProfiles
        },
        zones: zoneStats.map(z => ({ zone: z._id, count: z.count }))
      };
    } catch (error) {
      console.error('✗ Failed to fetch stats:', error.message);
      throw error;
    }
  }
}

module.exports = MongoDBManager;

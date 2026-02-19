// mysql-manager.js
// MySQL Database Manager with logical data handling and security

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

/**
 * MySQL Database Manager
 * Handles all database operations with validation, security, and logical workflows
 */
class MySQLManager {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  /**
   * Connect to MySQL and create connection pool
   */
  async connect() {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test connection
      const connection = await this.pool.getConnection();
      connection.release();

      console.log('✓ MySQL connected successfully');
      return true;
    } catch (error) {
      console.error('✗ MySQL connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    try {
      const { MySQLSchemas } = require('./schemas');

      // Create tables
      await this.pool.query(MySQLSchemas.users);
      await this.pool.query(MySQLSchemas.profiles);

      console.log('✓ Database schema initialized');
      return true;
    } catch (error) {
      console.error('✗ Schema initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Close connection pool
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      console.log('✓ MySQL disconnected');
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Compare password
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Register new user with automatic profile creation
   */
  async registerUser(userData, profileData) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

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
      const [existingUsers] = await connection.query(
        'SELECT user_id FROM users WHERE email = ?',
        [normalizedUser.email]
      );

      if (existingUsers.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(normalizedUser.password);

      // Insert user
      const [userResult] = await connection.query(
        'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
        [normalizedUser.email, passwordHash, normalizedUser.status || 'active']
      );

      const userId = userResult.insertId;

      // Create profile automatically
      await connection.query(
        'INSERT INTO profiles (user_id, full_name, bio, avatar_url, zone) VALUES (?, ?, ?, ?, ?)',
        [
          userId,
          normalizedProfile.full_name,
          normalizedProfile.bio || '',
          normalizedProfile.avatar_url || null,
          normalizedProfile.zone || 'general'
        ]
      );

      await connection.commit();

      console.log('✓ User registered successfully:', normalizedUser.email);

      // Fetch and return created user with profile
      return await this.getUserWithProfile(userId);
    } catch (error) {
      await connection.rollback();
      console.error('✗ User registration failed:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Authenticate user
   */
  async authenticateUser(email, password) {
    try {
      const [users] = await this.pool.query(
        'SELECT user_id, email, password_hash, status, created_at, updated_at FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (users.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = users[0];

      // Check if user is active
      if (user.status !== 'active') {
        throw new Error('Account is not active');
      }

      // Verify password
      const isMatch = await this.comparePassword(password, user.password_hash);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      console.log('✓ User authenticated:', user.email);

      // Return user without password
      const { password_hash, ...safeUser } = user;
      return safeUser;
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
      const [results] = await this.pool.query(
        `SELECT 
          u.user_id, u.email, u.status, u.created_at as user_created_at, u.updated_at as user_updated_at,
          p.profile_id, p.full_name, p.bio, p.avatar_url, p.zone, 
          p.created_at as profile_created_at, p.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN profiles p ON u.user_id = p.user_id
        WHERE u.user_id = ?`,
        [userId]
      );

      if (results.length === 0) {
        throw new Error('User not found');
      }

      const row = results[0];

      return {
        user: {
          user_id: row.user_id,
          email: row.email,
          status: row.status,
          created_at: row.user_created_at,
          updated_at: row.user_updated_at
        },
        profile: row.profile_id ? {
          profile_id: row.profile_id,
          user_id: row.user_id,
          full_name: row.full_name,
          bio: row.bio,
          avatar_url: row.avatar_url,
          zone: row.zone,
          created_at: row.profile_created_at,
          updated_at: row.profile_updated_at
        } : null
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
      const [results] = await this.pool.query(
        `SELECT 
          u.user_id, u.email, u.status, u.created_at as user_created_at, u.updated_at as user_updated_at,
          p.profile_id, p.full_name, p.bio, p.avatar_url, p.zone,
          p.created_at as profile_created_at, p.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN profiles p ON u.user_id = p.user_id
        WHERE u.email = ?`,
        [email.toLowerCase()]
      );

      if (results.length === 0) {
        throw new Error('User not found');
      }

      const row = results[0];

      return {
        user: {
          user_id: row.user_id,
          email: row.email,
          status: row.status,
          created_at: row.user_created_at,
          updated_at: row.user_updated_at
        },
        profile: row.profile_id ? {
          profile_id: row.profile_id,
          user_id: row.user_id,
          full_name: row.full_name,
          bio: row.bio,
          avatar_url: row.avatar_url,
          zone: row.zone,
          created_at: row.profile_created_at,
          updated_at: row.profile_updated_at
        } : null
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
      const [users] = await this.pool.query(
        'SELECT status FROM users WHERE user_id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      if (users[0].status !== 'active') {
        throw new Error('Cannot update profile for inactive user');
      }

      // Validate updates
      const { Validator } = require('./schemas');
      const validation = Validator.validateProfile(updates);
      if (!validation.valid) {
        throw new Error('Validation failed: ' + JSON.stringify(validation.errors));
      }

      // Build update query
      const fields = [];
      const values = [];

      if (updates.full_name !== undefined) {
        fields.push('full_name = ?');
        values.push(updates.full_name);
      }
      if (updates.bio !== undefined) {
        fields.push('bio = ?');
        values.push(updates.bio);
      }
      if (updates.avatar_url !== undefined) {
        fields.push('avatar_url = ?');
        values.push(updates.avatar_url);
      }
      if (updates.zone !== undefined) {
        fields.push('zone = ?');
        values.push(updates.zone.toLowerCase());
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(userId);

      await this.pool.query(
        `UPDATE profiles SET ${fields.join(', ')} WHERE user_id = ?`,
        values
      );

      console.log('✓ Profile updated for user:', userId);

      // Return updated profile
      const result = await this.getUserWithProfile(userId);
      return result.profile;
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

      const [result] = await this.pool.query(
        'UPDATE users SET status = ? WHERE user_id = ?',
        [status, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      console.log('✓ User status updated:', userId, '→', status);

      const userData = await this.getUserWithProfile(userId);
      return userData.user;
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
      const [users] = await this.pool.query(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      // Verify old password
      const isMatch = await this.comparePassword(oldPassword, users[0].password_hash);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      // Hash and update new password
      const newPasswordHash = await this.hashPassword(newPassword);
      await this.pool.query(
        'UPDATE users SET password_hash = ? WHERE user_id = ?',
        [newPasswordHash, userId]
      );

      console.log('✓ Password changed for user:', userId);

      return true;
    } catch (error) {
      console.error('✗ Password change failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete user (cascade delete profile via foreign key)
   */
  async deleteUser(userId, softDelete = true) {
    try {
      if (softDelete) {
        // Soft delete: set status to inactive
        await this.pool.query(
          'UPDATE users SET status = ? WHERE user_id = ?',
          ['inactive', userId]
        );
        console.log('✓ User soft deleted:', userId);
      } else {
        // Hard delete: remove user (profile deleted by CASCADE)
        const [result] = await this.pool.query(
          'DELETE FROM users WHERE user_id = ?',
          [userId]
        );

        if (result.affectedRows === 0) {
          throw new Error('User not found');
        }

        console.log('✓ User hard deleted:', userId);
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
      const [results] = await this.pool.query(
        `SELECT 
          u.user_id, u.email, u.status, u.created_at as user_created_at, u.updated_at as user_updated_at,
          p.profile_id, p.full_name, p.bio, p.avatar_url, p.zone,
          p.created_at as profile_created_at, p.updated_at as profile_updated_at
        FROM users u
        INNER JOIN profiles p ON u.user_id = p.user_id
        WHERE p.zone = ?`,
        [zone.toLowerCase()]
      );

      return results.map(row => ({
        user: {
          user_id: row.user_id,
          email: row.email,
          status: row.status,
          created_at: row.user_created_at,
          updated_at: row.user_updated_at
        },
        profile: {
          profile_id: row.profile_id,
          user_id: row.user_id,
          full_name: row.full_name,
          bio: row.bio,
          avatar_url: row.avatar_url,
          zone: row.zone,
          created_at: row.profile_created_at,
          updated_at: row.profile_updated_at
        }
      }));
    } catch (error) {
      console.error('✗ Search by zone failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all active users with profiles
   */
  async getActiveUsers(limit = 100, offset = 0) {
    try {
      const [results] = await this.pool.query(
        `SELECT 
          u.user_id, u.email, u.status, u.created_at as user_created_at, u.updated_at as user_updated_at,
          p.profile_id, p.full_name, p.bio, p.avatar_url, p.zone,
          p.created_at as profile_created_at, p.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN profiles p ON u.user_id = p.user_id
        WHERE u.status = 'active'
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return results.map(row => ({
        user: {
          user_id: row.user_id,
          email: row.email,
          status: row.status,
          created_at: row.user_created_at,
          updated_at: row.user_updated_at
        },
        profile: row.profile_id ? {
          profile_id: row.profile_id,
          user_id: row.user_id,
          full_name: row.full_name,
          bio: row.bio,
          avatar_url: row.avatar_url,
          zone: row.zone,
          created_at: row.profile_created_at,
          updated_at: row.profile_updated_at
        } : null
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
      const [userStats] = await this.pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
        FROM users`
      );

      const [profileStats] = await this.pool.query(
        'SELECT COUNT(*) as total FROM profiles'
      );

      const [zoneStats] = await this.pool.query(
        'SELECT zone, COUNT(*) as count FROM profiles GROUP BY zone ORDER BY count DESC'
      );

      return {
        users: {
          total: userStats[0].total,
          active: userStats[0].active,
          inactive: userStats[0].inactive,
          suspended: userStats[0].suspended
        },
        profiles: {
          total: profileStats[0].total
        },
        zones: zoneStats
      };
    } catch (error) {
      console.error('✗ Failed to fetch stats:', error.message);
      throw error;
    }
  }
}

module.exports = MySQLManager;

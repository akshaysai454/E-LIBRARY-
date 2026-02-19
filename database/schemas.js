// schemas.js
// Database Schema Definitions for Users and Profiles
// Supports both MongoDB (NoSQL) and MySQL (Relational)

/**
 * MONGODB SCHEMAS (using Mongoose)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Schema - MongoDB
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    },
    index: true
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Never return password in queries by default
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Profile Schema - MongoDB
const ProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  full_name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  avatar_url: {
    type: String,
    trim: true,
    validate: {
      validator: function(url) {
        if (!url) return true;
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid URL format'
    },
    default: null
  },
  zone: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    default: 'general',
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for performance
UserSchema.index({ email: 1, status: 1 });
ProfileSchema.index({ user_id: 1, zone: 1 });

// Pre-save middleware for User
UserSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password_hash')) {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
  }
  next();
});

// Pre-save middleware for Profile
ProfileSchema.pre('save', async function(next) {
  // Check if user is active before allowing profile updates
  const User = mongoose.model('User');
  const user = await User.findById(this.user_id);
  
  if (!user) {
    throw new Error('User does not exist');
  }
  
  if (user.status !== 'active' && !this.isNew) {
    throw new Error('Cannot update profile for inactive user');
  }
  
  next();
});

// Cascade delete: Remove profile when user is deleted
UserSchema.pre('remove', async function(next) {
  const Profile = mongoose.model('Profile');
  await Profile.deleteOne({ user_id: this._id });
  next();
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

UserSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password_hash;
  return obj;
};

/**
 * MYSQL SCHEMA DEFINITIONS (SQL DDL)
 */

const MySQLSchemas = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_status (status),
      INDEX idx_email_status (email, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  profiles: `
    CREATE TABLE IF NOT EXISTS profiles (
      profile_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      full_name VARCHAR(100) NOT NULL,
      bio TEXT,
      avatar_url VARCHAR(500),
      zone VARCHAR(50) NOT NULL DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_zone (zone),
      INDEX idx_user_zone (user_id, zone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // Trigger to prevent profile updates for inactive users
  profileUpdateTrigger: `
    DELIMITER $$
    CREATE TRIGGER before_profile_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    BEGIN
      DECLARE user_status VARCHAR(20);
      SELECT status INTO user_status FROM users WHERE user_id = NEW.user_id;
      
      IF user_status != 'active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot update profile for inactive user';
      END IF;
    END$$
    DELIMITER ;
  `,
  
  // Stored procedure for user registration with profile creation
  registerUserProcedure: `
    DELIMITER $$
    CREATE PROCEDURE register_user(
      IN p_email VARCHAR(255),
      IN p_password_hash VARCHAR(255),
      IN p_full_name VARCHAR(100),
      IN p_zone VARCHAR(50)
    )
    BEGIN
      DECLARE new_user_id INT;
      
      START TRANSACTION;
      
      -- Insert user
      INSERT INTO users (email, password_hash, status)
      VALUES (LOWER(TRIM(p_email)), p_password_hash, 'active');
      
      SET new_user_id = LAST_INSERT_ID();
      
      -- Create default profile
      INSERT INTO profiles (user_id, full_name, zone)
      VALUES (new_user_id, TRIM(p_full_name), COALESCE(LOWER(TRIM(p_zone)), 'general'));
      
      COMMIT;
      
      SELECT new_user_id as user_id;
    END$$
    DELIMITER ;
  `
};

/**
 * VALIDATION RULES
 */

const ValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    normalize: (value) => value.toLowerCase().trim(),
    message: 'Valid email address is required'
  },
  
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  },
  
  full_name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    normalize: (value) => value.trim(),
    message: 'Full name must be between 2 and 100 characters'
  },
  
  bio: {
    required: false,
    maxLength: 500,
    normalize: (value) => value ? value.trim() : '',
    message: 'Bio cannot exceed 500 characters'
  },
  
  avatar_url: {
    required: false,
    pattern: /^https?:\/\/.+/,
    normalize: (value) => value ? value.trim() : null,
    message: 'Avatar URL must be a valid HTTP/HTTPS URL'
  },
  
  zone: {
    required: true,
    normalize: (value) => value ? value.toLowerCase().trim() : 'general',
    message: 'Zone is required'
  },
  
  status: {
    required: true,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    message: 'Status must be active, inactive, or suspended'
  }
};

/**
 * VALIDATOR CLASS
 */

class Validator {
  static validate(field, value, rules) {
    const errors = [];
    
    // Required check
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field} is required`);
      return { valid: false, errors };
    }
    
    // Skip further validation if optional and empty
    if (!rules.required && (!value || value.toString().trim() === '')) {
      return { valid: true, errors: [] };
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || `${field} format is invalid`);
    }
    
    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${field} cannot exceed ${rules.maxLength} characters`);
    }
    
    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static validateUser(userData) {
    const errors = {};
    
    // Validate email
    const emailValidation = this.validate('email', userData.email, ValidationRules.email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.errors;
    }
    
    // Validate password
    const passwordValidation = this.validate('password', userData.password, ValidationRules.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.errors;
    }
    
    // Validate status
    if (userData.status) {
      const statusValidation = this.validate('status', userData.status, ValidationRules.status);
      if (!statusValidation.valid) {
        errors.status = statusValidation.errors;
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  static validateProfile(profileData) {
    const errors = {};
    
    // Validate full_name
    const nameValidation = this.validate('full_name', profileData.full_name, ValidationRules.full_name);
    if (!nameValidation.valid) {
      errors.full_name = nameValidation.errors;
    }
    
    // Validate bio
    if (profileData.bio) {
      const bioValidation = this.validate('bio', profileData.bio, ValidationRules.bio);
      if (!bioValidation.valid) {
        errors.bio = bioValidation.errors;
      }
    }
    
    // Validate avatar_url
    if (profileData.avatar_url) {
      const avatarValidation = this.validate('avatar_url', profileData.avatar_url, ValidationRules.avatar_url);
      if (!avatarValidation.valid) {
        errors.avatar_url = avatarValidation.errors;
      }
    }
    
    // Validate zone
    const zoneValidation = this.validate('zone', profileData.zone, ValidationRules.zone);
    if (!zoneValidation.valid) {
      errors.zone = zoneValidation.errors;
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  static normalize(data, rules) {
    const normalized = {};
    
    for (const [field, value] of Object.entries(data)) {
      if (rules[field] && rules[field].normalize) {
        normalized[field] = rules[field].normalize(value);
      } else {
        normalized[field] = value;
      }
    }
    
    return normalized;
  }
}

// Export schemas and utilities
module.exports = {
  // MongoDB
  UserSchema,
  ProfileSchema,
  
  // MySQL
  MySQLSchemas,
  
  // Validation
  ValidationRules,
  Validator
};

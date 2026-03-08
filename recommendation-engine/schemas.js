// schemas.js
// Database schemas for Recommendation Engine

/**
 * USER ACTIVITY SCHEMA
 * Tracks all user interactions for personalized recommendations
 */
const UserActivitySchema = {
  activity_id: 'PRIMARY KEY',
  user_id: 'FOREIGN KEY (references users)',
  action_type: 'ENUM (scene_created, template_opened, character_selected, location_used, genre_selected)',
  item_id: 'ID of the item (scene, template, character, etc.)',
  item_type: 'ENUM (scene, template, character, location, genre)',
  item_name: 'Name of the item',
  metadata: 'JSON (additional context: genre, tags, etc.)',
  timestamp: 'TIMESTAMP',
  session_id: 'Session identifier for context tracking'
};

/**
 * POPULARITY TRACKING SCHEMA
 * Maintains global popularity scores for all items
 */
const PopularitySchema = {
  item_id: 'PRIMARY KEY',
  item_type: 'ENUM (scene, template, character, location, genre)',
  item_name: 'Name of the item',
  total_uses: 'INT (number of times used)',
  unique_users: 'INT (number of unique users)',
  average_rating: 'DECIMAL (0-5 scale)',
  rating_count: 'INT (number of ratings)',
  last_used: 'TIMESTAMP',
  trending_score: 'DECIMAL (calculated trending metric)',
  created_at: 'TIMESTAMP',
  updated_at: 'TIMESTAMP'
};

/**
 * USER PREFERENCES SCHEMA
 * Aggregated user preferences for faster recommendations
 */
const UserPreferencesSchema = {
  user_id: 'PRIMARY KEY',
  favorite_genres: 'JSON ARRAY',
  favorite_characters: 'JSON ARRAY',
  favorite_locations: 'JSON ARRAY',
  scene_type_frequency: 'JSON OBJECT {scene_type: count}',
  last_activity: 'TIMESTAMP',
  total_activities: 'INT',
  created_at: 'TIMESTAMP',
  updated_at: 'TIMESTAMP'
};

/**
 * RECOMMENDATION FEEDBACK SCHEMA
 * Tracks user interactions with recommendations
 */
const RecommendationFeedbackSchema = {
  feedback_id: 'PRIMARY KEY',
  user_id: 'FOREIGN KEY',
  recommendation_id: 'ID of recommended item',
  item_type: 'ENUM (scene, template, character, location, genre)',
  action: 'ENUM (clicked, ignored, dismissed, rated)',
  rating: 'INT (1-5, optional)',
  timestamp: 'TIMESTAMP'
};

/**
 * MONGODB SCHEMAS (Mongoose)
 */
const mongoose = require('mongoose');

const UserActivityMongoSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action_type: {
    type: String,
    enum: ['scene_created', 'template_opened', 'character_selected', 'location_used', 'genre_selected'],
    required: true,
    index: true
  },
  item_id: {
    type: String,
    required: true,
    index: true
  },
  item_type: {
    type: String,
    enum: ['scene', 'template', 'character', 'location', 'genre'],
    required: true,
    index: true
  },
  item_name: {
    type: String,
    required: true
  },
  metadata: {
    genre: String,
    tags: [String],
    category: String,
    context: mongoose.Schema.Types.Mixed
  },
  session_id: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const PopularityMongoSchema = new mongoose.Schema({
  item_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  item_type: {
    type: String,
    enum: ['scene', 'template', 'character', 'location', 'genre'],
    required: true,
    index: true
  },
  item_name: {
    type: String,
    required: true
  },
  total_uses: {
    type: Number,
    default: 0,
    index: true
  },
  unique_users: {
    type: Number,
    default: 0
  },
  average_rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  rating_count: {
    type: Number,
    default: 0
  },
  last_used: {
    type: Date,
    default: Date.now,
    index: true
  },
  trending_score: {
    type: Number,
    default: 0,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

const UserPreferencesMongoSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  favorite_genres: [{
    genre: String,
    count: Number,
    last_used: Date
  }],
  favorite_characters: [{
    character: String,
    count: Number,
    last_used: Date
  }],
  favorite_locations: [{
    location: String,
    count: Number,
    last_used: Date
  }],
  scene_type_frequency: {
    type: Map,
    of: Number
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  total_activities: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

const RecommendationFeedbackMongoSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recommendation_id: {
    type: String,
    required: true,
    index: true
  },
  item_type: {
    type: String,
    enum: ['scene', 'template', 'character', 'location', 'genre'],
    required: true
  },
  action: {
    type: String,
    enum: ['clicked', 'ignored', 'dismissed', 'rated'],
    required: true,
    index: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes for performance
UserActivityMongoSchema.index({ user_id: 1, timestamp: -1 });
UserActivityMongoSchema.index({ item_type: 1, item_id: 1 });
PopularityMongoSchema.index({ item_type: 1, trending_score: -1 });
PopularityMongoSchema.index({ item_type: 1, total_uses: -1 });
RecommendationFeedbackMongoSchema.index({ user_id: 1, timestamp: -1 });

/**
 * MYSQL SCHEMAS (SQL DDL)
 */
const MySQLSchemas = {
  user_activity: `
    CREATE TABLE IF NOT EXISTS user_activity (
      activity_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      action_type ENUM('scene_created', 'template_opened', 'character_selected', 'location_used', 'genre_selected') NOT NULL,
      item_id VARCHAR(100) NOT NULL,
      item_type ENUM('scene', 'template', 'character', 'location', 'genre') NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      metadata JSON,
      session_id VARCHAR(100),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_user_timestamp (user_id, timestamp),
      INDEX idx_item (item_type, item_id),
      INDEX idx_action_type (action_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  
  popularity: `
    CREATE TABLE IF NOT EXISTS popularity (
      item_id VARCHAR(100) PRIMARY KEY,
      item_type ENUM('scene', 'template', 'character', 'location', 'genre') NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      total_uses INT DEFAULT 0,
      unique_users INT DEFAULT 0,
      average_rating DECIMAL(3,2) DEFAULT 0,
      rating_count INT DEFAULT 0,
      last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      trending_score DECIMAL(10,4) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_item_type (item_type),
      INDEX idx_trending (item_type, trending_score),
      INDEX idx_total_uses (item_type, total_uses)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  
  user_preferences: `
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INT PRIMARY KEY,
      favorite_genres JSON,
      favorite_characters JSON,
      favorite_locations JSON,
      scene_type_frequency JSON,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total_activities INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_last_activity (last_activity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  
  recommendation_feedback: `
    CREATE TABLE IF NOT EXISTS recommendation_feedback (
      feedback_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      recommendation_id VARCHAR(100) NOT NULL,
      item_type ENUM('scene', 'template', 'character', 'location', 'genre') NOT NULL,
      action ENUM('clicked', 'ignored', 'dismissed', 'rated') NOT NULL,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_user_timestamp (user_id, timestamp),
      INDEX idx_recommendation (recommendation_id),
      INDEX idx_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `
};

module.exports = {
  // Schema definitions
  UserActivitySchema,
  PopularitySchema,
  UserPreferencesSchema,
  RecommendationFeedbackSchema,
  
  // MongoDB schemas
  UserActivityMongoSchema,
  PopularityMongoSchema,
  UserPreferencesMongoSchema,
  RecommendationFeedbackMongoSchema,
  
  // MySQL schemas
  MySQLSchemas
};

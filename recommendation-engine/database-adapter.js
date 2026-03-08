// database-adapter.js
// Database adapter for Recommendation Engine (in-memory implementation for demo)

/**
 * DatabaseAdapter Class
 * Provides database operations for the recommendation engine
 * This is an in-memory implementation for demonstration
 * Can be replaced with MongoDB or MySQL implementation
 */
class DatabaseAdapter {
  constructor() {
    // In-memory storage
    this.activities = [];
    this.popularity = new Map();
    this.preferences = new Map();
    this.feedback = [];
    this.items = new Map();
    this.recommendationLogs = [];
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  /**
   * Initialize sample data for demonstration
   */
  initializeSampleData() {
    // Sample scenes
    const sampleScenes = [
      {
        item_id: 'scene_001',
        item_type: 'scene',
        item_name: 'Crime Investigation Scene',
        metadata: {
          genre: 'crime',
          category: 'investigation',
          tags: ['detective', 'evidence', 'mystery'],
          characters: ['detective', 'forensic'],
          location: 'crime_scene'
        }
      },
      {
        item_id: 'scene_002',
        item_type: 'scene',
        item_name: 'Police Interrogation Room',
        metadata: {
          genre: 'crime',
          category: 'interrogation',
          tags: ['police', 'suspect', 'questioning'],
          characters: ['detective', 'suspect'],
          location: 'police_station'
        }
      },
      {
        item_id: 'scene_003',
        item_type: 'scene',
        item_name: 'Night City Street',
        metadata: {
          genre: 'crime',
          category: 'outdoor',
          tags: ['night', 'urban', 'street'],
          characters: [],
          location: 'city_street'
        }
      },
      {
        item_id: 'scene_004',
        item_type: 'scene',
        item_name: 'Romantic Cafe',
        metadata: {
          genre: 'romance',
          category: 'indoor',
          tags: ['cafe', 'date', 'conversation'],
          characters: ['couple'],
          location: 'cafe'
        }
      },
      {
        item_id: 'scene_005',
        item_type: 'scene',
        item_name: 'Action Chase Sequence',
        metadata: {
          genre: 'action',
          category: 'chase',
          tags: ['car', 'speed', 'pursuit'],
          characters: ['hero', 'villain'],
          location: 'highway'
        }
      },
      {
        item_id: 'scene_006',
        item_type: 'scene',
        item_name: 'Horror Abandoned House',
        metadata: {
          genre: 'horror',
          category: 'exploration',
          tags: ['dark', 'scary', 'abandoned'],
          characters: ['protagonist'],
          location: 'abandoned_house'
        }
      },
      {
        item_id: 'scene_007',
        item_type: 'scene',
        item_name: 'Sci-Fi Laboratory',
        metadata: {
          genre: 'sci-fi',
          category: 'research',
          tags: ['technology', 'experiment', 'futuristic'],
          characters: ['scientist'],
          location: 'laboratory'
        }
      },
      {
        item_id: 'scene_008',
        item_type: 'scene',
        item_name: 'Crime Evidence Room',
        metadata: {
          genre: 'crime',
          category: 'investigation',
          tags: ['evidence', 'analysis', 'clues'],
          characters: ['detective', 'forensic'],
          location: 'police_station'
        }
      },
      {
        item_id: 'scene_009',
        item_type: 'scene',
        item_name: 'Courtroom Drama',
        metadata: {
          genre: 'crime',
          category: 'legal',
          tags: ['trial', 'lawyer', 'justice'],
          characters: ['lawyer', 'judge'],
          location: 'courtroom'
        }
      },
      {
        item_id: 'scene_010',
        item_type: 'scene',
        item_name: 'Dark Alley Confrontation',
        metadata: {
          genre: 'crime',
          category: 'confrontation',
          tags: ['dark', 'tension', 'danger'],
          characters: ['detective', 'criminal'],
          location: 'alley'
        }
      }
    ];

    // Store items
    sampleScenes.forEach(scene => {
      this.items.set(scene.item_id, scene);
    });

    // Initialize popularity for each scene
    sampleScenes.forEach((scene, index) => {
      this.popularity.set(scene.item_id, {
        item_id: scene.item_id,
        item_type: scene.item_type,
        item_name: scene.item_name,
        total_uses: Math.floor(Math.random() * 100) + 10,
        unique_users: Math.floor(Math.random() * 50) + 5,
        average_rating: (Math.random() * 2 + 3).toFixed(2), // 3-5 rating
        rating_count: Math.floor(Math.random() * 30) + 5,
        last_used: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        trending_score: Math.random() * 0.8 + 0.2,
        created_at: new Date(),
        updated_at: new Date()
      });
    });
  }

  /**
   * Save user activity
   */
  async saveActivity(activity) {
    this.activities.push({
      ...activity,
      activity_id: this.activities.length + 1,
      timestamp: activity.timestamp || new Date()
    });
    return true;
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId, limit = 100) {
    return this.activities
      .filter(a => a.user_id === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    return this.preferences.get(userId) || {
      user_id: userId,
      favorite_genres: [],
      favorite_characters: [],
      favorite_locations: [],
      scene_type_frequency: {},
      total_activities: 0,
      last_activity: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences) {
    this.preferences.set(preferences.user_id, preferences);
    return true;
  }

  /**
   * Get popularity data for an item
   */
  async getPopularity(itemId) {
    return this.popularity.get(itemId) || null;
  }

  /**
   * Save popularity data
   */
  async savePopularity(popularity) {
    this.popularity.set(popularity.item_id, popularity);
    return true;
  }

  /**
   * Get total platform uses for an item type
   */
  async getTotalPlatformUses(itemType) {
    let total = 0;
    for (const [, pop] of this.popularity) {
      if (pop.item_type === itemType) {
        total += pop.total_uses;
      }
    }
    return total;
  }

  /**
   * Get trending items
   */
  async getTrendingItems(itemType, limit = 10) {
    const items = [];
    
    for (const [itemId, pop] of this.popularity) {
      if (pop.item_type === itemType) {
        const item = this.items.get(itemId);
        if (item) {
          items.push({
            ...item,
            ...pop
          });
        }
      }
    }
    
    return items
      .sort((a, b) => b.trending_score - a.trending_score)
      .slice(0, limit);
  }

  /**
   * Get items by type
   */
  async getItemsByType(itemType) {
    const items = [];
    
    for (const [, item] of this.items) {
      if (item.item_type === itemType) {
        items.push(item);
      }
    }
    
    return items;
  }

  /**
   * Get recent activities for an item
   */
  async getRecentActivitiesForItem(itemId, daysWindow = 7) {
    const cutoffDate = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000);
    
    return this.activities.filter(
      a => a.item_id === itemId && a.timestamp >= cutoffDate
    );
  }

  /**
   * Save recommendation feedback
   */
  async saveFeedback(feedback) {
    this.feedback.push({
      ...feedback,
      feedback_id: this.feedback.length + 1
    });
    return true;
  }

  /**
   * Log recommendations
   */
  async logRecommendations(log) {
    this.recommendationLogs.push(log);
    return true;
  }

  /**
   * Get statistics
   */
  async getStats() {
    return {
      total_activities: this.activities.length,
      total_items: this.items.size,
      total_users: new Set(this.activities.map(a => a.user_id)).size,
      total_feedback: this.feedback.length
    };
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll() {
    this.activities = [];
    this.feedback = [];
    this.recommendationLogs = [];
    this.preferences.clear();
    // Keep items and popularity for demo
  }
}

module.exports = DatabaseAdapter;

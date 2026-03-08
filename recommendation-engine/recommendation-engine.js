// recommendation-engine.js
// Intelligent Recommendation Engine with history-based and popularity-based scoring

/**
 * RecommendationEngine Class
 * Provides personalized recommendations based on user history and global popularity
 */
class RecommendationEngine {
  constructor(database) {
    this.db = database;
    
    // Scoring weights
    this.weights = {
      history: {
        similarScenes: 0.4,
        sameGenre: 0.3,
        sameCharacter: 0.2,
        sameLocation: 0.1
      },
      final: {
        history: 0.6,
        popularity: 0.4
      }
    };
    
    // Configuration
    this.config = {
      maxRecommendations: 10,
      minHistoryScore: 0.1,
      diversityThreshold: 0.7,
      trendingWindow: 7, // days
      coldStartCount: 10
    };
  }

  /**
   * Get personalized recommendations for a user
   * @param {string} userId - User ID
   * @param {string} itemType - Type of items to recommend
   * @param {object} context - Current context (optional)
   * @returns {Array} Recommended items with scores
   */
  async getRecommendations(userId, itemType = 'scene', context = {}) {
    try {
      // Check if user has history
      const userHistory = await this.getUserHistory(userId);
      
      if (userHistory.length === 0) {
        // Cold start: return trending items
        return await this.getColdStartRecommendations(itemType);
      }
      
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get all available items
      const availableItems = await this.getAvailableItems(itemType);
      
      // Calculate scores for each item
      const scoredItems = await Promise.all(
        availableItems.map(async (item) => {
          const historyScore = this.calculateHistoryScore(item, userHistory, preferences, context);
          const popularityScore = await this.calculatePopularityScore(item);
          const finalScore = this.calculateFinalScore(historyScore, popularityScore);
          
          return {
            ...item,
            historyScore,
            popularityScore,
            finalScore
          };
        })
      );
      
      // Apply diversity filter
      const diverseItems = this.applyDiversityFilter(scoredItems, userHistory);
      
      // Sort by final score and return top N
      const recommendations = diverseItems
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, this.config.maxRecommendations);
      
      // Log recommendations for feedback loop
      await this.logRecommendations(userId, recommendations);
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Calculate history-based score
   * HistoryScore = (0.4 * Similar Scenes) + (0.3 * Same Genre) + (0.2 * Same Character) + (0.1 * Same Location)
   */
  calculateHistoryScore(item, userHistory, preferences, context = {}) {
    let score = 0;
    
    // Similar scenes used before
    const similarScenes = this.calculateSimilarityScore(item, userHistory, 'scene');
    score += this.weights.history.similarScenes * similarScenes;
    
    // Same genre frequency
    const genreScore = this.calculateGenreScore(item, preferences);
    score += this.weights.history.sameGenre * genreScore;
    
    // Same character usage
    const characterScore = this.calculateCharacterScore(item, preferences);
    score += this.weights.history.sameCharacter * characterScore;
    
    // Same location usage
    const locationScore = this.calculateLocationScore(item, preferences);
    score += this.weights.history.sameLocation * locationScore;
    
    // Context awareness boost
    if (context.currentGenre && item.metadata?.genre === context.currentGenre) {
      score *= 1.2; // 20% boost for context match
    }
    
    return Math.min(score, 1.0); // Normalize to 0-1
  }

  /**
   * Calculate popularity-based score
   * PopularityScore = (Number of times used globally / Total platform uses)
   */
  async calculatePopularityScore(item) {
    try {
      const popularity = await this.db.getPopularity(item.item_id);
      
      if (!popularity) {
        return 0;
      }
      
      const totalUses = await this.db.getTotalPlatformUses(item.item_type);
      
      if (totalUses === 0) {
        return 0;
      }
      
      // Base popularity score
      let score = popularity.total_uses / totalUses;
      
      // Factor in rating
      if (popularity.rating_count > 0) {
        const ratingBonus = (popularity.average_rating / 5) * 0.2;
        score += ratingBonus;
      }
      
      // Factor in trending
      const trendingBonus = popularity.trending_score * 0.1;
      score += trendingBonus;
      
      return Math.min(score, 1.0); // Normalize to 0-1
    } catch (error) {
      console.error('Error calculating popularity score:', error);
      return 0;
    }
  }

  /**
   * Calculate final recommendation score
   * FinalScore = (0.6 * HistoryScore) + (0.4 * PopularityScore)
   */
  calculateFinalScore(historyScore, popularityScore) {
    return (
      this.weights.final.history * historyScore +
      this.weights.final.popularity * popularityScore
    );
  }

  /**
   * Calculate similarity score for scenes
   */
  calculateSimilarityScore(item, userHistory, type) {
    const relevantHistory = userHistory.filter(h => h.item_type === type);
    
    if (relevantHistory.length === 0) {
      return 0;
    }
    
    let similarityCount = 0;
    
    for (const historyItem of relevantHistory) {
      // Check metadata similarity
      if (item.metadata && historyItem.metadata) {
        const similarity = this.calculateMetadataSimilarity(
          item.metadata,
          historyItem.metadata
        );
        similarityCount += similarity;
      }
    }
    
    return Math.min(similarityCount / relevantHistory.length, 1.0);
  }

  /**
   * Calculate genre score based on user preferences
   */
  calculateGenreScore(item, preferences) {
    if (!item.metadata?.genre || !preferences.favorite_genres) {
      return 0;
    }
    
    const genrePreference = preferences.favorite_genres.find(
      g => g.genre === item.metadata.genre
    );
    
    if (!genrePreference) {
      return 0;
    }
    
    // Normalize by total activities
    return Math.min(genrePreference.count / preferences.total_activities, 1.0);
  }

  /**
   * Calculate character score based on user preferences
   */
  calculateCharacterScore(item, preferences) {
    if (!item.metadata?.characters || !preferences.favorite_characters) {
      return 0;
    }
    
    const itemCharacters = Array.isArray(item.metadata.characters)
      ? item.metadata.characters
      : [item.metadata.characters];
    
    let score = 0;
    
    for (const character of itemCharacters) {
      const charPreference = preferences.favorite_characters.find(
        c => c.character === character
      );
      
      if (charPreference) {
        score += charPreference.count / preferences.total_activities;
      }
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate location score based on user preferences
   */
  calculateLocationScore(item, preferences) {
    if (!item.metadata?.location || !preferences.favorite_locations) {
      return 0;
    }
    
    const locationPreference = preferences.favorite_locations.find(
      l => l.location === item.metadata.location
    );
    
    if (!locationPreference) {
      return 0;
    }
    
    return Math.min(locationPreference.count / preferences.total_activities, 1.0);
  }

  /**
   * Calculate metadata similarity between two items
   */
  calculateMetadataSimilarity(metadata1, metadata2) {
    let similarity = 0;
    let factors = 0;
    
    // Genre match
    if (metadata1.genre && metadata2.genre) {
      factors++;
      if (metadata1.genre === metadata2.genre) {
        similarity += 1;
      }
    }
    
    // Tags overlap
    if (metadata1.tags && metadata2.tags) {
      factors++;
      const tags1 = new Set(metadata1.tags);
      const tags2 = new Set(metadata2.tags);
      const intersection = new Set([...tags1].filter(x => tags2.has(x)));
      const union = new Set([...tags1, ...tags2]);
      
      if (union.size > 0) {
        similarity += intersection.size / union.size;
      }
    }
    
    // Category match
    if (metadata1.category && metadata2.category) {
      factors++;
      if (metadata1.category === metadata2.category) {
        similarity += 1;
      }
    }
    
    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Apply diversity filter to avoid repetitive recommendations
   */
  applyDiversityFilter(items, userHistory) {
    const recentItems = new Set(
      userHistory.slice(-20).map(h => h.item_id)
    );
    
    const filtered = [];
    const seenGenres = new Map();
    
    for (const item of items) {
      // Skip recently used items
      if (recentItems.has(item.item_id)) {
        continue;
      }
      
      // Limit items per genre for diversity
      const genre = item.metadata?.genre || 'unknown';
      const genreCount = seenGenres.get(genre) || 0;
      
      if (genreCount >= 3) {
        // Skip if too many from same genre
        continue;
      }
      
      filtered.push(item);
      seenGenres.set(genre, genreCount + 1);
    }
    
    return filtered;
  }

  /**
   * Get cold start recommendations for new users
   */
  async getColdStartRecommendations(itemType) {
    try {
      // Get top trending items
      const trending = await this.db.getTrendingItems(
        itemType,
        this.config.coldStartCount
      );
      
      // Add popularity score as final score
      return trending.map(item => ({
        ...item,
        historyScore: 0,
        popularityScore: item.trending_score || 0,
        finalScore: item.trending_score || 0,
        reason: 'trending'
      }));
    } catch (error) {
      console.error('Error getting cold start recommendations:', error);
      return [];
    }
  }

  /**
   * Get user history
   */
  async getUserHistory(userId) {
    try {
      return await this.db.getUserActivity(userId, 100); // Last 100 activities
    } catch (error) {
      console.error('Error fetching user history:', error);
      return [];
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    try {
      return await this.db.getUserPreferences(userId);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return {
        favorite_genres: [],
        favorite_characters: [],
        favorite_locations: [],
        total_activities: 0
      };
    }
  }

  /**
   * Get available items for recommendation
   */
  async getAvailableItems(itemType) {
    try {
      return await this.db.getItemsByType(itemType);
    } catch (error) {
      console.error('Error fetching available items:', error);
      return [];
    }
  }

  /**
   * Log recommendations for feedback loop
   */
  async logRecommendations(userId, recommendations) {
    try {
      const recommendationLog = {
        user_id: userId,
        recommendations: recommendations.map(r => ({
          item_id: r.item_id,
          item_type: r.item_type,
          final_score: r.finalScore
        })),
        timestamp: new Date()
      };
      
      await this.db.logRecommendations(recommendationLog);
    } catch (error) {
      console.error('Error logging recommendations:', error);
    }
  }

  /**
   * Track user activity
   */
  async trackActivity(userId, activity) {
    try {
      // Save activity
      await this.db.saveActivity({
        user_id: userId,
        action_type: activity.action_type,
        item_id: activity.item_id,
        item_type: activity.item_type,
        item_name: activity.item_name,
        metadata: activity.metadata,
        session_id: activity.session_id,
        timestamp: new Date()
      });
      
      // Update user preferences
      await this.updateUserPreferences(userId, activity);
      
      // Update popularity
      await this.updatePopularity(activity);
      
      console.log('✓ Activity tracked:', activity.action_type, activity.item_name);
    } catch (error) {
      console.error('Error tracking activity:', error);
      throw error;
    }
  }

  /**
   * Update user preferences based on activity
   */
  async updateUserPreferences(userId, activity) {
    try {
      const preferences = await this.db.getUserPreferences(userId) || {
        user_id: userId,
        favorite_genres: [],
        favorite_characters: [],
        favorite_locations: [],
        scene_type_frequency: {},
        total_activities: 0
      };
      
      // Update genre preferences
      if (activity.metadata?.genre) {
        const genreIndex = preferences.favorite_genres.findIndex(
          g => g.genre === activity.metadata.genre
        );
        
        if (genreIndex >= 0) {
          preferences.favorite_genres[genreIndex].count++;
          preferences.favorite_genres[genreIndex].last_used = new Date();
        } else {
          preferences.favorite_genres.push({
            genre: activity.metadata.genre,
            count: 1,
            last_used: new Date()
          });
        }
      }
      
      // Update character preferences
      if (activity.metadata?.characters) {
        const characters = Array.isArray(activity.metadata.characters)
          ? activity.metadata.characters
          : [activity.metadata.characters];
        
        for (const character of characters) {
          const charIndex = preferences.favorite_characters.findIndex(
            c => c.character === character
          );
          
          if (charIndex >= 0) {
            preferences.favorite_characters[charIndex].count++;
            preferences.favorite_characters[charIndex].last_used = new Date();
          } else {
            preferences.favorite_characters.push({
              character,
              count: 1,
              last_used: new Date()
            });
          }
        }
      }
      
      // Update location preferences
      if (activity.metadata?.location) {
        const locationIndex = preferences.favorite_locations.findIndex(
          l => l.location === activity.metadata.location
        );
        
        if (locationIndex >= 0) {
          preferences.favorite_locations[locationIndex].count++;
          preferences.favorite_locations[locationIndex].last_used = new Date();
        } else {
          preferences.favorite_locations.push({
            location: activity.metadata.location,
            count: 1,
            last_used: new Date()
          });
        }
      }
      
      // Update scene type frequency
      if (activity.item_type === 'scene') {
        const sceneType = activity.metadata?.category || 'unknown';
        preferences.scene_type_frequency[sceneType] = 
          (preferences.scene_type_frequency[sceneType] || 0) + 1;
      }
      
      preferences.total_activities++;
      preferences.last_activity = new Date();
      preferences.updated_at = new Date();
      
      await this.db.saveUserPreferences(preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  /**
   * Update popularity metrics
   */
  async updatePopularity(activity) {
    try {
      const popularity = await this.db.getPopularity(activity.item_id) || {
        item_id: activity.item_id,
        item_type: activity.item_type,
        item_name: activity.item_name,
        total_uses: 0,
        unique_users: 0,
        average_rating: 0,
        rating_count: 0,
        last_used: new Date(),
        trending_score: 0
      };
      
      popularity.total_uses++;
      popularity.last_used = new Date();
      
      // Calculate trending score based on recent activity
      popularity.trending_score = await this.calculateTrendingScore(activity.item_id);
      
      popularity.updated_at = new Date();
      
      await this.db.savePopularity(popularity);
    } catch (error) {
      console.error('Error updating popularity:', error);
    }
  }

  /**
   * Calculate trending score
   * Higher score for items used recently and frequently
   */
  async calculateTrendingScore(itemId) {
    try {
      const recentActivities = await this.db.getRecentActivitiesForItem(
        itemId,
        this.config.trendingWindow
      );
      
      if (recentActivities.length === 0) {
        return 0;
      }
      
      // Time decay factor
      const now = Date.now();
      let score = 0;
      
      for (const activity of recentActivities) {
        const ageInDays = (now - activity.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.exp(-ageInDays / this.config.trendingWindow);
        score += decayFactor;
      }
      
      return score / this.config.trendingWindow;
    } catch (error) {
      console.error('Error calculating trending score:', error);
      return 0;
    }
  }

  /**
   * Record recommendation feedback
   */
  async recordFeedback(userId, recommendationId, action, rating = null) {
    try {
      await this.db.saveFeedback({
        user_id: userId,
        recommendation_id: recommendationId,
        item_type: 'scene', // Should be passed as parameter
        action,
        rating,
        timestamp: new Date()
      });
      
      // Update popularity rating if rated
      if (action === 'rated' && rating) {
        await this.updateRating(recommendationId, rating);
      }
      
      console.log('✓ Feedback recorded:', action, recommendationId);
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  }

  /**
   * Update item rating
   */
  async updateRating(itemId, rating) {
    try {
      const popularity = await this.db.getPopularity(itemId);
      
      if (!popularity) {
        return;
      }
      
      // Calculate new average rating
      const totalRating = popularity.average_rating * popularity.rating_count;
      popularity.rating_count++;
      popularity.average_rating = (totalRating + rating) / popularity.rating_count;
      
      await this.db.savePopularity(popularity);
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  }
}

module.exports = RecommendationEngine;

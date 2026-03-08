# Recommendation Engine Documentation

## Overview

An intelligent recommendation system that suggests scenes, templates, and story elements based on user history and global popularity trends. The engine combines collaborative filtering with content-based recommendations to provide personalized suggestions.

## Architecture

### Core Components

1. **RecommendationEngine** - Main engine with scoring algorithms
2. **DatabaseAdapter** - Data persistence layer
3. **Schemas** - Database schema definitions
4. **Examples** - Usage demonstrations

### Scoring Mechanism

The recommendation system uses a dual-scoring approach:

```
FinalScore = (0.6 × HistoryScore) + (0.4 × PopularityScore)
```

#### History Score Formula

```
HistoryScore = (0.4 × SimilarScenes) + (0.3 × SameGenre) + 
               (0.2 × SameCharacter) + (0.1 × SameLocation)
```

#### Popularity Score Formula

```
PopularityScore = (TotalUses / PlatformTotal) + 
                  (AverageRating / 5 × 0.2) + 
                  (TrendingScore × 0.1)
```

## Features

### ✅ User History Tracking

Tracks comprehensive user interactions:
- Scenes created
- Templates opened
- Characters selected
- Locations used
- Story genres explored

### ✅ Popularity Tracking

Maintains global metrics:
- Total usage count
- Unique user count
- Average ratings (1-5 scale)
- Trending scores
- Last used timestamps

### ✅ Intelligent Recommendations

- **History-Based**: Analyzes past user behavior
- **Popularity-Based**: Leverages platform-wide trends
- **Context-Aware**: Prioritizes relevant suggestions
- **Diversity Filter**: Avoids repetitive recommendations

### ✅ Cold Start Handling

For new users without history:
- Returns top trending items
- Most used templates
- Recently popular genres
- Platform-wide favorites

### ✅ Real-Time Updates

- Recommendations update after each action
- Immediate preference learning
- Dynamic score recalculation

### ✅ Feedback Loop

Tracks user interactions:
- Clicked recommendations
- Ignored suggestions
- User ratings
- Dismissals

## API Reference

### RecommendationEngine

#### `getRecommendations(userId, itemType, context)`

Get personalized recommendations for a user.

**Parameters:**
- `userId` (string): User identifier
- `itemType` (string): Type of items ('scene', 'template', 'character', 'location', 'genre')
- `context` (object): Optional context (currentGenre, currentScene, etc.)

**Returns:** Array of recommended items with scores

**Example:**
```javascript
const recommendations = await engine.getRecommendations(
  'user_123',
  'scene',
  { currentGenre: 'crime' }
);
```

#### `trackActivity(userId, activity)`

Track user activity for recommendation learning.

**Parameters:**
- `userId` (string): User identifier
- `activity` (object): Activity details
  - `action_type`: 'scene_created', 'template_opened', etc.
  - `item_id`: Item identifier
  - `item_type`: Type of item
  - `item_name`: Name of item
  - `metadata`: Additional context (genre, tags, etc.)
  - `session_id`: Session identifier

**Example:**
```javascript
await engine.trackActivity('user_123', {
  action_type: 'scene_created',
  item_id: 'scene_001',
  item_type: 'scene',
  item_name: 'Crime Investigation Scene',
  metadata: {
    genre: 'crime',
    category: 'investigation',
    tags: ['detective', 'evidence'],
    characters: ['detective'],
    location: 'crime_scene'
  },
  session_id: 'session_001'
});
```

#### `recordFeedback(userId, recommendationId, action, rating)`

Record user feedback on recommendations.

**Parameters:**
- `userId` (string): User identifier
- `recommendationId` (string): Recommended item ID
- `action` (string): 'clicked', 'ignored', 'dismissed', 'rated'
- `rating` (number): Optional rating (1-5)

**Example:**
```javascript
await engine.recordFeedback('user_123', 'scene_001', 'rated', 5);
```

## Database Schema

### User Activity

```javascript
{
  activity_id: PRIMARY KEY,
  user_id: FOREIGN KEY,
  action_type: ENUM,
  item_id: STRING,
  item_type: ENUM,
  item_name: STRING,
  metadata: JSON,
  session_id: STRING,
  timestamp: TIMESTAMP
}
```

### Popularity

```javascript
{
  item_id: PRIMARY KEY,
  item_type: ENUM,
  item_name: STRING,
  total_uses: INT,
  unique_users: INT,
  average_rating: DECIMAL,
  rating_count: INT,
  last_used: TIMESTAMP,
  trending_score: DECIMAL,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### User Preferences

```javascript
{
  user_id: PRIMARY KEY,
  favorite_genres: JSON ARRAY,
  favorite_characters: JSON ARRAY,
  favorite_locations: JSON ARRAY,
  scene_type_frequency: JSON OBJECT,
  last_activity: TIMESTAMP,
  total_activities: INT
}
```

### Recommendation Feedback

```javascript
{
  feedback_id: PRIMARY KEY,
  user_id: FOREIGN KEY,
  recommendation_id: STRING,
  item_type: ENUM,
  action: ENUM,
  rating: INT,
  timestamp: TIMESTAMP
}
```

## Usage Examples

### Example 1: New User (Cold Start)

```javascript
const engine = new RecommendationEngine(db);

// New user with no history
const recommendations = await engine.getRecommendations('new_user', 'scene');

// Returns trending items
console.log(recommendations);
// [
//   { item_name: 'Police Interrogation Room', finalScore: 0.928, reason: 'trending' },
//   { item_name: 'Action Chase Sequence', finalScore: 0.840, reason: 'trending' },
//   ...
// ]
```

### Example 2: User with History

```javascript
// Track user activity
await engine.trackActivity('user_123', {
  action_type: 'scene_created',
  item_id: 'scene_001',
  item_type: 'scene',
  item_name: 'Crime Investigation Scene',
  metadata: { genre: 'crime' }
});

// Get personalized recommendations
const recommendations = await engine.getRecommendations('user_123', 'scene');

// Returns crime-focused recommendations
console.log(recommendations);
// [
//   { item_name: 'Crime Evidence Room', historyScore: 0.820, finalScore: 0.639 },
//   { item_name: 'Police Interrogation Room', historyScore: 0.560, finalScore: 0.492 },
//   ...
// ]
```

### Example 3: Context-Aware Recommendations

```javascript
// User is currently working on a crime scene
const recommendations = await engine.getRecommendations(
  'user_123',
  'scene',
  { currentGenre: 'crime' }
);

// Returns crime-related scenes with 20% boost
```

### Example 4: Feedback Loop

```javascript
// User clicks on recommendation
await engine.recordFeedback('user_123', 'scene_001', 'clicked');

// User rates recommendation
await engine.recordFeedback('user_123', 'scene_002', 'rated', 5);

// User ignores recommendation
await engine.recordFeedback('user_123', 'scene_003', 'ignored');
```

## Configuration

### Scoring Weights

```javascript
weights: {
  history: {
    similarScenes: 0.4,    // 40% weight for similar scenes
    sameGenre: 0.3,        // 30% weight for genre match
    sameCharacter: 0.2,    // 20% weight for character match
    sameLocation: 0.1      // 10% weight for location match
  },
  final: {
    history: 0.6,          // 60% weight for history score
    popularity: 0.4        // 40% weight for popularity score
  }
}
```

### Engine Configuration

```javascript
config: {
  maxRecommendations: 10,      // Maximum recommendations to return
  minHistoryScore: 0.1,        // Minimum history score threshold
  diversityThreshold: 0.7,     // Diversity filter threshold
  trendingWindow: 7,           // Days for trending calculation
  coldStartCount: 10           // Items for cold start
}
```

## Algorithms

### Similarity Calculation

Calculates similarity between items based on metadata:

```javascript
similarity = (genreMatch + tagsOverlap + categoryMatch) / factors
```

### Trending Score

Time-decayed popularity metric:

```javascript
trendingScore = Σ(e^(-ageInDays / window)) / window
```

### Diversity Filter

Ensures variety in recommendations:
- Excludes recently used items (last 20)
- Limits items per genre (max 3)
- Promotes genre diversity

## Performance Optimization

### Indexes

- `user_id + timestamp` for activity queries
- `item_type + trending_score` for trending queries
- `item_type + total_uses` for popularity queries

### Caching Strategy

- Cache user preferences (5 min TTL)
- Cache popularity data (10 min TTL)
- Cache trending items (30 min TTL)

### Query Optimization

- Batch preference updates
- Async popularity calculations
- Lazy loading for metadata

## Best Practices

1. **Track All Interactions**: More data = better recommendations
2. **Update in Real-Time**: Immediate feedback improves accuracy
3. **Use Context**: Provide current context for better relevance
4. **Collect Feedback**: Track clicks, ratings, and dismissals
5. **Monitor Performance**: Track recommendation click-through rates
6. **A/B Testing**: Test different weight configurations
7. **Diversity**: Balance personalization with discovery

## Integration Example

```javascript
// Initialize
const db = new DatabaseAdapter();
const engine = new RecommendationEngine(db);

// Track user creating a scene
await engine.trackActivity(userId, {
  action_type: 'scene_created',
  item_id: sceneId,
  item_type: 'scene',
  item_name: sceneName,
  metadata: { genre, category, tags, characters, location },
  session_id: sessionId
});

// Get recommendations
const recommendations = await engine.getRecommendations(
  userId,
  'scene',
  { currentGenre: userCurrentGenre }
);

// Display recommendations to user
displayRecommendations(recommendations);

// Track user interaction
await engine.recordFeedback(userId, clickedItemId, 'clicked');
```

## Testing

Run examples:

```bash
node recommendation-engine/examples.js
```

Expected output:
- ✅ Cold start recommendations
- ✅ History-based recommendations
- ✅ Context-aware suggestions
- ✅ Diversity filtering
- ✅ Feedback loop
- ✅ Real-time updates

## Metrics to Track

1. **Click-Through Rate (CTR)**: % of recommendations clicked
2. **Conversion Rate**: % of clicks leading to usage
3. **Diversity Score**: Genre variety in recommendations
4. **Coverage**: % of catalog recommended
5. **Novelty**: % of new items recommended
6. **Serendipity**: Unexpected but relevant recommendations

## Future Enhancements

- [ ] Collaborative filtering (user-user similarity)
- [ ] Deep learning models for embeddings
- [ ] Multi-armed bandit for exploration/exploitation
- [ ] Session-based recommendations
- [ ] Real-time A/B testing framework
- [ ] Explainable recommendations
- [ ] Cross-domain recommendations
- [ ] Social recommendations (friends' activity)

## License

MIT License

## Support

For questions or issues, refer to examples.js for usage patterns.

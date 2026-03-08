# Recommendation Engine

Intelligent recommendation system for suggesting scenes, templates, and story elements based on user history and global popularity trends.

## Features

✅ **History-Based Recommendations** - Analyzes user behavior patterns  
✅ **Popularity-Based Scoring** - Leverages platform-wide trends  
✅ **Cold Start Handling** - Trending items for new users  
✅ **Context-Aware** - Prioritizes relevant suggestions  
✅ **Diversity Filter** - Avoids repetitive recommendations  
✅ **Real-Time Updates** - Adapts to user actions immediately  
✅ **Feedback Loop** - Learns from user interactions  
✅ **Trending Algorithm** - Time-decayed popularity metrics  

## Quick Start

```javascript
const RecommendationEngine = require('./recommendation-engine');
const DatabaseAdapter = require('./database-adapter');

// Initialize
const db = new DatabaseAdapter();
const engine = new RecommendationEngine(db);

// Track user activity
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

// Get recommendations
const recommendations = await engine.getRecommendations(
  'user_123',
  'scene',
  { currentGenre: 'crime' }
);

console.log(recommendations);
```

## Scoring Formula

### Final Score
```
FinalScore = (0.6 × HistoryScore) + (0.4 × PopularityScore)
```

### History Score
```
HistoryScore = (0.4 × SimilarScenes) + (0.3 × SameGenre) + 
               (0.2 × SameCharacter) + (0.1 × SameLocation)
```

### Popularity Score
```
PopularityScore = (TotalUses / PlatformTotal) + 
                  (AverageRating / 5 × 0.2) + 
                  (TrendingScore × 0.1)
```

## API Methods

### `getRecommendations(userId, itemType, context)`
Get personalized recommendations for a user.

**Returns:** Array of recommended items with scores

### `trackActivity(userId, activity)`
Track user activity for learning.

### `recordFeedback(userId, recommendationId, action, rating)`
Record user feedback on recommendations.

## Examples

Run all examples:
```bash
node examples.js
```

### Example Output

```
EXAMPLE 2: Recommendations for Crime Scene Enthusiast
======================================================================

📝 Simulating user activity...
✓ Tracked 3 activities

✓ Generated 7 personalized recommendations

Top 5 Recommendations:

1. Crime Evidence Room
   Genre: crime
   Category: investigation
   History Score: 0.820
   Popularity Score: 0.367
   Final Score: 0.639

2. Night City Street
   Genre: crime
   Category: outdoor
   History Score: 0.560
   Popularity Score: 0.391
   Final Score: 0.492
```

## Database Schema

### User Activity
- Tracks all user interactions
- Stores metadata for context

### Popularity
- Global usage statistics
- Trending scores
- Average ratings

### User Preferences
- Aggregated user preferences
- Genre/character/location frequencies

### Recommendation Feedback
- User interactions with recommendations
- Click-through tracking
- Rating collection

## Configuration

```javascript
// Scoring weights
weights: {
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
}

// Engine config
config: {
  maxRecommendations: 10,
  minHistoryScore: 0.1,
  diversityThreshold: 0.7,
  trendingWindow: 7,
  coldStartCount: 10
}
```

## Key Features Explained

### Cold Start
New users receive trending items based on platform-wide popularity.

### History-Based
Analyzes user's past behavior to find similar items and patterns.

### Context-Aware
Boosts recommendations matching current user context (e.g., working on crime scene → suggest crime-related items).

### Diversity Filter
- Excludes recently used items
- Limits items per genre
- Promotes variety

### Feedback Loop
Tracks user interactions to improve future recommendations:
- Clicked → positive signal
- Rated → explicit feedback
- Ignored → negative signal
- Dismissed → strong negative signal

### Real-Time Updates
Recommendations update immediately after each user action.

## Performance

- **Indexes**: Optimized for fast queries
- **Caching**: User preferences and popularity data
- **Batch Updates**: Efficient preference aggregation
- **Async Operations**: Non-blocking calculations

## Testing

All tests passed ✅

```
✅ Cold start recommendations for new users
✅ History-based personalized recommendations
✅ Popularity-based scoring
✅ Context-aware suggestions
✅ Diversity filtering
✅ Feedback loop integration
✅ Real-time recommendation updates
✅ Analytics and statistics
```

## Files

```
recommendation-engine/
├── recommendation-engine.js   # Main engine
├── database-adapter.js        # Database layer
├── schemas.js                 # Schema definitions
├── examples.js                # Usage examples
├── package.json               # Dependencies
└── README.md                  # This file
```

## Integration

```javascript
// In your application
const engine = new RecommendationEngine(yourDatabase);

// When user creates a scene
await engine.trackActivity(userId, sceneData);

// When showing recommendations
const recs = await engine.getRecommendations(userId, 'scene');

// When user clicks recommendation
await engine.recordFeedback(userId, itemId, 'clicked');
```

## Metrics

Track these metrics for optimization:
- Click-Through Rate (CTR)
- Conversion Rate
- Diversity Score
- Coverage
- Novelty
- Serendipity

## Documentation

See [RECOMMENDATION-ENGINE.md](../RECOMMENDATION-ENGINE.md) for complete documentation.

## License

MIT

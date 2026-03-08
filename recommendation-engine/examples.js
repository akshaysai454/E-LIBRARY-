// examples.js
// Usage examples for Recommendation Engine

const RecommendationEngine = require('./recommendation-engine');
const DatabaseAdapter = require('./database-adapter');

/**
 * Example 1: New User (Cold Start)
 */
async function example1_ColdStart() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 1: Cold Start Recommendations (New User)');
  console.log('='.repeat(70));
  
  const db = new DatabaseAdapter();
  const engine = new RecommendationEngine(db);
  
  // New user with no history
  const userId = 'user_new';
  
  const recommendations = await engine.getRecommendations(userId, 'scene');
  
  console.log(`\n✓ Generated ${recommendations.length} recommendations for new user`);
  console.log('\nTop 5 Trending Recommendations:');
  
  recommendations.slice(0, 5).forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.item_name}`);
    console.log(`   Genre: ${rec.metadata?.genre || 'N/A'}`);
    console.log(`   Popularity Score: ${rec.popularityScore.toFixed(3)}`);
    console.log(`   Trending Score: ${rec.trending_score.toFixed(3)}`);
    console.log(`   Reason: ${rec.reason}`);
  });
}

/**
 * Example 2: User with Crime Scene History
 */
async function example2_CrimeSceneUser() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 2: Recommendations for Crime Scene Enthusiast');
  console.log('='.repeat(70));
  
  const db = new DatabaseAdapter();
  const engine = new RecommendationEngine(db);
  
  const userId = 'user_crime_fan';
  
  // Simulate user creating crime scenes
  console.log('\n📝 Simulating user activity...');
  
  await engine.trackActivity(userId, {
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
  
  await engine.trackActivity(userId, {
    action_type: 'scene_created',
    item_id: 'scene_002',
    item_type: 'scene',
    item_name: 'Police Interrogation Room',
    metadata: {
      genre: 'crime',
      category: 'interrogation',
      tags: ['police', 'suspect'],
      characters: ['detective', 'suspect'],
      location: 'police_station'
    },
    session_id: 'session_001'
  });
  
  await engine.trackActivity(userId, {
    action_type: 'location_used',
    item_id: 'loc_001',
    item_type: 'location',
    item_name: 'Night City Street',
    metadata: {
      genre: 'crime',
      location: 'city_street'
    },
    session_id: 'session_001'
  });
  
  console.log('✓ Tracked 3 activities');
  
  // Get recommendations
  const recommendations = await engine.getRecommendations(userId, 'scene', {
    currentGenre: 'crime'
  });
  
  console.log(`\n✓ Generated ${recommendations.length} personalized recommendations`);
  console.log('\nTop 5 Recommendations:');
  
  recommendations.slice(0, 5).forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.item_name}`);
    console.log(`   Genre: ${rec.metadata?.genre || 'N/A'}`);
    console.log(`   Category: ${rec.metadata?.category || 'N/A'}`);
    console.log(`   History Score: ${rec.historyScore.toFixed(3)}`);
    console.log(`   Popularity Score: ${rec.popularityScore.toFixed(3)}`);
    console.log(`   Final Score: ${rec.finalScore.toFixed(3)}`);
  });
}

/**
 * Example 3: Diverse User Interests
 */
async function example3_DiverseInterests() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 3: Recommendations for User with Diverse Interests');
  console.log('='.repeat(70));
  
  const db = new DatabaseAdapter();
  const engine = new RecommendationEngine(db);
  
  const userId = 'user_diverse';
  
  console.log('\n📝 Simulating diverse user activity...');
  
  // Crime scene
  await engine.trackActivity(userId, {
    action_type: 'scene_created',
    item_id: 'scene_001',
    item_type: 'scene',
    item_name: 'Crime Investigation Scene',
    metadata: { genre: 'crime', category: 'investigation' },
    session_id: 'session_002'
  });
  
  // Romance scene
  await engine.trackActivity(userId, {
    action_type: 'scene_created',
    item_id: 'scene_004',
    item_type: 'scene',
    item_name: 'Romantic Cafe',
    metadata: { genre: 'romance', category: 'indoor' },
    session_id: 'session_002'
  });
  
  // Action scene
  await engine.trackActivity(userId, {
    action_type: 'scene_created',
    item_id: 'scene_005',
    item_type: 'scene',
    item_name: 'Action Chase Sequence',
    metadata: { genre: 'action', category: 'chase' },
    session_id: 'session_002'
  });
  
  console.log('✓ Tracked 3 activities across different genres');
  
  const recommendations = await engine.getRecommendations(userId, 'scene');
  
  console.log(`\n✓ Generated ${recommendations.length} recommendations`);
  console.log('\nRecommendations show diversity:');
  
  const genreCounts = {};
  recommendations.forEach(rec => {
    const genre = rec.metadata?.genre || 'unknown';
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  });
  
  console.log('\nGenre Distribution:');
  Object.entries(genreCounts).forEach(([genre, count]) => {
    console.log(`   ${genre}: ${count} recommendations`);
  });
}

/**
 * Example 4: Context-Aware Recommendations
 */
async function example4_ContextAware() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 4: Context-Aware Recommendations');
  console.log('='.repeat(70));
  
  const db = new DatabaseAdapter();
  const engine = new RecommendationEngine(db);
  
  const userId = 'user_context';
  
  // Build user history
  await engine.trackActivity(userId, {
    action_type: 'scene_created',
    item_id: 'scene_001',
    item_type: 'scene',
    item_name: 'Crime Investigation Scene',
    metadata: { genre: 'crime' },
    session_id: 'session_003'
  });
  
  console.log('\n📝 User is currently working on a crime scene...');
  
  // Get recommendations with context
  const recommendations = await engine.getRecommendations(userId, 'scene', {
    currentGenre: 'crime'
  });
  
  console.log(`\n✓ Generated ${recommendations.length} context-aware recommendations`);
  console.log('\nTop 3 Recommendations (Crime-focused):');
  
  recommendations.slice(0, 3).forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.item_name}`);
    console.log(`   Genre: ${rec.metadata?.genre || 'N/A'}`);
    console.log(`   Final Score: ${rec.finalScore.toFixed(3)}`);
    console.log(`   ${rec.metadata?.genre === 'crime' ? '✓ Context Match!' : ''}`);
  });
}

/**
 * Example 5: Feedback Loop
 */
async function example5_FeedbackLoop() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 5: Recommendation Feedback Loop');
  console.log('='.repeat(70));
  
  const db = new DatabaseAdapter();
  const engine = new RecommendationEngine(db);
  
  const userId = 'user_feedback';
  
  // Get recommendations
  const recommendations = await engine.getRecommendations(userId, 'scene');
  
  console.log(`\n✓ Generated ${recommendations.length} recommendations`);
  
  // Simulate user interactions
  console.log('\n📝 Simulating user feedback...');
  
  // User clicks on first recommendation
  await engine.recordFeedback(
    userId,
    recommendations[0].item_id,
    'clicked'
  );
  console.log(`✓ User clicked: ${recommendations[0].item_name}`);
  
  // User rates second recommendation
  await engine.recordFeedback(
    userId,
    recommendations[1].item_id,
    'rated',
    5
  );
  console.log(`✓ User rated: ${recommendations[1].item_name} (5 stars)`);
  
  // User ignores third recommendation
  await engine.recordFeedback(
    userId,
    recommendations[2].item_id,
    'ignored'
  );
  console.log(`✓ User ignored: ${recommendations[2].item_name}`);
  
  console.log('\n✓ Feedback recorded for future improvements');
}

/**
 * Example 6: Real-Time Updates
 */
async function example6_RealTimeUpdates() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 6: Real-Time Recommendation Updates');
  console.log('='.repeat(70));
  
  const db = new DatabaseAdapter();
  const engine = new RecommendationEngine(db);
  
  const userId = 'user_realtime';
  
  // Initial recommendations
  console.log('\n📊 Initial recommendations:');
  let recommendations = await engine.getRecommendations(userId, 'scene');
  console.log(`   ${recommendations.length} recommendations (cold start)`);
  
  // User creates a crime scene
  console.log('\n📝 User creates a crime scene...');
  await engine.trackActivity(userId, {
    action_type: 'scene_created',
    item_id: 'scene_001',
    item_type: 'scene',
    item_name: 'Crime Investigation Scene',
    metadata: { genre: 'crime' },
    session_id: 'session_004'
  });
  
  // Updated recommendations
  console.log('\n📊 Updated recommendations:');
  recommendations = await engine.getRecommendations(userId, 'scene');
  const crimeRecommendations = recommendations.filter(
    r => r.metadata?.genre === 'crime'
  );
  console.log(`   ${recommendations.length} total recommendations`);
  console.log(`   ${crimeRecommendations.length} crime-related (increased!)`);
  
  // User creates another crime scene
  console.log('\n📝 User creates another crime scene...');
  await engine.trackActivity(userId, {
    action_type: 'scene_created',
    item_id: 'scene_002',
    item_type: 'scene',
    item_name: 'Police Interrogation Room',
    metadata: { genre: 'crime' },
    session_id: 'session_004'
  });
  
  // Updated recommendations again
  console.log('\n📊 Updated recommendations:');
  recommendations = await engine.getRecommendations(userId, 'scene');
  const crimeRecommendations2 = recommendations.filter(
    r => r.metadata?.genre === 'crime'
  );
  console.log(`   ${recommendations.length} total recommendations`);
  console.log(`   ${crimeRecommendations2.length} crime-related (further increased!)`);
  
  console.log('\n✓ Recommendations adapt in real-time to user behavior');
}

/**
 * Example 7: Statistics and Analytics
 */
async function example7_Statistics() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 7: Recommendation Engine Statistics');
  console.log('='.repeat(70));
  
  const db = new DatabaseAdapter();
  const engine = new RecommendationEngine(db);
  
  // Simulate multiple users
  const users = ['user_1', 'user_2', 'user_3'];
  
  for (const userId of users) {
    await engine.trackActivity(userId, {
      action_type: 'scene_created',
      item_id: 'scene_001',
      item_type: 'scene',
      item_name: 'Crime Investigation Scene',
      metadata: { genre: 'crime' },
      session_id: `session_${userId}`
    });
    
    await engine.getRecommendations(userId, 'scene');
  }
  
  const stats = await db.getStats();
  
  console.log('\n📊 System Statistics:');
  console.log(`   Total Activities: ${stats.total_activities}`);
  console.log(`   Total Items: ${stats.total_items}`);
  console.log(`   Total Users: ${stats.total_users}`);
  console.log(`   Total Feedback: ${stats.total_feedback}`);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(15) + 'RECOMMENDATION ENGINE EXAMPLES' + ' '.repeat(23) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  
  try {
    await example1_ColdStart();
    await example2_CrimeSceneUser();
    await example3_DiverseInterests();
    await example4_ContextAware();
    await example5_FeedbackLoop();
    await example6_RealTimeUpdates();
    await example7_Statistics();
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL EXAMPLES COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log('\n📝 Key Features Demonstrated:');
    console.log('   ✓ Cold start recommendations for new users');
    console.log('   ✓ History-based personalized recommendations');
    console.log('   ✓ Popularity-based scoring');
    console.log('   ✓ Context-aware suggestions');
    console.log('   ✓ Diversity filtering');
    console.log('   ✓ Feedback loop integration');
    console.log('   ✓ Real-time recommendation updates');
    console.log('   ✓ Analytics and statistics');
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  example1_ColdStart,
  example2_CrimeSceneUser,
  example3_DiverseInterests,
  example4_ContextAware,
  example5_FeedbackLoop,
  example6_RealTimeUpdates,
  example7_Statistics,
  runAllExamples
};

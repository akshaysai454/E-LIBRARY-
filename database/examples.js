// examples.js
// Usage examples for Database Management System

/**
 * MONGODB EXAMPLES
 */

async function mongoDBExamples() {
  const MongoDBManager = require('./mongodb-manager');
  
  // Initialize manager
  const dbManager = new MongoDBManager('mongodb://localhost:27017/userdb');
  
  try {
    // Connect to database
    await dbManager.connect();
    
    // Example 1: Register new user
    console.log('\n=== Example 1: Register User ===');
    const newUser = await dbManager.registerUser(
      {
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        status: 'active'
      },
      {
        full_name: 'John Doe',
        bio: 'Software developer and tech enthusiast',
        zone: 'technology'
      }
    );
    console.log('Registered:', newUser);
    
    // Example 2: Authenticate user
    console.log('\n=== Example 2: Authenticate User ===');
    const authenticatedUser = await dbManager.authenticateUser(
      'john.doe@example.com',
      'SecurePass123!'
    );
    console.log('Authenticated:', authenticatedUser);
    
    // Example 3: Get user with profile
    console.log('\n=== Example 3: Get User with Profile ===');
    const userWithProfile = await dbManager.getUserWithProfile(newUser.user._id);
    console.log('User with profile:', userWithProfile);
    
    // Example 4: Update profile
    console.log('\n=== Example 4: Update Profile ===');
    const updatedProfile = await dbManager.updateProfile(
      newUser.user._id,
      {
        bio: 'Updated bio: Full-stack developer',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    );
    console.log('Updated profile:', updatedProfile);
    
    // Example 5: Change password
    console.log('\n=== Example 5: Change Password ===');
    await dbManager.changePassword(
      newUser.user._id,
      'SecurePass123!',
      'NewSecurePass456!'
    );
    console.log('Password changed successfully');
    
    // Example 6: Update user status
    console.log('\n=== Example 6: Update User Status ===');
    await dbManager.updateUserStatus(newUser.user._id, 'inactive');
    console.log('User status updated to inactive');
    
    // Example 7: Search by zone
    console.log('\n=== Example 7: Search by Zone ===');
    const techUsers = await dbManager.getUsersByZone('technology');
    console.log('Technology zone users:', techUsers.length);
    
    // Example 8: Get statistics
    console.log('\n=== Example 8: Database Statistics ===');
    const stats = await dbManager.getStats();
    console.log('Stats:', stats);
    
    // Example 9: Soft delete user
    console.log('\n=== Example 9: Soft Delete User ===');
    await dbManager.deleteUser(newUser.user._id, true);
    console.log('User soft deleted');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * MYSQL EXAMPLES
 */

async function mySQLExamples() {
  const MySQLManager = require('./mysql-manager');
  
  // Initialize manager
  const dbManager = new MySQLManager({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'userdb'
  });
  
  try {
    // Connect to database
    await dbManager.connect();
    
    // Initialize schema
    await dbManager.initializeSchema();
    
    // Example 1: Register new user
    console.log('\n=== Example 1: Register User ===');
    const newUser = await dbManager.registerUser(
      {
        email: 'jane.smith@example.com',
        password: 'SecurePass123!',
        status: 'active'
      },
      {
        full_name: 'Jane Smith',
        bio: 'Data scientist and AI researcher',
        zone: 'data-science'
      }
    );
    console.log('Registered:', newUser);
    
    // Example 2: Authenticate user
    console.log('\n=== Example 2: Authenticate User ===');
    const authenticatedUser = await dbManager.authenticateUser(
      'jane.smith@example.com',
      'SecurePass123!'
    );
    console.log('Authenticated:', authenticatedUser);
    
    // Example 3: Get user with profile
    console.log('\n=== Example 3: Get User with Profile ===');
    const userWithProfile = await dbManager.getUserWithProfile(newUser.user.user_id);
    console.log('User with profile:', userWithProfile);
    
    // Example 4: Update profile
    console.log('\n=== Example 4: Update Profile ===');
    const updatedProfile = await dbManager.updateProfile(
      newUser.user.user_id,
      {
        bio: 'Updated bio: Senior Data Scientist',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    );
    console.log('Updated profile:', updatedProfile);
    
    // Example 5: Change password
    console.log('\n=== Example 5: Change Password ===');
    await dbManager.changePassword(
      newUser.user.user_id,
      'SecurePass123!',
      'NewSecurePass456!'
    );
    console.log('Password changed successfully');
    
    // Example 6: Update user status
    console.log('\n=== Example 6: Update User Status ===');
    await dbManager.updateUserStatus(newUser.user.user_id, 'suspended');
    console.log('User status updated to suspended');
    
    // Example 7: Search by zone
    console.log('\n=== Example 7: Search by Zone ===');
    const dataScienceUsers = await dbManager.getUsersByZone('data-science');
    console.log('Data science zone users:', dataScienceUsers.length);
    
    // Example 8: Get active users
    console.log('\n=== Example 8: Get Active Users ===');
    const activeUsers = await dbManager.getActiveUsers(10, 0);
    console.log('Active users:', activeUsers.length);
    
    // Example 9: Get statistics
    console.log('\n=== Example 9: Database Statistics ===');
    const stats = await dbManager.getStats();
    console.log('Stats:', stats);
    
    // Example 10: Hard delete user
    console.log('\n=== Example 10: Hard Delete User ===');
    await dbManager.deleteUser(newUser.user.user_id, false);
    console.log('User hard deleted (profile cascade deleted)');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * VALIDATION EXAMPLES
 */

function validationExamples() {
  const { Validator, ValidationRules } = require('./schemas');
  
  console.log('\n=== Validation Examples ===');
  
  // Example 1: Valid user data
  console.log('\n1. Valid user data:');
  const validUser = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    status: 'active'
  };
  const userValidation = Validator.validateUser(validUser);
  console.log('Valid:', userValidation.valid);
  
  // Example 2: Invalid email
  console.log('\n2. Invalid email:');
  const invalidEmail = {
    email: 'invalid-email',
    password: 'SecurePass123!'
  };
  const emailValidation = Validator.validateUser(invalidEmail);
  console.log('Valid:', emailValidation.valid);
  console.log('Errors:', emailValidation.errors);
  
  // Example 3: Weak password
  console.log('\n3. Weak password:');
  const weakPassword = {
    email: 'test@example.com',
    password: 'weak'
  };
  const passwordValidation = Validator.validateUser(weakPassword);
  console.log('Valid:', passwordValidation.valid);
  console.log('Errors:', passwordValidation.errors);
  
  // Example 4: Valid profile data
  console.log('\n4. Valid profile data:');
  const validProfile = {
    full_name: 'John Doe',
    bio: 'Software developer',
    zone: 'technology'
  };
  const profileValidation = Validator.validateProfile(validProfile);
  console.log('Valid:', profileValidation.valid);
  
  // Example 5: Normalize data
  console.log('\n5. Data normalization:');
  const unnormalizedData = {
    email: '  TEST@EXAMPLE.COM  ',
    full_name: '  John Doe  ',
    zone: '  TECHNOLOGY  '
  };
  const normalized = Validator.normalize(unnormalizedData, ValidationRules);
  console.log('Normalized:', normalized);
}

/**
 * SECURITY EXAMPLES
 */

async function securityExamples() {
  const bcrypt = require('bcrypt');
  
  console.log('\n=== Security Examples ===');
  
  // Example 1: Password hashing
  console.log('\n1. Password hashing:');
  const password = 'SecurePass123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Original:', password);
  console.log('Hashed:', hash);
  
  // Example 2: Password comparison
  console.log('\n2. Password comparison:');
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Passwords match:', isMatch);
  
  const wrongPassword = 'WrongPass123!';
  const isWrongMatch = await bcrypt.compare(wrongPassword, hash);
  console.log('Wrong password match:', isWrongMatch);
}

/**
 * ERROR HANDLING EXAMPLES
 */

async function errorHandlingExamples() {
  const MongoDBManager = require('./mongodb-manager');
  const dbManager = new MongoDBManager('mongodb://localhost:27017/userdb');
  
  console.log('\n=== Error Handling Examples ===');
  
  try {
    await dbManager.connect();
    
    // Example 1: Duplicate email
    console.log('\n1. Duplicate email error:');
    try {
      await dbManager.registerUser(
        { email: 'duplicate@example.com', password: 'Pass123!' },
        { full_name: 'User 1', zone: 'general' }
      );
      
      await dbManager.registerUser(
        { email: 'duplicate@example.com', password: 'Pass123!' },
        { full_name: 'User 2', zone: 'general' }
      );
    } catch (error) {
      console.log('Error caught:', error.message);
    }
    
    // Example 2: Invalid credentials
    console.log('\n2. Invalid credentials error:');
    try {
      await dbManager.authenticateUser('nonexistent@example.com', 'password');
    } catch (error) {
      console.log('Error caught:', error.message);
    }
    
    // Example 3: Update inactive user profile
    console.log('\n3. Update inactive user profile:');
    try {
      const user = await dbManager.registerUser(
        { email: 'inactive@example.com', password: 'Pass123!' },
        { full_name: 'Inactive User', zone: 'general' }
      );
      
      await dbManager.updateUserStatus(user.user._id, 'inactive');
      await dbManager.updateProfile(user.user._id, { bio: 'New bio' });
    } catch (error) {
      console.log('Error caught:', error.message);
    }
    
  } catch (error) {
    console.error('Setup error:', error.message);
  } finally {
    await dbManager.disconnect();
  }
}

// Run examples
if (require.main === module) {
  console.log('Database Management System Examples\n');
  console.log('Choose an example to run:');
  console.log('1. MongoDB Examples');
  console.log('2. MySQL Examples');
  console.log('3. Validation Examples');
  console.log('4. Security Examples');
  console.log('5. Error Handling Examples');
  
  // Uncomment to run specific examples
  // mongoDBExamples();
  // mySQLExamples();
  // validationExamples();
  // securityExamples();
  // errorHandlingExamples();
}

module.exports = {
  mongoDBExamples,
  mySQLExamples,
  validationExamples,
  securityExamples,
  errorHandlingExamples
};

# Database Management System

A production-ready database management system supporting both MongoDB (NoSQL) and MySQL (Relational) with comprehensive validation, security, and logical data handling.

## Features

✅ **Dual Database Support** - MongoDB and MySQL implementations  
✅ **Automatic Profile Creation** - Profile created automatically on user registration  
✅ **One-to-One Relationships** - User ↔ Profile with referential integrity  
✅ **Cascade Delete** - Soft delete (inactive status) or hard delete (remove from DB)  
✅ **Password Security** - bcrypt hashing with salt  
✅ **Input Validation** - Email, password strength, field length validation  
✅ **Data Normalization** - Automatic trimming, lowercase conversion  
✅ **Status Management** - Active/Inactive/Suspended user states  
✅ **Zone Classification** - Categorize users by region/category  
✅ **Efficient Queries** - Optimized with indexes and JOINs  
✅ **Transaction Support** - ACID compliance for multi-table operations  
✅ **Error Handling** - Comprehensive error messages and logging  

## Quick Start

### Installation

```bash
cd database
npm install
```

### MongoDB Usage

```javascript
const MongoDBManager = require('./mongodb-manager');

const dbManager = new MongoDBManager('mongodb://localhost:27017/userdb');
await dbManager.connect();

// Register user
const user = await dbManager.registerUser(
  {
    email: 'john@example.com',
    password: 'SecurePass123!',
    status: 'active'
  },
  {
    full_name: 'John Doe',
    bio: 'Software developer',
    zone: 'technology'
  }
);

// Authenticate
const authenticated = await dbManager.authenticateUser(
  'john@example.com',
  'SecurePass123!'
);

// Get user with profile
const userWithProfile = await dbManager.getUserWithProfile(user.user._id);

await dbManager.disconnect();
```

### MySQL Usage

```javascript
const MySQLManager = require('./mysql-manager');

const dbManager = new MySQLManager({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'userdb'
});

await dbManager.connect();
await dbManager.initializeSchema();

// Same API as MongoDB
const user = await dbManager.registerUser(userData, profileData);

await dbManager.disconnect();
```

## Schema Design

### Users Table/Collection

| Field | Type | Constraints |
|-------|------|-------------|
| user_id / _id | INT / ObjectId | Primary Key |
| email | VARCHAR(255) / String | Unique, Indexed, Validated |
| password_hash | VARCHAR(255) / String | Never exposed |
| status | ENUM / String | active/inactive/suspended |
| created_at | TIMESTAMP / Date | Auto-generated |
| updated_at | TIMESTAMP / Date | Auto-updated |

### Profiles Table/Collection

| Field | Type | Constraints |
|-------|------|-------------|
| profile_id / _id | INT / ObjectId | Primary Key |
| user_id | INT / ObjectId | Foreign Key, Unique |
| full_name | VARCHAR(100) / String | Required, 2-100 chars |
| bio | TEXT / String | Optional, max 500 chars |
| avatar_url | VARCHAR(500) / String | Optional, validated URL |
| zone | VARCHAR(50) / String | Required, indexed |
| created_at | TIMESTAMP / Date | Auto-generated |
| updated_at | TIMESTAMP / Date | Auto-updated |

## API Methods

### User Management

- `registerUser(userData, profileData)` - Register new user with profile
- `authenticateUser(email, password)` - Authenticate user
- `getUserWithProfile(userId)` - Get user and profile
- `getUserByEmail(email)` - Get user by email
- `updateUserStatus(userId, status)` - Update user status
- `changePassword(userId, oldPassword, newPassword)` - Change password
- `deleteUser(userId, softDelete)` - Delete user (soft/hard)

### Profile Management

- `updateProfile(userId, updates)` - Update profile
- `getUsersByZone(zone)` - Get users by zone
- `getActiveUsers(limit, skip)` - Get active users with pagination

### Statistics

- `getStats()` - Get database statistics

## Validation Rules

### Email
- Required
- Valid email format
- Unique
- Normalized to lowercase

### Password
- Required
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character
- Hashed with bcrypt (10 salt rounds)

### Full Name
- Required
- 2-100 characters
- Trimmed whitespace

### Bio
- Optional
- Maximum 500 characters

### Avatar URL
- Optional
- Valid HTTP/HTTPS URL

### Zone
- Required
- Normalized to lowercase
- Default: 'general'

## Security Features

1. **Password Hashing** - bcrypt with salt
2. **SQL Injection Prevention** - Parameterized queries
3. **Sensitive Data Protection** - password_hash never exposed
4. **Status-Based Access Control** - Only active users can update profiles
5. **Input Validation** - All inputs validated before storage
6. **Transaction Support** - Atomic operations for data integrity

## Logical Workflows

### User Registration Flow

1. Validate user data (email, password)
2. Validate profile data (full_name, bio, zone)
3. Normalize inputs (trim, lowercase)
4. Check for duplicate email
5. Hash password
6. Start transaction
7. Create user record
8. Create profile record (automatic)
9. Commit transaction
10. Return user and profile

### Authentication Flow

1. Normalize email (lowercase)
2. Find user by email
3. Check user status (must be active)
4. Compare password with hash
5. Return user (without password)

### Profile Update Flow

1. Check user exists
2. Check user status (must be active)
3. Validate update data
4. Normalize inputs
5. Update profile
6. Update timestamp
7. Return updated profile

### Cascade Delete Flow

**Soft Delete:**
1. Set user status to 'inactive'
2. Profile remains but cannot be updated

**Hard Delete:**
1. Delete user record
2. Profile automatically deleted (CASCADE)

## Error Handling

All methods throw descriptive errors:

- `Email already exists` - Duplicate email
- `Invalid credentials` - Wrong email/password
- `Account is not active` - User status not active
- `User not found` - User doesn't exist
- `Cannot update profile for inactive user` - Status check failed
- `Validation failed: ...` - Input validation errors

## Performance Optimization

### Indexes

**MongoDB:**
```javascript
{ email: 1, status: 1 }
{ user_id: 1, zone: 1 }
```

**MySQL:**
```sql
INDEX idx_email (email)
INDEX idx_status (status)
INDEX idx_user_id (user_id)
INDEX idx_zone (zone)
```

### Connection Pooling

MySQL uses connection pooling (10 connections) for better performance.

### Query Optimization

- JOIN queries for user+profile retrieval
- Indexed fields for fast lookups
- Pagination support for large datasets

## Examples

Run all examples:
```bash
npm test
```

Run specific examples:
```bash
npm run mongodb-example
npm run mysql-example
npm run validation-example
npm run security-example
```

## File Structure

```
database/
├── schemas.js              # Schema definitions and validation
├── mongodb-manager.js      # MongoDB implementation
├── mysql-manager.js        # MySQL implementation
├── examples.js             # Usage examples
├── package.json            # Dependencies
└── README.md              # This file
```

## Dependencies

- `mongoose` - MongoDB ODM
- `mysql2` - MySQL client with promises
- `bcrypt` - Password hashing

## Requirements

- Node.js >= 14.0.0
- MongoDB >= 4.0 (for MongoDB implementation)
- MySQL >= 5.7 (for MySQL implementation)

## License

MIT

## Documentation

See [DATABASE-ARCHITECTURE.md](../DATABASE-ARCHITECTURE.md) for complete documentation.

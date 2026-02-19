# Database Management System Architecture

## Overview

A production-ready database management system supporting both MongoDB (NoSQL) and MySQL (Relational) with comprehensive validation, security, and logical data handling.

## Table of Contents

1. [Schema Design](#schema-design)
2. [Relationship Logic](#relationship-logic)
3. [Logical Data Handling](#logical-data-handling)
4. [Validation Layer](#validation-layer)
5. [Security Logic](#security-logic)
6. [Query & Access Logic](#query--access-logic)
7. [API Reference](#api-reference)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)

---

## Schema Design

### Users Schema

**MongoDB (Mongoose)**
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed, lowercase, validated),
  password_hash: String (never returned in queries),
  status: String (enum: 'active', 'inactive', 'suspended'),
  created_at: Date (immutable),
  updated_at: Date (auto-updated)
}
```

**MySQL**
```sql
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
);
```

### Profiles Schema

**MongoDB (Mongoose)**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: 'User', unique, indexed),
  full_name: String (required, 2-100 chars),
  bio: String (optional, max 500 chars),
  avatar_url: String (optional, validated URL),
  zone: String (required, lowercase, indexed),
  created_at: Date (immutable),
  updated_at: Date (auto-updated)
}
```

**MySQL**
```sql
CREATE TABLE profiles (
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
  INDEX idx_zone (zone)
);
```

---

## Relationship Logic

### One-to-One Relationship

- Each User has exactly one Profile
- Each Profile belongs to exactly one User

### Referential Integrity

**MongoDB**
- Profile references User via `user_id` (ObjectId)
- Pre-save middleware validates User exists
- Pre-remove hook on User cascades delete to Profile

**MySQL**
- Foreign key constraint: `FOREIGN KEY (user_id) REFERENCES users(user_id)`
- `ON DELETE CASCADE` automatically deletes Profile when User is deleted
- Unique constraint on `user_id` ensures one-to-one relationship

### Cascade Delete

**Hard Delete**
- Deleting a User automatically deletes associated Profile
- MongoDB: Pre-remove hook
- MySQL: ON DELETE CASCADE

**Soft Delete**
- Sets User status to 'inactive'
- Profile remains but cannot be updated
- Preserves data for audit/recovery

---

## Logical Data Handling

### Automatic Profile Creation

When a User is registered, a Profile is automatically created in the same transaction:

```javascript
// MongoDB
await dbManager.registerUser(
  { email, password, status },
  { full_name, bio, zone }
);

// MySQL
CALL register_user(email, password_hash, full_name, zone);
```

### Duplicate Prevention

- Email uniqueness enforced at database level
- Unique index on `email` field
- Registration fails with clear error message

### Conditional Logic

**Profile Updates**
- Only allowed if User status is 'active'
- MongoDB: Pre-save middleware checks User status
- MySQL: BEFORE UPDATE trigger validates status

**Default Values**
- Missing `zone` → defaults to 'general'
- Missing `bio` → defaults to empty string
- Missing `avatar_url` → defaults to null
- Missing `status` → defaults to 'active'

---

## Validation Layer

### Email Validation

```javascript
{
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  normalize: (value) => value.toLowerCase().trim()
}
```

### Password Validation

```javascript
{
  required: true,
  minLength: 8,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
  message: 'Must contain uppercase, lowercase, number, and special character'
}
```

### Full Name Validation

```javascript
{
  required: true,
  minLength: 2,
  maxLength: 100,
  normalize: (value) => value.trim()
}
```

### Bio Validation

```javascript
{
  required: false,
  maxLength: 500,
  normalize: (value) => value ? value.trim() : ''
}
```

### Avatar URL Validation

```javascript
{
  required: false,
  pattern: /^https?:\/\/.+/,
  normalize: (value) => value ? value.trim() : null
}
```

### Zone Validation

```javascript
{
  required: true,
  normalize: (value) => value ? value.toLowerCase().trim() : 'general'
}
```

### Input Normalization

All inputs are normalized before storage:
- Strings: trimmed whitespace
- Email: lowercase
- Zone: lowercase
- Empty optional fields: null or empty string

---

## Security Logic

### Password Hashing

**bcrypt with salt rounds**
```javascript
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);
```

- Passwords never stored in plain text
- Salt rounds: 10 (configurable)
- One-way hashing (cannot be reversed)

### Password Comparison

```javascript
const isMatch = await bcrypt.compare(candidatePassword, storedHash);
```

### Sensitive Field Protection

**MongoDB**
```javascript
password_hash: {
  type: String,
  select: false  // Never returned in queries
}
```

**API Response**
```javascript
user.toSafeObject()  // Removes password_hash
```

### Role/Status Checks

- Profile updates require User status = 'active'
- Authentication requires User status = 'active'
- Status changes logged and auditable

### SQL Injection Prevention

- Parameterized queries (prepared statements)
- No string concatenation in SQL
- Input validation before database operations

---

## Query & Access Logic

### Efficient Queries

**Get User with Profile (JOIN)**

MongoDB:
```javascript
const user = await User.findById(userId);
const profile = await Profile.findOne({ user_id: userId });
```

MySQL:
```sql
SELECT u.*, p.*
FROM users u
LEFT JOIN profiles p ON u.user_id = p.user_id
WHERE u.user_id = ?
```

**Search by Zone**

MongoDB:
```javascript
Profile.find({ zone: 'technology' }).populate('user_id')
```

MySQL:
```sql
SELECT u.*, p.*
FROM users u
INNER JOIN profiles p ON u.user_id = p.user_id
WHERE p.zone = ?
```

### Indexing Strategy

**MongoDB Indexes**
```javascript
UserSchema.index({ email: 1, status: 1 });
ProfileSchema.index({ user_id: 1, zone: 1 });
```

**MySQL Indexes**
```sql
INDEX idx_email (email)
INDEX idx_status (status)
INDEX idx_email_status (email, status)
INDEX idx_user_id (user_id)
INDEX idx_zone (zone)
INDEX idx_user_zone (user_id, zone)
```

### Pagination

```javascript
// MongoDB
await User.find({ status: 'active' })
  .limit(limit)
  .skip(skip)
  .sort({ created_at: -1 });

// MySQL
SELECT * FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT ? OFFSET ?
```

---

## API Reference

### MongoDBManager

#### `connect()`
Connect to MongoDB database.

#### `registerUser(userData, profileData)`
Register new user with automatic profile creation.

**Parameters:**
- `userData`: { email, password, status }
- `profileData`: { full_name, bio, avatar_url, zone }

**Returns:** { user, profile }

#### `authenticateUser(email, password)`
Authenticate user with email and password.

**Returns:** User object (without password)

#### `getUserWithProfile(userId)`
Get user and profile by user ID.

**Returns:** { user, profile }

#### `getUserByEmail(email)`
Get user and profile by email.

**Returns:** { user, profile }

#### `updateProfile(userId, updates)`
Update user profile.

**Parameters:**
- `userId`: User ID
- `updates`: { full_name, bio, avatar_url, zone }

**Returns:** Updated profile

#### `updateUserStatus(userId, status)`
Update user status (active/inactive/suspended).

**Returns:** Updated user

#### `changePassword(userId, oldPassword, newPassword)`
Change user password.

**Returns:** boolean

#### `deleteUser(userId, softDelete)`
Delete user (soft or hard delete).

**Parameters:**
- `softDelete`: true (set inactive) or false (remove from DB)

**Returns:** boolean

#### `getUsersByZone(zone)`
Get all users in a specific zone.

**Returns:** Array of { user, profile }

#### `getActiveUsers(limit, skip)`
Get active users with pagination.

**Returns:** Array of { user, profile }

#### `getStats()`
Get database statistics.

**Returns:** { users, profiles, zones }

### MySQLManager

Same methods as MongoDBManager with MySQL implementation.

Additional method:

#### `initializeSchema()`
Create database tables and triggers.

---

## Usage Examples

### Register User

```javascript
const dbManager = new MongoDBManager('mongodb://localhost:27017/userdb');
await dbManager.connect();

const result = await dbManager.registerUser(
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

console.log('User registered:', result);
```

### Authenticate User

```javascript
const user = await dbManager.authenticateUser(
  'john@example.com',
  'SecurePass123!'
);

console.log('Authenticated:', user);
```

### Update Profile

```javascript
const profile = await dbManager.updateProfile(
  userId,
  {
    bio: 'Senior Software Developer',
    avatar_url: 'https://example.com/avatar.jpg'
  }
);

console.log('Profile updated:', profile);
```

### Change Password

```javascript
await dbManager.changePassword(
  userId,
  'SecurePass123!',
  'NewSecurePass456!'
);

console.log('Password changed');
```

### Search by Zone

```javascript
const techUsers = await dbManager.getUsersByZone('technology');
console.log('Technology users:', techUsers.length);
```

### Get Statistics

```javascript
const stats = await dbManager.getStats();
console.log('Database stats:', stats);
```

---

## Best Practices

### Security

1. **Always hash passwords** before storage
2. **Never expose password_hash** in API responses
3. **Use parameterized queries** to prevent SQL injection
4. **Validate all inputs** before database operations
5. **Implement rate limiting** for authentication attempts
6. **Use HTTPS** for all API communications

### Data Integrity

1. **Use transactions** for multi-table operations
2. **Validate foreign key relationships** before operations
3. **Implement soft deletes** for audit trails
4. **Normalize data** before storage
5. **Use unique constraints** to prevent duplicates

### Performance

1. **Create indexes** on frequently queried fields
2. **Use pagination** for large result sets
3. **Implement caching** for frequently accessed data
4. **Optimize JOIN queries** with proper indexes
5. **Monitor query performance** and optimize slow queries

### Scalability

1. **Design schemas** for future extensions
2. **Use connection pooling** for database connections
3. **Implement horizontal scaling** strategies
4. **Separate read and write operations** when needed
5. **Use database replication** for high availability

### Error Handling

1. **Catch and log all errors** with context
2. **Return user-friendly error messages**
3. **Implement retry logic** for transient failures
4. **Use proper HTTP status codes** in APIs
5. **Monitor error rates** and set up alerts

---

## Installation

### Dependencies

```bash
npm install mongoose mysql2 bcrypt
```

### MongoDB Setup

```bash
# Install MongoDB
# Start MongoDB service
mongod --dbpath /path/to/data

# Connect
mongo
use userdb
```

### MySQL Setup

```bash
# Install MySQL
# Start MySQL service
mysql -u root -p

# Create database
CREATE DATABASE userdb;
USE userdb;
```

---

## Testing

Run examples:

```bash
node database/examples.js
```

Run specific example:

```javascript
const { mongoDBExamples } = require('./database/examples');
mongoDBExamples();
```

---

## License

MIT License

---

## Support

For issues or questions, refer to the examples and API documentation.

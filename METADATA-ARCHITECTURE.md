# Metadata Architecture System

## Overview

A robust, logic-driven metadata management system that creates, validates, and manages structured metadata with automatic processing, validation, and error handling.

## Architecture Components

### 1. Metadata Schema (`MetadataSchema`)

Defines the structure, types, and validation rules for all metadata fields.

```javascript
{
  fieldName: {
    type: 'string' | 'array' | ['string', 'array'],
    required: true | false,
    validate: (value) => boolean,
    default: value | function,
    normalize: (value) => normalizedValue,
    infer: (context) => inferredValue
  }
}
```

#### Core Fields

- **title** (string, required)
  - Document or content title
  - Auto-defaults to "Untitled Document"
  - Normalized: trimmed whitespace

- **author** (string | array, required)
  - Single author or multiple authors
  - Auto-converts to array for multiple authors
  - Deduplicates author names
  - Auto-defaults to "Unknown Author"

- **zone** (string, required)
  - Categorical classification or region tag
  - Can be inferred from context
  - Normalized to lowercase
  - Auto-defaults to "general"

- **created_at** (string, optional)
  - ISO 8601 timestamp
  - Auto-generated on creation

- **updated_at** (string, optional)
  - ISO 8601 timestamp
  - Auto-updated on modification

- **version** (string, optional)
  - Semantic versioning (X.Y.Z)
  - Validated against semver pattern
  - Auto-defaults to "1.0.0"

### 2. MetadataProcessor Class

Core processing engine for metadata operations.

#### Key Methods

**`createMetadata(input, context)`**
- Creates metadata from raw input
- Applies logical processing rules
- Handles missing values with defaults
- Performs inference when possible
- Returns processed metadata object

**`processField(fieldName, value, rules, context)`**
- Processes individual fields
- Validates types
- Normalizes values
- Applies custom validation

**`validate(metadata)`**
- Validates existing metadata against schema
- Returns validation result with errors/warnings
- Checks required fields
- Validates data types

**`normalize(metadata)`**
- Normalizes all fields in metadata
- Applies field-specific normalization rules
- Returns normalized metadata object

### 3. MetadataManager Class

High-level manager for metadata operations.

#### Key Methods

**`addMetadata(input, context)`**
- Creates and adds new metadata entry
- Validates before adding
- Throws error if validation fails

**`updateMetadata(index, updates)`**
- Updates existing metadata entry
- Auto-updates `updated_at` timestamp
- Validates after update

**`deduplicate()`**
- Removes duplicate entries
- Based on title and author combination

**`exportJSON(pretty)`**
- Exports metadata to JSON string
- Optional pretty formatting

**`importJSON(jsonString)`**
- Imports metadata from JSON string
- Validates each entry
- Returns success/failure status

**`search(field, value)`**
- Searches metadata by field value
- Supports array field matching

**`getByZone(zone)`**
- Retrieves all metadata for specific zone

## Logical Processing Features

### 1. Automatic Type Handling

```javascript
// Single author → string
{ author: "John Doe" }

// Multiple authors → array (auto-converted)
{ author: ["John Doe", "Jane Smith"] }
```

### 2. Zone Inference

```javascript
// Missing zone, but context provided
const metadata = manager.addMetadata(
  { title: "ML Guide", author: "Alice" },
  { category: "AI-Research" }
);
// Result: zone = "ai-research"
```

### 3. Default Value Application

```javascript
// Missing required fields
const metadata = manager.addMetadata({
  title: "Quick Notes"
  // author and zone missing
});
// Result: 
// - author = "Unknown Author"
// - zone = "general"
// - created_at = current timestamp
// - version = "1.0.0"
```

### 4. Data Normalization

```javascript
// Input
{ 
  title: "  JavaScript Guide  ",
  author: ["Alice", "Bob", "Alice"],
  zone: "PROGRAMMING"
}

// Normalized Output
{
  title: "JavaScript Guide",
  author: ["Alice", "Bob"], // deduplicated
  zone: "programming" // lowercase
}
```

### 5. Validation with Fallbacks

```javascript
// Invalid data with fallback
{
  title: "",  // Empty → uses default
  version: "invalid" // Invalid format → uses default
}
```

## Error Handling

### Validation Errors

```javascript
const validation = processor.validate(metadata);
if (!validation.valid) {
  console.log(validation.errors);
  // [{ field: 'title', message: 'Required field is missing' }]
}
```

### Processing Warnings

```javascript
const metadata = processor.createMetadata(input);
const warnings = processor.getWarnings();
// [{ field: 'zone', message: 'Value inferred from context' }]
```

### Error Recovery

- Missing required fields → Apply defaults
- Invalid types → Use fallback values
- Validation failures → Log warnings and continue
- Import errors → Validate each entry individually

## Usage Examples

### Basic Creation

```javascript
const manager = new MetadataManager();

const metadata = manager.addMetadata({
  title: 'JavaScript Fundamentals',
  author: 'John Doe',
  zone: 'programming',
  version: '1.0.0'
});
```

### Multiple Authors

```javascript
const metadata = manager.addMetadata({
  title: 'Web Development Guide',
  author: ['Alice Smith', 'Bob Johnson'],
  zone: 'web-development'
});
```

### Zone Inference

```javascript
const metadata = manager.addMetadata(
  {
    title: 'Machine Learning Basics',
    author: 'Dr. Sarah Chen'
  },
  {
    category: 'AI-Research',
    tags: ['machine-learning', 'ai']
  }
);
// zone automatically inferred as "ai-research"
```

### Update Metadata

```javascript
manager.updateMetadata(0, {
  title: 'Updated Title',
  version: '2.0.0'
});
// updated_at automatically updated
```

### Export to JSON

```javascript
const jsonString = manager.exportJSON(true);
console.log(jsonString);

// Download as file
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// ... download logic
```

### Import from JSON

```javascript
const jsonString = '[ ... ]';
const success = manager.importJSON(jsonString);
```

### Search and Filter

```javascript
// Get all programming books
const programmingBooks = manager.getByZone('programming');

// Search by author
const authorBooks = manager.search('author', 'John Doe');
```

### Deduplication

```javascript
manager.deduplicate();
// Removes entries with identical title and author
```

## Extensibility

### Adding New Fields

```javascript
// Extend schema
MetadataSchema.isbn = {
  type: 'string',
  required: false,
  validate: (value) => /^\d{13}$/.test(value),
  normalize: (value) => value.replace(/-/g, '')
};
```

### Custom Validation Rules

```javascript
MetadataSchema.customField = {
  type: 'string',
  required: false,
  validate: (value) => {
    // Custom validation logic
    return value.length >= 5;
  }
};
```

### Custom Inference Logic

```javascript
MetadataSchema.category = {
  type: 'string',
  required: false,
  infer: (context) => {
    // Custom inference logic
    if (context.keywords) {
      return inferCategoryFromKeywords(context.keywords);
    }
    return 'uncategorized';
  }
};
```

## Best Practices

1. **Always provide context** when zone inference is needed
2. **Use validation** before critical operations
3. **Handle warnings** to improve data quality
4. **Deduplicate regularly** to maintain clean data
5. **Export frequently** to backup metadata
6. **Validate imports** to ensure data integrity
7. **Use semantic versioning** for version field
8. **Normalize data** before storage

## Performance Considerations

- **Batch operations**: Process multiple entries efficiently
- **Lazy validation**: Validate only when necessary
- **Efficient deduplication**: Uses Set for O(n) complexity
- **Minimal memory footprint**: Stores only essential data
- **Fast JSON operations**: Native JSON.stringify/parse

## Security Considerations

- **Input sanitization**: All strings are trimmed
- **Type validation**: Strict type checking
- **No code execution**: Safe data processing only
- **JSON validation**: Validates structure before import

## Testing

Run the demo page to test all features:

```bash
# Open in browser
open metadata-demo.html
```

Or use the example file:

```javascript
// In browser console or Node.js
runAllExamples();
```

## API Reference

### MetadataProcessor

- `createMetadata(input, context)` → metadata object
- `processField(fieldName, value, rules, context)` → processed value
- `validate(metadata)` → validation result
- `normalize(metadata)` → normalized metadata
- `getErrors()` → array of errors
- `getWarnings()` → array of warnings

### MetadataManager

- `addMetadata(input, context)` → metadata object
- `updateMetadata(index, updates)` → updated metadata
- `deduplicate()` → void
- `exportJSON(pretty)` → JSON string
- `importJSON(jsonString)` → boolean
- `getAllMetadata()` → array of metadata
- `search(field, value)` → array of matches
- `getByZone(zone)` → array of metadata
- `clear()` → void

## License

MIT License - Free to use and modify

## Support

For issues or questions, refer to the example files and demo page.

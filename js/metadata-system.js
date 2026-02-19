// metadata-system.js
// Robust Metadata Architecture System with validation, processing, and JSON generation

/**
 * Metadata Schema Definition
 * Defines the structure, types, and validation rules for metadata
 */
const MetadataSchema = {
  title: {
    type: 'string',
    required: true,
    validate: (value) => value && value.trim().length > 0,
    default: 'Untitled Document',
    normalize: (value) => value.trim()
  },
  author: {
    type: ['string', 'array'],
    required: true,
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0 && value.every(a => typeof a === 'string' && a.trim().length > 0);
      return false;
    },
    default: 'Unknown Author',
    normalize: (value) => {
      if (typeof value === 'string') return value.trim();
      if (Array.isArray(value)) return [...new Set(value.map(a => a.trim()).filter(a => a.length > 0))];
      return value;
    }
  },
  zone: {
    type: 'string',
    required: true,
    validate: (value) => value && value.trim().length > 0,
    default: 'general',
    normalize: (value) => value.trim().toLowerCase(),
    infer: (context) => {
      // Zone inference logic based on context
      if (context.category) return context.category.toLowerCase();
      if (context.tags && context.tags.length > 0) return context.tags[0].toLowerCase();
      return 'general';
    }
  },
  created_at: {
    type: 'string',
    required: false,
    validate: (value) => !isNaN(Date.parse(value)),
    default: () => new Date().toISOString(),
    normalize: (value) => new Date(value).toISOString()
  },
  updated_at: {
    type: 'string',
    required: false,
    validate: (value) => !isNaN(Date.parse(value)),
    default: () => new Date().toISOString(),
    normalize: (value) => new Date(value).toISOString()
  },
  version: {
    type: 'string',
    required: false,
    validate: (value) => /^\d+\.\d+\.\d+$/.test(value),
    default: '1.0.0',
    normalize: (value) => value.trim()
  }
};

/**
 * MetadataProcessor Class
 * Handles metadata creation, validation, normalization, and processing
 */
class MetadataProcessor {
  constructor(schema = MetadataSchema) {
    this.schema = schema;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Create metadata from input data with logical processing
   * @param {Object} input - Raw input data
   * @param {Object} context - Additional context for inference
   * @returns {Object} Processed metadata
   */
  createMetadata(input = {}, context = {}) {
    this.errors = [];
    this.warnings = [];
    const metadata = {};

    // Process each field according to schema
    for (const [field, rules] of Object.entries(this.schema)) {
      try {
        metadata[field] = this.processField(field, input[field], rules, context);
      } catch (error) {
        this.errors.push({ field, error: error.message });
        
        // Apply fallback logic
        if (rules.required) {
          metadata[field] = this.applyDefault(rules);
          this.warnings.push({ field, message: `Used default value due to error: ${error.message}` });
        }
      }
    }

    // Add processing metadata
    metadata._metadata = {
      processed_at: new Date().toISOString(),
      processor_version: '1.0.0',
      has_errors: this.errors.length > 0,
      has_warnings: this.warnings.length > 0
    };

    return metadata;
  }

  /**
   * Process individual field with validation and normalization
   */
  processField(fieldName, value, rules, context) {
    // Handle missing values
    if (value === undefined || value === null) {
      // Try inference if available
      if (rules.infer && context) {
        value = rules.infer(context);
        this.warnings.push({ field: fieldName, message: 'Value inferred from context' });
      } else if (rules.required) {
        value = this.applyDefault(rules);
        this.warnings.push({ field: fieldName, message: 'Required field missing, using default' });
      } else {
        return undefined; // Optional field, no value
      }
    }

    // Type validation
    if (!this.validateType(value, rules.type)) {
      throw new Error(`Invalid type for ${fieldName}. Expected ${rules.type}, got ${typeof value}`);
    }

    // Normalize value
    if (rules.normalize) {
      value = rules.normalize(value);
    }

    // Custom validation
    if (rules.validate && !rules.validate(value)) {
      throw new Error(`Validation failed for ${fieldName}`);
    }

    return value;
  }

  /**
   * Validate value type against schema
   */
  validateType(value, expectedType) {
    if (Array.isArray(expectedType)) {
      return expectedType.some(type => {
        if (type === 'array') return Array.isArray(value);
        return typeof value === type;
      });
    }
    
    if (expectedType === 'array') return Array.isArray(value);
    return typeof value === expectedType;
  }

  /**
   * Apply default value from schema
   */
  applyDefault(rules) {
    if (typeof rules.default === 'function') {
      return rules.default();
    }
    return rules.default;
  }

  /**
   * Validate existing metadata against schema
   * @param {Object} metadata - Metadata to validate
   * @returns {Object} Validation result
   */
  validate(metadata) {
    const validationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    for (const [field, rules] of Object.entries(this.schema)) {
      const value = metadata[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null)) {
        validationResult.errors.push({
          field,
          message: 'Required field is missing'
        });
        validationResult.valid = false;
        continue;
      }

      // Skip validation for optional missing fields
      if (value === undefined || value === null) continue;

      // Type validation
      if (!this.validateType(value, rules.type)) {
        validationResult.errors.push({
          field,
          message: `Invalid type. Expected ${rules.type}, got ${typeof value}`
        });
        validationResult.valid = false;
      }

      // Custom validation
      if (rules.validate && !rules.validate(value)) {
        validationResult.errors.push({
          field,
          message: 'Custom validation failed'
        });
        validationResult.valid = false;
      }
    }

    return validationResult;
  }

  /**
   * Normalize existing metadata
   * @param {Object} metadata - Metadata to normalize
   * @returns {Object} Normalized metadata
   */
  normalize(metadata) {
    const normalized = {};

    for (const [field, value] of Object.entries(metadata)) {
      if (this.schema[field] && this.schema[field].normalize) {
        normalized[field] = this.schema[field].normalize(value);
      } else {
        normalized[field] = value;
      }
    }

    return normalized;
  }

  /**
   * Get processing errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get processing warnings
   */
  getWarnings() {
    return this.warnings;
  }
}

/**
 * MetadataManager Class
 * High-level manager for metadata operations
 */
class MetadataManager {
  constructor() {
    this.processor = new MetadataProcessor();
    this.metadataStore = [];
  }

  /**
   * Create and add metadata entry
   */
  addMetadata(input, context = {}) {
    const metadata = this.processor.createMetadata(input, context);
    
    // Validate before adding
    const validation = this.processor.validate(metadata);
    if (!validation.valid) {
      console.error('Metadata validation failed:', validation.errors);
      throw new Error('Invalid metadata: ' + validation.errors.map(e => e.message).join(', '));
    }

    this.metadataStore.push(metadata);
    return metadata;
  }

  /**
   * Update existing metadata
   */
  updateMetadata(index, updates) {
    if (index < 0 || index >= this.metadataStore.length) {
      throw new Error('Invalid metadata index');
    }

    const existing = this.metadataStore[index];
    const updated = { ...existing, ...updates };
    
    // Update timestamp
    if (this.processor.schema.updated_at) {
      updated.updated_at = new Date().toISOString();
    }

    // Normalize and validate
    const normalized = this.processor.normalize(updated);
    const validation = this.processor.validate(normalized);

    if (!validation.valid) {
      throw new Error('Update validation failed: ' + validation.errors.map(e => e.message).join(', '));
    }

    this.metadataStore[index] = normalized;
    return normalized;
  }

  /**
   * Remove duplicate entries based on title and author
   */
  deduplicate() {
    const seen = new Set();
    this.metadataStore = this.metadataStore.filter(item => {
      const key = `${item.title}:${JSON.stringify(item.author)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Export metadata to JSON string
   */
  exportJSON(pretty = true) {
    return JSON.stringify(this.metadataStore, null, pretty ? 2 : 0);
  }

  /**
   * Import metadata from JSON string
   */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (!Array.isArray(data)) {
        throw new Error('JSON must contain an array of metadata objects');
      }

      // Validate each entry
      for (const item of data) {
        const validation = this.processor.validate(item);
        if (!validation.valid) {
          console.warn('Invalid metadata entry:', validation.errors);
        }
      }

      this.metadataStore = data;
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  /**
   * Get all metadata
   */
  getAllMetadata() {
    return this.metadataStore;
  }

  /**
   * Search metadata by field
   */
  search(field, value) {
    return this.metadataStore.filter(item => {
      if (Array.isArray(item[field])) {
        return item[field].includes(value);
      }
      return item[field] === value;
    });
  }

  /**
   * Get metadata by zone
   */
  getByZone(zone) {
    return this.search('zone', zone.toLowerCase());
  }

  /**
   * Clear all metadata
   */
  clear() {
    this.metadataStore = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MetadataProcessor, MetadataManager, MetadataSchema };
}

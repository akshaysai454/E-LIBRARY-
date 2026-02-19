// metadata-example.js
// Example usage of the Metadata Architecture System

/**
 * Example 1: Basic Metadata Creation
 */
function example1_BasicCreation() {
  console.log('=== Example 1: Basic Metadata Creation ===');
  
  const manager = new MetadataManager();
  
  // Create metadata with complete data
  const metadata1 = manager.addMetadata({
    title: 'Introduction to JavaScript',
    author: 'John Doe',
    zone: 'programming',
    version: '1.0.0'
  });
  
  console.log('Created metadata:', JSON.stringify(metadata1, null, 2));
  console.log('Warnings:', manager.processor.getWarnings());
}

/**
 * Example 2: Multiple Authors
 */
function example2_MultipleAuthors() {
  console.log('\n=== Example 2: Multiple Authors ===');
  
  const manager = new MetadataManager();
  
  // Create metadata with multiple authors
  const metadata = manager.addMetadata({
    title: 'Advanced Web Development',
    author: ['Alice Smith', 'Bob Johnson', 'Alice Smith'], // Duplicate will be removed
    zone: 'web-development'
  });
  
  console.log('Authors (deduplicated):', metadata.author);
}

/**
 * Example 3: Zone Inference
 */
function example3_ZoneInference() {
  console.log('\n=== Example 3: Zone Inference ===');
  
  const manager = new MetadataManager();
  
  // Create metadata without zone, but with context
  const metadata = manager.addMetadata(
    {
      title: 'Machine Learning Basics',
      author: 'Dr. Sarah Chen'
      // zone is missing
    },
    {
      category: 'AI-Research', // Context for inference
      tags: ['machine-learning', 'ai']
    }
  );
  
  console.log('Inferred zone:', metadata.zone);
  console.log('Warnings:', manager.processor.getWarnings());
}

/**
 * Example 4: Automatic Defaults
 */
function example4_AutomaticDefaults() {
  console.log('\n=== Example 4: Automatic Defaults ===');
  
  const manager = new MetadataManager();
  
  // Create metadata with minimal data
  const metadata = manager.addMetadata({
    title: 'Quick Notes'
    // author and zone missing - will use defaults
  });
  
  console.log('Metadata with defaults:', JSON.stringify(metadata, null, 2));
  console.log('Warnings:', manager.processor.getWarnings());
}

/**
 * Example 5: Validation and Error Handling
 */
function example5_ValidationErrors() {
  console.log('\n=== Example 5: Validation and Error Handling ===');
  
  const manager = new MetadataManager();
  
  try {
    // This will use defaults for missing required fields
    const metadata = manager.addMetadata({
      title: '',  // Empty title will trigger default
      version: 'invalid-version' // Invalid format will trigger error
    });
    
    console.log('Created with corrections:', JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('Errors:', manager.processor.getErrors());
  console.log('Warnings:', manager.processor.getWarnings());
}

/**
 * Example 6: Update Metadata
 */
function example6_UpdateMetadata() {
  console.log('\n=== Example 6: Update Metadata ===');
  
  const manager = new MetadataManager();
  
  // Create initial metadata
  manager.addMetadata({
    title: 'Draft Document',
    author: 'Jane Doe',
    zone: 'drafts',
    version: '0.1.0'
  });
  
  console.log('Original:', manager.getAllMetadata()[0]);
  
  // Update metadata
  const updated = manager.updateMetadata(0, {
    title: 'Final Document',
    version: '1.0.0'
  });
  
  console.log('Updated:', updated);
  console.log('Updated timestamp changed:', updated.updated_at !== updated.created_at);
}

/**
 * Example 7: Deduplication
 */
function example7_Deduplication() {
  console.log('\n=== Example 7: Deduplication ===');
  
  const manager = new MetadataManager();
  
  // Add duplicate entries
  manager.addMetadata({
    title: 'JavaScript Guide',
    author: 'John Doe',
    zone: 'programming'
  });
  
  manager.addMetadata({
    title: 'JavaScript Guide',
    author: 'John Doe',
    zone: 'programming'
  });
  
  manager.addMetadata({
    title: 'Python Guide',
    author: 'Jane Smith',
    zone: 'programming'
  });
  
  console.log('Before deduplication:', manager.getAllMetadata().length, 'entries');
  
  manager.deduplicate();
  
  console.log('After deduplication:', manager.getAllMetadata().length, 'entries');
}

/**
 * Example 8: Export and Import JSON
 */
function example8_ExportImport() {
  console.log('\n=== Example 8: Export and Import JSON ===');
  
  const manager = new MetadataManager();
  
  // Add multiple entries
  manager.addMetadata({
    title: 'Book 1',
    author: 'Author A',
    zone: 'fiction'
  });
  
  manager.addMetadata({
    title: 'Book 2',
    author: ['Author B', 'Author C'],
    zone: 'non-fiction'
  });
  
  // Export to JSON
  const jsonString = manager.exportJSON();
  console.log('Exported JSON:\n', jsonString);
  
  // Create new manager and import
  const newManager = new MetadataManager();
  newManager.importJSON(jsonString);
  
  console.log('\nImported entries:', newManager.getAllMetadata().length);
}

/**
 * Example 9: Search and Filter
 */
function example9_SearchFilter() {
  console.log('\n=== Example 9: Search and Filter ===');
  
  const manager = new MetadataManager();
  
  // Add test data
  manager.addMetadata({ title: 'JS Book', author: 'John', zone: 'programming' });
  manager.addMetadata({ title: 'Python Book', author: 'Jane', zone: 'programming' });
  manager.addMetadata({ title: 'Novel', author: 'Bob', zone: 'fiction' });
  
  // Search by zone
  const programmingBooks = manager.getByZone('programming');
  console.log('Programming books:', programmingBooks.length);
  
  // Search by author
  const johnBooks = manager.search('author', 'John');
  console.log('Books by John:', johnBooks.length);
}

/**
 * Example 10: Complete Workflow
 */
function example10_CompleteWorkflow() {
  console.log('\n=== Example 10: Complete Workflow ===');
  
  const manager = new MetadataManager();
  
  // Simulate processing multiple documents
  const documents = [
    { title: 'Web Dev Guide', author: 'Alice', zone: 'web' },
    { title: 'API Design', author: ['Bob', 'Charlie'], zone: 'backend' },
    { title: 'UI Patterns', author: 'Diana' }, // Missing zone
    { title: '', author: 'Eve', zone: 'design' }, // Empty title
  ];
  
  documents.forEach((doc, index) => {
    try {
      const metadata = manager.addMetadata(doc, { category: 'technology' });
      console.log(`Document ${index + 1}: ✓ Created`);
    } catch (error) {
      console.log(`Document ${index + 1}: ✗ Error - ${error.message}`);
    }
  });
  
  // Deduplicate
  manager.deduplicate();
  
  // Export final metadata
  const finalJSON = manager.exportJSON();
  console.log('\nFinal metadata.json:\n', finalJSON);
  
  return finalJSON;
}

// Run all examples
function runAllExamples() {
  example1_BasicCreation();
  example2_MultipleAuthors();
  example3_ZoneInference();
  example4_AutomaticDefaults();
  example5_ValidationErrors();
  example6_UpdateMetadata();
  example7_Deduplication();
  example8_ExportImport();
  example9_SearchFilter();
  
  const finalJSON = example10_CompleteWorkflow();
  
  return finalJSON;
}

// Auto-run if in browser console or Node.js
if (typeof window !== 'undefined') {
  console.log('Metadata System Examples - Run runAllExamples() to see all examples');
}

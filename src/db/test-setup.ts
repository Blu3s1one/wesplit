/**
 * Test setup file for Dexie tests
 * Configures fake-indexeddb to mock IndexedDB in Node.js test environment
 */

// Import fake-indexeddb
import 'fake-indexeddb/auto';

// This file ensures that IndexedDB is available in the test environment
// The 'auto' import automatically polyfills the global scope with IndexedDB APIs

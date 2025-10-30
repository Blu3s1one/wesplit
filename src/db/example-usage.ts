/**
 * Example usage of the Dexie database with Zod validation
 *
 * This file demonstrates how to:
 * - Create sessions
 * - Define attributes (enum and numeric)
 * - Add elements with attribute values
 * - Perform CRUD operations with automatic validation
 */

import { db } from './db';
import type { SessionInput, AttributeInput, ElementInput } from './schemas';

// ==================== Example Usage ====================

export async function exampleUsage() {
  console.log('=== Dexie + Zod Example Usage ===\n');

  try {
    // 1. Create a new session
    console.log('1. Creating a new session...');
    const sessionInput: SessionInput = {
      name: 'Math Class - Group Assignment',
      attributes: [],
      settings: {
        groupCount: 6,
      },
    };
    const sessionId = await db.addSession(sessionInput);
    console.log(`✓ Session created with ID: ${sessionId}\n`);

    // 2. Define attributes for the session
    console.log('2. Adding attributes to the session...');

    // Enum attribute (Gender)
    const genderAttrInput: AttributeInput = {
      sessionId,
      name: 'Gender',
      type: 'enum',
      required: true,
      options: ['Male', 'Female', 'Other'],
    };
    const genderAttrId = await db.addAttribute(genderAttrInput);
    console.log(`✓ Added enum attribute: ${genderAttrInput.name} (${genderAttrId})`);

    // Numeric attribute (Average Grade)
    const gradeAttrInput: AttributeInput = {
      sessionId,
      name: 'Average Grade',
      type: 'number',
      required: false,
      min: 0,
      max: 20,
    };
    const gradeAttrId = await db.addAttribute(gradeAttrInput);
    console.log(`✓ Added numeric attribute: ${gradeAttrInput.name} (${gradeAttrId})\n`);

    // 3. Add elements (students) to the session
    console.log('3. Adding elements to the session...');

    const students: ElementInput[] = [
      {
        sessionId,
        name: 'Alice Johnson',
        attributes: {
          [genderAttrId]: 'Female',
          [gradeAttrId]: 18.5,
        },
      },
      {
        sessionId,
        name: 'Bob Smith',
        attributes: {
          [genderAttrId]: 'Male',
          [gradeAttrId]: 15.2,
        },
      },
      {
        sessionId,
        name: 'Charlie Brown',
        attributes: {
          [genderAttrId]: 'Male',
          [gradeAttrId]: 16.8,
        },
      },
      {
        sessionId,
        name: 'Diana Prince',
        attributes: {
          [genderAttrId]: 'Female',
          [gradeAttrId]: 19.1,
        },
      },
    ];

    const elementIds = await db.bulkAddElements(students);
    console.log(`✓ Added ${elementIds.length} elements\n`);

    // 4. Retrieve session with all data
    console.log('4. Retrieving session with all data...');
    const sessionData = await db.getSessionWithData(sessionId);

    if (sessionData) {
      console.log(`Session: ${sessionData.session.name}`);
      console.log(`Attributes: ${sessionData.attributes.length}`);
      console.log(`Elements: ${sessionData.elements.length}`);
      console.log('\nElements:');
      sessionData.elements.forEach((element) => {
        const gender = element.attributes[genderAttrId];
        const grade = element.attributes[gradeAttrId];
        console.log(`  - ${element.name}: Gender=${gender}, Grade=${grade}`);
      });
      console.log();
    }

    // 5. Update an element
    console.log('5. Updating an element...');
    await db.updateElement(elementIds[0], {
      attributes: {
        [genderAttrId]: 'Female',
        [gradeAttrId]: 19.5, // Updated grade
      },
    });
    console.log(`✓ Updated element ${elementIds[0]}\n`);

    // 6. Try to add an invalid element (will fail validation)
    console.log('6. Testing validation (should fail)...');
    try {
      const invalidElement: ElementInput = {
        sessionId,
        name: 'Invalid Student',
        attributes: {
          [genderAttrId]: 'Unknown', // Invalid enum value
          [gradeAttrId]: 25, // Exceeds max
        },
      };
      await db.addElement(invalidElement);
      console.log('✗ Validation should have failed!');
    } catch (error) {
      console.log(
        `✓ Validation correctly failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`
      );
    }

    // 7. Delete an attribute
    console.log('7. Deleting an attribute...');
    await db.deleteAttribute(gradeAttrId);
    console.log(`✓ Deleted attribute ${gradeAttrId}\n`);

    // 8. Get all sessions
    console.log('8. Listing all sessions...');
    const allSessions = await db.getAllSessions();
    console.log(`Found ${allSessions.length} session(s):`);
    allSessions.forEach((session) => {
      console.log(`  - ${session.name} (created: ${session.createdAt.toISOString()})`);
    });
    console.log();

    // 9. Clean up (optional)
    console.log('9. Cleaning up...');
    await db.deleteSession(sessionId);
    console.log('✓ Session deleted\n');

    console.log('=== Example completed successfully! ===');
  } catch (error) {
    console.error('Error during example execution:', error);
    throw error;
  }
}

// ==================== Run Example ====================
// Uncomment the following line to run the example:
// exampleUsage().catch(console.error);

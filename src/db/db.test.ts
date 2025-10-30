import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './test-setup'; // Setup fake-indexeddb
import { AppDB } from './db';
import type { SessionInput, AttributeInput, ElementInput } from './schemas';

// Create a test instance with a different database name
const testDb = new AppDB();

describe('Dexie + Zod Database Tests', () => {
  beforeEach(async () => {
    // Clear database before each test
    await testDb.clearAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await testDb.clearAll();
  });

  describe('Session CRUD', () => {
    it('should create a session with default values', async () => {
      const input: SessionInput = {
        name: 'Test Session',
      };

      const sessionId = await testDb.addSession(input);
      expect(sessionId).toBeTruthy();

      const session = await testDb.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.name).toBe('Test Session');
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.attributes).toEqual([]);
    });

    it('should create a session with settings', async () => {
      const input: SessionInput = {
        name: 'Test Session',
        settings: {
          groupCount: 5,
        },
      };

      const sessionId = await testDb.addSession(input);
      const session = await testDb.getSession(sessionId);

      expect(session?.settings?.groupCount).toBe(5);
    });

    it('should fail to create a session with empty name', async () => {
      const input: SessionInput = {
        name: '',
      };

      await expect(testDb.addSession(input)).rejects.toThrow();
    });

    it('should update a session', async () => {
      const sessionId = await testDb.addSession({ name: 'Original Name' });

      await testDb.updateSession(sessionId, {
        name: 'Updated Name',
        settings: { groupCount: 3 },
      });

      const session = await testDb.getSession(sessionId);
      expect(session?.name).toBe('Updated Name');
      expect(session?.settings?.groupCount).toBe(3);
    });

    it('should delete a session', async () => {
      const sessionId = await testDb.addSession({ name: 'To Delete' });
      await testDb.deleteSession(sessionId);

      const session = await testDb.getSession(sessionId);
      expect(session).toBeUndefined();
    });

    it('should get all sessions ordered by creation date', async () => {
      const now = Date.now();
      await testDb.addSession({
        name: 'Session 1',
        createdAt: new Date(now),
      });
      await testDb.addSession({
        name: 'Session 2',
        createdAt: new Date(now + 1000),
      });
      await testDb.addSession({
        name: 'Session 3',
        createdAt: new Date(now + 2000),
      });

      const sessions = await testDb.getAllSessions();
      expect(sessions).toHaveLength(3);
      // Most recent first
      expect(sessions[0].name).toBe('Session 3');
    });
  });

  describe('Attribute CRUD', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await testDb.addSession({ name: 'Test Session' });
    });

    it('should create an enum attribute', async () => {
      const input: AttributeInput = {
        sessionId,
        name: 'Gender',
        type: 'enum',
        required: true,
        options: ['Male', 'Female', 'Other'],
      };

      const attrId = await testDb.addAttribute(input);
      expect(attrId).toBeTruthy();

      const attr = await testDb.getAttribute(attrId);
      expect(attr?.name).toBe('Gender');
      expect(attr?.type).toBe('enum');
      expect(attr?.options).toEqual(['Male', 'Female', 'Other']);
      expect(attr?.required).toBe(true);

      // Check that attribute was added to session
      const session = await testDb.getSession(sessionId);
      expect(session?.attributes).toContain(attrId);
    });

    it('should create a numeric attribute', async () => {
      const input: AttributeInput = {
        sessionId,
        name: 'Age',
        type: 'number',
        required: false,
        min: 0,
        max: 120,
      };

      const attrId = await testDb.addAttribute(input);
      const attr = await testDb.getAttribute(attrId);

      expect(attr?.type).toBe('number');
      expect(attr?.min).toBe(0);
      expect(attr?.max).toBe(120);
      expect(attr?.required).toBe(false);
    });

    it('should fail to create enum attribute without options', async () => {
      const input: AttributeInput = {
        sessionId,
        name: 'Invalid Enum',
        type: 'enum',
        required: false,
        // Missing options
      };

      await expect(testDb.addAttribute(input)).rejects.toThrow();
    });

    it('should update an attribute', async () => {
      const attrId = await testDb.addAttribute({
        sessionId,
        name: 'Original',
        type: 'enum',
        options: ['A', 'B'],
      });

      await testDb.updateAttribute(attrId, {
        name: 'Updated',
        options: ['A', 'B', 'C'],
      });

      const attr = await testDb.getAttribute(attrId);
      expect(attr?.name).toBe('Updated');
      expect(attr?.options).toEqual(['A', 'B', 'C']);
    });

    it('should delete an attribute and remove it from session', async () => {
      const attrId = await testDb.addAttribute({
        sessionId,
        name: 'To Delete',
        type: 'enum',
        options: ['A'],
      });

      await testDb.deleteAttribute(attrId);

      const attr = await testDb.getAttribute(attrId);
      expect(attr).toBeUndefined();

      const session = await testDb.getSession(sessionId);
      expect(session?.attributes).not.toContain(attrId);
    });

    it('should get all attributes for a session', async () => {
      await testDb.addAttribute({
        sessionId,
        name: 'Attr1',
        type: 'enum',
        options: ['A'],
      });
      await testDb.addAttribute({
        sessionId,
        name: 'Attr2',
        type: 'number',
      });

      const attributes = await testDb.getSessionAttributes(sessionId);
      expect(attributes).toHaveLength(2);
    });
  });

  describe('Element CRUD', () => {
    let sessionId: string;
    let genderAttrId: string;
    let gradeAttrId: string;

    beforeEach(async () => {
      sessionId = await testDb.addSession({ name: 'Test Session' });
      genderAttrId = await testDb.addAttribute({
        sessionId,
        name: 'Gender',
        type: 'enum',
        required: true,
        options: ['Male', 'Female'],
      });
      gradeAttrId = await testDb.addAttribute({
        sessionId,
        name: 'Grade',
        type: 'number',
        required: false,
        min: 0,
        max: 20,
      });
    });

    it('should create an element with valid attributes', async () => {
      const input: ElementInput = {
        sessionId,
        name: 'Alice',
        attributes: {
          [genderAttrId]: 'Female',
          [gradeAttrId]: 18.5,
        },
      };

      const elementId = await testDb.addElement(input);
      expect(elementId).toBeTruthy();

      const element = await testDb.getElement(elementId);
      expect(element?.name).toBe('Alice');
      expect(element?.attributes[genderAttrId]).toBe('Female');
      expect(element?.attributes[gradeAttrId]).toBe(18.5);
    });

    it('should fail to create element without required attribute', async () => {
      const input: ElementInput = {
        sessionId,
        name: 'Bob',
        attributes: {
          // Missing required genderAttrId
          [gradeAttrId]: 15,
        },
      };

      await expect(testDb.addElement(input)).rejects.toThrow(/required/i);
    });

    it('should fail to create element with invalid enum value', async () => {
      const input: ElementInput = {
        sessionId,
        name: 'Charlie',
        attributes: {
          [genderAttrId]: 'Unknown', // Not in options
          [gradeAttrId]: 15,
        },
      };

      await expect(testDb.addElement(input)).rejects.toThrow();
    });

    it('should fail to create element with number out of range', async () => {
      const input: ElementInput = {
        sessionId,
        name: 'Diana',
        attributes: {
          [genderAttrId]: 'Female',
          [gradeAttrId]: 25, // Exceeds max
        },
      };

      await expect(testDb.addElement(input)).rejects.toThrow();
    });

    it('should update an element', async () => {
      const elementId = await testDb.addElement({
        sessionId,
        name: 'Eve',
        attributes: {
          [genderAttrId]: 'Female',
          [gradeAttrId]: 16,
        },
      });

      await testDb.updateElement(elementId, {
        attributes: {
          [genderAttrId]: 'Female',
          [gradeAttrId]: 18,
        },
      });

      const element = await testDb.getElement(elementId);
      expect(element?.attributes[gradeAttrId]).toBe(18);
    });

    it('should delete an element', async () => {
      const elementId = await testDb.addElement({
        sessionId,
        name: 'Frank',
        attributes: { [genderAttrId]: 'Male' },
      });

      await testDb.deleteElement(elementId);

      const element = await testDb.getElement(elementId);
      expect(element).toBeUndefined();
    });

    it('should bulk add elements', async () => {
      const inputs: ElementInput[] = [
        {
          sessionId,
          name: 'Student 1',
          attributes: { [genderAttrId]: 'Male', [gradeAttrId]: 15 },
        },
        {
          sessionId,
          name: 'Student 2',
          attributes: { [genderAttrId]: 'Female', [gradeAttrId]: 17 },
        },
        {
          sessionId,
          name: 'Student 3',
          attributes: { [genderAttrId]: 'Male', [gradeAttrId]: 16 },
        },
      ];

      const elementIds = await testDb.bulkAddElements(inputs);
      expect(elementIds).toHaveLength(3);

      const elements = await testDb.getSessionElements(sessionId);
      expect(elements).toHaveLength(3);
    });

    it('should get all elements for a session', async () => {
      await testDb.addElement({
        sessionId,
        name: 'Element 1',
        attributes: { [genderAttrId]: 'Male' },
      });
      await testDb.addElement({
        sessionId,
        name: 'Element 2',
        attributes: { [genderAttrId]: 'Female' },
      });

      const elements = await testDb.getSessionElements(sessionId);
      expect(elements).toHaveLength(2);
    });
  });

  describe('Complex Operations', () => {
    it('should get session with all data', async () => {
      const sessionId = await testDb.addSession({ name: 'Complete Session' });

      const attrId = await testDb.addAttribute({
        sessionId,
        name: 'Type',
        type: 'enum',
        options: ['A', 'B'],
        required: true,
      });

      await testDb.addElement({
        sessionId,
        name: 'Element 1',
        attributes: { [attrId]: 'A' },
      });

      const data = await testDb.getSessionWithData(sessionId);

      expect(data).toBeDefined();
      expect(data?.session.name).toBe('Complete Session');
      expect(data?.attributes).toHaveLength(1);
      expect(data?.elements).toHaveLength(1);
    });

    it('should cascade delete session with all related data', async () => {
      const sessionId = await testDb.addSession({ name: 'To Cascade Delete' });

      const attrId = await testDb.addAttribute({
        sessionId,
        name: 'Attr',
        type: 'enum',
        options: ['X'],
        required: true,
      });

      await testDb.addElement({
        sessionId,
        name: 'Element',
        attributes: { [attrId]: 'X' },
      });

      await testDb.deleteSession(sessionId);

      const session = await testDb.getSession(sessionId);
      const attributes = await testDb.getSessionAttributes(sessionId);
      const elements = await testDb.getSessionElements(sessionId);

      expect(session).toBeUndefined();
      expect(attributes).toHaveLength(0);
      expect(elements).toHaveLength(0);
    });

    it('should remove attribute from all elements when deleted', async () => {
      const sessionId = await testDb.addSession({ name: 'Test' });

      const attr1Id = await testDb.addAttribute({
        sessionId,
        name: 'Attr1',
        type: 'enum',
        options: ['A'],
        required: true,
      });

      const attr2Id = await testDb.addAttribute({
        sessionId,
        name: 'Attr2',
        type: 'enum',
        options: ['B'],
        required: false,
      });

      const elementId = await testDb.addElement({
        sessionId,
        name: 'Element',
        attributes: {
          [attr1Id]: 'A',
          [attr2Id]: 'B',
        },
      });

      // Delete attr2
      await testDb.deleteAttribute(attr2Id);

      const element = await testDb.getElement(elementId);
      expect(element?.attributes[attr1Id]).toBe('A');
      expect(element?.attributes[attr2Id]).toBeUndefined();
    });
  });
});

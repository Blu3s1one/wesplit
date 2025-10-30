import Dexie, { type EntityTable } from 'dexie';
import {
  type Session,
  type Element,
  type Attribute,
  type Distribution,
  type SessionInput,
  type ElementInput,
  type AttributeInput,
  type DistributionInput,
  SessionSchema,
  ElementSchema,
  AttributeSchema,
  DistributionSchema,
  validateElementAttributes,
} from './schemas';

// ==================== Database Class ====================
export class AppDB extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  elements!: EntityTable<Element, 'id'>;
  attributes!: EntityTable<Attribute, 'id'>;
  distributions!: EntityTable<Distribution, 'id'>;

  constructor() {
    super('SplitAppDatabase');

    // Define the schema version and stores
    this.version(1).stores({
      sessions: 'id, name, createdAt',
      elements: 'id, sessionId, name',
      attributes: 'id, sessionId, name, type',
    });

    // Version 2: Add elementLabel to sessions
    this.version(2)
      .stores({
        sessions: 'id, name, createdAt, elementLabel',
        elements: 'id, sessionId, name',
        attributes: 'id, sessionId, name, type',
      })
      .upgrade((trans) => {
        // Add default elementLabel to existing sessions
        return trans
          .table('sessions')
          .toCollection()
          .modify((session) => {
            if (!session.elementLabel) {
              session.elementLabel = 'element';
            }
          });
      });

    // Version 3: Add distributions table
    this.version(3).stores({
      sessions: 'id, name, createdAt, elementLabel',
      elements: 'id, sessionId, name',
      attributes: 'id, sessionId, name, type',
      distributions: 'id, sessionId, name, createdAt',
    });
  }

  // ==================== Session CRUD ====================

  /**
   * Add a new session
   */
  async addSession(input: SessionInput): Promise<string> {
    const id = input.id || crypto.randomUUID();
    const createdAt = input.createdAt || new Date();

    const session: Session = {
      ...input,
      id,
      createdAt,
      elementLabel: input.elementLabel || 'element',
      colorTheme: input.colorTheme || 'blue',
      attributes: input.attributes || [],
    };

    // Validate with Zod
    const validated = SessionSchema.parse(session);

    await this.sessions.add(validated);
    return id;
  }

  /**
   * Get a session by ID
   */
  async getSession(id: string): Promise<Session | undefined> {
    return await this.sessions.get(id);
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<Session[]> {
    return await this.sessions.orderBy('createdAt').reverse().toArray();
  }

  /**
   * Update a session
   */
  async updateSession(id: string, updates: Partial<Omit<Session, 'id'>>): Promise<void> {
    const existing = await this.getSession(id);
    if (!existing) {
      throw new Error(`Session with id ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    // Validate the updated session
    SessionSchema.parse(updated);

    await this.sessions.update(id, updates);
  }

  /**
   * Delete a session and all its elements, attributes, and distributions
   */
  async deleteSession(id: string): Promise<void> {
    await this.transaction(
      'rw',
      this.sessions,
      this.elements,
      this.attributes,
      this.distributions,
      async () => {
        // Delete all related elements
        await this.elements.where('sessionId').equals(id).delete();
        // Delete all related attributes
        await this.attributes.where('sessionId').equals(id).delete();
        // Delete all related distributions
        await this.distributions.where('sessionId').equals(id).delete();
        // Delete the session
        await this.sessions.delete(id);
      }
    );
  }

  // ==================== Attribute CRUD ====================

  /**
   * Add a new attribute to a session
   */
  async addAttribute(input: AttributeInput): Promise<string> {
    const id = input.id || crypto.randomUUID();

    const attribute: Attribute = {
      ...input,
      id,
      required: input.required ?? false,
    };

    // Validate with Zod
    const validated = AttributeSchema.parse(attribute);

    // Add attribute ID to session's attributes array
    await this.transaction('rw', this.attributes, this.sessions, async () => {
      await this.attributes.add(validated);

      const session = await this.getSession(input.sessionId);
      if (session) {
        const updatedAttributes = [...(session.attributes || []), id];
        await this.sessions.update(input.sessionId, { attributes: updatedAttributes });
      }
    });

    return id;
  }

  /**
   * Get an attribute by ID
   */
  async getAttribute(id: string): Promise<Attribute | undefined> {
    return await this.attributes.get(id);
  }

  /**
   * Get all attributes for a session
   */
  async getSessionAttributes(sessionId: string): Promise<Attribute[]> {
    return await this.attributes.where('sessionId').equals(sessionId).toArray();
  }

  /**
   * Update an attribute
   */
  async updateAttribute(
    id: string,
    updates: Partial<Omit<Attribute, 'id' | 'sessionId'>>
  ): Promise<void> {
    const existing = await this.getAttribute(id);
    if (!existing) {
      throw new Error(`Attribute with id ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    // Validate the updated attribute
    AttributeSchema.parse(updated);

    await this.attributes.update(id, updates);
  }

  /**
   * Delete an attribute and remove it from the session
   */
  async deleteAttribute(id: string): Promise<void> {
    const attribute = await this.getAttribute(id);
    if (!attribute) {
      throw new Error(`Attribute with id ${id} not found`);
    }

    await this.transaction(
      'rw',
      this.attributes,
      this.sessions,
      this.elements,
      this.distributions,
      async () => {
        // Remove attribute ID from session's attributes array
        const session = await this.getSession(attribute.sessionId);
        if (session) {
          const updatedAttributes = session.attributes.filter((attrId) => attrId !== id);
          await this.sessions.update(attribute.sessionId, { attributes: updatedAttributes });
        }

        // Remove attribute values from all elements
        const elements = await this.getSessionElements(attribute.sessionId);
        for (const element of elements) {
          if (element.attributes[id]) {
            const { [id]: _removed, ...remainingAttrs } = element.attributes;
            await this.elements.update(element.id, { attributes: remainingAttrs });
          }
        }

        // Delete the attribute
        await this.attributes.delete(id);
      }
    );
  }

  // ==================== Element CRUD ====================

  /**
   * Add a new element to a session
   */
  async addElement(input: ElementInput): Promise<string> {
    const id = input.id || crypto.randomUUID();

    const element: Element = {
      ...input,
      id,
      attributes: input.attributes || {},
    };

    // Validate with Zod
    const validated = ElementSchema.parse(element);

    // Validate element attributes against session's attribute definitions
    const sessionAttributes = await this.getSessionAttributes(input.sessionId);
    const validation = validateElementAttributes(validated, sessionAttributes);

    if (!validation.valid) {
      throw new Error(`Element validation failed: ${validation.errors.join(', ')}`);
    }

    await this.elements.add(validated);
    return id;
  }

  /**
   * Get an element by ID
   */
  async getElement(id: string): Promise<Element | undefined> {
    return await this.elements.get(id);
  }

  /**
   * Get all elements for a session
   */
  async getSessionElements(sessionId: string): Promise<Element[]> {
    return await this.elements.where('sessionId').equals(sessionId).toArray();
  }

  /**
   * Update an element
   */
  async updateElement(
    id: string,
    updates: Partial<Omit<Element, 'id' | 'sessionId'>>
  ): Promise<void> {
    const existing = await this.getElement(id);
    if (!existing) {
      throw new Error(`Element with id ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    // Validate the updated element
    ElementSchema.parse(updated);

    // Validate element attributes against session's attribute definitions
    const sessionAttributes = await this.getSessionAttributes(existing.sessionId);
    const validation = validateElementAttributes(updated, sessionAttributes);

    if (!validation.valid) {
      throw new Error(`Element validation failed: ${validation.errors.join(', ')}`);
    }

    await this.elements.update(id, updates);
  }

  /**
   * Delete an element
   */
  async deleteElement(id: string): Promise<void> {
    const element = await this.getElement(id);
    if (!element) {
      throw new Error(`Element with id ${id} not found`);
    }

    await this.elements.delete(id);
  }

  /**
   * Delete all elements in a session
   */
  async deleteSessionElements(sessionId: string): Promise<void> {
    await this.elements.where('sessionId').equals(sessionId).delete();
  }

  /**
   * Bulk add elements to a session
   */
  async bulkAddElements(inputs: ElementInput[]): Promise<string[]> {
    const ids: string[] = [];

    await this.transaction('rw', this.elements, this.attributes, async () => {
      for (const input of inputs) {
        const id = await this.addElement(input);
        ids.push(id);
      }
    });

    return ids;
  }

  // ==================== Distribution CRUD ====================

  /**
   * Add a new distribution to a session
   */
  async addDistribution(input: DistributionInput): Promise<string> {
    const id = input.id || crypto.randomUUID();
    const createdAt = input.createdAt || new Date();

    // Snapshot current attributes and elements
    const snapshotAttributes = await this.getSessionAttributes(input.sessionId);
    const snapshotElements = await this.getSessionElements(input.sessionId);

    const distribution: Distribution = {
      ...input,
      id,
      createdAt,
      name: input.name || 'Distribution #1',
      constraints: (input.constraints || []).map((c) => ({
        ...c,
        mode: c.type === 'enum' ? (c.mode ?? 'balance') : undefined,
        balanceAverage: c.type === 'number' ? (c.balanceAverage ?? true) : undefined,
        allowedDivergence:
          c.type === 'number' || (c.type === 'enum' && c.mode === 'balance')
            ? (c.allowedDivergence ?? 0.2)
            : undefined,
      })) as Distribution['constraints'],
      groups: input.groups || [],
      snapshotAttributes,
      snapshotElements,
    };

    // Validate with Zod
    const validated = DistributionSchema.parse(distribution);

    await this.distributions.add(validated);
    return id;
  }

  /**
   * Get a distribution by ID
   */
  async getDistribution(id: string): Promise<Distribution | undefined> {
    return await this.distributions.get(id);
  }

  /**
   * Get all distributions for a session
   */
  async getSessionDistributions(sessionId: string): Promise<Distribution[]> {
    const distributions = await this.distributions.where('sessionId').equals(sessionId).toArray();
    return distributions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update a distribution
   */
  async updateDistribution(
    id: string,
    updates: Partial<Omit<Distribution, 'id' | 'sessionId' | 'createdAt'>>
  ): Promise<void> {
    const existing = await this.getDistribution(id);
    if (!existing) {
      throw new Error(`Distribution with id ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    // Validate the updated distribution
    DistributionSchema.parse(updated);

    await this.distributions.update(id, updates);
  }

  /**
   * Delete a distribution
   */
  async deleteDistribution(id: string): Promise<void> {
    await this.distributions.delete(id);
  }

  /**
   * Delete all distributions for a session
   */
  async deleteSessionDistributions(sessionId: string): Promise<void> {
    await this.distributions.where('sessionId').equals(sessionId).delete();
  }

  /**
   * Update group membership (move element between groups)
   */
  async updateGroupMembership(
    distributionId: string,
    elementId: string,
    newGroupId: string
  ): Promise<void> {
    const distribution = await this.getDistribution(distributionId);
    if (!distribution) {
      throw new Error(`Distribution with id ${distributionId} not found`);
    }

    // Remove element from all groups
    const updatedGroups = distribution.groups.map((group) => ({
      ...group,
      members: group.members.filter((memberId) => memberId !== elementId),
    }));

    // Add element to new group
    const newGroup = updatedGroups.find((g) => g.id === newGroupId);
    if (!newGroup) {
      throw new Error(`Group with id ${newGroupId} not found`);
    }
    newGroup.members.push(elementId);

    await this.updateDistribution(distributionId, { groups: updatedGroups });
  }

  // ==================== Helper Methods ====================

  /**
   * Get complete session data including elements, attributes, and distributions
   */
  async getSessionWithData(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const [elements, attributes, distributions] = await Promise.all([
      this.getSessionElements(sessionId),
      this.getSessionAttributes(sessionId),
      this.getSessionDistributions(sessionId),
    ]);

    return {
      session,
      elements,
      attributes,
      distributions,
    };
  }

  /**
   * Clear all data (useful for testing)
   */
  async clearAll(): Promise<void> {
    await this.transaction(
      'rw',
      this.sessions,
      this.elements,
      this.attributes,
      this.distributions,
      async () => {
        await this.sessions.clear();
        await this.elements.clear();
        await this.attributes.clear();
        await this.distributions.clear();
      }
    );
  }
}

// ==================== Export Singleton Instance ====================
export const db = new AppDB();

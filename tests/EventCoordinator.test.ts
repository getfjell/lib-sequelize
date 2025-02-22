import { createEvents, populateEvents, removeEvents, updateEvents } from '@/EventCoordinator';

jest.mock('@fjell/logging', () => {
  return {
    get: jest.fn().mockReturnThis(),
    getLogger: jest.fn().mockReturnThis(),
    default: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    emergency: jest.fn(),
    alert: jest.fn(),
    critical: jest.fn(),
    notice: jest.fn(),
    time: jest.fn().mockReturnThis(),
    end: jest.fn(),
    log: jest.fn(),
  }
});

describe('EventCoordinator', () => {
  describe('createEvents', () => {
    it('should create events for item without existing events', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      
      const result = createEvents(item);
      
      expect(result.events).toBeDefined();
      expect(result.events?.created.at).toBeInstanceOf(Date);
      expect(result.events?.updated.at).toBeInstanceOf(Date);
      expect(result.events?.deleted.at).toBeNull();
    });

    it('should preserve existing events and add missing ones', () => {
      const existingDate = new Date('2023-01-01');
      const item = {
        id: '123',
        name: 'test',
        events: {
          created: { at: existingDate }
        }
      };

      const result = createEvents(item);

      expect(result.events?.created.at).toBe(existingDate);
      expect(result.events?.updated.at).toBeInstanceOf(Date);
      expect(result.events?.deleted.at).toBeNull();
    });

    it('should create events for item with missing events', () => {
      const item = {
        id: '123',
        name: 'test',
        events: {
          birthday: { at: new Date('2023-01-01') },
        }
      };
      
      const result = createEvents(item);
      
      expect(result.events).toBeDefined();
      expect(result.events?.created.at).toBeInstanceOf(Date);
      expect(result.events?.updated.at).toBeInstanceOf(Date);
      expect(result.events?.deleted.at).toBeNull();
      expect(result.events?.birthday.at).toBe(item.events?.birthday.at);
    });
  });

  describe('updateEvents', () => {
    it('should update the updated event timestamp', () => {
      const item = {
        id: '123',
        name: 'test',
        events: {
          created: { at: new Date('2023-01-01') },
          updated: { at: new Date('2023-01-01') },
          deleted: { at: null }
        }
      };

      const result = updateEvents(item);

      expect(result.events?.updated.at).toBeInstanceOf(Date);
      expect(result.events?.updated.at?.getTime()).toBeGreaterThan(item.events?.updated.at?.getTime() ?? 0);
    });

    it('should add created event if missing', () => {
      const item = {
        id: '123',
        name: 'test'
      };

      const result = updateEvents(item);

      expect(result.events?.created.at).toBeInstanceOf(Date);
      expect(result.events?.updated.at).toBeInstanceOf(Date);
    });
  });

  describe('populateEvents', () => {
    it('should populate events from sequelize timestamps', () => {
      const createdAt = new Date('2023-01-01');
      const updatedAt = new Date('2023-01-02');
      const item = {
        id: '123',
        name: 'test',
        createdAt,
        updatedAt
      };

      const result = populateEvents(item);

      expect(result.events?.created.at).toBe(createdAt);
      expect(result.events?.updated.at).toBe(updatedAt);
      expect(result.events?.deleted.at).toBeNull();
    });
  });

  describe('removeEvents', () => {
    it('should remove events from item', () => {
      const item = {
        id: '123',
        name: 'test',
        events: {
          created: { at: new Date() },
          updated: { at: new Date() },
          deleted: { at: null }
        }
      };

      const result = removeEvents(item);

      expect(result.events).toBeUndefined();
    });
  });

});

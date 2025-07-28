import {
  Evented,
  Item,
  ManagedEvents
} from '@fjell/core';
import deepmerge from 'deepmerge';

import LibLogger from './logger';

const logger = LibLogger.get("sequelize", "EventCoordinator");

export const createEvents = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>):
  Partial<Item<S, L1, L2, L3, L4, L5>> => {
  logger.default('Creating Events', { item });
  const currentDate = new Date();

  let events = item.events;

  if (events) {
    if (!events.created) {
      events = deepmerge(events, { created: { at: currentDate } });
    }
    if (!events.updated) {
      events = deepmerge(events, { updated: { at: currentDate } });
    }
    if (!events.deleted) {
      events = deepmerge(events, { deleted: { at: null } });
    }

  } else {
    events = {
      created: { at: currentDate },
      updated: { at: currentDate },
      deleted: { at: null },
    };
  }

  return deepmerge(item, { events }) as Partial<Item<S, L1, L2, L3, L4, L5>>;
}

export const updateEvents = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>):
  Partial<Item<S, L1, L2, L3, L4, L5>> => {
  logger.default('Updating Events', { item });
  const currentDate = new Date();
  const events: Evented = {
    updated: { at: currentDate },
  };

  // TODO: This is clean-up code, we should remove it
  // If the event lacks a created data, let's just insert it here...
  if (!item.events || !item.events.created || !item.events.created.at) {
    events.created = { at: currentDate };
  }

  return deepmerge(item, { events }) as Partial<Item<S, L1, L2, L3, L4, L5>>;
}
//#endregion

export const populateEvents = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>): Partial<Item<S, L1, L2, L3, L4, L5>> => {
  const events: ManagedEvents = {
    created: { at: item.createdAt || null },
    updated: { at: item.updatedAt || null },
    deleted: { at: null }
  };
  item.events = events;
  return item;
}

export const extractEvents = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>): Partial<Item<S, L1, L2, L3, L4, L5>> => {
  logger.default('Extracting Events to database fields', { item });

  if (item.events) {
    if (item.events.created?.at) {
      item.createdAt = item.events.created.at;
    }
    if (item.events.updated?.at) {
      item.updatedAt = item.events.updated.at;
    }
    if (item.events.deleted?.at) {
      item.deletedAt = item.events.deleted.at;
    }
  }

  return item;
}

export const removeEvents = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>): Partial<Item<S, L1, L2, L3, L4, L5>> => {
  logger.default('Removing Events', { item });
  delete item.events;
  return item;
}

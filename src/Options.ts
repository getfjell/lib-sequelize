import * as Library from '@fjell/lib';
import { ComKey, Item, LocKeyArray, PriKey } from '@fjell/core';
import { SequelizeReferenceDefinition } from './processing/ReferenceBuilder';

// Re-export AggregationDefinition from @fjell/lib for backwards compatibility
export type { AggregationDefinition } from '@fjell/lib';

// Export Sequelize-specific reference definition
export type { SequelizeReferenceDefinition } from './processing/ReferenceBuilder';

/**
 * Sequelize-specific Options that uses SequelizeReferenceDefinition
 * instead of the generic ReferenceDefinition
 */
export interface Options<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> {
  hooks?: {
    preCreate?: (
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?:
        {
          key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
          locations?: never;
        } | {
          key?: never;
          locations: LocKeyArray<L1, L2, L3, L4, L5>,
        }
    ) => Promise<Partial<Item<S, L1, L2, L3, L4, L5>>>;
    postCreate?: (
      item: V,
    ) => Promise<V>;
    preUpdate?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    ) => Promise<Partial<Item<S, L1, L2, L3, L4, L5>>>;
    postUpdate?: (
      item: V,
    ) => Promise<V>;
    preRemove?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    ) => Promise<Partial<Item<S, L1, L2, L3, L4, L5>>>;
    postRemove?: (
      item: V,
    ) => Promise<V>;
  },
  validators?: {
    onCreate?: (
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?:
        {
          key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
          locations?: never;
        } | {
          key?: never;
          locations: LocKeyArray<L1, L2, L3, L4, L5>,
        }
    ) => Promise<boolean>;
    onUpdate?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    ) => Promise<boolean>;
    onRemove?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    ) => Promise<boolean>;
  },
  finders?: Record<string, Library.FinderMethod<V, S, L1, L2, L3, L4, L5>>,
  actions?: Record<string, Library.ActionMethod<V, S, L1, L2, L3, L4, L5>>,
  facets?: Record<string, Library.FacetMethod<V, S, L1, L2, L3, L4, L5>>,
  allActions?: Record<string, Library.AllActionMethod<V, S, L1, L2, L3, L4, L5>>,
  allFacets?: Record<string, Library.AllFacetMethod<L1, L2, L3, L4, L5>>,
  references?: SequelizeReferenceDefinition[], // Sequelize-specific!
  aggregations?: Library.AggregationDefinition[],
  deleteOnRemove?: boolean; // Sequelize-specific option
}

export const createOptions = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(sequelizeOptions?: Options<V, S, L1, L2, L3, L4, L5>): Options<V, S, L1, L2, L3, L4, L5> => {
  // Convert Sequelize options to Library options (excluding references which have different types)
  const { references, deleteOnRemove, ...libCompatibleOptions } = sequelizeOptions || {};
  
  // Create base options from Library
  const baseOptions = Library.createOptions(libCompatibleOptions as Library.Options<V, S, L1, L2, L3, L4, L5>);

  // Return Sequelize options with Sequelize-specific references, aggregations, and deleteOnRemove
  return {
    ...baseOptions,
    references: references ?? [], // Keep Sequelize-specific references
    aggregations: baseOptions.aggregations ?? [], // Ensure aggregations is always present
    deleteOnRemove: deleteOnRemove ?? false, // Sequelize-specific option
  } as Options<V, S, L1, L2, L3, L4, L5>;
}

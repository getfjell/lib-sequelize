import { ReferenceDefinition } from "./Options";
import { PriKey } from "@fjell/core";
import * as Library from "@fjell/lib";
import { OperationContext } from "./OperationContext";
import LibLogger from "./logger";

const logger = LibLogger.get('sequelize', 'ReferenceBuilder');

export const buildReference = async (
  item: any,
  referenceDefinition: ReferenceDefinition,
  registry: Library.Registry,
  context?: OperationContext
) => {
    Task.tsx:28 Task toggle called: {stepId: 12, stepCode: 'LYU', orderPhaseId: 23582, orderId: 26073, hasOrderStep: true, …}
    Task.tsx:71 Updating existing OrderStep: {orderStepId: 195401, newCompletedAt: Thu Aug 14 2025 20:06:43 GMT-0700 (Pacific Daylight Time)}
    TaskList.tsx:26 TaskList Debug: {orderPhaseId: 23582, orderStepsCount: 11, orderSteps: Array(11), stepsCount: 11, orderStepsHookKeys: Array(24), …}
    installHook.js:1 TaskList Debug: {orderPhaseId: 23582, orderStepsCount: 11, orderSteps: Array(11), stepsCount: 11, orderStepsHookKeys: Array(24), …}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step FPR: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:55:26.343Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step FPR: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:55:26.343Z', isCompleted: true}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step MTL: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step MTL: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step CSW: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:39:39.573Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step CSW: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:39:39.573Z', isCompleted: true}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BAS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BAS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step TNT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T03:00:47.173Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step TNT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T03:00:47.173Z', isCompleted: true}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step EDG: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step EDG: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step PPR: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step PPR: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BCS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BCS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step LYU: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step LYU: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step PRS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step PRS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:80 OrderStep updated successfully, UI should update automatically
    TaskList.tsx:26 TaskList Debug: {orderPhaseId: 23582, orderStepsCount: 11, orderSteps: Array(11), stepsCount: 11, orderStepsHookKeys: Array(24), …}
    installHook.js:1 TaskList Debug: {orderPhaseId: 23582, orderStepsCount: 11, orderSteps: Array(11), stepsCount: 11, orderStepsHookKeys: Array(24), …}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step FPR: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:55:26.343Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step FPR: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:55:26.343Z', isCompleted: true}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step MTL: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step MTL: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step CSW: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:39:39.573Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step CSW: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:39:39.573Z', isCompleted: true}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BAS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BAS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step TNT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T03:00:47.173Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step TNT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T03:00:47.173Z', isCompleted: true}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step EDG: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step EDG: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step PPR: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step PPR: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BCS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BCS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step LYU: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step LYU: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step PRS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step PRS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    TaskList.tsx:26 TaskList Debug: {orderPhaseId: 23580, orderStepsCount: 4, orderSteps: Array(4), stepsCount: 4, orderStepsHookKeys: Array(24), …}
    installHook.js:1 TaskList Debug: {orderPhaseId: 23580, orderStepsCount: 4, orderSteps: Array(4), stepsCount: 4, orderStepsHookKeys: Array(24), …}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step FIN: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step FIN: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step PRT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-13T18:57:35.686Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step PRT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-13T18:57:35.686Z', isCompleted: true}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step SUB: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step SUB: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step SOC: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-13T18:57:40.337Z', isCompleted: true}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step SOC: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-13T18:57:40.337Z', isCompleted: true}
     TaskList Debug: {orderPhaseId: 23582, orderStepsCount: 11, orderSteps: Array(11), stepsCount: 11, orderStepsHookKeys: Array(24), …}
     TaskList Debug: {orderPhaseId: 23582, orderStepsCount: 11, orderSteps: Array(11), stepsCount: 11, orderStepsHookKeys: Array(24), …}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step FPR: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:55:26.343Z', isCompleted: true}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step FPR: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:55:26.343Z', isCompleted: true}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step MTL: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step MTL: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step CSW: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:39:39.573Z', isCompleted: true}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step CSW: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T02:39:39.573Z', isCompleted: true}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step BAS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step BAS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step TNT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T03:00:47.173Z', isCompleted: true}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step TNT: {hasOrderStep: true, orderStep: {…}, completedAt: '2025-08-15T03:00:47.173Z', isCompleted: true}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step EDG: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step EDG: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step PPR: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step PPR: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step BCS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step BCS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step LYU: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step LYU: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
     Step PRS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
     Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
     Task cache instance: undefined
    installHook.js:1 Step PRS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    TaskList.tsx:26 TaskList Debug: {orderPhaseId: 23581, orderStepsCount: 24, orderSteps: Array(24), stepsCount: 24, orderStepsHookKeys: Array(24), …}
    installHook.js:1 TaskList Debug: {orderPhaseId: 23581, orderStepsCount: 24, orderSteps: Array(24), stepsCount: 24, orderStepsHookKeys: Array(24), …}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BRT: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BRT: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step WTF: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step WTF: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step SND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step SND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step RTE: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step RTE: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step RND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step RND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step GND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step GND: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BLE: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BLE: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step GD2: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step GD2: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step FGD: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step FGD: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step DTS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step DTS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step DTN: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step DTN: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BWX: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BWX: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step FWX: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step FWX: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step FBB: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step FBB: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step TSK: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step TSK: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step MSK: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step MSK: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step PHO: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step PHO: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    TaskList.tsx:26 TaskList Debug: {orderPhaseId: 23578, orderStepsCount: 4, orderSteps: Array(4), stepsCount: 4, orderStepsHookKeys: Array(24), …}
    installHook.js:1 TaskList Debug: {orderPhaseId: 23578, orderStepsCount: 4, orderSteps: Array(4), stepsCount: 4, orderStepsHookKeys: Array(24), …}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step BTS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step BTS: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step CMD: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step CMD: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step FRM: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step FRM: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step MNT: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step MNT: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    TaskList.tsx:26 TaskList Debug: {orderPhaseId: 23579, orderStepsCount: 1, orderSteps: Array(1), stepsCount: 1, orderStepsHookKeys: Array(24), …}
    installHook.js:1 TaskList Debug: {orderPhaseId: 23579, orderStepsCount: 1, orderSteps: Array(1), stepsCount: 1, orderStepsHookKeys: Array(24), …}
    Task.tsx:24 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    Task.tsx:25 Task cache instance: undefined
    Task.tsx:88 Step LAB: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
    installHook.js:1 Task useOrderSteps methods: (24) ['name', 'items', 'facetResults', 'parentItem', 'isLoading', 'isCreating', 'isUpdating', 'isRemoving', 'pkTypes', 'locations', 'create', 'update', 'remove', 'all', 'one', 'allAction', 'allFacet', 'action', 'facet', 'find', 'findOne', 'set', 'allActions', 'allFacets']
    installHook.js:1 Task cache instance: undefined
    installHook.js:1 Step LAB: {hasOrderStep: true, orderStep: {…}, completedAt: null, isCompleted: false}
      // For multikey references, we assume that the primary key of the first key type is unique
  // and can be used to retrieve the composite item with just a PriKey<S>
  const primaryKeyType = referenceDefinition.kta[0];

  if (referenceDefinition.kta.length > 1) {
    logger.default(
      'Using multikey reference with PriKey assumption',
      {
        kta: referenceDefinition.kta,
        primaryKeyType,
        property: referenceDefinition.property,
        column: referenceDefinition.column
      }
    );

    // TODO: Add validation to check if the target Sequelize model has a unique primary key
    // This would require access to the models array to inspect model.primaryKeyAttributes
    // For now, we assume that the primary key for the primary key type is unique
    logger.default(
      'ASSUMPTION: The primary key for key type "%s" is unique and can be used to retrieve composite items',
      primaryKeyType
    );
  }

  // Check if dependencies exist
  if (!registry) {
    throw new Error(
      `This model definition has a reference definition, but the registry is not present. ` +
      `Reference property: '${referenceDefinition.property}', ` +
      `key types: [${referenceDefinition.kta.join(', ')}], column: '${referenceDefinition.column}'`
    );
  }

  // Find the Library.Instance for the key type
  const library: any = registry.get(referenceDefinition.kta as any);
  if (!library) {
    throw new Error(
      `This model definition has a reference definition, but the dependency is not present in registry. ` +
      `Reference property: '${referenceDefinition.property}', ` +
      `missing key type: '${primaryKeyType}', column: '${referenceDefinition.column}'`
    );
  }

  // Check if the column value is null - if so, skip the reference
  const columnValue = item[referenceDefinition.column];
  if (columnValue == null) {
    item[referenceDefinition.property] = null;
    return item;
  }

  // Create a PriKey using the column value from item
  // For multikey references, we use the primary key type (first in the kta array)
  const priKey: PriKey<string> = {
    kt: primaryKeyType,
    pk: columnValue
  };

  let referencedItem;

  if (context) {
    // Check if we already have this item cached
    if (context.isCached(priKey)) {
      logger.default('Using cached reference', { priKey, property: referenceDefinition.property });
      referencedItem = context.getCached(priKey);
    }
    // Check if this item is currently being loaded (circular dependency)
    else if (context.isInProgress(priKey)) {
      logger.default('Circular dependency detected, creating reference placeholder', {
        priKey,
        property: referenceDefinition.property
      });

      // Create a minimal reference object with just the key to break the cycle
      referencedItem = {
        key: priKey,
        // Add any other minimal properties that might be needed
        // This prevents infinite loops while still providing the key for identification
      };
    }
    else {
      // Mark this key as in progress before loading
      context.markInProgress(priKey);
      try {
        // Get the referenced item using the Library.Operations get method (context now managed internally)
        referencedItem = await library!.operations.get(priKey);

        // Cache the result
        context.setCached(priKey, referencedItem);
      } catch (error: any) {
        throw error; // Re-throw to maintain original behavior
      } finally {
        // Always mark as complete, even if there was an error
        context.markComplete(priKey);
      }
    }
  } else {
    // Fallback to original behavior if no context provided
    referencedItem = await library!.operations.get(priKey);
  }

  // TODO: In a Fjell-compliant implementation, this value should be stored in the ref property
  // For now, we'll just populate the property directly
  // Store the result in the property on item
  item[referenceDefinition.property] = referencedItem;

  return item;
}

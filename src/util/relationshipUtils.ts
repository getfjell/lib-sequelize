/* eslint-disable indent */
import { ModelStatic } from 'sequelize';

export interface RelationshipChainResult {
    success: boolean;
    path?: string;
    includes?: any[];
}

export interface RelationshipPathResult {
    found: boolean;
    path?: string;
    includes?: any[];
    isDirect?: boolean;
}

/**
 * Helper function to build relationship chain includes
 */
export const buildRelationshipChain = (
    targetModel: ModelStatic<any>,
    kta: string[],
    currentIndex: number,
    targetIndex: number
): RelationshipChainResult => {
    // Build the association path and validate relationships exist
    const associationParts: string[] = [];
    const modelChain: ModelStatic<any>[] = [targetModel];
    let currentModel = targetModel;

    // Validate that all associations exist and build model chain
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
        const intermediateType = kta[i];
        const associationName = intermediateType;

        if (!currentModel.associations || !currentModel.associations[associationName]) {
            return { success: false };
        }

        associationParts.push(associationName);
        currentModel = currentModel.associations[associationName].target;
        modelChain.push(currentModel);
    }

    // Build the full association path for the target field
    const targetPrimaryKey = currentModel.primaryKeyAttribute || 'id';
    const associationPath = `$${associationParts.join('.')}.${targetPrimaryKey}$`;

    // Build nested includes structure iteratively (clearer than recursion)
    let deepestInclude: any = null;

    // Build from the deepest level back to the root
    for (let i = targetIndex; i > currentIndex; i--) {
        const currentType = kta[i];
        const modelIndex = i - currentIndex;

        const includeObj: any = {
            model: modelChain[modelIndex],
            as: currentType,
            required: true
        };

        if (deepestInclude) {
            includeObj.include = [deepestInclude];
        }

        deepestInclude = includeObj;
    }

    const includes = deepestInclude ? [deepestInclude] : [];

    return { success: true, path: associationPath, includes };
};

/**
 * Helper function to build relationship path for a locator
 * @param includeIsDirect Whether to include the isDirect flag in the result
 */
export const buildRelationshipPath = (
    targetModel: ModelStatic<any>,
    locatorType: string,
    kta: string[],
    includeIsDirect: boolean = false
): RelationshipPathResult => {

    // First check if the field exists directly
    const directFieldName = `${locatorType}Id`;
    const attributes = targetModel.getAttributes();
    if (attributes && attributes[directFieldName]) {
        const result: RelationshipPathResult = { found: true };
        if (includeIsDirect) {
            result.isDirect = true;
        }
        return result;
    }

    // If not direct, look for relationship path
    const targetIndex = kta.indexOf(locatorType);
    if (targetIndex === -1) {
        const result: RelationshipPathResult = { found: false };
        if (includeIsDirect) {
            result.isDirect = false;
        }
        return result;
    }

    const currentIndex = 0; // We're always looking from the base model

    if (targetIndex <= currentIndex) {
        const result: RelationshipPathResult = { found: false };
        if (includeIsDirect) {
            result.isDirect = false;
        }
        return result;
    }

    const chainResult = buildRelationshipChain(targetModel, kta, currentIndex, targetIndex);
    if (chainResult.success) {
        const result: RelationshipPathResult = {
            found: true,
            path: chainResult.path,
            includes: chainResult.includes
        };
        if (includeIsDirect) {
            result.isDirect = false;
        }
        return result;
    }

    const result: RelationshipPathResult = { found: false };
    if (includeIsDirect) {
        result.isDirect = false;
    }
    return result;
};

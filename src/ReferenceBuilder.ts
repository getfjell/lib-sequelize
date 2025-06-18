import { ReferenceDefinition } from "./Options";
import { PriKey } from "@fjell/core";
import * as Library from "@fjell/lib";

export const buildReference = async (
  item: any,
  referenceDefinition: ReferenceDefinition,
  registry: Library.Registry
) => {
  // Check if there is more than one key type
  if (referenceDefinition.kta.length > 1) {
    throw new Error("The ReferenceBuilder doesn't work with more than one key type yet");
  }

  // Check if dependencies exist
  if (!registry) {
    throw new Error("This model definition has a reference definition, but the registry is not present");
  }

  // Find the Library.Instance for the key type
  const library: Library.Instance<any, any, any, any, any, any, any> | null = registry.get(referenceDefinition.kta);
  if (!library) {
    throw new Error("This model definition has a reference definition, but the dependency is not present");
  }

  // Create a PriKey using the column value from item
  const priKey: PriKey<string> = {
    kt: referenceDefinition.kta[0],
    pk: item[referenceDefinition.column]
  };

  // Get the referenced item using the Library.Operations get method
  const referencedItem = await library!.operations.get(priKey);

  // TODO: In a Fjell-compliant implementation, this value should be stored in the ref property
  // For now, we'll just populate the property directly
  // Store the result in the property on item
  item[referenceDefinition.property] = referencedItem;

  return item;
}
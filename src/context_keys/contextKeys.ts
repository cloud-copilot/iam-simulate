import { ConditionKey, iamConditionKeyDetails, iamConditionKeyExists, iamConditionKeysForService, iamServiceExists } from "@cloud-copilot/iam-data";
import { getGlobalConditionKeyWithOrWithoutPrefix, getVariableGlobalConditionKeyByPrefix, globalConditionKeyExists } from "../global_conditions/globalConditionKeys.js";
import { ConditionKeyType } from "./contextKeyTypes.js";

/**
 * Check if a context key actually exists
 *
 * @param key The context key to check
 * @returns true if the context key is valid, false otherwise
 */
export async function isActualContextKey(key: string): Promise<boolean> {
  if(key.includes("/")) {
    return isActualContextKeyWithVariable(key);
  }
  if(globalConditionKeyExists(key)) {
    return true;
  }
  const parts = key.split(":");
  if(parts.length !== 2) {
    return false;
  }
  const [service, action] = parts;
  const serviceExists = await iamServiceExists(service);

  if(!serviceExists) {
    return false;
  }

  const actionExists = await iamConditionKeyExists(service, key);
  return actionExists;
}

/**
 * Checks if a context key with a variable in it is a valid context key
 */
async function isActualContextKeyWithVariable(key: string): Promise<boolean> {
  const slashLocation = key.indexOf("/");
  const prefix = key.slice(0, slashLocation);

  const globalKey = getVariableGlobalConditionKeyByPrefix(prefix);
  if(globalKey) {
    return true;
  }

  const serviceKey = await serviceContextKeyDetails(key);
  return !!serviceKey;
}

/**
 * Takes context key and returns the details for it, accounting for any variables in the key
 *
 * @param contextKey The context key to get the details for
 * @returns The details for the context key if it exists. if the key has variables in it it will return the details for the variable key
 */
async function serviceContextKeyDetails(contextKey: string): Promise<ConditionKey | undefined> {
  const [service, key] = contextKeyParts(contextKey.toLowerCase());

  const serviceExists = await iamServiceExists(service);
  if(!serviceExists) {
    return undefined;
  }

  if(key.includes("/")) {
    const prefix = service + ":" + key.slice(0, key.indexOf("/") + 1);
    const allConditionsKeys = await iamConditionKeysForService(service);
    const matchingKey = allConditionsKeys.find(k => k.toLowerCase().startsWith(prefix));
    if(matchingKey) {
      return await iamConditionKeyDetails(service, matchingKey);
    }
    return undefined
  }

  const exists = await iamConditionKeyExists(service, contextKey);
  if(!exists) {
    return undefined;
  }
  return iamConditionKeyDetails(service, contextKey);
}

/**
 * Split a context key into the service and the rest of the key. This has to be a special
 * method because context keys with variables may have a colon in the variable section,
 * because of course they can.
 *
 * @param contextKey The context key to split
 * @returns A tuple with the service and the rest of the key
 */
export function contextKeyParts(contextKey: string): [string, string] {
  const colonIndex = contextKey.indexOf(":");
  return [contextKey.slice(0, colonIndex), contextKey.slice(colonIndex + 1)]
}

/**
 * Check the capitalization of a context key and return the correct capitalization
 *
 * @param contextKey the condition key to check
 * @returns if the condition key is an array type
 */
export async function normalizeContextKeyCase(contextKey: string): Promise<string> {
  const serviceKey = await serviceContextKeyDetails(contextKey);
  if(serviceKey) {
    return replaceVariableInContextKey(serviceKey.key, contextKey)
  }

  const globalConditionKey = getGlobalConditionKeyWithOrWithoutPrefix(contextKey);
  if(globalConditionKey) {
    return replaceVariableInContextKey(globalConditionKey.key, contextKey)
  }

  throw new Error(`Context key ${contextKey} not found`);
}

/**
 * Replaces a variable in a context key with the actual value from a policy
 *
 * @param specKey the string value of the condition key spec
 * @param actualKey the string value of the condition key in the policy
 * @returns the spec condition key with the variable portion replaced with the actual value
 */
function replaceVariableInContextKey(specKey: string, actualKey: string): string {
  const slashIndex = specKey.indexOf("/")
  if(slashIndex === -1) {
    return specKey
  }
  const prefix = specKey.slice(0, slashIndex)
  const suffix = actualKey.slice(slashIndex)
  return prefix + suffix
}

/**
 * Get the type of a context key
 *
 * @param contextKey - The string condition key to get the type for
 * @returns The type of the condition key
 * @throws an error if the condition key is not found
 */
export async function typeForContextKey(contextKey: string): Promise<ConditionKeyType> {
  const globalConditionKey = getGlobalConditionKeyWithOrWithoutPrefix(contextKey);
  if(globalConditionKey) {
    return globalConditionKey.dataType as ConditionKeyType;
  }

  const keyDetails = await serviceContextKeyDetails(contextKey)
  if(keyDetails) {
    return keyDetails.type as ConditionKeyType;
  }

  throw new Error(`Condition key ${contextKey} not found`);
}
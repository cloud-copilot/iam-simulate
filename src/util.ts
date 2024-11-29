import { ConditionKey, iamActionDetails, iamConditionKeyDetails, iamConditionKeyExists, iamConditionKeysForService, iamResourceTypeDetails, iamServiceExists, ResourceType } from '@cloud-copilot/iam-data'
import { ConditionKeyType } from './ConditionKeys.js'
import { getGlobalConditionKeyWithOrWithoutPrefix, getVariableGlobalConditionKeyByPrefix, globalConditionKeyExists } from './global_conditions/globalConditionKeys.js'
import { AwsRequest } from './request/request.js'

const matchesNothing = new RegExp('a^')

interface StringReplaceOptions {
  replaceWildcards: boolean
}

const defaultStringReplaceOptions: StringReplaceOptions = {
  replaceWildcards: true
}

/**
 * This will convert a string to a regex that can be used to match against a string.
 * This will replace any variables in the string with the value of the variable in the request context.
 *
 * @param value the string to convert to a regex
 * @param requestContext the request context to get the variable values from
 * @returns a regex that can be used to match against a string
 */
export function convertIamStringToRegex(value: string, request: AwsRequest, replaceOptions?: Partial<StringReplaceOptions>): RegExp {
  const options = {...defaultStringReplaceOptions, ...replaceOptions}

  let invalidVariableFound = false
  const newValue = value.replaceAll(/(\$\{.*?\})|(\*)|(\?)/ig, (match, args) => {
    if (match == "?") {
      return replacementValue('\\?', '.', options.replaceWildcards)
      // return '.'
    } else if (match == "*") {
      return replacementValue('\\*', ".*?", options.replaceWildcards)
      // return ".*?"
    } else if (match == "${*}") {
      return replacementValue("\\$\\{\\*\\}", "\\*", options.replaceWildcards)
      // return "\\*"
    } else if (match == "${?}") {
      return replacementValue("\\$\\{\\?\\}", "\\?", options.replaceWildcards)
      // return "\\?"
    } else if (match == "${$}") {
      return replacementValue("\\$\\{\\$\\}", "\\$", options.replaceWildcards)
      // return "\\$"
    }
    //
    //This means it'a a variable
    const inTheBrackets = match.slice(2, -1)

    let defaultValue = undefined
    const defaultParts = inTheBrackets.split(', ')
    if(defaultParts.length == 2) {
      const segmentAfterComma = defaultParts.at(1)
      if(segmentAfterComma?.startsWith("'") && segmentAfterComma.endsWith("'")) {
        defaultValue = segmentAfterComma.slice(1, -1)
      }
    }
    const variableName = defaultParts.at(0)!.trim()

    const requestValue = getContextSingleValue(request, variableName)

    if(requestValue) {
      return escapeRegexCharacters(requestValue)
    } else if(defaultValue) {
      /*
        TODO: What happens in a request if a multi value context key is used in a string and there
        is a default value? Will it use the default value or will it fail the condition test?
      */
      return escapeRegexCharacters(defaultValue)
    } else {
      invalidVariableFound = true
      /*
      https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#policy-vars-no-value
      */
      return "--undefined---"
    }

    throw new Error('This should never happen')
  })

  if(invalidVariableFound) {
    return matchesNothing
  }
  return new RegExp('^' + newValue + '$')
}

/**
 * Replace regex characters in a string with their escaped versions
 *
 * @param str the string to escape regex characters in
 * @returns the string with regex characters escaped
 */
function escapeRegexCharacters(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get the string value of a context key only if it is a single value key
 *
 * @param requestContext the request context to get the value from
 * @param contextKeyName the name of the context key to get the value of
 * @returns the value of the context key if it is a single value key, undefined otherwise
 */
function getContextSingleValue(request: AwsRequest, contextKeyName: string): string | undefined {
  if(!request.contextKeyExists(contextKeyName)) {
    return undefined
  }
  const keyValue = request.getContextKeyValue(contextKeyName)
  if(keyValue.isStringValue()) {
    return keyValue.value
  }

  return undefined
}

/**
 * Get the replacement value for a string
 *
 * @param rawString the string to replace the value in
 * @param wildcard the value to replace the wildcard with
 * @param replaceWildcards if the wildcard or raw string should be used
 * @returns
 */
function replacementValue(rawString: string, wildcard: string, replaceWildcards: boolean): string {
  if(replaceWildcards) {
    return wildcard
  }
  return rawString
}

export interface ArnParts {
  partition: string | undefined
  service: string | undefined
  region: string | undefined
  accountId: string | undefined
  resource: string | undefined
  resourceType: string | undefined
  resourcePath: string | undefined
}

/**
 * Split an ARN into its parts
 *
 * @param arn the arn to split
 * @returns the parts of the ARN
 */
export function splitArnParts(arn: string): ArnParts {
  const parts = arn.split(':')
  const partition = parts.at(1)
  const service = parts.at(2)
  const region = parts.at(3)
  const accountId = parts.at(4)
  const resource = parts.slice(5).join(":")

  let resourceType = undefined
  let resourcePath = undefined
  if(resource?.includes('/') || resource?.includes(':')) {
    const [resourceTypeSegment, resourcePathSegment] = getResourceSegments(resource)
    resourceType = resourceTypeSegment
    resourcePath = resourcePathSegment
  }

  return {
    partition,
    service,
    region,
    accountId,
    resource,
    resourceType,
    resourcePath
  }
}

/**
 * Splits a resource into two segments. The first segment is the product segment and the second segment is the resource id segment.
 * This could be split by a colon or a slash, so it checks for both.
 *
 * @param resource The resource to split
 * @returns a tuple with the first segment being the product segment (including the separator) and the second segment being the resource id.
 */
export function getResourceSegments(resource: string): [string, string] {
  const slashIndex = resource.indexOf('/')
  const colonIndex = resource.indexOf(':')

  let splitIndex = slashIndex
  if(slashIndex != -1 && colonIndex != -1) {
    splitIndex = Math.min(slashIndex, colonIndex) + 1
  } else if (colonIndex == -1) {
    splitIndex = slashIndex + 1
  } else if (slashIndex == -1) {
    splitIndex = colonIndex + 1
  } else {
    throw new Error(`Unable to split resource ${resource}`)
  }

  return [resource.slice(0, splitIndex), resource.slice(splitIndex)]
}

/**
 * Checks if a value is defined and not null and narrows the type to the defined type
 *
 * @param value the value to check if it is defined
 * @returns if the value is defined and not null
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined && value !== null;
}

/**
 * Checks if a value is not defined or null
 *
 * @param value the value to check if it is not defined
 * @returns if the value is not defined or null
 */
export function isNotDefined<T>(value: T | undefined): value is undefined {
  return !isDefined(value)
}

/**
 * Checks if an action is a wildcard only action
 *
 * @param service the service the action belongs to
 * @param action the action to check if it is a wildcard only action
 * @returns if the action is a wildcard only action
 * @throws an error if the service or action does not exist
 */
export async function isWildcardOnlyAction(service: string, action: string): Promise<boolean> {
  const actionDetails = await iamActionDetails(service, action)
  return actionDetails.resourceTypes.length === 0
}

/**
 * Get the the possible reource types for an action and resource
 *
 * @param service the service the action belongs to
 * @param action the action to get the resource type for
 * @param resource the resource type matching the action, if any
 * @throws an error if the service or action does not exist, or if the action is a wildcard only action
 */
export async function getResourceTypesForAction(service: string, action: string, resource: string): Promise<ResourceType[]> {
  const actionDetails = await iamActionDetails(service, action)
  if(actionDetails.resourceTypes.length === 0) {
    throw new Error(`${service}:${action} does not have any resource types`)
  }

  const matchingResourceTypes: ResourceType[] = [];
  for(const rt of actionDetails.resourceTypes) {
    const resourceType = await iamResourceTypeDetails(service, rt.name);
    const pattern = convertResourcePatternToRegex(resourceType.arn);
    const match = resource.match(new RegExp(pattern));
    if(match) {
      matchingResourceTypes.push(resourceType);
    }
  }

  return matchingResourceTypes
}

/**
 * Convert a resource pattern from iam-data to a regex pattern
 *
 * @param pattern the pattern to convert to a regex
 * @returns the regex pattern
 */
export function convertResourcePatternToRegex(pattern: string): string {
  const regex = pattern.replace(/\$\{.*?\}/g, (match) => {
    const name = match.substring(2, match.length - 1)
    const camelName = name.at(0)?.toLowerCase() + name.substring(1)
    return `(?<${camelName}>(.*?))`
  })
  return `^${regex}$`
}

/**
 * Lowercase all strings in an array
 *
 * @param strings the strings to lowercase
 * @returns the lowercased strings
 */
export function lowerCaseAll(strings: string[]): string[] {
  return strings.map(s => s.toLowerCase())
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

  const [service, key] = contextKey.split(":");
  const serviceKeyExists = await iamConditionKeyExists(service, contextKey);
  if(serviceKeyExists) {
    const keyDetails = await iamConditionKeyDetails(service, contextKey);
    return keyDetails.type as ConditionKeyType;
  }
  throw new Error(`Condition key ${contextKey} not found`);
}

/**
 * Gets the IAM variables from a string
 *
 * @param value the string to get the variables from
 * @returns the variables in the string, if any
 */
export function getVariablesFromString(value: string): string[] {
  const matches = value.match(/\$\{.*?\}/g)
  if(matches) {
    return matches.map((m) => {
      const inBrackets = m.slice(2, -1)
      if(inBrackets.includes(',')) {
        return inBrackets.split(',')[0].trim()
      }
      return inBrackets
    })
  }
  return []
}

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
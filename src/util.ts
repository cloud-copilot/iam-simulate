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
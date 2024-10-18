import { Request } from './request/request.js'

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
export function convertIamStringToRegex(value: string, request: Request, replaceOptions?: Partial<StringReplaceOptions>): RegExp {
  const options = {...defaultStringReplaceOptions, ...replaceOptions}

  let invalidVariableFound = false
  const newValue = value.replaceAll(/(\$\{.*?\})|(\*)|(\?)/ig, (match, args) => {
    if(match == "?") {
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
      return requestValue
    } else if(defaultValue) {
      /*
        TODO: What happens in a request if a multi value context key is used in a string and there
        is a default value? Will it use the default value or will it fail the condition test?
      */
      return defaultValue
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
 * Get the string value of a context key only if it is a single value key
 *
 * @param requestContext the request context to get the value from
 * @param contextKeyName the name of the context key to get the value of
 * @returns the value of the context key if it is a single value key, undefined otherwise
 */
function getContextSingleValue(request: Request, contextKeyName: string): string | undefined {
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

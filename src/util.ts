import { RequestContext } from "./requestContext.js"


export function convertIamStringToRegex(value: string, requestContext: RequestContext): RegExp {

  const newValue = value.replaceAll(/(\$\{.*?\})|(\*)|(\?)/ig, (match, args) => {
    console.log(match)
    if(match == "?" ) {
      return '.'
    } else if (match == "*") {
      return ".*?"
    } else if (match == "${*}") {
      return "\*"
    } else if (match == "${?}") {
      return "\?"
    } else if (match == "${$}") {
      return "\$"
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

    console.log(variableName)
    const requestValue = getContextSingleValue(requestContext, variableName)

    if(requestValue) {
      return requestValue
    } else if(defaultValue) {
      return defaultValue
    } else {
      /*
      TODO: Figure out what IAM does if the variables does not exist, will it replace it with an
      empty string or fail the condition test completely? For instance could try this out with an
      s3:prefix condition and a principaltag to see if it collapses it to an empty string.
      */
      return "--undefined---"
    }

    throw new Error('This should never happen')
  })

  return new RegExp('^' + newValue + '$')
}

// const value =  "abcd${$}ef*dkd?39dj${*}fjfrur${aws:PrincipalTag/foo, 'defaultfoo'}adjd${$}ajdjd${aws:ResourceTag}"
// // let value2 =

// const variables = value.replaceAll(/\$\{.*?\}/g, (match) => {
//   let defaultValue: string | undefined = undefined
//   const defaultMatch = match.match(/,\s'(.*)'/)
// })

/**
 * Get the string value of a context key only if it is a single value key
 *
 * @param requestContext the request context to get the value from
 * @param contextKeyName the name of the context key to get the value of
 * @returns the value of the context key if it is a single value key, undefined otherwise
 */
function getContextSingleValue(requestContext: RequestContext, contextKeyName: string): string | undefined {
  if(!requestContext.contextKeyExists(contextKeyName)) {
    return undefined
  }
  const keyValue = requestContext.contextKeyValue(contextKeyName)
  if(keyValue.isStringValue()) {
    return keyValue.value
  }

  return undefined
}

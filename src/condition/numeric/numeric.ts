import { ConditionValueExplain } from "../../explain/statementExplain.js"
import { isNotDefined } from "../../util.js"

/**
 * Parse a string to a number, returns undefined if the string is not a number
 *
 * @param value the string to parse
 * @returns the number or undefined
 */
export function parseNumber(value: string): number | undefined {
  let number: number | undefined = undefined
  if(value.includes('.')) {
    number = parseFloat(value)
  } else {
    number = parseInt(value, 10)
  }
  if(isNotDefined(number) || isNaN(number)) {
    return undefined
  }

  return number
}

/**
 * Test two values to see if they are numbers, if they are, run the check function
 *
 * @param policyValue
 * @param testValue
 * @param check
 * @returns
 */
export function checkIfNumeric(policyValue: string, testValue: string, check: (policyValue: number, testValue: number) => boolean): ConditionValueExplain {
  const policyNumber = parseNumber(policyValue)
  const testNumber = parseNumber(testValue)
  if(isNotDefined(policyNumber)) {
    return {
      value: policyValue,
      matches: false,
      errors: [`${policyValue} is not a number`]
    }
  }
  if(isNotDefined(testNumber)) {
    return {
      value: policyValue,
      matches: false,
      errors: [`request value '${testValue}' is not a number`]
    }
  }

  const matches = check(policyNumber, testNumber)
  return {
    value: policyValue,
    matches,
  }
}
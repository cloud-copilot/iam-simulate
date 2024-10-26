import { isDefined, isNotDefined } from "../../util.js"

/**
 * Parse a string to an epoch date value
 *
 * @param value the string to parse
 * @returns the number or undefined if it cannot be parsed
 */
export function parseDate(value: string): number | undefined {
  // An Integer such as 2024 will be interpreted as a unix epoch date
  // A unix epoch date
  const epochDate = parseInt(value, 10)
  if(isDefined(epochDate) && !isNaN(epochDate) && epochDate.toString() === value) {
    return epochDate
  }

  // Date Values can be a date string: https://www.w3.org/TR/NOTE-datetime
  const dateNumber = Date.parse(value)
  if(isDefined(dateNumber) && !isNaN(dateNumber)) {
    return dateNumber
  }



  return undefined
}

/**
 * Test two values to see if they are dates or date epochs, if they are, run the check function
 *
 * @param policyValue
 * @param testValue
 * @param check
 * @returns
 */
export function checkIfDate(policyValue: string, testValue: string, check: (policyValue: number, testValue: number) => boolean): boolean {
  const policyNumber = parseDate(policyValue)
  const testNumber = parseDate(testValue)
  if(isNotDefined(policyNumber) || isNotDefined(testNumber)) {
    return false
  }
  return check(policyNumber, testNumber)
}
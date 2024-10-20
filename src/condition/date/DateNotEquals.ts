import { isDefined, isNotDefined } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { parseDate } from "./date.js";

export const DateNotEquals: BaseConditionOperator = {
  name: 'DateNotEquals',
  matches: (request, keyValue, policyValues) => {
    //How does this behave with malformed numbers
    // return !NumericEquals.matches(request, keyValue, policyValues)
    // const numericMatch =  policyValues.some(policyValue => {
    //   return checkIfNumeric(policyValue, keyValue, (policyNumber, testNumber) => {
    //     return policyNumber == testNumber
    //   })
    // })
    const requestValue = parseDate(keyValue)
    if(isNotDefined(requestValue)) {
      return false
    }
    const policyNumbers = policyValues.map(value => parseDate(value)).filter(value => isDefined(value))
    if(policyNumbers.length === 0) {
      return false
    }
    return !policyNumbers.some(policyNumber => policyNumber == requestValue)
  },
  allowsVariables: false,
  allowsWildcards: false
}
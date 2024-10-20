import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { checkIfNumeric } from "./numeric.js";

export const NumericEquals: BaseConditionOperator = {
  name: 'NumericEquals',

  matches: (request, keyValue, policyValues) => {
    return policyValues.some(policyValue => {
      return checkIfNumeric(policyValue, keyValue, (policyNumber, testNumber) => {
        return policyNumber == testNumber
      })
    })
  },
  allowsVariables: false,
  allowsWildcards: false
}
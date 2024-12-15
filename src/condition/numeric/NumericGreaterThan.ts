import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { checkIfNumeric } from "./numeric.js";

export const NumericGreaterThan: BaseConditionOperator = {
  name: 'NumericGreaterThan',
  matches: (request, keyValue, policyValues) => {
    const explains = policyValues.map(policyValue => {
      return checkIfNumeric(policyValue, keyValue, (policyNumber, testNumber) => {
        return policyNumber > testNumber
      })
    })

    return {
      matches: explains.some(explain => explain.matches),
      explains
    }
  },
  allowsVariables: false,
  allowsWildcards: false
}
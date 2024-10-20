
import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { checkIfDate } from "./date.js";

export const DateGreaterThanEquals: BaseConditionOperator = {
  name: 'DateGreaterThanEquals',

  matches: (request, keyValue, policyValues) => {
    return policyValues.some(policyValue => {
      return checkIfDate(policyValue, keyValue, (policyEpoch, requestEpoch) => {
        return policyEpoch <= requestEpoch
      })
    })
  },
  allowsVariables: false,
  allowsWildcards: false
}
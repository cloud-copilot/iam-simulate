import { convertIamStringToRegex } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";

export const StringEqualsIgnoreCase: BaseConditionOperator = {
  name: 'StringEqualsIgnoreCase',
  matches: (request, keyValue, policyValues) => {
    const patterns = policyValues.map(value => {
      const pattern = convertIamStringToRegex(value, request, {replaceWildcards: false})
      return new RegExp(pattern, 'i')
    })
    return patterns.some(pattern => pattern.test(keyValue))
  },
  allowsVariables: true,
  allowsWildcards: false
}
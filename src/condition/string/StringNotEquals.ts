import { convertIamStringToRegex } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";

export const StringNotEquals: BaseConditionOperator = {
  name: 'StringNotEquals',
  matches: (request, keyValue, policyValues) => {
    const patterns = policyValues.map(value => convertIamStringToRegex(value, request, {replaceWildcards: false}))
    return !patterns.some(pattern => pattern.test(keyValue))
  },
  allowsVariables: true,
  allowsWildcards: false
}
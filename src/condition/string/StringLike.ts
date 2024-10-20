import { convertIamStringToRegex } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";

export const StringLike: BaseConditionOperator = {
  name: 'StringLike',
  matches: (request, keyValue, policyValues) => {
    const patterns = policyValues.map(value => convertIamStringToRegex(value, request, {replaceWildcards: true}))
    return patterns.some(pattern => pattern.test(keyValue))
  },
  allowsVariables: true,
  allowsWildcards: true
}
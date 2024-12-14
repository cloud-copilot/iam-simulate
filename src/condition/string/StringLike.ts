import { convertIamString } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";

export const StringLike: BaseConditionOperator = {
  name: 'StringLike',
  matches: (request, keyValue, policyValues) => {
    const patterns = policyValues.map(value => convertIamString(value, request, {replaceWildcards: true}).pattern)
    return patterns.some(pattern => pattern.test(keyValue))
  },
  allowsVariables: true,
  allowsWildcards: true
}
import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { StringLike } from "./StringLike.js";

export const StringNotLike: BaseConditionOperator = {
  name: 'StringNotLike',
  matches: (request, keyValue, policyValues) => {
    return !StringLike.matches(request, keyValue, policyValues)
  },
  allowsVariables: true,
  allowsWildcards: true
}
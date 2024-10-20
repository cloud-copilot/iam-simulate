import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { ArnLike } from "./ArnLike.js";

export const ArnNotLike: BaseConditionOperator = {
  name: 'ArnNotLike',
  matches: (request, keyValue, policyValues) => {
    return !ArnLike.matches(request, keyValue, policyValues)
  },
  allowsVariables: true,
  allowsWildcards: true
}

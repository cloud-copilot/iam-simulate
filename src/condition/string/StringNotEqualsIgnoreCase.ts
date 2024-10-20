import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { StringEqualsIgnoreCase } from "./StringEqualsIgnoreCase.js";

export const StringNotEqualsIgnoreCase: BaseConditionOperator = {
  name: 'StringNotEqualsIgnoreCase',
  matches: (request, keyValue, policyValues) => {
    return !StringEqualsIgnoreCase.matches(request, keyValue, policyValues)
  },
  allowsVariables: true,
  allowsWildcards: false
}
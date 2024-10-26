import { BaseConditionOperator } from "../BaseConditionOperator.js";

/**
 * For Binary we don't really have the ability to accept binary
 * values right now, so just do a string match.
 */
export const BinaryEquals: BaseConditionOperator = {
  name: 'BinaryEquals',
  matches: (request, keyValue, policyValues) => {
    return policyValues.includes(keyValue);
  },
  allowsVariables: true,
  allowsWildcards: false
}
import { convertIamString } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";

export const Bool: BaseConditionOperator = {
  name: 'Bool',
  matches: (request, keyValue, policyValues) => {
    return policyValues.some(policyValue => {
      const {pattern, errors} = convertIamString(policyValue, request, {replaceWildcards: false})
      const lowercasePattern = pattern.source.toLowerCase()
      if(lowercasePattern != '^true$' && lowercasePattern != '^false$') {
        return false
      }
      return new RegExp(pattern, 'i').test(keyValue)
    })
  },
  allowsVariables: true,
  allowsWildcards: false
}
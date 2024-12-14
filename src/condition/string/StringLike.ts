import { ConditionValueExplain } from "../../explain/statementExplain.js";
import { convertIamString } from "../../util.js";
import { BaseConditionOperator } from "../BaseConditionOperator.js";

export const StringLike: BaseConditionOperator = {
  name: 'StringLike',
  matches: (request, keyValue, policyValues) => {
    // const patterns = policyValues.map(value => convertIamString(value, request, {replaceWildcards: true}).pattern)
    // return patterns.some(pattern => pattern.test(keyValue))

    const explains: ConditionValueExplain[] = policyValues.map((value) => {
      const {pattern, errors} = convertIamString(value, request, {replaceWildcards: true})
      if(errors && errors.length > 0) {
        return {
          value,
          matches: false,
          errors
        }
      }

      const resolvedValue = convertIamString(value, request, {replaceWildcards: false, convertToRegex: false})
      const matches = pattern.test(keyValue)
      return {
        value,
        matches,
        resolvedValue: resolvedValue !== value ? resolvedValue : undefined,
      }
    })


    const overallMatch = explains.some(explain => explain.matches)
    return {
      matches: overallMatch,
      explains
    }

  },
  allowsVariables: true,
  allowsWildcards: true
}
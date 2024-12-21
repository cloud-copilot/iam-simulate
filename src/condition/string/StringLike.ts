import { ConditionValueExplain } from '../../explain/statementExplain.js'
import { convertIamString } from '../../util.js'
import { BaseConditionOperator } from '../BaseConditionOperator.js'
import { resolvedValue } from '../conditionUtil.js'

export const StringLike: BaseConditionOperator = {
  name: 'StringLike',
  matches: (request, keyValue, policyValues) => {
    const explains: ConditionValueExplain[] = policyValues.map((value) => {
      const { pattern, errors } = convertIamString(value, request, { replaceWildcards: true })
      if (errors && errors.length > 0) {
        return {
          value,
          matches: false,
          errors
        }
      }

      const matches = pattern.test(keyValue)
      return {
        value,
        matches,
        resolvedValue: resolvedValue(value, request)
      }
    })

    const overallMatch = explains.some((explain) => explain.matches)
    return {
      matches: overallMatch,
      explains
    }
  },
  allowsVariables: true,
  allowsWildcards: true,
  isNegative: false
}

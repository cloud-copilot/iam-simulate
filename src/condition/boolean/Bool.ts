import { type ConditionValueExplain } from '../../explain/statementExplain.js'
import { convertIamString } from '../../util.js'
import { type BaseConditionOperator } from '../BaseConditionOperator.js'

export const Bool: BaseConditionOperator = {
  name: 'Bool',
  matches: (request, keyValue, policyValues) => {
    const explains: ConditionValueExplain[] = policyValues.map((policyValue) => {
      const { pattern, errors } = convertIamString(policyValue, request, {
        replaceWildcards: false
      })
      if (errors && errors.length > 0) {
        return {
          value: policyValue,
          matches: false,
          errors
        }
      }

      const resolvedValue = convertIamString(policyValue, request, {
        replaceWildcards: false,
        convertToRegex: false
      })
      const lowercaseResolvedValue = resolvedValue.toLowerCase()

      if (lowercaseResolvedValue != 'true' && lowercaseResolvedValue != 'false') {
        return {
          matches: false,
          value: policyValue,
          errors: ['Invalid boolean pattern'],
          resolvedValue: resolvedValue == policyValue ? undefined : resolvedValue
        }
      }

      if (keyValue.toLowerCase() != 'true' && keyValue.toLowerCase() != 'false') {
        return {
          matches: false,
          value: policyValue,
          errors: [`request value '${keyValue}' is not a boolean`]
        }
      }

      return {
        matches: new RegExp(pattern, 'i').test(keyValue),
        value: policyValue,
        resolvedValue: resolvedValue == policyValue ? undefined : resolvedValue
      }
    })

    return {
      matches: explains.some((explain) => explain.matches),
      explains
    }
  },
  allowsVariables: true,
  allowsWildcards: false,
  isNegative: false
}

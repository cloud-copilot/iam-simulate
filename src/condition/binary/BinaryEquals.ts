import { ConditionValueExplain } from '../../explain/statementExplain.js'
import { BaseConditionOperator } from '../BaseConditionOperator.js'
import { resolvedValue } from '../conditionUtil.js'

/**
 * For Binary we don't really have the ability to accept binary
 * values right now, so just do a string match.
 */
export const BinaryEquals: BaseConditionOperator = {
  name: 'BinaryEquals',
  matches: (request, keyValue, policyValues) => {
    const explains: ConditionValueExplain[] = policyValues.map((policyValue) => {
      return {
        value: policyValue,
        matches: policyValue === keyValue,
        resolvedValue: resolvedValue(policyValue, request)
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

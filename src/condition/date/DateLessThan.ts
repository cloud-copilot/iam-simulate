import { type BaseConditionOperator } from '../BaseConditionOperator.js'
import { checkIfDate } from './date.js'

export const DateLessThan: BaseConditionOperator = {
  name: 'DateLessThan',

  matches: (request, keyValue, policyValues) => {
    const explains = policyValues.map((policyValue) => {
      return checkIfDate(policyValue, keyValue, (policyEpoch, requestEpoch) => {
        return policyEpoch > requestEpoch
      })
    })

    return {
      matches: explains.some((explain) => explain.matches),
      explains
    }
  },
  allowsVariables: false,
  allowsWildcards: false,
  isNegative: false
}

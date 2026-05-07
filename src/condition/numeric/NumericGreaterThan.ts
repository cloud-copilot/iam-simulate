import { type BaseConditionOperator } from '../BaseConditionOperator.js'
import { checkIfNumeric } from './numeric.js'

export const NumericGreaterThan: BaseConditionOperator = {
  name: 'NumericGreaterThan',
  matches: (request, keyValue, policyValues) => {
    const explains = policyValues.map((policyValue) => {
      return checkIfNumeric(policyValue, keyValue, (policyNumber, testNumber) => {
        return testNumber > policyNumber
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

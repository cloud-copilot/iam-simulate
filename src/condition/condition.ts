import { Condition } from '@cloud-copilot/iam-policy';
import { Request } from '../request/request';
import { convertIamStringToRegex } from '../util.js';

export type ConditionMatchResult = 'Match' | 'NoMatch' | 'Unknown'

type operation = (request: Request, keyValue: string, policyValues: string[]) => boolean

const baseOperations: { [key: string]: operation } = {
  'stringequals': (request, keyValue, policyValues): boolean => {
    const patterns = policyValues.map(value => convertIamStringToRegex(value, request, {replaceWildcards: false}))
    return patterns.some(pattern => pattern.test(keyValue))
  },
  'stringnotequals': (request, keyValue, policyValues): boolean => {
    const patterns = policyValues.map(value => convertIamStringToRegex(value, request, {replaceWildcards: false}))
    return !patterns.some(pattern => pattern.test(keyValue))
  }
}

export function singleConditionMatchesRequest(request: Request, condition: Condition): ConditionMatchResult {
  const key = condition.conditionKey()
  const policyValues = condition.conditionValues()
  const baseOperation = baseOperations[condition.operation().baseOperator().toLowerCase()]
  const keyExists = request.contextKeyExists(key)
  const keyValue = keyExists ? request.getContextKeyValue(key) : undefined

  if(condition.operation().setOperator()) {
    const setOperator = condition.operation().setOperator()
    if(setOperator === 'ForAnyValue') {
      if(!keyExists || !keyValue || !keyValue.isArrayValue()) {
        return 'NoMatch'
      }

      if(!baseOperation) {
        return 'Unknown'
      }
      //Do the loop
      const anyMatch = keyValue.values.some(value => {
        return baseOperation(request, value, policyValues)
      })
      return anyMatch ? 'Match' : 'NoMatch'
    } else if (setOperator === 'ForAllValues') {
      if(!keyExists) {
        return 'Match'
      }
      if(!keyValue || !keyValue.isArrayValue()) {
        return 'NoMatch'
      }
      if(!baseOperation) {
        return 'Unknown'
      }
      //Do the loop
      const anyNotMatch = keyValue.values.some(value => {
        return !baseOperation(request, value, policyValues)
      })

      return anyNotMatch ? 'NoMatch' : 'Match'
    } else {
      throw new Error(`Unknown set operator: ${setOperator}`)
    }
  }

  if(condition.operation().isIfExists() || condition.operation().baseOperator().toLowerCase().includes('not')) {
    //Check if it exists, return true if it doesn't
    //Double check what happens here if the key is not a valid key or is of the wrong type
    if(!keyExists) {
      return 'Match'
    }
  }

  if(!keyValue || !keyValue.isStringValue()) {
    //Set operator is required for a multi-value key
    return 'NoMatch'
  }

  if(!baseOperation) {
    return 'Unknown'
  }
  const matches = baseOperation(request, keyValue.value, policyValues)
  return matches ? 'Match' : 'NoMatch'
}

import { Condition } from '@cloud-copilot/iam-policy';
import { AwsRequest } from '../request/request';
import { ArnEquals } from './arn/ArnEquals.js';
import { ArnLike } from './arn/ArnLike.js';
import { ArnNotEquals } from './arn/ArnNotEquals.js';
import { ArnNotLike } from './arn/ArnNotLike.js';
import { BaseConditionOperator } from './BaseConditionOperator.js';
import { BinaryEquals } from './binary/BinaryEquals.js';
import { Bool } from './boolean/Bool.js';
import { DateEquals } from './date/DateEquals.js';
import { DateGreaterThan } from './date/DateGreaterThan.js';
import { DateGreaterThanEquals } from './date/DateGreaterThanEquals.js';
import { DateLessThan } from './date/DateLessThan.js';
import { DateLessThanEquals } from './date/DateLessThanEquals.js';
import { DateNotEquals } from './date/DateNotEquals.js';
import { IpAddress } from './ipaddress/IpAddress.js';
import { NotIpAddress } from './ipaddress/NotIpAddress.js';
import { NumericEquals } from './numeric/NumericEquals.js';
import { NumericGreaterThan } from './numeric/NumericGreaterThan.js';
import { NumericGreaterThanEquals } from './numeric/NumericGreaterThanEquals.js';
import { NumericLessThan } from './numeric/NumericLessThan.js';
import { NumericNotEquals } from './numeric/NumericNotEquals.js';
import { StringEquals } from './string/StringEquals.js';
import { StringEqualsIgnoreCase } from './string/StringEqualsIgnoreCase.js';
import { StringLike } from './string/StringLike.js';
import { StringNotEquals } from './string/StringNotEquals.js';
import { StringNotEqualsIgnoreCase } from './string/StringNotEqualsIgnoreCase.js';
import { StringNotLike } from './string/StringNotLike.js';

export type ConditionMatchResult = 'Match' | 'NoMatch' | 'Unknown'

const allOperators = [
  StringEquals, StringNotEquals, StringEqualsIgnoreCase, StringNotEqualsIgnoreCase, StringLike, StringNotLike,
  NumericEquals, NumericNotEquals, NumericLessThan, NumericNotEquals, NumericGreaterThan, NumericGreaterThanEquals,
  DateEquals, DateNotEquals, DateLessThan, DateLessThanEquals, DateGreaterThan, DateGreaterThanEquals,
  Bool,
  BinaryEquals,
  IpAddress, NotIpAddress,
  ArnLike, ArnEquals, ArnNotLike, ArnNotEquals
]

const baseOperations: { [key: string]: BaseConditionOperator } = {}
for(const operator of allOperators) {
  baseOperations[operator.name.toLowerCase()] = operator
}

export function requestMatchesConditions(request: AwsRequest, conditions: Condition[]): ConditionMatchResult {
  const results = conditions.map(condition => singleConditionMatchesRequest(request, condition))
  const unknowns = results.filter(result => result === 'Unknown')
  if(unknowns.length > 0) {
    return 'Unknown'
  }
  const noMatches = results.filter(result => result === 'NoMatch')
  if(noMatches.length >0 ) {
    return 'NoMatch'
  }
  return 'Match'
}

export function singleConditionMatchesRequest(request: AwsRequest, condition: Condition): ConditionMatchResult {
  const key = condition.conditionKey()
  const policyValues = condition.conditionValues()
  const baseOperation = baseOperations[condition.operation().baseOperator().toLowerCase()]?.matches
  const keyExists = request.contextKeyExists(key)
  const keyValue = keyExists ? request.getContextKeyValue(key) : undefined

  if(condition.operation().value().toLowerCase() == 'null' || condition.operation().baseOperator()?.toLowerCase() == 'null') {
    return testNull(condition, keyExists)
  }

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

function testNull(condition: Condition, keyExists: boolean): ConditionMatchResult {
  const lowerCaseValues = condition.conditionValues().map(value => value.toLowerCase())
  if(keyExists) {
    return lowerCaseValues.includes('false') ? 'Match' : 'NoMatch'
  }

  return lowerCaseValues.includes('true') ? 'Match' : 'NoMatch'
}
import { Condition } from '@cloud-copilot/iam-policy';
import { ConditionExplain, ConditionValueExplain, StatementExplain } from '../explain/statementExplain.js';
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

export type ConditionMatchResult = 'Match' | 'NoMatch'

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

export function requestMatchesConditions(request: AwsRequest, conditions: Condition[]): { matches: ConditionMatchResult, details: Pick<StatementExplain, 'conditions'> } {
  const results = conditions.map(condition => singleConditionMatchesRequest(request, condition))
  // const unknowns = results.filter(result => result === 'Unknown')
  // if(unknowns.length > 0) {
  //   return 'Unknown'
  // }
  const nonMatch = results.some(result => !result.matches)
  return {
    matches: nonMatch ? 'NoMatch' : 'Match',
    details: {
      conditions: results
    }
  }
  // if(noMatches.length > 0 ) {
  //   return
  // }
  // return 'Match'
}

export function singleConditionMatchesRequest(request: AwsRequest, condition: Condition): ConditionExplain {
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
        return {
          operator: condition.operation().value(),
          conditionKeyValue: condition.conditionKey(),
          values: [],
          matches: false,
          failedBecauseMissing: !keyExists || !keyValue,
          failedBecauseNotArray: keyValue && !keyValue.isArrayValue()
        }
        // return 'NoMatch'
      }

      if(!baseOperation) {
        //TODO: This should return a nomatch rather than throw an error
        // throw new Error(`Unknown base operation: ${condition.operation().baseOperator()}`)
        return {
          operator: condition.operation().value(),
          conditionKeyValue: condition.conditionKey(),
          values: [],
          matches: false,
          missingOperator: true
        }
      }
      //Do the loop
      const anyMatch = keyValue.values.some(value => {
        const baseMatch = baseOperation(request, value, policyValues)
        return typeof baseMatch === 'boolean' ? baseMatch : baseMatch.matches
      })

      return {
        operator: condition.operation().value(),
        conditionKeyValue: condition.conditionKey(),
        values: [],
        matches: anyMatch
      }
      // return anyMatch ? 'Match' : 'NoMatch'
    } else if (setOperator === 'ForAllValues') {
      if(!keyExists) {
        return {
          operator: condition.operation().value(),
          conditionKeyValue: condition.conditionKey(),
          values: [],
          matches: true,
          matchedBecauseMissing: true
        }
        // return 'Match'
      }
      if(!keyValue || !keyValue.isArrayValue()) {
        return {
          operator: condition.operation().value(),
          conditionKeyValue: condition.conditionKey(),
          values: [],
          matches: false,
          failedBecauseMissing: !keyValue,
          failedBecauseNotArray: !!keyValue && !keyValue.isArrayValue()
        }
        // return 'NoMatch'
      }
      if(!baseOperation) {
        //TODO: This should return a nomatch rather than throw an error
        return {
          operator: condition.operation().value(),
          conditionKeyValue: condition.conditionKey(),
          values: [],
          matches: false,
          missingOperator: true
        }
      }
      //Do the loop
      const anyNotMatch = keyValue.values.some(value => {
        const baseMatch = baseOperation(request, value, policyValues)
        return typeof baseMatch === 'boolean' ? !baseMatch : !baseMatch.matches
        //TODO: Need to add explains for each value
        return !baseOperation(request, value, policyValues)
      })

      return {
        operator: condition.operation().value(),
        conditionKeyValue: condition.conditionKey(),
        values: [],
        matches: !anyNotMatch
      }
      //return anyNotMatch ? 'NoMatch' : 'Match'
    } else {
      throw new Error(`Unknown set operator: ${setOperator}`)
    }
  }


  const isNotOperator = condition.operation().baseOperator().toLowerCase().includes('not')
  if(condition.operation().isIfExists() || isNotOperator) {
    //Check if it exists, return true if it doesn't
    //Double check what happens here if the key is not a valid key or is of the wrong type
    if(!keyExists) {
      return {
        operator: condition.operation().value(),
        conditionKeyValue: condition.conditionKey(),
        values: [],
        matches: true,
        matchedBecauseMissing: true
      }
      // return 'Match'
    }
  }

  if(!keyValue || !keyValue.isStringValue()) {
    //Set operator is required for a multi-value key
    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: [],
      matches: false,
      failedBecauseMissing: !keyValue,
      failedBecauseArray: keyValue?.isArrayValue(),
    }
    // return 'NoMatch'
  }

  if(!baseOperation) {
    //TODO: This should return a nomatch rather than throw an error
    // throw new Error(`Unknown base operation: ${condition.operation().baseOperator()}`)
    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: [],
      matches: false,
      missingOperator: true
    }
  }

  const valueExplains = policyValues.map(value => {
    const valueMatch = baseOperation(request, keyValue.value, [value])
    const explain: ConditionValueExplain = {
      value,
      matches: typeof valueMatch === 'boolean' ? valueMatch : valueMatch.matches
    }
    if(isNotOperator) {
      explain.negativeMatchingValues = [value]
    } else {
      explain.matchingValues = [value]
    }
    return explain
  })

  let matches = valueExplains.some(explain => explain.matches)

  if(isNotOperator) {
    matches = valueExplains.every(explain => explain.matches)
  }

  return {
    operator: condition.operation().value(),
    conditionKeyValue: condition.conditionKey(),
    values: condition.valueIsArray() ? valueExplains : valueExplains[0],
    matches
  }

}

function testNull(condition: Condition, keyExists: boolean): ConditionExplain {
  const goalValue = keyExists ? 'false' : 'true'
  const conditionValues: ConditionValueExplain[] = condition.conditionValues().map(value => {
    return {
      value,
      matches: value.toLowerCase() === goalValue
    }
  })

  return {
    operator: condition.operation().value(),
    conditionKeyValue: condition.conditionKey(),
    values: conditionValues,
    matches: conditionValues.some(value => value.matches)
  }
}
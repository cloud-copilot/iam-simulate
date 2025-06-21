import { Condition } from '@cloud-copilot/iam-policy'
import { SimulationParameters } from '../core_engine/CoreSimulatorEngine.js'
import {
  ConditionExplain,
  ConditionValueExplain,
  StatementExplain
} from '../explain/statementExplain.js'
import { AwsRequest } from '../request/request'
import { ContextKey, ContextKeyImpl } from '../requestContext.js'
import { ArnEquals } from './arn/ArnEquals.js'
import { ArnLike } from './arn/ArnLike.js'
import { ArnNotEquals } from './arn/ArnNotEquals.js'
import { ArnNotLike } from './arn/ArnNotLike.js'
import { BaseConditionOperator } from './BaseConditionOperator.js'
import { BinaryEquals } from './binary/BinaryEquals.js'
import { Bool } from './boolean/Bool.js'
import { DateEquals } from './date/DateEquals.js'
import { DateGreaterThan } from './date/DateGreaterThan.js'
import { DateGreaterThanEquals } from './date/DateGreaterThanEquals.js'
import { DateLessThan } from './date/DateLessThan.js'
import { DateLessThanEquals } from './date/DateLessThanEquals.js'
import { DateNotEquals } from './date/DateNotEquals.js'
import { IpAddress } from './ipaddress/IpAddress.js'
import { NotIpAddress } from './ipaddress/NotIpAddress.js'
import { NumericEquals } from './numeric/NumericEquals.js'
import { NumericGreaterThan } from './numeric/NumericGreaterThan.js'
import { NumericGreaterThanEquals } from './numeric/NumericGreaterThanEquals.js'
import { NumericLessThan } from './numeric/NumericLessThan.js'
import { NumericNotEquals } from './numeric/NumericNotEquals.js'
import { StringEquals } from './string/StringEquals.js'
import { StringEqualsIgnoreCase } from './string/StringEqualsIgnoreCase.js'
import { StringLike } from './string/StringLike.js'
import { StringNotEquals } from './string/StringNotEquals.js'
import { StringNotEqualsIgnoreCase } from './string/StringNotEqualsIgnoreCase.js'
import { StringNotLike } from './string/StringNotLike.js'

export type ConditionMatchResult = 'Match' | 'NoMatch'

const allOperators = [
  StringEquals,
  StringNotEquals,
  StringEqualsIgnoreCase,
  StringNotEqualsIgnoreCase,
  StringLike,
  StringNotLike,
  NumericEquals,
  NumericNotEquals,
  NumericLessThan,
  NumericNotEquals,
  NumericGreaterThan,
  NumericGreaterThanEquals,
  DateEquals,
  DateNotEquals,
  DateLessThan,
  DateLessThanEquals,
  DateGreaterThan,
  DateGreaterThanEquals,
  Bool,
  BinaryEquals,
  IpAddress,
  NotIpAddress,
  ArnLike,
  ArnEquals,
  ArnNotLike,
  ArnNotEquals
]

const baseOperations: { [key: string]: BaseConditionOperator } = {}
for (const operator of allOperators) {
  baseOperations[operator.name.toLowerCase()] = operator
}

interface ConditionAndExplain {
  condition: Condition
  explain: ConditionExplain
}

/**
 * Evaluate a set of conditions against a request
 *
 * @param request the request to test
 * @param conditions the conditions to test
 * @returns Match if all conditions match, NoMatch if any do not. Also returns all the details of the evaluation
 */
export function requestMatchesConditions(
  request: AwsRequest,
  conditions: Condition[],
  statementType: 'Allow' | 'Deny',
  simulationParameters: SimulationParameters
): {
  matches: ConditionMatchResult
  details: Pick<StatementExplain, 'conditions'>
  ignoredConditions?: Condition[]
} {
  const results = conditions.map((condition) => ({
    condition,
    explain: singleConditionMatchesRequest(request, condition, simulationParameters)
  }))

  const isIgnored = (c: ConditionAndExplain): boolean => {
    if (simulationParameters.simulationMode !== 'Discovery') {
      return false
    }
    if (simulationParameters.strictConditionKeys.has(c.condition.conditionKey().toLowerCase())) {
      return false
    }
    // In Allows we ignore conditions that do not match
    if (statementType.toLowerCase() === 'allow') {
      return !c.explain.matches
    }
    // In Denies we ignore conditions that do match
    if (statementType.toLowerCase() === 'deny') {
      return c.explain.matches
    }
    throw new Error(
      `Unexpected condition explain result in discovery mode, statementType: ${statementType}`
    )
  }

  const nonMatch = results.filter((r) => !isIgnored(r)).some((result) => !result.explain.matches)
  const ignoredMatches = results
    .filter((r) => isIgnored(r))
    .some((result) => result.explain.matches)

  return {
    matches: nonMatch || ignoredMatches ? 'NoMatch' : ('Match' as ConditionMatchResult),
    details: {
      conditions: results.length == 0 ? undefined : results.map((r) => r.explain)
    },
    ignoredConditions: ignoredConditions(results, isIgnored)
  }
}

/**
 * Get the list of conditions that were ignored during discovery mode, if any
 *
 * @param conditions the conditions that were evaluated with their explains
 * @param statementType whether the statement is an allow or deny statement
 * @param simulationParameters the general parameters for the simulation
 * @returns an array of ignored conditions, or undefined if there are none
 */
function ignoredConditions(
  conditions: ConditionAndExplain[],
  isIgnored: (c: ConditionAndExplain) => boolean
): Condition[] | undefined {
  const ignoredConditions = conditions.filter(isIgnored)
  if (ignoredConditions.length > 0) {
    return ignoredConditions.map((r) => r.condition)
  }

  return undefined
}

/**
 * Checks to see if a single condition matches a request
 *
 * @param request the request to test
 * @param condition the condition to test
 * @returns the result of evaluating the condition
 */
export function singleConditionMatchesRequest(
  request: AwsRequest,
  condition: Condition,
  simulationParameters: SimulationParameters
): ConditionExplain {
  const key = condition.conditionKey()
  const baseOperation = baseOperations[condition.operation().baseOperator().toLowerCase()]
  const keyExists = request.contextKeyExists(key)
  const keyValue = keyExists ? request.getContextKeyValue(key) : undefined

  if (
    condition.operation().value().toLowerCase() == 'null' ||
    condition.operation().baseOperator()?.toLowerCase() == 'null'
  ) {
    return testNull(condition, keyExists)
  }

  if (condition.operation().setOperator()) {
    const setOperator = condition.operation().setOperator()
    if (setOperator === 'ForAnyValue') {
      return forAnyValueMatch(request, condition, keyValue, baseOperation)
    } else if (setOperator === 'ForAllValues') {
      return forAllValuesMatch(request, condition, keyValue, baseOperation)
    } else {
      throw new Error(`Unknown set operator: ${setOperator}`)
    }
  }

  return singleValueMatch(request, condition, baseOperation, keyValue)
}

/**
 * Tests a condition with a null operator
 *
 * @param condition the condition to test
 * @param keyExists whether the key exists in the request
 * @returns the result of evaluating the null operator
 */
function testNull(condition: Condition, keyExists: boolean): ConditionExplain {
  const goalValue = keyExists ? 'false' : 'true'
  const conditionValues: ConditionValueExplain[] = condition.conditionValues().map((value) => {
    return {
      value,
      matches: value.toLowerCase() === goalValue
    }
  })

  return {
    operator: condition.operation().value(),
    conditionKeyValue: condition.conditionKey(),
    values: condition.valueIsArray() ? conditionValues : conditionValues[0],
    matches: conditionValues.some((value) => value.matches)
  }
}

export function singleValueMatch(
  request: AwsRequest,
  condition: Condition,
  baseOperation: BaseConditionOperator,
  keyValue: ContextKey | undefined
): ConditionExplain {
  const isNotOperator = condition.operation().baseOperator().toLowerCase().includes('not')
  if (condition.operation().isIfExists() || isNotOperator) {
    //Check if it exists, return true if it doesn't
    //Double check what happens here if the key is not a valid key or is of the wrong type
    if (!keyValue) {
      const valueExplains: ConditionValueExplain[] = condition.conditionValues().map((value) => ({
        value,
        matches: true
      }))
      return {
        operator: condition.operation().value(),
        conditionKeyValue: condition.conditionKey(),
        values: condition.valueIsArray() ? valueExplains : valueExplains[0],
        matches: true,
        matchedBecauseMissing: true,
        resolvedConditionKeyValue: keyValue
      }
    }
  }

  if (!keyValue || !keyValue.isStringValue()) {
    //Set operator is required for a multi-value key
    //Confirmed this at re:Inforce 2025 IAM431.
    const valueExplains: ConditionValueExplain[] = condition.conditionValues().map((value) => ({
      value,
      matches: false
    }))
    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: condition.valueIsArray() ? valueExplains : valueExplains[0],
      matches: false,
      failedBecauseMissing: !keyValue,
      failedBecauseArray: keyValue?.isArrayValue()
    }
  }

  if (!baseOperation) {
    const valueExplains: ConditionValueExplain[] = condition.conditionValues().map((value) => ({
      value,
      matches: false
    }))

    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: condition.valueIsArray() ? valueExplains : valueExplains[0],
      matches: false,
      missingOperator: true
    }
  }

  const { matches, explains } = baseOperation.matches(
    request,
    keyValue.value,
    condition.conditionValues()
  )

  return {
    matches,
    operator: condition.operation().value(),
    conditionKeyValue: condition.conditionKey(),
    values: condition.valueIsArray() ? explains : explains[0],
    resolvedConditionKeyValue: keyValue.value
  }
}

/**
 * Tests a condition with a ForAllValues set operator
 *
 * @param request the request to test
 * @param condition the condition with ForAllValues set operator
 * @param keyExists whether the key exists in the request
 * @param keyValue the value of the key in the request
 * @param baseOperation the base operation to test the key against
 * @returns the result of evaluating the ForAllValues set operator
 */
export function forAllValuesMatch(
  request: AwsRequest,
  condition: Condition,
  keyValue: ContextKey | undefined,
  baseOperation: BaseConditionOperator
): ConditionExplain {
  const matchingValueExplains: ConditionValueExplain[] = condition
    .conditionValues()
    .map((value) => ({
      value,
      matches: true
    }))
  const notMatchingValueExplains: ConditionValueExplain[] = condition
    .conditionValues()
    .map((value) => ({
      value,
      matches: false
    }))

  if (!keyValue) {
    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: matchingValueExplains,
      matches: true,
      matchedBecauseMissing: true
    }
  }

  // If the key only has a single value, convert it to an array to process
  if (keyValue.isStringValue()) {
    keyValue = new ContextKeyImpl(keyValue.name, [keyValue.value])
  }

  if (!keyValue.isArrayValue()) {
    throw new Error('Key value is not an array, this is a bug.')
  }

  if (!baseOperation) {
    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: notMatchingValueExplains,
      matches: false,
      missingOperator: true
    }
  }

  const valueExplains = keyValue.values.map((value) => {
    const { matches, explains } = baseOperation.matches(request, value, condition.conditionValues())
    return {
      requestValue: value,
      matches,
      explains
    }
  })

  const anyNonMatches = valueExplains.some((valueExplain) => !valueExplain.matches)
  const overallMatch = !anyNonMatches
  const unmatchedValues: string[] = []

  const explains: Record<string, ConditionValueExplain> = {}
  for (const valueExplain of valueExplains) {
    if (!baseOperation.isNegative && !valueExplain.matches) {
      unmatchedValues.push(valueExplain.requestValue)
    } else if (baseOperation.isNegative && valueExplain.matches) {
      unmatchedValues.push(valueExplain.requestValue)
    }
    for (const explain of valueExplain.explains) {
      let theExplain = explains[explain.value]
      if (!theExplain) {
        explains[explain.value] = {
          value: explain.value,
          matches: overallMatch
        }
        theExplain = explains[explain.value]
      }
      if (explain.matches && !baseOperation.isNegative) {
        theExplain.matchingValues = theExplain.matchingValues || []
        theExplain.matchingValues.push(valueExplain.requestValue)
      } else if (!explain.matches && baseOperation.isNegative) {
        theExplain.negativeMatchingValues = theExplain.negativeMatchingValues || []
        theExplain.negativeMatchingValues.push(valueExplain.requestValue)
      }
    }
  }

  return {
    operator: condition.operation().value(),
    conditionKeyValue: condition.conditionKey(),
    values: Object.values(explains),
    matches: overallMatch,
    unmatchedValues
  }
}

/**
 * Test a condition with a ForAnyValue set operator
 *
 * @param request the request to test
 * @param condition the condition with ForAnyValue set operator
 * @param keyExists whether the key exists in the request
 * @param keyValue the value of the key in the request
 * @param baseOperation the base operation to test the key against
 * @returns the result of evaluating the ForAnyValue set operator
 */
export function forAnyValueMatch(
  request: AwsRequest,
  condition: Condition,
  keyValue: ContextKey | undefined,
  baseOperation: BaseConditionOperator
): ConditionExplain {
  const failedValueExplains: ConditionValueExplain[] = condition.conditionValues().map(
    (value) =>
      ({
        value,
        matches: false
      }) as ConditionValueExplain
  )

  if (!keyValue) {
    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: failedValueExplains,
      matches: false,
      failedBecauseMissing: true
    }
    // return 'NoMatch'
  }

  // If the key only has a single value, convert it to an array to process
  if (keyValue.isStringValue()) {
    keyValue = new ContextKeyImpl(keyValue.name, [keyValue.value])
  }

  if (!keyValue.isArrayValue()) {
    throw new Error('Key value is not an array, this is a bug.')
  }

  if (!baseOperation) {
    return {
      operator: condition.operation().value(),
      conditionKeyValue: condition.conditionKey(),
      values: failedValueExplains,
      matches: false,
      missingOperator: true
    }
  }

  const valueExplains = keyValue.values.map((value) => {
    const { matches, explains } = baseOperation.matches(request, value, condition.conditionValues())
    return {
      requestValue: value,
      matches,
      explains
    }
  })

  const overallMatch = valueExplains.some((valueExplain) => valueExplain.matches)
  const unmatchedValues: string[] = []

  const explains: Record<string, ConditionValueExplain> = {}
  for (const valueExplain of valueExplains) {
    if (!baseOperation.isNegative && !valueExplain.matches) {
      unmatchedValues.push(valueExplain.requestValue)
    } else if (baseOperation.isNegative && valueExplain.matches) {
      unmatchedValues.push(valueExplain.requestValue)
    }
    for (const explain of valueExplain.explains) {
      let theExplain = explains[explain.value]
      if (!theExplain) {
        explains[explain.value] = {
          value: explain.value,
          matches: overallMatch
        }
        theExplain = explains[explain.value]
      }
      if (explain.matches) {
        theExplain.matchingValues = theExplain.matchingValues || []
        theExplain.matchingValues.push(valueExplain.requestValue)
      }
    }
  }

  return {
    operator: condition.operation().value(),
    conditionKeyValue: condition.conditionKey(),
    values: Object.values(explains),
    matches: overallMatch,
    unmatchedValues
  }
}

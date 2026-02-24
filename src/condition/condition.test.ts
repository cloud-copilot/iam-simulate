import { type Condition, loadPolicy } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import type { SimulationParameters } from '../core_engine/CoreSimulatorEngine.js'
import { AwsRequestImpl } from '../request/request.js'
import { RequestContextImpl } from '../requestContext.js'
import { requestMatchesConditions, singleConditionMatchesRequest } from './condition.js'

const defaultSimulationParameters: SimulationParameters = {
  simulationMode: 'Strict',
  strictConditionKeys: new Set()
}

const discoverySimulationParameters: Pick<SimulationParameters, 'simulationMode'> = {
  simulationMode: 'Discovery'
}

describe('singleConditionMatchesRequest', () => {
  it('should return no match if the base operation is not found', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'test' })
    )
    //And a condition that test for an operation that does not exist
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            FakeConditionOperator: {
              'aws:username': 'test'
            }
          }
        }
      ]
    })
    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const result = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should not match
    expect(result.matches).toEqual(false)
    expect(result.resolvedConditionKeyValue).toEqual(undefined)
  })

  it('should return Match if the base operation is negative and the key does not exist, single value', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({})
    )
    //And a condition that test for an operation that does not exist
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            StringNotEquals: {
              'aws:username': 'test'
            }
          }
        }
      ]
    })
    const condition = policy.statements()[0].conditions()[0]
    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should be 'Match'
    expect(response.matches).toEqual(true)
    expect(response.resolvedConditionKeyValue).toEqual(undefined)
    expect(response.matchedBecauseMissing).toEqual(true)
    expect(response.values).toEqual({ value: 'test', matches: true })
  })

  it('should return Match if the base operation is negative and the key does not exist, array', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({})
    )
    //And a condition that test for an operation that does not exist
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            StringNotEquals: {
              'aws:username': ['test1', 'test2']
            }
          }
        }
      ]
    })
    const condition = policy.statements()[0].conditions()[0]
    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should be 'Match'
    expect(response.matches).toEqual(true)
    expect(response.resolvedConditionKeyValue).toEqual(undefined)
    expect(response.matchedBecauseMissing).toEqual(true)
    expect(response.values).toEqual([
      { value: 'test1', matches: true },
      { value: 'test2', matches: true }
    ])
  })

  it('should return NoMatch if the operation is single value but the key is an array', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:CalledVia': ['test', 'test2'] })
    )
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:CalledVia': 'test'
            }
          }
        }
      ]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should be 'NoMatch'
    expect(response.matches).toEqual(false)
    expect(response.resolvedConditionKeyValue).toEqual(undefined)
    expect(response.failedBecauseArray).toEqual(true)
    expect(response.values).toEqual({ value: 'test', matches: false })
  })

  it('should return NoMatch if the operation is a single value, the operator is positive, and the value is missing', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({})
    )
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:PrincipalOrgId': 'o-123456'
            }
          }
        }
      ]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should be 'Match'
    expect(response.matches).toEqual(false)
    expect(response.failedBecauseMissing).toEqual(true)
    expect(response.values).toEqual({ value: 'o-123456', matches: false })
  })

  it('should return NoMatch if the operation is a single value, the operator is positive, and the value is missing - array', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({})
    )
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:PrincipalOrgId': ['o-123456', 'o-654321']
            }
          }
        }
      ]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should be 'Match'
    expect(response.matches).toEqual(false)
    expect(response.failedBecauseMissing).toEqual(true)
    expect(response.values).toEqual([
      { value: 'o-123456', matches: false },
      { value: 'o-654321', matches: false }
    ])
  })

  it('should return Match if the operation is a single value, the key is a single value, and they match', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:PrincipalOrgId': 'o-123456' })
    )
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:PrincipalOrgId': 'o-123456'
            }
          }
        }
      ]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should be 'Match'
    expect(response.matches).toEqual(true)
    expect(response.resolvedConditionKeyValue).toEqual('o-123456')
  })

  it('should return NoMatch if the operation is a single value, the key is a single value, and they do not match', () => {
    //Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:PrincipalOrgId': 'o-123456' })
    )
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:PrincipalOrgId': 'o-654321'
            }
          }
        }
      ]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

    //Then the result should be 'NoMatch'
    expect(response.matches).toEqual(false)
    expect(response.resolvedConditionKeyValue).toEqual('o-123456')
  })

  describe('ForAnyValue', () => {
    it('should return NoMatch if the value does not exist', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({})
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringEquals': {
                'aws:CalledVia': 'A'
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
    })

    it('should return NoMatch if none of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': ['Z', 'X'] })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringEquals': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
    })

    it('should return Match if any of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': ['Z', 'X', 'A'] })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringEquals': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
    })

    it('should return Match if all of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': ['B', 'A'] })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringEquals': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
    })

    it('should return no match if the base operation is not found', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': ['B', 'A'] })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:FakeOperator': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]

      //When the request is checked against the condition
      const result = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

      //Then it should not be a match
      expect(result.matches).toEqual(false)
      expect(result.resolvedConditionKeyValue).toEqual(undefined)
    })
  })

  describe('ForAllValues', () => {
    it('should return Match if the key does not exist', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({})
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringEquals': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.matchedBecauseMissing).toEqual(true)
      expect(response.values).toEqual([
        { value: 'A', matches: true },
        { value: 'B', matches: true }
      ])
    })

    it('should return no match if none of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': ['Z', 'X'] })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringEquals': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual([
        { value: 'A', matches: false },
        { value: 'B', matches: false }
      ])
    })

    it('should return no match if some of the values match but not all', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': ['A', 'X'] })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringEquals': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
    })

    it('should return Match if all of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': ['A', 'B'] })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringEquals': {
                'aws:CalledVia': ['A', 'B']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
    })

    it('should implicitly convert single values to arrays if present: match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:PrincipalOrgId': 'o-abcdefg' })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringEquals': {
                'aws:PrincipalOrgId': ['o-abcdefg', 'o-zyxwvu']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual([
        { value: 'o-abcdefg', matches: true, matchingValues: ['o-abcdefg'] },
        { value: 'o-zyxwvu', matches: true }
      ])
    })

    it('should implicitly convert single values to arrays if present: no match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:PrincipalOrgId': 'o-zzzzzzz' })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringEquals': {
                'aws:PrincipalOrgId': ['o-abcdefg', 'o-zyxwvu']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual([
        { value: 'o-abcdefg', matches: false },
        { value: 'o-zyxwvu', matches: false }
      ])
    })
  })

  describe('Null checks', () => {
    it('should return Match if the key does not exist and the policy has true', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({})
      )
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              Null: {
                'aws:CalledVia': 'true'
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual({ value: 'true', matches: true })
    })

    it('should return NoMatch if the key exists and the policy has true', () => {
      //Given a request with context key
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': 'test' })
      )
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              Null: {
                'aws:CalledVia': 'true'
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual({ value: 'true', matches: false })
    })

    it('should return NoMatch if the key does not exist and the policy has false', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({})
      )
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              Null: {
                'aws:CalledVia': 'false'
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual({ value: 'false', matches: false })
    })

    it('should return Match if the key exists and the policy has false', () => {
      //Given a request with context key
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:CalledVia': 'test' })
      )
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              Null: {
                'aws:CalledVia': 'false'
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual({ value: 'false', matches: true })
    })

    it('should treat treat ForAllValues:Null the same as Null', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({})
      )
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:Null': {
                'aws:CalledVia': 'true'
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual({ value: 'true', matches: true })
    })

    it('should treat ForAnyValue:Null the same as Null', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({})
      )
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:Null': {
                'aws:CalledVia': 'true'
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'Match'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual({ value: 'true', matches: true })
    })
  })

  it('should throw an error if the set operator is not found', () => {
    //Given a condition with a set operator that does not exist
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForSomeValues:StringEquals': {
              'aws:username': 'test'
            }
          }
        }
      ]
    })
    const condition = policy.statements()[0].conditions()[0]

    //And a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({})
    )

    //When the request is checked against the condition
    expect(() =>
      singleConditionMatchesRequest(request, condition, defaultSimulationParameters)
    ).toThrow()
  })
})

describe('requestMatchesConditions', () => {
  it('should return NoMatch if any condition returns false', () => {
    // Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'test' })
    )
    // And a condition that returns Unknown
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            Null: {
              'aws:username': 'true'
            },
            StringEquals: {
              'aws:username': 'test'
            }
          }
        }
      ]
    })

    const conditions = policy.statements()[0].conditions()
    // When the request is checked against the conditions
    const response = requestMatchesConditions(
      request,
      conditions,
      'Allow',
      defaultSimulationParameters
    )

    // Then the result should be 'Unknown'
    expect(response.matches).toEqual('NoMatch')
    expect(response.details.conditions?.at(1)?.resolvedConditionKeyValue).toEqual('test')
  })

  it('should return Match if all conditions return true', () => {
    // Given a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'test' })
    )
    // And a condition that returns Unknown
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            Null: {
              'aws:username': 'false'
            },
            StringEquals: {
              'aws:username': 'test'
            }
          }
        }
      ]
    })

    const conditions = policy.statements()[0].conditions()
    // When the request is checked against the conditions
    const response = requestMatchesConditions(
      request,
      conditions,
      'Allow',
      defaultSimulationParameters
    )

    // Then the result should be 'Unknown'
    expect(response.matches).toEqual('Match')
  })

  it('should return undefined for details if there are no conditions', () => {
    //Given an empty array of conditions
    const conditions: Condition[] = []

    //And a request
    const request = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'test' })
    )

    //When the request is checked against the conditions
    const response = requestMatchesConditions(
      request,
      conditions,
      'Allow',
      defaultSimulationParameters
    )

    //Then it should be a match
    expect(response.matches).toEqual('Match')
    //And there should be no details
    expect(response.details.conditions).toEqual(undefined)
  })
})

describe('forAllValuesMatch', () => {
  describe('positive operators', () => {
    it('should have an array of matching values for a single policy value and return non matching values', () => {
      //Given a condition using ForAllValues:StringLike
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringLike': {
                'aws:RequestTags': ['A*', 'B*']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]

      //And a request with multiple values for that key
      const contextKeys = {
        'aws:RequestTags': ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry']
      }
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl(contextKeys)
      )

      //When the request is checked against the condition
      const result = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

      //Then the result should not match
      expect(result.matches).toEqual(false)
      //And there should be matching values for each value in the policy
      expect(result.values).toEqual([
        { value: 'A*', matches: false, matchingValues: ['Apple', 'Apricot'] },
        { value: 'B*', matches: false, matchingValues: ['Banana', 'Blueberry'] }
      ])

      //And the unmatched values should be the values that did not match
      expect(result.unmatchedValues).toEqual(['Cherry', 'Cranberry'])
      expect(result.resolvedConditionKeyValue).toEqual(undefined)
    })
  })

  describe('negative operators', () => {
    it('should have an array of negative matching values for a single policy value and return non matching values', () => {
      //Given a condition using ForAllValues:StringNotLike
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAllValues:StringNotLike': {
                'aws:RequestTags': ['A*', 'B*']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]

      //And a request with multiple values for that key
      const contextKeys = {
        'aws:RequestTags': ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry']
      }
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl(contextKeys)
      )

      //When the request is checked against the condition
      const result = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

      // Then the result should not match
      expect(result.matches).toEqual(false)
      //And there should be matching values for each value in the policy
      expect(result.values).toEqual([
        { value: 'A*', matches: false, negativeMatchingValues: ['Apple', 'Apricot'] },
        { value: 'B*', matches: false, negativeMatchingValues: ['Banana', 'Blueberry'] }
      ])

      // And the unmatched values should be the values that did not match
      expect(result.unmatchedValues).toEqual(['Cherry', 'Cranberry'])
      expect(result.resolvedConditionKeyValue).toEqual(undefined)
    })
  })
})

describe('forAnyValueMatch', () => {
  describe('positive operators', () => {
    it('should return an array of matching values for each value in the policy and return non matching values', () => {
      //Given a condition using ForAnyValue:StringLike
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringLike': {
                'aws:RequestTags': ['A*', 'B*']
              }
            }
          }
        ]
      })

      const condition = policy.statements()[0].conditions()[0]
      //And a request with multiple values for that key
      const contextKeys = {
        'aws:RequestTags': ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry']
      }
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl(contextKeys)
      )

      //When the request is checked against the condition
      const result = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

      //Then the result should match
      expect(result.matches).toEqual(true)

      //And there should be matching values for each value in the policy
      expect(result.values).toEqual([
        { value: 'A*', matches: true, matchingValues: ['Apple', 'Apricot'] },
        { value: 'B*', matches: true, matchingValues: ['Banana', 'Blueberry'] }
      ])

      //And the unmatched values should be the values that did not match
      expect(result.unmatchedValues).toEqual(['Cherry', 'Cranberry'])
      expect(result.resolvedConditionKeyValue).toEqual(undefined)
    })

    it('single value context key: match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:PrincipalOrgId': 'o-abcdefg' })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringEquals': {
                'aws:PrincipalOrgId': ['o-abcdefg', 'o-zyxwvu']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(true)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.values).toEqual([
        { value: 'o-abcdefg', matches: true, matchingValues: ['o-abcdefg'] },
        { value: 'o-zyxwvu', matches: true }
      ])
    })

    it('single value context key: no match', () => {
      //Given a request
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl({ 'aws:PrincipalOrgId': 'o-zzzzzzz' })
      )
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringEquals': {
                'aws:PrincipalOrgId': ['o-abcdefg', 'o-zyxwvu']
              }
            }
          }
        ]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(
        request,
        condition,
        defaultSimulationParameters
      )

      //Then the result should be 'NoMatch'
      expect(response.matches).toEqual(false)
      expect(response.resolvedConditionKeyValue).toEqual(undefined)
      expect(response.unmatchedValues).toEqual(['o-zzzzzzz'])
      expect(response.values).toEqual([
        { value: 'o-abcdefg', matches: false },
        { value: 'o-zyxwvu', matches: false }
      ])
    })
  })

  describe('negative operators', () => {
    it('should return an array of matching values for each value in the policy and return non matching values', () => {
      //Given a condition using ForAnyValue:StringNotLike
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: '*',
            Resource: '*',
            Condition: {
              'ForAnyValue:StringNotLike': {
                'aws:RequestTags': ['A*', 'B*']
              }
            }
          }
        ]
      })

      const condition = policy.statements()[0].conditions()[0]
      //And a request with multiple values for that key
      const contextKeys = {
        'aws:RequestTags': ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry']
      }
      const request = new AwsRequestImpl(
        '',
        { resource: '', accountId: '' },
        '',
        new RequestContextImpl(contextKeys)
      )

      //When the request is checked against the condition
      const result = singleConditionMatchesRequest(request, condition, defaultSimulationParameters)

      //Then the result should match
      expect(result.matches).toEqual(true)

      //And there should be matching values for each value in the policy
      expect(result.values).toEqual([
        {
          value: 'A*',
          matches: true,
          matchingValues: ['Banana', 'Blueberry', 'Cherry', 'Cranberry']
        },
        { value: 'B*', matches: true, matchingValues: ['Apple', 'Apricot', 'Cherry', 'Cranberry'] }
      ])

      //And the unmatched values should be the values that did not match
      expect(result.unmatchedValues).toEqual(['Cherry', 'Cranberry'])
      expect(result.resolvedConditionKeyValue).toEqual(undefined)
    })
  })
})

describe('requestMatchesConditions - Discovery simulationMode (with loadPolicy)', () => {
  it('ignores non-matching condition not in strictConditionKeys', () => {
    // Given a condition for username
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: { 'aws:username': 'bob' }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()

    //And a request with a different username
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice' })
    )

    //And simulation parameters with Discovery mode set
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:userid'])
    }

    // When checking if the request matches the conditions
    const result = requestMatchesConditions(req, cond, 'Allow', simParams)

    // Then it should match
    expect(result.matches).toBe('Match')

    // And the ignored conditions should contain the ignored condition
    expect(result.ignoredConditions).toHaveLength(1)
    expect(result.ignoredConditions![0].conditionKey()).toBe('aws:username')
  })

  it('does not ignore non-matching condition in strictConditionKeys', () => {
    // Given a condition for username
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: { 'aws:username': 'bob' }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()

    //And a request with a different username
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice' })
    )

    //And simulation parameters with Discovery mode set and strictConditionKeys including username
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:username'])
    }

    // When checking if the request matches the conditions
    const result = requestMatchesConditions(req, cond, 'Allow', simParams)

    // Then it should not match
    expect(result.matches).toBe('NoMatch')

    // And there should be no ignored conditions
    expect(result.ignoredConditions).toBeUndefined()
  })

  it('matches when all conditions match, even in Discovery mode', () => {
    // Given a condition for aws:username
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: { 'aws:username': 'alice' }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()

    //And a request with the matching username
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice' })
    )
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:username'])
    }

    // When checking if the request matches the conditions
    const result = requestMatchesConditions(req, cond, 'Allow', simParams)

    // Then it should match
    expect(result.matches).toBe('Match')

    // And there should be no ignored conditions
    expect(result.ignoredConditions).toBeUndefined()
  })

  it('returns multiple ignored conditions if multiple non-strict keys do not match', () => {
    // Given a policy with multiple conditions
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:username': 'bob',
              'aws:userid': '123'
            }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()

    //And a request with different values for those keys
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice', 'aws:userid': '456' })
    )

    //And simulation parameters with Discovery mode set and strictConditionKeys including neither
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:accountid'])
    }

    // When checking if the request matches the conditions
    const result = requestMatchesConditions(req, cond, 'Allow', simParams)

    // Then it should match
    expect(result.matches).toBe('Match')

    // And the ignored conditions should contain both non-matching conditions
    expect(result.ignoredConditions).toHaveLength(2)
    expect(result.ignoredConditions!.map((c) => c.conditionKey()).sort()).toEqual([
      'aws:userid',
      'aws:username'
    ])
  })

  it('evaluates strictConditionKeys as normal even if other keys are ignored', () => {
    // Given a policy with multiple conditions
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:username': 'bob',
              'aws:userid': '123'
            }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()

    //And a request with different values for those keys
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice', 'aws:userid': '456' })
    )

    //And simulation parameters with Discovery mode set and strictConditionKeys including aws:userid
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:userid'])
    }

    // When checking if the request matches the conditions
    const result = requestMatchesConditions(req, cond, 'Allow', simParams)

    // Then it should not match
    expect(result.matches).toBe('NoMatch')

    // Since a strict condition key does not match, the ignored conditions are not returned
    expect(result.ignoredConditions).toBeUndefined()
  })
})

describe('requestMatchesConditions - Discovery simulationMode with Deny statements', () => {
  it('Should not match if none of the keys match', () => {
    // Given a Deny statement with two conditions
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:username': 'bob',
              'aws:userid': '123'
            }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()
    // And a request with different values for those keys
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice', 'aws:userid': '456' })
    )
    // And simulation parameters with Discovery mode set and strictConditionKeys including neither
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:accountid'])
    }
    // When checking if the request matches the conditions for a Deny statement
    const result = requestMatchesConditions(req, cond, 'Deny', simParams)
    // Then it should match (Deny ignored if all non-matching are ignored)
    expect(result.matches).toBe('NoMatch')
    // And no conditions should be ignored
    expect(result.ignoredConditions).toBeUndefined()
  })

  it('should not match if a non-matching strict key exists for Deny', () => {
    // Given a Deny statement with two conditions
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: {
              'aws:username': 'bob',
              'aws:userid': '123'
            }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()
    // And a request with different values for those keys
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice', 'aws:userid': '456' })
    )
    // And simulation parameters with Discovery mode set and strictConditionKeys including aws:userid
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:userid'])
    }
    // When checking if the request matches the conditions for a Deny statement
    const result = requestMatchesConditions(req, cond, 'Deny', simParams)
    // Then it should not match (Deny enforced if strict key does not match)
    expect(result.matches).toBe('NoMatch')
    // And the ignored conditions should contain only the non-strict aws:username condition
    expect(result.ignoredConditions).toBeUndefined()
  })

  it('should not match if matching keys in a Deny statement are ignored', () => {
    // Given a Deny statement with a condition
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: { 'aws:username': 'alice' }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()

    // And a request with the matching username
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice' })
    )
    // And simulation parameters with Discovery mode set and strictConditionKeys including aws:username
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set([])
    }
    // When checking if the request matches the conditions for a Deny statement
    const result = requestMatchesConditions(req, cond, 'Deny', simParams)
    // Then it should not match (Deny enforced if matching key is ignored)
    expect(result.matches).toBe('NoMatch')
    // And there should be no ignored conditions
    expect(result.ignoredConditions?.map((c) => c.conditionKey())).toEqual(['aws:username'])
  })

  it('should match if strict Deny conditions match, in Discovery mode', () => {
    // Given a Deny statement with a condition
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Action: 's3:GetObject',
          Resource: '*',
          Condition: {
            StringEquals: { 'aws:username': 'alice' }
          }
        }
      ]
    })
    const cond = policy.statements()[0].conditions()

    // And a request with the matching username
    const req = new AwsRequestImpl(
      '',
      { resource: '', accountId: '' },
      '',
      new RequestContextImpl({ 'aws:username': 'alice' })
    )
    // And simulation parameters with Discovery mode set
    const simParams = {
      ...discoverySimulationParameters,
      strictConditionKeys: new Set(['aws:username'])
    }
    // When checking if the request matches the conditions for a Deny statement
    const result = requestMatchesConditions(req, cond, 'Deny', simParams)
    // Then it should match
    expect(result.matches).toBe('Match')
    // And there should be no ignored conditions
    expect(result.ignoredConditions).toBeUndefined()
  })
})

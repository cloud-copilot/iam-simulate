import { loadPolicy } from "@cloud-copilot/iam-policy";
import { describe, expect, it } from "vitest";
import { AwsRequest, AwsRequestImpl } from "../request/request.js";
import { RequestContextImpl } from "../requestContext.js";
import { requestMatchesConditions, singleConditionMatchesRequest } from "./condition.js";

function testRequestWithContext(context: any, validContextVariables?: string[]): AwsRequest {
  validContextVariables = validContextVariables || []
  //For now we assume that all values passed into the context are valid
  return new AwsRequestImpl('', '', '', new RequestContextImpl(context))
}

describe('singleConditionMatchesRequest', () => {
  it('should return Unknown if the base operation is not found', () => {
    //Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:username': 'test'}))
    //And a condition that test for an operation that does not exist
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          FakeConditionOperator: {
            'aws:username': 'test'
          }
        }
      }]
    })
    const condition = policy.statements()[0].conditions()[0]
    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition)

    //Then the result should be 'Unknown'
    expect(response).toEqual('Unknown')
  })

  it('should return Match if the base operation is negative and the key does not exist', () => {
    //Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({}))
    //And a condition that test for an operation that does not exist
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          StringNotEquals: {
            'aws:username': 'test'
          }
        }
      }]
    })
    const condition = policy.statements()[0].conditions()[0]
    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition)

    //Then the result should be 'Match'
    expect(response).toEqual('Match')
  })

  it('should return NoMatch if the operation is single value but the key is an array', () => {
    //Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['test', 'test2']}))
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          StringEquals: {
            'aws:CalledVia': 'test'
          }
        }
      }]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition)

    //Then the result should be 'NoMatch'
    expect(response).toEqual('NoMatch')
  })

  it('should return Match if the operation is a single value, the key is a single value, and they match', () => {
    //Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:PrincipalOrgId': 'o-123456'}))
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          StringEquals: {
            'aws:PrincipalOrgId': 'o-123456'
          }
        }
      }]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition)

    //Then the result should be 'Match'
    expect(response).toEqual('Match')
  })

  it('should return NoMatch if the operation is a single value, the key is a single value, and they do not match', () => {
    //Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:PrincipalOrgId': 'o-123456'}))
    //And a single valued condition test for that key
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          StringEquals: {
            'aws:PrincipalOrgId': 'o-654321'
          }
        }
      }]
    })

    const condition = policy.statements()[0].conditions()[0]

    //When the request is checked against the condition
    const response = singleConditionMatchesRequest(request, condition)

    //Then the result should be 'NoMatch'
    expect(response).toEqual('NoMatch')
  })

  describe('ForAnyValue', () => {
    it('should return NoMatch if the value does not exist', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAnyValue:StringEquals': {
              'aws:CalledVia': 'A'
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'NoMatch'
      expect(response).toEqual('NoMatch')
    })

    it('should return NoMatch if none of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['Z', 'X']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAnyValue:StringEquals': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'NoMatch'
      expect(response).toEqual('NoMatch')
    })

    it('should return Match if any of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['Z', 'X', 'A']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAnyValue:StringEquals': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })

    it('should return Match if all of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['B', 'A']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAnyValue:StringEquals': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })

    it('should return unknown if the base operation is not found', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['B', 'A']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAnyValue:FakeOperator': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Unknown'
      expect(response).toEqual('Unknown')
    })
  })

  describe('ForAllValues', () => {
    it('should return Match if the key does not exist', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAllValues:StringEquals': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })

    it('should return no match if none of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['Z', 'X']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAllValues:StringEquals': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'NoMatch'
      expect(response).toEqual('NoMatch')
    })

    it('should return no match if some of the values match but not all', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['A', 'X']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAllValues:StringEquals': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'NoMatch'
      expect(response).toEqual('NoMatch')
    })

    it('should return Match if all of the values match', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['A', 'B']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAllValues:StringEquals': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })

    it('should return no match if the value is not an array', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:PrincipalOrgId': 'o-12345'}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAllValues:StringEquals': {
              'aws:PrincipalOrgId': ['o-abcdefg', 'o-zyxwvu']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'NoMatch'
      expect(response).toEqual('NoMatch')
    })

    it('should return unknown if the base operation is not found', () => {
      //Given a request
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': ['B', 'A']}))
      //And a condition that test for an operation that does not exist
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAllValues:FakeOperator': {
              'aws:CalledVia': ['A', 'B']
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Unknown'
      expect(response).toEqual('Unknown')
    })
  })

  describe('Null checks', () => {
    it('should return Match if the key does not exist and the policy has true', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({}))
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'Null': {
              'aws:CalledVia': "true"
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })

    it('should return NoMatch if the key exists and the policy has true', () => {
      //Given a request with context key
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': 'test'}))
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'Null': {
              'aws:CalledVia': "true"
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'NoMatch'
      expect(response).toEqual('NoMatch')
    })

    it('should return NoMatch if the key does not exist and the policy has false', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({}))
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'Null': {
              'aws:CalledVia': "false"
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('NoMatch')
    })

    it('should return Match if the key exists and the policy has false', () => {
      //Given a request with context key
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:CalledVia': 'test'}))
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'Null': {
              'aws:CalledVia': "false"
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })

    it('should treat treat ForAllValues:Null the same as Null', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({}))
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAllValues:Null': {
              'aws:CalledVia': "true"
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })

    it('should treat ForAnyValue:Null the same as Null', () => {
      //Given a request with no context key
      const request = new AwsRequestImpl('', '', '', new RequestContextImpl({}))
      //And a condition that tests for null
      const policy = loadPolicy({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
          Condition: {
            'ForAnyValue:Null': {
              'aws:CalledVia': "true"
            }
          }
        }]
      })
      const condition = policy.statements()[0].conditions()[0]
      //When the request is checked against the condition
      const response = singleConditionMatchesRequest(request, condition)

      //Then the result should be 'Match'
      expect(response).toEqual('Match')
    })
  })
})

describe('requestMatchesConditions', () => {
  it('should return Unknown if any condition returns Unknown', () => {
    // Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:username': 'test'}))
    // And a condition that returns Unknown
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          FakeConditionOperator: {
            'aws:username': 'test'
          },
          StringEquals: {
            'aws:username': 'test'
          }
        }
      }]
    })

    const conditions = policy.statements()[0].conditions()
    // When the request is checked against the conditions
    const response = requestMatchesConditions(request, conditions)

    // Then the result should be 'Unknown'
    expect(response).toEqual('Unknown')
  })
  it('should return NoMatch if any condition returns NoMatch', () => {
    // Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:username': 'test'}))
    // And a condition that returns Unknown
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
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
      }]
    })

    const conditions = policy.statements()[0].conditions()
    // When the request is checked against the conditions
    const response = requestMatchesConditions(request, conditions)

    // Then the result should be 'Unknown'
    expect(response).toEqual('NoMatch')
  })
  it('should return Match if all conditions return Match', () => {
    // Given a request
    const request = new AwsRequestImpl('', '', '', new RequestContextImpl({'aws:username': 'test'}))
    // And a condition that returns Unknown
    const policy = loadPolicy({
      Version: '2012-10-17',
      Statement: [{
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
      }]
    })

    const conditions = policy.statements()[0].conditions()
    // When the request is checked against the conditions
    const response = requestMatchesConditions(request, conditions)

    // Then the result should be 'Unknown'
    expect(response).toEqual('Match')
  })
})
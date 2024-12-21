import { loadPolicy, NotResourceStatement, ResourceStatement } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { ResourceExplain } from '../explain/statementExplain.js'
import { AwsRequestImpl } from '../request/request.js'
import { RequestContextImpl } from '../requestContext.js'
import { requestMatchesNotResources, requestMatchesResources } from './resource.js'

interface ResourceTest {
  name?: string
  resourceStatements: string[]
  resource: {
    resource: string
    accountId: string
  }
  expectMatch: boolean
  context?: Record<string, string | string[]>
  explains: ResourceExplain[]
}

const resourceTests: ResourceTest[] = [
  {
    name: 'should match wildcard',
    resourceStatements: ['*'],
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: '*',
        matches: true
      }
    ]
  },
  {
    name: 'should fail if different partition',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
    resource: {
      resource: 'arn:aws-gov:s3:::my_corporate_bucket',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket',
        matches: false
      }
    ]
  },
  {
    name: 'should match a wildcard partition',
    resourceStatements: ['arn:*:s3:::my_corporate_bucket'],
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:*:s3:::my_corporate_bucket',
        matches: true
      }
    ]
  },
  {
    name: 'should match a question mark partition',
    resourceStatements: ['arn:???:s3:::my_corporate_bucket'],
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:???:s3:::my_corporate_bucket',
        matches: true
      }
    ]
  },
  {
    name: 'Should fail if different service',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
    resource: {
      resource: 'arn:aws:sqs:::my_corporate_bucket',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket',
        matches: false
      }
    ]
  },
  {
    name: 'should match a wildcard service',
    resourceStatements: ['arn:aws:*:::my_corporate_bucket'],
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:*:::my_corporate_bucket',
        matches: true
      }
    ]
  },
  {
    name: 'should not match if different region',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/12345'],
    resource: {
      resource: 'arn:aws:ec2:us-west-1:123456789012:instance/12345',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/12345',
        matches: false
      }
    ]
  },
  {
    name: 'should match a wildcard region',
    resourceStatements: ['arn:aws:ec2:*:123456789012:instance/12345'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/12345',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:ec2:*:123456789012:instance/12345',
        matches: true
      }
    ]
  },
  {
    name: 'should not match if a different account',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/12345'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:987654321012:instance/12345',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/12345',
        matches: false
      }
    ]
  },
  {
    name: 'should match a wildcard account',
    resourceStatements: ['arn:aws:ec2:us-east-1:*:instance/12345'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/12345',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:*:instance/12345',
        matches: true
      }
    ]
  },
  {
    name: 'should match a wildcard resource',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/*'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/12345',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/*',
        matches: true
      }
    ]
  },
  {
    name: 'should not match a wildcard product',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:*/12345'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/12345',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:*/12345',
        matches: false
      }
    ]
  },
  {
    name: 'should match a wildcard resource with a colon separator',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance:*'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance:12345',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance:*',
        matches: true
      }
    ]
  },
  {
    name: 'should not match a wildcard product with a colon separator',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:*:12345'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance:12345',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:*:12345',
        matches: false
      }
    ]
  },
  {
    name: 'should replace a context variable in the resource',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
      accountId: '123456789012'
    },
    expectMatch: true,
    context: {
      'aws:PrincipalTag/Foo': 'bar'
    },
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}',
        resolvedValue: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
        matches: true
      }
    ]
  },
  {
    name: 'should not replace a context variable if a string array',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
      accountId: '123456789012'
    },
    expectMatch: false,
    context: {
      'aws:PrincipalTag/Foo': ['bar', 'baz']
    },
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}',
        matches: false,
        errors: [
          '{aws:PrincipalTag/Foo} is a multi value context key, and cannot be used for replacement. This will never match'
        ]
      }
    ]
  },
  {
    name: 'should replace a context variable with a default value',
    resourceStatements: [
      "arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo, 'defaultfoo'}"
    ],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
      accountId: '123456789012'
    },
    expectMatch: true,
    context: {
      'aws:PrincipalTag/Foo': 'bar'
    },
    explains: [
      {
        resource:
          "arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo, 'defaultfoo'}",
        resolvedValue: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
        matches: true
      }
    ]
  },
  {
    name: 'should use a default value if a context variable does not exist',
    resourceStatements: [
      "arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo, 'defaultfoo'}"
    ],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/defaultfoo',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource:
          "arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo, 'defaultfoo'}",
        resolvedValue: 'arn:aws:ec2:us-east-1:123456789012:instance/defaultfoo',
        matches: true
      }
    ]
  },
  {
    name: 'should match if only one value matches',
    resourceStatements: [
      'ars:aws:s3:::government_secrets',
      'arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}'
    ],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
      accountId: '123456789012'
    },
    expectMatch: true,
    context: {
      'aws:PrincipalTag/Foo': 'bar'
    },
    explains: [
      {
        resource: 'ars:aws:s3:::government_secrets',
        matches: false
      },
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}',
        resolvedValue: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
        matches: true
      }
    ]
  }
]

function validateExplains(expected: ResourceExplain[], actual: ResourceExplain[]) {
  expect(actual.length).toBe(expected.length)
  for (const explain of expected) {
    const found = actual.find((e) => e.resource === explain.resource)
    expect(found, `Missing explain for ${explain.resource}`).toBeDefined()
    expect(found?.matches, `${explain.resource} match`).toBe(explain.matches)
    if (explain.resolvedValue) {
      expect(found?.resolvedValue, `${explain.resource} resolved value`).toBe(explain.resolvedValue)
    } else {
      expect(
        found?.resolvedValue,
        `${explain.resource} resolved value to be undefined`
      ).toBeUndefined()
    }
    if (explain.errors) {
      expect(found?.errors, `${explain.resource} errors`).toEqual(explain.errors.sort())
    }
  }
}

describe('requestMatchesResources', () => {
  for (const rt of resourceTests) {
    it(rt.name || `should match ${rt.resource}`, () => {
      //Given a policy
      const policy = loadPolicy({
        Statement: {
          Effect: 'Allow',
          Resource: rt.resourceStatements
        }
      })

      //And a request with a resource
      const request = new AwsRequestImpl(
        'principal',
        rt.resource,
        's3:GetBucket',
        new RequestContextImpl(rt.context || {})
      )

      //When the request is checked against the resource statement
      const response = requestMatchesResources(
        request,
        (policy.statements()[0] as ResourceStatement).resources()
      )

      //Then the request should match the resource statement
      expect(response.matches).toBe(rt.expectMatch)
      validateExplains(rt.explains, response.explains)
    })
  }
})

const notResourceTests: ResourceTest[] = [
  {
    name: 'should match a different resource',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
    resource: {
      resource: 'arn:aws:s3:::different_bucket',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket',
        matches: true
      }
    ]
  },
  {
    name: 'should not match if any resource matches',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket', 'arn:aws:s3:::different_bucket'],
    resource: {
      resource: 'arn:aws:s3:::different_bucket',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket',
        matches: true
      },
      {
        resource: 'arn:aws:s3:::different_bucket',
        matches: false
      }
    ]
  },
  {
    name: 'should match if all resoures do not match',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket', 'arn:aws:s3:::different_bucket'],
    resource: {
      resource: 'arn:aws:s3:::yet_another_bucket',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket',
        matches: true
      },
      {
        resource: 'arn:aws:s3:::different_bucket',
        matches: true
      }
    ]
  },
  {
    name: 'should not match if a variable is missing',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}'],
    resource: {
      resource: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}',
        matches: false,
        errors: [
          '{aws:PrincipalTag/Foo} not found in request context, and no default value provided. This will never match'
        ]
      }
    ]
  }
]

describe('requestMatchesNotResources', () => {
  for (const rt of notResourceTests) {
    it(rt.name || `should match ${rt.resource}`, () => {
      //Given a policy
      const policy = loadPolicy({
        Statement: {
          Effect: 'Allow',
          NotResource: rt.resourceStatements
        }
      })

      //And a request with a resource
      const request = new AwsRequestImpl(
        'principal',
        rt.resource,
        's3:GetBucket',
        new RequestContextImpl(rt.context || {})
      )

      //When the request is checked against the resource statement
      const response = requestMatchesNotResources(
        request,
        (policy.statements()[0] as NotResourceStatement).notResources()
      )

      //Then the request should match the resource statement
      expect(response.matches).toBe(rt.expectMatch)
      validateExplains(rt.explains, response.explains)
    })
  }
})

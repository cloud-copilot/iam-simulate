import { loadPolicy, NotResourceStatement, ResourceStatement } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { ResourceExplain } from '../explain/statementExplain.js'
import { AwsRequestImpl } from '../request/request.js'
import { RequestContextImpl } from '../requestContext.js'
import { requestMatchesNotResources, requestMatchesResources } from './resource.js'

type ResourceStatements =
  | {
      resourceStatements: string[]
      notResourceStatements?: never
    }
  | {
      resourceStatements?: never
      notResourceStatements: string[]
    }

type ResourceTest = {
  name?: string
  only?: true
  effect?: 'Allow' | 'Deny'
  resource: {
    resource: string
    accountId: string
  }
  expectMatch: boolean
  context?: Record<string, string | string[]>
  explains: ResourceExplain[]
} & ResourceStatements

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
        matches: false,
        errors: ['Partition does not match']
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
        matches: false,
        errors: ['Service does not match']
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
        matches: false,
        errors: ['Region does not match']
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
        matches: false,
        errors: ['Account does not match']
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
        matches: false,
        errors: ['Product does not match']
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
        matches: false,
        errors: ['Product does not match']
      }
    ]
  },
  {
    name: 'should return no match if the s3 bucket name is different',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
    resource: {
      resource: 'arn:aws:s3:::wildly_different_bucket',
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
    name: 'should return no match on an s3 object if the bucket is different',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    resource: {
      resource: 'arn:aws:s3:::other_bucket/secret.txt',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: false
      }
    ]
  },
  {
    name: 'should return no match on an s3 object if the bucket is the same but the object is different',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/foo/*'],
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/bar/secret.txt',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/foo/*',
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
      'arn:aws:s3:::government_secrets',
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
        resource: 'arn:aws:s3:::government_secrets',
        matches: false,
        errors: ['Service does not match']
      },
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}',
        resolvedValue: 'arn:aws:ec2:us-east-1:123456789012:instance/bar',
        matches: true
      }
    ]
  },
  {
    name: 'should match when policy is a superset of a request wildcard',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: true
      }
    ]
  },
  {
    name: 'Resource & Allow when policy is a subset of a request wildcard',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/foo*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
        matches: true
      }
    ]
  },
  {
    name: 'should not match when policy and request wildcards do not overlap',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/bar*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/bar*',
        matches: false
      }
    ]
  },
  {
    name: 'should match when request wildcard is in a non-resource segment',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/i-123'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:ec2:*:123456789012:instance/i-123',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/i-123',
        matches: true
      }
    ]
  },
  {
    name: 'should match when request is a single wildcard',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
    effect: 'Allow',
    resource: {
      resource: '*',
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
    name: 'should match when policy and request wildcards are identical',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: true
      }
    ]
  },
  {
    name: 'should match when policy and request wildcards are identical in a non-resource segment',
    resourceStatements: ['arn:aws:ec2:*:123456789012:instance/*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:ec2:*:123456789012:instance/*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:ec2:*:123456789012:instance/*',
        matches: true
      }
    ]
  },
  {
    name: 'should match when policy and request wildcards are identical for deny',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: true
      }
    ]
  },
  {
    name: 'should match when policy and request wildcards are identical in a non-resource segment for deny',
    resourceStatements: ['arn:aws:ec2:*:123456789012:instance/*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:ec2:*:123456789012:instance/*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:ec2:*:123456789012:instance/*',
        matches: true
      }
    ]
  },
  {
    name: 'should not match when policy is a subset of a request wildcard for deny',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/foo*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
        matches: false
      }
    ]
  },
  {
    name: 'Resource & Deny when request wildcard is in a non-resource segment for deny',
    resourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/i-123'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:ec2:*:123456789012:instance/i-123',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/i-123',
        matches: false
      }
    ]
  },
  {
    name: 'should not match when request is a single wildcard for deny',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
    effect: 'Deny',
    resource: {
      resource: '*',
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
    name: 'should match when policy is a superset of a request wildcard for deny',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: true
      }
    ]
  },
  {
    name: 'should not match when policy and request wildcards do not overlap for deny',
    resourceStatements: ['arn:aws:s3:::my_corporate_bucket/bar*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/bar*',
        matches: false
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
    } else {
      expect(found?.errors, `${explain.resource} errors`).toBeUndefined()
    }
  }
}

describe('requestMatchesResources', () => {
  for (const rt of resourceTests) {
    const testFn = rt.only ? it.only : it
    testFn(rt.name || `should match ${rt.resource}`, () => {
      //Given a policy
      const policy = loadPolicy({
        Statement: {
          Effect: rt.effect ?? 'Allow',
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
        (policy.statements()[0] as ResourceStatement).resources(),
        rt.resourceStatements ? 'Resource' : 'NotResource',
        rt.effect ?? 'Allow'
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
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
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
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket', 'arn:aws:s3:::different_bucket'],
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
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket', 'arn:aws:s3:::different_bucket'],
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
    notResourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}'],
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
  },
  {
    name: 'NotResource & Allow when policy is a superset of a request wildcard',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Allow when policy is a subset of a request wildcard',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/foo*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
        matches: true
      }
    ]
  },
  {
    name: 'NotResource & Allow when policy and request wildcards do not overlap',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/bar*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/bar*',
        matches: true
      }
    ]
  },
  {
    name: 'NotResource & Allow when request is a single wildcard',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket'],
    effect: 'Allow',
    resource: {
      resource: '*',
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
    name: 'NotResource & Allow when policy and request wildcards are identical',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Allow when policy and request wildcards are identical in a non-resource segment',
    notResourceStatements: ['arn:aws:ec2:*:123456789012:instance/*'],
    effect: 'Allow',
    resource: {
      resource: 'arn:aws:ec2:*:123456789012:instance/*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:*:123456789012:instance/*',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Deny when policy and request wildcards are identical for deny',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Deny when policy and request wildcards are identical in a non-resource segment for deny',
    notResourceStatements: ['arn:aws:ec2:*:123456789012:instance/*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:ec2:*:123456789012:instance/*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:*:123456789012:instance/*',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Deny when policy is a subset of a request wildcard for deny',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/foo*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Deny when request wildcard is in a non-resource segment for deny',
    notResourceStatements: ['arn:aws:ec2:us-east-1:123456789012:instance/i-123'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:ec2:*:123456789012:instance/i-123',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:ec2:us-east-1:123456789012:instance/i-123',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Deny when policy is a superset of a request wildcard for deny',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: false,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/*',
        matches: false
      }
    ]
  },
  {
    name: 'NotResource & Deny when policy and request wildcards do not overlap for deny',
    notResourceStatements: ['arn:aws:s3:::my_corporate_bucket/bar*'],
    effect: 'Deny',
    resource: {
      resource: 'arn:aws:s3:::my_corporate_bucket/foo*',
      accountId: '123456789012'
    },
    expectMatch: true,
    explains: [
      {
        resource: 'arn:aws:s3:::my_corporate_bucket/bar*',
        matches: true
      }
    ]
  }
]

describe('requestMatchesNotResources', () => {
  for (const rt of notResourceTests) {
    const testFn = rt.only ? it.only : it
    testFn(rt.name || `should match ${rt.resource}`, () => {
      //Given a policy
      const policy = loadPolicy({
        Statement: {
          Effect: rt.effect ?? 'Allow',
          NotResource: rt.notResourceStatements
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
        (policy.statements()[0] as NotResourceStatement).notResources(),
        rt.resourceStatements ? 'Resource' : 'NotResource',
        rt.effect ?? 'Allow'
      )

      //Then the request should match the resource statement
      expect(response.matches).toBe(rt.expectMatch)
      validateExplains(rt.explains, response.explains)
    })
  }
})

import { loadPolicy, ResourceStatement } from "@cloud-copilot/iam-policy"
import { describe, expect, it } from "vitest"
import { RequestImpl } from "../request/request.js"
import { RequestContextImpl } from "../requestContext.js"
import { requestMatchesResources } from "./resource.js"

interface ResourceTest {
  name?: string
  resourceStatements: string[]
  resource: string
  expectMatch: boolean
  context?: Record<string, string | string[]>
}

const resourceTests: ResourceTest[] = [
  {
    name: 'should match wildcard',
    resourceStatements: ["*"],
    resource: "arn:aws:s3:::my_corporate_bucket",
    expectMatch: true
  }, {
    name: 'should fail if different partition',
    resourceStatements: ["arn:aws:s3:::my_corporate_bucket"],
    resource: "arn:aws-gov:s3:::my_corporate_bucket",
    expectMatch: false
  }, {
    name: 'should match a wildcard partition',
    resourceStatements: ["arn:*:s3:::my_corporate_bucket"],
    resource: "arn:aws:s3:::my_corporate_bucket",
    expectMatch: true
  }, {
    name: 'should match a question mark partition',
    resourceStatements: ["arn:???:s3:::my_corporate_bucket"],
    resource: "arn:aws:s3:::my_corporate_bucket",
    expectMatch: true
  }, {
    name: 'Should fail if different service',
    resourceStatements: ["arn:aws:s3:::my_corporate_bucket"],
    resource: "arn:aws:sqs:::my_corporate_bucket",
    expectMatch: false
  }, {
    name: 'should match a wildcard service',
    resourceStatements: ["arn:aws:*:::my_corporate_bucket"],
    resource: "arn:aws:s3:::my_corporate_bucket",
    expectMatch: true
  }, {
    name: "should not match if different region",
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance/12345"],
    resource: "arn:aws:ec2:us-west-1:123456789012:instance/12345",
    expectMatch: false
  },{
    name: 'should match a wildcard region',
    resourceStatements: ["arn:aws:ec2:*:123456789012:instance/12345"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/12345",
    expectMatch: true
  },  {
    name: 'should not match if a different account',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance/12345"],
    resource: "arn:aws:ec2:us-east-1:987654321012:instance/12345",
    expectMatch: false
  }, {
    name: 'should match a wildcard account',
    resourceStatements: ["arn:aws:ec2:us-east-1:*:instance/12345"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/12345",
    expectMatch: true
  }, {
    name: 'should match a wildcard resource',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance/*"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/12345",
    expectMatch: true
  }, {
    name: 'should not match a wildcard product',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:*/12345"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/12345",
    expectMatch: false
  }, {
    name: 'should match a wildcard resource with a colon separator',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance:*"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance:12345",
    expectMatch: true
  }, {
    name: 'should not match a wildcard product with a colon separator',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:*:12345"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance:12345",
    expectMatch: false
  }, {
    name: 'should replace a context variable in the resource',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/bar",
    expectMatch: true,
    context: {
      'aws:PrincipalTag/Foo': 'bar'
    }
  }, {
    name: 'should not replace a context variable if a string array',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo}"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/bar",
    expectMatch: false,
    context: {
      'aws:PrincipalTag/Foo': ['bar', 'baz']
    }
  }, {
    name: 'should replace a context variable with a default value',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo, 'defaultfoo'}"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/bar",
    expectMatch: true,
    context: {
      'aws:PrincipalTag/Foo': 'bar'
    }
  }, {
    name: 'should use a default value if a context variable does not exist',
    resourceStatements: ["arn:aws:ec2:us-east-1:123456789012:instance/${aws:PrincipalTag/Foo, 'defaultfoo'}"],
    resource: "arn:aws:ec2:us-east-1:123456789012:instance/defaultfoo",
    expectMatch: true
  }
]

describe('requestMatchesResources', () => {
  for(const rt of resourceTests) {
    it(rt.name || `should match ${rt.resource}`, () => {
      //Given a policy
      const policy = loadPolicy({
        Statement: {
          Effect: 'Allow',
          Resource: rt.resourceStatements,
        }
      })

      //And a request with a resource
      const request = new RequestImpl('principal',
                                      rt.resource,
                                      's3:GetBucket',
                                      new RequestContextImpl(rt.context || {}))

      //When the request is checked against the resource statement
      const response = requestMatchesResources(request, (policy.statements()[0] as ResourceStatement).resources())

      //Then the request should match the resource statement
      expect(response).toBe(rt.expectMatch)
    })
  }
})
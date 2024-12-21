import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { StringLike } from "./StringLike.js";

const stringLikeTests: BaseOperatorTest[] = [
  {
    name: 'Should match an exact value',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test',
    expected: true,
    explains: [
      {
        value: 'test',
        matches: true
      }
    ]
  },
  {
    name: 'Should match a value with a wildcard',
    requestContext: {},
    policyValues: ['test*'],
    testValue: 'test123',
    expected: true,
  },
  {
    name: 'Should match a value with a wildcard in the middle',
    requestContext: {},
    policyValues: ['test???value'],
    testValue: 'test123value',
    expected: true,
  },
  {
    name: 'Is case sensitive',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'TEST',
    expected: false,
  },
  {
    name: 'Should replace a policy value',
    requestContext: {
      'aws:username':'Bob'
    },
    policyValues: ['test${aws:username}*'],
    testValue: 'testBobPerson',
    expected: true,
    explains: [
      {
        value: 'test${aws:username}*',
        matches: true,
        resolvedValue: 'testBob*'
      }
    ]
  },
  {
    name: 'Should replace a policy value and not match wildcards in the policy value',
    requestContext: {
      'aws:username':'Bob*'
    },
    policyValues: ['test${aws:username}'],
    testValue: 'testBobTwo',
    expected: false,
    explains: [
      {
        value: 'test${aws:username}',
        matches: false,
        resolvedValue: 'testBob*'
      }
    ]
  },
  {
    name: 'Should return replacement errors',
    requestContext: {},
    policyValues: ['test${aws:username}*'],
    testValue: 'testBobPerson',
    expected: false,
    explains: [
      {
        value: 'test${aws:username}*',
        matches: false,
        errors: ['{aws:username} not found in request context, and no default value provided. This will never match']
      }
    ]
  }
]

testOperator('StringLike',stringLikeTests, StringLike)
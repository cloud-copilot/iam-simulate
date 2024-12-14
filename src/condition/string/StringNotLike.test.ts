import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { StringNotLike } from "./StringNotLike.js";

const stringNotLikeTests: BaseOperatorTest[] = [
  {
    name: 'Should not match an exact value',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test',
    expected: false,
    explains: [
      {
        value: 'test',
        matches: false
      }
    ]
  },
  {
    name: 'Should not match a value with a wildcard',
    requestContext: {},
    policyValues: ['test*'],
    testValue: 'test123',
    expected: false,
  },
  {
    name: 'Should not match a value with a wildcard in the middle',
    requestContext: {},
    policyValues: ['test???value'],
    testValue: 'test123value',
    expected: false,
  },
  {
    name: 'Is case sensitive',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'TEST',
    expected: true,
  },
  {
    name: 'Should replace a policy value',
    requestContext: {
      'aws:username':'Bob'
    },
    policyValues: ['test${aws:username}*'],
    testValue: 'testBobPerson',
    expected: false,
    explains: [
      {
        value: 'test${aws:username}*',
        matches: false,
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
    expected: true,
    explains: [
      {
        value: 'test${aws:username}',
        matches: true,
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

testOperator('StringNotLike',stringNotLikeTests, StringNotLike)
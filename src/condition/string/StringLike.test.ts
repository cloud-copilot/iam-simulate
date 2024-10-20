import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { StringLike } from "./StringLike.js";

const stringLikeTests: BaseOperatorTest[] = [
  {
    name: 'Should match an exact value',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test',
    expected: true,
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
    policyValues: ['test${aws:username}'],
    testValue: 'testBob',
    expected: true,
  },
  {
    name: 'Should replace a policy value and not match wildcards in the policy value',
    requestContext: {
      'aws:username':'Bob*'
    },
    policyValues: ['test${aws:username}'],
    testValue: 'testBobTwo',
    expected: false,
  }
]

testOperator('StringLike',stringLikeTests, StringLike)
import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { StringEqualsIgnoreCase } from "./StringEqualsIgnoreCase.js";

const stringEqualsIgnoreCaseTests: BaseOperatorTest[] = [
  {
    name: 'should return true if the strings are equal',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test',
    expected: true
  },
  {
    name: 'should return true if the strings are equal but different case',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'TEST',
    expected: true
  },
  {
    name: 'should return false if the strings are not equal',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test2',
    expected: false
  },
  {
    name: 'should replace variables in the policy value',
    requestContext: {'aws:username': 'Bob'},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: true
  },
  {
    name: 'should ignore case in replaced variables',
    requestContext: {'aws:username': 'BOB'},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/bob',
    expected: true
  },
  {
    name: 'should ignore wildcards in the policy value',
    requestContext: {},
    policyValues: ['test*'],
    testValue: 'test123',
    expected: false
  }
]

testOperator('StringEqualsIgnoreCase', stringEqualsIgnoreCaseTests, StringEqualsIgnoreCase)
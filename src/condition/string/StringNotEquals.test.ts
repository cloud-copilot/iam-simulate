import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { StringNotEquals } from "./StringNotEquals.js";

const stringNotEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return true if not a match',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test2',
    expected: true
  },
  {
    name: 'should return false if a match',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test',
    expected: false
  },
  {
    name: 'should return true if case is different',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'TEST',
    expected: true
  },
  {
    name: 'should replace variables and return false if a match',
    requestContext: {'aws:username': 'Bob'},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: false
  }

]

testOperator('StringNotEquals', stringNotEqualsTests, StringNotEquals)
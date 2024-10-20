import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { Bool } from "./Bool.js";

const boolTests: BaseOperatorTest[] = [
  {
    name: 'should return true if both values are true',
    policyValues: ['true'],
    testValue: 'true',
    expected: true
  },
  {
    name: 'should return true if both values are false',
    policyValues: ['false'],
    testValue: 'false',
    expected: true
  },
  {
    name: 'should ignore case',
    policyValues: ['true'],
    testValue: 'TRUE',
    expected: true
  },
  {
    name: 'should return true if true and fase are both in the policy values',
    policyValues: ['true', 'false'],
    testValue: 'true',
    expected: true
  },
  {
    name: 'should replace variables',
    policyValues: ['${aws:SecureTransport}'],
    requestContext: {
      'aws:SecureTransport': 'true'
    },
    testValue: 'true',
    expected: true
  },
  {
    name: 'should ignore case in replaced variables',
    policyValues: ['${aws:SecureTransport}'],
    requestContext: {
      'aws:SecureTransport': 'TRUE'
    },
    testValue: 'true',
    expected: true
  },
  {
    name: 'should return false if the variable is not in the context',
    policyValues: ['${aws:SecureTransport}'],
    testValue: 'true',
    expected: false
  },
  {
    name: 'should return false if the variable is not a boolean',
    policyValues: ['${aws:SecureTransport}'],
    requestContext: {
      'aws:SecureTransport': 'not a boolean'
    },
    testValue: 'true',
    expected: false
  },
  {
    name: 'should return false if the value is not a boolean',
    policyValues: ['true'],
    testValue: 'not a boolean',
    expected: false
  }
]

testOperator('Bool', boolTests, Bool)
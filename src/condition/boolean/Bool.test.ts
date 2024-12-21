import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { Bool } from "./Bool.js";

const boolTests: BaseOperatorTest[] = [
  {
    name: 'should return true if both values are true',
    policyValues: ['true'],
    testValue: 'true',
    expected: true,
    explains: [
      {
        value: 'true',
        matches: true
      }
    ]
  },
  {
    name: 'should return true if both values are false',
    policyValues: ['false'],
    testValue: 'false',
    expected: true,
    explains: [
      {
        value: 'false',
        matches: true
      }
    ]
  },
  {
    name: 'should ignore case',
    policyValues: ['true'],
    testValue: 'TRUE',
    expected: true,
    explains: [
      {
        value: 'true',
        matches: true
      }
    ]
  },
  {
    name: 'should return true if true and fase are both in the policy values',
    policyValues: ['true', 'false'],
    testValue: 'true',
    expected: true,
    explains: [
      {
        value: 'true',
        matches: true
      },
      {
        value: 'false',
        matches: false
      }
    ]
  },
  {
    name: 'should replace variables',
    policyValues: ['${aws:SecureTransport}'],
    requestContext: {
      'aws:SecureTransport': 'true'
    },
    testValue: 'true',
    expected: true,
    explains: [
      {
        value: '${aws:SecureTransport}',
        matches: true,
        resolvedValue: 'true'
      }
    ]
  },
  {
    name: 'should ignore case in replaced variables',
    policyValues: ['${aws:SecureTransport}'],
    requestContext: {
      'aws:SecureTransport': 'TRUE'
    },
    testValue: 'true',
    expected: true,
    explains: [
      {
        value: '${aws:SecureTransport}',
        matches: true,
        resolvedValue: 'TRUE'
      }
    ]
  },
  {
    name: 'should return false if the variable is not in the context',
    policyValues: ['${aws:SecureTransport}'],
    testValue: 'true',
    expected: false,
    explains: [
      {
        value: '${aws:SecureTransport}',
        matches: false,
        errors: ['{aws:SecureTransport} not found in request context, and no default value provided. This will never match']
      }
    ]
  },
  {
    name: 'should return false if the variable is not a boolean',
    policyValues: ['${aws:SecureTransport}'],
    requestContext: {
      'aws:SecureTransport': 'not a boolean'
    },
    testValue: 'true',
    expected: false,
    explains: [
      {
        value: '${aws:SecureTransport}',
        matches: false,
        errors: ['Invalid boolean pattern'],
        resolvedValue: 'not a boolean'
      }
    ]
  },
  {
    name: 'should return false if the value is not a boolean',
    policyValues: ['true'],
    testValue: 'not a boolean',
    expected: false,
    explains: [
      {
        value: 'true',
        matches: false,
        errors: ['request value \'not a boolean\' is not a boolean']
      }
    ]
  }
]

testOperator('Bool', boolTests, Bool)
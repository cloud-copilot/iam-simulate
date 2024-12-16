import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { StringNotEqualsIgnoreCase } from "./StringNotEqualsIgnoreCase.js";

const stringNotEqualsIgnoreCaseTests: BaseOperatorTest[] = [
  {
    name: 'should return true if not a match',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test2',
    expected: true,
    explains: [
      {
        value: 'test',
        matches: true
      }
    ]
  },
  {
    name: 'should return false if a match',
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
    name: 'should return false if case is different',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'TEST',
    expected: false,
    explains: [
      {
        value: 'test',
        matches: false
      }
    ]
  },
  {
    name: 'should replace variables and return false if a match',
    requestContext: {'aws:username': 'Bob'},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: false,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/${aws:username}',
        matches: false,
        resolvedValue: 'arn:aws:iam::123456789012:user/Bob'
      }
    ]

  },
  {
    name: 'should return replacement errors',
    requestContext: {},
    policyValues: ['${aws:username}'],
    testValue: 'test',
    expected: false,
    explains: [
      {
        value: '${aws:username}',
        matches: false,
        errors: ['{aws:username} not found in request context, and no default value provided. This will never match']
      }
    ]
  },
  {
    name: 'should return false if any value is a match',
    requestContext: {},
    policyValues: ['test1', 'test2'],
    testValue: 'TEST1',
    expected: false,
    explains: [
      {
        value: 'test1',
        matches: false
      },
      {
        value: 'test2',
        matches: true
      }
    ]
  }

]

testOperator('StringNotEqualsIgnoreCase', stringNotEqualsIgnoreCaseTests, StringNotEqualsIgnoreCase)
import { BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { StringEqualsIgnoreCase } from './StringEqualsIgnoreCase.js'

const stringEqualsIgnoreCaseTests: BaseOperatorTest[] = [
  {
    name: 'should return true if the strings are equal',
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
    name: 'should return true if the strings are equal but different case',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'TEST',
    expected: true,
    explains: [
      {
        matches: true,
        value: 'test'
      }
    ]
  },
  {
    name: 'should return false if the strings are not equal',
    requestContext: {},
    policyValues: ['test'],
    testValue: 'test2',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'test'
      }
    ]
  },
  {
    name: 'should replace variables in the policy value',
    requestContext: { 'aws:username': 'Bob' },
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: true,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/${aws:username}',
        matches: true,
        resolvedValue: 'arn:aws:iam::123456789012:user/Bob'
      }
    ]
  },
  {
    name: 'should ignore case in replaced variables',
    requestContext: { 'aws:username': 'BOB' },
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/bob',
    expected: true,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/${aws:username}',
        matches: true,
        resolvedValue: 'arn:aws:iam::123456789012:user/BOB'
      }
    ]
  },
  {
    name: 'should ignore wildcards in the policy value',
    requestContext: {},
    policyValues: ['test*'],
    testValue: 'test123',
    expected: false,
    explains: [
      {
        value: 'test*',
        matches: false
      }
    ]
  },
  {
    name: 'should return replacement errors',
    requestContext: { 'aws:PrincipalOrgPaths': ['123', '456'] },
    policyValues: ['test${aws:PrincipalOrgPaths}'],
    testValue: 'test123',
    expected: false,
    explains: [
      {
        value: 'test${aws:PrincipalOrgPaths}',
        matches: false,
        errors: [
          '{aws:PrincipalOrgPaths} is a multi value context key, and cannot be used for replacement. This will never match'
        ]
      }
    ]
  }
]

testOperator('StringEqualsIgnoreCase', stringEqualsIgnoreCaseTests, StringEqualsIgnoreCase)

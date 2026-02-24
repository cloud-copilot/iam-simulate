import { type BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { StringEquals } from './StringEquals.js'

const stringEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should match exact string',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/Bob', 'arn:aws:iam::123456789012:user/Alice'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: true,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/Bob',
        matches: true
      },
      {
        value: 'arn:aws:iam::123456789012:user/Alice',
        matches: false
      }
    ]
  },
  {
    name: 'should not match different strings',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/Bob', 'arn:aws:iam::123456789012:user/Alice'],
    testValue: 'arn:aws:iam::123456789012:user/Susan',
    expected: false,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/Bob',
        matches: false
      },
      {
        value: 'arn:aws:iam::123456789012:user/Alice',
        matches: false
      }
    ]
  },
  {
    name: 'should not match wildcards',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/*'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: false
  },
  {
    name: 'should match with variables',
    requestContext: { 'aws:userid': 'Bob' },
    policyValues: ['arn:aws:iam::123456789012:user/${aws:userid}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: true,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/${aws:userid}',
        matches: true,
        resolvedValue: 'arn:aws:iam::123456789012:user/Bob'
      }
    ]
  },
  {
    name: 'should not match with variables',
    requestContext: { 'aws:userid': 'Bob' },
    policyValues: ['arn:aws:iam::123456789012:user/${aws:userid}'],
    testValue: 'arn:aws:iam::123456789012:user/Alice',
    expected: false,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/${aws:userid}',
        matches: false,
        resolvedValue: 'arn:aws:iam::123456789012:user/Bob'
      }
    ]
  },
  {
    name: 'should be case sensitive',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/BOB'],
    testValue: 'arn:aws:iam::123456789012:user/bob',
    expected: false,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/BOB',
        matches: false
      }
    ]
  },
  {
    name: 'should return an error for missing variables',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:userid}'],
    testValue: 'arn:aws:iam::123456789012:user/Alice',
    expected: false,
    explains: [
      {
        value: 'arn:aws:iam::123456789012:user/${aws:userid}',
        matches: false,
        errors: [
          '{aws:userid} not found in request context, and no default value provided. This will never match'
        ]
      }
    ]
  }
]

testOperator('StringEquals', stringEqualsTests, StringEquals)

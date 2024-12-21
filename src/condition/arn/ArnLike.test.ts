import { BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { ArnLike } from './ArnLike.js'

const ArnLikeTests: BaseOperatorTest[] = [
  {
    name: 'should return false if not a valid request arn',
    requestContext: { 'aws:username': 'Bob' },
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:::bucket-name', //Not enough colons
    expected: false,
    explains: [
      {
        matches: false,
        value: 'arn:aws:iam::123456789012:user/${aws:username}',
        resolvedValue: 'arn:aws:iam::123456789012:user/Bob',
        errors: [`request ARN 'arn:::bucket-name' is not a valid ARN`]
      }
    ]
  },
  {
    name: 'should return false if not a valid policy arn',
    requestContext: {},
    policyValues: ['arn:::bucket-name'], //Not enough colons
    testValue: 'arn:aws:iam::123456789012:user/${aws:username}',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'arn:::bucket-name',
        errors: ['Invalid ARN']
      }
    ]
  },
  {
    name: 'should return true if a match',
    requestContext: {},
    policyValues: ['arn:aws:ec2:us-east-1:123456789012:instance/i-12345'],
    testValue: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345',
    expected: true,
    explains: [
      {
        matches: true,
        value: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345'
      }
    ]
  },
  {
    name: 'should return true if any match',
    requestContext: {},
    policyValues: [
      'arn:aws:ec2:us-east-1:123456789012:instance/i-12345',
      'arn:aws:ec2:us-east-1:123456789012:instance/i-98765'
    ],
    testValue: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345',
    expected: true,
    explains: [
      {
        matches: true,
        value: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345'
      },
      {
        matches: false,
        value: 'arn:aws:ec2:us-east-1:123456789012:instance/i-98765'
      }
    ]
  },
  {
    name: 'should return true if a match with no region or account id',
    requestContext: {},
    policyValues: ['arn:aws:s3:::my_corporate_bucket'],
    testValue: 'arn:aws:s3:::my_corporate_bucket',
    expected: true,
    explains: [
      {
        matches: true,
        value: 'arn:aws:s3:::my_corporate_bucket'
      }
    ]
  },
  {
    name: 'is case sensitive',
    requestContext: {},
    policyValues: ['arn:aws:ec2:us-east-1:123456789012:instance/i-12345'],
    testValue: 'arn:aws:ec2:us-east-1:123456789012:INSTANCE/I-12345',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345'
      }
    ]
  },
  {
    name: 'should match wildcards in every segment',
    requestContext: {},
    policyValues: ['arn:???:*:*:*:*'],
    testValue: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345',
    expected: true,
    explains: [
      {
        matches: true,
        value: 'arn:???:*:*:*:*'
      }
    ]
  },
  {
    name: 'should replace variables and return true if a match',
    requestContext: { 'aws:username': 'Bob' },
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: true,
    explains: [
      {
        matches: true,
        value: 'arn:aws:iam::123456789012:user/${aws:username}',
        resolvedValue: 'arn:aws:iam::123456789012:user/Bob'
      }
    ]
  },
  {
    name: 'should return an error if a variable is not defined',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'arn:aws:iam::123456789012:user/${aws:username}',
        errors: [
          '{aws:username} not found in request context, and no default value provided. This will never match'
        ]
      }
    ]
  }
]

testOperator('ArnLike', ArnLikeTests, ArnLike)

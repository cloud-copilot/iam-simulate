import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { ArnLike } from "./ArnLike.js";

const ArnLikeTests: BaseOperatorTest[] = [
  {
    name: 'should return false if not a valid request arn',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:::bucket-name', //Not enough colons
    expected: false
  },
  {
    name: 'should return false if not a valid policy arn',
    requestContext: {},
    policyValues: ['arn:::bucket-name'], //Not enough colons
    testValue: 'arn:aws:iam::123456789012:user/${aws:username}',
    expected: false
  },
  {
    name: 'should return true if a match',
    requestContext: {},
    policyValues: ['arn:aws:ec2:us-east-1:123456789012:instance/i-12345'],
    testValue: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345',
    expected: true
  },
  {
    name: 'should return true if a match with no region or account id',
    requestContext: {},
    policyValues: ['arn:aws:s3:::my_corporate_bucket'],
    testValue: 'arn:aws:s3:::my_corporate_bucket',
    expected: true
  },
  {
    name: 'is case sensitive',
    requestContext: {},
    policyValues: ['arn:aws:ec2:us-east-1:123456789012:instance/i-12345'],
    testValue: 'arn:aws:ec2:us-east-1:123456789012:INSTANCE/I-12345',
    expected: false
  },
  {
    name: 'should match wildcards in every segment',
    requestContext: {},
    policyValues: ['arn:???:*:*:*:*'],
    testValue: 'arn:aws:ec2:us-east-1:123456789012:instance/i-12345',
    expected: true
  },
  {
    name: 'should replace variables and return true if a match',
    requestContext: {'aws:username': 'Bob'},
    policyValues: ['arn:aws:iam::123456789012:user/${aws:username}'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: true
  }
]

testOperator('ArnLike', ArnLikeTests, ArnLike)
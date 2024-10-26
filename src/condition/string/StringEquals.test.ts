import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { StringEquals } from "./StringEquals.js";

const stringEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should match exact string',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/Bob', 'arn:aws:iam::123456789012:user/Alice'],
    testValue: 'arn:aws:iam::123456789012:user/Bob',
    expected: true
  },
  {
    name: 'should not match different string',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/Bob', 'arn:aws:iam::123456789012:user/Alice'],
    testValue: 'arn:aws:iam::123456789012:user/Susan',
    expected: false
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
    expected: true
  },
  {
    name: 'should not match with variables',
    requestContext: { 'aws:userid': 'Bob' },
    policyValues: ['arn:aws:iam::123456789012:user/${aws:userid}'],
    testValue: 'arn:aws:iam::123456789012:user/Alice',
    expected: false
  },
  {
    name: 'should be case sensitive',
    requestContext: {},
    policyValues: ['arn:aws:iam::123456789012:user/BOB'],
    testValue: 'arn:aws:iam::123456789012:user/bob',
    expected: false

  }
]

testOperator('StringEquals', stringEqualsTests, StringEquals)
import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { DateEquals } from "./DateEquals.js";

const dateEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should match if equal',
    policyValues: ['2024-01-01'],
    testValue: '2024-01-01T00:00:00Z',
    expected: true
  },
  {
    name: 'should match dates to epochs',
    policyValues: ['2024-01-01'],
    testValue: '1704067200000',
    expected: true
  },
  {
    name: 'should not match if one second earlier',
    policyValues: ['2024-01-01'],
    testValue: (1704067200000 - 1).toString(),
    expected: false
  },
  {
    name: 'should not match if one second later',
    policyValues: ['2024-01-01'],
    testValue: (1704067200000 + 1).toString(),
    expected: false
  },
  {
    name: 'should not match if policy value is not a date',
    policyValues: ['not a date'],
    testValue: '2024-01-01T00:00:00Z',
    expected: false
  },
  {
    name: 'should not match if test value is not a date',
    policyValues: ['2024-01-01'],
    testValue: 'not a date',
    expected: false
  },
  {
    name: 'should not match if both values are not dates',
    policyValues: ['bad value'],
    testValue: 'not a date',
    expected: false
  }
]

testOperator('DateEquals', dateEqualsTests, DateEquals)
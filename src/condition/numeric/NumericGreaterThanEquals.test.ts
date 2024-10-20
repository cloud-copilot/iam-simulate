import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { NumericGreaterThanEquals } from "./NumericGreaterThanEquals.js";

const numericGreaterThanEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return true if the test value is greater than the policy value',
    policyValues: ['10'],
    testValue: '5',
    expected: true
  },
  {
    name: 'should return true if the test value is equals to the policy value',
    policyValues: ['10'],
    testValue: '10',
    expected: true
  },
  {
    name: 'should return false if the test value is less than the policy value',
    policyValues: ['10'],
    testValue: '15',
    expected: false
  },
  {
    name: 'should return false if the policy values are not numbers',
    policyValues: ['a'],
    testValue: '10',
    expected: false
  },
  {
    name: 'should return false if the test value is not a number',
    policyValues: ['10'],
    testValue: 'a',
    expected: false
  }
]

testOperator('NumericGreaterThanEquals', numericGreaterThanEqualsTests, NumericGreaterThanEquals)
import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { NumericEquals } from "./NumericEquals.js";

const numericEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return true if the values match',
    policyValues: ['10', '20'],
    testValue: '10',
    expected: true
  },
  {
    name: 'should return true for a float',
    policyValues: ['10.5'],
    testValue: '10.5',
    expected: true
  },
  {
    name: 'should return false if the values do not match',
    policyValues: ['10'],
    testValue: '20',
    expected: false
  },
  {
    name: 'should return false if the policy values are not numbers',
    policyValues: ['a', 'b'],
    testValue: '10',
    expected: false
  },
  {
    name: 'should return false if the test value is not a number',
    policyValues: ['10'],
    testValue: 'a',
    expected: false
  },
  {
    name: 'should match a float to an integer',
    policyValues: ['10'],
    testValue: '10.0',
    expected: true
  }
]

testOperator('NumericEquals', numericEqualsTests, NumericEquals)
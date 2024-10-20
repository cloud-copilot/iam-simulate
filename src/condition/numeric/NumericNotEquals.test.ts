import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { NumericNotEquals } from "./NumericNotEquals.js";

const numericNotEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return false if the values match',
    policyValues: ['10', '20'],
    testValue: '10',
    expected: false
  },
  {
    name: 'should return true if there are no matches',
    policyValues: ['10'],
    testValue: '20',
    expected: true
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
  }
]

testOperator('NumericNotEquals', numericNotEqualsTests, NumericNotEquals)
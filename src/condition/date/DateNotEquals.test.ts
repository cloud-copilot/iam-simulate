import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { DateNotEquals } from "./DateNotEquals.js";

const dateNotEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return false if the values match',
    policyValues: ['2024-01-01', '2025-01-01'],
    testValue: '2025-01-01',
    expected: false
  },
  {
    name: 'should return true if there are no matches',
    policyValues: ['2024-01-01'],
    testValue: '2023-12-25',
    expected: true
  },
  {
    name: 'should return false if the policy values are not valid dates',
    policyValues: ['a', 'b'],
    testValue: '2025-01-01',
    expected: false
  },
  {
    name: 'should return false if the test value is not a number',
    policyValues: ['2023-12-25'],
    testValue: 'a',
    expected: false
  }
]

testOperator('DateNotEquals', dateNotEqualsTests, DateNotEquals)
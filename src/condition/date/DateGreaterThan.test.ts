import { BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { DateGreaterThan } from './DateGreaterThan.js'

const dateGreaterThanTests: BaseOperatorTest[] = [
  {
    name: 'should return false if the test value is less than the policy value',
    policyValues: ['2024-01-01T00:00:00Z'],
    testValue: '2023-01-01T23:59:59Z',
    expected: false,
    explains: [
      {
        matches: false,
        value: '2024-01-01T00:00:00Z'
      }
    ]
  },
  {
    name: 'should return false if the test value is equals to the policy value',
    policyValues: ['2024-01-01T00:00:00Z'],
    testValue: '2024-01-01T00:00:00Z',
    expected: false,
    explains: [
      {
        matches: false,
        value: '2024-01-01T00:00:00Z'
      }
    ]
  },
  {
    name: 'should return true if the test value is greater than the policy value',
    policyValues: ['2024-01-01T00:00:00Z'],
    testValue: '2024-01-01T00:00:01Z',
    expected: true,
    explains: [
      {
        matches: true,
        value: '2024-01-01T00:00:00Z'
      }
    ]
  },
  {
    name: 'should return false if the policy values are not numbers',
    policyValues: ['a'],
    testValue: '2024-01-01T00:00:00Z',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'a',
        errors: ['a is not a date']
      }
    ]
  },
  {
    name: 'should return false if the test value is not a number',
    policyValues: ['2024-01-01T00:00:00Z'],
    testValue: 'a',
    expected: false,
    explains: [
      {
        matches: false,
        value: '2024-01-01T00:00:00Z',
        errors: [`request value 'a' is not a date`]
      }
    ]
  }
]

testOperator('DateGreaterThan', dateGreaterThanTests, DateGreaterThan)

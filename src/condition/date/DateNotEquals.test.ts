import { BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { DateNotEquals } from './DateNotEquals.js'

const dateNotEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return false if the values match',
    policyValues: ['2024-01-01', '2025-01-01'],
    testValue: '2025-01-01',
    expected: false,
    explains: [
      {
        matches: true,
        value: '2024-01-01'
      },
      {
        matches: false,
        value: '2025-01-01'
      }
    ]
  },
  {
    name: 'should return true if there are no matches',
    policyValues: ['2024-01-01'],
    testValue: '2023-12-25',
    expected: true,
    explains: [
      {
        matches: true,
        value: '2024-01-01'
      }
    ]
  },
  {
    name: 'should return false if the policy values are not valid dates',
    policyValues: ['a', 'b'],
    testValue: '2025-01-01',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'a',
        errors: ['a is not a date']
      },
      {
        matches: false,
        value: 'b',
        errors: ['b is not a date']
      }
    ]
  },
  {
    name: 'should return false if the test value is not a number',
    policyValues: ['2023-12-25'],
    testValue: 'a',
    expected: false,
    explains: [
      {
        matches: false,
        value: '2023-12-25',
        errors: [`request value 'a' is not a date`]
      }
    ]
  },
  {
    name: 'should return false if any value is a match',
    policyValues: ['2023-12-25', '2024-01-01'],
    testValue: '2024-01-01',
    expected: false,
    explains: [
      {
        matches: true,
        value: '2023-12-25'
      },
      {
        matches: false,
        value: '2024-01-01'
      }
    ]
  }
]

testOperator('DateNotEquals', dateNotEqualsTests, DateNotEquals)

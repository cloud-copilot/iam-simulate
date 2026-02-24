import { type BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { NumericNotEquals } from './NumericNotEquals.js'

const numericNotEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return false if the values match',
    policyValues: ['100', '200'],
    testValue: '100',
    expected: false,
    explains: [
      {
        matches: false,
        value: '100'
      },
      {
        matches: true,
        value: '200'
      }
    ]
  },
  {
    name: 'should return true if there are no matches',
    policyValues: ['10'],
    testValue: '25',
    expected: true,
    explains: [
      {
        matches: true,
        value: '10'
      }
    ]
  },
  {
    name: 'should return false if the policy values are not numbers',
    policyValues: ['a', 'b'],
    testValue: '10',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'a',
        errors: ['a is not a number']
      },
      {
        matches: false,
        value: 'b',
        errors: ['b is not a number']
      }
    ]
  },
  {
    name: 'should return false if the test value is not a number',
    policyValues: ['10'],
    testValue: 'a',
    expected: false,
    explains: [
      {
        matches: false,
        value: '10',
        errors: [`request value 'a' is not a number`]
      }
    ]
  },
  {
    name: 'should return false if any value is a match',
    policyValues: ['10', '20'],
    testValue: '10',
    expected: false,
    explains: [
      {
        matches: false,
        value: '10'
      },
      {
        matches: true,
        value: '20'
      }
    ]
  }
]

testOperator('NumericNotEquals', numericNotEqualsTests, NumericNotEquals)

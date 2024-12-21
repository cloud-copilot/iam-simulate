import { BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { NumericLessThanEquals } from './NumericLessThanEquals.js'

const numericLessThanEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should return true if the test value is less than the policy value',
    policyValues: ['10'],
    testValue: '5',
    expected: true,
    explains: [
      {
        matches: true,
        value: '10'
      }
    ]
  },
  {
    name: 'should return true if the test value is equals to the policy value',
    policyValues: ['10'],
    testValue: '10',
    expected: true,
    explains: [
      {
        matches: true,
        value: '10'
      }
    ]
  },
  {
    name: 'should return false if the test value is greater than the policy value',
    policyValues: ['10'],
    testValue: '15',
    expected: false,
    explains: [
      {
        matches: false,
        value: '10'
      }
    ]
  },
  {
    name: 'should return false if the policy values are not numbers',
    policyValues: ['a'],
    testValue: '10',
    expected: false,
    explains: [
      {
        matches: false,
        value: 'a',
        errors: ['a is not a number']
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
  }
]

testOperator('NumericLessThanEquals', numericLessThanEqualsTests, NumericLessThanEquals)

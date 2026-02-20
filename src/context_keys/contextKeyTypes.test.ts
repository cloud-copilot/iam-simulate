import { describe, expect, it } from 'vitest'
import { ArrayConditionKeyType, getBaseConditionKeyType } from './contextKeyTypes.js'

type GetBaseConditionKeyTypeTestCase = {
  name: string
  key: ArrayConditionKeyType
  expected: string
}

const getBaseConditionKeyTypeTests: GetBaseConditionKeyTypeTestCase[] = [
  {
    name: 'returns String for ArrayOfString',
    key: 'ArrayOfString',
    expected: 'String'
  },
  {
    name: 'returns Numeric for ArrayOfNumeric',
    key: 'ArrayOfNumeric',
    expected: 'Numeric'
  },
  {
    name: 'returns ARN for ArrayOfARN',
    key: 'ArrayOfARN',
    expected: 'ARN'
  },
  {
    name: 'returns IPAddress for ArrayOfIPAddress',
    key: 'ArrayOfIPAddress',
    expected: 'IPAddress'
  }
]

describe('getBaseConditionKeyType', () => {
  for (const testCase of getBaseConditionKeyTypeTests) {
    it(testCase.name, () => {
      const result = getBaseConditionKeyType(testCase.key)
      expect(result).toBe(testCase.expected)
    })
  }

  it('throws if a non-array key is passed', () => {
    const badKey = 'String' as unknown as ArrayConditionKeyType
    expect(() => getBaseConditionKeyType(badKey)).toThrow('Expected ArrayConditionType, got String')
  })
})

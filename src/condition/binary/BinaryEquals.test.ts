import { type BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { BinaryEquals } from './BinaryEquals.js'

const binaryEqualsTests: BaseOperatorTest[] = [
  {
    name: 'should match exact string',
    policyValues: ['YmFzZUBjbG91ZGNvcGlsb3QuaW8=', 'NjRAY2xvdWRjb3BpbG90Lmlv'],
    testValue: 'YmFzZUBjbG91ZGNvcGlsb3QuaW8=',
    expected: true,
    explains: [
      {
        value: 'YmFzZUBjbG91ZGNvcGlsb3QuaW8=',
        matches: true
      },
      {
        value: 'NjRAY2xvdWRjb3BpbG90Lmlv',
        matches: false
      }
    ]
  },
  {
    name: 'should not match different string',
    policyValues: ['YmFzZUBjbG91ZGNvcGlsb3QuaW8=', 'NjRAY2xvdWRjb3BpbG90Lmlv'],
    testValue: 'd3Jvb29vb25n',
    expected: false,
    explains: [
      {
        value: 'YmFzZUBjbG91ZGNvcGlsb3QuaW8=',
        matches: false
      },
      {
        value: 'NjRAY2xvdWRjb3BpbG90Lmlv',
        matches: false
      }
    ]
  }
]

testOperator('BinaryEquals', binaryEqualsTests, BinaryEquals)

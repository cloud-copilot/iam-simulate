import { BaseOperatorTest, testOperator } from '../baseConditionperatorTests.js'
import { NotIpAddress } from './NotIpAddress.js'

const notIpAddressTests: BaseOperatorTest[] = [
  {
    name: 'should be false if the key value is not a valid IP address',
    testValue: 'abcdeft',
    policyValues: ['192.168.10.10/32'],
    expected: false,
    explains: [
      {
        matches: false,
        value: '192.168.10.10/32'
      }
    ]
  },
  {
    name: 'should be true if policy is V4 and the key value is V6',
    testValue: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    policyValues: ['192.168.10.10/32'],
    expected: true,
    explains: [
      {
        matches: true,
        value: '192.168.10.10/32'
      }
    ]
  },
  {
    name: 'should be true if policy is V6 and the key value is V4',
    testValue: '192.168.10.10',
    policyValues: ['2001:0db8:85a3:0000:0000:8a2e:0370:7334/128'],
    expected: true,
    explains: [
      {
        matches: true,
        value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/128'
      }
    ]
  },
  {
    name: 'V4: should be false if the IP address is within the CIDR block',
    policyValues: ['192.168.0.0/16'],
    testValue: '192.168.10.10',
    expected: false,
    explains: [
      {
        matches: false,
        value: '192.168.0.0/16'
      }
    ]
  },
  {
    name: 'V4: should be true if the IP address is not within the CIDR block',
    policyValues: ['192.168.0.0/16'],
    testValue: '192.169.0.1',
    expected: true,
    explains: [
      {
        matches: true,
        value: '192.168.0.0/16'
      }
    ]
  },
  {
    name: 'V4: should be false if the policy value is not a valid CIDR block',
    policyValues: ['123456789012'],
    testValue: '10.10.72.13',
    expected: false,
    explains: [
      {
        matches: false,
        value: '123456789012'
      }
    ]
  },
  {
    name: 'V4: should treat a Valid V4 IP as a /32 CIDR block',
    policyValues: ['10.10.72.13'],
    testValue: '10.10.72.13',
    expected: false,
    explains: [
      {
        matches: false,
        value: '10.10.72.13'
      }
    ]
  },
  {
    name: 'V6: should be false if the IP address is within the CIDR block',
    policyValues: ['2001:0db8::/32'],
    testValue: '2001:0db8:85a3::8a2e:0370:7334',
    expected: false,
    explains: [
      {
        matches: false,
        value: '2001:0db8::/32'
      }
    ]
  },
  {
    name: 'V6: should be true if the IP address is not within the CIDR block',
    policyValues: ['2001:0db8::/32'],
    testValue: '2001:0db9:7335::8a2e:0370:85a3',
    expected: true,
    explains: [
      {
        matches: true,
        value: '2001:0db8::/32'
      }
    ]
  },
  {
    name: 'V6: should be false if the policy value is not a valid CIDR block',
    policyValues: ['123456789012'],
    testValue: '2001:0db8:85a3::8a2e:0370:7334',
    expected: false,
    explains: [
      {
        matches: false,
        value: '123456789012'
      }
    ]
  },
  {
    name: 'V6: should treat a Valid V6 IP as a /128 CIDR block',
    policyValues: ['2001:0db8:85a3::8a2e:0370:7334'],
    testValue: '2001:0db8:85a3::8a2e:0370:7334',
    expected: false,
    explains: [
      {
        matches: false,
        value: '2001:0db8:85a3::8a2e:0370:7334'
      }
    ]
  },
  {
    name: 'V4/V6: should be false if V4 and V6 CIDR blocks are in the policy values and one matches',
    policyValues: ['2001:0db8::/32', '192.168.0.0/16'],
    testValue: '2001:0db8:85a3::8a2e:0370:7334',
    expected: false,
    explains: [
      {
        matches: false,
        value: '2001:0db8::/32'
      },
      {
        matches: true,
        value: '192.168.0.0/16'
      }
    ]
  },
  {
    name: 'should return false if any value is a match',
    policyValues: ['192.168.0.0/8', '10.10.0.0/16'],
    testValue: '192.168.0.17',
    expected: false,
    explains: [
      {
        matches: false,
        value: '192.168.0.0/8'
      },
      {
        matches: true,
        value: '10.10.0.0/16'
      }
    ]
  }
]

testOperator('IpAddress', notIpAddressTests, NotIpAddress)

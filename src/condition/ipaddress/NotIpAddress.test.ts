import { BaseOperatorTest, testOperator } from "../baseConditionperatorTests.js";
import { NotIpAddress } from "./NotIpAddress.js";


const notIpAddressTests: BaseOperatorTest[] = [
  {
    name: 'should be false if the key value is not a valid IP address',
    testValue: 'abcdeft',
    policyValues: ['192.168.10.10/32'],
    expected: false
  },
  {
    name: 'should be true if policy is V4 and the key value is V6',
    testValue: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    policyValues: ['192.168.10.10/32'],
    expected: true
  },
  {
    name: 'should be true if policy is V6 and the key value is V4',
    testValue: '192.168.10.10',
    policyValues: ['2001:0db8:85a3:0000:0000:8a2e:0370:7334/128'],
    expected: true
  },
  {
    name: 'V4: should be false if the IP address is within the CIDR block',
    policyValues: ['192.168.0.0/16'],
    testValue: '192.168.10.10',
    expected: false
  },
  {
    name: 'V4: should be true if the IP address is not within the CIDR block',
    policyValues: ['192.168.0.0/16'],
    testValue: '192.169.0.1',
    expected: true
  },
  {
    name: 'V4: should be false if the policy value is not a valid CIDR block',
    policyValues: ['123456789012'],
    testValue: '10.10.72.13',
    expected: false
  },
  {
    name: 'V6: should be false if the IP address is within the CIDR block',
    policyValues: ['2001:0db8::/32'],
    testValue: '2001:0db8:85a3::8a2e:0370:7334',
    expected: false
  },
  {
    name: 'V6: should be true if the IP address is not within the CIDR block',
    policyValues: ['2001:0db8::/32'],
    testValue: '2001:0db9:7335::8a2e:0370:85a3',
    expected: true
  },
  {
    name: 'V6: should be false if the policy value is not a valid CIDR block',
    policyValues: ['123456789012'],
    testValue: '2001:0db8:85a3::8a2e:0370:7334',
    expected: false
  },
  {
    name: 'V4/V6: should be false if V4 and V6 CIDR blocks are in the policy values and one matches',
    policyValues: [
      '2001:0db8::/32',
      '192.168.0.0/16'
    ],
    testValue: '2001:0db8:85a3::8a2e:0370:7334',
    expected: false
  }
]

testOperator('IpAddress', notIpAddressTests, NotIpAddress);
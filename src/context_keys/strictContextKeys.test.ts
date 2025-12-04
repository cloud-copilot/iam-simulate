import { describe, expect, it } from 'vitest'
import { StrictContextKeys } from './strictContextKeys.js'

const ignoredContextKeysTests: {
  name: string
  only?: true
  ignoredKeys: string[]
  tests: {
    key: string
    expected: boolean
  }[]
}[] = [
  {
    name: 'should match exact literal keys case-insensitively',
    ignoredKeys: ['aws:SourceVpc', 's3:DataAccessPointArn'],
    tests: [
      { key: 'aws:SourceVpc', expected: true },
      { key: 'aws:sourcevpc', expected: true },
      { key: 'AWS:SOURCEVPC', expected: true },
      { key: 's3:DataAccessPointArn', expected: true },
      { key: 's3:dataaccesspointarn', expected: true },
      { key: 'aws:SourceIp', expected: false },
      { key: 's3:prefix', expected: false }
    ]
  },
  {
    name: 'should match regex patterns',
    ignoredKeys: ['/^aws:RequestTag\\/.*/', '/^s3:.*Tag.*/'],
    tests: [
      { key: 'aws:RequestTag/Environment', expected: true },
      { key: 'aws:RequestTag/Owner', expected: true },
      { key: 'aws:requesttag/CostCenter', expected: true },
      { key: 's3:ExistingObjectTag/Type', expected: true },
      { key: 's3:RequestObjectTag/Key', expected: true },
      { key: 'aws:PrincipalTag/Department', expected: false },
      { key: 's3:prefix', expected: false }
    ]
  },
  {
    name: 'should ignore aws:ResourceTag/ keys with regex pattern',
    ignoredKeys: ['/^aws:ResourceTag\\/.*/'],
    tests: [
      { key: 'aws:ResourceTag/Environment', expected: true },
      { key: 'aws:ResourceTag/Owner', expected: true },
      { key: 'aws:resourcetag/CostCenter', expected: true },
      { key: 'AWS:RESOURCETAG/Project', expected: true },
      { key: 'aws:PrincipalTag/Department', expected: false },
      { key: 'aws:RequestTag/Name', expected: false },
      { key: 's3:BucketTag/Owner', expected: false }
    ]
  },
  {
    name: 'should ignore s3:BucketTag/ keys with regex pattern',
    ignoredKeys: ['/^s3:BucketTag\\/.*/'],
    tests: [
      { key: 's3:BucketTag/Owner', expected: true },
      { key: 's3:BucketTag/CostCenter', expected: true },
      { key: 's3:buckettag/Environment', expected: true },
      { key: 'S3:BUCKETTAG/Project', expected: true },
      { key: 'aws:ResourceTag/Owner', expected: false },
      { key: 's3:prefix', expected: false }
    ]
  },
  {
    name: 'should handle mixed literal and regex patterns',
    ignoredKeys: ['aws:SourceVpc', '/^aws:ResourceTag\\/.*/', 's3:prefix'],
    tests: [
      { key: 'aws:SourceVpc', expected: true },
      { key: 'aws:ResourceTag/Environment', expected: true },
      { key: 'aws:resourcetag/Owner', expected: true },
      { key: 's3:prefix', expected: true },
      { key: 'aws:SourceIp', expected: false },
      { key: 'aws:PrincipalTag/Team', expected: false }
    ]
  },
  {
    name: 'should handle empty ignored keys list',
    ignoredKeys: [],
    tests: [
      { key: 'aws:SourceVpc', expected: false },
      { key: 'aws:ResourceTag/Environment', expected: false },
      { key: 's3:prefix', expected: false }
    ]
  },
  {
    name: 'should handle complex regex patterns for multiple ABAC keys',
    ignoredKeys: ['/^(aws:ResourceTag|s3:BucketTag)\\/.*/'],
    tests: [
      { key: 'aws:ResourceTag/Environment', expected: true },
      { key: 'aws:resourcetag/Owner', expected: true },
      { key: 's3:BucketTag/CostCenter', expected: true },
      { key: 's3:buckettag/Project', expected: true },
      { key: 'aws:PrincipalTag/Department', expected: false },
      { key: 'aws:RequestTag/Name', expected: false },
      { key: 's3:prefix', expected: false }
    ]
  },
  {
    name: 'should not match partial literal keys',
    ignoredKeys: ['aws:Source'],
    tests: [
      { key: 'aws:Source', expected: true },
      { key: 'aws:SourceVpc', expected: false },
      { key: 'aws:SourceIp', expected: false },
      { key: 'aws:Sourc', expected: false }
    ]
  },
  {
    name: 'should handle special characters in literal keys',
    ignoredKeys: ['aws:RequestTag/Cost-Center', 's3:x-amz-server-side-encryption'],
    tests: [
      { key: 'aws:RequestTag/Cost-Center', expected: true },
      { key: 'aws:requesttag/cost-center', expected: true },
      { key: 's3:x-amz-server-side-encryption', expected: true },
      { key: 'aws:RequestTag/CostCenter', expected: false },
      { key: 's3:x-amz-encryption', expected: false }
    ]
  }
]

describe('IgnoredContextKeys', () => {
  for (const ignoredContextKeysTest of ignoredContextKeysTests) {
    const testFn = ignoredContextKeysTest.only ? it.only : it
    testFn(ignoredContextKeysTest.name, () => {
      //Given an IgnoredContextKeys instance
      const ignoredContextKeys = new StrictContextKeys(ignoredContextKeysTest.ignoredKeys)

      for (const test of ignoredContextKeysTest.tests) {
        //When checking if the key is ignored
        const result = ignoredContextKeys.has(test.key)

        //Then it should match the expected value
        expect(result, `Key: ${test.key} did not match expected value`).toBe(test.expected)
      }
    })
  }
})

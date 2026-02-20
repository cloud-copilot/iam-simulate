import { describe, expect, it } from 'vitest'
import {
  getResourceTypesForAction,
  resourceStringMatchesResourceTypePattern
} from './resourceTypes.js'

describe('getResourceTypesForAction', () => {
  it('should return the type for a resource', async () => {
    //Given a resource id and action
    const service = 's3'
    const action = 'GetObject'
    const resource = 'arn:aws:s3:::bucket/object'

    //When the resource type is gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then the result should be returned
    expect(result).toEqual([
      {
        arn: 'arn:${Partition}:s3:::${BucketName}/${ObjectName}',
        key: 'object',
        conditionKeys: ['aws:ResourceTag/${TagKey}', 's3:BucketTag/${TagKey}']
      }
    ])
  })

  it('should not return the type when there are no characters for the segment', async () => {
    //Given a resource id and action
    const service = 's3'
    const action = 'GetObject'
    const resource = 'arn:aws:s3:::bucket/'

    //When the resource type is gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then the result should be returned
    expect(result).toEqual([])
  })
})

const resourceStringMatchesResourcePatternTests: {
  pattern: string
  matches: { [resourceString: string]: boolean }
}[] = [
  {
    pattern: '*',
    matches: {
      'arn:${Partition}:s3:::${BucketName}': true,
      'arn:${Partition}:s3:::${BucketName}/${ObjectName}': true,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}': true,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}/object/${ObjectName}': true,
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': true,
      'arn:${Partition}:ec2:${Region}:${Account}:elastic-ip/${AllocationId}': true,
      'arn:${Partition}:ec2:${Region}:${Account}:volume/${VolumeId}': true,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': true,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}:${Version}': true,
      'arn:${Partition}:sqs:${Region}:${Account}:${QueueName}': true,
      'arn:${Partition}:kms:${Region}:${Account}:key/${KeyId}': true,
      'arn:${Partition}:kms:${Region}:${Account}:alias/${AliasName}': true
    }
  },
  {
    pattern: 'arn:aws:s3:::*',
    matches: {
      'arn:${Partition}:s3:::${BucketName}': true,
      'arn:${Partition}:s3:::${BucketName}/${ObjectName}': true,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}': false,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}/object/${ObjectName}': false,
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': false,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': false,
      'arn:${Partition}:sqs:${Region}:${Account}:${QueueName}': false,
      'arn:${Partition}:kms:${Region}:${Account}:key/${KeyId}': false
    }
  },
  {
    pattern: 'arn:aws:s3:::my-bucket/*',
    matches: {
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:s3:::${BucketName}/${ObjectName}': true,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}': false,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}/object/${ObjectName}': false,
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': false,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': false,
      'arn:${Partition}:sqs:${Region}:${Account}:${QueueName}': false
    }
  },
  {
    pattern: 'arn:aws:s3:::*-prod-logs-*/*',
    matches: {
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:s3:::${BucketName}/${ObjectName}': true,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}': false,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}/object/${ObjectName}': false,
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': false
    }
  },
  {
    pattern: 'arn:aws:s3:*:*:accesspoint/*',
    matches: {
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}': true,
      'arn:${Partition}:s3:${Region}:${Account}:accesspoint/${AccessPointName}/object/${ObjectName}': true,
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:s3:::${BucketName}/${ObjectName}': false,
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': false,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': false
    }
  },
  {
    pattern: 'arn:aws:ec2:*:*:instance/*',
    matches: {
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': true,
      'arn:${Partition}:ec2:${Region}:${Account}:elastic-ip/${AllocationId}': false,
      'arn:${Partition}:ec2:${Region}:${Account}:volume/${VolumeId}': false,
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': false
    }
  },
  {
    pattern: 'arn:aws:ec2:us-*-*:*:volume/vol-*',
    matches: {
      'arn:${Partition}:ec2:${Region}:${Account}:volume/${VolumeId}': true,
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': false,
      'arn:${Partition}:ec2:${Region}:${Account}:elastic-ip/${AllocationId}': false,
      'arn:${Partition}:sqs:${Region}:${Account}:${QueueName}': false
    }
  },
  {
    pattern: 'arn:aws:lambda:*:*:function:iam-*',
    matches: {
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': true,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}:${Version}': true,
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:ec2:${Region}:${Account}:instance/${InstanceId}': false
    }
  },
  {
    pattern: 'arn:aws:sqs:*:*:*',
    matches: {
      'arn:${Partition}:sqs:${Region}:${Account}:${QueueName}': true,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': false,
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:kms:${Region}:${Account}:key/${KeyId}': false
    }
  },
  {
    pattern: 'arn:aws:kms:*:*:key/*',
    matches: {
      'arn:${Partition}:kms:${Region}:${Account}:key/${KeyId}': true,
      'arn:${Partition}:kms:${Region}:${Account}:alias/${AliasName}': false,
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}': false
    }
  },
  {
    pattern: 'arn:aws:kms:*:*:alias/abac-*',
    matches: {
      'arn:${Partition}:kms:${Region}:${Account}:alias/${AliasName}': true,
      'arn:${Partition}:kms:${Region}:${Account}:key/${KeyId}': false,
      'arn:${Partition}:s3:::${BucketName}': false
    }
  },
  {
    pattern: 'arn:aws:s3:::bucket/',
    matches: {
      'arn:${Partition}:s3:::${BucketName}': false,
      'arn:${Partition}:s3:::${BucketName}/${ObjectName}': false
    }
  },
  {
    pattern: 'arn:aws:s3:::examplebucket/public/*',
    matches: {
      'arn:${Partition}:s3:::${BucketName}/${ObjectName}': true
    }
  }
]

describe('resourceStringMatchesResourcePattern', () => {
  for (const testCase of resourceStringMatchesResourcePatternTests) {
    describe(`Pattern: ${testCase.pattern}`, () => {
      for (const [arnFormat, expectedResult] of Object.entries(testCase.matches)) {
        it(`should return ${expectedResult} for resource string: ${arnFormat}`, () => {
          // Given a resource pattern and resource string
          const resourceString = testCase.pattern
          const resourcePattern = arnFormat

          // When checking if the resource string matches the pattern
          const result = resourceStringMatchesResourceTypePattern(resourceString, resourcePattern)

          // Then the result should match the expected result
          expect(result).toBe(expectedResult)
        })
      }
    })
  }
})

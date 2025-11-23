import {
  getAllGlobalConditionKeys,
  iamActionDetails,
  iamResourceTypeDetails
} from '@cloud-copilot/iam-data'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { allowedContextKeysForRequest } from './contextKeys.js'

vi.mock('@cloud-copilot/iam-data')

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getAllGlobalConditionKeys).mockReturnValue(['aws:PrincipalTag', 'aws:SourceVpc'])
})

describe('allowedContextKeysForRequest', () => {
  it('should return the conditions keys for an action when it is a wildcard', async () => {
    //Given a request for an action
    const service = 's3'
    const action = 'ListTagsForResource'

    //And there are condition keys for the action
    vi.mocked(iamActionDetails).mockResolvedValue({
      conditionKeys: ['aws:RequestTag', 'aws:ResourceTag'],
      isWildcardOnly: false,
      accessLevel: 'Read',
      dependentActions: [],
      resourceTypes: [],
      description: 'List the tags for a resource',
      name: 'ListTagsForResource'
    })

    //When calling allowedContextKeysForRequest
    const result = await allowedContextKeysForRequest(
      service,
      action,
      'arn:aws:s3:us-east-1:12345:access-grants/default',
      false
    )

    //Then it should return the expected context keys
    expect(result).toEqual(
      expect.arrayContaining([
        'aws:requesttag',
        'aws:resourcetag',
        ...getAllGlobalConditionKeys().map((k) => k.toLowerCase())
      ])
    )
  })

  it('should return the context keys for a single resource type', async () => {
    //Given a request for an action
    const service = 's3'
    const action = 'GetObject'

    //And there are condition keys for the action
    vi.mocked(iamActionDetails).mockResolvedValue({
      conditionKeys: ['aws:RequestTag', 'aws:ResourceTag'],
      isWildcardOnly: false,
      accessLevel: 'Read',
      dependentActions: [],
      resourceTypes: [
        {
          name: 'object',
          dependentActions: [],
          required: true,
          conditionKeys: ['aws:ObjectFoo', 'aws:ObjectBar']
        }
      ],
      description: 'Get an object',
      name: 'GetObject'
    })

    vi.mocked(iamResourceTypeDetails).mockResolvedValue({
      key: 'object',
      arn: 'arn:${Partition}:s3:::${BucketName}/${ObjectName}',
      conditionKeys: ['aws:ObjectFoo', 'aws:ObjectBar']
    })

    //When calling allowedContextKeysForRequest
    const result = await allowedContextKeysForRequest(
      service,
      action,
      'arn:aws:s3:::muh-bucket/object-123',
      false
    )

    //Then it should have the global keys, the keys for the action, and the keys for the resource type
    expect(result).toEqual(
      expect.arrayContaining([
        'aws:objectfoo',
        'aws:objectbar',
        'aws:requesttag',
        'aws:resourcetag',
        ...getAllGlobalConditionKeys().map((k) => k.toLowerCase())
      ])
    )
  })

  it.todo('should search for the specific resource type for an action')

  it('should remove s3 ABAC keys if the bucket does not have ABAC enabled', async () => {
    //Given a request for an S3 action
    const service = 's3'
    const action = 'GetObject'

    //And there are condition keys for the action including ABAC keys
    vi.mocked(iamActionDetails).mockResolvedValue({
      conditionKeys: ['aws:RequestTag', 'aws:ResourceTag/${TagKey}'],
      isWildcardOnly: false,
      accessLevel: 'Read',
      dependentActions: [],
      resourceTypes: [
        {
          name: 'object',
          dependentActions: [],
          required: true,
          conditionKeys: ['aws:ResourceTag/${TagKey}', 's3:BucketTag/${TagKey}']
        }
      ],
      description: 'Get an object',
      name: 'GetObject'
    })

    vi.mocked(iamResourceTypeDetails).mockResolvedValue({
      key: 'object',
      arn: 'arn:${Partition}:s3:::${BucketName}/${ObjectName}',
      conditionKeys: ['aws:ResourceTag/${TagKey}', 's3:BucketTag/${TagKey}']
    })

    //When calling allowedContextKeysForRequest with bucketAbacEnabled set to false
    const result = await allowedContextKeysForRequest(
      service,
      action,
      'arn:aws:s3:::muh-bucket/object-123',
      false
    )

    //Then it should not include the S3 ABAC keys
    expect(result).not.toContain('aws:resourcetag/${tagkey}')
    expect(result).not.toContain('s3:buckettag/${tagkey}')
    //And it should include other keys
    expect(result).toContain('aws:requesttag')
  })

  it('should allow s3 ABAC keys if the bucket has ABAC enabled', async () => {
    //Given a request for an S3 action
    const service = 's3'
    const action = 'GetObject'

    //And there are condition keys for the action including ABAC keys
    vi.mocked(iamActionDetails).mockResolvedValue({
      conditionKeys: ['aws:RequestTag', 'aws:ResourceTag/${TagKey}'],
      isWildcardOnly: false,
      accessLevel: 'Read',
      dependentActions: [],
      resourceTypes: [
        {
          name: 'object',
          dependentActions: [],
          required: true,
          conditionKeys: ['aws:ResourceTag/${TagKey}', 's3:BucketTag/${TagKey}']
        }
      ],
      description: 'Get an object',
      name: 'GetObject'
    })

    vi.mocked(iamResourceTypeDetails).mockResolvedValue({
      key: 'object',
      arn: 'arn:${Partition}:s3:::${BucketName}/${ObjectName}',
      conditionKeys: ['aws:ResourceTag/${TagKey}', 's3:BucketTag/${TagKey}']
    })

    //When calling allowedContextKeysForRequest with bucketAbacEnabled set to true
    const result = await allowedContextKeysForRequest(
      service,
      action,
      'arn:aws:s3:::muh-bucket/object-123',
      true
    )

    //Then it should include the S3 ABAC keys
    expect(result).toContain('aws:resourcetag/${tagkey}')
    expect(result).toContain('s3:buckettag/${tagkey}')
    //And it should include other keys
    expect(result).toContain('aws:requesttag')
  })
})

import { iamActionDetails, iamResourceTypeDetails } from '@cloud-copilot/iam-data'
import { beforeEach } from 'node:test'
import { describe, expect, it, vi } from 'vitest'
import { allGlobalConditionKeys } from '../global_conditions/globalConditionKeys.js'
import { allowedContextKeysForRequest } from './contextKeys.js'

vi.mock('@cloud-copilot/iam-data')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('allowedContextKeysForRequest', () => {
  it('should return the conditions keys for an action when it is a wildcard', async () => {
    //Given a request for an action
    const service = 's3'
    const action = 'ListTagsForResource'

    //And there are condition keys for the action
    vi.mocked(iamActionDetails).mockResolvedValue({
      conditionKeys: ['aws:RequestTag', 'aws:ResourceTag'],
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
      'arn:aws:s3:us-east-1:12345:access-grants/default'
    )

    //Then it should return the expected context keys
    expect(result).toEqual(
      expect.arrayContaining(['aws:requesttag', 'aws:resourcetag', ...allGlobalConditionKeys()])
    )
  })

  it('should return the context keys for a single resource type', async () => {
    //Given a request for an action
    const service = 's3'
    const action = 'GetObject'

    //And there are condition keys for the action
    vi.mocked(iamActionDetails).mockResolvedValue({
      conditionKeys: ['aws:RequestTag', 'aws:ResourceTag'],
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
      'arn:aws:s3:::muh-bucket/object-123'
    )

    //Then it should have the global keys, the keys for the action, and the keys for the resource type
    expect(result).toEqual(
      expect.arrayContaining([
        'aws:objectfoo',
        'aws:objectbar',
        'aws:requesttag',
        'aws:resourcetag',
        ...allGlobalConditionKeys()
      ])
    )
  })

  it.todo('should search for the specific resource type for an action')
})

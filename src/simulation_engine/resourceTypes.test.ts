import { describe, expect, it } from 'vitest'
import { getResourceTypesForAction } from './resourceTypes.js'

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

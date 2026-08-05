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

  it('should return only the sub-resource type when a sub-resource ARN also matches its parent', async () => {
    //Given a DynamoDB stream ARN and an action valid for both the table and the stream
    const service = 'dynamodb'
    const action = 'GetResourcePolicy'
    const resource =
      'arn:aws:dynamodb:us-east-1:123456789012:table/synthetic-table/stream/2026-02-17T14:10:55.441'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then only the stream type is returned, not the table type it also matches
    expect(result.map((rt) => rt.key)).toEqual(['stream'])
  })

  it('should return the parent type for a parent ARN', async () => {
    //Given a DynamoDB table ARN and an action valid for both the table and the stream
    const service = 'dynamodb'
    const action = 'GetResourcePolicy'
    const resource = 'arn:aws:dynamodb:us-east-1:123456789012:table/synthetic-table'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then only the table type is returned
    expect(result.map((rt) => rt.key)).toEqual(['table'])
  })

  it('should return only the sub-resource type when the sub-resource is colon-delimited', async () => {
    //Given a Batch job-definition revision ARN, whose qualifier is appended with ':'
    const service = 'batch'
    const action = 'SubmitJob'
    const resource = 'arn:aws:batch:us-east-1:123456789012:job-definition/synthetic-definition:3'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then only the revision type is returned, not the job-definition type it also matches
    expect(result.map((rt) => rt.key)).toEqual(['job-definition-revision'])
  })

  it('should return the parent type for a colon-delimited parent ARN', async () => {
    //Given an unqualified Batch job-definition ARN
    const service = 'batch'
    const action = 'SubmitJob'
    const resource = 'arn:aws:batch:us-east-1:123456789012:job-definition/synthetic-definition'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then only the job-definition type is returned
    expect(result.map((rt) => rt.key)).toEqual(['job-definition'])
  })

  it('should return only the sub-resource type when the parent pattern ends with a delimiter', async () => {
    //Given a Cassandra table ARN, whose keyspace parent pattern ends with a trailing slash
    const service = 'cassandra'
    const action = 'Alter'
    const resource =
      'arn:aws:cassandra:us-east-1:123456789012:/keyspace/synthetic-keyspace/table/synthetic-table'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then only the table type is returned, not the keyspace type it also matches
    expect(result.map((rt) => rt.key)).toEqual(['table'])
  })

  it('should return the parent type for a parent ARN ending with a delimiter', async () => {
    //Given a Cassandra keyspace ARN, which genuinely ends with a trailing slash
    const service = 'cassandra'
    const action = 'Alter'
    const resource = 'arn:aws:cassandra:us-east-1:123456789012:/keyspace/synthetic-keyspace/'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then only the keyspace type is returned
    expect(result.map((rt) => rt.key)).toEqual(['keyspace'])
  })

  it('should keep every matching type for a wildcard resource', async () => {
    //Given a wildcard DynamoDB resource that names tables and their streams alike
    const service = 'dynamodb'
    const action = 'GetResourcePolicy'
    const resource = 'arn:aws:dynamodb:us-east-1:123456789012:table/*'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then the ambiguity is preserved so the engine simulates each type
    expect(new Set(result.map((rt) => rt.key))).toEqual(new Set(['table', 'stream']))
  })

  it('should return the object type for an S3 object key containing slashes', async () => {
    //Given an S3 object key with slashes, which the bucket pattern must not claim
    const service = 's3'
    const action = 'GetObject'
    const resource = 'arn:aws:s3:::bucket/nested/path/object.txt'

    //When the resource types are gotten
    const result = await getResourceTypesForAction(service, action, resource)

    //Then the object type is returned
    expect(result.map((rt) => rt.key)).toEqual(['object'])
  })
})

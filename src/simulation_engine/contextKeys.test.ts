import { describe, expect, it } from "vitest";
import { allowedContextKeysForRequest } from "./contextKeys.js";

describe('allowedContextKeysForRequest', () => {
  it.todo('should return the conditions keys for an action', async () => {
    //Given a request for an action
    const service = 's3';
    const action = 'ListTagsForResource';

    //When calling allowedContextKeysForRequest
    //arn:aws:s3:us-east-1:12345:access-grants/default
    //arn:aws:s3:us-east-1:12345:access-grants/default/location/1234
    const result = await allowedContextKeysForRequest(service, action, 'arn:aws:s3:us-east-1:12345:access-grants/default');

    //Then it should return the expected context keys
    expect(result).toEqual(expect.arrayContaining(['aws:RequestTag', 'aws:ResourceTag']));
    console.log(result);
  })

  it.todo('should return the default context keys for an action with no resource types')
  it.todo('should search for the specific resource type for an action')


})
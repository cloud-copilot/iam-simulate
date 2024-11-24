import { loadPolicy } from "@cloud-copilot/iam-policy";
import { describe, expect, it } from "vitest";
import { findContextKeys } from "./findContextKeys.js";

describe('findContextKeys', () => {
  it('should return valid and invalid context keys', async () => {
    //Given a list of policies
    const policies = [
      loadPolicy({
        Version: "2012-10-17",
        Statement: {
          Effect: "Allow",
          Action: "s3:ListBucket",
          Resource: "arn:aws:s3:::${aws:username}",
          Condition: {
            StringEquals: {
              "s3:prefix": "${prefix}",
              "aws:PrincipalArn": "arn:aws:iam::123456789012:role/roleName"
            }
          }
        }
      }),
      loadPolicy({
        Version: "2012-10-17",
        Statement: {
          Effect: "Allow",
          Action: "s3:ListBucket",
          Resource: "arn:aws:s3:::${bucketName}",
          Condition: {
            StringEquals: {
              "s3:fakeValue": "${s3:dataaccesspointarn}"
            }
          }
        }
      })
    ]

    //When findContextKeys is called
    const { validKeys, invalidKeys } = await findContextKeys(policies);

    //Then it should return a list of valid and invalid context keys
    expect(validKeys.sort()).toEqual(
      ['aws:PrincipalArn', 'aws:username', 's3:DataAccessPointArn', 's3:prefix']
    );
    expect(invalidKeys.sort()).toEqual(
      ['bucketName', 'prefix', 's3:fakeValue']
    );
  });
})
import { ConditionKey, iamActionDetails, iamConditionKeyDetails, iamResourceTypeDetails } from "@cloud-copilot/iam-data";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Simulation } from "./simulation.js";
import { normalizeSimulationParameters } from "./simulationEngine.js";

vi.mock('@cloud-copilot/iam-data')

beforeEach(() => {
  vi.resetAllMocks()
})

const mockKeyDetails: Record<string, ConditionKey> = {
  "s3:RequestObjectTagKeys": { description: "", key: "s3:RequestObjectTagKeys", type: "ArrayOfString"},
  "s3:ResourceAccount": { description: "", key: "s3:ResourceAccount", type: "String"},
  "s3:AccessGrantsInstanceArn": { description: "", key: "s3:AccessGrantsInstanceArn", type: "String"},
  "s3:DataAccessPointAccount": { description: "", key: "s3:DataAccessPointAccount", type: "String"},
  "s3:AccessPointNetworkOrigin": { description: "", key: "s3:AccessPointNetworkOrigin", type: "String"},
}


describe("normalizeSimulationParameters", () => {
  it('should only return the parameters allowed for the action', async () => {
    //Given the action exists s3:GetObject
    vi.mocked(iamActionDetails).mockResolvedValue({
      accessLevel: "Read",
      conditionKeys: ["s3:RequestObjectTagKeys", "s3:ResourceAccount"],
      description: "Grants permission to retrieve objects from Amazon S3 buckets",
      name: "GetObject",
      resourceTypes: [
        {
         name: "object",
         required: true,
         dependentActions: [],
         conditionKeys: [
          "s3:AccessGrantsInstanceArn",
          "s3:DataAccessPointAccount",
          "s3:AccessPointNetworkOrigin"
         ]
        }
      ],
      dependentActions: []
    })

    //And the resource type exists
    vi.mocked(iamResourceTypeDetails).mockResolvedValue({
      arn: "arn:${Partition}:s3:::${BucketName}/${ObjectName}",
      conditionKeys: [],
      key: "object"
    })

    vi.mocked(iamConditionKeyDetails).mockImplementation(async (service, key) => {
      console.log("mocked iamConditionKeyDetails", service, key)
      return mockKeyDetails[`s3:${key}`]
    })

    //And the simulation is for the action s3:GetObject
    const simulation: Simulation = {
      identityPolicies: [],
      request: {
        action: "s3:GetObject",
        resource: {
          resource: "arn:aws:s3:::examplebucket/1234",
          accountId: "123456789012"
        },
        contextVariables: {
          "s3:RequestObjectTagKeys": ["tag1", "tag2"],
          "s3:ResourceAccount": "123456789012",
          "s3:DataAccessPointArn": "arn:aws:s3:us-west-2:123456789012:accesspoint/my-access-point"
        },
        principal: "arn:aws:iam::123456789012:user/Alice",
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result should only contain the parameters allowed for the action
    expect(normalizedSimulation).toEqual({
      "s3:RequestObjectTagKeys": ["tag1", "tag2"],
      "s3:ResourceAccount": "123456789012",
    })
  })

})
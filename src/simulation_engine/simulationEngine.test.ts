import { ConditionKey, iamActionDetails, iamConditionKeyDetails, iamConditionKeyExists, iamResourceTypeDetails, iamServiceExists } from "@cloud-copilot/iam-data";
import { describe, expect, it, vi } from "vitest";
import { Simulation } from "./simulation.js";
import { normalizeSimulationParameters } from "./simulationEngine.js";

vi.mock('@cloud-copilot/iam-data')

const mockKeyDetails: Record<string, ConditionKey> = {
  "s3:requestobjecttagkeys": { description: "", key: "s3:RequestObjectTagKeys", type: "ArrayOfString"},
  "s3:resourceaccount": { description: "", key: "s3:ResourceAccount", type: "String"},
  "s3:accessgrantsinstancearn": { description: "", key: "s3:AccessGrantsInstanceArn", type: "String"},
  "s3:dataaccesspointaccount": { description: "", key: "s3:DataAccessPointAccount", type: "String"},
  "s3:accesspointnetworkorigin": { description: "", key: "s3:AccessPointNetworkOrigin", type: "String"},
}

// beforeEach(() => {
//   vi.resetAllMocks()
// })

vi.mocked(iamResourceTypeDetails).mockResolvedValue({
  arn: "arn:${Partition}:s3:::${BucketName}/${ObjectName}",
  conditionKeys: [],
  key: "object"
})

vi.mocked(iamServiceExists).mockImplementation(async (service) => {
  return service !== 'aws'
})

vi.mocked(iamConditionKeyDetails).mockImplementation(async (service, key) => {
  return mockKeyDetails[key.toLowerCase()]
})

vi.mocked(iamConditionKeyExists).mockImplementation(async (service, key) => {
  return mockKeyDetails[key.toLowerCase()] !== undefined
})

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
      "s3:AccessPointNetworkOrigin",
      "aws:ResourceTag/${TagKey}"
     ]
    }
  ],
  dependentActions: []
})

describe("normalizeSimulationParameters", () => {
  it('should only return the parameters allowed for the action', async () => {
    //Given the simulation is for the action s3:GetObject
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

  it.todo('should correct incorrect capitalization')
  it.todo('should put single values in an array if the condition key is an array')
  it.todo('should pull the first value from an array if the condition key is a single value')
  it.todo('')
})
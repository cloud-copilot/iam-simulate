import { ConditionKey, iamActionDetails, iamConditionKeyDetails, iamConditionKeyExists, iamResourceTypeDetails, iamServiceExists } from "@cloud-copilot/iam-data";
import { describe, expect, it, vi } from "vitest";
import { Simulation } from "./simulation.js";
import { normalizeSimulationParameters, runSimulation } from "./simulationEngine.js";

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
      serviceControlPolicies: [],
      resourcePolicy: undefined,
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

  it('should correct incorrect capitalization', async () => {
    //Given the simulation is for the action s3:GetObject
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: "s3:GetObject",
        resource: {
          resource: "arn:aws:s3:::examplebucket/1234",
          accountId: "123456789012"
        },
        contextVariables: {
          "s3:requestobjecttagkeys": ["tag1", "tag2"],
          "s3:rESOURCEaCCOUNT": "123456789012"
        },
        principal: "arn:aws:iam::123456789012:user/Alice",
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result correct the capitalization of the keys
    expect(Object.keys(normalizedSimulation).sort()).toEqual([
      "s3:RequestObjectTagKeys",
      "s3:ResourceAccount"
    ])
  })

  it('should put single values in an array if the condition key is an array', async () => {
    //Given a request with a single value for request object tag keys
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: "s3:GetObject",
        resource: {
          resource: "arn:aws:s3:::examplebucket/1234",
          accountId: "123456789012"
        },
        contextVariables: {
          "s3:RequestObjectTagKeys": "tag1"
        },
        principal: "arn:aws:iam::123456789012:user/Alice",
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result should put the single value in an array
    expect(normalizedSimulation).toEqual({
      "s3:RequestObjectTagKeys": ["tag1"]
    })
  })

  it('should pull the first value from an array if the condition key is a single value', async () => {
    //Given a request with an array value for resource account
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: "s3:GetObject",
        resource: {
          resource: "arn:aws:s3:::examplebucket/1234",
          accountId: "123456789012"
        },
        contextVariables: {
          "s3:ResourceAccount": ["123456789012", "987654321098"]
        },
        principal: "arn:aws:iam::123456789012:user/Alice",
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result should only contain the first value
    expect(normalizedSimulation).toEqual({
      "s3:ResourceAccount": "123456789012"
    })
  })
})

describe('runSimulation', () => {
  it.only('should return service control policy errors', async () => {
    //Given a simulation with an error in a service control policy
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [{
        orgIdentifier: "o-123456",
        policies: [{
          name: 'Gandalf',
          policy: {
            Statement:{
              Effect: "SHALL NOT PASS",
              Action: "s3:GetObject",
              Resource: "arn:aws:s3:::examplebucket/1234"
            }
          }
        }]
      }],
      resourcePolicy: undefined,
      request: {
        action: "s3:GetObject",
        resource: {
          resource: "arn:aws:s3:::examplebucket/1234",
          accountId: "123456789012"
        },
        principal: "arn:aws:iam::123456789012:user/Alice",
        contextVariables: {},
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('policy.errors')
    expect(result.errors!.seviceControlPolicyErrors!["Gandalf"].length).toEqual(1)

  })

  it('should return resource policy errors', async () => {
    //Given a simulation with an error in a resource policy
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: {
        Statement: {
          Effect: "Invisible",
          Action: "oneRing:PutOn",
          NotPrincipal: "Sauron"
        }
      },
      request: {
        action: "s3:GetObject",
        resource: {
          resource: "arn:aws:s3:::examplebucket/1234",
          accountId: "123456789012"
        },
        principal: "arn:aws:iam::123456789012:user/Alice",
        contextVariables: {},
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('policy.errors')
    expect(result.errors!.resourcePolicyErrors!.length).toEqual(1)
  })

  it.todo('should return identity policy errors')
  it.todo('should return an error for a mal formatted action')
  it.todo('should return an error for a non existent service')
  it.todo('should return an error for a non existent action')
  it.todo('should return an error if a wildcard only action is not a wildcard')
  it.todo('should return an error if the resource does not mantch an resource type')
  it.todo('should return an error if the resource matches multiple resource types')
})
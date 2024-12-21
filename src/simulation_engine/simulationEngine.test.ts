import {
  ConditionKey,
  iamActionDetails,
  iamActionExists,
  iamConditionKeyDetails,
  iamConditionKeyExists,
  iamResourceTypeDetails,
  iamServiceExists
} from '@cloud-copilot/iam-data'
import { describe, expect, it, vi } from 'vitest'
import { Simulation } from './simulation.js'
import { normalizeSimulationParameters, runSimulation } from './simulationEngine.js'

vi.mock('@cloud-copilot/iam-data')

const mockKeyDetails: Record<string, ConditionKey> = {
  's3:requestobjecttagkeys': {
    description: '',
    key: 's3:RequestObjectTagKeys',
    type: 'ArrayOfString'
  },
  's3:resourceaccount': { description: '', key: 's3:ResourceAccount', type: 'String' },
  's3:accessgrantsinstancearn': {
    description: '',
    key: 's3:AccessGrantsInstanceArn',
    type: 'String'
  },
  's3:dataaccesspointaccount': {
    description: '',
    key: 's3:DataAccessPointAccount',
    type: 'String'
  },
  's3:accesspointnetworkorigin': {
    description: '',
    key: 's3:AccessPointNetworkOrigin',
    type: 'String'
  }
}

vi.mocked(iamResourceTypeDetails).mockImplementation(async (service, resource) => {
  if (resource === 'object') {
    return {
      arn: 'arn:${Partition}:s3:::${BucketName}/${ObjectName}',
      conditionKeys: [],
      key: 'object'
    }
  } else if (resource === 'bucket') {
    return {
      arn: 'arn:${Partition}:s3:::${BucketName}',
      conditionKeys: [],
      key: 'bucket'
    }
  }
  throw new Error('Resource not found in mock')
})

vi.mocked(iamServiceExists).mockImplementation(async (service) => {
  return ['s3'].includes(service)
})

vi.mocked(iamConditionKeyDetails).mockImplementation(async (service, key) => {
  return mockKeyDetails[key.toLowerCase()]
})

vi.mocked(iamConditionKeyExists).mockImplementation(async (service, key) => {
  return mockKeyDetails[key.toLowerCase()] !== undefined
})

vi.mocked(iamActionExists).mockImplementation(async (service, action) => {
  return (
    service === 's3' &&
    ['GetObjects', 'GetObject', 'ListAllMyBuckets', 'ListBucket'].includes(action)
  )
})

vi.mocked(iamActionDetails).mockImplementation(async (service, actionKey) => {
  if (actionKey === 'GetObject') {
    return {
      accessLevel: 'Read',
      conditionKeys: ['s3:RequestObjectTagKeys', 's3:ResourceAccount'],
      description: 'Grants permission to retrieve objects from Amazon S3 buckets',
      name: 'GetObject',
      resourceTypes: [
        {
          name: 'object',
          required: true,
          dependentActions: [],
          conditionKeys: [
            's3:AccessGrantsInstanceArn',
            's3:DataAccessPointAccount',
            's3:AccessPointNetworkOrigin',
            'aws:ResourceTag/${TagKey}'
          ]
        }
      ],
      dependentActions: []
    }
  } else if (actionKey === 'ListBucket') {
    return {
      name: 'ListBucket',
      description:
        'Grants permission to list some or all of the objects in an Amazon S3 bucket (up to 1000)',
      accessLevel: 'List',
      resourceTypes: [
        {
          name: 'bucket',
          required: true,
          conditionKeys: [],
          dependentActions: []
        }
      ],
      conditionKeys: [
        's3:AccessGrantsInstanceArn',
        's3:DataAccessPointAccount',
        's3:DataAccessPointArn',
        's3:AccessPointNetworkOrigin',
        's3:authType',
        's3:delimiter',
        's3:max-keys',
        's3:prefix',
        's3:ResourceAccount',
        's3:signatureAge',
        's3:signatureversion',
        's3:TlsVersion',
        's3:x-amz-content-sha256'
      ],
      dependentActions: []
    }
  } else if (actionKey === 'GetObjects') {
    //This is a fake action used in the multiple matching resources test
    return {
      accessLevel: 'Read',
      conditionKeys: ['s3:RequestObjectTagKeys', 's3:ResourceAccount'],
      description: 'Grants permission to retrieve objects from Amazon S3 buckets',
      name: 'GetObject',
      resourceTypes: [
        {
          name: 'object',
          required: true,
          dependentActions: [],
          conditionKeys: [
            's3:AccessGrantsInstanceArn',
            's3:DataAccessPointAccount',
            's3:AccessPointNetworkOrigin',
            'aws:ResourceTag/${TagKey}'
          ]
        },
        {
          name: 'object',
          required: true,
          dependentActions: [],
          conditionKeys: [
            's3:AccessGrantsInstanceArn',
            's3:DataAccessPointAccount',
            's3:AccessPointNetworkOrigin',
            'aws:ResourceTag/${TagKey}'
          ]
        }
      ],
      dependentActions: []
    }
  }
  throw new Error('Action not found in mock')
})

describe('normalizeSimulationParameters', () => {
  it('should only return the parameters allowed for the action', async () => {
    //Given the simulation is for the action s3:GetObject
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        contextVariables: {
          's3:RequestObjectTagKeys': ['tag1', 'tag2'],
          's3:ResourceAccount': '123456789012',
          's3:DataAccessPointArn': 'arn:aws:s3:us-west-2:123456789012:accesspoint/my-access-point'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice'
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result should only contain the parameters allowed for the action
    expect(normalizedSimulation).toEqual({
      's3:RequestObjectTagKeys': ['tag1', 'tag2'],
      's3:ResourceAccount': '123456789012'
    })
  })

  it('should correct incorrect capitalization', async () => {
    //Given the simulation is for the action s3:GetObject
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        contextVariables: {
          's3:requestobjecttagkeys': ['tag1', 'tag2'],
          's3:rESOURCEaCCOUNT': '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice'
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result correct the capitalization of the keys
    expect(Object.keys(normalizedSimulation).sort()).toEqual([
      's3:RequestObjectTagKeys',
      's3:ResourceAccount'
    ])
  })

  it('should put single values in an array if the condition key is an array', async () => {
    //Given a request with a single value for request object tag keys
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        contextVariables: {
          's3:RequestObjectTagKeys': 'tag1'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice'
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result should put the single value in an array
    expect(normalizedSimulation).toEqual({
      's3:RequestObjectTagKeys': ['tag1']
    })
  })

  it('should pull the first value from an array if the condition key is a single value', async () => {
    //Given a request with an array value for resource account
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        contextVariables: {
          's3:ResourceAccount': ['123456789012', '987654321098']
        },
        principal: 'arn:aws:iam::123456789012:user/Alice'
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result should only contain the first value
    expect(normalizedSimulation).toEqual({
      's3:ResourceAccount': '123456789012'
    })
  })

  it('should return context keys with variables in them', async () => {
    //Given a request with a variable context key
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        contextVariables: {
          'aws:RequestTag/Boom': 'Town'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice'
      }
    }

    //When we normalize the simulation parameters
    const normalizedSimulation = await normalizeSimulationParameters(simulation)

    //Then the result should put the single value in an array
    expect(normalizedSimulation).toEqual({
      'aws:RequestTag/Boom': 'Town'
    })
  })
})

describe('runSimulation', () => {
  it('should return service control policy errors', async () => {
    //Given a simulation with an error in a service control policy
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [
        {
          orgIdentifier: 'o-123456',
          policies: [
            {
              name: 'Gandalf',
              policy: {
                Statement: {
                  Effect: 'SHALL NOT PASS',
                  Action: 's3:GetObject',
                  Resource: 'arn:aws:s3:::examplebucket/1234'
                }
              }
            }
          ]
        }
      ],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('policy.errors')
    expect(result.errors!.seviceControlPolicyErrors!['Gandalf'].length).toEqual(1)
  })

  it('should return resource policy errors', async () => {
    //Given a simulation with an error in a resource policy
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: {
        Statement: {
          Effect: 'Invisible',
          Action: 'oneRing:PutOn',
          NotPrincipal: 'Sauron',
          Resource: 'arn:aws:s3:::ring/theone'
        }
      },
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('policy.errors')
    expect(result.errors!.resourcePolicyErrors!.length).toEqual(1)
  })

  it('should return identity policy errors', async () => {
    //Given a simulation with an error in an identity policy
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'sauron',
          policy: {
            Statement: {
              Effect: 'Domination',
              Action: 'oneRing:PutOn',
              Resource: 'arn:aws:s3:::ring/theone'
            }
          }
        }
      ],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('policy.errors')
    expect(result.errors!.identityPolicyErrors!['sauron'].length).toEqual(1)
  })

  it('should return an error for a mal formatted action', async () => {
    //Given a simulation with a mal formatted action
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 'oneRing:PutOn:finger',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('invalid.action')
  })

  it('should return an error for a non existent service', async () => {
    //Given a simulation with a non existent service
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 'hobbit:EatBreakfast',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('invalid.service')
  })

  it('should return an error for a non existent action', async () => {
    //Given a simulation with a non existent action
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:SaveMoneyOnEgress',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('invalid.action')
  })

  it('should return an error if a wildcard only action is not a wildcard', async () => {
    //Given a request for a wildcard only action with a specific request listed
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:ListAllMyBuckets',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    vi.mocked(iamActionDetails).mockResolvedValueOnce({
      accessLevel: 'List',
      conditionKeys: [],
      description: 'Grants permission to list all S3 buckets',
      name: 'ListAllMyBuckets',
      resourceTypes: [],
      dependentActions: []
    })

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('must.use.wildcard')
  })

  it('should return an error if the resource does not mantch an resource type', async () => {
    //Given a request with a resource that does not match any resource types
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('no.resource.types')
  })

  it('should return an error if the resource matches multiple resource types', async () => {
    //Given a request with a resource that matches multiple resource types
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObjects',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then the result should contain an error
    expect(result.errors!.message).toEqual('multiple.resource.types')
  })

  it('should run a valid simulation', async () => {
    //Given a valid simulation
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'readbuckets',
          policy: {
            Statement: {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::examplebucket/*'
            }
          }
        }
      ],
      serviceControlPolicies: [
        {
          orgIdentifier: 'ou-123456',
          policies: [
            {
              name: 'allowall',
              policy: {
                Statement: {
                  Effect: 'Allow',
                  Action: '*',
                  Resource: '*'
                }
              }
            }
          ]
        }
      ],
      resourcePolicy: {
        Statement: {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::examplebucket/*',
          Principal: 'arn:aws:iam::123456789012:user/Alice'
        }
      },
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {
          's3:RequestObjectTagKeys': ['tag1', 'tag2'],
          's3:ResourceAccount': '123456789012'
        }
      }
    }

    //When the simulation is run
    const result = await runSimulation(simulation, {})

    //Then there should be no errors
    expect(result.errors).toBeUndefined()
    expect(result.analysis?.result).toEqual('Allowed')
  })

  it('should work with ForAnyValue:StringEquals', async () => {
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'policy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:ListBucket',
                Resource: 'arn:aws:s3:::my-bucket',
                Condition: {
                  'ForAnyValue:StringEquals': {
                    'aws:PrincipalOrgPaths': ['ou-12345']
                  }
                }
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      request: {
        action: 's3:ListBucket',
        principal: 'arn:aws:iam::123456789012:user/username',
        resource: {
          accountId: '123456789012',
          resource: 'arn:aws:s3:::my-bucket'
        },
        contextVariables: {
          'aws:PrincipalOrgPaths': ['ou-12345']
        }
      }
    }

    const result = await runSimulation(simulation, {})

    expect(result.errors).toBeUndefined()
    expect(result.analysis?.result).toEqual('Allowed')
  })
})

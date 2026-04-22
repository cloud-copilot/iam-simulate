import {
  type ConditionKey,
  getAllGlobalConditionKeys,
  getGlobalConditionKeyByName,
  getGlobalConditionKeyByPrefix,
  iamActionDetails,
  iamActionExists,
  iamConditionKeyDetails,
  iamConditionKeyExists,
  iamConditionKeysForService,
  iamResourceTypeDetails,
  iamServiceExists
} from '@cloud-copilot/iam-data'
import {
  createValidatedPolicy,
  validateEndpointPolicy,
  validateIdentityPolicy,
  validateResourceControlPolicy,
  validateResourcePolicy,
  validateServiceControlPolicy,
  type ValidationError
} from '@cloud-copilot/iam-policy'
import { describe, expect, it, vi } from 'vitest'
import type { Simulation } from './simulation.js'
import { normalizeSimulationParameters, runSimulation } from './simulationEngine.js'
import type {
  ErrorSimulationResult,
  RunSimulationResults,
  SimulationErrors
} from './simulationEngine.js'

vi.mock('@cloud-copilot/iam-data')

function assertErrorResult(response: RunSimulationResults): ErrorSimulationResult {
  expect(response.resultType).toEqual('error')
  if (response.resultType !== 'error') {
    throw new Error('Expected error result')
  }
  return response
}

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
  },
  's3:buckettag/${tagkey}': {
    description: '',
    key: 's3:BucketTag/${TagKey}',
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
  } else if (resource === 'parameter') {
    return {
      arn: 'arn:${Partition}:ssm:${Region}:${Account}:parameter/${FullyQualifiedParameterName}',
      conditionKeys: [],
      key: 'parameter'
    }
  }
  throw new Error('Resource not found in mock')
})

vi.mocked(iamServiceExists).mockImplementation(async (service) => {
  return ['s3', 'ssm'].includes(service)
})
vi.mocked(iamConditionKeysForService).mockImplementation(async (service) => {
  if (service === 's3') {
    return [
      's3:RequestObjectTagKeys',
      's3:ResourceAccount',
      's3:AccessGrantsInstanceArn',
      's3:DataAccessPointAccount',
      's3:AccessPointNetworkOrigin',
      's3:BucketTag/${TagKey}'
    ]
  }
  return []
})

vi.mocked(iamConditionKeyDetails).mockImplementation(async (service, key) => {
  return mockKeyDetails[key.toLowerCase()]
})

vi.mocked(iamConditionKeyExists).mockImplementation(async (service, key) => {
  return mockKeyDetails[key.toLowerCase()] !== undefined
})

vi.mocked(iamActionExists).mockImplementation(async (service, action) => {
  return (
    (service === 's3' &&
      ['GetObjects', 'GetObject', 'ListAllMyBuckets', 'ListBucket'].includes(action)) ||
    (service === 'ssm' && ['GetParameter', 'DescribeParameters'].includes(action))
  )
})

vi.mocked(getAllGlobalConditionKeys).mockImplementation(() => {
  return ['aws:userid', 'aws:username', 'aws:PrincipalOrgPaths', 'aws:RequestTag/tag-key']
})

vi.mocked(getGlobalConditionKeyByPrefix).mockImplementation((key) => {
  if (key.toLowerCase().startsWith('aws:requesttag')) {
    return {
      key: 'aws:RequestTag/tag-key',
      description: '',
      type: 'String',
      category: 'request'
    }
  }
  if (key.toLowerCase().startsWith('aws:resourcetag')) {
    return {
      key: 'aws:ResourceTag/tag-key',
      category: 'resource',
      type: 'String',
      description: ''
    }
  }
  return undefined
})

vi.mocked(getGlobalConditionKeyByName).mockImplementation((key) => {
  if (key.toLowerCase() === 'aws:principalorgpaths') {
    return {
      key: 'aws:PrincipalOrgPaths',
      description: '',
      type: 'ArrayOfString',
      category: 'principal'
    }
  }
  return undefined
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
            's3:BucketTag/${TagKey}',
            's3:AccessGrantsInstanceArn',
            's3:DataAccessPointAccount',
            's3:AccessPointNetworkOrigin',
            'aws:ResourceTag/${TagKey}'
          ]
        }
      ],
      dependentActions: [],
      isWildcardOnly: false
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
        's3:x-amz-content-sha256',
        's3:BucketTag/${TagKey}',
        'aws:ResourceTag/${TagKey}'
      ],
      dependentActions: [],
      isWildcardOnly: false
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
      isWildcardOnly: false,
      dependentActions: []
    }
  } else if (actionKey === 'GetParameter') {
    return {
      name: 'GetParameter',
      description: 'Grants permission to get information about a parameter',
      accessLevel: 'Read',
      resourceTypes: [
        {
          name: 'parameter',
          required: true,
          conditionKeys: [],
          dependentActions: []
        }
      ],
      conditionKeys: [],
      dependentActions: [],
      isWildcardOnly: false
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
      resourceControlPolicies: [],
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
    const { validContextValues, ignoredContextKeys } =
      await normalizeSimulationParameters(simulation)

    //Then the result should only contain the parameters allowed for the action
    expect(validContextValues).toEqual({
      's3:RequestObjectTagKeys': ['tag1', 'tag2'],
      's3:ResourceAccount': '123456789012'
    })

    //And the result should contain the ignored context keys
    expect(ignoredContextKeys).toEqual(['s3:DataAccessPointArn'])
  })

  it('should correct incorrect capitalization', async () => {
    //Given the simulation is for the action s3:GetObject
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const { validContextValues, ignoredContextKeys } = await normalizeSimulationParameters(
      simulation,
      undefined
    )

    //Then the result correct the capitalization of the keys
    expect(Object.keys(validContextValues).sort()).toEqual([
      's3:RequestObjectTagKeys',
      's3:ResourceAccount'
    ])
    //And the result should contain the ignored context keys
    expect(ignoredContextKeys).toEqual([])
  })

  it('should put single values in an array if the condition key is an array', async () => {
    //Given a request with a single value for request object tag keys
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const { validContextValues, ignoredContextKeys } = await normalizeSimulationParameters(
      simulation,
      undefined
    )

    //Then the result should put the single value in an array
    expect(validContextValues).toEqual({
      's3:RequestObjectTagKeys': ['tag1']
    })

    //And the result should contain the ignored context keys
    expect(ignoredContextKeys).toEqual([])
  })

  it('should pull the first value from an array if the condition key is a single value', async () => {
    //Given a request with an array value for resource account
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const { validContextValues, ignoredContextKeys } = await normalizeSimulationParameters(
      simulation,
      undefined
    )

    //Then the result should only contain the first value
    expect(validContextValues).toEqual({
      's3:ResourceAccount': '123456789012'
    })

    //And the result should contain the ignored context keys
    expect(ignoredContextKeys).toEqual([])
  })

  it('should return context keys with variables in them', async () => {
    //Given a request with a variable context key
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        contextVariables: {
          'aws:RequestTag/Boom': 'Town',
          'aws:AccountTags/Bad': 'News'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice'
      }
    }

    //When we normalize the simulation parameters
    const { validContextValues, ignoredContextKeys } = await normalizeSimulationParameters(
      simulation,
      undefined
    )

    //Then the result should put the single value in an array
    expect(validContextValues).toEqual({
      'aws:RequestTag/Boom': 'Town'
    })

    //And the result should contain the ignored context keys
    expect(ignoredContextKeys).toEqual(['aws:AccountTags/Bad'])
  })
})

describe('runSimulation', () => {
  interface PolicyErrorCase {
    name: string
    badPolicy: any
    validator: (policy: any) => ValidationError[]
    buildSimulation: (policy: any) => Simulation
    getErrors: (errors: SimulationErrors) => ValidationError[] | undefined
    expectedErrors: ValidationError[]
  }

  const userRequest = {
    action: 's3:GetObject',
    resource: {
      resource: 'arn:aws:s3:::examplebucket/1234',
      accountId: '123456789012'
    },
    principal: 'arn:aws:iam::123456789012:user/Alice',
    contextVariables: {}
  }

  const invalidEffectError: ValidationError = {
    path: 'Statement.Effect',
    message: 'Effect must be present and exactly "Allow" or "Deny"'
  }

  const policyErrorCases: PolicyErrorCase[] = [
    {
      name: 'service control policy',
      badPolicy: {
        Statement: {
          Effect: 'SHALL NOT PASS',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::examplebucket/1234'
        }
      },
      validator: validateServiceControlPolicy,
      buildSimulation: (policy) => ({
        identityPolicies: [],
        serviceControlPolicies: [
          {
            orgIdentifier: 'o-123456',
            policies: [{ name: 'Gandalf', policy }]
          }
        ],
        resourceControlPolicies: [],
        resourcePolicy: undefined,
        request: userRequest
      }),
      getErrors: (errors) => errors.serviceControlPolicyErrors?.['Gandalf'],
      expectedErrors: [invalidEffectError]
    },
    {
      name: 'resource policy',
      badPolicy: {
        Statement: {
          Effect: 'Invisible',
          Action: 'oneRing:PutOn',
          NotPrincipal: 'Sauron',
          Resource: 'arn:aws:s3:::ring/theone'
        }
      },
      validator: validateResourcePolicy,
      buildSimulation: (policy) => ({
        identityPolicies: [],
        serviceControlPolicies: [],
        resourceControlPolicies: [],
        resourcePolicy: policy,
        request: userRequest
      }),
      getErrors: (errors) => errors.resourcePolicyErrors,
      expectedErrors: [invalidEffectError]
    },
    {
      name: 'session policy',
      badPolicy: {
        Statement: {
          Effect: 'Domination',
          Action: 'oneRing:PutOn',
          Resource: 'arn:aws:s3:::ring/theone'
        }
      },
      validator: validateIdentityPolicy,
      buildSimulation: (policy) => ({
        identityPolicies: [],
        serviceControlPolicies: [],
        resourceControlPolicies: [],
        resourcePolicy: undefined,
        sessionPolicy: policy,
        request: { ...userRequest, principal: 'arn:aws:iam::123456789012:role/Alice' }
      }),
      getErrors: (errors) => errors.sessionPolicyErrors,
      expectedErrors: [invalidEffectError]
    },
    {
      name: 'identity policy',
      badPolicy: {
        Statement: {
          Effect: 'Domination',
          Action: 'oneRing:PutOn',
          Resource: 'arn:aws:s3:::ring/theone'
        }
      },
      validator: validateIdentityPolicy,
      buildSimulation: (policy) => ({
        identityPolicies: [{ name: 'sauron', policy }],
        serviceControlPolicies: [],
        resourceControlPolicies: [],
        resourcePolicy: undefined,
        request: userRequest
      }),
      getErrors: (errors) => errors.identityPolicyErrors?.['sauron'],
      expectedErrors: [invalidEffectError]
    },
    {
      name: 'resource control policy',
      badPolicy: {
        Version: '2012-10-17',
        Statement: {
          Effect: 'SHALL NOT PASS',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::examplebucket/1234',
          Principal: '*'
        }
      },
      validator: validateResourceControlPolicy,
      buildSimulation: (policy) => ({
        identityPolicies: [],
        serviceControlPolicies: [],
        resourceControlPolicies: [
          {
            orgIdentifier: 'o-123456',
            policies: [{ name: 'Gandalf', policy }]
          }
        ],
        resourcePolicy: undefined,
        request: userRequest
      }),
      getErrors: (errors) => errors.resourceControlPolicyErrors?.['Gandalf'],
      expectedErrors: [
        invalidEffectError,
        {
          path: 'Statement.Effect',
          message: 'Effect must be "Deny" in a resource control policy'
        }
      ]
    },
    {
      name: 'permission boundary',
      badPolicy: { Statement: { Effect: 'Enable', Action: '*', Resource: '*' } },
      validator: validateIdentityPolicy,
      buildSimulation: (policy) => ({
        identityPolicies: [],
        serviceControlPolicies: [],
        resourceControlPolicies: [],
        resourcePolicy: undefined,
        permissionBoundaryPolicies: [{ name: 'permissionBoundary', policy }],
        request: userRequest
      }),
      getErrors: (errors) => errors.permissionBoundaryErrors?.['permissionBoundary'],
      expectedErrors: [invalidEffectError]
    },
    {
      name: 'VPC endpoint policy',
      badPolicy: {
        Statement: {
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::examplebucket/1234'
        }
      },
      validator: validateEndpointPolicy,
      buildSimulation: (policy) => ({
        identityPolicies: [],
        serviceControlPolicies: [],
        resourceControlPolicies: [],
        resourcePolicy: undefined,
        vpcEndpointPolicies: [{ name: 'badPolicy', policy }],
        request: userRequest
      }),
      getErrors: (errors) => errors.vpcEndpointErrors?.['badPolicy'],
      expectedErrors: [
        { path: 'Statement', message: 'Principal is required in an endpoint policy' }
      ]
    }
  ]

  const policyForms: Array<{
    label: string
    wrap: (policy: any, validator: (p: any) => ValidationError[]) => any
  }> = [
    { label: 'a raw policy document', wrap: (policy) => policy },
    {
      label: 'a ValidatedPolicy',
      wrap: (policy, validator) => createValidatedPolicy(policy, validator)
    }
  ]

  for (const form of policyForms) {
    describe(`when the invalid policy is ${form.label}`, () => {
      for (const test of policyErrorCases) {
        it(`should return ${test.name} errors`, async () => {
          //Given a simulation with an invalid policy in the ${test.name} slot
          const simulation = test.buildSimulation(form.wrap(test.badPolicy, test.validator))

          //When the simulation is run
          const response = await runSimulation(simulation, {})

          //Then the result should contain the expected validation errors
          const errorResponse = assertErrorResult(response)
          expect(errorResponse.errors.message).toEqual('policy.errors')
          expect(test.getErrors(errorResponse.errors)).toEqual(test.expectedErrors)
        })
      }
    })
  }

  it('should return an error for a mal formatted action', async () => {
    //Given a simulation with a mal formatted action
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const response = await runSimulation(simulation, {})

    //Then the result should contain an error
    const errorResponse = assertErrorResult(response)
    expect(errorResponse.errors!.message).toEqual('invalid.action')
  })

  it('should return an error for a non existent service', async () => {
    //Given a simulation with a non existent service
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const response = await runSimulation(simulation, {})

    //Then the result should contain an error
    const errorResponse = assertErrorResult(response)
    expect(errorResponse.errors!.message).toEqual('invalid.service')
  })

  it('should return an error for a non existent action', async () => {
    //Given a simulation with a non existent action
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const response = await runSimulation(simulation, {})

    //Then the result should contain an error
    const errorResponse = assertErrorResult(response)
    expect(errorResponse.errors!.message).toEqual('invalid.action')
  })

  it('should return an error if a wildcard only action is not a wildcard', async () => {
    //Given a request for a wildcard only action with a specific request listed
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
      dependentActions: [],
      isWildcardOnly: true
    })

    //When the simulation is run
    const response = await runSimulation(simulation, {})

    //Then the result should contain an error
    const errorResponse = assertErrorResult(response)
    expect(errorResponse.errors!.message).toEqual('must.use.wildcard')
  })

  it('should return an error if the resource does not mantch an resource type', async () => {
    //Given a request with a resource that does not match any resource types
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const response = await runSimulation(simulation, {})

    //Then the result should contain an error
    const errorResponse = assertErrorResult(response)
    expect(errorResponse.errors!.message).toEqual('no.resource.types')
  })

  it('should return an error if the resource matches multiple resource types', async () => {
    //Given a request with a resource that matches multiple resource types
    const simulation: Simulation = {
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
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
    const response = await runSimulation(simulation, {})

    //Then the result should contain an error
    const errorResponse = assertErrorResult(response)
    expect(errorResponse.errors!.message).toEqual('multiple.resource.types')
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
      resourceControlPolicies: [
        {
          orgIdentifier: 'ou-123456',
          policies: []
        },
        {
          orgIdentifier: 'ou-123456',
          policies: [
            {
              name: 'NoEc2',
              policy: {
                Version: '2012-10-17',
                Statement: {
                  Effect: 'Deny',
                  Action: 'ec2:*',
                  Resource: '*',
                  Principal: '*'
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
      permissionBoundaryPolicies: [
        {
          name: 'theBoundary',
          policy: {
            Statement: {
              Effect: 'Allow',
              Action: '*',
              Resource: '*'
            }
          }
        }
      ],
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
    const response = await runSimulation(simulation, {})
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    //Then there should be no errors
    expect(result.analysis?.result).toEqual('Allowed')
    expect(result.ignoredContextKeys).toEqual([])
  })

  it('should run a simulation that is implicitly denied by the session policy', async () => {
    //Given a simulation with an identity policy that allows the request
    //but a session policy that does not allow the action
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'allowS3',
          policy: {
            Statement: {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::examplebucket/*'
            }
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
      resourcePolicy: undefined,
      sessionPolicy: {
        Statement: {
          Effect: 'Allow',
          Action: 's3:PutObject',
          Resource: '*'
        }
      },
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:role/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const response = await runSimulation(simulation, {})
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    //Then there should be no errors and the result should be implicitly denied
    expect(result.analysis?.result).toEqual('ImplicitlyDenied')
    expect(result.ignoredContextKeys).toEqual([])
  })

  it('should return an error if a session policy is not allowed for the principal type', async () => {
    //Given the principal types and whether session policies are allowed for them
    // If the principalType value is true, then a session policy is allowed
    // If the principalType value is false, then a session policy is not allowed
    const principalTypes: Record<string, boolean> = {
      'arn:aws:iam::123456789012:user/Alice': false,
      'arn:aws:sts::123456789012:assumed-role/RoleName/SessionName': true,
      'arn:aws:sts::123456789012:federated-user/FederatedName': true,
      'arn:aws:iam::123456789012:role/RoleName': true
    }

    for (const [principal, sessionPolicyAllowed] of Object.entries(principalTypes)) {
      //Given a simulation with a session policy
      const simulation: Simulation = {
        identityPolicies: [
          {
            name: 'allowS3',
            policy: {
              Statement: {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::examplebucket/*'
              }
            }
          }
        ],
        serviceControlPolicies: [],
        resourceControlPolicies: [],
        resourcePolicy: undefined,
        sessionPolicy: {
          Statement: {
            Effect: 'Allow',
            Action: '*',
            Resource: '*'
          }
        },
        request: {
          action: 's3:GetObject',
          resource: {
            resource: 'arn:aws:s3:::examplebucket/1234',
            accountId: '123456789012'
          },
          principal,
          contextVariables: {}
        }
      }

      //When the simulation is run
      const response = await runSimulation(simulation, {})

      //Then the result should match the expected behavior
      if (sessionPolicyAllowed) {
        expect(response.resultType).toEqual('single')
      } else {
        const errorResponse = assertErrorResult(response)
        expect(
          errorResponse.errors?.message,
          `Principal ${principal} should not allow session policies`
        ).toEqual('session.policy.invalid.principal')
      }
    }
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
      resourceControlPolicies: [],
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

    const response = await runSimulation(simulation, {})
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    expect(result.analysis?.result).toEqual('Allowed')
    expect(result.ignoredContextKeys).toEqual([])
  })

  it('should return ignored context keys', async () => {
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
      resourceControlPolicies: [],
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
          's3:ResourceAccount': '123456789012',
          's3:DataAccessPointArn': 'arn:aws:s3:us-west-2:123456789012:accesspoint/my-access-point'
        }
      }
    }

    //When the simulation is run
    const response = await runSimulation(simulation, {})
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    //Then there should be no errors
    expect(result.ignoredContextKeys).toEqual(['s3:DataAccessPointArn'])
  })

  it('should pass the simulation mode', async () => {
    //Given a valid simulation with strict keys
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'readbuckets',
          policy: {
            Statement: {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::examplebucket/*',
              Condition: {
                StringEquals: {
                  'aws:SourceVpc': 'vpc-12345678'
                }
              }
            }
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
      resourcePolicy: undefined,
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

    //When the simulation is run with strict keys
    const response = await runSimulation(simulation, {
      simulationMode: 'Discovery'
    })
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    //Then there should be no errors
    expect(result.analysis?.result).toEqual('Allowed')
    expect(result.ignoredContextKeys).toEqual([])
    expect(result.analysis?.ignoredConditions?.identity?.allow?.length).toEqual(1)
    const ignoredCondition = result.analysis?.ignoredConditions?.identity?.allow?.[0]!
    expect(ignoredCondition.key).toEqual('aws:SourceVpc')
    expect(ignoredCondition.values).toEqual(['vpc-12345678'])
    expect(ignoredCondition.op).toEqual('StringEquals')
  })

  it('should pass the simulation mode with strict keys', async () => {
    //Given a valid simulation with strict keys
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'readbuckets',
          policy: {
            Statement: {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::examplebucket/*',
              Condition: {
                StringEquals: {
                  'aws:SourceVpc': 'vpc-12345678'
                }
              }
            }
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
      resourcePolicy: undefined,
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

    //When the simulation is run with strict keys
    const response = await runSimulation(simulation, {
      simulationMode: 'Discovery',
      strictConditionKeys: ['aws:SourceVpc']
    })
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    //Then there should be no errors
    expect(result.analysis?.result).toEqual('ImplicitlyDenied')
    expect(result.ignoredContextKeys).toEqual([])
    expect(result.analysis?.ignoredConditions?.identity).toBeUndefined()
  })

  it('should ignore s3 ABAC keys if ABAC is not enabled on the bucket', async () => {
    //Given a simulation with S3 ABAC context keys and ABAC disabled
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'readbuckets',
          policy: {
            Statement: {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::examplebucket/test.txt'
            }
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {
          's3:RequestObjectTagKeys': ['tag1', 'tag2'],
          's3:ResourceAccount': '123456789012',
          'aws:ResourceTag/Environment': 'production',
          's3:BucketTag/Owner': 'team-a'
        }
      }
    }

    //When the simulation is run
    const response = await runSimulation(simulation, {})
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    //Then there should be no errors
    //And the S3 ABAC keys should be in the ignored context keys
    expect(result.ignoredContextKeys).toContain('aws:ResourceTag/Environment')
    expect(result.ignoredContextKeys).toContain('s3:BucketTag/Owner')
    //And the non-ABAC keys should not be ignored
    expect(result.ignoredContextKeys).not.toContain('s3:RequestObjectTagKeys')
    expect(result.ignoredContextKeys).not.toContain('s3:ResourceAccount')
  })

  it('should not ignore s3 ABAC keys if ABAC is enabled on the bucket', async () => {
    //Given a simulation with S3 ABAC context keys and ABAC enabled
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'readbuckets',
          policy: {
            Statement: {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::examplebucket/test.txt'
            }
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
      resourcePolicy: undefined,
      request: {
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::examplebucket/1234',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {
          's3:RequestObjectTagKeys': ['tag1', 'tag2'],
          's3:ResourceAccount': '123456789012',
          'aws:ResourceTag/Environment': 'production',
          's3:BucketTag/Owner': 'team-a'
        }
      },
      additionalSettings: {
        s3: {
          bucketAbacEnabled: true
        }
      }
    }

    //When the simulation is run
    const response = await runSimulation(simulation, {})
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }
    const result = response.result

    //Then there should be no errors
    //And the ignored context keys should be empty
    expect(result.ignoredContextKeys).toEqual([])
  })

  it('should return not allowed without erroring when an identity policy has a CloudFormation Sub resource string', async () => {
    //Given an identity policy with a CloudFormation Sub-style resource string (not a standard ARN)
    const simulation: Simulation = {
      identityPolicies: [
        {
          name: 'ssmPolicy',
          policy: {
            Statement: {
              Action: ['ssm:Get*', 'ssm:Describe*'],
              Effect: 'Allow',
              Resource: [
                'Sub "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter"/String/3528394562/*'
              ]
            }
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: [],
      request: {
        action: 'ssm:GetParameter',
        resource: {
          resource: 'arn:aws:ssm:us-east-1:123456789012:parameter/String/3528394562/myParam',
          accountId: '123456789012'
        },
        principal: 'arn:aws:iam::123456789012:user/Alice',
        contextVariables: {}
      }
    }

    //When the simulation is run
    const response = await runSimulation(simulation, {})

    //Then it should not return an error
    expect(response.resultType).not.toEqual('error')
    expect(response.resultType).toEqual('single')
    if (response.resultType !== 'single') {
      throw new Error('Expected single result')
    }

    //And the request should be denied (resource does not match the CloudFormation-style string)
    expect(response.result.analysis?.result).not.toEqual('Allowed')
  })
})

import { describe, expect, it } from 'vitest'
import { IdentityAnalysis, RequestAnalysis } from '../evaluate.js'
import { Simulation } from '../simulation_engine/simulation.js'
import { runSimulation } from '../simulation_engine/simulationEngine.js'
import { getDenialReasons, isAllowedByIdentityPolicies, RequestDenial } from './analyzeResults.js'

describe('isAllowedByIdentityPolicies', () => {
  it('should return false if there is no identity analysis', () => {
    // Given a request analysis with no identity analysis
    const requestAnalysis: Partial<RequestAnalysis> = {
      result: 'ImplicitlyDenied',
      sameAccount: false
    }

    // When we analyze the request analysis
    const result = isAllowedByIdentityPolicies(requestAnalysis as any)

    // Then the result should be false
    expect(result).toBe(false)
  })

  it('should return true if the identity analysis result is Allowed', () => {
    // Given a request analysis with an identity analysis that is Allowed
    const requestAnalysis: Partial<Omit<RequestAnalysis, 'identityAnalysis'>> & {
      identityAnalysis?: Partial<IdentityAnalysis>
    } = {
      result: 'Allowed',
      sameAccount: true,
      identityAnalysis: {
        result: 'Allowed'
      }
    }

    // When we analyze the request analysis
    const result = isAllowedByIdentityPolicies(requestAnalysis as RequestAnalysis)

    // Then the result should be true
    expect(result).toBe(true)
  })
})

const analyzeResultsTests: {
  name: string
  only?: true
  simulation: Simulation
  expected: RequestDenial[]
}[] = [
  // Identity policy tests
  {
    name: 'implicit identity denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'identity',
        denialType: 'Implicit'
      }
    ]
  },
  {
    name: 'explicit identity denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'DenyPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'DenyAll',
                Effect: 'Deny',
                Action: '*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'identity',
        policyIdentifier: 'DenyPolicy',
        statementId: 'DenyAll',
        denialType: 'Explicit'
      }
    ]
  },
  {
    name: 'explicit identity denial uses index when no sid',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'DenyPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Deny',
                Action: '*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'identity',
        policyIdentifier: 'DenyPolicy',
        statementId: '1',
        denialType: 'Explicit'
      }
    ]
  },
  // Resource policy tests
  {
    name: 'implicit resource denial for cross-account request',
    simulation: {
      request: {
        principal: 'arn:aws:iam::111111111111:user/Alice',
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::example_bucket/object.txt',
          accountId: '222222222222'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      resourcePolicy: {
        Version: '2012-10-17',
        Statement: []
      },
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'resource',
        denialType: 'Implicit'
      }
    ]
  },
  {
    name: 'explicit resource denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::example_bucket/object.txt',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      resourcePolicy: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'DenyAlice',
            Effect: 'Deny',
            Principal: '*',
            Action: 's3:*',
            Resource: '*'
          }
        ]
      },
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'resource',
        statementId: 'DenyAlice',
        denialType: 'Explicit'
      }
    ]
  },
  // SCP tests
  {
    name: 'implicit SCP denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [
        {
          orgIdentifier: 'ou-root',
          policies: [
            {
              name: 'RestrictiveSCP',
              policy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: 'ec2:*',
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      ],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'scp',
        identifier: 'ou-root',
        denialType: 'Implicit'
      }
    ]
  },
  {
    name: 'explicit SCP denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [
        {
          orgIdentifier: 'ou-root',
          policies: [
            {
              name: 'DenySCP',
              policy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: '*',
                    Resource: '*'
                  },
                  {
                    Sid: 'DenyS3',
                    Effect: 'Deny',
                    Action: 's3:*',
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      ],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'scp',
        policyIdentifier: 'DenySCP',
        statementId: 'DenyS3',
        denialType: 'Explicit'
      }
    ]
  },
  // RCP tests
  {
    name: 'explicit RCP denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:GetObject',
        resource: {
          resource: 'arn:aws:s3:::example_bucket/object.txt',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: [
        {
          orgIdentifier: 'ou-root',
          policies: [
            {
              name: 'DenyRCP',
              policy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'DenyS3Access',
                    Effect: 'Deny',
                    Principal: '*',
                    Action: 's3:*',
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    expected: [
      {
        policyType: 'rcp',
        policyIdentifier: 'DenyRCP',
        statementId: 'DenyS3Access',
        denialType: 'Explicit'
      }
    ]
  },
  // Permission Boundary tests
  {
    name: 'implicit permission boundary denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      permissionBoundaryPolicies: [
        {
          name: 'BoundaryPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 'ec2:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'permissionBoundary',
        denialType: 'Implicit'
      }
    ]
  },
  {
    name: 'explicit permission boundary denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      permissionBoundaryPolicies: [
        {
          name: 'BoundaryPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: '*',
                Resource: '*'
              },
              {
                Sid: 'DenyS3InBoundary',
                Effect: 'Deny',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'permissionBoundary',
        policyIdentifier: 'BoundaryPolicy',
        statementId: 'DenyS3InBoundary',
        denialType: 'Explicit'
      }
    ]
  },
  // Endpoint Policy tests
  {
    name: 'implicit endpoint policy denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      vpcEndpointPolicies: [
        {
          name: 'EndpointPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: 'ec2:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'endpointPolicy',
        denialType: 'Implicit'
      }
    ]
  },
  {
    name: 'explicit endpoint policy denial',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      vpcEndpointPolicies: [
        {
          name: 'EndpointPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: '*',
                Resource: '*'
              },
              {
                Sid: 'DenyS3Endpoint',
                Effect: 'Deny',
                Principal: '*',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'endpointPolicy',
        policyIdentifier: 'EndpointPolicy',
        statementId: 'DenyS3Endpoint',
        denialType: 'Explicit'
      }
    ]
  },
  // Edge cases
  {
    name: 'no denials when allowed',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: []
  },
  {
    name: 'multiple explicit deny statements from same policy',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'MultiDenyPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'DenyOne',
                Effect: 'Deny',
                Action: 's3:ListBucket',
                Resource: '*'
              },
              {
                Sid: 'DenyTwo',
                Effect: 'Deny',
                Action: 's3:*',
                Resource: 'arn:aws:s3:::example_bucket'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'identity',
        policyIdentifier: 'MultiDenyPolicy',
        statementId: 'DenyOne',
        denialType: 'Explicit'
      },
      {
        policyType: 'identity',
        policyIdentifier: 'MultiDenyPolicy',
        statementId: 'DenyTwo',
        denialType: 'Explicit'
      }
    ]
  },
  {
    name: 'multiple OUs in SCP with only one denying',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'AllowPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      serviceControlPolicies: [
        {
          orgIdentifier: 'ou-root',
          policies: [
            {
              name: 'RootSCP',
              policy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: '*',
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        },
        {
          orgIdentifier: 'ou-child',
          policies: [
            {
              name: 'ChildSCP',
              policy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: 'ec2:*',
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      ],
      resourceControlPolicies: []
    },
    expected: [
      {
        policyType: 'scp',
        identifier: 'ou-child',
        denialType: 'Implicit'
      }
    ]
  },
  {
    name: 'multiple denials from different policy types',
    simulation: {
      request: {
        principal: 'arn:aws:iam::123456789012:user/Alice',
        action: 's3:ListBucket',
        resource: {
          resource: 'arn:aws:s3:::example_bucket',
          accountId: '123456789012'
        },
        contextVariables: {}
      },
      identityPolicies: [
        {
          name: 'IdentityDenyPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'IdentityDeny',
                Effect: 'Deny',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      resourcePolicy: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'ResourceDeny',
            Effect: 'Deny',
            Principal: '*',
            Action: 's3:*',
            Resource: '*'
          }
        ]
      },
      serviceControlPolicies: [
        {
          orgIdentifier: 'ou-root',
          policies: [
            {
              name: 'SCPDenyPolicy',
              policy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: '*',
                    Resource: '*'
                  },
                  {
                    Sid: 'SCPDeny',
                    Effect: 'Deny',
                    Action: 's3:*',
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      ],
      resourceControlPolicies: [
        {
          orgIdentifier: 'ou-root',
          policies: [
            {
              name: 'RCPDenyPolicy',
              policy: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'RCPDeny',
                    Effect: 'Deny',
                    Principal: '*',
                    Action: 's3:*',
                    Resource: '*'
                  }
                ]
              }
            }
          ]
        }
      ],
      permissionBoundaryPolicies: [
        {
          name: 'BoundaryDenyPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: '*',
                Resource: '*'
              },
              {
                Sid: 'BoundaryDeny',
                Effect: 'Deny',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ],
      vpcEndpointPolicies: [
        {
          name: 'EndpointDenyPolicy',
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: '*',
                Resource: '*'
              },
              {
                Sid: 'EndpointDeny',
                Effect: 'Deny',
                Principal: '*',
                Action: 's3:*',
                Resource: '*'
              }
            ]
          }
        }
      ]
    },
    expected: [
      {
        policyType: 'identity',
        policyIdentifier: 'IdentityDenyPolicy',
        statementId: 'IdentityDeny',
        denialType: 'Explicit'
      },
      {
        policyType: 'resource',
        statementId: 'ResourceDeny',
        denialType: 'Explicit'
      },
      {
        policyType: 'scp',
        policyIdentifier: 'SCPDenyPolicy',
        statementId: 'SCPDeny',
        denialType: 'Explicit'
      },
      {
        policyType: 'rcp',
        policyIdentifier: 'RCPDenyPolicy',
        statementId: 'RCPDeny',
        denialType: 'Explicit'
      },
      {
        policyType: 'permissionBoundary',
        policyIdentifier: 'BoundaryDenyPolicy',
        statementId: 'BoundaryDeny',
        denialType: 'Explicit'
      },
      {
        policyType: 'endpointPolicy',
        policyIdentifier: 'EndpointDenyPolicy',
        statementId: 'EndpointDeny',
        denialType: 'Explicit'
      }
    ]
  }
]

function jsonSort(a: any, b: any): number {
  return JSON.stringify(a).localeCompare(JSON.stringify(b))
}

describe('getDenialReasons', () => {
  for (const test of analyzeResultsTests) {
    const testFn = test.only ? it.only : it
    testFn(`should correctly analyze denying policy statements: ${test.name}`, async () => {
      // Given a response to a simulation request
      const response = await runSimulation(test.simulation, {})
      if (response.resultType !== 'single') {
        throw new Error('Expected a single simulation result')
      }
      const requestAnalysis = response.result.analysis!

      // When we analyze the request analysis
      const result = getDenialReasons(requestAnalysis)

      // Then the result should match the expected denying statements
      expect(result.sort(jsonSort)).toEqual(test.expected.sort(jsonSort))
    })
  }
})

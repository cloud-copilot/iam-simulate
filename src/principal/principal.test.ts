import { loadPolicy, NotPrincipalStatement, PrincipalStatement } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { SimulationParameters } from '../core_engine/CoreSimulatorEngine.js'
import { AwsRequestImpl } from '../request/request.js'
import { RequestContextImpl } from '../requestContext.js'
import {
  requestMatchesNotPrincipal,
  requestMatchesPrincipal,
  requestMatchesPrincipalStatement,
  requestMatchesStatementPrincipals,
  userArnFromFederatedUserArn
} from './principal.js'

const defaultResource = { accountId: '', resource: '' }
const defaultSimulationParameters: SimulationParameters = {
  simulationMode: 'Strict',
  strictConditionKeys: new Set()
}

const discoverySimulationParameters: SimulationParameters = {
  simulationMode: 'Discovery',
  strictConditionKeys: new Set()
}

describe('userArnFromFederatedUserArn', () => {
  it('should return the user ARN from a federated user ARN', () => {
    //Given a federated user ARN
    const federatedUserArn = 'arn:aws:sts::123456789012:federated-user/user-a'

    //When we get the user ARN from the federated user ARN
    const result = userArnFromFederatedUserArn(federatedUserArn)

    //Then it should return the user ARN
    expect(result).toBe('arn:aws:iam::123456789012:user/user-a')
  })

  it('should return the user ARN from a federated user ARN with a path', () => {
    //Given a federated user ARN
    const federatedUserArn = 'arn:aws:sts::123456789012:federated-user/admin/global-admin'

    //When we get the user ARN from the federated user ARN
    const result = userArnFromFederatedUserArn(federatedUserArn)

    //Then it should return the user ARN
    expect(result).toBe('arn:aws:iam::123456789012:user/admin/global-admin')
  })
})

describe('requestMatchesPrincipalStatement', () => {
  describe('service principal', () => {
    it('should return Match for matching service principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { Service: 's3.amazonaws.com' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a matching principal
      const request = new AwsRequestImpl(
        's3.amazonaws.com',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )
      // const request = new RequestPrincipalImpl('s3.amazonaws.com');

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return Match
      expect(result.explain.matches).toBe('Match')
    })

    it('should return NoMatch for non-matching service principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { Service: 's3.amazonaws.com' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a non-matching principal
      const request = new AwsRequestImpl(
        'sqs.amazonaws.com',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return NoMatch
      expect(result.explain.matches).toBe('NoMatch')
    })
  })

  describe('canonical user principal', () => {
    it('should return Match for matching canonical user principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          {
            Principal: {
              CanonicalUser: '1234567890123456789012345678901234567890123456789012345678901234'
            }
          }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a matching principal
      const request = new AwsRequestImpl(
        '1234567890123456789012345678901234567890123456789012345678901234',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return Match
      expect(result.explain.matches).toBe('Match')
    })

    it('should return NoMatch for non-matching canonical user principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { CanonicalUser: '11111111111111111111111111111111111111111111111111' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a non-matching principal
      const request = new AwsRequestImpl(
        '9999999999999999999999999999999999999999999999999999',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return NoMatch
      expect(result.explain.matches).toBe('NoMatch')
    })
  })

  describe('federated principal', () => {
    it('should return Match for matching federated principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { Federated: 'actions.github.com' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a matching principal
      const request = new AwsRequestImpl(
        'actions.github.com',
        defaultResource,
        'sts:AssumeRole',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return Match
      expect(result.explain.matches).toBe('Match')
    })

    it('should return NoMatch for non-matching federated principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { Federated: 'www.amazon.com' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a non-matching principal
      const request = new AwsRequestImpl(
        'actions.github.com',
        defaultResource,
        'sts:AssumeRole',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return NoMatch
      expect(result.explain.matches).toBe('NoMatch')
    })
  })

  describe('wildcard principal', () => {
    it('should return Match for wildcard principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { AWS: '*' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with any principal
      const request = new AwsRequestImpl(
        'arn:aws:iam::123456789012:user/user-name',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )
    })
  })

  describe('account principal', () => {
    describe('account id', () => {
      it('should return AccountLevelMatch for matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [{ Principal: { AWS: '555555555555' } }]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

        //And a request with a matching principal
        const request = new AwsRequestImpl(
          'arn:aws:iam::555555555555:user/John',
          defaultResource,
          's3:GetBucket',
          new RequestContextImpl({})
        )

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(
          request,
          principalStatement,
          defaultSimulationParameters,
          'Allow'
        )

        //Then it should return AccountLevelMatch
        expect(result.explain.matches).toBe('AccountLevelMatch')
      })

      it('should return NoMatch for non-matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [{ Principal: { AWS: '555555555555' } }]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

        //And a request with a non-matching principal
        const request = new AwsRequestImpl(
          'arn:aws:iam::999999999999:user/Paul',
          defaultResource,
          's3:GetBucket',
          new RequestContextImpl({})
        )

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(
          request,
          principalStatement,
          defaultSimulationParameters,
          'Allow'
        )

        //Then it should return NoMatch
        expect(result.explain.matches).toBe('NoMatch')
      })
    })

    describe('account ARN', () => {
      it('should return AccountLevelMatch for matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:root' } }]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

        //And a request with a matching principal
        const request = new AwsRequestImpl(
          'arn:aws:iam::555555555555:user/George',
          defaultResource,
          's3:GetBucket',
          new RequestContextImpl({})
        )

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(
          request,
          principalStatement,
          defaultSimulationParameters,
          'Allow'
        )

        //Then it should return AccountLevelMatch
        expect(result.explain.matches).toBe('AccountLevelMatch')
      })

      it('should return NoMatch for non-matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:root' } }]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

        //And a request with a non-matching principal
        const request = new AwsRequestImpl(
          'arn:aws:iam::999999999999:user/MojoJojo',
          defaultResource,
          's3:GetBucket',
          new RequestContextImpl({})
        )

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(
          request,
          principalStatement,
          defaultSimulationParameters,
          'Allow'
        )

        //Then it should return NoMatch
        expect(result.explain.matches).toBe('NoMatch')
      })
    })
  })

  describe('Assumed Roles', () => {
    it('session arn matches', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:sts::555555555555:assumed-role/role-name/session-name' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a matching principal
      const request = new AwsRequestImpl(
        'arn:aws:sts::555555555555:assumed-role/role-name/session-name',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return Match
      expect(result.explain.matches).toBe('Match')
    })

    it('role arn matches', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:role/super-admin' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a matching principal
      const request = new AwsRequestImpl(
        'arn:aws:sts::555555555555:assumed-role/super-admin/session-name',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return Match
      expect(result.explain.matches).toBe('SessionRoleMatch')
    })

    it('neither session nor role arn matches', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:role/super-admin' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a non-matching principal
      const request = new AwsRequestImpl(
        'arn:aws:sts::555555555555:assumed-role/normie-admin/session-name',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return NoMatch
      expect(result.explain.matches).toBe('NoMatch')
    })
  })

  describe('all other AWS principals', () => {
    it('should return Match for matching AWS principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a matching principal
      const request = new AwsRequestImpl(
        'arn:aws:iam::555555555555:user/Larry',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return Match
      expect(result.explain.matches).toBe('Match')
    })

    it('should return NoMatch for non-matching AWS principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]

      //And a request with a non-matching principal
      const request = new AwsRequestImpl(
        'arn:aws:iam::555555555555:user/Curly',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        defaultSimulationParameters,
        'Allow'
      )

      //Then it should return NoMatch
      expect(result.explain.matches).toBe('NoMatch')
    })
  })

  describe('Discovery simulationMode - role session name ignored', () => {
    it('should return Match and ignoredRoleSessionName for assumed-role principal and request with different session name', () => {
      // Given a policy with an assumed-role principal
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:sts::555555555555:assumed-role/role-name/session-a' } }
        ]
      })
      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]
      // And a request with the same role but a different session name
      const request = new AwsRequestImpl(
        'arn:aws:sts::555555555555:assumed-role/role-name/session-b',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      // When we check if the request matches the principal statement in Discovery mode
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        discoverySimulationParameters,
        'Allow'
      )
      // Then it should return Match and ignoredRoleSessionName true
      expect(result.explain.matches).toBe('Match')
      expect(result.ignoredRoleSessionName).toBe(true)
    })

    it('should return SessionRoleMatch for role principal and request with assumed-role session', () => {
      // Given a policy with a role principal
      const policy = loadPolicy({
        Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:role/role-name' } }]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]
      // And a request with an assumed-role session for that role
      const request = new AwsRequestImpl(
        'arn:aws:sts::555555555555:assumed-role/role-name/session-b',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      // When we check if the request matches the principal statement in Discovery mode
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        discoverySimulationParameters,
        'Allow'
      )

      // Then it should return Match and ignoredRoleSessionName true
      expect(result.explain.matches).toBe('SessionRoleMatch')
      expect(result.ignoredRoleSessionName).toBe(undefined)
    })

    it('should not ignore session name in Strict mode', () => {
      // Given a policy with an assumed-role principal
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:sts::555555555555:assumed-role/role-name/session-a' } }
        ]
      })
      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]
      // And a request with the same role but a different session name
      const request = new AwsRequestImpl(
        'arn:aws:sts::555555555555:assumed-role/role-name/session-b',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )
      const strictParams: SimulationParameters = {
        simulationMode: 'Strict',
        strictConditionKeys: new Set()
      }
      // When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        strictParams,
        'Allow'
      )
      // Then it should return NoMatch and not set ignoredRoleSessionName
      expect(result.explain.matches).toBe('NoMatch')
      expect(result.ignoredRoleSessionName).toBeUndefined()
    })
  })

  describe('Discovery simulationMode - session ARN in policy, role ARN in request', () => {
    it('should return Match and ignoredRoleSessionName when requested role matches policy assumed role session', () => {
      // Given a policy with an assumed-role session ARN principal
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:sts::555555555555:assumed-role/role-name/session-a' } }
        ]
      })
      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]
      // And a request with the matching role ARN
      const request = new AwsRequestImpl(
        'arn:aws:iam::555555555555:role/role-name',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      // When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        discoverySimulationParameters,
        'Allow'
      )

      // Then it should return Match and ignoredRoleSessionName true
      expect(result.explain.matches).toBe('Match')
      expect(result.ignoredRoleSessionName).toBe(true)
    })

    it('should return NoMatch when requested role does not match policy assumed role session', () => {
      // Given a policy with an assumed-role session ARN principal
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:sts::555555555555:assumed-role/role-name/session-a' } }
        ]
      })
      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0]
      // And a request with a different role ARN
      const request = new AwsRequestImpl(
        'arn:aws:iam::555555555555:role/other-role',
        defaultResource,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      // When we check if the request matches the principal statement in Discovery mode
      const result = requestMatchesPrincipalStatement(
        request,
        principalStatement,
        discoverySimulationParameters,
        'Allow'
      )
      // Then it should return NoMatch and not set ignoredRoleSessionName
      expect(result.explain.matches).toBe('NoMatch')
      expect(result.ignoredRoleSessionName).toBeUndefined()
    })
  })
})

describe('requestMatchesPrincipal', () => {
  it('return a match for a matching principal', () => {
    //Given a policy with a matching principal
    const policy = loadPolicy({
      Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const principals = (policy.statements()[0] as PrincipalStatement).principals()

    //And a request with a matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesPrincipal(
      request,
      principals,
      defaultSimulationParameters,
      'Allow'
    )

    //Then it should return Match
    expect(result.matches).toBe('Match')
  })

  it('returns AccountLevelMatch for a matching account principal', () => {
    //Given a policy with a matching account principal
    const policy = loadPolicy({
      Statement: [{ Principal: { AWS: '555555555555' } }]
    })

    const principals = (policy.statements()[0] as PrincipalStatement).principals()

    //And a request with a matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesPrincipal(
      request,
      principals,
      defaultSimulationParameters,
      'Allow'
    )

    //Then it should return AccountLevelMatch
    expect(result.matches).toBe('AccountLevelMatch')
  })

  it('should return Match if there is a Match and an AccountLevelMatch', () => {
    //Given a policy with a matching principal
    const policy = loadPolicy({
      Statement: [{ Principal: { AWS: ['arn:aws:iam::555555555555:user/Larry', '555555555555'] } }]
    })

    const principals = (policy.statements()[0] as PrincipalStatement).principals()

    //And a request with a matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesPrincipal(
      request,
      principals,
      defaultSimulationParameters,
      'Allow'
    )

    //Then it should return Match
    expect(result.matches).toBe('Match')
  })

  it('returns NoMatch for a non-matching principal', () => {
    //Given a policy with a non-matching principal
    const policy = loadPolicy({
      Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const principals = (policy.statements()[0] as PrincipalStatement).principals()

    //And a request with a non-matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Curly',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesPrincipal(
      request,
      principals,
      defaultSimulationParameters,
      'Allow'
    )

    //Then it should return NoMatch
    expect(result.matches).toBe('NoMatch')
  })
})

describe('requestMatchesNotPrincipal', () => {
  it('returns NoMatch for a matching principal', () => {
    //Given a policy with a matching principal
    const policy = loadPolicy({
      Statement: [{ NotPrincipal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const notPrincipals = (policy.statements()[0] as NotPrincipalStatement).notPrincipals()

    //And a request with a matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesNotPrincipal(
      request,
      notPrincipals,
      defaultSimulationParameters,
      'Allow'
    )

    //Then it should return NoMatch
    expect(result.matches).toBe('NoMatch')
  })

  it('returns NoMatch for a matching account principal', () => {
    //Given a policy with a matching account principal
    const policy = loadPolicy({
      Statement: [{ NotPrincipal: { AWS: '555555555555' } }]
    })

    const notPrincipals = (policy.statements()[0] as NotPrincipalStatement).notPrincipals()

    //And a request with a matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesNotPrincipal(
      request,
      notPrincipals,
      defaultSimulationParameters,
      'Allow'
    )

    //Then it should return NoMatch
    expect(result.matches).toBe('NoMatch')
  })

  it('returns Match for a non-matching principal', () => {
    //Given a policy with a non-matching principal
    const policy = loadPolicy({
      Statement: [{ NotPrincipal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const notPrincipals = (policy.statements()[0] as NotPrincipalStatement).notPrincipals()

    //And a request with a non-matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Curly',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesNotPrincipal(
      request,
      notPrincipals,
      defaultSimulationParameters,
      'Allow'
    )
  })
})

describe('requestMatchesStatementPrincipals', () => {
  it('should return a match if the principal matches', () => {
    //Given a statement with a principal
    const policy = loadPolicy({
      Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const statement = policy.statements()[0]

    //And a request with a matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      { accountId: '', resource: '' },
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesStatementPrincipals(
      request,
      statement,
      defaultSimulationParameters
    )

    //Then it should return Match
    expect(result.matches).toBe('Match')
  })

  it('should return no match if the principal does not match', () => {
    //Given a statement with a principal
    const policy = loadPolicy({
      Statement: [{ Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const statement = policy.statements()[0]

    //And a request with a non-matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Curly',
      { accountId: '', resource: '' },
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesStatementPrincipals(
      request,
      statement,
      defaultSimulationParameters
    )

    //Then it should return NoMatch
    expect(result.matches).toBe('NoMatch')
  })

  it('should return Match if the NotPrincipal does not match', () => {
    //Given a statement with a NotPrincipal
    const policy = loadPolicy({
      Statement: [{ NotPrincipal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const statement = policy.statements()[0]

    //And a request with a non-matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Curly',
      { accountId: '', resource: '' },
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesStatementPrincipals(
      request,
      statement,
      defaultSimulationParameters
    )

    //Then it should return Match
    expect(result.matches).toBe('Match')
  })

  it('should return NoMatch if the NotPrincipal matches', () => {
    //Given a statement with a NotPrincipal
    const policy = loadPolicy({
      Statement: [{ NotPrincipal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }]
    })

    const statement = policy.statements()[0]

    //And a request with a non-matching principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      { accountId: '', resource: '' },
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    const result = requestMatchesStatementPrincipals(
      request,
      statement,
      defaultSimulationParameters
    )

    //Then it should return Match
    expect(result.matches).toBe('NoMatch')
  })

  it('should throw an error if the statement has neither Principal nor NotPrincipal', () => {
    //Given a statement without Principal or NotPrincipal
    const policy = loadPolicy({
      Statement: [{ Effect: 'Allow' }]
    })

    const statement = policy.statements()[0]

    //And a request with a principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      { accountId: '', resource: '' },
      's3:GetBucket',
      new RequestContextImpl({})
    )

    //When we check if the request matches the principal
    expect(() =>
      requestMatchesStatementPrincipals(request, statement, defaultSimulationParameters)
    ).toThrow('Statement should have Principal or NotPrincipal')
  })
})

describe('requestMatchesPrincipal - Discovery mode, ignoredRoleSessionName return', () => {
  it('should return Match and ignoredRoleSessionName true if only match is via session name ignoring', () => {
    // Given a policy with an assumed-role session principal
    const policy = loadPolicy({
      Statement: [
        {
          Principal: {
            AWS: [
              'arn:aws:sts::555555555555:assumed-role/role-name/session-a',
              'arn:aws:iam::555555555555:role/other-role'
            ]
          }
        }
      ]
    })
    const principals = (policy.statements()[0] as PrincipalStatement).principals()
    // And a request with the matching role ARN for the session principal
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:role/role-name',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )
    // When we check if the request matches the principal in Discovery mode
    const result = requestMatchesPrincipal(
      request,
      principals,
      discoverySimulationParameters,
      'Allow'
    )
    // Then it should return Match and ignoredRoleSessionName true
    expect(result.matches).toBe('Match')
    expect(result.ignoredRoleSessionName).toBe(true)
  })

  it('should not set ignoredRoleSessionName if there is a direct match', () => {
    // Given a policy with both a direct match and a session-ignored match
    const policy = loadPolicy({
      Statement: [
        {
          Principal: {
            AWS: [
              'arn:aws:iam::555555555555:user/Larry',
              'arn:aws:sts::555555555555:assumed-role/role-name/session-a'
            ]
          }
        }
      ]
    })
    const principals = (policy.statements()[0] as PrincipalStatement).principals()
    // And a request with a direct match
    const request = new AwsRequestImpl(
      'arn:aws:iam::555555555555:user/Larry',
      defaultResource,
      's3:GetBucket',
      new RequestContextImpl({})
    )
    // When we check if the request matches the principal in Discovery mode
    const result = requestMatchesPrincipal(
      request,
      principals,
      discoverySimulationParameters,
      'Allow'
    )
    // Then it should return Match and not set ignoredRoleSessionName
    expect(result.matches).toBe('Match')
    expect(result.ignoredRoleSessionName).toBeUndefined()
  })
})

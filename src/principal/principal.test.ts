import { loadPolicy, NotPrincipalStatement, PrincipalStatement } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { AwsRequestImpl } from '../request/request.js'
import { RequestContextImpl } from '../requestContext.js'
import {
  requestMatchesNotPrincipal,
  requestMatchesPrincipal,
  requestMatchesPrincipalStatement,
  requestMatchesStatementPrincipals,
  roleArnFromAssumedRoleArn,
  userArnFromFederatedUserArn
} from './principal.js'

const defaultResource = { accountId: '', resource: '' }

describe('roleArnFromAssumedRoleArn', () => {
  it('should return the role ARN from an assumed role ARN', () => {
    //Given an assumed role ARN
    const assumedRoleArn = 'arn:aws:sts::123456789012:assumed-role/role-name/session-name'

    //When we get the role ARN from the assumed role ARN
    const result = roleArnFromAssumedRoleArn(assumedRoleArn)

    //Then it should return the role ARN
    expect(result).toBe('arn:aws:iam::123456789012:role/role-name')
  })

  it('should return the role ARN from an assumed role ARN with a path', () => {
    //Given an assumed role ARN
    const assumedRoleArn = 'arn:aws:sts::123456789012:assumed-role/admin/global-admin/session-name'

    //When we get the role ARN from the assumed role ARN
    const result = roleArnFromAssumedRoleArn(assumedRoleArn)

    //Then it should return the role ARN
    expect(result).toBe('arn:aws:iam::123456789012:role/admin/global-admin')
  })
})

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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return Match
      expect(result.matches).toBe('Match')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return NoMatch
      expect(result.matches).toBe('NoMatch')
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
        undefined,
        's3:GetBucket',
        new RequestContextImpl({})
      )

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return Match
      expect(result.matches).toBe('Match')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return NoMatch
      expect(result.matches).toBe('NoMatch')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return Match
      expect(result.matches).toBe('Match')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return NoMatch
      expect(result.matches).toBe('NoMatch')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)
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
        const result = requestMatchesPrincipalStatement(request, principalStatement)

        //Then it should return AccountLevelMatch
        expect(result.matches).toBe('AccountLevelMatch')
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
        const result = requestMatchesPrincipalStatement(request, principalStatement)

        //Then it should return NoMatch
        expect(result.matches).toBe('NoMatch')
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
        const result = requestMatchesPrincipalStatement(request, principalStatement)

        //Then it should return AccountLevelMatch
        expect(result.matches).toBe('AccountLevelMatch')
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
        const result = requestMatchesPrincipalStatement(request, principalStatement)

        //Then it should return NoMatch
        expect(result.matches).toBe('NoMatch')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return Match
      expect(result.matches).toBe('Match')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return Match
      expect(result.matches).toBe('SessionRoleMatch')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return NoMatch
      expect(result.matches).toBe('NoMatch')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return Match
      expect(result.matches).toBe('Match')
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
      const result = requestMatchesPrincipalStatement(request, principalStatement)

      //Then it should return NoMatch
      expect(result.matches).toBe('NoMatch')
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
    const result = requestMatchesPrincipal(request, principals)

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
    const result = requestMatchesPrincipal(request, principals)

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
    const result = requestMatchesPrincipal(request, principals)

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
    const result = requestMatchesPrincipal(request, principals)

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
    const result = requestMatchesNotPrincipal(request, notPrincipals)

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
    const result = requestMatchesNotPrincipal(request, notPrincipals)

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
    const result = requestMatchesNotPrincipal(request, notPrincipals)
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
    const result = requestMatchesStatementPrincipals(request, statement)

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
    const result = requestMatchesStatementPrincipals(request, statement)

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
    const result = requestMatchesStatementPrincipals(request, statement)

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
    const result = requestMatchesStatementPrincipals(request, statement)

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
    expect(() => requestMatchesStatementPrincipals(request, statement)).toThrow(
      'Statement should have Principal or NotPrincipal'
    )
  })
})

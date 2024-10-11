import { loadPolicy, PrincipalStatement } from '@cloud-copilot/iam-policy';
import { describe, expect, it } from 'vitest';
import { RequestImpl } from '../request/request.js';
import { RequestContextImpl } from '../requestContext.js';
import { isAssumedRoleArn, requestMatchesPrincipalStatement, roleArnFromAssumedRoleArn } from './principal.js';

describe('isAssumedRoleArn', () => {
  it('should return true for assumed role ARN', () => {
    //Given an assumed role ARN
    const assumedRoleArn = 'arn:aws:sts::123456789012:assumed-role/role-name/session-name';

    //When we check if it is an assumed role ARN
    const result = isAssumedRoleArn(assumedRoleArn);

    //Then it should return true
    expect(result).toBe(true);
  })

  it('should return false for non-assumed role ARN', () => {
    expect(isAssumedRoleArn('arn:aws:iam::123456789012:user/user-name')).toBe(false)
  })
})

describe('roleArnFromAssumedRoleArn', () => {
  it('should return the role ARN from an assumed role ARN', () => {
    //Given an assumed role ARN
    const assumedRoleArn = 'arn:aws:sts::123456789012:assumed-role/role-name/session-name';

    //When we get the role ARN from the assumed role ARN
    const result = roleArnFromAssumedRoleArn(assumedRoleArn);

    //Then it should return the role ARN
    expect(result).toBe('arn:aws:iam::123456789012:role/role-name');
  })

  it('should return the role ARN from an assumed role ARN with a path', () => {
    //Given an assumed role ARN
    const assumedRoleArn = 'arn:aws:sts::123456789012:assumed-role/admin/global-admin/session-name';

    //When we get the role ARN from the assumed role ARN
    const result = roleArnFromAssumedRoleArn(assumedRoleArn);

    //Then it should return the role ARN
    expect(result).toBe('arn:aws:iam::123456789012:role/admin/global-admin');
  })
})

describe('requestMatchesPrincipalStatement', () => {
  describe('service principal', () => {
    it('should return Match for matching service principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { Service: 's3.amazonaws.com' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a matching principal
      const request = new RequestImpl('s3.amazonaws.com', undefined, 's3:GetBucket', new RequestContextImpl({}));
      // const request = new RequestPrincipalImpl('s3.amazonaws.com');

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return Match
      expect(result).toBe('Match');
    })

    it('should return NoMatch for non-matching service principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { Service: 's3.amazonaws.com' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a non-matching principal
      const request = new RequestImpl('sqs.amazonaws.com', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return NoMatch
      expect(result).toBe('NoMatch');
    })
  })

  describe('canonical user principal', () => {
    it('should return Match for matching canonical user principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { CanonicalUser: '1234567890123456789012345678901234567890123456789012345678901234' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a matching principal
      const request = new RequestImpl('1234567890123456789012345678901234567890123456789012345678901234', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return Match
      expect(result).toBe('Match');
    })

    it('should return NoMatch for non-matching canonical user principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { CanonicalUser: '11111111111111111111111111111111111111111111111111' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a non-matching principal
      const request = new RequestImpl('9999999999999999999999999999999999999999999999999999', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return NoMatch
      expect(result).toBe('NoMatch');
    })
  })

  describe('federated principal', () => {
    it('should return Match for matching federated principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { Federated: 'actions.github.com' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a matching principal
      const request = new RequestImpl('actions.github.com', undefined, 'sts:AssumeRole', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return Match
      expect(result).toBe('Match');
    })

    it('should return NoMatch for non-matching federated principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { Federated: 'www.amazon.com' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a non-matching principal
      const request = new RequestImpl('actions.github.com', undefined, 'sts:AssumeRole', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return NoMatch
      expect(result).toBe('NoMatch');
    })
  })

  describe('wildcard principal', () => {
    it('should return Match for wildcard principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: '*' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with any principal
      const request = new RequestImpl('arn:aws:iam::123456789012:user/user-name', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);
    })
  })

  describe('account principal', () => {
    describe('account id', () => {
      it('should return AccountLevelMatch for matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [
            { Principal: { AWS: '555555555555' } }
          ]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

        //And a request with a matching principal
        const request = new RequestImpl('arn:aws:iam::555555555555:user/John', undefined, 's3:GetBucket', new RequestContextImpl({}));

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(request, principalStatement);

        //Then it should return AccountLevelMatch
        expect(result).toBe('AccountLevelMatch');
      })

      it('should return NoMatch for non-matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [
            { Principal: { AWS: '555555555555' } }
          ]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

        //And a request with a non-matching principal
        const request = new RequestImpl('arn:aws:iam::999999999999:user/Paul', undefined, 's3:GetBucket', new RequestContextImpl({}));

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(request, principalStatement);

        //Then it should return NoMatch
        expect(result).toBe('NoMatch');
      })
    })

    describe('account ARN', () => {
      it('should return AccountLevelMatch for matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [
            { Principal: { AWS: 'arn:aws:iam::555555555555:root' } }
          ]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

        //And a request with a matching principal
        const request = new RequestImpl('arn:aws:iam::555555555555:user/George', undefined, 's3:GetBucket', new RequestContextImpl({}));

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(request, principalStatement);

        //Then it should return AccountLevelMatch
        expect(result).toBe('AccountLevelMatch');
      })

      it('should return NoMatch for non-matching account principal', () => {
        //Given a policy principal statement
        const policy = loadPolicy({
          Statement: [
            { Principal: { AWS: 'arn:aws:iam::555555555555:root' } }
          ]
        })

        const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

        //And a request with a non-matching principal
        const request = new RequestImpl('arn:aws:iam::999999999999:user/MojoJojo', undefined, 's3:GetBucket', new RequestContextImpl({}));

        //When we check if the request matches the principal statement
        const result = requestMatchesPrincipalStatement(request, principalStatement);

        //Then it should return NoMatch
        expect(result).toBe('NoMatch');
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

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a matching principal
      const request = new RequestImpl('arn:aws:sts::555555555555:assumed-role/role-name/session-name', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return Match
      expect(result).toBe('Match');
    })
    it('role arn matches', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:iam::555555555555:role/super-admin' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a matching principal
      const request = new RequestImpl('arn:aws:sts::555555555555:assumed-role/super-admin/session-name', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return Match
      expect(result).toBe('Match');
    })

    it('neither session nor role arn matches', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:iam::555555555555:role/super-admin' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a non-matching principal
      const request = new RequestImpl('arn:aws:sts::555555555555:assumed-role/normie-admin/session-name', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return NoMatch
      expect(result).toBe('NoMatch');
    })
  })

  describe('all other AWS principals', () => {
    it('should return Match for matching AWS principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a matching principal
      const request = new RequestImpl('arn:aws:iam::555555555555:user/Larry', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return Match
      expect(result).toBe('Match');
    })

    it('should return NoMatch for non-matching AWS principal', () => {
      //Given a policy principal statement
      const policy = loadPolicy({
        Statement: [
          { Principal: { AWS: 'arn:aws:iam::555555555555:user/Larry' } }
        ]
      })

      const principalStatement = (policy.statements()[0] as PrincipalStatement).principals()[0];

      //And a request with a non-matching principal
      const request = new RequestImpl('arn:aws:iam::555555555555:user/Curly', undefined, 's3:GetBucket', new RequestContextImpl({}));

      //When we check if the request matches the principal statement
      const result = requestMatchesPrincipalStatement(request, principalStatement);

      //Then it should return NoMatch
      expect(result).toBe('NoMatch');
    })
  })
})
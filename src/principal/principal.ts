import { Principal } from "@cloud-copilot/iam-policy";
import { Request } from "../request/request.js";

//Wildcards are not allowed in the principal element https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
// The only exception is the "*" wildcard, which you can use to match all principals, including anonymous principals.


/*
//AWS account and root user


When an IAM account is specified, the account must grant access in an IAM policy.
Account ID or account ARN

We need a way to indicate the principal is an explicit match or if it is delegated to IAM.


//Canonical User ID
CanonicalUser: just match the string

//IAM roles
Role ARN

//Role sessions
"AWS": "arn:aws:sts::AWS-account-ID:assumed-role/role-name/role-session-name"
"AWS": "arn:aws:sts::AWS-account-ID:assumed-role/role-path/role-name/role-session-name"

OIDC Session Principals:
Check federated and see if the string matches
SAML Session Principals:
Check the Federated string and see if it matches

//IAM users
Just make sure the ARN Matches

IAM Identity Center principals // Ignore this for now.

//Federated user sessions
"Principal": { "AWS": "arn:aws:sts::AWS-account-ID:federated-user/user-name" }


//AWS services
//Look at the service name and see if it matches the string
*/

type PrincipalMatchResult = 'Match' | 'NoMatch' | 'AccountLevelMatch'

export function requestMatchesPrincipalStatement(request: Request, principalStatement: Principal): PrincipalMatchResult {
  if(principalStatement.isServicePrincipal()) {
    if(principalStatement.service() === request.principal.value()) {
      return 'Match'
    }
    return 'NoMatch'
  }

  if(principalStatement.isCanonicalUserPrincipal()) {
    if(principalStatement.canonicalUser() === request.principal.value()) {
      return 'Match'
    }
    return 'NoMatch'
  }

  if(principalStatement.isFederatedPrincipal()) {
    if(principalStatement.federated() === request.principal.value()) {
      return 'Match'
    }
    return 'NoMatch'
  }

  if(principalStatement.isWildcardPrincipal()) {
    return 'Match'
  }

  if(principalStatement.isAccountPrincipal()) {
    if(principalStatement.accountId() === request.principal.accountId()) {
      return 'AccountLevelMatch'
    }
    return 'NoMatch'
  }

  if(principalStatement.isAwsPrincipal()) {
    if(isAssumedRoleArn(request.principal.value())) {
      const sessionArn = request.principal.value()
      const roleArn = roleArnFromAssumedRoleArn(sessionArn)
      if(principalStatement.arn() ===  roleArn || principalStatement.arn() === sessionArn) {
        return 'Match'
      }
    }

    if(principalStatement.arn() === request.principal.value()) {
      return 'Match'
    }
  }

  return 'NoMatch'
}

const assumedRoleArnRegex = /^arn:aws:sts::\d{12}:assumed-role\/.*$/

export function isAssumedRoleArn(principal: string): boolean {
  return assumedRoleArnRegex.test(principal)
}

export function roleArnFromAssumedRoleArn(assumedRoleArn: string): string {
  const stsParts = assumedRoleArn.split(':')
  const resourceParts = stsParts.at(-1)!.split('/')
  const rolePathAndName = resourceParts.slice(1, -1).join('/')
  return `arn:aws:iam::${stsParts[4]}:role/${rolePathAndName}`
}

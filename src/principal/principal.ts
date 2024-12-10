import { Principal, Statement } from "@cloud-copilot/iam-policy";
import { PrincipalExplain, StatementExplain } from "../explain/statementExplain.js";
import { AwsRequest } from "../request/request.js";

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

export type PrincipalMatchResult = 'Match' | 'NoMatch' | 'AccountLevelMatch'

/**
 * Check to see if a request matches a Principal element in an IAM policy statement
 *
 * @param request the request to check
 * @param principal the list of principals in the Principal element of the Statement
 * @returns if the request matches the Principal element, and if so, how it matches
 */
export function requestMatchesPrincipal(request: AwsRequest, principal: Principal[]): {matches: PrincipalMatchResult, explains: PrincipalExplain[]} {
  const explains = principal.map(principalStatement => requestMatchesPrincipalStatement(request, principalStatement))
  if(explains.some(exp => exp.matches === 'Match')) {
    return {
      matches: 'Match',
      explains
    }
  }

  if(explains.some(exp => exp.matches === 'AccountLevelMatch')) {
    return {
      matches: 'AccountLevelMatch',
      explains
    }
  }

  return {
    matches: 'NoMatch',
    explains
  }
}

/**
 * Check to see if a request matches a NotPrincipal element in an IAM policy statement
 *
 * @param request the request to check
 * @param notPrincipal the list of principals in the NotPrincipal element of the Statement
 * @returns
 */
export function requestMatchesNotPrincipal(request: AwsRequest, notPrincipal: Principal[]): {matches: PrincipalMatchResult, explains: PrincipalExplain[]} {
  // const matches = notPrincipal.map(principalStatement => requestMatchesPrincipalStatement(request, principalStatement))
  const explains = notPrincipal.map(principalStatement => {
    const explain = requestMatchesPrincipalStatement(request, principalStatement)
    /**
     * Need to do research on this. If there is an account level match on a NotPrincipal, does that
     * mean it tentatively matches the NotPrincipal, or does it mean it does not match the NotPrincipal?
     *
     * We need to test this.
     */
    if(explain.matches === 'Match' || explain.matches === 'AccountLevelMatch') {
      explain.matches = 'NoMatch'
    } else {
      explain.matches = 'Match'
    }
    return explain
  })


  if(explains.some(exp => exp.matches === 'Match')) {
    return {
      matches: 'Match',
      explains
    }
  }

  return {
    matches: 'NoMatch',
    explains
  }

  // if(matches.includes('Match')) {
  //   return 'NoMatch'
  // }


  // if(matches.includes('AccountLevelMatch')) {
  //   return 'NoMatch'
  // }

  // return 'Match'
}

/**
 * Check to see if a request matches a principal statement
 *
 * @param request the request to check
 * @param principalStatement the principal statement to check the request against
 * @returns if the request matches the principal statement, and if so, how it matches
 */
export function requestMatchesPrincipalStatement(request: AwsRequest, principalStatement: Principal): PrincipalExplain {
  if(principalStatement.isServicePrincipal()) {
    if(principalStatement.service() === request.principal.value()) {
      return {
        matches: 'Match',
        principal: principalStatement.value(),
      }
    }
    return {
      matches: 'NoMatch',
      principal: principalStatement.value(),
    }
  }

  if(principalStatement.isCanonicalUserPrincipal()) {
    if(principalStatement.canonicalUser() === request.principal.value()) {
      return {
        matches: 'Match',
        principal: principalStatement.value(),
      }
    }
    return {
      matches: 'NoMatch',
      principal: principalStatement.value(),
    }
  }

  if(principalStatement.isFederatedPrincipal()) {
    if(principalStatement.federated() === request.principal.value()) {
      return {
        matches: 'Match',
        principal: principalStatement.value(),
      }
    }
    return {
      matches: 'NoMatch',
      principal: principalStatement.value(),
    }
  }

  if(principalStatement.isWildcardPrincipal()) {
    return {
      matches: 'Match',
      principal: principalStatement.value(),
    }
  }

  if(principalStatement.isAccountPrincipal()) {
    if(principalStatement.accountId() === request.principal.accountId()) {
      return {
        matches: 'AccountLevelMatch',
        principal: principalStatement.value(),
      }
    }
    return {
      matches: 'NoMatch',
      principal: principalStatement.value(),
    }
  }

  if(principalStatement.isAwsPrincipal()) {
    if(isAssumedRoleArn(request.principal.value())) {
      const sessionArn = request.principal.value()
      const roleArn = roleArnFromAssumedRoleArn(sessionArn)
      if(principalStatement.arn() ===  roleArn || principalStatement.arn() === sessionArn) {
        return {
          matches: 'Match',
          principal: principalStatement.value(),
          roleForSessionArn: roleArn,
        }
      }
    }

    if(principalStatement.arn() === request.principal.value()) {
      return {
        matches: 'Match',
        principal: principalStatement.value(),
      }
    }
  }

  return {
    matches: 'NoMatch',
    principal: principalStatement.value(),
  }
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

/**
 * Check if a request matches the Resource or NotResource elements of a statement.
 *
 * @param request the request to check
 * @param statement the statement to check against
 * @returns true if the request matches the resources in the statement, false otherwise
 */
export function requestMatchesStatementPrincipals(request: AwsRequest, statement: Statement): {matches: PrincipalMatchResult, details: Pick<StatementExplain, 'principals' | 'notPrincipals'>} {
  if(statement.isPrincipalStatement()) {
    const {matches, explains} = requestMatchesPrincipal(request, statement.principals())
    return {matches, details: {principals: explains}}
  } else if(statement.isNotPrincipalStatement()) {
    const {matches, explains} = requestMatchesNotPrincipal(request, statement.notPrincipals())
    return {matches, details: {notPrincipals: explains}}
  }
  throw new Error('Statement should have Principal or NotPrincipal')
}
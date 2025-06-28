import { Principal, Statement } from '@cloud-copilot/iam-policy'
import {
  convertAssumedRoleArnToRoleArn,
  isAssumedRoleArn,
  isFederatedUserArn
} from '@cloud-copilot/iam-utils'
import { SimulationParameters } from '../core_engine/CoreSimulatorEngine.js'
import { PrincipalExplain, StatementExplain } from '../explain/statementExplain.js'
import { AwsRequest } from '../request/request.js'

interface PrincipalAnalysis {
  explain: PrincipalExplain
  ignoredRoleSessionName?: boolean
}

//Wildcards are not allowed in the principal element https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
// The only exception is the "*" wildcard, which you can use to match all principals, including anonymous principals.

/*
OIDC Session Principals:
Check federated and see if the string matches
SAML Session Principals:
Check the Federated string and see if it matches

IAM Identity Center principals // Ignore this for now.

//Federated user sessions, need to fix this see todo below
*/

export type PrincipalMatchResult =
  | 'Match'
  | 'NoMatch'
  | 'AccountLevelMatch'
  | 'SessionRoleMatch'
  | 'SessionUserMatch'

/**
 * Check to see if a request matches a Principal element in an IAM policy statement
 *
 * @param request the request to check
 * @param principal the list of principals in the Principal element of the Statement
 * @returns if the request matches the Principal element, and if so, how it matches
 */
export function requestMatchesPrincipal(
  request: AwsRequest,
  principal: Principal[],
  simulationParameters: SimulationParameters,
  allowOrDeny: 'Allow' | 'Deny'
): {
  matches: PrincipalMatchResult
  explains: PrincipalExplain[]
  ignoredRoleSessionName?: boolean
} {
  const analyses = principal.map((principalStatement) =>
    requestMatchesPrincipalStatement(request, principalStatement, simulationParameters, allowOrDeny)
  )

  const explains = analyses.map((a) => a.explain)
  const anyIgnore = analyses.some((any) => any.ignoredRoleSessionName)
  const ignoredRoleSessionName = anyIgnore ? true : undefined

  // First check if any principal match without ignoring the role session name
  if (analyses.some((anys) => anys.explain.matches === 'Match' && !anys.ignoredRoleSessionName)) {
    return {
      matches: 'Match',
      explains,
      ignoredRoleSessionName
    }
  }

  if (explains.some((exp) => exp.matches === 'SessionUserMatch')) {
    return {
      matches: 'SessionUserMatch',
      explains,
      ignoredRoleSessionName
    }
  }

  if (explains.some((exp) => exp.matches === 'SessionRoleMatch')) {
    return {
      matches: 'SessionRoleMatch',
      explains,
      ignoredRoleSessionName
    }
  }

  // If there was a match, in Discovery mode, return a match and check for ignoredRoleSessionName
  if (
    simulationParameters.simulationMode === 'Discovery' &&
    analyses.some((any) => any.explain.matches === 'Match')
  ) {
    // The session role name could have been ignored in any statement

    return {
      matches: 'Match',
      explains,
      ignoredRoleSessionName
    }
  }

  if (explains.some((exp) => exp.matches === 'AccountLevelMatch')) {
    return {
      matches: 'AccountLevelMatch',
      explains,
      ignoredRoleSessionName
    }
  }

  return {
    matches: 'NoMatch',
    explains,
    ignoredRoleSessionName
  }
}

/**
 * Check to see if a request matches a NotPrincipal element in an IAM policy statement
 *
 * @param request the request to check
 * @param notPrincipal the list of principals in the NotPrincipal element of the Statement
 * @returns
 */
export function requestMatchesNotPrincipal(
  request: AwsRequest,
  notPrincipal: Principal[],
  simulationParameters: SimulationParameters,
  allowOrDeny: 'Allow' | 'Deny'
): { matches: PrincipalMatchResult; explains: PrincipalExplain[] } {
  // const matches = notPrincipal.map(principalStatement => requestMatchesPrincipalStatement(request, principalStatement))
  const analyses = notPrincipal.map((principalStatement) => {
    const analysis = requestMatchesPrincipalStatement(
      request,
      principalStatement,
      simulationParameters,
      allowOrDeny
    )
    /**
     * Need to do research on this. If there is an account level match on a NotPrincipal, does that
     * mean it tentatively matches the NotPrincipal, or does it mean it does not match the NotPrincipal?
     *
     * We need to test this.
     */

    // Invert the match result for NotPrincipal
    if (
      analysis.explain.matches === 'Match' ||
      analysis.explain.matches === 'AccountLevelMatch' ||
      analysis.explain.matches === 'SessionRoleMatch' ||
      analysis.explain.matches === 'SessionUserMatch'
    ) {
      analysis.explain.matches = 'NoMatch'
    } else {
      analysis.explain.matches = 'Match'
    }
    return analysis
  })

  if (analyses.some((exp) => exp.explain.matches === 'NoMatch')) {
    return {
      matches: 'NoMatch',
      explains: analyses.map((a) => a.explain)
    }
  }

  return {
    matches: 'Match',
    explains: analyses.map((a) => a.explain)
  }
}

/**
 * Check to see if a request matches a principal statement
 *
 * @param request the request to check
 * @param principalStatement the principal statement to check the request against
 * @returns if the request matches the principal statement, and if so, how it matches
 */
export function requestMatchesPrincipalStatement(
  request: AwsRequest,
  principalStatement: Principal,
  simulationParameters: SimulationParameters,
  allowOrDeny: 'Allow' | 'Deny'
): PrincipalAnalysis {
  if (principalStatement.isServicePrincipal()) {
    if (principalStatement.service() === request.principal.value()) {
      return {
        explain: {
          matches: 'Match',
          principal: principalStatement.value()
        }
      }
    }
    return {
      explain: {
        matches: 'NoMatch',
        principal: principalStatement.value()
      }
    }
  }

  if (principalStatement.isCanonicalUserPrincipal()) {
    if (principalStatement.canonicalUser() === request.principal.value()) {
      return {
        explain: {
          matches: 'Match',
          principal: principalStatement.value()
        }
      }
    }
    return {
      explain: {
        matches: 'NoMatch',
        principal: principalStatement.value()
      }
    }
  }

  if (principalStatement.isFederatedPrincipal()) {
    if (principalStatement.federated() === request.principal.value()) {
      return {
        explain: {
          matches: 'Match',
          principal: principalStatement.value()
        }
      }
    }
    return {
      explain: {
        matches: 'NoMatch',
        principal: principalStatement.value()
      }
    }
  }

  if (principalStatement.isWildcardPrincipal()) {
    return {
      explain: {
        matches: 'Match',
        principal: principalStatement.value()
      }
    }
  }

  if (principalStatement.isAccountPrincipal()) {
    if (principalStatement.accountId() === request.principal.accountId()) {
      return {
        explain: {
          matches: 'AccountLevelMatch',
          principal: principalStatement.value()
        }
      }
    }
    return {
      explain: {
        matches: 'NoMatch',
        principal: principalStatement.value()
      }
    }
  }

  if (principalStatement.isAwsPrincipal()) {
    if (isAssumedRoleArn(request.principal.value())) {
      const sessionArn = request.principal.value()
      const roleArn = convertAssumedRoleArnToRoleArn(sessionArn)
      if (principalStatement.arn() === roleArn) {
        return {
          explain: {
            matches: 'SessionRoleMatch',
            principal: principalStatement.value(),
            roleForSessionArn: roleArn
          }
        }
      }
    } else if (isFederatedUserArn(request.principal.value())) {
      // TODO: This is wrong, have to receive the User ARN from the request
      const sessionArn = request.principal.value()
      const userArn = userArnFromFederatedUserArn(sessionArn)
      if (principalStatement.arn() === userArn) {
        return {
          explain: {
            matches: 'SessionUserMatch',
            principal: principalStatement.value(),
            userForSessionArn: userArn
          }
        }
      }
    }

    if (principalStatement.arn() === request.principal.value()) {
      return {
        explain: {
          matches: 'Match',
          principal: principalStatement.value()
        }
      }
    }

    /*
      If:
        - The simulation mode is Discovery
        - The principal in the statement is an assumed role ARN
        - The principal in the request is a Role or assumed role ARN
        - The base role ARN of the principal in the request matches the base role ARN in the statement
      Then:
        - Return a Match for the principal if Allow, or NoMatch if Deny
        - Indicate that the role session name was ignored for evaluation purposes
    */
    if (
      simulationParameters.simulationMode === 'Discovery' &&
      isAssumedRoleArn(principalStatement.arn())
    ) {
      const principalRoleArn = convertAssumedRoleArnToRoleArn(principalStatement.arn())
      let requestRoleArn = request.principal.value()
      if (isAssumedRoleArn(requestRoleArn)) {
        requestRoleArn = convertAssumedRoleArnToRoleArn(requestRoleArn)
      }

      if (principalRoleArn === requestRoleArn) {
        const discoveryMatch = allowOrDeny === 'Allow' ? 'Match' : 'NoMatch'
        return {
          explain: {
            matches: discoveryMatch,
            principal: principalStatement.value()
          },
          ignoredRoleSessionName: true // This is a role session match with the session name ignored
        }
      }
    }
  }

  return {
    explain: {
      matches: 'NoMatch',
      principal: principalStatement.value()
    }
  }
}

/**
 * Get a user ARN from a federated user ARN
 *
 * @param federatedUserArn the federated user ARN
 * @returns the user ARN for the federated user ARN
 */
export function userArnFromFederatedUserArn(federatedUserArn: string): string {
  const stsParts = federatedUserArn.split(':')
  const resource = stsParts.at(-1)!
  const username = resource.slice(resource.indexOf('/') + 1)
  return `arn:aws:iam::${stsParts[4]}:user/${username}`
}

/**
 * Check if a request matches the Resource or NotResource elements of a statement.
 *
 * @param request the request to check
 * @param statement the statement to check against
 * @returns true if the request matches the resources in the statement, false otherwise
 */
export function requestMatchesStatementPrincipals(
  request: AwsRequest,
  statement: Statement,
  simulationParameters: SimulationParameters
): {
  matches: PrincipalMatchResult
  details: Pick<StatementExplain, 'principals' | 'notPrincipals'>
  ignoredRoleSessionName?: boolean
} {
  if (statement.isPrincipalStatement()) {
    const { matches, explains, ignoredRoleSessionName } = requestMatchesPrincipal(
      request,
      statement.principals(),
      simulationParameters,
      statement.effect() as 'Allow' | 'Deny'
    )
    return { matches, details: { principals: explains }, ignoredRoleSessionName }
  } else if (statement.isNotPrincipalStatement()) {
    const { matches, explains } = requestMatchesNotPrincipal(
      request,
      statement.notPrincipals(),
      simulationParameters,
      statement.effect() as 'Allow' | 'Deny'
    )
    return { matches, details: { notPrincipals: explains } }
  }
  throw new Error('Statement should have Principal or NotPrincipal')
}

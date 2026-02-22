import { type ResourceType } from '@cloud-copilot/iam-data'
import { type Statement } from '@cloud-copilot/iam-policy'
import { actionMatchesPattern, resourceArnWithWildcardsToRegex } from '@cloud-copilot/iam-utils'
import { type PolicyWithName } from '../core_engine/CoreSimulatorEngine.js'
import { resourceArnsOverlap } from '../util/resourceStrings.js'
import { resourceStringMatchesResourceTypePattern } from './resourceTypes.js'

/**
 * Extracts matching resource strings from a set of policies for a given action and resource pattern.
 *
 * @param policies Array of policies to search through (undefined entries are skipped)
 * @param action The action to match against policy statements
 * @param resourceType The resource type to filter resource strings by
 * @param resourceArnPattern The resource ARN pattern to match against
 * @returns Array of unique resource strings that match the criteria
 */
export function getMatchingResourceStringsForPolicies(
  policies: (PolicyWithName | undefined)[],
  action: string,
  resourceType: ResourceType,
  resourceArnPattern: string
): string[] {
  const resourceStrings = new Set<string>()
  for (const policy of policies) {
    if (!policy) {
      continue
    }
    for (const statement of policy.statements()) {
      const stmtResourceStrings = getResourceStringsFromStatement(
        statement,
        action,
        resourceType,
        resourceArnPattern
      )
      for (const rs of stmtResourceStrings) {
        resourceStrings.add(rs)
      }
    }
  }
  return Array.from(resourceStrings)
}

/**
 * Extracts resource strings from a single policy statement that allows the specified action.
 *
 * @param statement The policy statement to analyze
 * @param action The action to check if the statement allows
 * @param resourceType The resource type to filter by
 * @param resourceArnPattern The resource ARN pattern to match
 * @returns Array of resource strings from the statement, or empty array if statement doesn't allow the action
 */
export function getResourceStringsFromStatement(
  statement: Statement,
  action: string,
  resourceType: ResourceType,
  resourceArnPattern: string
): string[] {
  if (statementAllowsAction(statement, action)) {
    return statementResourceStringsForResourceTypeAndPattern(
      statement,
      resourceType,
      resourceArnPattern
    )
  }
  return []
}

/**
 * Extracts resource strings from a statement's Resource or NotResource elements that match the given criteria.
 *
 * @param statement The policy statement to analyze
 * @param resourceType The resource type to filter by
 * @param resourceArnPattern The resource ARN pattern to check for overlap
 * @returns Array of matching resource strings, or ['*'] for certain NotResource cases
 */
export function statementResourceStringsForResourceTypeAndPattern(
  statement: Statement,
  resourceType: ResourceType,
  resourceArnPattern: string
): string[] {
  if (statement.isResourceStatement() && statement.isAllow()) {
    const resourceStrings: string[] = []
    for (const stmtResource of statement.resources()) {
      if (resourceStringMatchesResourceTypePattern(stmtResource.value(), resourceType.arn)) {
        if (resourceArnsOverlap(resourceArnPattern, stmtResource.value())) {
          resourceStrings.push(stmtResource.value())
        }
      }
    }
    return resourceStrings
  }

  if (statement.isNotResourceStatement() && statement.isAllow()) {
    for (const stmtNotResource of statement.notResources()) {
      // If any NotResource string equals or is a superset of the resource type pattern, then the statement does not apply to the string. Otherwise, it should return the string '*'
      if (
        stmtNotResource.value() === resourceArnPattern ||
        isResourceArnSuperset(stmtNotResource.value(), resourceArnPattern)
      ) {
        return []
      }
    }
    return ['*']
  }

  // If it's a statement that has no Resource or NotResource such as a trust policy, just return the original pattern
  return [resourceArnPattern]
}

/**
 * Determines if a policy statement allows the specified action.
 *
 * @param statement The policy statement to check
 * @param action The action to test against the statement
 * @returns true if the statement allows the action, false otherwise
 */
export function statementAllowsAction(statement: Statement, action: string): boolean {
  if (statement.isActionStatement() && statement.isAllow()) {
    for (const stmtAction of statement.actions()) {
      if (actionMatchesPattern(action, stmtAction.value())) {
        return true
      }
    }
    return false
  } else if (statement.isNotActionStatement() && statement.isAllow()) {
    for (const stmtAction of statement.notActions()) {
      if (actionMatchesPattern(action, stmtAction.value())) {
        return false
      }
    }
    return true
  }

  return false
}

function isResourceArnSuperset(arnSuperset: string, arnSubset: string): boolean {
  const regexSuperset = resourceArnWithWildcardsToRegex(arnSuperset)
  return regexSuperset.test(arnSubset)
}

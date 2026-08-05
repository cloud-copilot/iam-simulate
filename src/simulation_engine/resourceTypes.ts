import {
  iamActionDetails,
  iamResourceTypeDetails,
  type ResourceType
} from '@cloud-copilot/iam-data'
import { resourceStringMatchesResourceTypePattern } from '@cloud-copilot/iam-utils'

/**
 * Get the the possible resource types for an action and resource
 *
 * @param service the service the action belongs to
 * @param action the action to get the resource type for
 * @param resource the resource type matching the action, if any
 * @throws an error if the service or action does not exist, or if the action is a wildcard only action
 */
export async function getResourceTypesForAction(
  service: string,
  action: string,
  resource: string
): Promise<ResourceType[]> {
  const actionDetails = await iamActionDetails(service, action)
  if (actionDetails.resourceTypes.length === 0) {
    throw new Error(`${service}:${action} does not have any resource types`)
  }

  const matchingResourceTypes: ResourceType[] = []
  for (const rt of actionDetails.resourceTypes) {
    const resourceType = await iamResourceTypeDetails(service, rt.name)
    // const pattern = convertResourcePatternToRegex(resourceType.arn)
    // const match = resource.match(new RegExp(pattern))
    const match = resourceStringMatchesResourceTypePattern(resource, resourceType.arn)
    if (match) {
      matchingResourceTypes.push(resourceType)
    }
  }

  // A wildcard resource can genuinely match multiple resource types, such as a
  // DynamoDB `table/*` resource matching tables and streams alike. Preserve all
  // matches so the simulation engine can evaluate each candidate type.
  if (resource.includes('*')) {
    return matchingResourceTypes
  }

  return dropSupersededResourceTypes(matchingResourceTypes)
}

/**
 * Drop resource type matches that are refined by a more specific matched type.
 *
 * Resource type matching allows a trailing variable segment to span delimiters
 * so S3 object keys can contain `/`. That also means a concrete sub-resource ARN
 * can match its parent type, such as a DynamoDB stream matching both `stream` and
 * `table`. When both parent and child patterns match, only the child pattern
 * describes the concrete resource.
 *
 * @param matches the resource types whose ARN patterns matched the resource
 * @returns the matching resource types that are not superseded by a child pattern
 */
function dropSupersededResourceTypes(matches: ResourceType[]): ResourceType[] {
  return matches.filter(
    (candidate) => !matches.some((other) => patternRefines(other.arn, candidate.arn))
  )
}

/**
 * Determine whether one resource type pattern extends another pattern.
 *
 * Sub-resources and qualified ARNs can be delimited with either `/` or `:`. Some
 * parent patterns already end in one of those delimiters, so the candidate
 * delimiter is normalized before testing the prefix relationship.
 *
 * @param other the potentially more specific ARN pattern
 * @param candidate the potentially superseded ARN pattern
 * @returns true when `other` extends `candidate` with additional ARN segments
 */
function patternRefines(other: string, candidate: string): boolean {
  if (other === candidate) {
    return false
  }

  const candidateBase = candidate.replace(/[/:]$/, '')
  return other.startsWith(`${candidateBase}/`) || other.startsWith(`${candidateBase}:`)
}

import { iamActionDetails, iamResourceTypeDetails, ResourceType } from '@cloud-copilot/iam-data'
import { convertResourcePatternToRegex, splitArnParts } from '../util.js'

/**
 * Checks to see if a resource string ARN matches a resource pattern from the Service Authorization Reference
 *
 * @param resourceString
 * @param resourcePattern
 */
export function resourceStringMatchesResourceTypePattern(
  resourceString: string,
  resourcePattern: string
): boolean {
  if (resourceString === '*') {
    return true
  }

  const resourceParts = splitArnParts(resourceString)
  const patternParts = splitArnParts(resourcePattern)

  if (
    !resourceComponentMatchesResourceTypeComponent(resourceParts.partition, patternParts.partition)
  ) {
    return false
  }

  if (!resourceComponentMatchesResourceTypeComponent(resourceParts.service, patternParts.service)) {
    return false
  }

  if (!resourceComponentMatchesResourceTypeComponent(resourceParts.region, patternParts.region)) {
    return false
  }

  if (
    !resourceComponentMatchesResourceTypeComponent(resourceParts.accountId, patternParts.accountId)
  ) {
    return false
  }

  const [resourceResourcePartsSegments, resourceResourceParts] = splitResourceTypeComponent(
    resourceParts.resource
  )
  const [patternResourcePartsSegments, patternResourceParts] = splitResourceTypeComponent(
    patternParts.resource
  )

  // If there are more segments in the resource than the pattern, it cannot match,
  // unless the final pattern component is a variable (e.g. ${ObjectName}) which
  // can span multiple segments (like S3 object keys with slashes).
  if (resourceResourcePartsSegments > patternResourcePartsSegments) {
    const lastPatternComponent = patternResourceParts.at(-1)
    if (!isResourceTypeVariable(lastPatternComponent) || patternResourcePartsSegments === 1) {
      return false
    }
  }

  // If there are fewer segments with contents in the resource than the pattern, and the last segment of the resource
  // does not end with a wildcard, it cannot match
  if (
    resourceResourceParts.length < patternResourceParts.length &&
    !resourceResourceParts.at(-1)?.endsWith('*')
  ) {
    return false
  }

  const compareLen = Math.min(resourceResourceParts.length, patternResourceParts.length)
  for (let i = 0; i < compareLen; i++) {
    const resourceComponent = resourceResourceParts[i]
    const isLastPattern = i === patternResourceParts.length - 1
    const patternComponent = patternResourceParts[i]

    if (!patternComponent) {
      return false
    }

    if (isResourceTypeVariable(patternComponent)) {
      if (
        isLastPattern &&
        resourceResourcePartsSegments > patternResourcePartsSegments &&
        patternResourcePartsSegments > 1
      ) {
        // Variable at the end can absorb additional segments.
        return true
      }
      if (isLastPattern && resourceComponent?.endsWith('*')) {
        // If the resource component ends with a wildcard, it matches everything after
        break
      }

      // These match anything, move along.
      continue
    }

    if (!resourceComponent) {
      return false
    }

    const resourceComponentPattern =
      '^' + resourceComponent.replace(/\?/g, '.').replace(/\*/g, '.*?') + '$'
    const regex = new RegExp(resourceComponentPattern, 'i')
    const match = patternComponent.match(regex)
    if (match) {
      if (isLastPattern && resourceComponent.endsWith('*')) {
        // If the resource component ends with a wildcard, it matches everything after
        break
      }
      continue
    } else {
      return false
    }
  }
  /*
    Matching resource types.
    If the pattern has a slash or colon in the resource portion, those need to exist in the pattern.
    If the pattern ends with a wildcard, that matches everything.
  */

  return true
}

function splitResourceTypeComponent(component: string | undefined): [number, string[]] {
  const parts = component?.split(/[:/]/) ?? []
  return [parts.length, parts.filter((p) => p && p !== '')]
}

function resourceComponentMatchesResourceTypeComponent(
  resourceComponent: string | undefined,
  resourceTypeComponent: string | undefined
): boolean {
  if (resourceTypeComponent === '*' || resourceTypeComponent === resourceComponent) {
    return true
  }

  if (!resourceComponent || !resourceTypeComponent) {
    return false
  }

  if (isResourceTypeVariable(resourceTypeComponent)) {
    // If the entire component is a single variable, it matches anything
    return true
  }

  const pattern = convertResourcePatternToRegex(resourceTypeComponent)
  const regex = new RegExp(pattern)
  const match = resourceComponent.match(regex)
  return !!match
}

function isResourceTypeVariable(component: string | undefined): boolean {
  if (!component) {
    return false
  }
  return component.match(/^\$\{[0-1a-zA-Z]+\}$/) !== null
}

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

  return matchingResourceTypes
}

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

  return matchingResourceTypes
}

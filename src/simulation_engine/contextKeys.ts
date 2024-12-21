import { iamActionDetails } from '@cloud-copilot/iam-data'
import { allGlobalConditionKeys } from '../global_conditions/globalConditionKeys.js'
import { getResourceTypesForAction, isWildcardOnlyAction, lowerCaseAll } from '../util.js'

/**
 * Get the allowed context keys for a request.
 *
 * @param service The service the action belongs to
 * @param action The action to get the allowed context keys for
 * @param resource The resource the action is being performed on
 * @returns The allowed context keys for the request as lower case strings
 * @throws error if the service or action does not exist
 */
export async function allowedContextKeysForRequest(
  service: string,
  action: string,
  resource: string
): Promise<string[]> {
  const actionDetails = await iamActionDetails(service, action)
  const actionConditionKeys = lowerCaseAll(actionDetails.conditionKeys)

  const isWildCardOnly = await isWildcardOnlyAction(service, action)
  if (isWildCardOnly) {
    return [...actionConditionKeys, ...allGlobalConditionKeys()]
  }

  const resourceTypes = await getResourceTypesForAction(service, action, resource)
  if (resourceTypes.length === 0) {
    throw new Error(`No resource types found for action ${action} on service ${service}`)
  } else if (resourceTypes.length > 1) {
    throw new Error(`Multiple resource types found for action ${action} on service ${service}`)
  }
  const resourceTypeConditions = actionDetails.resourceTypes.find(
    (rt) => rt.name === resourceTypes[0].key
  )!.conditionKeys

  return [
    ...lowerCaseAll(resourceTypeConditions),
    ...actionConditionKeys,
    ...allGlobalConditionKeys()
  ]
}

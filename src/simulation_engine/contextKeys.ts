import { iamActionDetails } from "@cloud-copilot/iam-data";
import { getResourceTypeForAction, isWildcardOnlyAction } from "../util.js";

/**
 * Get the allowed context keys for a request.
 *
 * @param service The service the action belongs to
 * @param action The action to get the allowed context keys for
 * @param resource The resource the action is being performed on
 * @returns The allowed context keys for the request
 */
export async function allowedContextKeysForRequest(service: string, action: string, resource: string): Promise<string[]> {
  const actionDetails = await iamActionDetails(service, action);
  const actionConditionKeys = actionDetails.conditionKeys;

  const isWildCardOnly = await isWildcardOnlyAction(service, action);
  if(isWildCardOnly) {
    return actionConditionKeys
  }

  const resourceType = await getResourceTypeForAction(service, action, resource);
  const resourceTypeConditions = actionDetails.resourceTypes.find(rt => rt.name === resourceType!.key)!.conditionKeys

  return [
    ...resourceTypeConditions,
    ...actionConditionKeys
  ]
}

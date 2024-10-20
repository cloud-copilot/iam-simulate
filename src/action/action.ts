import { Action } from "@cloud-copilot/iam-policy";
import { AwsRequest } from "../request/request.js";

/**
 * Convert an action action (the part after the colon) to a regular expression.
 *
 * @param action the action to convert to a regular expression
 * @returns a regular that replaces any wildcards in the action with the appropriate regular expression.
 */
function convertActionToRegex(action: string): RegExp {
  if(action.indexOf(':') != -1) {
    throw new Error('Action should not contain a colon');
  }
  const pattern = "^" + action.replace(/\?/g, '.').replace(/\*/g, '.*?') + "$"
  return new RegExp(pattern, 'i')
}


/**
 * Check if a request matches a set of actions.
 *
 * @param request the request to check
 * @param actions the actions to check against
 * @returns true if the request matches any of the actions, false otherwise
 */
export function requestMatchesActions(request: AwsRequest, actions: Action[]): boolean {
  for(const action of actions) {
    if (action.isWildcardAction()) {
      return true;
    } else if(action.isServiceAction()) {
      if(request.action.service() != action.service()) {
        continue
      }
      const actionRegex = convertActionToRegex(action.action());
      if(actionRegex.test(request.action.action())) {
        return true;
      }
    } else {
      throw new Error('Unknown action type');
    }
  }
  return false;
}

/**
 * Check if a request does not match a set of actions.
 *
 * @param request the request to check
 * @param actions the actions to check against
 * @returns true if the request does not match any of the actions, false if the request matches any of the actions
 */
export function requestMatchesNotActions(request: AwsRequest, actions: Action[]): boolean {
  return !requestMatchesActions(request, actions);
}

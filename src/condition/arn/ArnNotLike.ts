import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { arnMatches } from "./arn.js";

export const ArnNotLike: BaseConditionOperator = {
  name: 'ArnNotLike',
  matches: (request, keyValue, policyValues) => {
    const explains = policyValues.map(
      policyArn => arnMatches(policyArn, keyValue, request, false)
    )

    return {
      matches: !explains.some(explain => !explain.matches),
      explains
    }
  },
  allowsVariables: true,
  allowsWildcards: true
}

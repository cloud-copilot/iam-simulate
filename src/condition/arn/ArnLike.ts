import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { arnMatches } from "./arn.js";

export const ArnLike: BaseConditionOperator = {
  name: 'ArnLike',
  matches: (request, keyValue, policyValues) => {
    const explains = policyValues.map(
      policyArn => arnMatches(policyArn, keyValue, request, true)
    )

    return {
      matches: explains.some(explain => explain.matches),
      explains
    }
  },
  allowsVariables: true,
  allowsWildcards: true
}

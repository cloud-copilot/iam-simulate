import { BaseConditionOperator } from "../BaseConditionOperator.js";
import { checkIfIpAddress } from "./ip.js";

export const NotIpAddress: BaseConditionOperator = {
  name: 'NotIpAddress',
  matches: (request, keyValue, policyValues) => {
    const explains = policyValues.map(policyValue => {
      return checkIfIpAddress(policyValue, keyValue, false)
    })

    return {
      matches: !explains.some(explain => !explain.matches),
      explains
    }
  },
  allowsVariables: false,
  allowsWildcards: false
}
import { ConditionValueExplain } from '../explain/statementExplain.js'
import { AwsRequest } from '../request/request.js'

export interface BaseConditionOperator {
  name: string
  matches: (
    request: AwsRequest,
    keyValue: string,
    policyValues: string[]
  ) => { matches: boolean; explains: ConditionValueExplain[] }
  allowsVariables: boolean
  allowsWildcards: boolean
  isNegative: boolean
}

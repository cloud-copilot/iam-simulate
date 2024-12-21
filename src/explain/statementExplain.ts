export type ExplainPrincipalMatch =
  | 'Match'
  | 'NoMatch'
  | 'AccountLevelMatch'
  | 'SessionRoleMatch'
  | 'SessionUserMatch'

export interface ActionExplain {
  action: string
  matches: boolean
}

export interface ResourceExplain {
  resource: string
  resolvedValue?: string
  errors?: string[]
  matches: boolean
}

export interface PrincipalExplain {
  principal: string
  matches: ExplainPrincipalMatch
  roleForSessionArn?: string
  userForSessionArn?: string
  errors?: string[]
}

export interface ConditionValueExplain {
  value: string
  resolvedValue?: string
  matches: boolean
  matchingValues?: string[]
  negativeMatchingValues?: string[]
  errors?: string[]
}

export interface ConditionExplain {
  /**
   * The operation that was used in the condition statement
   */
  operator: string

  /**
   * The value being matched in the condition statement
   */
  conditionKeyValue: string

  /**
   * The resolved vaue of the condition key
   */
  resolvedConditionKeyValue?: string
  values: ConditionValueExplain | ConditionValueExplain[]

  /**
   * The values from the request context that were not matched by a condition with a set operation
   */
  unmatchedValues?: string[]

  /**
   * Whether the condition matches the request
   */
  matches: boolean

  /**
   *
   */
  matchedBecauseMissing?: boolean

  /**
   * Failed because the context key was missing from the request.
   */
  failedBecauseMissing?: boolean

  /**
   * Failed because the context key was required to be a string but was was
   * an instead an array. Caused by a set operation being used on a single value
   * context key.
   */
  failedBecauseArray?: boolean

  /**
   * Failed because the context value was required to be an array but was not.
   * Caused by a set operation being used on a context key that was not an array.
   */
  failedBecauseNotArray?: boolean
  /**
   * Was the base operator in the condition statment not found
   */
  missingOperator?: boolean
}

export interface StatementExplain {
  actionMatch: boolean
  resourceMatch: boolean
  principalMatch: ExplainPrincipalMatch
  conditionMatch: boolean

  matches: boolean
  identifier: string
  effect: string
  actions?: ActionExplain | ActionExplain[]
  notActions?: ActionExplain | ActionExplain[]
  resources?: ResourceExplain | ResourceExplain[]
  notResources?: ResourceExplain | ResourceExplain[]
  principals?: PrincipalExplain | PrincipalExplain[]
  notPrincipals?: PrincipalExplain | PrincipalExplain[]
  conditions?: ConditionExplain[]
}

/*
I want to emit the policy object exactly as it was written. How do I get a structure
that matches the policy object exactly? Should I just embed the values in the explain?
*/

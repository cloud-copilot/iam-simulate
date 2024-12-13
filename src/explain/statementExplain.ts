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
  matches: 'Match' | 'NoMatch' | 'AccountLevelMatch' | 'SessionRoleMatch'
  roleForSessionArn?: string
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
  operator: string;
  conditionKeyValue: string
  resolvedConditionKeyValue?: string
  values: ConditionValueExplain | ConditionValueExplain[]
  unmatchedValues?: string[]
  matches: boolean
  matchedBecauseMissing?: boolean
  failedBecauseMissing?: boolean
  failedBecauseArray?: boolean
  failedBecauseNotArray?: boolean
  missingOperator?: boolean
}

export interface StatementExplain {
  // request: {
  //   action: string
  //   principal: string
  //   resource: string
  //   context: Record<string, string | string[]>
  // }

  matches: boolean
  identifier: string
  effect: string
  actions?: ActionExplain | ActionExplain[]
  notActions?: ActionExplain | ActionExplain[]
  resources?: ResourceExplain | ResourceExplain[]
  notResources?: ResourceExplain | ResourceExplain[]
  principals? : PrincipalExplain | PrincipalExplain[]
  notPrincipals?: PrincipalExplain | PrincipalExplain[]
  conditions?: ConditionExplain[]
}

/*
I want to emit the policy object exactly as it was written. How do I get a structure
that matches the policy object exactly? Should I just embed the values in the explain?
*/




export interface ActionExplain {
  action: string;
  matches: boolean
}

export interface ResourceExplain {
  resource: string;
  resolvedValue: string;
  errors: string[];
  matches: boolean;
}

export interface PrincipalExplain {
  principal: string;
  matches: boolean;
  roleForSessionArn: string;
}

export interface ConditionValueExplain {
  value: string;
  resolvedValue: string;
  matches: boolean;
  errors: string[];
}

export interface ConditionExplain {
  operator: string;
  conditionKeyValue: string
  values: ConditionValueExplain | ConditionValueExplain[];
  unmatchedValues: string[]
  matches: boolean;
  matchedBecauseMissing?: boolean;
  failedBecauseMissing?: boolean;
}

export interface StatementExplain {
  requestExplain: {
    action: string;
    principal: string;
    resource: string;
    context: Record<string, string | string[]>;
  }

  effect: string;
  actions?: ActionExplain | ActionExplain[];
  notActions?: ActionExplain | ActionExplain[];
  resource?: ResourceExplain | ResourceExplain[];
  notResource?: ResourceExplain | ResourceExplain[];
  principal? : PrincipalExplain | PrincipalExplain[];
  notPrincipal?: PrincipalExplain | PrincipalExplain[];
  condition?: ConditionExplain[];
}

/*
I want to emit the policy object exactly as it was written. How do I get a structure
that matches the policy object exactly? Should I just embed the values in the explain?
*/




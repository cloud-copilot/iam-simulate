export interface Simulation {
  request: {
    principal: string;
    action: string;
    resource: {
      resource: string,
      accountId: string
    }
    contextVariables: Record<string, string | string[]>;
  }

  identityPolicies: Record<string, any>[];
  serviceControlPolicies?: Record<string, Record<string, any>[]>[];
  resourcePolicy?: any;
}
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

  identityPolicies: {name: string, policy: any}[];
  serviceControlPolicies: {
    orgIdentifier: string,
    policies: {name: string, policy: any}[]
  }[];
  resourcePolicy?: any
  permissionBoundaryPolicies? : {name: string, policy: any}[]
}
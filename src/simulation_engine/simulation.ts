export interface Simulation {
  request: {
    principal: string
    action: string
    resource: {
      resource: string
      accountId: string
    }
    contextVariables: Record<string, string | string[]>
  }

  identityPolicies: { name: string; policy: any }[]

  serviceControlPolicies: {
    orgIdentifier: string
    policies: { name: string; policy: any }[]
  }[]

  /**
   * The resource control policies for the simulation.
   * One per level of the OU/Account hierarchy.
   * The default Resource Control Policy, RCPFullAWSAccess, is automatically added to the simulation.
   */
  resourceControlPolicies: {
    orgIdentifier: string
    policies: { name: string; policy: any }[]
  }[]

  resourcePolicy?: any
  permissionBoundaryPolicies?: { name: string; policy: any }[]
}

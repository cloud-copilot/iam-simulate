/**
 * Represents the policies attached to an OU, or account
 */
export interface SimulationOrgPolicies {
  orgIdentifier: string
  policies: { name: string; policy: any }[]
}

/**
 * Represent a policy attached to an identity
 */
export interface SimulationIdentityPolicy {
  name: string
  policy: any
}

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

  identityPolicies: SimulationIdentityPolicy[]

  /**
   * The service control policies that apply to the simulation.
   * The root OU should be the first element in the array.
   * The account specific SCPs should be the last element in the array.
   */
  serviceControlPolicies: SimulationOrgPolicies[]

  /**
   * The resource control policies for the simulation.
   * One per level of the OU/Account hierarchy.
   * The default Resource Control Policy, RCPFullAWSAccess, is automatically added to the simulation.
   */
  resourceControlPolicies: SimulationOrgPolicies[]

  resourcePolicy?: any
  permissionBoundaryPolicies?: { name: string; policy: any }[]
}

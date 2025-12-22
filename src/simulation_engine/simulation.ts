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

  /**
   * A session policy, if any, for the current Role or Federated User session.
   */
  sessionPolicy?: any | undefined

  /**
   * The identity policies that are attached to the principal making the request
   */
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

  /**
   * The resource policy, if any
   */
  resourcePolicy?: any

  /**
   * The permission boundary policies, if any.
   */
  permissionBoundaryPolicies?: { name: string; policy: any }[]

  /**
   * The VPC endpoint policies, if any.
   */
  vpcEndpointPolicies?: { name: string; policy: any }[]

  /**
   * Additional settings that may affect the simulation
   */
  additionalSettings?: {
    s3?: {
      /**
       * If an S3 bucket request, whether ABAC is enabled on the bucket
       */
      bucketAbacEnabled?: boolean
    }
  }
}

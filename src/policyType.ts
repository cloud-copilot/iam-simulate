/**
 * The type of IAM policy being evaluated during authorization.
 *
 * - `'identity'` — identity-based policies attached to the principal
 * - `'resource'` — resource-based policies attached to the target resource
 * - `'scp'` — service control policies from AWS Organizations
 * - `'rcp'` — resource control policies from AWS Organizations
 * - `'pb'` — permission boundary policies
 * - `'vpce'` — VPC endpoint policies
 * - `'session'` — session policies for assumed role or federated sessions
 */
export type PolicyType = 'scp' | 'rcp' | 'vpce' | 'identity' | 'resource' | 'pb' | 'session'

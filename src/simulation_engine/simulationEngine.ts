import { iamActionExists, iamServiceExists } from '@cloud-copilot/iam-data'
import {
  loadPolicy,
  validateEndpointPolicy,
  validateIdentityPolicy,
  validateResourceControlPolicy,
  validateResourcePolicy,
  validateServiceControlPolicy,
  ValidationError
} from '@cloud-copilot/iam-policy'
import { isConditionKeyArray } from '../context_keys/contextKeyTypes.js'
import { normalizeContextKeyCase, typeForContextKey } from '../context_keys/contextKeys.js'
import {
  authorize,
  ControlPolicies,
  PolicyWithName,
  SimulationMode,
  validSimulationModes
} from '../core_engine/CoreSimulatorEngine.js'
import { RequestAnalysis } from '../evaluate.js'
import { AwsRequestImpl } from '../request/request.js'
import { RequestContextImpl } from '../requestContext.js'
import { getResourceTypesForAction, isWildcardOnlyAction } from '../util.js'
import { allowedContextKeysForRequest } from './contextKeys.js'
import { Simulation } from './simulation.js'
import { SimulationOptions } from './simulationOptions.js'

const DEFAULT_RCP = {
  name: 'RCPFullAWSAccess',
  policy: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: '*',
        Resource: '*'
      }
    ]
  }
}

export interface SimulationErrors {
  identityPolicyErrors?: Record<string, ValidationError[]>
  serviceControlPolicyErrors?: Record<string, ValidationError[]>
  resourceControlPolicyErrors?: Record<string, ValidationError[]>
  permissionBoundaryErrors?: Record<string, ValidationError[]>
  resourcePolicyErrors?: ValidationError[]
  vpcEndpointErrors?: Record<string, ValidationError[]>
  message: string
}

export interface SimulationResult {
  errors?: SimulationErrors
  analysis?: RequestAnalysis

  /**
   * The resource type that was used for the simulation, if applicable.
   *
   * Will only be present if the request passes validation to reach the policy
   * evaluation stage and the action is not a wildcard-only action.
   */
  resourceType?: string
  /**
   * Any context keys provided in the request that were filtered out before
   * policy evaluation because they do not apply to the action/resource type.
   *
   * This will only be present if the request passes validation to reach the
   * policy evaluation stage.
   *
   * If no context keys were ignored, this will be present and an empty array.
   */
  ignoredContextKeys?: string[]
}

/**
 * Run a simulation with validation
 *
 * @param simulation The simulation to run
 * @param simulationOptions Options for the simulation
 * @returns
 */
export async function runSimulation(
  simulation: Simulation,
  simulationOptions: Partial<SimulationOptions>
): Promise<SimulationResult> {
  const identityPolicyErrors: Record<string, ValidationError[]> = {}
  const identityPolicies: PolicyWithName[] = []
  simulation.identityPolicies.forEach((value) => {
    const { name, policy } = value
    const validationErrors = validateIdentityPolicy(policy)
    if (validationErrors.length == 0) {
      identityPolicies.push(loadPolicy(policy, { name }))
    } else {
      identityPolicyErrors[name] = validationErrors
    }
  })

  const serviceControlPolicyErrors: Record<string, ValidationError[]> = {}
  const serviceControlPolicies: ControlPolicies[] = simulation.serviceControlPolicies.map((scp) => {
    const ouId = scp.orgIdentifier
    const validPolicies: PolicyWithName[] = []

    scp.policies.forEach((value) => {
      const { name, policy } = value
      const validationErrors = validateServiceControlPolicy(policy)
      if (validationErrors.length > 0) {
        serviceControlPolicyErrors[name] = validationErrors
      } else {
        validPolicies.push(loadPolicy(policy, { name }))
      }
    })

    return {
      orgIdentifier: ouId,
      policies: validPolicies
    }
  })

  const resourceControlPolicyErrors: Record<string, ValidationError[]> = {}
  const resourceControlPolicies: ControlPolicies[] = simulation.resourceControlPolicies.map(
    (rcp) => {
      const ouId = rcp.orgIdentifier
      const validPolicies: PolicyWithName[] = []
      validPolicies.push(loadPolicy(DEFAULT_RCP.policy, { name: DEFAULT_RCP.name }))

      rcp.policies.forEach((value) => {
        const { name, policy } = value
        const validationErrors = validateResourceControlPolicy(policy)
        if (validationErrors.length > 0) {
          resourceControlPolicyErrors[name] = validationErrors
        } else {
          validPolicies.push(loadPolicy(policy, { name }))
        }
      })

      return {
        orgIdentifier: ouId,
        policies: validPolicies
      }
    }
  )

  const resourcePolicyErrors = simulation.resourcePolicy
    ? validateResourcePolicy(simulation.resourcePolicy)
    : []

  const permissionBoundaries: PolicyWithName[] | undefined = simulation.permissionBoundaryPolicies
    ? []
    : undefined
  const permissionBoundaryErrors: Record<string, ValidationError[]> = {}
  simulation.permissionBoundaryPolicies?.map((pb) => {
    const { name, policy } = pb
    const validationErrors = validateIdentityPolicy(policy)
    if (validationErrors.length == 0) {
      permissionBoundaries!.push(loadPolicy(policy, { name }))
    } else {
      permissionBoundaryErrors[name] = validationErrors
    }
  })

  const vpcEndpointPolicies: PolicyWithName[] | undefined = simulation.vpcEndpointPolicies
    ? []
    : undefined
  const vpcEndpointErrors: Record<string, ValidationError[]> = {}
  simulation.vpcEndpointPolicies?.map((endpointPolicy) => {
    const { name, policy } = endpointPolicy
    const validationErrors = validateEndpointPolicy(policy)
    if (validationErrors.length == 0) {
      vpcEndpointPolicies!.push(loadPolicy(policy, { name }))
    } else {
      vpcEndpointErrors[name] = validationErrors
    }
  })

  if (
    Object.keys(identityPolicyErrors).length > 0 ||
    Object.keys(serviceControlPolicyErrors).length > 0 ||
    Object.keys(resourceControlPolicyErrors).length > 0 ||
    Object.keys(permissionBoundaryErrors).length > 0 ||
    Object.keys(vpcEndpointErrors).length > 0 ||
    resourcePolicyErrors.length > 0
  ) {
    return {
      errors: {
        identityPolicyErrors,
        serviceControlPolicyErrors: serviceControlPolicyErrors,
        resourceControlPolicyErrors,
        resourcePolicyErrors,
        permissionBoundaryErrors,
        vpcEndpointErrors,
        message: 'policy.errors'
      }
    }
  }

  const resourcePolicy = simulation.resourcePolicy
    ? loadPolicy(simulation.resourcePolicy, { name: simulation.resourcePolicy.name })
    : undefined

  if (simulation.request.action.split(':').length != 2) {
    return {
      errors: {
        message: 'invalid.action'
      }
    }
  }

  const [service, action] = simulation.request.action.split(':')
  const validService = await iamServiceExists(service)
  if (!validService) {
    return {
      errors: {
        message: 'invalid.service'
      }
    }
  }
  const validAction = await iamActionExists(service, action)
  if (!validAction) {
    return {
      errors: {
        message: 'invalid.action'
      }
    }
  }

  const resourceArn = simulation.request.resource.resource
  const isWildCardOnlyAction = await isWildcardOnlyAction(service, action)
  let resourceType: string | undefined = undefined
  if (isWildCardOnlyAction) {
    if (resourceArn !== '*') {
      return {
        errors: {
          message: 'must.use.wildcard'
        }
      }
    }
  } else {
    const resourceTypes = await getResourceTypesForAction(service, action, resourceArn)
    if (resourceTypes.length === 0) {
      return {
        errors: {
          message: 'no.resource.types'
        }
      }
    } else if (resourceTypes.length > 1) {
      return {
        errors: {
          message: 'multiple.resource.types'
        }
      }
    } else {
      resourceType = resourceTypes[0].key
    }
  }

  const { validContextValues, ignoredContextKeys } = await normalizeSimulationParameters(simulation)

  const simulationMode = validSimulationModes.includes(
    simulationOptions.simulationMode as SimulationMode
  )
    ? (simulationOptions.simulationMode as SimulationMode)
    : 'Strict'

  const strictConditionKeys =
    simulationMode === 'Discovery'
      ? new Set(simulationOptions.strictConditionKeys?.map((k) => k.toLowerCase()) || [])
      : new Set<string>()

  const simulationResult = authorize({
    request: new AwsRequestImpl(
      simulation.request.principal,
      {
        resource: simulation.request.resource.resource,
        accountId: simulation.request.resource.accountId
      },
      simulation.request.action,
      new RequestContextImpl(validContextValues)
    ),
    identityPolicies,
    serviceControlPolicies,
    resourceControlPolicies,
    resourcePolicy,
    permissionBoundaries,
    vpcEndpointPolicies,
    simulationParameters: {
      simulationMode: simulationMode,
      strictConditionKeys: strictConditionKeys
    }
  })

  return {
    analysis: simulationResult,
    ignoredContextKeys,
    resourceType
  }
}

export async function normalizeSimulationParameters(simulation: Simulation): Promise<{
  validContextValues: Record<string, string | string[]>
  ignoredContextKeys: string[]
}> {
  const [service, action] = simulation.request.action.split(':')
  const resourceArn = simulation.request.resource.resource
  const contextVariablesForAction = new Set(
    await allowedContextKeysForRequest(
      service,
      action,
      resourceArn,
      !!simulation.additionalSettings?.s3?.bucketAbacEnabled
    )
  )

  //Get the types of the context variables and set a string or array of strings based on that.
  const validContextValues: Record<string, string | string[]> = {}
  const ignoredContextKeys: string[] = []
  for (const key of Object.keys(simulation.request.contextVariables)) {
    const value = simulation.request.contextVariables[key]
    const lowerCaseKey = key.toLowerCase()
    if (
      contextVariablesForAction.has(lowerCaseKey) ||
      listHasVariableKeyMatch(lowerCaseKey, contextVariablesForAction)
    ) {
      const conditionType = await typeForContextKey(lowerCaseKey)
      const normalizedKey = await normalizeContextKeyCase(key)

      if (isConditionKeyArray(conditionType)) {
        validContextValues[normalizedKey] = [value].flat()
      } else if (Array.isArray(value)) {
        validContextValues[normalizedKey] = value[0]
      } else {
        validContextValues[normalizedKey] = value
      }
    } else {
      ignoredContextKeys.push(key)
    }
  }

  return {
    validContextValues,
    ignoredContextKeys
  }
}

/**
 * Evaluates a context key with a variable such as `aws:PrincipalTag/Foo` to see
 * if it matches any of the context variables in the allowed variables set.
 *
 * @param lowerCaseKey The lower case key to check for a match.
 * @param contextVariables The set of context variables to check against.
 * @returns True if the key has a variable match, false otherwise.
 */
function listHasVariableKeyMatch(lowerCaseKey: string, contextVariables: Set<string>): boolean {
  const firstSlashIndex = lowerCaseKey.indexOf('/')
  if (firstSlashIndex === -1) {
    return false
  }

  const prefix = lowerCaseKey.slice(0, firstSlashIndex + 1)
  for (const variable of contextVariables) {
    if (variable.startsWith(prefix)) {
      return true
    }
  }

  return false
}

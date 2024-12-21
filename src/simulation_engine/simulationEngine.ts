import { iamActionExists, iamServiceExists } from "@cloud-copilot/iam-data";
import { loadPolicy, Policy, validateIdentityPolicy, validateResourcePolicy, validateServiceControlPolicy, ValidationError } from "@cloud-copilot/iam-policy";
import { isConditionKeyArray } from "../context_keys/contextKeyTypes.js";
import { normalizeContextKeyCase, typeForContextKey } from "../context_keys/contextKeys.js";
import { authorize, ServiceControlPolicies } from "../core_engine/coreSimulatorEngine.js";
import { RequestAnalysis } from "../evaluate.js";
import { AwsRequestImpl } from "../request/request.js";
import { RequestContextImpl } from "../requestContext.js";
import { getResourceTypesForAction, isWildcardOnlyAction } from "../util.js";
import { allowedContextKeysForRequest } from "./contextKeys.js";
import { Simulation } from "./simulation.js";
import { SimulationOptions } from "./simulationOptions.js";

export interface SimulationErrors {
  identityPolicyErrors?: Record<string, ValidationError[]>;
  seviceControlPolicyErrors?: Record<string, ValidationError[]>;
  resourcePolicyErrors?: ValidationError[];
  message: string;
}

export interface SimulationResult {
  errors?: SimulationErrors;
  analysis?: RequestAnalysis
}

/**
 * Run a simulation with validation
 *
 * @param simulation The simulation to run
 * @param simulationOptions Options for the simulation
 * @returns
 */
export async function runSimulation(simulation: Simulation, simulationOptions: Partial<SimulationOptions>): Promise<SimulationResult> {
  const identityPolicyErrors: Record<string, ValidationError[]> = {};
  const identityPolicies: Policy[] = [];
  simulation.identityPolicies.forEach((value) => {
    const {name, policy} = value;
    const validationErrors = validateIdentityPolicy(policy);
    if(validationErrors.length == 0) {
      identityPolicies.push(loadPolicy(policy));
    } else {
      identityPolicyErrors[name] = validationErrors;
    }
  })

  const seviceControlPolicyErrors: Record<string, ValidationError[]> = {};
  const serviceControlPolicies: ServiceControlPolicies[] = simulation.serviceControlPolicies.map((scp) => {
    const ouId = scp.orgIdentifier;
    const validPolicies: Policy[] = [];

    scp.policies.forEach((value) => {
      const {name, policy} = value;
      const validationErrors = validateServiceControlPolicy(policy);
      if(validationErrors.length > 0) {
        seviceControlPolicyErrors[name] = validationErrors;
      } else {
        validPolicies.push(loadPolicy(policy));
      }
    })

    return {
      orgIdentifier: ouId,
      policies: validPolicies
    }
  })

  const resourcePolicyErrors = simulation.resourcePolicy ? validateResourcePolicy(simulation.resourcePolicy) : [];

  const permissionBoundaries: Policy[] | undefined = simulation.permissionBoundaryPolicies ? [] : undefined;
  const permissionBoundaryErrors: Record<string, ValidationError[]> = {};
  simulation.permissionBoundaryPolicies?.map((pb) => {
    const {name, policy} = pb;
    const validationErrors = validateIdentityPolicy(policy);
    if(validationErrors.length == 0) {
      permissionBoundaries!.push(loadPolicy(policy));
    } else {
      permissionBoundaryErrors[name] = validationErrors;
    }
  })

  if(Object.keys(identityPolicyErrors).length > 0 ||
     Object.keys(seviceControlPolicyErrors).length > 0 ||
     Object.keys(permissionBoundaryErrors).length > 0 ||
     resourcePolicyErrors.length > 0) {
    return {
      errors: {
        identityPolicyErrors,
        seviceControlPolicyErrors,
        resourcePolicyErrors,
        message: 'policy.errors'
      }
    }
  }

  const resourcePolicy = simulation.resourcePolicy ? loadPolicy(simulation.resourcePolicy) : undefined;

  if(simulation.request.action.split(":").length != 2) {
    return {
      errors: {
        message: 'invalid.action'
      }
    }
  }

  const [service, action] = simulation.request.action.split(":");
  const validService = await iamServiceExists(service);
  if(!validService) {
    return {
      errors: {
        message: 'invalid.service'
      }
    }
  }
  const validAction = await iamActionExists(service, action);
  if(!validAction) {
    return {
      errors: {
        message: 'invalid.action'
      }
    }
  }

  const resourceArn = simulation.request.resource.resource;
  const isWildCardOnlyAction = await isWildcardOnlyAction(service, action);
  if(isWildCardOnlyAction) {
    if(resourceArn !== "*") {
      return {
        errors: {
          message: 'must.use.wildcard'
        }
      }
    }
  } else {
    const resourceTypes = await getResourceTypesForAction(service, action, resourceArn);
    if(resourceTypes.length === 0) {
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
    }
  }

  const contextValues = await normalizeSimulationParameters(simulation);

  const simulationResult = authorize({
    request: new AwsRequestImpl(
      simulation.request.principal,
      {
        resource: simulation.request.resource.resource,
        accountId: simulation.request.resource.accountId
      },
      simulation.request.action,
      new RequestContextImpl(contextValues)
    ),
    identityPolicies,
    serviceControlPolicies,
    resourcePolicy,
    permissionBoundaries
  })

  return {
    analysis: simulationResult
  }
}

export async function normalizeSimulationParameters(simulation: Simulation): Promise<Record<string, string | string[]>> {
  const [service, action] = simulation.request.action.split(":");
  const resourceArn = simulation.request.resource.resource;
  const contextVariablesForAction = new Set(await allowedContextKeysForRequest(service, action, resourceArn))

  //Get the types of the context variables and set a string or array of strings based on that.
  const allowedContextKeys: Record<string, string | string[]> = {};
  for (const key of Object.keys(simulation.request.contextVariables)) {
    const value = simulation.request.contextVariables[key];
    const lowerCaseKey = key.toLowerCase();
    if (contextVariablesForAction.has(lowerCaseKey) || listHasVariableKeyMatch(lowerCaseKey, contextVariablesForAction)) {

      const conditionType = await typeForContextKey(lowerCaseKey);
      const normalizedKey = await normalizeContextKeyCase(key);

      if(isConditionKeyArray(conditionType)) {
        allowedContextKeys[normalizedKey] = [value].flat();
      } else if(Array.isArray(value)) {
        allowedContextKeys[normalizedKey] = value[0];
      } else {
        allowedContextKeys[normalizedKey] = value;
      }
    }
  }

  return allowedContextKeys
}

function listHasVariableKeyMatch(lowerCaseKey: string, contextVariables: Set<string>): boolean {
  const firstSlashIndex = lowerCaseKey.indexOf("/");
  if(firstSlashIndex === -1) {
    return false;
  }

  const prefix = lowerCaseKey.slice(0, firstSlashIndex + 1);
  for(const variable of contextVariables) {
    if(variable.startsWith(prefix)) {
      return true;
    }
  }

  return false
}
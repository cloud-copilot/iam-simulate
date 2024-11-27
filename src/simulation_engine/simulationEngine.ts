import { iamActionExists, iamServiceExists } from "@cloud-copilot/iam-data";
import { loadPolicy, Policy, validateIdentityPolicy, validateResourcePolicy, validateServiceControlPolicy, ValidationError } from "@cloud-copilot/iam-policy";
import { isConditionKeyArray } from "../ConditionKeys.js";
import { authorize, ServiceControlPolicies } from "../core_engine/coreSimulatorEngine.js";
import { EvaluationResult } from "../evaluate.js";
import { AwsRequestImpl } from "../request/request.js";
import { RequestContextImpl } from "../requestContext.js";
import { getResourceTypesForAction, isWildcardOnlyAction, normalizeContextKeyCase, typeForContextKey } from "../util.js";
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
  result?: {
    evaluationResult: EvaluationResult
  }
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
  const identityPolicies = Object.keys(simulation.identityPolicies).reduce((acc, key) => {
    const rawPolicy = simulation.identityPolicies[key as any];
    const validationErrors = validateIdentityPolicy(rawPolicy);
    if(validationErrors.length == 0) {
      acc[key] = loadPolicy(rawPolicy);
    } else {
      identityPolicyErrors[key] = validationErrors;
    }
    return acc;
  }, {} as Record<string, Policy>);

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
        validPolicies.push(policy);
      }
    })

    return {
      orgIdentifier: ouId,
      policies: validPolicies
    }
  })

  const resourcePolicyErrors = simulation.resourcePolicy ? validateResourcePolicy(simulation.resourcePolicy) : [];

  if(Object.keys(identityPolicyErrors).length > 0 ||
     Object.keys(seviceControlPolicyErrors).length > 0 ||
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
    identityPolicies: Object.values(identityPolicies),
    serviceControlPolicies,
    resourcePolicy
  })

  return {
    result: {
      evaluationResult: simulationResult
    }
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
    if (contextVariablesForAction.has(lowerCaseKey)) {

      const conditionType = await typeForContextKey(lowerCaseKey);
      const normalizedKey = await normalizeContextKeyCase(lowerCaseKey);

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
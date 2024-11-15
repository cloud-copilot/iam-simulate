import { iamActionExists, iamServiceExists } from "@cloud-copilot/iam-data";
import { validatePolicySyntax, ValidationError } from "@cloud-copilot/iam-policy";
import { allowedContextKeysForRequest } from "./contextKeys.js";
import { Simulation } from "./simulation.js";
import { SimulationOptions } from "./simulationOptions.js";

export interface SimulationErrors {
  identityPolicyErrors?: Record<string, ValidationError[]>;
  message: string;
}

export interface SimulationResult {

}

export async function runSimulation(simulation: Simulation, simulationOptions: Partial<SimulationOptions>): Promise<SimulationResult> {
  const identityPolicyErrors = Object.keys(simulation.identityPolicies).reduce((acc, key: string) => {
    acc[key] == validatePolicySyntax(simulation.identityPolicies[key as any]);
    return acc
  }, {} as Record<string, ValidationError[]>);

  const errorCount = Object.values(identityPolicyErrors).flat().length;
  if(errorCount > 0) {
    return {
      identityPolicyErrors
    }
  }

  if(simulation.request.action.split(":").length != 2) {
    return {
      message: 'invalid.action'
    }
  }

  const [service, action] = simulation.request.action.split(":");
  const validService = await iamServiceExists(service);
  if(!validService) {
    return {
      message: 'invalid.service'
    }
  }
  const validAction = await iamActionExists(service, action);
  if(!validAction) {
    return {
      message: 'invalid.action'
    }
  }

  const resourceArn = simulation.request.resource.resource;
  //TODO: Look up the resource types for the action and validate that the resource matches one of them. This will catch if the user asks for an action/resource combination that doesn't make any sense

  const contextVariablesForAction = new Set(await allowedContextKeysForRequest(service, action, resourceArn))

  // We need to get the types of the context variables and set a string or array of strings based on that.
  const allowedContextKeys: Record<string, string | string[]> = {};
  for (const key of Object.keys(simulation.request.contextVariables)) {
    if (contextVariablesForAction.has(key)) {
      allowedContextKeys[key] = simulation.request.contextVariables[key];
    }
  }

  // Implementation goes here
  return {} as SimulationResult;
}

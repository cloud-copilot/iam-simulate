import { iamActionExists, iamServiceExists } from "@cloud-copilot/iam-data";
import { validatePolicySyntax, ValidationError } from "@cloud-copilot/iam-policy";
import { Simulation } from "./simulation.js";
import { SimulationOptions } from "./simulationOptions.js";

export interface SimulationErrors {
  identityPolicyErrors?: Record<string, ValidationError[]>;
  message: string;
}

export interface SimulationResult {

}

export async function runSimulation(simulation: Simulation, simulationOptions: SimulationOptions): Promise<SimulationResult> {
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

  // Implementation goes here
  return {} as SimulationResult;
}

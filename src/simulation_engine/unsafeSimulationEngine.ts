import { loadPolicy } from "@cloud-copilot/iam-policy";
import { authorize } from "../core_engine/coreSimulatorEngine.js";
import { type EvaluationResult } from "../evaluate.js";
import { AwsRequestImpl } from "../request/request.js";
import { RequestContextImpl } from "../requestContext.js";
import { Simulation } from "./simulation.js";
import { SimulationOptions } from "./simulationOptions.js";

/**
 * Runs a simulation without input validation or context error verification.
 * Use this if you know what you're doing.
 *
 * @param simulation The simulation to run.
 * @param simulationOptions Options for the simulation.
 * @returns The result of the simulation.
 */
export function runUnsafeSimulation(simulation: Simulation, simulationOptions: Partial<SimulationOptions>): EvaluationResult {
    // Implementation goes here
  const identityPolicies = Object.values(simulation.identityPolicies).map(p => loadPolicy(p));
  const requestContext = new RequestContextImpl(simulation.request.contextVariables)
  const request = new AwsRequestImpl(simulation.request.principal, {
    resource: simulation.request.resource.resource,
    accountId: simulation.request.resource.accountId,
  }, simulation.request.action, requestContext);

  return authorize({
    request,
    identityPolicies
  });
}
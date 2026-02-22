import { type SimulationParameters } from '../core_engine/CoreSimulatorEngine.js'
import {
  type IdentityAnalysis,
  type RcpAnalysis,
  type RequestAnalysis,
  type ResourceAnalysis,
  type ScpAnalysis
} from '../evaluate.js'
import { type AwsRequest } from '../request/request.js'

export interface ServiceAuthorizationRequest {
  request: AwsRequest
  sessionAnalysis: IdentityAnalysis | undefined
  identityAnalysis: IdentityAnalysis
  scpAnalysis: ScpAnalysis
  resourceAnalysis: ResourceAnalysis
  rcpAnalysis: RcpAnalysis
  permissionBoundaryAnalysis: IdentityAnalysis | undefined
  endpointAnalysis: IdentityAnalysis | undefined
  simulationParameters: SimulationParameters
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): RequestAnalysis
}

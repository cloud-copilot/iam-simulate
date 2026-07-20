import {
  type PolicyWithName,
  type SimulationParameters
} from '../core_engine/CoreSimulatorEngine.js'
import {
  type IdentityAnalysis,
  type RcpAnalysis,
  type RequestAnalysis,
  type ResourceAnalysis,
  type ScpAnalysis
} from '../evaluate.js'
import { type AwsRequest } from '../request/request.js'
import { type S3ServiceSettings } from './s3/s3BlockPublicAccess.js'

export interface ServiceSettings {
  /**
   * S3-specific service settings.
   */
  s3?: S3ServiceSettings
}

export interface ServiceAuthorizationRequest {
  request: AwsRequest
  sessionAnalysis: IdentityAnalysis | undefined
  identityAnalysis: IdentityAnalysis
  scpAnalysis: ScpAnalysis
  resourceAnalysis: ResourceAnalysis
  resourcePolicy: PolicyWithName | undefined
  rcpAnalysis: RcpAnalysis
  permissionBoundaryAnalysis: IdentityAnalysis | undefined
  endpointAnalysis: IdentityAnalysis | undefined
  simulationParameters: SimulationParameters
  serviceSettings?: ServiceSettings
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): RequestAnalysis
}

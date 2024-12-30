import {
  IdentityAnalysis,
  RcpAnalysis,
  RequestAnalysis,
  ResourceAnalysis,
  ScpAnalysis
} from '../evaluate.js'
import { AwsRequest } from '../request/request.js'

export interface ServiceAuthorizationRequest {
  request: AwsRequest
  identityAnalysis: IdentityAnalysis
  scpAnalysis: ScpAnalysis
  resourceAnalysis: ResourceAnalysis
  rcpAnalysis: RcpAnalysis
  permissionBoundaryAnalysis: IdentityAnalysis | undefined
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): RequestAnalysis
}

import { IdentityAnalysis, RequestAnalysis, ResourceAnalysis, ScpAnalysis } from "../evaluate.js";
import { AwsRequest } from "../request/request.js";

export interface ServiceAuthorizationRequest {
  request: AwsRequest;
  identityAnalysis: IdentityAnalysis;
  scpAnalysis: ScpAnalysis;
  resourceAnalysis: ResourceAnalysis;
  permissionBoundaryAnalysis: IdentityAnalysis | undefined;
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): RequestAnalysis
}
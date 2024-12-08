import { RequestAnalysis, ResourceAnalysis, ScpAnalysis } from "../evaluate.js";
import { AwsRequest } from "../request/request.js";
import { StatementAnalysis } from "../StatementAnalysis.js";

export interface ServiceAuthorizationRequest {
  request: AwsRequest;
  identityStatements: StatementAnalysis[];
  scpAnalysis: ScpAnalysis;
  resourceAnalysis: ResourceAnalysis;
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): RequestAnalysis
}
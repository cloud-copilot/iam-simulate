import { RequestAnalysis } from "../evaluate.js";
import { AwsRequest } from "../request/request.js";
import { SCPAnalysis } from "../SCPAnalysis.js";
import { StatementAnalysis } from "../StatementAnalysis.js";

export interface ServiceAuthorizationRequest {
  request: AwsRequest;
  identityStatements: StatementAnalysis[];
  scpAnalysis: SCPAnalysis[];
  resourceAnalysis: StatementAnalysis[];
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): RequestAnalysis
}
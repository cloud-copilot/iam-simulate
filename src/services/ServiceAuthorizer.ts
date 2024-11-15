import { EvaluationResult } from "../evaluate.js";
import { AwsRequest } from "../request/request.js";
import { SCPAnalysis } from "../SCPAnalysis.js";
import { StatementAnalysis } from "../StatementAnalysis.js";

export interface ServiceAuthorizationRequest {
  request: AwsRequest;
  identityStatements: StatementAnalysis[];
  scpAnalysis: SCPAnalysis[]
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): EvaluationResult
}
import { EvaluationResult } from "../evaluate.js";
import { AwsRequest } from "../request/request.js";
import { StatementAnalysis } from "../StatementAnalysis.js";

export interface ServiceAuthorizationRequest {
  request: AwsRequest;
  identityStatements: StatementAnalysis[];
}

export interface ServiceAuthorizer {
  authorize(request: ServiceAuthorizationRequest): EvaluationResult
}
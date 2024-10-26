import { Policy } from "@cloud-copilot/iam-policy";
import { requestMatchesStatementActions } from "../action/action.js";
import { requestMatchesConditions } from "../condition/condition.js";
import { EvaluationResult } from "../evaluate.js";
import { AwsRequest } from "../request/request.js";
import { requestMatchesStatementResources } from "../resource/resource.js";
import { DefaultServiceAuthorizer } from "../services/DefaultServiceAuthorizer.js";
import { ServiceAuthorizer } from "../services/ServiceAuthorizer.js";
import { StatementAnalysis } from "../StatementAnalysis.js";

/**
 * A reqest to authorize a service action.
 */
export interface AuthorizationRequest {
  /**
   * The request to authorize.
   */
  request: AwsRequest;

  /**
   * The identity policies that are applicable to the principal making the request.
   */
  identityPolicies: Policy[]
}

const serviceEngines: Record<string, new () => ServiceAuthorizer> = {};

/**
 * Authorizes a request.
 *
 * This assumes all policies have been validated and the request is fully complete and valid.
 *
 * @param request the request to authorize
 * @returns the result of the authorization
 */
export function authorize(request: AuthorizationRequest): EvaluationResult {
  const identityAnalysis = analyzeIdentityPolicies(request.identityPolicies, request.request);
  const serviceAuthorizer = getServiceAuthorizer(request);
  return serviceAuthorizer.authorize({
    request: request.request,
    identityStatements: identityAnalysis,
  });
}

/**
 * Get the appropriate service authorizer for the request. Some services have specific authorization logic in
 * them. If there is no service specific authorizer, a default one will be used.
 *
 * @param request the request to get the authorizer for
 * @returns the service authorizer for the request
 */
export function getServiceAuthorizer(request: AuthorizationRequest): ServiceAuthorizer {
  const serviceName = request.request.action.service().toLowerCase();
  return new serviceEngines[serviceName] || new DefaultServiceAuthorizer;
}

/**
 * Analyzes a set of identity policies
 *
 * @param identityPolicies the identity policies to analyze
 * @param request the request to analyze against
 * @returns an array of statement analysis results
 */
export function analyzeIdentityPolicies(identityPolicies: Policy[], request: AwsRequest): StatementAnalysis[] {
  const analysis: StatementAnalysis[] = [];
  for(const policy of identityPolicies) {
    for(const statement of policy.statements()) {

      analysis.push({
        statement,
        resourceMatch: requestMatchesStatementResources(request, statement),
        actionMatch: requestMatchesStatementActions(request, statement),
        conditionMatch: requestMatchesConditions(request, statement.conditions()),
        principalMatch: 'Match',
      });
    }
  }

  return analysis;
}
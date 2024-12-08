import { AnnotatedPolicy, Policy } from "@cloud-copilot/iam-policy";
import { requestMatchesStatementActions } from "../action/action.js";
import { requestMatchesConditions } from "../condition/condition.js";
import { RequestAnalysis } from "../evaluate.js";
import { requestMatchesStatementPrincipals } from "../principal/principal.js";
import { AwsRequest } from "../request/request.js";
import { requestMatchesStatementResources } from "../resource/resource.js";
import { SCPAnalysis } from "../SCPAnalysis.js";
import { DefaultServiceAuthorizer } from "../services/DefaultServiceAuthorizer.js";
import { ServiceAuthorizer } from "../services/ServiceAuthorizer.js";
import { StatementAnalysis } from "../StatementAnalysis.js";

/**
 * A set of service control policies for each level of an organization tree
 */
export interface ServiceControlPolicies {
  /**
   * The organization identifier for the organizational unit these policies apply to.
   */
  orgIdentifier: string;

  /**
   * The policies that apply to this organizational unit.
   */
  policies: AnnotatedPolicy[];
}

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
  identityPolicies: AnnotatedPolicy[]

  /**
   * The service control policies that apply to the principal making the request. In
   * order of the orgnaization hierarchy. So the root ou SCPS should be first.
   */
  serviceControlPolicies: ServiceControlPolicies[]

  /**
   * The resource policy that applies to the resource being accessed.
   */
  resourcePolicy: AnnotatedPolicy | undefined;
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
export function authorize(request: AuthorizationRequest): RequestAnalysis {
  const identityAnalysis = analyzeIdentityPolicies(request.identityPolicies, request.request);
  const scpAnalysis = analyzeServiceControlPolicies(request.serviceControlPolicies, request.request);
  const serviceAuthorizer = getServiceAuthorizer(request);
  const resourceAnalysis = request.resourcePolicy ? analyzeResourcePolicy(request.resourcePolicy, request.request) : [];

  return serviceAuthorizer.authorize({
    request: request.request,
    identityStatements: identityAnalysis,
    scpAnalysis,
    resourceAnalysis
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
  if(serviceEngines[serviceName]) {
    return new serviceEngines[serviceName]();
  }
  return new DefaultServiceAuthorizer;
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

/**
 * Analyzes a set of service control policies and the statements within them.
 *
 * @param serviceControlPolicies the service control policies to analyze
 * @param request the request to analyze against
 * @returns an array of SCP analysis results
 */
export function analyzeServiceControlPolicies(serviceControlPolicies: ServiceControlPolicies[], request: AwsRequest): SCPAnalysis[] {
  const analysis: SCPAnalysis[] = [];
  for(const controlPolicy of serviceControlPolicies) {
    const ouAnalysis: SCPAnalysis = {
      orgIdentifier: controlPolicy.orgIdentifier,
      statementAnalysis: [],
    }
    for(const policy of controlPolicy.policies) {
      for(const statement of policy.statements()) {
        ouAnalysis.statementAnalysis.push({
          statement,
          resourceMatch: requestMatchesStatementResources(request, statement),
          actionMatch: requestMatchesStatementActions(request, statement),
          conditionMatch: requestMatchesConditions(request, statement.conditions()),
          principalMatch: 'Match',
        });
      }
    }
    analysis.push(ouAnalysis);
  }

  return analysis;
}

/**
 * Analyze a resource policy and return the results
 *
 * @param resourcePolicy the resource policy to analyze
 * @param request the request to analyze against
 * @returns an array of statement analysis results
 */
export function analyzeResourcePolicy(resourcePolicy: Policy, request: AwsRequest): StatementAnalysis[] {
  const analysis: StatementAnalysis[] = [];
  for(const statement of resourcePolicy.statements()) {
    analysis.push({
      statement,
      resourceMatch: requestMatchesStatementResources(request, statement),
      actionMatch: requestMatchesStatementActions(request, statement),
      conditionMatch: requestMatchesConditions(request, statement.conditions()),
      principalMatch: requestMatchesStatementPrincipals(request, statement),
    });
  }

  return analysis;
}
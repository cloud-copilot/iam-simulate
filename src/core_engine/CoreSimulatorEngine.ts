import { Policy, Statement } from "@cloud-copilot/iam-policy";
import { requestMatchesStatementActions } from "../action/action.js";
import { requestMatchesConditions } from "../condition/condition.js";
import { EvaluationResult, IdentityAnalysis, OuScpAnalysis, RequestAnalysis, ResourceAnalysis, ScpAnalysis } from "../evaluate.js";
import { StatementExplain } from "../explain/statementExplain.js";
import { PrincipalMatchResult, requestMatchesStatementPrincipals } from "../principal/principal.js";
import { AwsRequest } from "../request/request.js";
import { requestMatchesStatementResources } from "../resource/resource.js";
import { DefaultServiceAuthorizer } from "../services/DefaultServiceAuthorizer.js";
import { ServiceAuthorizer } from "../services/ServiceAuthorizer.js";
import { identityStatementAllows, identityStatementExplicitDeny, StatementAnalysis, statementMatches } from "../StatementAnalysis.js";

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
  policies: Policy[];
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
  identityPolicies: Policy[]

  /**
   * The service control policies that apply to the principal making the request. In
   * order of the orgnaization hierarchy. So the root ou SCPS should be first.
   */
  serviceControlPolicies: ServiceControlPolicies[]

  /**
   * The resource policy that applies to the resource being accessed.
   */
  resourcePolicy: Policy | undefined;

  /**
   * The permission boundaries that apply to the principal making the request.
   */
  permissionBoundaries: Policy[] | undefined;
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
  const permissionBoundaryAnalysis = analyzePermissionBoundaryPolicies(request.permissionBoundaries, request.request);
  const scpAnalysis = analyzeServiceControlPolicies(request.serviceControlPolicies, request.request);
  const resourceAnalysis = analyzeResourcePolicy(request.resourcePolicy, request.request);

  const serviceAuthorizer = getServiceAuthorizer(request);
  return serviceAuthorizer.authorize({
    request: request.request,
    identityAnalysis,
    scpAnalysis,
    resourceAnalysis,
    permissionBoundaryAnalysis
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
export function analyzeIdentityPolicies(identityPolicies: Policy[], request: AwsRequest): IdentityAnalysis {

  const identityAnalysis: IdentityAnalysis = {
    result: 'ImplicitlyDenied',
    allowStatements: [],
    denyStatements: [],
    unmatchedStatements: [],
  }

  for(const policy of identityPolicies) {
    for(const statement of policy.statements()) {
      const {matches: resourceMatch, details: resourceDetails} = requestMatchesStatementResources(request, statement);
      const {matches: actionMatch, details: actionDetails} = requestMatchesStatementActions(request, statement);
      const {matches: conditionMatch, details: conditionDetails} = requestMatchesConditions(request, statement.conditions());
      const principalMatch: PrincipalMatchResult = 'Match';
      const overallMatch = statementMatches({actionMatch, conditionMatch, principalMatch, resourceMatch});
      const statementAnalysis: StatementAnalysis = {
        statement,
        resourceMatch,
        actionMatch,
        conditionMatch,
        principalMatch,
        explain: makeStatementExplain(statement, overallMatch, {...resourceDetails, ...actionDetails, ...conditionDetails})
      }

      if(identityStatementExplicitDeny(statementAnalysis)) {
        identityAnalysis.denyStatements.push(statementAnalysis);
      } else if(identityStatementAllows(statementAnalysis)) {
        identityAnalysis.allowStatements.push(statementAnalysis);
      } else {
        identityAnalysis.unmatchedStatements.push(statementAnalysis);
      }
    }
  }

  if(identityAnalysis.denyStatements.length > 0) {
    identityAnalysis.result = 'ExplicitlyDenied'
  } else if(identityAnalysis.allowStatements.length > 0) {
    identityAnalysis.result = 'Allowed'
  }

  return identityAnalysis;
}

/**
 * Analyzes a set of service control policies and the statements within them.
 *
 * @param serviceControlPolicies the service control policies to analyze
 * @param request the request to analyze against
 * @returns an array of SCP analysis results
 */
export function analyzeServiceControlPolicies(serviceControlPolicies: ServiceControlPolicies[], request: AwsRequest): ScpAnalysis {
  const analysis: OuScpAnalysis[] = [];
  for(const controlPolicy of serviceControlPolicies) {
    const ouAnalysis: OuScpAnalysis = {
      orgIdentifier: controlPolicy.orgIdentifier,
      result: 'ImplicitlyDenied',
      allowStatements: [],
      denyStatements: [],
      unmatchedStatements: [],
    }
    for(const policy of controlPolicy.policies) {
      for(const statement of policy.statements()) {
        const {matches: resourceMatch, details: resourceDetails} = requestMatchesStatementResources(request, statement);
        const {matches: actionMatch, details: actionDetails} = requestMatchesStatementActions(request, statement);
        const {matches: conditionMatch, details: conditionDetails} = requestMatchesConditions(request, statement.conditions());
        const principalMatch: PrincipalMatchResult = 'Match'
        const overallMatch = statementMatches({actionMatch, conditionMatch, principalMatch, resourceMatch});
        const statementAnalysis: StatementAnalysis = {
          statement,
          resourceMatch,
          actionMatch,
          conditionMatch,
          principalMatch,
          explain: makeStatementExplain(statement, overallMatch, {...resourceDetails, ...actionDetails, ...conditionDetails})
        }

        if(identityStatementAllows(statementAnalysis)) {
          ouAnalysis.allowStatements.push(statementAnalysis);
        } else if (identityStatementExplicitDeny(statementAnalysis)) {
          ouAnalysis.denyStatements.push(statementAnalysis);
        } else {
          ouAnalysis.unmatchedStatements.push(statementAnalysis);
        }
      }
    }

    if(ouAnalysis.denyStatements.length > 0) {
      ouAnalysis.result = 'ExplicitlyDenied'
    } else if(ouAnalysis.allowStatements.length > 0) {
      ouAnalysis.result = 'Allowed'
    }
    analysis.push(ouAnalysis);
  }

  let overallResult: EvaluationResult = 'ImplicitlyDenied'
  if(analysis.some(ou => ou.result === 'ExplicitlyDenied')) {
    overallResult = 'ExplicitlyDenied'
  } else if(analysis.some(ou => ou.allowStatements.length === 0)) {
    overallResult = 'ImplicitlyDenied'
  } else if (analysis.every(ou => ou.result === 'Allowed')) {
    overallResult = 'Allowed'
  }

  return {
    result: overallResult,
    ouAnalysis: analysis
  }
}

/**
 * Analyze a resource policy and return the results
 *
 * @param resourcePolicy the resource policy to analyze
 * @param request the request to analyze against
 * @returns an array of statement analysis results
 */
export function analyzeResourcePolicy(resourcePolicy: Policy | undefined, request: AwsRequest): ResourceAnalysis {
  const resourceAnalysis: ResourceAnalysis = {
    result: 'NotApplicable',
    allowStatements: [],
    denyStatements: [],
    unmatchedStatements: [],
  }

  if(!resourcePolicy) {
    return resourceAnalysis;
  }

  const principalMatchOptions: PrincipalMatchResult[] = ['Match', 'SessionRoleMatch', 'SessionUserMatch'];

  for(const statement of resourcePolicy.statements()) {
    const {matches: resourceMatch, details: resourceDetails} = requestMatchesStatementResources(request, statement);
    const {matches: actionMatch, details: actionDetails} = requestMatchesStatementActions(request, statement);
    const {matches: principalMatch, details: principalDetails} = requestMatchesStatementPrincipals(request, statement);
    const {matches: conditionMatch, details: conditionDetails} = requestMatchesConditions(request, statement.conditions());
    const overallMatch = statementMatches({actionMatch, conditionMatch, principalMatch, resourceMatch});
    const analysis: StatementAnalysis = {
      statement,
      resourceMatch: resourceMatch,
      actionMatch,
      conditionMatch,
      principalMatch,
      explain: makeStatementExplain(statement, overallMatch, {...resourceDetails, ...actionDetails, ...principalDetails, ...conditionDetails})
    }
    if(identityStatementExplicitDeny(analysis) && analysis.principalMatch !== 'NoMatch') {
      resourceAnalysis.denyStatements.push(analysis);
    } else if(identityStatementAllows(analysis) && analysis.principalMatch !== 'NoMatch') {
      resourceAnalysis.allowStatements.push(analysis);
    } else {
      resourceAnalysis.unmatchedStatements.push(analysis);
    }
  }

  if(resourceAnalysis.denyStatements.some(s => principalMatchOptions.includes(s.principalMatch))) {
    resourceAnalysis.result = 'ExplicitlyDenied'
  } else if(resourceAnalysis.denyStatements.some(s => s.principalMatch === 'AccountLevelMatch')) {
    resourceAnalysis.result = 'DeniedForAccount'
  } else if(resourceAnalysis.allowStatements.some(s => principalMatchOptions.includes(s.principalMatch))) {
    resourceAnalysis.result = 'Allowed'
  } else if(resourceAnalysis.allowStatements.some(s => s.principalMatch === 'AccountLevelMatch')) {
    resourceAnalysis.result = 'AllowedForAccount'
  } else {
    resourceAnalysis.result = 'NotApplicable'
  }

  return resourceAnalysis;
}


export function analyzePermissionBoundaryPolicies(permissionBoundaries: Policy[] | undefined, request: AwsRequest): IdentityAnalysis | undefined {
  if(!permissionBoundaries) {
    return undefined
  }

  return analyzeIdentityPolicies(permissionBoundaries, request);
}


function makeStatementExplain(statement: Statement, overallMatch: boolean, details: Partial<StatementExplain>): StatementExplain {
  return {
    effect: statement.effect(),
    identifier: statement.sid() || statement.index().toString(),
    matches: overallMatch,
    ...details
  }
}
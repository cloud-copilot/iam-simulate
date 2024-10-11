import { RequestContext } from "../requestContext.js";
import { RequestAction, RequestActionImpl } from "./requestAction.js";
import { RequestPrincipal, RequestPrincipalImpl } from "./requestPrincipal.js";
import { RequestResource, ResourceRequestImpl } from "./requestResource.js";

/**
 * A request to be evaluated by the policy engine
 */
export interface Request {
  principal: RequestPrincipal;

  /**
   * The action to be performed
   */
  action: RequestAction;

  /**
   * The resource to be acted upon
   */
  resource?: RequestResource;

  /**
   * The context of the request
   */
  context: RequestContext
}

export class RequestImpl implements Request {

  constructor(public readonly principalString: string,
              public readonly resourceString: string | undefined,
              public readonly actionString: string,
              public readonly context: RequestContext) {

  }

  get action(): RequestAction {
    return new RequestActionImpl(this.actionString);
  }

  get resource(): RequestResource {
    if(this.resourceString === undefined) {
      throw new Error('Resource is undefined')
    }
    return new ResourceRequestImpl(this.resourceString);
  }

  get principal(): RequestPrincipal {
    return new RequestPrincipalImpl(this.principalString);
  }
}
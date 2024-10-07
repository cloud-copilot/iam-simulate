export interface RequestContext {

  /**
   * Check if a context key exists in a request
   * @param name the name of the context key to check for, case insensitive
   * @returns true if the context key exists, false otherwise
   */
  contextKeyExists: (name: string) => boolean;

  /**
   * Get the value of a context key in a request
   *
   * @param name the name of the context key to get the value of, case insensitive
   * @returns the value of the context key
   */
  contextKeyValue: (name: string) => ContextKey;
}

export interface ContextKey {
  name: string;
  isStringValue(): this is StringContextKey;
  isArrayValue(): this is ArrayContextKey;
}

export interface StringContextKey extends ContextKey {
  value: string;
}

export interface ArrayContextKey extends ContextKey {
  values: string[];
}

export class RequestContextImpl implements RequestContext {
  private context: Map<string, ContextKey> = new Map();

  constructor(values: Record<string, string | string[]>) {
    for(const key in values) {
      this.context.set(key.toLowerCase(), new ContextKeyImpl(key, values[key]));
    }
  }


  public contextKeyExists(name: string): boolean {
    return this.context.has(name.toLowerCase());
  }

  public contextKeyValue(name: string): ContextKey {
    return this.context.get(name.toLowerCase()) as ContextKey;

  }
}

export class ContextKeyImpl implements ContextKey, StringContextKey, ArrayContextKey {
  constructor(public name: string, private _val: string | string[]) {}

  isStringValue(): this is StringContextKey {
    return typeof this._val === 'string';
  }
  isArrayValue(): this is ArrayContextKey {
    return Array.isArray(this._val);
  }

  get values(): string[] {
    if(Array.isArray(this._val)) {
      return this._val;
    }
    throw new Error(`ContextKey ${this.name} is not an array`);
  }

  get value(): string {
    if(typeof this._val === 'string') {
      return this._val;
    }
    throw new Error(`ContextKey ${this.name} is not a string`);
  }
}
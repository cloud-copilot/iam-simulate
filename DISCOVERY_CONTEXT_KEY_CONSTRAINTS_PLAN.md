# Discovery Context Key Constraints Plan

## Problem

`iam-simulate` Discovery mode currently has one context-key control: `strictConditionKeys`.

That works for two states:

1. The key/value is authoritative in Discovery, so a mismatch must remain a mismatch.
2. The key/value is not authoritative in Discovery, so a mismatch can be ignored and surfaced as an ignored condition.

It does **not** model the state needed by iam-lens service-principal requests:

> The context key is definitely present, but its value is not known.

For service principals, keys such as `aws:SourceAccount`, `aws:SourceOwner`, `aws:SourceOrgID`, and `aws:SourceOrgPaths` are present on the request, but iam-lens cannot always know the correct value. S3 cross-account replication is the motivating example: the source account may be different from the resource account.

The current model forces iam-lens to choose between two incorrect options:

- Put a guessed concrete value in context and make the key strict, which under-represents access when the guess is wrong.
- Make/leave the key non-strict, which handles value uncertainty for many `Allow` conditions but does not preserve presence semantics for `Null` and missing-key behavior.

## Desired API

Add a Discovery-only constraint object:

```ts
export interface DiscoveryContextKeyConstraint {
  /** Context key name. Use the same case-insensitive matching semantics as strict context keys. */
  keyName: string
  /** Whether the key's presence/absence in request.contextVariables is authoritative in Discovery. */
  presenceIsKnown: boolean
  /** Whether the key's concrete value in request.contextVariables is authoritative in Discovery. */
  valueIsKnown: boolean
}
```

Add it to `SimulationOptions`:

```ts
export interface SimulationOptions {
  simulationMode?: SimulationMode
  /** Discovery-only context key knowledge constraints. Ignored in Strict mode. */
  discoveryContextKeyConstraints?: DiscoveryContextKeyConstraint[]
}
```

`strictConditionKeys` should be removed rather than kept as a compatibility alias. This project is pre-1.0, and keeping both APIs would add avoidable ambiguity. Callers that need old strict behavior should express it as:

```ts
{ keyName, presenceIsKnown: true, valueIsKnown: true }
```

This allows callers to express:

```ts
{
  keyName: 'aws:SourceAccount',
  presenceIsKnown: true,
  valueIsKnown: false
}
```

## Important semantic distinction

`request.contextVariables` continues to carry the request context. If a key is present there, the key is present in the simulated request.

`DiscoveryContextKeyConstraint` does **not** add or remove context keys. It says whether Discovery should treat the key's presence and/or value as known facts.

Strict mode is unchanged: every condition is evaluated against the supplied request context as today. The new constraints only affect Discovery.

## Proposed internal model

### New helper class

Add a helper to replace `StrictContextKeys`, e.g. `DiscoveryContextKeyConstraints`:

```ts
export interface DiscoveryContextKeyConstraint {
  keyName: string
  presenceIsKnown: boolean
  valueIsKnown: boolean
}

export interface EffectiveDiscoveryContextKeyConstraint {
  presenceIsKnown: boolean
  valueIsKnown: boolean
  explicitlyConfigured: boolean
}

export class DiscoveryContextKeyConstraints {
  constructor(constraints: DiscoveryContextKeyConstraint[] = []) {}

  public constraintFor(key: string): EffectiveDiscoveryContextKeyConstraint
}
```

Recommended matching behavior and storage:

- Literal keys are case-insensitive and should be stored in a `Map<string, EffectiveDiscoveryContextKeyConstraint>` keyed by lower-case key name. Literal lookup must be O(1).
- Preserve the useful regex behavior from `StrictContextKeys` by allowing slash-delimited regex strings in `keyName`, e.g. `/^aws:ResourceTag\/.*/`, but keep pattern constraints separate from literal constraints.
- Optimize pattern checks for the expected common regex shape. Most pattern constraints should be prefix-like tag patterns such as `/^aws:ResourceTag\/.*/`. Parse those into a separate prefix index, e.g. `Array<{ prefixLower: string; constraint }>` or a `Map` by first segment (`aws`, `s3`, etc.) so `constraintFor('aws:SourceAccount')` does not scan every tag pattern.
- Keep a final fallback `RegExp[]` list only for complex patterns that cannot be reduced to a prefix.
- `constraintFor(key)` should evaluate in this order:
  1. lower-case literal map lookup
  2. prefix-pattern bucket(s) relevant to the key, if any
  3. fallback regex list
- If multiple constraints match, use an OR merge: if any matching constraint says a dimension is known, treat that dimension as known. This is conservative because it avoids downgrading a caller-declared known fact to unknown because of a broader regex.
  - `presenceIsKnown = any matched constraint has true`
  - `valueIsKnown = any matched constraint has true`
- Cache resolved lookups per lower-case key inside the helper. Condition evaluation will often ask about the same key repeatedly across statements/resources, so `constraintFor` should compute once per key per helper instance.
- Unconstrained keys must keep current Discovery behavior. `explicitlyConfigured` exists so condition evaluation can distinguish an absent constraint from an explicit `{ presenceIsKnown:false, valueIsKnown:false }` fully-unknown constraint.

### SimulationParameters

Replace `SimulationParameters.strictConditionKeys` with the new constraint helper:

```ts
export interface SimulationParameters {
  simulationMode: SimulationMode
  discoveryContextKeyConstraints: DiscoveryContextKeyConstraints
}
```

Condition evaluation should use only `discoveryContextKeyConstraints`. `StrictContextKeys` can be removed once all call sites and tests are migrated.

### Condition evaluation needs internal discovery metadata

Do **not** add anything to the external `ConditionExplain` interface. The existing explain shape should remain stable.

Current condition evaluation is externally boolean:

```ts
matches: boolean
```

That boolean is still fine for concrete Strict evaluation, but Discovery needs an internal way to distinguish these cases:

1. definite match
2. definite no-match
3. unknown because presence is not known
4. unknown because value is not known

The reason this cannot be represented by `matches` alone is Deny handling. For an unknown-value Deny condition:

- If we encode it as `matches: false`, current Deny Discovery logic will not report it as a possible Deny because Deny currently ignores matching non-strict conditions.
- If we encode it as `matches: true`, Allow handling and explain details can become misleading, and behavior may depend on a placeholder value.

So the additional state is only an internal control signal for `requestMatchesConditions`; it should not be exported.

Recommended internal type:

```ts
type DiscoveryConditionKnowledge = 'known' | 'unknown-presence' | 'unknown-value'

interface InternalConditionEvaluation {
  explain: ConditionExplain
  knowledge: DiscoveryConditionKnowledge
}

interface ConditionAndExplain {
  condition: Condition
  explain: ConditionExplain
  knowledge: DiscoveryConditionKnowledge
}
```

Implementation detail: `singleConditionMatchesRequest` (or a nearby internal wrapper) must produce this knowledge signal before `requestMatchesConditions` applies Allow/Deny statement semantics. When a condition is unknown because value or presence is not known, base operators must not be called with placeholder values. Otherwise output could accidentally depend on arbitrary placeholder context values. `requestMatchesConditions` consumes the internal knowledge plus `statementType` to decide whether the condition is ignored/reported and whether the statement matches.

The public ignored-condition output remains the existing policy-condition summary (`key`, `op`, `values`) produced from the `Condition` object, which is sufficient for iam-lens to display conditions.

## Discovery semantics

For Strict mode, ignore all discovery constraints.

For Discovery mode, for the condition key `K`:

- `keyExists` is still read from `request.contextVariables`.
- `presenceIsKnown` controls whether `keyExists` is authoritative.
- `valueIsKnown` controls whether the concrete context value is authoritative.

### Unknown-condition statement semantics

Unknown presence/value conditions intentionally over-approximate access in Discovery, matching iam-lens `whoCan` goals. The rule is explicit:

| Statement type | Unknown condition could be | Discovery statement behavior                                                                                                   | Ignored condition output | Rationale                                                                                        |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------ |
| Allow          | true or false              | Treat the condition as satisfiable so the statement can match if all known conditions match.                                   | Report under `allow`.    | Over-report possible access and surface required conditions.                                     |
| Deny           | true or false              | Treat the Deny condition as not definitively blocking, so the Deny statement becomes `NoMatch` if the only blocker is unknown. | Report under `deny`.     | Do not under-report access just because a Deny might apply; surface the possible Deny condition. |

Unknown conditions must bypass placeholder value evaluation. A Deny with `valueIsKnown:false` must not match or fail based on the concrete placeholder currently stored in `request.contextVariables`; it is always a conditional Deny in Discovery.

### Null operator

`Null` is presence-sensitive, not value-sensitive.

If `presenceIsKnown: true`:

- Evaluate `Null` exactly from `keyExists`.
- Do not ignore the condition merely because the key is non-value-strict.

Examples when the key is present:

```json
{ "Null": { "aws:SourceAccount": "false" } }
```

Known match.

```json
{ "Null": { "aws:SourceAccount": "true" } }
```

Known no-match.

If `presenceIsKnown: false`:

- Treat the `Null` result as unknown in Discovery.
- For Allow, it is satisfiable and should be reported as an ignored Allow condition.
- For Deny, it is a possible deny and should be reported as an ignored Deny condition.

If the key is absent and `presenceIsKnown:true`, `Null:true` is a known match and `Null:false` is a known no-match. `valueIsKnown` is irrelevant for `Null`.

### Single-value operators

This includes all base operators without a set operator:

- String: `StringEquals`, `StringNotEquals`, `StringEqualsIgnoreCase`, `StringNotEqualsIgnoreCase`, `StringLike`, `StringNotLike`
- ARN: `ArnEquals`, `ArnNotEquals`, `ArnLike`, `ArnNotLike`
- Numeric: `NumericEquals`, `NumericNotEquals`, `NumericLessThan`, `NumericLessThanEquals`, `NumericGreaterThan`, `NumericGreaterThanEquals`
- Date: `DateEquals`, `DateNotEquals`, `DateLessThan`, `DateLessThanEquals`, `DateGreaterThan`, `DateGreaterThanEquals`
- Bool
- BinaryEquals
- IP: `IpAddress`, `NotIpAddress`

If `presenceIsKnown: true` and the key is absent:

- Existing missing-key semantics are authoritative.
- Positive operators without `IfExists` are known no-match.
- `IfExists` and negative operators that match because missing are known matches.

If `presenceIsKnown: false` and the key is absent:

- The result is unknown because the key may exist in a real request.
- For Allow, it is satisfiable and should be ignored/reported when needed.
- For Deny, it is a possible deny and should be ignored/reported when needed.

If the key is present and `valueIsKnown: true`:

- Evaluate exactly as today.

If the key is present and `valueIsKnown: false`:

- Do not trust the concrete placeholder value in `request.contextVariables`.
- Treat any value comparison as unknown.
- For Allow, the condition is satisfiable and should be included in ignored Allow conditions.
- For Deny, the condition is a possible deny and should be included in ignored Deny conditions.

This must apply to both positive and negative operators. For example, with unknown value:

```json
{ "StringEquals": { "aws:SourceAccount": "111111111111" } }
```

is possibly true.

```json
{ "StringNotEquals": { "aws:SourceAccount": "111111111111" } }
```

is also possibly true.

### Set operators

Set operators must use the same presence/value knowledge before evaluating per-value logic:

- `ForAnyValue:StringEquals`
- `ForAllValues:StringEquals`
- and all other valid `ForAnyValue` / `ForAllValues` combinations using the existing base operators.

If the context key is present and `valueIsKnown: false`, the set condition is unknown regardless of the placeholder string/array value.

If the key is absent and `presenceIsKnown: true`, preserve current missing-key behavior for set operators.

If the key is absent and `presenceIsKnown: false`, the set condition is unknown.

Add explicit tests for at least:

- single-value unknown string key
- array-valued unknown key (`aws:SourceOrgPaths` style)
- `ForAnyValue:StringEquals`
- `ForAllValues:StringEquals`
- one negative set operator case

### IfExists

`IfExists` is presence-sensitive first, value-sensitive second.

If the key is absent and `presenceIsKnown: true`, `IfExists` behavior is a known match, as today.

If the key is absent and `presenceIsKnown: false`, the condition should be unknown because the key may exist with a value that does or does not satisfy the operator.

If the key is present and `valueIsKnown: false`, the condition should be unknown.

### Policy variables in condition values

Condition values can reference context variables, e.g. `${aws:SourceAccount}`.

If a policy value references a context key whose value is not known, the resolved policy value is also unknown. This must be included in the initial implementation, not deferred, because otherwise a condition on a different known key can still compare against an unknown Source\* placeholder:

```json
{ "StringEquals": { "s3:prefix": "${aws:SourceAccount}" } }
```

Plan for implementation:

1. Prefer enhancing `convertIamString` / related utility resolution to report which context keys were referenced while resolving a policy value. A separate parser is acceptable only if utility changes become too invasive.
2. If any referenced context key has `valueIsKnown: false`, mark the condition as unknown-value before calling the base operator.
3. Preserve existing error behavior for truly missing variables when presence is known absent.
4. Add tests where the condition key itself is known but a policy value references an unknown-value key.

## Request/condition algorithm changes

Update `requestMatchesConditions` roughly as follows:

1. `singleConditionMatchesRequest` evaluates each condition into `{ explain, knowledge }`. It must short-circuit before base-operator evaluation for unknown presence/value and unknown policy-variable references.
2. `requestMatchesConditions` combines that with the `Condition` object into `{ condition, explain, knowledge }`.
3. Replace the current `strictConditionKeys.has(key)` check with `discoveryContextKeyConstraints.constraintFor(key)`.
4. Define `isIgnored` in Discovery:
   - First branch by condition kind:
     - `Null` uses `presenceIsKnown`; if presence is known, the `Null` result is definite and must not be ignored because of `valueIsKnown:false`.
     - All value-comparison operators use `valueIsKnown` after presence/missing-key handling.
   - If internal knowledge is `unknown-value` or `unknown-presence`, ignore/report the condition for both Allow and Deny.
   - Otherwise preserve current behavior for unconstrained/current non-strict conditions:
     - Allow ignores non-matching non-strict conditions.
     - Deny ignores matching non-strict conditions.
5. Compute statement condition match:
   - A non-ignored definite non-match means `NoMatch`.
   - An unknown/ignored Deny condition should make the Deny statement `NoMatch` while reporting ignored Deny conditions.
   - Unknown/ignored Allow conditions should allow the Allow statement to match, while reporting ignored Allow conditions.
6. Keep existing rule: ignored conditions are only reported if the non-ignored conditions do not already disqualify the statement.

The Allow-vs-Deny decision about whether a condition is ignored should remain in `isIgnored`; that is already the right abstraction. The part that needs care is the later `ignoredMatches` shortcut. Today it works because ignored Allow conditions are concrete non-matches and ignored Deny conditions are concrete matches. With unknown conditions, `explain.matches` is not meaningful for the ignored-condition decision, so the statement-match calculation must use the internal `knowledge` flag rather than depending on a placeholder-derived `matches` value.

Suggested pseudocode (intentionally simplified; the real implementation still needs the `Null`/presence branch above when computing knowledge and `isIgnored`):

```ts
const ignored = results.filter(isIgnored)
const nonIgnored = results.filter((r) => !isIgnored(r))
const hasKnownNonIgnoredNonMatch = nonIgnored.some((r) => !r.explain.matches)
const hasIgnoredPossibleDeny =
  statementType === 'Deny' && ignored.some((r) => r.knowledge !== 'known' || r.explain.matches)

return {
  matches: hasKnownNonIgnoredNonMatch || hasIgnoredPossibleDeny ? 'NoMatch' : 'Match',
  ignoredConditions: hasKnownNonIgnoredNonMatch ? undefined : ignoredConditions(results, isIgnored)
}
```

The exact code can differ, but tests should prove these cases: known `Null` results do not depend on value-knownness; ignored Allow unknown => statement Match; ignored Deny unknown => statement NoMatch; ignored Deny known match => statement NoMatch as today.

## Test impact by operator family

The base operator unit tests (e.g. `StringEquals.test.ts`, `ArnLike.test.ts`) should mostly remain unchanged because the base operators still evaluate concrete values.

Most new coverage belongs in `condition.test.ts`, `coreSimulatorEngine.test.ts` JSON fixtures, and `simulationEngine.test.ts` / integration JSON.

### Central condition tests (`src/condition/condition.test.ts`)

First migrate the existing `condition.test.ts` helper data from its current raw `Set<string>` shape (`strictConditionKeys: new Set(...)`) to `DiscoveryContextKeyConstraints`; this test file currently does not instantiate `StrictContextKeys` even though production types do.

Add a new `requestMatchesConditions - Discovery context key constraints` describe block covering:

1. `Null:false` with present key and `{ presenceIsKnown:true, valueIsKnown:false }` is known match.
2. `Null:true` with present key and `{ presenceIsKnown:true, valueIsKnown:false }` is known no-match, not ignored.
3. `StringEquals` Allow with present key and `{ presenceIsKnown:true, valueIsKnown:false }` is Match with ignored condition even if placeholder differs.
4. `StringEquals` Deny with present key and `{ presenceIsKnown:true, valueIsKnown:false }` is NoMatch with ignored deny condition even if placeholder differs.
5. `StringNotEquals` Deny with present key and `{ presenceIsKnown:true, valueIsKnown:false }` is NoMatch with ignored deny condition even if placeholder happens to match or not match.
6. `StringEqualsIfExists` absent key with `{ presenceIsKnown:true }` remains known match.
7. `StringEqualsIfExists` absent key with `{ presenceIsKnown:false }` becomes unknown/ignored in Discovery.
8. `ForAnyValue:StringEquals` with present array key and `valueIsKnown:false` is ignored/reported.
9. `ForAllValues:StringEquals` with present array key and `valueIsKnown:false` is ignored/reported.
10. `Bool`, `IpAddress`, `DateGreaterThan`, `NumericLessThan`, `ArnLike`, `BinaryEquals` representative unknown-value tests to ensure every operator family enters the central unknown-value path before base operator specifics matter.
11. Policy variable case: condition value references an unknown-value key and is treated as unknown even when the condition key itself is known.
12. Fully unknown explicit constraint: `{ presenceIsKnown:false, valueIsKnown:false }` behaves like a conditional/discoverable key and is reported, proving explicit fully-unknown differs from unconstrained legacy behavior only where intended.
13. Validate or document `{ presenceIsKnown:false, valueIsKnown:true }`: recommended behavior is to reject it in option normalization because a value cannot be authoritative if key presence is not authoritative. If not rejected, tests must document semantics.

### DiscoveryContextKeyConstraints tests

Add/update tests proving:

- `{ keyName: 'aws:SourceVpc', presenceIsKnown: true, valueIsKnown: true }` behaves like the old `strictConditionKeys: ['aws:SourceVpc']` behavior.
- Regex keys work via constraints, e.g. `{ keyName: '/^aws:PrincipalTag\/.*/', presenceIsKnown: true, valueIsKnown: true }`.
- Invalid `{ presenceIsKnown:false, valueIsKnown:true }` constraints are rejected.

### Core engine JSON tests (`src/core_engine/coreEngineTests`)

Update the JSON harness to accept:

```json
"simulation": {
  "mode": "Discovery",
  "discoveryContextKeyConstraints": [
    { "keyName": "aws:username", "presenceIsKnown": true, "valueIsKnown": true }
  ]
}
```

The harness should stop accepting `strictConditionKeys`. All existing JSON fixtures using `strictConditionKeys` must be migrated to the new object form:

- `discoveryMode/ignoredConditions/scp.json`
- `discoveryMode/ignoredConditions/rcp.json`
- `discoveryMode/ignoredConditions/strictPatterns.json`
- `s3/abac.json`

Add new JSON fixtures, likely under `coreEngineTests/discoveryMode/contextKeyConstraints/`, covering:

1. Allow with service-principal-like `aws:SourceAccount` present, value unknown, `StringEquals` mismatch placeholder => `Allowed` with ignored resource Allow condition.
2. Deny with service-principal-like `aws:SourceAccount` present, value unknown, `StringEquals` mismatch placeholder => overall `Allowed` with ignored resource Deny condition.
3. `Null:false` on present source key with value unknown => strict known match.
4. `Null:true` on present source key with value unknown => strict known no-match.
5. `ForAnyValue:StringEquals` on `aws:SourceOrgPaths` present array, value unknown => ignored condition.
6. `StringEqualsIfExists` absent source key with presence known true => known match/no ignored condition.
7. `StringEqualsIfExists` absent source key with presence known false => ignored condition.

### Simulation engine JSON tests (`src/simulation_engine/simulationEngineIntegrationTests`)

Update the JSON harness to pass `simulationOptions.discoveryContextKeyConstraints` to `runSimulation`.

Add fixtures under a new directory such as `contextKeys/discoveryContextKeyConstraints.json` covering the same behavior at `runSimulation` level, including wildcard resources where possible so both single and wildcard result paths are exercised.

Existing simulation engine JSON fixtures do not appear to use `strictConditionKeys`; the harness should support only `simulationOptions.discoveryContextKeyConstraints` going forward.

### TypeScript simulation engine tests

Update `src/simulation_engine/simulationEngine.test.ts`:

- Replace the existing `strictConditionKeys` test with the new-structure test:

```ts
runSimulation(simulation, {
  simulationMode: 'Discovery',
  discoveryContextKeyConstraints: [
    { keyName: 'aws:SourceVpc', presenceIsKnown: true, valueIsKnown: true }
  ]
})
```

- Add a `valueIsKnown:false` test that currently fails with concrete placeholder behavior.

### StrictContextKeys removal

Remove `StrictContextKeys` and its tests after all call sites use `DiscoveryContextKeyConstraints`. Add a new test file for `DiscoveryContextKeyConstraints`.

## JSON migration pattern

Old fixture form to remove:

```json
"simulation": {
  "mode": "Discovery",
  "strictConditionKeys": ["aws:username"]
}
```

New required form:

```json
"simulation": {
  "mode": "Discovery",
  "discoveryContextKeyConstraints": [
    { "keyName": "aws:username", "presenceIsKnown": true, "valueIsKnown": true }
  ]
}
```

Old regex form to remove:

```json
"strictConditionKeys": ["/^aws:ResourceTag\\/.*/"]
```

New required form:

```json
"discoveryContextKeyConstraints": [
  { "keyName": "/^aws:ResourceTag\\/.*/", "presenceIsKnown": true, "valueIsKnown": true }
]
```

## Implementation phases

### Phase 1: API migration plumbing

Files likely touched:

- `src/simulation_engine/simulationOptions.ts`
- `src/core_engine/CoreSimulatorEngine.ts`
- `src/simulation_engine/simulationEngine.ts`
- `src/simulation_engine/unsafeSimulationEngine.ts`
- `src/core_engine/coreSimulatorEngine.test.ts`
- `src/condition/condition.test.ts`
- `src/principal/principal.test.ts`
- `src/simulation_engine/simulationEngineIntegration.test.ts`
- new `src/context_keys/discoveryContextKeyConstraints.ts`
- new `src/context_keys/discoveryContextKeyConstraints.test.ts`
- `src/index.ts` if the new type/class should be exported

Tasks:

1. Add `DiscoveryContextKeyConstraint` type.
2. Add `discoveryContextKeyConstraints?: DiscoveryContextKeyConstraint[]` to `SimulationOptions`.
3. Remove `strictConditionKeys` from `SimulationOptions`, `SimulationParameters`, and call sites.
4. Validate constraints during normalization/construction; reject `{ presenceIsKnown:false, valueIsKnown:true }` because an authoritative value implies authoritative presence.
5. Build `DiscoveryContextKeyConstraints` in `runSimulation` from the new constraints only.
6. Pass it into `authorize` via `SimulationParameters`.
7. Update JSON harnesses to parse/pass the new field and reject no-longer-supported `strictConditionKeys` if they appear in fixtures.
8. Add migration tests proving both literal and regex constraints reproduce old strict-key behavior.

### Phase 2: condition evaluation tri-state

Files likely touched:

- `src/condition/condition.ts`
- `src/explain/statementExplain.ts` only if public explain metadata is added
- maybe `src/util.ts` / `src/condition/conditionUtil.ts` for unknown policy-variable references

Tasks:

1. Add internal Discovery condition knowledge metadata without changing the public `ConditionExplain` interface.
2. Teach `singleConditionMatchesRequest`, `forAnyValueMatch`, and `forAllValuesMatch` to short-circuit to unknown when value/presence is not known.
3. Detect unknown policy-variable references before calling base operators.
4. Keep base operator implementations unchanged for concrete known values.
5. Update `requestMatchesConditions` ignore/match logic to account for unknown Allow and unknown Deny conditions.
6. Preserve current Strict mode behavior completely.

### Phase 3: test migration and new tests

Tasks:

1. Add failing condition unit tests and JSON fixtures first for presence-known/value-unknown behavior, especially unknown Deny and `Null`.
2. Migrate JSON core fixtures from `strictConditionKeys` to `discoveryContextKeyConstraints` and remove all `strictConditionKeys` occurrences.
3. Add simulation engine JSON fixtures for the new option.
4. Add condition unit tests for all operator families and set operators.
5. Run `npm run build`, `npm test`, `npm run format-check`.

### Phase 4: iam-lens follow-up

After publishing/updating iam-simulate:

1. Update iam-lens dependency.
2. In iam-lens `createContextKeys`, for service principals, continue including Source\* keys to represent presence but stop treating their guessed values as authoritative in Discovery.
3. In iam-lens `simulateRequest`, replace/add strict key construction so service Source\* keys use:

```ts
{ keyName: 'aws:SourceAccount', presenceIsKnown: true, valueIsKnown: false }
{ keyName: 'aws:SourceOwner', presenceIsKnown: true, valueIsKnown: false }
{ keyName: 'aws:SourceOrgID', presenceIsKnown: true, valueIsKnown: false }
{ keyName: 'aws:SourceOrgPaths', presenceIsKnown: true, valueIsKnown: false }
```

4. Add iam-lens whoCan integration coverage for cross-account service-principal source conditions.

## Breaking change / migration

This project is pre-1.0, so the plan intentionally removes `strictConditionKeys` instead of maintaining a compatibility alias.

- Strict mode is unchanged.
- Existing Discovery behavior without constraints should remain unchanged.
- Existing Discovery strict-key behavior must be migrated to `discoveryContextKeyConstraints` entries with both booleans true.
- New behavior applies when `discoveryContextKeyConstraints` contains a key with `presenceIsKnown:false` and/or `valueIsKnown:false`.

## Risks and open questions

1. **Regex constraints with mixed booleans**: True-wins is safest and should be documented.
2. **Deny semantics**: This is the highest-risk area. Tests must prove an unknown-value Deny is reported as ignored/conditional rather than silently disappearing or depending on a placeholder.
3. **Default semantics**: To avoid broad churn, unconstrained keys should keep current non-strict Discovery behavior. The new object should not globally reinterpret all non-strict keys as unknown.
4. **Invalid constraint combinations**: Prefer rejecting `{ presenceIsKnown:false, valueIsKnown:true }` during option normalization because an authoritative value implies authoritative presence.

## Acceptance criteria

- New `DiscoveryContextKeyConstraint` API exists and is documented.
- `strictConditionKeys` is removed from public options, internal parameters, JSON harnesses, and fixtures.
- JSON core fixtures using strict keys are migrated to object constraints.
- New tests cover presence-known/value-unknown for `Null`, single-value operators, set operators, `IfExists`, and representative operator families.
- Discovery can express `presenceIsKnown:true,valueIsKnown:false` such that:
  - `Null:false` on a present key is a known match.
  - `Null:true` on a present key is a known no-match.
  - Allow value comparisons are reported as conditional/ignored.
  - Deny value comparisons are reported as conditional/ignored.
- `npm run build`, `npm test`, and `npm run format-check` pass.

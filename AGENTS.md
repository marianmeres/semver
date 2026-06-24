# Agent Reference: @marianmeres/semver

## Package Overview

- **Purpose**: Zero-dependency utilities to normalize, parse, and compare "semver-ish" version strings for sorting/precedence checks
- **Type**: Utility library
- **Runtime**: Deno (JSR, primary) and Node.js (npm, secondary) — dual distribution
- **Dependencies**: Zero runtime dependencies (`@std/*` are dev/build-only)
- **Version format**: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`
- **Install**: `deno add jsr:@marianmeres/semver` | `npm install @marianmeres/semver`

## Public API

All exports come from `src/mod.ts` (re-exports `src/semver.ts`).

### `normalizeSemver` (overloaded)

```typescript
function normalizeSemver(version: string, assert?: true): string;
function normalizeSemver(version: string, assert: false): string | undefined;
```

- Strips a leading `v`/`V`, fills missing MINOR/PATCH with `0`, validates against the semver regex.
- `assert` defaults to `true`: throws `TypeError` on invalid input. `assert: false`: returns `undefined` instead.
- Non-string input is invalid (throws or returns `undefined` per `assert`).

```typescript
normalizeSemver("v1.2"); // "1.2.0"
normalizeSemver("7"); // "7.0.0"
normalizeSemver("7-rc.1"); // "7.0.0-rc.1"
normalizeSemver("1.2.3-rc.1+build.123"); // "1.2.3-rc.1+build.123"
normalizeSemver("nope", false); // undefined
normalizeSemver("nope"); // throws TypeError
```

### `parseSemver`

```typescript
function parseSemver(version: string): ParsedSemver;
```

- Normalizes first (so it accepts the same lenient input as `normalizeSemver`), then splits into components.
- Throws `TypeError` on invalid input (no non-throwing variant).
- `prerelease`/`build` are returned **without** their `-`/`+` leading char; `""` when absent.

```typescript
parseSemver("1.2.3-alpha+build");
// { major: 1, minor: 2, patch: 3, prerelease: "alpha", build: "build" }
parseSemver("v1.2");
// { major: 1, minor: 2, patch: 0, prerelease: "", build: "" }
```

### `compareSemver`

```typescript
function compareSemver(a: string, b: string): number;
```

- Comparator fit for `Array.prototype.sort` / `toSorted`. Returns negative / positive / `0`.
- Throws `TypeError` if either input is invalid.
- Order: numeric `major` → `minor` → `patch`; then prerelease rules (release > prerelease; per-dot-identifier compare: numeric < alphanumeric, numeric compared numerically, alphanumeric compared lexically/ASCII; fewer prerelease fields < more).

```typescript
compareSemver("1.0.0", "2.0.0"); // negative
compareSemver("1.2.0", "1.10.0"); // negative (numeric, not lexical)
compareSemver("1.0.0-alpha", "1.0.0"); // negative (prerelease < release)
["1.10.0", "1.2.0", "1.1.0"].toSorted(compareSemver); // ["1.1.0","1.2.0","1.10.0"]
```

### `ParsedSemver`

```typescript
interface ParsedSemver {
	major: number; // X in X.y.z
	minor: number; // Y in x.Y.z
	patch: number; // Z in x.y.Z
	prerelease: string; // e.g. "rc.1", or ""
	build: string; // e.g. "build.123", or ""
}
```

## Key Implementation Details / Gotchas

- **Lenient input**: MINOR and PATCH are optional (default `0`); a leading `v`/`V` is stripped. `"v1"`, `"7-rc.1"`, `"6.0-beta"` all parse. Bare integers work: `"20250501"` → `"20250501.0.0"`.
- **Charset restriction**: PRERELEASE and BUILD must match `[0-9A-Za-z-.]+`. Underscores, spaces, and other chars are rejected (`"1.0.0-foo_bar"`, `"1.0.0+build bar"` are invalid). Core regex: `/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/`.
- **Surprising-but-valid parse**: hyphens/dots in odd inputs still match. `"2025-05-01.foo"` → `"2025.0.0-05-01.foo"` (everything after the first `-` becomes prerelease).
- **`assert: false` returns `undefined`, not `"0.0.0"`** for invalid input — do not treat a falsy result as a zero version.
- **Build metadata is ignored for precedence** (per semver spec). `build` is parsed and exposed on `ParsedSemver` but never affects ordering in `compareSemver`.
- **Tiebreaker = `localeCompare` on ORIGINAL strings**: when two versions have equal semver precedence, `compareSemver` falls back to `a.localeCompare(b)` on the raw (un-normalized) inputs, for stable sorting. Consequences:
  - Only **identical strings** reliably return `0`. `compareSemver("1.0.0","1.0.0") === 0`.
  - Precedence-equal-but-differently-spelled inputs return **non-zero**: e.g. `"1.2"` vs `"1.2.0"` → negative; `"1.0.0+build.1"` vs `"1.0.0+build.2"` → non-zero. Result is deterministic and antisymmetric, just not `0`.
  - Do **not** use `compareSemver(a, b) === 0` as a precedence-equality test across differently-spelled inputs. Normalize both sides first if you need that.
- `parseSemver` re-runs the regex on the already-normalized string, so its internal `|| "0"` fallbacks for minor/patch are effectively dead (always present post-normalize) — harmless, but don't rely on them as separate logic.

## File Structure

```
src/
  mod.ts        # Entry point (re-exports semver.ts)
  semver.ts     # Implementation (all logic + types)
tests/
  semver.test.ts  # Test suite
scripts/
  build-npm.ts  # npm dist build (uses @marianmeres/npmbuild)
deno.json       # Manifest, tasks, fmt config (tabs, lineWidth 90, indentWidth 4)
```

## Development Commands

```bash
deno task test         # Run tests
deno task test:watch   # Watch mode
deno task npm:build    # Build npm package into ./.npm-dist
deno task publish      # deno publish (JSR) + npm publish
deno task rp           # release (patch) + publish
deno task rpm          # release minor + publish
deno doc src/mod.ts    # Render public API
```

## Testing

- Framework: `Deno.test` with `@std/assert`.
- Coverage: normalization (lenient fill + `v` strip), charset rejection, non-string input, component parsing, lenient parse, throw-on-invalid, full precedence-chain sort, sign-correct relations, build-metadata-ignored behavior, lenient comparison.
- The precedence test shuffles then `toSorted(compareSemver)` to assert a known total order. A separate build-metadata test asserts that build-only differences are antisymmetric (`Math.sign(compare(a,b)) === -Math.sign(compare(b,a))`), since they don't return `0`.

## Common Patterns

```typescript
import { compareSemver, normalizeSemver, parseSemver } from "@marianmeres/semver";

// Sort a list of versions ascending
versions.toSorted(compareSemver);

// Find latest
versions.toSorted(compareSemver).at(-1);

// Safe normalization without try/catch
const v = normalizeSemver(input, false);
if (v === undefined) { /* invalid */ }

// Precedence-equality check across differently-spelled inputs
normalizeSemver(a) === normalizeSemver(b); // NOT compareSemver(a, b) === 0

// Gate a feature on a minimum version
compareSemver(current, "2.1.0") >= 0;
```

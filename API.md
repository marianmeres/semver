# API Reference

Zero-dependency utilities to normalize, parse, and compare "semver-ish" version
strings.

The recognized format is `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`. Input is
**lenient**: `MINOR` and `PATCH` may be omitted (they default to `0`), and a
single leading `v` or `V` is allowed. Once normalized, comparisons follow the
[semver](https://semver.org/) precedence rules, and `compareSemver` is shaped to
be passed directly to `Array.prototype.sort` / `toSorted`.

## Import

```typescript
import {
	compareSemver,
	normalizeSemver,
	type ParsedSemver,
	parseSemver,
} from "@marianmeres/semver";
```

## Overview

| Export                                              | Kind      | Summary                                                                                       |
| --------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| [`normalizeSemver`](#normalizesemverversion-assert) | function  | Normalize a lenient version string to canonical `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]` form |
| [`parseSemver`](#parsesemverversion)                | function  | Normalize, then split a version string into its numeric/string components                     |
| [`compareSemver`](#comparesemvera-b)                | function  | Compare two version strings by semver precedence (for sorting)                                |
| [`ParsedSemver`](#parsedsemver)                     | interface | The shape returned by `parseSemver`                                                           |

---

## Functions

### `normalizeSemver(version, assert?)`

Normalizes a version string to canonical semver form. Strips a single leading
`v`/`V`, fills in any omitted `MINOR`/`PATCH` with `0`, and validates the input
against the recognized grammar.

The `PRERELEASE` and `BUILD` portions (the parts after `-` and `+`) are
restricted to the semver-spec character set `[0-9A-Za-z-.]`. Anything outside
that set (underscores, spaces, etc.) makes the whole string invalid.

#### Signature

```typescript
function normalizeSemver(version: string, assert?: true): string;
function normalizeSemver(version: string, assert: false): string | undefined;
```

The return type depends on `assert`:

- `normalizeSemver(version)` and `normalizeSemver(version, true)` return `string`
  (and throw on invalid input).
- `normalizeSemver(version, false)` returns `string | undefined` (returns
  `undefined` instead of throwing).

#### Parameters

| Parameter | Type      | Description                                                                                                                 |
| --------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| `version` | `string`  | The version string to normalize. May include or omit a leading `v`/`V`, and may omit minor/patch.                           |
| `assert`  | `boolean` | Optional. When `true` (default), throws a `TypeError` on invalid input. When `false`, returns `undefined` on invalid input. |

#### Returns

`string` — the normalized version string.

When `assert` is `false` and the input is invalid (including non-string input),
returns `undefined`.

#### Throws

`TypeError` — when `assert` is `true` (the default) and `version` is not a
string, or does not match the recognized grammar.

#### Examples

Lenient inputs are filled out to full `MAJOR.MINOR.PATCH`:

```typescript
normalizeSemver("1"); // "1.0.0"
normalizeSemver("3.1"); // "3.1.0"
normalizeSemver("4.2.1"); // "4.2.1"
normalizeSemver("v1.2"); // "1.2.0"  (leading v stripped)
normalizeSemver("V2"); // "2.0.0"  (uppercase V too)
normalizeSemver("7-rc.1"); // "7.0.0-rc.1"  (prerelease with no minor/patch)
normalizeSemver("6.0-beta"); // "6.0.0-beta"
```

Prerelease and build metadata are preserved verbatim (only the major/minor/patch
skeleton is reshaped):

```typescript
normalizeSemver("5.0.0-alpha"); // "5.0.0-alpha"
normalizeSemver("8.1.0+build.123"); // "8.1.0+build.123"
normalizeSemver("9.2-alpha+build.456"); // "9.2.0-alpha+build.456"
normalizeSemver("1.2.3-rc.1+build.123"); // "1.2.3-rc.1+build.123"
normalizeSemver("11.0.0-beta.1+exp.sha.5114f85"); // "11.0.0-beta.1+exp.sha.5114f85"
```

Large numbers are accepted (the components are plain integers, not bounded):

```typescript
normalizeSemver("20250501"); // "20250501.0.0"
```

#### Non-throwing mode (`assert: false`)

Pass `false` as the second argument to get `undefined` instead of an exception.
Note that invalid input yields `undefined`, **not** a "zero" version like
`"0.0.0"`:

```typescript
normalizeSemver("banana", false); // undefined
normalizeSemver("1.0.0-foo_bar", false); // undefined (underscore not allowed)
normalizeSemver("", false); // undefined (empty string is invalid)

// valid input still passes through unchanged
normalizeSemver("1.0.0-foo", false); // "1.0.0-foo"
```

#### Edge cases

**Date-like strings are accepted, but parsed structurally** — there is no
calendar awareness. The grammar greedily matches the leading integer as `MAJOR`,
then everything after the first `-` becomes the prerelease identifier:

```typescript
normalizeSemver("2025-05-01.foo"); // "2025.0.0-05-01.foo"
```

Here `2025` is the major, minor/patch default to `0`, and `05-01.foo` (which
only contains `[0-9A-Za-z-.]`) is a valid prerelease identifier.

**The charset restriction applies only to prerelease/build.** These throw under
the default `assert`:

```typescript
normalizeSemver("1.0.0-foo_bar"); // throws TypeError (underscore)
normalizeSemver("1.0.0+build bar"); // throws TypeError (space)
normalizeSemver("banana"); // throws TypeError (no leading number)
normalizeSemver(""); // throws TypeError
```

**Non-string input** throws under the default `assert`, and returns `undefined`
under `assert: false`:

```typescript
normalizeSemver(undefined as any); // throws TypeError
normalizeSemver(123 as any); // throws TypeError
normalizeSemver(null as any, false); // undefined
normalizeSemver(123 as any, false); // undefined
```

---

### `parseSemver(version)`

Parses a version string into its component parts. The input is normalized first
(via `normalizeSemver`), so the same lenient rules apply — a leading `v`/`V` and
omitted minor/patch are accepted.

#### Signature

```typescript
function parseSemver(version: string): ParsedSemver;
```

#### Parameters

| Parameter | Type     | Description                                               |
| --------- | -------- | --------------------------------------------------------- |
| `version` | `string` | The version string to parse. Normalized before splitting. |

#### Returns

[`ParsedSemver`](#parsedsemver) — an object with numeric `major`, `minor`,
`patch`, and string `prerelease`, `build`. The `prerelease` value has no leading
`-` and `build` has no leading `+`; both are `""` when absent.

#### Throws

`TypeError` — if `version` is not a string or does not match the recognized
grammar. (Unlike `normalizeSemver`, `parseSemver` has no non-throwing mode.)

#### Examples

```typescript
parseSemver("1.2.3-alpha+build");
// { major: 1, minor: 2, patch: 3, prerelease: "alpha", build: "build" }

parseSemver("1.0.0");
// { major: 1, minor: 0, patch: 0, prerelease: "", build: "" }

parseSemver("1.1.0-alpha.1");
// { major: 1, minor: 1, patch: 0, prerelease: "alpha.1", build: "" }

parseSemver("1.1.0+build.123");
// { major: 1, minor: 1, patch: 0, prerelease: "", build: "build.123" }
```

Lenient input is normalized before parsing, so the missing fields surface as
`0` / `""`:

```typescript
parseSemver("v1.2");
// { major: 1, minor: 2, patch: 0, prerelease: "", build: "" }

parseSemver("7-rc.1");
// { major: 7, minor: 0, patch: 0, prerelease: "rc.1", build: "" }
```

Invalid input throws:

```typescript
parseSemver("banana"); // throws TypeError
parseSemver("1.0.0-foo_bar"); // throws TypeError
```

#### Edge cases

The same structural (non-calendar) parsing applies to date-like strings:

```typescript
parseSemver("2025-05-01.foo");
// { major: 2025, minor: 0, patch: 0, prerelease: "05-01.foo", build: "" }
```

`major`, `minor`, and `patch` are produced via `parseInt`, so they are plain
JavaScript numbers. Extremely large version components are subject to normal
floating-point integer limits.

---

### `compareSemver(a, b)`

Compares two version strings according to semver precedence rules. The signature
matches the comparator expected by `Array.prototype.sort` and
`Array.prototype.toSorted`, so it can be passed directly.

Both arguments are normalized/parsed before comparison, so lenient input (`v`
prefix, omitted minor/patch) is accepted.

#### Signature

```typescript
function compareSemver(a: string, b: string): number;
```

#### Parameters

| Parameter | Type     | Description                |
| --------- | -------- | -------------------------- |
| `a`       | `string` | The first version string.  |
| `b`       | `string` | The second version string. |

#### Returns

`number` — negative if `a` has lower precedence than `b`, positive if higher,
and `0` only when the two **original input strings are identical** (see the
tiebreaker note below).

#### Throws

`TypeError` — if either `a` or `b` is not a string or does not match the
recognized grammar.

#### Precedence rules

Versions are ordered as follows (each step only consulted when the previous one
ties):

1. **`major`, then `minor`, then `patch`** — compared **numerically**, not
   lexically. So `1.2.0 < 1.10.0` (because `2 < 10`), even though the string
   `"1.10.0"` sorts before `"1.2.0"` alphabetically.
2. **A prerelease has lower precedence than the matching release.** `1.0.0-alpha
   < 1.0.0`.
3. **Prerelease identifiers** (the dot-separated parts after `-`) are compared
   left to right:
   - A purely numeric identifier has **lower** precedence than an alphanumeric
     one (`1.0.0-1 < 1.0.0-alpha`).
   - Two numeric identifiers are compared numerically.
   - Two alphanumeric identifiers are compared lexically by ASCII.
   - When all compared identifiers tie, the version with **more** identifiers has
     higher precedence (`1.0.0-alpha < 1.0.0-alpha.1`).
4. **Build metadata is ignored for precedence** (per the semver spec). `1.0.0`
   and `1.0.0+build.123` have equal precedence.

#### Tiebreaker and the equality caveat

When two versions have **equal semver precedence**, `compareSemver` falls back to
a final, stable tiebreaker: `a.localeCompare(b)` on the **original, un-normalized
input strings**. This keeps sorting deterministic (and antisymmetric — swapping
the arguments flips the sign), but it has an important consequence:

> `compareSemver` returns `0` **only when the two input strings are identical.**
> Two strings that are precedence-equal but spelled differently will return a
> non-zero value.

```typescript
compareSemver("1.0.0", "1.0.0"); // 0  (identical strings)
compareSemver("1.2", "1.2.0"); // negative — same precedence, different spelling
compareSemver("1.0.0+build.1", "1.0.0+build.2"); // non-zero (build ignored for
// precedence, tiebreaker decides)
```

In the `"1.2"` vs `"1.2.0"` case both normalize to `1.2.0` (equal precedence),
but the tiebreaker compares the raw strings `"1.2"` and `"1.2.0"`, and `"1.2"`
sorts first. Do not rely on a `0` return to test for precedence equality — use
`parseSemver` and compare the components, or normalize both inputs first.

#### Examples

Basic pairwise comparisons (signs shown, exact magnitudes are unspecified):

```typescript
compareSemver("1.0.0", "2.0.0"); // negative (1.0.0 < 2.0.0)
compareSemver("2.0.0", "1.0.0"); // positive (2.0.0 > 1.0.0)
compareSemver("1.2.0", "1.10.0"); // negative (numeric, not lexical)
compareSemver("1.0.0-alpha", "1.0.0"); // negative (prerelease < release)
compareSemver("1.0.0", "1.0.0-rc.1"); // positive (release > prerelease)
compareSemver("1.0.0-1", "1.0.0-alpha"); // negative (numeric < alphanumeric)
compareSemver("1.0.0-alpha", "1.0.0-alpha.1"); // negative (more fields = higher)
```

Lenient input is normalized before comparing:

```typescript
compareSemver("v1", "v2"); // negative (1.0.0 < 2.0.0)
compareSemver("v2.0", "1.5.0"); // positive (2.0.0 > 1.5.0)
compareSemver("1", "1.0.0-rc.1"); // positive (release > prerelease)
```

#### Sorting

Because the signature is comparator-shaped, sort an array of versions by passing
`compareSemver` straight to `toSorted` (or `sort`):

```typescript
["1.10.0", "1.2.0", "1.1.0"].toSorted(compareSemver);
// ["1.1.0", "1.2.0", "1.10.0"]
```

A fuller precedence chain, sorted ascending:

```typescript
[
	"2.0.0",
	"1.0.0-alpha",
	"1.0.0",
	"1.0.0-1",
	"1.0.0-alpha.1",
].toSorted(compareSemver);
// [
//   "1.0.0-1",       // numeric prerelease has lowest precedence
//   "1.0.0-alpha",   // alphanumeric prerelease
//   "1.0.0-alpha.1", // more prerelease fields
//   "1.0.0",         // the release itself
//   "2.0.0",
// ]
```

The complete ordering across major/minor/patch, prerelease, build, and the
numeric-vs-alphanumeric rules looks like this (lowest to highest precedence):

```
1.0.0-alpha.1
1.0.0-alpha.beta
1.0.0-beta
1.0.0
1.1.0-alpha
1.1.0-alpha.1
1.1.0
1.1.0+build.123   (equal precedence to 1.1.0; tiebreaker keeps it stable)
1.2.0
1.10.0
2.0.0
```

To find the highest version, sort and take the last element (or reverse the
comparator):

```typescript
const latest = versions.toSorted(compareSemver).at(-1);
```

---

## Types

### `ParsedSemver`

The parsed components of a version string, as returned by
[`parseSemver`](#parsesemverversion).

```typescript
interface ParsedSemver {
	/** Major version (the `X` in `X.y.z`). */
	major: number;
	/** Minor version (the `Y` in `x.Y.z`). */
	minor: number;
	/** Patch version (the `Z` in `x.y.Z`). */
	patch: number;
	/** Prerelease identifier without the leading `-` (e.g. `"rc.1"`), or `""`. */
	prerelease: string;
	/** Build metadata without the leading `+` (e.g. `"build.123"`), or `""`. */
	build: string;
}
```

| Property     | Type     | Description                                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------------- |
| `major`      | `number` | Major version.                                                                                      |
| `minor`      | `number` | Minor version (`0` when omitted in input).                                                          |
| `patch`      | `number` | Patch version (`0` when omitted in input).                                                          |
| `prerelease` | `string` | Prerelease identifier without the leading `-`, or `""` if none.                                     |
| `build`      | `string` | Build metadata without the leading `+`, or `""` if none. Ignored for precedence by `compareSemver`. |

---

## Notes

- **Zero runtime dependencies.**
- **Build metadata never affects precedence.** It is preserved by
  `normalizeSemver` and surfaced by `parseSemver`, but `compareSemver` only uses
  it (indirectly, via the original string) as a stable tiebreaker.
- **Lenient, not validating.** This library is built for normalizing and sorting
  loosely-formatted version strings (e.g. migration filenames, tags), not for
  strict semver validation. If you need strict `MAJOR.MINOR.PATCH` enforcement,
  check the parsed/normalized result yourself.

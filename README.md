# @marianmeres/semver

[![NPM version](https://img.shields.io/npm/v/@marianmeres/semver.svg)](https://www.npmjs.com/package/@marianmeres/semver)
[![JSR version](https://jsr.io/badges/@marianmeres/semver)](https://jsr.io/@marianmeres/semver)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Zero-dependency utilities to normalize, parse, and compare "semver-ish" version strings.

Version format: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`.

Input is lenient: `MINOR` and `PATCH` are optional (each defaults to `0`), and an
optional leading `v`/`V` is stripped. So `"v1"`, `"7-rc.1"` and `"1.2"` are all
accepted. `PRERELEASE` and `BUILD` identifiers are restricted to the semver-spec
character set `[0-9A-Za-z-.]`.

`compareSemver` follows semver precedence rules and is designed to be passed
directly to `Array.prototype.sort`.

## Install

```sh
deno add jsr:@marianmeres/semver
```

```sh
npm install @marianmeres/semver
```

## Example usage

```typescript
import { compareSemver, normalizeSemver, parseSemver } from "@marianmeres/semver";
```

### Normalize

```typescript
normalizeSemver("v1.2"); // "1.2.0"
normalizeSemver("7"); // "7.0.0"
normalizeSemver("7-rc.1"); // "7.0.0-rc.1"
normalizeSemver("1.2.3-rc.1+build.123"); // "1.2.3-rc.1+build.123"

// Invalid input throws a TypeError by default...
normalizeSemver("nope"); // throws TypeError
// ...or returns undefined when assert is false:
normalizeSemver("nope", false); // undefined
```

### Parse

```typescript
parseSemver("1.2.3-alpha+build");
// { major: 1, minor: 2, patch: 3, prerelease: "alpha", build: "build" }

// Lenient input is normalized first:
parseSemver("v1.2");
// { major: 1, minor: 2, patch: 0, prerelease: "", build: "" }
```

### Compare and sort

```typescript
compareSemver("1.0.0", "2.0.0"); // negative (1.0.0 < 2.0.0)
compareSemver("2.0.0", "1.0.0"); // positive (2.0.0 > 1.0.0)
compareSemver("1.0.0-alpha", "1.0.0"); // negative (prerelease < release)

["1.10.0", "1.2.0", "1.1.0"].toSorted(compareSemver);
// ["1.1.0", "1.2.0", "1.10.0"]
```

Build metadata is ignored when determining precedence (per the semver spec). When
two versions have equal precedence, `compareSemver` falls back to a stable,
string-based tiebreaker on the original inputs — so only identical strings reliably
return `0`. See [API.md](./API.md) for the full details.

## API Reference

For comprehensive API documentation including all signatures, the `ParsedSemver`
type, precedence rules, the tiebreaker behavior, and edge cases, see
[API.md](./API.md).

## License

[MIT](LICENSE)

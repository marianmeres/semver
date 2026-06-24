/**
 * @module
 *
 * Zero-dependency utilities for parsing, normalizing, and comparing
 * "semver-ish" version strings.
 *
 * Version format: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`
 *
 * Input is lenient: MINOR and PATCH are optional (each defaults to `0` on
 * normalization) and an optional leading `v`/`V` is stripped. PRERELEASE and
 * BUILD identifiers are restricted to the semver-spec character set
 * `[0-9A-Za-z-.]`. `compareSemver` follows semver precedence rules and is
 * designed to be passed directly to `Array.prototype.sort`.
 *
 * @example
 * ```ts
 * import { compareSemver, normalizeSemver, parseSemver } from "@marianmeres/semver";
 *
 * normalizeSemver("v1.2");     // "1.2.0"
 * normalizeSemver("7-rc.1");   // "7.0.0-rc.1"
 *
 * parseSemver("1.2.3-alpha+build");
 * // { major: 1, minor: 2, patch: 3, prerelease: "alpha", build: "build" }
 *
 * compareSemver("1.0.0", "2.0.0"); // negative number (1.0.0 < 2.0.0)
 * ["1.10.0", "1.2.0", "1.1.0"].toSorted(compareSemver);
 * // ["1.1.0", "1.2.0", "1.10.0"]
 * ```
 */
export * from "./semver.ts";

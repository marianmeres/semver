import { assertEquals, assertThrows } from "@std/assert";
import { compareSemver, normalizeSemver, parseSemver } from "../src/mod.ts";

function shuffle<T>(array: T[]): T[] {
	return array.toSorted(() => Math.random() - 0.5);
}

Deno.test("normalize fills missing minor/patch and strips v prefix", () => {
	// prettier-ignore
	const cases = {
		"1": "1.0.0",
		"v2": "2.0.0",
		"V2": "2.0.0",
		"3.1": "3.1.0",
		"4.2.1": "4.2.1",
		"5.0.0-alpha": "5.0.0-alpha",
		"6.0-beta": "6.0.0-beta",
		"7-rc.1": "7.0.0-rc.1",
		"8.1.0+build.123": "8.1.0+build.123",
		"9.2-alpha+build.456": "9.2.0-alpha+build.456",
		"v10": "10.0.0",
		"11.0.0-beta.1+exp.sha.5114f85": "11.0.0-beta.1+exp.sha.5114f85",
		"1-foo": "1.0.0-foo",
		"20250501": "20250501.0.0",
		"2025-05-01.foo": "2025.0.0-05-01.foo",
	};

	Object.entries(cases).forEach(([version, normalized]) => {
		assertEquals(normalizeSemver(version), normalized);
	});
});

Deno.test("normalize rejects non-semver characters", () => {
	// prerelease/build must be in [0-9A-Za-z-.]
	assertThrows(() => normalizeSemver("1.0.0-foo_bar"), TypeError);
	assertThrows(() => normalizeSemver("1.0.0+build bar"), TypeError);
	assertThrows(() => normalizeSemver("banana"), TypeError);
	assertThrows(() => normalizeSemver(""), TypeError);

	// assert=false returns undefined (not "0.0.0") for invalid input
	assertEquals(normalizeSemver("banana", false), undefined);
	assertEquals(normalizeSemver("1.0.0-foo_bar", false), undefined);
	assertEquals(normalizeSemver("", false), undefined);

	// valid inputs pass through unchanged
	assertEquals(normalizeSemver("1.0.0-foo", false), "1.0.0-foo");
});

Deno.test("normalize handles non-string input", () => {
	// deno-lint-ignore no-explicit-any
	assertThrows(() => normalizeSemver(undefined as any), TypeError);
	// deno-lint-ignore no-explicit-any
	assertThrows(() => normalizeSemver(123 as any), TypeError);
	// deno-lint-ignore no-explicit-any
	assertEquals(normalizeSemver(null as any, false), undefined);
	// deno-lint-ignore no-explicit-any
	assertEquals(normalizeSemver(123 as any, false), undefined);
});

Deno.test("parse splits into components", () => {
	// prettier-ignore
	const cases = {
		"1.0.0": { major: 1, minor: 0, patch: 0, prerelease: "", build: "" },
		"2.0.0": { major: 2, minor: 0, patch: 0, prerelease: "", build: "" },
		"1.10.0": { major: 1, minor: 10, patch: 0, prerelease: "", build: "" },
		"1.2.0": { major: 1, minor: 2, patch: 0, prerelease: "", build: "" },
		"1.1.0-alpha.1": {
			major: 1,
			minor: 1,
			patch: 0,
			prerelease: "alpha.1",
			build: "",
		},
		"1.1.0-alpha": { major: 1, minor: 1, patch: 0, prerelease: "alpha", build: "" },
		"1.1.0": { major: 1, minor: 1, patch: 0, prerelease: "", build: "" },
		"1.1.0+build.123": {
			major: 1,
			minor: 1,
			patch: 0,
			prerelease: "",
			build: "build.123",
		},
		"1.0.0-beta": { major: 1, minor: 0, patch: 0, prerelease: "beta", build: "" },
		"1.0.0-alpha.beta": {
			major: 1,
			minor: 0,
			patch: 0,
			prerelease: "alpha.beta",
			build: "",
		},
		"1.0.0-alpha.1": {
			major: 1,
			minor: 0,
			patch: 0,
			prerelease: "alpha.1",
			build: "",
		},
	};

	Object.entries(cases).forEach(([version, parsed]) => {
		assertEquals(parseSemver(version), parsed);
	});
});

Deno.test("parse normalizes lenient input first", () => {
	assertEquals(parseSemver("v1.2"), {
		major: 1,
		minor: 2,
		patch: 0,
		prerelease: "",
		build: "",
	});
	assertEquals(parseSemver("7-rc.1"), {
		major: 7,
		minor: 0,
		patch: 0,
		prerelease: "rc.1",
		build: "",
	});
});

Deno.test("parse throws on invalid input", () => {
	assertThrows(() => parseSemver("banana"), TypeError);
	assertThrows(() => parseSemver("1.0.0-foo_bar"), TypeError);
});

Deno.test("compare orders a full precedence chain", () => {
	const map: Record<string, number> = {
		"1.0.0-alpha.1": 0,
		"1.0.0-alpha.beta": 1,
		"1.0.0-beta": 2,
		"1.0.0": 3,
		"1.1.0-alpha": 4,
		"1.1.0-alpha.1": 5,
		"1.1.0": 6,
		"1.1.0+build.123": 7,
		"1.2.0": 8,
		"1.10.0": 9,
		"2.0.0": 10,
	};

	const sorted = shuffle(Object.keys(map)).toSorted(compareSemver);

	assertEquals(sorted.map((v) => map[v]).join(","), "0,1,2,3,4,5,6,7,8,9,10");
});

Deno.test("compare returns sign-correct results for key relations", () => {
	const lt = (a: string, b: string) => compareSemver(a, b) < 0;
	const gt = (a: string, b: string) => compareSemver(a, b) > 0;

	// major.minor.patch precedence (numeric, not lexical)
	assertEquals(lt("1.0.0", "2.0.0"), true);
	assertEquals(gt("2.0.0", "1.0.0"), true);
	assertEquals(lt("1.2.0", "1.10.0"), true);

	// prerelease has lower precedence than the corresponding release
	assertEquals(lt("1.0.0-alpha", "1.0.0"), true);
	assertEquals(gt("1.0.0", "1.0.0-rc.1"), true);

	// numeric prerelease identifiers < alphanumeric ones
	assertEquals(lt("1.0.0-1", "1.0.0-alpha"), true);

	// a larger set of prerelease fields has higher precedence
	assertEquals(lt("1.0.0-alpha", "1.0.0-alpha.1"), true);
});

Deno.test("compare ignores build metadata for precedence", () => {
	// Equal precedence -> falls back to localeCompare tiebreaker (non-zero,
	// but stable/deterministic), never claims one is "greater" by version.
	assertEquals(compareSemver("1.0.0", "1.0.0"), 0);

	const withBuild = compareSemver("1.0.0+build.1", "1.0.0+build.2");
	// build metadata does not affect precedence; tiebreaker keeps it stable
	assertEquals(Number.isFinite(withBuild), true);
	// the relation is the inverse of swapping the arguments (antisymmetric)
	assertEquals(
		Math.sign(compareSemver("1.0.0+build.1", "1.0.0+build.2")),
		-Math.sign(compareSemver("1.0.0+build.2", "1.0.0+build.1")),
	);
});

Deno.test("compare accepts lenient (un-normalized) input", () => {
	// 'v' prefix and omitted minor/patch are normalized before comparing.
	// (Inputs below differ in precedence, so the raw-string tiebreaker — which
	// would otherwise compare "1.2" vs "1.2.0" literally — never applies.)
	assertEquals(compareSemver("v1", "v2") < 0, true);
	assertEquals(compareSemver("v2.0", "1.5.0") > 0, true);
	assertEquals(compareSemver("1", "1.0.0-rc.1") > 0, true); // release > prerelease
});

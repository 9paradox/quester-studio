import { describe, expect, test } from "bun:test";
import { isCookieJarEnabled, mergeHttpSettings } from "./settings.js";

describe("mergeHttpSettings", () => {
	test("merges headers with flow overriding workspace keys", () => {
		const merged = mergeHttpSettings(
			{ defaultHeaders: { Accept: "application/json", "X-Ws": "1" } },
			{ defaultHeaders: { "X-Flow": "2", Accept: "text/plain" } },
		);
		expect(merged.defaultHeaders).toEqual({
			Accept: "text/plain",
			"X-Ws": "1",
			"X-Flow": "2",
		});
	});

	test("flow timeout overrides workspace; 0 is preserved", () => {
		expect(
			mergeHttpSettings({ defaultHeaders: {}, timeoutMs: 5000 }, undefined)
				.timeoutMs,
		).toBe(5000);
		expect(
			mergeHttpSettings(
				{ defaultHeaders: {}, timeoutMs: 5000 },
				{ defaultHeaders: {}, timeoutMs: 0 },
			).timeoutMs,
		).toBe(0);
	});

	test("inherits maxResponseBytes, proxyUrl, caFile, verifyTls, cookieJar", () => {
		const merged = mergeHttpSettings(
			{
				defaultHeaders: {},
				maxResponseBytes: 1024,
				proxyUrl: "http://proxy:8080",
				caFile: "certs/ca.pem",
				verifyTls: true,
				cookieJar: false,
			},
			{ defaultHeaders: {}, maxResponseBytes: 0, verifyTls: false },
		);
		expect(merged.maxResponseBytes).toBe(0);
		expect(merged.proxyUrl).toBe("http://proxy:8080");
		expect(merged.caFile).toBe("certs/ca.pem");
		expect(merged.verifyTls).toBe(false);
		expect(merged.cookieJar).toBe(false);
	});

	test("empty string proxyUrl/caFile from flow clears workspace", () => {
		const merged = mergeHttpSettings(
			{
				defaultHeaders: {},
				proxyUrl: "http://proxy:8080",
				caFile: "certs/ca.pem",
			},
			{ defaultHeaders: {}, proxyUrl: "", caFile: "" },
		);
		expect(merged.proxyUrl).toBe("");
		expect(merged.caFile).toBe("");
	});
});

describe("isCookieJarEnabled", () => {
	test("defaults to true when unset", () => {
		expect(isCookieJarEnabled(undefined)).toBe(true);
		expect(isCookieJarEnabled({ defaultHeaders: {} })).toBe(true);
	});

	test("respects explicit false", () => {
		expect(isCookieJarEnabled({ defaultHeaders: {}, cookieJar: false })).toBe(
			false,
		);
	});
});

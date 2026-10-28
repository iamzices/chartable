// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, expect, test, vi } from "vitest";

const { dependencies } = JSON.parse(readFileSync("package.json", "utf8"));
const PLOTLY = `https://cdn.jsdelivr.net/npm/plotly.js-basic-dist-min@${dependencies["plotly.js-basic-dist-min"]}/plotly-basic.min.js`;
const TABULATOR = `https://cdn.jsdelivr.net/npm/tabulator-tables@${dependencies["tabulator-tables"]}/dist/js/tabulator.min.js`;

let cdn: typeof import("./libs.cdn");

const script = () => document.querySelector("script");

beforeEach(async () => {
	vi.unstubAllGlobals();
	vi.resetModules();
	cdn = await import("./libs.cdn");
	document.head.replaceChildren();
});

test("loads the Plotly version the npm build installs", async () => {
	const loaded = cdn.plotly();
	expect(script()?.src).toBe(PLOTLY);
	vi.stubGlobal("Plotly", "Plotly");
	script()?.dispatchEvent(new Event("load"));
	expect(await loaded).toBe("Plotly");
});

test("loads the Tabulator version the npm build installs, once", async () => {
	const loaded = Promise.all([cdn.tabulator(), cdn.tabulator()]);
	expect(document.querySelectorAll("script")).toHaveLength(1);
	expect(script()?.src).toBe(TABULATOR);
	vi.stubGlobal("Tabulator", "Tabulator");
	script()?.dispatchEvent(new Event("load"));
	expect(await loaded).toEqual(["Tabulator", "Tabulator"]);
});

test("retries a failed load", async () => {
	const failed = cdn.plotly();
	script()?.dispatchEvent(new Event("error"));
	await expect(failed).rejects.toThrow(`Chartable: failed to load ${PLOTLY}`);
	expect(script()).toBeNull();
	cdn.plotly();
	expect(script()).not.toBeNull();
});

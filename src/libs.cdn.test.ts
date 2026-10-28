// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, expect, test, vi } from "vitest";

const { dependencies } = JSON.parse(readFileSync("package.json", "utf8"));
const PLOTLY = `https://cdn.jsdelivr.net/npm/plotly.js-basic-dist-min@${dependencies["plotly.js-basic-dist-min"]}/plotly-basic.min.js`;
const TABULATOR = `https://cdn.jsdelivr.net/npm/tabulator-tables@${dependencies["tabulator-tables"]}/dist/js/tabulator.min.js`;

const sri = (path: string) =>
	`sha384-${createHash("sha384")
		.update(readFileSync(`node_modules/${path}`))
		.digest("base64")}`;

let cdn: typeof import("./libs.cdn");

const script = () => document.querySelector("script");

beforeEach(async () => {
	vi.unstubAllGlobals();
	vi.resetModules();
	cdn = await import("./libs.cdn");
	document.head.replaceChildren();
});

test("loads the Plotly the npm build installs and checks it", async () => {
	const loaded = cdn.plotly();
	expect(script()?.src).toBe(PLOTLY);
	expect(script()?.integrity).toBe(
		sri("plotly.js-basic-dist-min/plotly-basic.min.js"),
	);
	expect(script()?.crossOrigin).toBe("anonymous");
	vi.stubGlobal("Plotly", "Plotly");
	script()?.dispatchEvent(new Event("load"));
	expect(await loaded).toBe("Plotly");
});

test("loads the Tabulator the npm build installs once and checks it", async () => {
	const loaded = Promise.all([cdn.tabulator(), cdn.tabulator()]);
	expect(document.querySelectorAll("script")).toHaveLength(1);
	expect(script()?.src).toBe(TABULATOR);
	expect(script()?.integrity).toBe(
		sri("tabulator-tables/dist/js/tabulator.min.js"),
	);
	vi.stubGlobal("Tabulator", "Tabulator");
	script()?.dispatchEvent(new Event("load"));
	expect(await loaded).toEqual(["Tabulator", "Tabulator"]);
});

test("uses Plotly and Tabulator already on the page", async () => {
	vi.stubGlobal("Plotly", "page Plotly");
	vi.stubGlobal("Tabulator", "page Tabulator");
	expect(await cdn.plotly()).toBe("page Plotly");
	expect(await cdn.tabulator()).toBe("page Tabulator");
	expect(script()).toBeNull();
});

test("retries a failed load", async () => {
	const failed = cdn.plotly();
	script()?.dispatchEvent(new Event("error"));
	await expect(failed).rejects.toThrow(`Chartable: failed to load ${PLOTLY}`);
	expect(script()).toBeNull();
	cdn.plotly();
	expect(script()).not.toBeNull();
});

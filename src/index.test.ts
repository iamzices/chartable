// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";

let render: typeof import(".").render;

const spec = { columns: ["month", "visits"], rows: [["Jan", 1]] };
const chart = { ...spec, title: "Visits", kind: "bar" } as const;
const plotly = () => ({
	newPlot: vi.fn(),
	purge: vi.fn(),
	Plots: { resize: vi.fn() },
});

class Observer {
	observe() {}
	disconnect() {}
}

class Table {
	on(_: string, built: () => void) {
		built();
	}
	destroy() {}
}

const loadAll = () => {
	for (const el of document.head.querySelectorAll("script, style"))
		el.dispatchEvent(new Event("load"));
};

const button = (title: string) =>
	document.querySelector<HTMLButtonElement>(`button[title="${title}"]`);

beforeEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.stubGlobal("ResizeObserver", Observer);
	vi.resetModules();
	({ render } = await import("."));
	document.head.replaceChildren();
	document.body.innerHTML = '<div id="c"></div>';
});

test("rejects specs without columns and rows arrays", async () => {
	await expect(render("c", { columns: ["a"] } as never)).rejects.toThrow(
		"Chartable: spec needs columns and rows arrays",
	);
});

test("rejects a missing container", async () => {
	await expect(render("missing", spec)).rejects.toThrow(
		"Chartable: container not found",
	);
});

test("draws a chart into a card once Plotly loads", async () => {
	const drawn = render("c", chart);
	const Plotly = plotly();
	vi.stubGlobal("Plotly", Plotly);
	loadAll();
	await drawn;
	expect(document.querySelector("#c .ct h2")?.textContent).toBe("Visits");
	expect(Plotly.newPlot).toHaveBeenCalledWith(
		document.querySelector(".ct-body"),
		[expect.objectContaining({ type: "bar", x: ["Jan"], y: [1] })],
		expect.any(Object),
		expect.any(Object),
	);
});

test("draws a table with column indexes as fields", async () => {
	const drawn = render("c", spec);
	const Tabulator = vi.fn(Table);
	vi.stubGlobal("Tabulator", Tabulator);
	loadAll();
	await drawn;
	expect(Tabulator).toHaveBeenCalledWith(
		expect.any(HTMLElement),
		expect.objectContaining({
			data: [{ 0: "Jan", 1: 1 }],
			columns: [
				{ title: "month", field: "0" },
				{ title: "visits", field: "1" },
			],
		}),
	);
});

test("removes a chart and stops resizing it", async () => {
	const disconnect = vi.spyOn(Observer.prototype, "disconnect");
	const drawn = render("c", chart);
	const Plotly = plotly();
	vi.stubGlobal("Plotly", Plotly);
	loadAll();
	const body = document.querySelector(".ct-body");
	(await drawn)();
	expect(disconnect).toHaveBeenCalled();
	expect(Plotly.purge).toHaveBeenCalledWith(body);
	expect(document.querySelector(".ct")).toBeNull();
});

test("removes a table", async () => {
	const destroy = vi.spyOn(Table.prototype, "destroy");
	const drawn = render("c", spec);
	vi.stubGlobal("Tabulator", Table);
	loadAll();
	(await drawn)();
	expect(destroy).toHaveBeenCalled();
	expect(document.querySelector(".ct")).toBeNull();
});

test("waits for the page to load before finding the container", async () => {
	vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
	document.body.replaceChildren();
	const drawn = render("c", chart);
	document.body.innerHTML = '<div id="c"></div>';
	dispatchEvent(new Event("DOMContentLoaded"));
	await vi.waitFor(() =>
		expect(document.querySelector("script")).not.toBeNull(),
	);
	vi.stubGlobal("Plotly", plotly());
	loadAll();
	await drawn;
	expect(document.querySelector("#c .ct")).not.toBeNull();
});

test("shows a failed load and retries it on the next render", async () => {
	const failed = render("c", chart);
	document.querySelector("script")?.dispatchEvent(new Event("error"));
	await expect(failed).rejects.toThrow("Chartable: failed to load");
	expect(document.querySelector(".ct-body")?.textContent).toMatch(
		/^Chartable: failed to load/,
	);
	expect(document.querySelector("script")).toBeNull();
	render("c", chart);
	expect(document.querySelector("script")).not.toBeNull();
});

test("copies the data as tab-separated text", async () => {
	const writeText = vi.fn(async () => {});
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	render("c", spec);
	button("Copy data")?.click();
	await vi.waitFor(() => expect(button("Copied")).not.toBeNull());
	expect(writeText).toHaveBeenCalledWith("month\tvisits\r\nJan\t1");
});

test("falls back to execCommand and shows when copying fails", async () => {
	vi.stubGlobal("navigator", {
		clipboard: { writeText: vi.fn(async () => Promise.reject()) },
	});
	document.execCommand = vi.fn(() => false);
	render("c", spec);
	button("Copy data")?.click();
	await vi.waitFor(() => expect(button("Copy failed")).not.toBeNull());
	expect(document.execCommand).toHaveBeenCalledWith("copy");
});

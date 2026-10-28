// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { render } from ".";

const { Plotly, Table, Tabulator } = vi.hoisted(() => {
	class Table {
		on(_: string, built: () => void) {
			built();
		}
		destroy() {}
	}
	const Plotly = {
		newPlot: vi.fn(),
		purge: vi.fn(),
		Plots: { resize: vi.fn() },
	};
	return { Plotly, Table, Tabulator: vi.fn(Table) };
});
vi.mock("plotly.js-basic-dist-min", () => ({ default: Plotly }));
vi.mock("tabulator-tables", () => ({ TabulatorFull: Tabulator }));

const spec = { columns: ["month", "visits"], rows: [["Jan", 1]] };
const chart = { ...spec, title: "Visits", kind: "bar" } as const;

class Observer {
	observe() {}
	disconnect() {}
}

const button = (title: string) =>
	document.querySelector<HTMLButtonElement>(`button[title="${title}"]`);

beforeEach(() => {
	vi.clearAllMocks();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.stubGlobal("ResizeObserver", Observer);
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

test("draws a chart into a card", async () => {
	await render("c", chart);
	expect(document.querySelector("#c .ct h2")?.textContent).toBe("Visits");
	expect(Plotly.newPlot).toHaveBeenCalledWith(
		document.querySelector(".ct-body"),
		[expect.objectContaining({ type: "bar", x: ["Jan"], y: [1] })],
		expect.any(Object),
		expect.any(Object),
	);
});

test("draws a table with column indexes as fields", async () => {
	await render("c", spec);
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
	const remove = await render("c", chart);
	const body = document.querySelector(".ct-body");
	remove();
	expect(disconnect).toHaveBeenCalled();
	expect(Plotly.purge).toHaveBeenCalledWith(body);
	expect(document.querySelector(".ct")).toBeNull();
});

test("removes a table", async () => {
	const destroy = vi.spyOn(Table.prototype, "destroy");
	(await render("c", spec))();
	expect(destroy).toHaveBeenCalled();
	expect(document.querySelector(".ct")).toBeNull();
});

test("waits for the page to load before finding the container", async () => {
	vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
	document.body.replaceChildren();
	const drawn = render("c", chart);
	document.body.innerHTML = '<div id="c"></div>';
	dispatchEvent(new Event("DOMContentLoaded"));
	await drawn;
	expect(document.querySelector("#c .ct")).not.toBeNull();
});

test("shows errors in the card", async () => {
	Plotly.newPlot.mockRejectedValueOnce(new Error("Chartable: failed"));
	await expect(render("c", chart)).rejects.toThrow("Chartable: failed");
	expect(document.querySelector(".ct-body")?.textContent).toBe(
		"Chartable: failed",
	);
});

test("copies the data as tab-separated text", async () => {
	const writeText = vi.fn(async () => {});
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	await render("c", spec);
	button("Copy data")?.click();
	await vi.waitFor(() => expect(button("Copied")).not.toBeNull());
	expect(writeText).toHaveBeenCalledWith("month\tvisits\r\nJan\t1");
});

test("falls back to execCommand and shows when copying fails", async () => {
	vi.stubGlobal("navigator", {
		clipboard: { writeText: vi.fn(async () => Promise.reject()) },
	});
	document.execCommand = vi.fn(() => false);
	await render("c", spec);
	button("Copy data")?.click();
	await vi.waitFor(() => expect(button("Copy failed")).not.toBeNull());
	expect(document.execCommand).toHaveBeenCalledWith("copy");
});

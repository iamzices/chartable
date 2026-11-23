// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { render } from ".";

const { Mermaid, Plotly, Table, Tabulator } = vi.hoisted(() => {
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
	const Mermaid = {
		initialize: vi.fn(),
		render: vi.fn(async () => ({ svg: "<svg></svg>" })),
	};
	return { Mermaid, Plotly, Table, Tabulator: vi.fn(Table) };
});
vi.mock("mermaid", () => ({ default: Mermaid }));
vi.mock("plotly.js-basic-dist-min", () => ({ default: Plotly }));
vi.mock("tabulator-tables", () => ({ TabulatorFull: Tabulator }));

const spec = { columns: ["month", "visits"], rows: [["Jan", 1]] };
const chart = { ...spec, title: "Visits", kind: "bar" } as const;
const diagram = { kind: "mermaid", code: "flowchart LR; A-->B" } as const;

class Observer {
	observe() {}
	disconnect() {}
}

HTMLElement.prototype.togglePopover = vi.fn();
HTMLElement.prototype.hidePopover = vi.fn();

const item = (text: string) =>
	[...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
		(el) => el.textContent === text,
	);

const status = () => document.querySelector('[role="status"]')?.textContent;

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

test("rejects diagrams without code", async () => {
	await expect(render("c", { kind: "mermaid" } as never)).rejects.toThrow(
		"Chartable: mermaid spec needs a code string",
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
	expect(document.querySelector("figure.ct")?.ariaLabel).toBe("Visits");
	expect(Plotly.newPlot).toHaveBeenCalledWith(
		document.querySelector(".ct-body"),
		[expect.objectContaining({ type: "bar", x: ["Jan"], y: [1] })],
		expect.any(Object),
		expect.any(Object),
	);
});

test("draws a table with column indexes as fields", async () => {
	await render("c", spec);
	expect(document.querySelector("figure.ct")?.hasAttribute("aria-label")).toBe(
		false,
	);
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

test("draws a diagram in strict mode", async () => {
	await render("c", diagram);
	expect(Mermaid.initialize).toHaveBeenCalledWith(
		expect.objectContaining({
			securityLevel: "strict",
			suppressErrorRendering: true,
		}),
	);
	expect(Mermaid.render).toHaveBeenCalledWith(expect.any(String), diagram.code);
	expect(document.querySelector(".ct-body")?.innerHTML).toBe("<svg></svg>");
});

test("downloads a diagram only once it draws", async () => {
	await render("c", diagram);
	expect(item("Download")).toHaveProperty("disabled", false);
	document.body.innerHTML = '<div id="c"></div>';
	Mermaid.render.mockRejectedValueOnce(new Error("Parse error"));
	await expect(render("c", diagram)).rejects.toThrow("Parse error");
	expect(item("Download")).toHaveProperty("disabled", true);
});

test("removes a diagram", async () => {
	(await render("c", diagram))();
	expect(document.querySelector(".ct")).toBeNull();
});

async function drawDiagram() {
	Mermaid.render.mockResolvedValueOnce({
		svg: '<svg viewBox="0 0 100 80"></svg>',
	});
	await render("c", diagram);
	const body = document.querySelector(".ct-body") as HTMLElement;
	const svg = body.firstElementChild as SVGSVGElement;
	// A 200px square fits the diagram at 2x, letterboxed 20px top and bottom.
	const box = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect;
	body.getBoundingClientRect = box;
	svg.getBoundingClientRect = box;
	return { body, svg };
}

const tool = (label: string) =>
	document.querySelector<HTMLElement>(`[aria-label="${label}"]`);

test("zooms a diagram around its center and back to fit", async () => {
	const { body, svg } = await drawDiagram();
	tool("Zoom in")?.click();
	expect([svg.style.width, svg.style.height]).toEqual(["300px", "240px"]);
	expect([body.scrollLeft, body.scrollTop]).toEqual([50, 20]);
	tool("Zoom out")?.click();
	expect(svg.style.width).toBe("");
});

test("zooms a diagram on Ctrl+wheel and resets it on double click", async () => {
	const { body, svg } = await drawDiagram();
	const wheel = (ctrlKey: boolean) => {
		const e = new WheelEvent("wheel", {
			ctrlKey,
			deltaY: -100,
			cancelable: true,
		});
		body.dispatchEvent(e);
		return e.defaultPrevented;
	};
	expect(wheel(false)).toBe(false);
	expect(svg.style.width).toBe("");
	expect(wheel(true)).toBe(true);
	expect(svg.style.width).not.toBe("");
	svg.dispatchEvent(new MouseEvent("dblclick"));
	expect(svg.style.width).toBe("");
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

test("opens the menu at the pointer on right click", async () => {
	await render("c", chart);
	const e = new MouseEvent("contextmenu", {
		bubbles: true,
		cancelable: true,
		clientX: 10,
		clientY: 20,
	});
	document.querySelector(".ct-body")?.dispatchEvent(e);
	const menu = document.querySelector<HTMLElement>('[role="menu"]');
	expect(e.defaultPrevented).toBe(true);
	expect(menu?.togglePopover).toHaveBeenCalledWith(true);
	expect([menu?.style.left, menu?.style.top]).toEqual(["10px", "20px"]);
	expect(document.activeElement).toBe(item("Copy"));
	menu?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
	expect(document.activeElement).toBe(item("Download"));
	menu?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
	expect(document.activeElement).toBe(item("Copy"));
});

test("copies the data as tab-separated text", async () => {
	const writeText = vi.fn(async () => {});
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	await render("c", spec);
	item("Copy")?.click();
	await vi.waitFor(() => expect(status()).toBe("Copied"));
	expect(writeText).toHaveBeenCalledWith("month\tvisits\r\nJan\t1");
});

test("copies a diagram's code", async () => {
	const writeText = vi.fn(async () => {});
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	await render("c", diagram);
	item("Copy")?.click();
	await vi.waitFor(() => expect(status()).toBe("Copied"));
	expect(writeText).toHaveBeenCalledWith(diagram.code);
});

test("falls back to execCommand and shows when copying fails", async () => {
	vi.stubGlobal("navigator", {
		clipboard: { writeText: vi.fn(async () => Promise.reject()) },
	});
	document.execCommand = vi.fn(() => false);
	await render("c", spec);
	item("Copy")?.click();
	await vi.waitFor(() => expect(status()).toBe("Copy failed"));
	expect(document.execCommand).toHaveBeenCalledWith("copy");
});

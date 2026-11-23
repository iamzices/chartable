import { figure } from "./chart";
import { toCsv } from "./csv";
import { mermaid, plotly, tabulator } from "./libs";
import { CSS, MERMAID } from "./style";

export type Cell = string | number | boolean | null;

export interface ChartableSpec {
	/** Header text and CSV filename. */
	title?: string;
	/** Defaults to "table". */
	kind?: "line" | "area" | "bar" | "scatter" | "pie" | "table";
	/**
	 * Column names. Charts use column 0 as x and each other column as a series;
	 * pies use column 0 as labels and column 1 as values.
	 */
	columns: string[];
	/** One array per row, in column order. Use null for a missing value. */
	rows: Cell[][];
}

export interface MermaidSpec {
	/** Header text and SVG filename. */
	title?: string;
	kind: "mermaid";
	/** Mermaid diagram code, such as "flowchart LR; A-->B". */
	code: string;
}

const h = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	props: Partial<HTMLElementTagNameMap[K]> = {},
) => Object.assign(document.createElement(tag), props);

function download(name: string, type: string, ...parts: string[]) {
	const url = URL.createObjectURL(new Blob(parts, { type }));
	h("a", { href: url, download: name }).click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function copy(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Sandboxed iframes usually lack the clipboard-write permission.
		const focused = document.activeElement as HTMLElement | null;
		const area = document.createElement("textarea");
		area.value = text;
		area.readOnly = true;
		area.style.cssText = "position:fixed;opacity:0";
		document.body.append(area);
		area.select();
		const copied = document.execCommand("copy");
		area.remove();
		focused?.focus();
		return copied;
	}
}

/**
 * Zooms the diagram with the card's buttons, Ctrl+wheel or a trackpad pinch,
 * resets it on double click, and lets the body scroll or be dragged to pan.
 */
function zoomable(card: HTMLElement, body: HTMLElement) {
	const svg = body.firstElementChild as SVGSVGElement;
	const fit = svg.style.cssText;
	let zoom = 1;
	const reset = () => {
		zoom = 1;
		svg.style.cssText = fit;
	};
	// Keeps the diagram point under (x, y) in place as far as scrolling allows.
	const scale = (f: number, x: number, y: number) => {
		const next = Math.min(Math.max(zoom * f, 1), 16);
		if (next === 1) return reset();
		f = next / zoom;
		zoom = next;
		const { width, height } = svg.viewBox.baseVal;
		const s = svg.getBoundingClientRect();
		const b = body.getBoundingClientRect();
		// The fitted diagram is letterboxed inside the svg box.
		const k = Math.min(s.width / width, s.height / height);
		const dx = x - s.left - (s.width - width * k) / 2;
		const dy = y - s.top - (s.height - height * k) / 2;
		Object.assign(svg.style, {
			maxWidth: "none",
			width: `${width * k * f}px`,
			height: `${height * k * f}px`,
			cursor: "grab",
		});
		body.scrollLeft = dx * f - (x - b.left);
		body.scrollTop = dy * f - (y - b.top);
	};
	const centered = (f: number) => () => {
		const b = body.getBoundingClientRect();
		scale(f, b.left + b.width / 2, b.top + b.height / 2);
	};
	const tool = (label: string, text: string, onclick: () => void) =>
		h("button", {
			type: "button",
			ariaLabel: label,
			title: label,
			textContent: text,
			onclick,
		});

	body.onwheel = (e) => {
		if (!e.ctrlKey) return;
		e.preventDefault();
		scale(Math.exp(-e.deltaY / 500), e.clientX, e.clientY);
	};
	// Touch and pens scroll natively.
	svg.onpointerdown = (e) => {
		if (zoom > 1 && e.pointerType === "mouse" && !e.button)
			svg.setPointerCapture(e.pointerId);
	};
	svg.onpointermove = (e) => {
		if (!svg.hasPointerCapture(e.pointerId)) return;
		body.scrollLeft -= e.movementX;
		body.scrollTop -= e.movementY;
	};
	svg.ondblclick = reset;
	const tools = h("div", { className: "ct-zoom" });
	tools.append(
		tool("Zoom in", "+", centered(1.5)),
		tool("Zoom out", "−", centered(1 / 1.5)),
		tool("Reset zoom", "↺", reset),
	);
	card.append(tools);
}

let styled = false;
let diagrams = 0;

/**
 * Appends a card with the chart, table or diagram and a right-click menu to
 * copy or download its data to the container, an element or its id, filling
 * its height or 450px without one.
 * Resolves once drawn to a function that removes the card, and throws if the
 * container is missing, the spec has no columns or rows arrays, or a diagram
 * has no code.
 */
export async function render(
	container: HTMLElement | string,
	spec: ChartableSpec | MermaidSpec,
): Promise<() => void> {
	if (spec?.kind === "mermaid") {
		if (typeof spec.code !== "string")
			throw new TypeError("Chartable: mermaid spec needs a code string");
	} else if (
		!Array.isArray(spec?.columns) ||
		!Array.isArray(spec.rows) ||
		!spec.rows.every(Array.isArray)
	)
		throw new TypeError("Chartable: spec needs columns and rows arrays");
	// The usual srcdoc runs its scripts in <head>, before the container exists.
	if (typeof container === "string" && document.readyState === "loading")
		await new Promise((r) =>
			addEventListener("DOMContentLoaded", r, { once: true }),
		);
	const el =
		typeof container === "string"
			? document.getElementById(container)
			: container;
	if (!(el instanceof HTMLElement))
		throw new TypeError("Chartable: container not found");
	const { title, kind = "table" } = spec;
	let svg = "";

	if (!styled) {
		document.head.append(h("style", { textContent: CSS }));
		styled = true;
	}
	const status = h("span", { className: "ct-status", role: "status" });
	const menu = h("div", {
		className: "ct-menu",
		role: "menu",
		popover: "auto",
	});
	const item = (text: string, action: () => void) =>
		h("button", {
			type: "button",
			role: "menuitem",
			textContent: text,
			onclick: () => {
				menu.hidePopover();
				action();
			},
		});
	menu.append(
		item("Copy", async () => {
			const text = spec.kind === "mermaid" ? spec.code : toCsv(spec, "\t");
			status.textContent = (await copy(text)) ? "Copied" : "Copy failed";
			setTimeout(() => {
				status.textContent = "";
			}, 2000);
		}),
		item("Download", () =>
			spec.kind === "mermaid"
				? download(`${title || "diagram"}.svg`, "image/svg+xml", svg)
				: download(
						`${title || "data"}.csv`,
						"text/csv;charset=utf-8",
						"\uFEFF",
						toCsv(spec),
					),
		),
	);
	menu.onkeydown = (e) => {
		const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const items = [...menu.children] as HTMLElement[];
		const i = items.indexOf(document.activeElement as HTMLElement);
		items.at((i + step) % items.length)?.focus();
	};
	const body = h("div", { className: "ct-body" });
	// Focusable so keyboard users can open the menu with the context menu key.
	const card = h("figure", {
		className: "ct",
		ariaLabel: title ?? null,
		tabIndex: 0,
		oncontextmenu: (e) => {
			e.preventDefault();
			menu.togglePopover(true);
			const x = Math.min(e.clientX, innerWidth - menu.offsetWidth);
			const y = Math.min(e.clientY, innerHeight - menu.offsetHeight);
			menu.style.left = `${Math.max(0, x)}px`;
			menu.style.top = `${Math.max(0, y)}px`;
			(menu.firstChild as HTMLElement).focus();
		},
	});
	if (title) card.append(h("h2", { textContent: title }));
	card.append(body, status, menu);
	el.append(card);

	try {
		if (spec.kind === "mermaid") {
			const Mermaid = await mermaid();
			// Set on every render since the page's own Mermaid shares this config.
			Mermaid.initialize({
				...MERMAID,
				securityLevel: "strict",
				suppressErrorRendering: true,
			});
			({ svg } = await Mermaid.render(`ct-mermaid-${++diagrams}`, spec.code));
			body.innerHTML = svg;
			zoomable(card, body);
			return () => card.remove();
		} else if (kind === "table") {
			const Tabulator = await tabulator();
			// Tabulator's inline height would override the body's default height.
			const table = new Tabulator(body.appendChild(h("div")), {
				// Tabulator reads dots in field names as paths, so fields are indexes.
				data: spec.rows.map((row) => ({ ...row })),
				columns: spec.columns.map((name, i) => ({
					title: name,
					field: String(i),
				})),
				columnDefaults: { titleFormatter: "plaintext" },
				layout: "fitDataStretch",
				height: "100%",
				placeholder: "No data",
			});
			await new Promise<void>((r) => table.on("tableBuilt", r));
			return () => {
				table.destroy();
				card.remove();
			};
		} else {
			const fig = figure(spec, kind);
			const Plotly = await plotly();
			await Plotly.newPlot(body, ...fig);
			// Plotly's responsive option only follows window resizes.
			const observer = new ResizeObserver(
				() => body.isConnected && Plotly.Plots.resize(body),
			);
			observer.observe(body);
			return () => {
				observer.disconnect();
				Plotly.purge(body);
				card.remove();
			};
		}
	} catch (e) {
		body.textContent = (e as Error).message;
		throw e;
	}
}

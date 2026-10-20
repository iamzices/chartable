import { figure } from "./chart";
import { toCsv } from "./csv";
import { CHECK, COPY, CSS, DOWNLOAD } from "./style";

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

declare const Plotly: {
	newPlot(el: HTMLElement, ...figure: readonly unknown[]): Promise<unknown>;
};
declare const Tabulator: new (
	el: HTMLElement,
	options: object,
) => { on(event: "tableBuilt", callback: () => void): void };

const PLOTLY =
	"https://cdn.jsdelivr.net/npm/plotly.js-basic-dist-min@2.35.2/plotly-basic.min.js";
const TABULATOR = "https://cdn.jsdelivr.net/npm/tabulator-tables@6.6.1/dist";

const h = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	props: Partial<HTMLElementTagNameMap[K]> = {},
) => Object.assign(document.createElement(tag), props);

const loads = new Map<string, Promise<unknown>>();

function load(url: string) {
	let loaded = loads.get(url);
	if (!loaded) {
		const el = url.endsWith(".css")
			? h("style", { textContent: `@import url("${url}") layer(tabulator);` })
			: h("script", { src: url });
		loaded = new Promise((resolve, reject) => {
			el.onload = resolve;
			el.onerror = () => reject(new Error(`Chartable: failed to load ${url}`));
		});
		document.head.append(el);
		loads.set(url, loaded);
	}
	return loaded;
}

function download(spec: ChartableSpec) {
	const url = URL.createObjectURL(
		new Blob(["\uFEFF", toCsv(spec)], { type: "text/csv;charset=utf-8" }),
	);
	h("a", { href: url, download: `${spec.title || "data"}.csv` }).click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function copy(text: string) {
	try {
		await navigator.clipboard.writeText(text);
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
		if (!copied) throw new Error("Chartable: copy failed");
	}
}

const label = (button: HTMLButtonElement, text: string, icon: string) =>
	Object.assign(button, { title: text, ariaLabel: text, innerHTML: icon });

let styled = false;

/**
 * Appends a card with the chart or table and its copy and download buttons.
 * Resolves once drawn, and throws if the spec has no columns or rows arrays.
 */
export async function render(spec: ChartableSpec): Promise<void> {
	if (
		!Array.isArray(spec?.columns) ||
		!Array.isArray(spec.rows) ||
		!spec.rows.every(Array.isArray)
	)
		throw new TypeError("Chartable: spec needs columns and rows arrays");
	const { title, kind = "table" } = spec;

	if (!styled) {
		document.head.append(h("style", { textContent: CSS }));
		styled = true;
	}
	const head = h("div", { className: "ct-head" });
	if (title) head.append(h("h2", { textContent: title }));
	const copyButton = h("button", {
		type: "button",
		onclick: async () => {
			await copy(toCsv(spec, "\t"));
			label(copyButton, "Copied", CHECK);
			setTimeout(() => label(copyButton, "Copy data", COPY), 2000);
		},
	});
	const downloadButton = h("button", {
		type: "button",
		onclick: () => download(spec),
	});
	const actions = h("div", { className: "ct-actions" });
	actions.append(
		label(copyButton, "Copy data", COPY),
		label(downloadButton, "Download CSV", DOWNLOAD),
	);
	head.append(actions);
	const body = h("div");
	const card = h("div", { className: "ct" });
	card.append(head, body);
	// The usual two-script srcdoc runs in <head>, before <body> exists.
	if (!document.body)
		await new Promise((r) =>
			addEventListener("DOMContentLoaded", r, { once: true }),
		);
	document.body.append(card);

	try {
		if (kind === "table") {
			await Promise.all([
				load(`${TABULATOR}/js/tabulator.min.js`),
				load(`${TABULATOR}/css/tabulator.min.css`),
			]);
			const table = new Tabulator(body, {
				// Tabulator reads dots in field names as paths, so fields are indexes.
				data: spec.rows.map((row) => ({ ...row })),
				columns: spec.columns.map((name, i) => ({
					title: name,
					field: String(i),
				})),
				columnDefaults: { titleFormatter: "plaintext" },
				layout: "fitDataStretch",
				maxHeight: "384px",
				placeholder: "No data",
			});
			await new Promise<void>((r) => table.on("tableBuilt", r));
		} else {
			const fig = figure(spec, kind);
			await load(PLOTLY);
			body.className = "ct-chart";
			await Plotly.newPlot(body, ...fig);
		}
	} catch (e) {
		body.textContent = (e as Error).message;
		throw e;
	}
}

import { figure } from "./chart";
import { toCsv } from "./csv";
import { plotly, tabulator } from "./libs";
import { CHECK, COPY, CROSS, CSS, DOWNLOAD } from "./style";

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

const h = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	props: Partial<HTMLElementTagNameMap[K]> = {},
) => Object.assign(document.createElement(tag), props);

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

const label = (button: HTMLButtonElement, text: string, icon: string) =>
	Object.assign(button, { title: text, ariaLabel: text, innerHTML: icon });

let styled = false;

/**
 * Appends a card with the chart or table and its copy and download buttons to
 * the container, an element or its id, filling its height or 450px without one.
 * Resolves once drawn to a function that removes the card, and throws if the
 * container is missing or the spec has no columns or rows arrays.
 */
export async function render(
	container: HTMLElement | string,
	spec: ChartableSpec,
): Promise<() => void> {
	if (
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

	if (!styled) {
		document.head.append(h("style", { textContent: CSS }));
		styled = true;
	}
	const head = h("div", { className: "ct-head" });
	if (title) head.append(h("h2", { textContent: title }));
	const status = h("span", { className: "ct-status", role: "status" });
	const copyButton = h("button", {
		type: "button",
		onclick: async () => {
			if (await copy(toCsv(spec, "\t"))) label(copyButton, "Copied", CHECK);
			else label(copyButton, "Copy failed", CROSS);
			status.textContent = copyButton.title;
			setTimeout(() => {
				label(copyButton, "Copy data", COPY);
				status.textContent = "";
			}, 2000);
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
		status,
	);
	head.append(actions);
	const body = h("div", { className: "ct-body" });
	const card = h("div", { className: "ct" });
	card.append(head, body);
	el.append(card);

	try {
		if (kind === "table") {
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

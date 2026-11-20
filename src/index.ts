import { figure } from "./chart";
import { toCsv } from "./csv";
import { plotly, tabulator } from "./libs";
import { CSS } from "./style";

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

let styled = false;

/**
 * Appends a card with the chart or table and a right-click menu to copy or
 * download its data to the container, an element or its id, filling its height
 * or 450px without one.
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
			status.textContent = (await copy(toCsv(spec, "\t")))
				? "Copied"
				: "Copy failed";
			setTimeout(() => {
				status.textContent = "";
			}, 2000);
		}),
		item("Download", () => download(spec)),
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

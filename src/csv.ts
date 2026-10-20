import type { Cell, ChartableSpec } from ".";

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

function cell(v: Cell | undefined, sep: string): string {
	if (v == null) return "";
	let s = String(v);
	// Spreadsheets run text like =1+1 as a formula; numbers like -12.5 are safe.
	if (typeof v === "string" && /^[=+\-@\t\r]/.test(s) && !NUMBER.test(s))
		s = `'${s}`;
	return s.includes(sep) || /["\r\n]/.test(s)
		? `"${s.replaceAll('"', '""')}"`
		: s;
}

export function toCsv({ columns, rows }: ChartableSpec, sep = ","): string {
	return [columns, ...rows]
		.map((row) => columns.map((_, i) => cell(row[i], sep)).join(sep))
		.join("\r\n");
}

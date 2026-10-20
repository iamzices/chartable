import type { Cell, ChartableSpec } from ".";
import { BG, BORDER, CHART, FG, FONT, MUTED_FG } from "./style";

// Plotly treats <b> and similar tags in text as markup and decodes entities.
const text = <T extends Cell>(v: T) =>
	typeof v === "string"
		? v.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
		: v;

const LINE = {
	type: "scatter",
	mode: "lines",
	connectgaps: true,
	line: { width: 2 },
};
const TRACES = {
	line: LINE,
	area: { ...LINE, fill: "tozeroy" },
	scatter: { type: "scatter", mode: "markers" },
	bar: { type: "bar" },
};

export function figure({ columns, rows }: ChartableSpec, kind: string) {
	const col = (i: number) => rows.map((row) => text(row[i] ?? null));
	const x = col(0);
	let data: object[];
	if (kind === "pie")
		data = [
			{
				type: "pie",
				labels: x,
				values: col(1),
				sort: false,
				marker: { line: { color: BG, width: 2 } },
			},
		];
	else if (Object.hasOwn(TRACES, kind))
		data = columns.slice(1).map((name, i) => ({
			...TRACES[kind as keyof typeof TRACES],
			name: text(name),
			x,
			y: col(i + 1),
		}));
	else throw new Error(`Chartable: unknown kind "${kind}"`);

	const layout = {
		font: { family: FONT, size: 12, color: MUTED_FG },
		colorway: CHART,
		piecolorway: CHART,
		paper_bgcolor: "rgba(0,0,0,0)",
		plot_bgcolor: "rgba(0,0,0,0)",
		margin: { t: 8, r: 8, b: 8, l: 8, pad: 8 },
		xaxis: { automargin: true, showgrid: false, zeroline: false },
		yaxis: { automargin: true, gridcolor: BORDER, zeroline: false },
		legend: {
			orientation: "h",
			x: 0.5,
			xanchor: "center",
			y: 0,
			yref: "container",
			yanchor: "bottom",
		},
		hovermode: kind === "scatter" ? "closest" : "x unified",
		hoverlabel: {
			bgcolor: BG,
			bordercolor: BORDER,
			font: { color: FG },
			namelength: -1,
		},
		modebar: { bgcolor: "rgba(0,0,0,0)", color: MUTED_FG, activecolor: FG },
		barcornerradius: 4,
	};
	const config = {
		responsive: true,
		displaylogo: false,
		modeBarButtonsToRemove: ["toImage"],
	};
	return [data, layout, config] as const;
}

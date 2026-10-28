import { expect, test } from "vitest";
import { figure } from "./chart";
import { CHART } from "./style";

const visitors = {
	columns: ["month", "Desktop", "Mobile"],
	rows: [
		["Jan", 186, 80],
		["Feb", 305, null],
		["Mar", 237],
	],
};

test("makes one trace per series sharing column 0 as x", () => {
	const [data] = figure(visitors, "line");
	expect(data).toMatchObject([
		{
			type: "scatter",
			mode: "lines+markers",
			connectgaps: true,
			name: "Desktop",
			x: ["Jan", "Feb", "Mar"],
			y: [186, 305, 237],
		},
		{ name: "Mobile", y: [80, null, null] },
	]);
});

test("fills area charts and connects their gaps", () => {
	const [data] = figure(visitors, "area");
	expect(data).toMatchObject([
		{ fill: "tozeroy", connectgaps: true },
		{ fill: "tozeroy", connectgaps: true },
	]);
});

test("maps bar and scatter kinds", () => {
	expect(figure(visitors, "bar")[0][0]).toMatchObject({ type: "bar" });
	expect(figure(visitors, "scatter")[0][0]).toMatchObject({ mode: "markers" });
	expect(figure(visitors, "scatter")[1].hovermode).toBe("closest");
});

test("uses column 0 as pie labels and column 1 as values", () => {
	const [data] = figure(
		{
			columns: ["group", "count"],
			rows: [
				["A", 12],
				["B", 7],
			],
		},
		"pie",
	);
	expect(data).toEqual([
		expect.objectContaining({
			type: "pie",
			labels: ["A", "B"],
			values: [12, 7],
			sort: false,
		}),
	]);
});

test("applies the chart palette and removes the image button", () => {
	const [, layout, config] = figure(visitors, "line");
	expect(layout.colorway).toEqual(CHART);
	expect(layout.piecolorway).toEqual(CHART);
	expect(config.modeBarButtonsToRemove).toEqual(["toImage"]);
	expect(config.displaylogo).toBe(false);
});

test("escapes text so Plotly shows tags and entities literally", () => {
	const spec = {
		columns: ["<b>x</b>", "a & <i>b</i>"],
		rows: [["<a href=x>r</a>", 1]],
	};
	expect(figure(spec, "bar")[0]).toMatchObject([
		{ name: "a &amp; &lt;i>b&lt;/i>", x: ["&lt;a href=x>r&lt;/a>"], y: [1] },
	]);
	expect(figure(spec, "pie")[0]).toMatchObject([
		{ labels: ["&lt;a href=x>r&lt;/a>"], values: [1] },
	]);
});

test("rejects unknown kinds, including prototype keys", () => {
	expect(() => figure(visitors, "donut")).toThrow(
		'Chartable: unknown kind "donut"',
	);
	expect(() => figure(visitors, "toString")).toThrow("Chartable: unknown kind");
});

test("leaves resizing to the caller instead of a window listener", () => {
	expect(figure(visitors, "line")[2]).not.toHaveProperty("responsive");
});

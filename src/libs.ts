export const plotly = async () =>
	(await import("plotly.js-basic-dist-min")).default;

export const tabulator = async () =>
	(await import("tabulator-tables")).TabulatorFull;

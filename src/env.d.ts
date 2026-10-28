declare module "*.css" {
	const css: string;
	export default css;
}

declare module "plotly.js-basic-dist-min" {
	const Plotly: {
		newPlot(el: HTMLElement, ...figure: readonly unknown[]): Promise<unknown>;
		Plots: { resize(el: HTMLElement): void };
		purge(el: HTMLElement): void;
	};
	export default Plotly;
}

declare module "tabulator-tables" {
	export const TabulatorFull: new (
		el: HTMLElement,
		options: object,
	) => { on(event: "tableBuilt", callback: () => void): void; destroy(): void };
}

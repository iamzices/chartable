declare const Plotly: typeof import("plotly.js-basic-dist-min").default;
declare const Tabulator: typeof import("tabulator-tables").TabulatorFull;

const PLOTLY = {
	src: "https://cdn.jsdelivr.net/npm/plotly.js-basic-dist-min@2.35.2/plotly-basic.min.js",
	integrity:
		"sha384-wQ3lfCxuvLfhHGiSdHF5+e3NZ1zNwEMd8/nII+K7VKChF9llO/OwOcn/aVRkB7az",
};
const TABULATOR = {
	src: "https://cdn.jsdelivr.net/npm/tabulator-tables@6.6.1/dist/js/tabulator.min.js",
	integrity:
		"sha384-G2ks3Wc8ERwZQbUnD+D54IZmFUlgMENIYP7tgDtz5ANc7yNyu+z0+4qn7Iit8jsH",
};

const loads = new Map<string, Promise<unknown>>();

function load({ src, integrity }: typeof PLOTLY) {
	let loaded = loads.get(src);
	if (!loaded) {
		const el = Object.assign(document.createElement("script"), {
			src,
			integrity,
			crossOrigin: "anonymous",
		});
		loaded = new Promise((resolve, reject) => {
			el.onload = resolve;
			el.onerror = () => {
				loads.delete(src);
				el.remove();
				reject(new Error(`Chartable: failed to load ${src}`));
			};
		});
		document.head.append(el);
		loads.set(src, loaded);
	}
	return loaded;
}

export async function plotly() {
	if (typeof Plotly === "undefined") await load(PLOTLY);
	return Plotly;
}

export async function tabulator() {
	if (typeof Tabulator === "undefined") await load(TABULATOR);
	return Tabulator;
}

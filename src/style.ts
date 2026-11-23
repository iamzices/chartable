import TABULATOR from "tabulator-tables/dist/css/tabulator.min.css";

export const FONT =
	'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
export const BG = "#ffffff";
export const FG = "#09090b";
export const MUTED_FG = "#71717b";
export const BORDER = "#e4e4e7";
const MUTED = "#f4f4f5";
const RING = "#9f9fa9";
export const CHART = ["#f54a00", "#009689", "#104e64", "#ffb900", "#fe9a00"];

export const MERMAID = {
	theme: "base",
	look: "classic",
	themeVariables: {
		fontFamily: FONT,
		fontSize: "14px",
		primaryColor: MUTED,
		primaryTextColor: FG,
		primaryBorderColor: RING,
		lineColor: MUTED_FG,
	},
} as const;

// Tabulator's CSS is imported into a layer, so these unlayered rules win.
// The card fills its container's height. Without one, the 344px body makes the
// card 450px tall.
export const CSS = `
@layer tabulator{${TABULATOR}}
.ct{position:relative;box-sizing:border-box;height:100%;margin:0;display:flex;flex-direction:column;gap:24px;padding:24px;background:${BG};color:${FG};font:14px/1.5 ${FONT}}
.ct:focus-visible,.ct-body:focus-visible,.ct-zoom button:focus-visible{outline:3px solid ${RING}80}
.ct h2{margin:0;font-size:16px;font-weight:600;line-height:1}
.ct-status{position:absolute;top:20px;right:24px;padding:0 4px;background:${BG};color:${MUTED_FG};font-size:12px}
.ct-menu{inset:auto;margin:0;min-width:128px;padding:4px;border:1px solid ${BORDER};border-radius:8px;background:${BG};color:${FG};box-shadow:0 4px 6px -1px rgb(0 0 0/.1),0 2px 4px -2px rgb(0 0 0/.1)}
.ct-menu button{display:block;width:100%;padding:6px 8px;border:0;border-radius:6px;background:none;color:inherit;font:inherit;line-height:20px;text-align:left;cursor:default;outline:0}
.ct-menu button:hover,.ct-menu button:focus-visible{background:${MUTED}}
.ct-body{flex:auto;height:344px;min-height:0}
.ct-body:has(>svg){display:flex;overflow:auto}
.ct-body>svg{flex:none;height:100%;margin:auto;user-select:none}
.ct-zoom{position:absolute;right:24px;bottom:24px;display:flex;gap:4px;opacity:0}
.ct:is(:hover,:focus-visible,:has(:focus-visible)) .ct-zoom{opacity:1}
.ct-zoom button{width:28px;height:28px;padding:0;border:1px solid ${BORDER};border-radius:6px;background:${BG};color:${MUTED_FG};font:16px/1 ${FONT};cursor:default}
.ct-zoom button:hover{background:${MUTED};color:${FG}}
.ct .tabulator{border:0;background:none;font-size:14px}
.ct .tabulator-header{border-bottom:1px solid ${BORDER};background:none;color:${FG};font-weight:500}
.ct .tabulator-header .tabulator-col{border-right:0;background:none}
.ct .tabulator-col-content{padding:10px 8px}
.ct .tabulator-arrow{border-top-color:${BORDER};border-bottom-color:${BORDER}}
.ct .tabulator-col[aria-sort=ascending] .tabulator-arrow{border-bottom-color:${MUTED_FG}}
.ct .tabulator-col[aria-sort=descending] .tabulator-arrow{border-top-color:${MUTED_FG}}
.ct .tabulator-col[aria-sort=none] .tabulator-col-sorter{visibility:hidden}
.ct .tabulator-col:hover .tabulator-col-sorter{visibility:visible}
.ct .tabulator-tableholder .tabulator-table{background:none;color:${FG}}
.ct .tabulator-row{border-bottom:1px solid ${BORDER};background:none}
.ct .tabulator-row:last-child{border-bottom:0}
.ct .tabulator-row:hover{background:${MUTED}80;cursor:auto}
.ct .tabulator-cell{padding:8px;border-right:0}
.ct .tabulator-placeholder-contents{color:${MUTED_FG};font-size:14px;font-weight:400}
`;

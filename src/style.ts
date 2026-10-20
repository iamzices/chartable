export const FONT =
	'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
export const BG = "#ffffff";
export const FG = "#09090b";
export const MUTED_FG = "#71717b";
export const BORDER = "#e4e4e7";
const MUTED = "#f4f4f5";
const RING = "#9f9fa9";
export const CHART = ["#f54a00", "#009689", "#104e64", "#ffb900", "#fe9a00"];

const icon = (paths: string) =>
	`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
export const DOWNLOAD = icon(
	'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
);
export const COPY = icon(
	'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
);
export const CHECK = icon('<path d="M20 6 9 17l-5-5"/>');

// Tabulator's CSS is imported into a layer, so these unlayered rules win.
export const CSS = `
.ct{box-sizing:border-box;display:flex;flex-direction:column;gap:24px;padding:24px;border:1px solid ${BORDER};border-radius:14px;background:${BG};color:${FG};font:14px/1.5 ${FONT};box-shadow:0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1)}
.ct-head{display:flex;align-items:center;gap:16px}
.ct h2{margin:0;font-size:16px;font-weight:600;line-height:1}
.ct-actions{display:flex;gap:8px;margin-left:auto}
.ct button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid ${BORDER};border-radius:8px;background:${BG};color:${FG};cursor:pointer;outline:none;box-shadow:0 1px 2px 0 rgb(0 0 0/.05)}
.ct button:hover{background:${MUTED}}
.ct button:focus-visible{border-color:${RING};box-shadow:0 0 0 3px ${RING}80}
.ct button svg{width:16px;height:16px}
.ct-chart{height:320px}
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

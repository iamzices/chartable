import { join } from "node:path";
import { defineConfig, type Options } from "tsup";

const css: Options = { loader: { ".css": "text" }, noExternal: [/\.css$/] };

export default defineConfig([
	{ entry: ["src/index.ts"], format: "esm", dts: true, clean: true, ...css },
	{
		entry: ["src/index.ts"],
		format: "iife",
		globalName: "Chartable",
		minify: true,
		...css,
		esbuildPlugins: [
			{
				name: "cdn",
				setup: (build) =>
					build.onResolve({ filter: /^\.\/libs$/ }, ({ resolveDir }) => ({
						path: join(resolveDir, "libs.cdn.ts"),
					})),
			},
		],
	},
]);

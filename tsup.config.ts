import { defineConfig } from "tsup";

export default defineConfig([
	{ entry: ["src/index.ts"], format: "esm", dts: true, clean: true },
	{
		entry: ["src/index.ts"],
		format: "iife",
		globalName: "Chartable",
		minify: true,
	},
]);

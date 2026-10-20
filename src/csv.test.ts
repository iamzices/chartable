import { expect, test } from "vitest";
import { toCsv } from "./csv";

test("joins header and rows with CRLF and pads ragged rows", () => {
	expect(
		toCsv({
			columns: ["a", "b", "c"],
			rows: [
				[1, true],
				[null, false, 3],
			],
		}),
	).toBe("a,b,c\r\n1,true,\r\n,false,3");
});

test("quotes commas, quotes and newlines", () => {
	expect(
		toCsv({ columns: ["x"], rows: [["a,b"], ['say "hi"'], ["l1\nl2"]] }),
	).toBe('x\r\n"a,b"\r\n"say ""hi"""\r\n"l1\nl2"');
});

test("uses another separator, quoting only cells that contain it", () => {
	expect(toCsv({ columns: ["a", "b"], rows: [["x, y", "t\tu"]] }, "\t")).toBe(
		'a\tb\r\nx, y\t"t\tu"',
	);
});

test("neutralizes formula cells, including in the header", () => {
	expect(
		toCsv({
			columns: ["=cmd"],
			rows: [["=1+1"], ["+1+1"], ["-1+cmd"], ["@SUM(A1)"], ["\tx"], ["\rx"]],
		}),
	).toBe("'=cmd\r\n'=1+1\r\n'+1+1\r\n'-1+cmd\r\n'@SUM(A1)\r\n'\tx\r\n\"'\rx\"");
});

test("keeps negative and signed numbers intact", () => {
	expect(
		toCsv({
			columns: ["n"],
			rows: [[-3.5], ["-3.5"], ["+4"], ["-1e3"], [".5"], ["-.5"]],
		}),
	).toBe("n\r\n-3.5\r\n-3.5\r\n+4\r\n-1e3\r\n.5\r\n-.5");
});

test("keeps Korean text unchanged", () => {
	expect(toCsv({ columns: ["월", "방문자"], rows: [["1월", 186]] })).toBe(
		"월,방문자\r\n1월,186",
	);
});

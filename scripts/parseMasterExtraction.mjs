import fs from "node:fs";

const SOURCE = "C:/Users/eswar/VLC/STREAM/Master extraction.txt";
const DEST = new URL("../src/data/preEwcHistory.js", import.meta.url);

function slugify(value) {
  return String(value || "circuit")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56) || "circuit";
}

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[💡🏁🏆🗓️]/g, "")
    .trim();
}

function parseTabRow(line) {
  const cells = line.split("\t").map((cell) => cell.trim()).filter((cell, index, list) => cell || index < list.length - 1);
  if (cells.length < 4 || !/^\d{4}$/.test(cells[0])) return null;
  return {
    year: Number(cells[0]),
    event: clean(cells[1]),
    champion: clean(cells[2]),
    runnerUp: clean(cells[3]),
    prizePool: /\$/.test(cells[4] || "") ? clean(cells[4]) : "",
    highlight: clean(cells[cells.length - 1] === cells[4] && /\$/.test(cells[4] || "") ? "" : cells.slice(/\$/.test(cells[4] || "") ? 5 : 4).join(" · ")),
  };
}

function parseMashedEditions(text) {
  const start = text.search(/20\d{2}[A-Z(]/);
  if (start < 0) return [];
  const body = text.slice(start).replace(/\n/g, " ");
  return body.split(/(?=20(?:0\d|1\d|2[0-6])[A-Z(])/).filter(Boolean).map((chunk) => {
    const year = Number(chunk.slice(0, 4));
    const rest = chunk.slice(4);
    const prizeMatch = rest.match(/\$[\d,]+(?:\.\d+)?/);
    const prizePool = prizeMatch ? prizeMatch[0] : "";
    const before = prizeMatch ? rest.slice(0, prizeMatch.index) : rest;
    const highlight = prizeMatch ? clean(rest.slice(prizeMatch.index + prizeMatch[0].length)) : "";
    const loc = before.match(/^(.*?\))(.*)$/);
    const event = clean(loc ? loc[1] : before);
    const field = clean(loc ? loc[2] : "");
    return {
      year,
      event,
      champion: field,
      runnerUp: "",
      prizePool,
      highlight,
    };
  }).filter((row) => row.year && row.event);
}

function grab(block, label) {
  const match = block.match(new RegExp(`${label}:\\s*([^\\n]+(?:\\n(?![A-Z][a-z]+:)[^\\n]+)*)`));
  if (match) return clean(match[1]);
  const mashed = block.match(new RegExp(`${label}:\\s*(.+?)(?=(?:Format Birth|Structure|Prize Pool|Year|Full History|History of)|$)`));
  return mashed ? clean(mashed[1]) : "";
}

function parseSection(raw) {
  const heading = clean(raw.split("\n")[0]).replace(/^\d+\.\s*/, "");
  const origin = grab(raw, "Format Birth") || grab(raw, "Ecosystem Launch & Origin");
  const structure = grab(raw, "Structure");
  const prizeNotes = grab(raw, "Prize Pool Evolution") || grab(raw, "Prize Pool Revolution");
  let editions = raw.split(/\r?\n/).map(parseTabRow).filter(Boolean);
  if (!editions.length) editions = parseMashedEditions(raw);
  return {
    id: slugify(heading),
    title: heading,
    launched: origin.match(/\b(19|20)\d{2}\b/)?.[0] || "",
    origin,
    structure,
    prizeNotes,
    eventScope: "region",
    editions,
  };
}

const raw = fs.readFileSync(SOURCE, "utf8").replace(/\u00a0/g, " ");
const chunks = raw.split(/(?=\n?\d{1,2}\.\s)/).map((chunk) => chunk.trim()).filter((chunk) => /^\d{1,2}\.\s/.test(chunk));
const circuits = chunks.map(parseSection).filter((item) => item.editions.length);

const file = `/** Legacy / pre-EWC circuit history extracted from Master extraction.txt.
 * Review and delete unwanted circuits here, then paste the edited file for merge.
 * Not wired into live EWC vaults until you say to merge.
 */
export const PRE_EWC_HISTORY = ${JSON.stringify(circuits, null, 2)};

export function preEwcGames() {
  return [...new Set(PRE_EWC_HISTORY.map((item) => item.title))];
}
`;

fs.writeFileSync(DEST, file);
console.log(`Wrote ${circuits.length} circuits, ${circuits.reduce((n, item) => n + item.editions.length, 0)} editions -> ${DEST.pathname}`);
circuits.forEach((item) => console.log(`${item.id}: ${item.editions.length}`));

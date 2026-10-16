import fs from "fs";

const SRC = "C:/Users/eswar/Master extraction.txt";
const DEST = "src/data/preEwcHistory.js";

function slugify(value) {
  return String(value || "circuit")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "circuit";
}

const raw = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
const normalized = raw.replace(/(?<!\d)(\d{1,2}\.\s)(?=[\p{Extended_Pictographic}A-Z])/gu, "\n$1");
const chunks = normalized.split(/(?=^\d{1,2}\.\s)/m).map((chunk) => chunk.trim()).filter((chunk) => /^\d{1,2}\.\s/.test(chunk));

function takeField(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)(?=(Format Birth|Structure|Prize Pool|Year\\t|YearEvent|🏆|$))`, "i"));
    if (match) return match[1].replace(/\s+/g, " ").trim();
  }
  return "";
}

function parseTsvRow(line) {
  const cells = line.split("\t").map((cell) => cell.trim()).filter((cell, index, all) => !(cell === "" && index === all.length - 1));
  if (cells.length < 3) return null;
  if (!/^\d{4}$/.test(cells[0])) return null;
  const [year, event, winner, third, fourth, fifth] = cells;
  const prize = [third, fourth, fifth].find((cell) => /^\$[\d,]+/.test(cell || ""));
  const rest = cells.slice(2).filter((cell) => cell !== prize);
  return {
    year: Number(year),
    event,
    champion: rest[0] || "",
    runnerUp: prize ? rest[1] || "" : rest[1] || "",
    prizePool: prize || "",
    highlight: rest.slice(prize ? 2 : 2).join(" ").trim() || rest[rest.length - 1] || "",
  };
}

function parseMashed(block) {
  const editions = [];
  const body = block.replace(/YearEvent[\s\S]*?Highlights/i, " ").replace(/\n/g, " ");
  const parts = body.split(/(?=(?:19|20)\d{2}[A-Z$(])/);
  parts.forEach((part) => {
    const match = part.match(/^((?:19|20)\d{2})([\s\S]+)$/);
    if (!match) return;
    const year = Number(match[1]);
    let rest = match[2].trim();
    const prizeMatch = rest.match(/(\$[\d,]+(?:\.\d+)?)/);
    const prizePool = prizeMatch ? prizeMatch[1] : "";
    let event = rest;
    let after = "";
    if (prizeMatch) {
      event = rest.slice(0, prizeMatch.index).trim();
      after = rest.slice(prizeMatch.index + prizeMatch[0].length).trim();
    }
    const loc = event.match(/^(.+?\([^)]+\))(.*)$/);
    let champion = "";
    let runnerUp = "";
    if (loc) {
      event = loc[1].trim();
      const names = loc[2].trim();
      const split = names.match(/^(.+?)([A-Z][A-Za-z0-9.&'’\- ]{2,})$/);
      if (split && split[1].trim()) {
        champion = split[1].trim();
        runnerUp = split[2].trim();
      } else {
        champion = names;
      }
    }
    editions.push({
      year,
      event: event.replace(/\s+/g, " ").trim(),
      champion: champion.replace(/\s+/g, " ").trim(),
      runnerUp: runnerUp.replace(/\s+/g, " ").trim(),
      prizePool,
      highlight: after.replace(/\s+/g, " ").trim(),
    });
  });
  return editions.filter((item) => item.event);
}

const circuits = chunks.map((chunk, index) => {
  const header = chunk.split("\n")[0].replace(/^\d+\.\s*/, "").replace(/[🎯🛡️⚔️🔫🪂📱🏎️💣🥊🛸🪖♟️🐺🗡️🏁💡]/g, " ").trim();
  const game = header
    .split(/🗓️|Ecosystem Launch|Format Birth|🏆/)[0]
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[^\w:&/'()+.,\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const origin = takeField(chunk, ["Format Birth"]);
  const structure = takeField(chunk, ["Structure"]);
  const prizeNotes = takeField(chunk, ["Prize Pool Evolution", "Prize Pool Revolution", "Prize Pool"]);
  const lines = chunk.split("\n");
  let editions = [];
  lines.forEach((line) => {
    const row = parseTsvRow(line);
    if (row) editions.push(row);
  });
  if (editions.length < 2) {
    const mashed = parseMashed(chunk);
    if (mashed.length > editions.length) editions = mashed;
  }
  return {
    id: slugify(`${index + 1}-${game}`),
    game,
    circuit: header,
    origin,
    structure,
    prizeNotes,
    eventScope: "region",
    editions: editions.sort((a, b) => Number(b.year) - Number(a.year) || String(a.event).localeCompare(String(b.event))),
  };
}).filter((item) => item.game && item.editions.length && !/cursor integration|data architecture|complete historical/i.test(item.game));

const file = `/** Pre-EWC / launch-era majors extracted from Master extraction.txt. Edit this file, then paste the trimmed version for vault merge. */
export const PRE_EWC_HISTORY = ${JSON.stringify(circuits, null, 2)};

export function preEwcGames() {
  return [...new Set(PRE_EWC_HISTORY.map((item) => item.game))];
}
`;

fs.writeFileSync(DEST, file);
console.log(`Wrote ${circuits.length} circuits, ${circuits.reduce((n, item) => n + item.editions.length, 0)} editions -> ${DEST}`);
circuits.forEach((item) => console.log(`${item.editions.length.toString().padStart(3)}  ${item.game}`));

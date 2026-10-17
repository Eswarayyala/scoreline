import fs from "fs";

const SRC = "C:/Users/eswar/Master extraction.txt";
const DEST = "src/data/vaultResearchSeed.js";
const HISTORY_DEST = "src/data/preEwcHistory.js";

const GAME_MAP = [
  { test: /counter-strike.*blast|iem katowice|cologne majors/i, id: "cs2", game: "CS2" },
  { test: /counter-strike/i, id: "cs2", game: "CS2" },
  { test: /dota.*esl|dreamleague/i, id: "dota2", game: "Dota 2 (Riyadh Masters)" },
  { test: /dota/i, id: "dota2", game: "Dota 2 (Riyadh Masters)" },
  { test: /mid-season invitational|\bmsi\b/i, id: "lol", game: "League of Legends" },
  { test: /league of legends/i, id: "lol", game: "League of Legends" },
  { test: /valorant/i, id: "valorant", game: "Valorant" },
  { test: /pubg mobile|pmgc/i, id: "pmwc", game: "PUBG Mobile (PMWC)" },
  { test: /pubg/i, id: "pubg", game: "PUBG" },
  { test: /rocket league/i, id: "rocketleague", game: "Rocket League" },
  { test: /rainbow six/i, id: "r6siege", game: "Rainbow Six Siege" },
  { test: /mobile legends/i, id: "mlbb", game: "Mobile Legends: Bang Bang (MLBB)" },
  { test: /street fighter/i, id: "sf6", game: "Street Fighter 6" },
  { test: /tekken/i, id: "tekken8", game: "Tekken 8" },
  { test: /apex.*qualifying|algs lan/i, id: "apex", game: "Apex Legends" },
  { test: /apex legends/i, id: "apex", game: "Apex Legends" },
  { test: /ea sports fc|fifa/i, id: "eafc", game: "EA Sports FC" },
  { test: /call of duty/i, id: "cod", game: "Call of Duty (CDL & Warzone)" },
  { test: /honor of kings/i, id: "hok", game: "Honor of Kings (HoK)" },
  { test: /trackmania/i, id: "trackmania", game: "Trackmania" },
  { test: /chess/i, id: "chess", game: "Chess (EWC Invitational)" },
  { test: /rennsport/i, id: "rennsport", game: "Rennsport (ESL R1)" },
  { test: /teamfight tactics|\btft\b/i, id: "tft", game: "Teamfight Tactics (TFT)" },
  { test: /standoff/i, id: "standoff2", game: "Standoff 2" },
  { test: /fatal fury|snk/i, id: "fatalfury", game: "Fatal Fury" },
  { test: /sim racing/i, id: "simracing", game: "Sim Racing" },
  { test: /fighting games|\bevo\b/i, id: "evo", game: "EVO" },
];

const META = {
  cs2: { fullName: "Counter-Strike (CS:GO / CS2)", genre: "Tactical FPS", type: "PC" },
  valorant: { fullName: "VALORANT", genre: "Tactical FPS", type: "PC" },
  overwatch2: { fullName: "Overwatch 2", genre: "Hero shooter", type: "PC" },
  r6siege: { fullName: "Rainbow Six Siege", genre: "Tactical FPS", type: "PC" },
  apex: { fullName: "Apex Legends", genre: "Battle royale", type: "PC" },
  pubg: { fullName: "PUBG: Battlegrounds", genre: "Battle royale", type: "PC" },
  pmwc: { fullName: "PUBG Mobile", genre: "Battle royale", type: "Mobile" },
  lol: { fullName: "League of Legends", genre: "MOBA", type: "PC" },
  dota2: { fullName: "Dota 2", genre: "MOBA", type: "PC" },
  mlbb: { fullName: "Mobile Legends: Bang Bang", genre: "MOBA", type: "Mobile" },
  hok: { fullName: "Honor of Kings", genre: "MOBA", type: "Mobile" },
  freefire: { fullName: "Garena Free Fire", genre: "Battle royale", type: "Mobile" },
  sf6: { fullName: "Street Fighter 6", genre: "Fighting", type: "PC" },
  tekken8: { fullName: "Tekken 8", genre: "Fighting", type: "PC" },
  eafc: { fullName: "EA Sports FC", genre: "Sports", type: "Console" },
  rocketleague: { fullName: "Rocket League", genre: "Sports", type: "PC" },
  tft: { fullName: "Teamfight Tactics", genre: "Auto battler", type: "PC" },
  fortnite: { fullName: "Fortnite", genre: "Battle royale", type: "PC" },
  starcraft2: { fullName: "StarCraft II", genre: "RTS", type: "PC" },
  rennsport: { fullName: "Rennsport", genre: "Sim racing", type: "PC" },
  crossfire: { fullName: "Crossfire", genre: "FPS", type: "PC" },
  cod: { fullName: "Call of Duty", genre: "FPS", type: "Console" },
  standoff2: { fullName: "Standoff 2", genre: "Tactical FPS", type: "Mobile" },
  trackmania: { fullName: "Trackmania", genre: "Racing", type: "PC" },
  chess: { fullName: "Chess", genre: "Board", type: "PC" },
  fatalfury: { fullName: "Fatal Fury: City of the Wolves", genre: "Fighting", type: "PC" },
  simracing: { fullName: "iRacing / ACC sim racing", genre: "Sim racing", type: "PC" },
};

const EVENT_START = /^(?:(?:19|20)\d{2}\s*)?(DreamHack|EMS |ESL |ELEAGUE|PGL |MLG |IEM |BLAST|FACEIT |StarLadder|Shanghai |TI\d|Season |VCT |PGI|PGC |PMGC |RLCS |SI |M\d |Capcom |TWT |ALGS |FIWC|FIFAe|FC Pro|KIC |ESWC|TMGL|Trackmania|World |Grandmaster|Speed |Champions Chess|Galaxies|Fates|Reckoning|Neon |Dragonlands|Monsters|Runeterra|Remix |Inkborn|Magic |Standoff |SWT |EVO |SNK |24 Hours|SRO |GT World|iRacing|Split |Black Ops|Ghosts|Advanced |Infinite |WWII|MW|Cold War|Vanguard|The International|Mid-Season|Honor |Fatal |Street |Tekken |Rainbow |Mobile |Call of |Apex |PUBG |Valorant |League |Dota |Rocket |Chess |Teamfight |Rennsport|Counter|MSI |Kungarna|Galaxies Championship)/i;

function mapCircuit(title) {
  return GAME_MAP.find((item) => item.test.test(title)) || { id: slugify(title), game: title };
}

function slugify(value) {
  return String(value || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "game";
}

const KNOWN_ORGS = [
  "iBUYPOWER Cosmic", "FlipSid3 Tactics", "Northern Gaming", "Gale Force eSports", "Team Dignitas",
  "Renault Vitality", "Karmine Corp", "Team BDS", "G2 Stride", "Mock-It eSports", "NRG Esports",
  "GoNext Esports", "DarkZero Esports", "Spacestation Gaming", "SpaceStation Gaming", "Reject Winnity",
  "Kungarna (SCARZ in EU)", "Kungarna", "Team Falcons", "OpTic Texas", "OpTic Gaming", "OpTic",
  "Atlanta FaZe", "Los Angeles Thieves", "New York Subliners", "Dallas Empire", "Fariko Impact",
  "Complexity Gaming", "Denial Esports", "FunPlus Phoenix (FPX)", "FunPlus Phoenix",
  "Ninjas in Pyjamas", "Natus Vincere (NaVi)", "Natus Vincere", "Evil Geniuses (EG)", "Evil Geniuses",
  "EDward Gaming (EDG)", "EDward Gaming", "Royal Never Give Up", "SK Telecom T1 (T1)", "SK Telecom T1",
  "Counter Logic Gaming", "Gaimin Gladiators", "Team Liquid PH", "Team Liquid", "Team Spirit",
  "Team Vitality", "FaZe Clan", "G2 Esports", "The MongolZ", "GamerLegion", "Luminosity Gaming",
  "Team EnVyUs", "Team LDLC.com", "Gambit Esports", "Virtus.pro", "SK Gaming", "Cloud9", "Astralis",
  "ENCE", "AVANGAR", "Heroic", "FURIA", "Immortals", "Outsiders (VP)", "Paper Rex", "Team Heretics",
  "Acend", "LOUD", "PSG.LGD", "Invictus Gaming (iG)", "Invictus Gaming", "Wings Gaming", "Newbee",
  "Alliance", "Tundra Esports", "PARIVISION", "Secret", "OG", "EHOME", "CDEC Gaming", "DC Esports",
  "Vici Gaming", "Keen Gaming", "Mineski", "Azure Ray", "BetBoom Team", "TS M", "Taipei Assassins",
  "Azubu Frost", "Samsung White", "Samsung Galaxy", "Royal Club", "Star Horn Royal", "KOO Tigers",
  "DAMWON Gaming (DK)", "DAMWON Gaming", "DWG KIA", "Weibo Gaming", "Bilibili Gaming", "KT Rolster",
  "Suning", "DRX", "T1", "Fnatic ONIC", "Fnatic", "JD Gaming", "Gen.G Esports", "Gen.G", "Kingzone DragonX",
  "Nova Esports", "Klas Gaming", "Kaos Next Ruya", "S2G Esports", "DRS Gaming", "IHC Esports",
  "Stalwart Esports", "Dplus KIA", "Regnum Carya Bra", "Alpha7 Esports", "ULF Esports",
  "OMG (FPP) / Gen.G (TPP)", "Susquehanna Soniqs", "Soniqs", "Zenith Esports", "NewHappy", "Danawa eSports",
  "Twisted Minds", "17 Gaming", "Team Liquid", "Continuum", "Era eSports", "PENTA Sports",
  "W7m Esports", "EVOS Legends", "RRQ Hoshi", "Bren Esports", "Burmese Ghouls", "Blacklist International",
  "ONIC PH", "ECHO", "AP.Bren", "ONIC Esports", "Selangor Red Giants", "eStar Pro", "Wuhan eStar",
  "Chengdu AG Super Play", "KPL Dream Team", "LGD Gaming My", "Mouz", "MOUZ", "BIG", "Vitality",
  "Reignite", "NRG", "UNLIMIT", "Oblivion", "SSG", "TSM", "Method", "iBUYPOWER", "Necessary",
  "Streeteight", "Horizon", "Absolute", "REVIVAL Esports", "BMW M Team Redline", "Porsche Coanda Esports",
  "Red Bull Sim Racing", "Rebellion Williams Esports", "Realteam Hydrogen Redline", "Ferrari Esports Team",
  "Team Redline", "Carl Jr.", "Gwen", "Pac", "Magnus Carlsen", "Hikaru Nakamura", "Wesley So",
  "Alireza Firouzja", "Denis Lazavik", "Maxime Vachier-Lagrave", "Nihal Sarin", "Double61", "8ascend (8833)",
  "Huanmie", "XunGe", "Rereplay", "Dishsoap", "LiShao", "subservient", "MenaRD", "NuckleDu", "Gachikun",
  "LowHigh", "Arslan Ash", "Atif Butt", "Qudans", "Rangchu", "Chikurin", "AngryBird", "Bonchan",
  "Kawano", "Punk", "Leshar", "Ulsan", "Knee", "Xiao Hai", "ZJZ", "Laghar", "Sako", "Momochi",
  "Kazunoko", "iDom", "UMA", "Kakeru", "Paper Rex", "Gambit Esports",
].sort((a, b) => b.length - a.length);

function splitGlued(blob) {
  const text = String(blob || "").replace(/\s+/g, " ").trim();
  if (!text) return { champion: "", runnerUp: "", leftover: "" };
  const known = KNOWN_ORGS.find((name) => text.startsWith(name));
  if (known) {
    const rest = text.slice(known.length);
    if (!rest) return { champion: known, runnerUp: "", leftover: "" };
    if (!/^[A-Z(]/.test(rest)) return { champion: known, runnerUp: "", leftover: rest };
    const next = splitGlued(rest);
    return { champion: known, runnerUp: next.champion, leftover: [next.runnerUp, next.leftover].filter(Boolean).join(" ") };
  }
  const special = text.match(/^(OG)(PSG\.LGD)(.*)$/i) || text.match(/^(DRX)(T1)(.*)$/i);
  if (special) return { champion: special[1], runnerUp: special[2], leftover: special[3] || "" };
  return { champion: text, runnerUp: "", leftover: "" };
}

function splitRows(table) {
  const cuts = [];
  for (const match of table.matchAll(/(?:19|20)\d{2}/g)) {
    const after = table.slice(match.index + 4);
    if (!after || /^[\s$]/.test(after) || !EVENT_START.test(after)) continue;
    cuts.push(match.index);
  }
  return cuts.map((start, index) => table.slice(start, cuts[index + 1] || table.length).trim()).filter(Boolean);
}

function parseEventAndNames(rest) {
  const gameTitle = rest.match(/^(Street Fighter (?:\d+|V)|Tekken \d+)(.*)$/i);
  if (gameTitle && gameTitle[2]) return { event: gameTitle[1].trim(), names: gameTitle[2].trim() };
  const titledYear = rest.match(/^(.+?(?:19|20)\d{2})(.*)$/);
  if (titledYear && /^[A-Z]/.test(titledYear[2] || "")) {
    return { event: titledYear[1].trim(), names: titledYear[2].trim() };
  }
  const paren = rest.match(/^(.+?\([^)]+\))(.*)$/);
  if (paren) return { event: paren[1].trim(), names: paren[2].trim() };
  if (titledYear && titledYear[2]) return { event: titledYear[1].trim(), names: titledYear[2].trim() };
  const glued = rest.match(/^(.+?)(?=[A-Z][a-z]+(?: [A-Z][a-z]+)*(?=[A-Z])|[A-Z]{2,})/);
  if (glued && glued[2] !== undefined) return { event: glued[1].trim(), names: rest.slice(glued[1].length).trim() };
  const camel = splitGlued(rest);
  if (camel.runnerUp) return { event: camel.champion, names: `${camel.runnerUp}${camel.leftover}` };
  const org = KNOWN_ORGS.find((name) => rest.includes(name));
  if (org) {
    const at = rest.indexOf(org);
    if (at > 0) return { event: rest.slice(0, at).trim(), names: rest.slice(at).trim() };
  }
  return { event: rest, names: "" };
}

function parseEditions(tableText) {
  const start = tableText.search(/Highlights/i);
  const table = (start >= 0 ? tableText.slice(start).replace(/^Highlights/i, "") : tableText).replace(/\s+/g, " ").trim();
  return splitRows(table).map((part) => {
    const year = Number(part.slice(0, 4));
    const rest = part.slice(4).trim();
    const prizeMatch = rest.match(/(\$\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$\d+(?:\.\d+)?)/);
    const prizePool = prizeMatch ? prizeMatch[1] : "";
    const beforePrize = prizeMatch ? rest.slice(0, prizeMatch.index).trim() : rest;
    let highlight = prizeMatch ? rest.slice(prizeMatch.index + prizeMatch[0].length).trim() : "";
    const { event, names } = parseEventAndNames(beforePrize);
    const fighting = /street fighter|tekken|capcom|fatal|evo|kof/i.test(event);
    const replay = fighting ? names.match(/^([A-Z][a-zA-Z0-9]+(?: [A-Z][a-z]+)?)(.+?)(\1\b.*)$/) : null;
    const split = replay
      ? { champion: replay[1], runnerUp: replay[2].replace(/\s*\/\s*$/, "").trim(), leftover: replay[3].trim() }
      : splitGlued(names);
    if (!prizeMatch) highlight = [split.leftover, highlight].filter(Boolean).join(" ").trim();
    else if (split.leftover) highlight = [split.leftover, highlight].filter(Boolean).join(" ").trim();
    return {
      year,
      event: event.replace(/\s+/g, " "),
      champion: split.champion,
      runnerUp: split.runnerUp,
      prizePool,
      highlight: highlight.replace(/\s+/g, " ").trim(),
    };
  }).filter((item) => item.event && (item.champion || item.prizePool));
}

function dedupeEditions(rows = []) {
  const byKey = new Map();
  rows.forEach((row) => {
    const key = `${row.year}|${String(row.event).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase()}`;
    const prior = byKey.get(key);
    if (!prior || String(row.event).length > String(prior.event).length) byKey.set(key, row);
  });
  return [...byKey.values()];
}

function toVaultEdition(row, extra = {}) {
  const fighting = /street fighter|tekken|fatal fury|evo|capcom/i.test(`${row.event} ${extra.game || ""}`);
  return {
    year: row.year,
    event: row.event,
    prizePool: row.prizePool,
    champion: row.champion,
    runnerUp: row.runnerUp,
    eventScope: "region",
    clutchesAndRivalries: row.highlight,
    payouts: [
      { rank: "1st (Champion)", team: fighting ? "" : row.champion, player: fighting ? row.champion : "", prize: "" },
      { rank: "2nd (Runner-Up)", team: fighting ? "" : row.runnerUp, player: fighting ? row.runnerUp : "", prize: "" },
    ],
  };
}

function loadExistingResearch() {
  const text = fs.readFileSync("src/data/esportsResearch.js", "utf8");
  const start = text.indexOf("export const ESPORTS_RESEARCH = ");
  if (start < 0) {
    const generated = fs.readFileSync("src/data/vaultResearchSeed.js", "utf8");
    const body = generated.slice(generated.indexOf("["));
    return Function(`return ${body.replace(/;\s*$/, "")}`)();
  }
  const end = text.indexOf("\nexport function researchHighlightLabels");
  const marker = text.indexOf("\nconst HIGHLIGHT_LABELS");
  const close = marker > start ? marker : end;
  const body = text.slice(start + "export const ESPORTS_RESEARCH = ".length, close);
  return Function(`return ${body}`)();
}

function isEwc(edition) {
  return /ewc|esports world cup|gamers8|riyadh masters/i.test(`${edition.event || ""} ${edition.season || ""}`);
}

const raw = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n").replace(/\$\\rightarrow\$/g, "->").replace(/\u00a0/g, " ");
const normalized = raw.replace(/(?<!\d)(\d{1,2}\.\s)(?=[\p{Extended_Pictographic}A-Z])/gu, "\n$1");
const chunks = normalized.split(/(?=^\d{1,2}\.\s)/m).map((chunk) => chunk.trim()).filter((chunk) => /^\d{1,2}\.\s/.test(chunk));

const circuits = chunks.map((chunk) => {
  const header = chunk.split("\n")[0].replace(/^\d{1,2}\.\s*/, "");
  const title = header.split(/🗓️|Ecosystem Launch|Format Birth/)[0].replace(/[^\w:&/'()+.,\- ]+/g, " ").replace(/\s+/g, " ").trim();
  const originMatch = chunk.match(/Format Birth:\s*([\s\S]*?)(?=Structure:|Prize Pool|🏆|$)/i);
  const structureMatch = chunk.match(/Structure:\s*([\s\S]*?)(?=Prize Pool|🏆|Full History|$)/i);
  const mapped = mapCircuit(title);
  return {
    ...mapped,
    circuit: title,
    origin: (originMatch?.[1] || "").replace(/\s+/g, " ").trim(),
    structure: (structureMatch?.[1] || "").replace(/\s+/g, " ").trim(),
    editions: parseEditions(chunk),
  };
});

const byId = new Map();
circuits.forEach((circuit) => {
  if (circuit.id === "evo") {
    circuit.editions.forEach((row) => {
      const target = /tekken/i.test(row.event) ? { id: "tekken8", game: "Tekken 8" } : { id: "sf6", game: "Street Fighter 6" };
      if (!byId.has(target.id)) byId.set(target.id, { ...target, origin: circuit.origin, editions: [] });
      byId.get(target.id).editions.push({ ...row, event: `EVO ${row.year} · ${row.event}` });
    });
    return;
  }
  if (!byId.has(circuit.id)) byId.set(circuit.id, { ...circuit, editions: [] });
  const current = byId.get(circuit.id);
  if (circuit.origin && !current.origin) current.origin = circuit.origin;
  current.editions = dedupeEditions([...current.editions, ...circuit.editions]);
});

const previous = loadExistingResearch();
const previousById = new Map(previous.map((item) => [item.id, item]));
const ids = [...new Set([...previous.map((item) => item.id), ...byId.keys()])];

const seed = ids.map((id) => {
  const extracted = byId.get(id);
  const prior = previousById.get(id);
  const game = extracted?.game || prior?.game || META[id]?.fullName || id;
  const regionEditions = (extracted?.editions || []).map((row) => toVaultEdition(row, { game }));
  const ewcEditions = (prior?.editions || []).filter(isEwc).map((edition) => ({ ...edition, eventScope: "ewc" }));
  const editions = [...regionEditions, ...ewcEditions].sort((a, b) => Number(b.year) - Number(a.year) || String(a.event).localeCompare(String(b.event)));
  const prizes = editions.map((item) => Number(String(item.prizePool || "").replace(/[$,]/g, ""))).filter((value) => value > 0 && value < 80_000_000);
  const peak = prizes.length ? `$${Math.max(...prizes).toLocaleString("en-US")}` : prior?.peakPrizePool || "";
  return {
    id,
    game,
    fullName: prior?.fullName || META[id]?.fullName || game,
    genre: prior?.genre || META[id]?.genre || "",
    type: prior?.type || META[id]?.type || "PC",
    peakPrizePool: peak,
    overview: extracted?.origin || prior?.overview || "",
    editions,
  };
}).filter((item) => item.editions.length);

const history = circuits.map((circuit) => ({
  id: circuit.id,
  game: circuit.game,
  circuit: circuit.circuit,
  origin: circuit.origin,
  structure: circuit.structure,
  eventScope: "region",
  editions: circuit.editions,
}));

fs.writeFileSync(DEST, `/** Generated from Master extraction.txt plus existing EWC seasons. */\nexport const ESPORTS_RESEARCH = ${JSON.stringify(seed, null, 2)};\n`);
fs.writeFileSync(HISTORY_DEST, `/** Edited launch-era majors. Vault seed lives in vaultResearchSeed.js. */\nexport const PRE_EWC_HISTORY = ${JSON.stringify(history, null, 2)};\nexport function preEwcGames() {\n  return [...new Set(PRE_EWC_HISTORY.map((item) => item.game))];\n}\n`);
console.log(seed.map((item) => `${String(item.editions.length).padStart(3)} ${item.id}  ${item.editions.filter((row) => row.eventScope === "region").length}r/${item.editions.filter((row) => row.eventScope === "ewc").length}e  ${item.game}`).join("\n"));
console.log(`games ${seed.length} editions ${seed.reduce((n, item) => n + item.editions.length, 0)}`);
console.log("sample", JSON.stringify(seed.find((item) => item.id === "cs2")?.editions.slice(-3), null, 2));
console.log("ti8", JSON.stringify(seed.find((item) => item.id === "dota2")?.editions.find((row) => /TI8/.test(row.event))));

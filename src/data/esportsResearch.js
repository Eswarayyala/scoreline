import { bannerForGame } from "./platformShowcase";
import { isEwcEdition } from "./eventScope";
import { normalizeEdition } from "./vaultDeskSchema";

export const ESPORTS_RESEARCH = [
  {
    id: "cs2",
    game: "CS2",
    fullName: "Counter-Strike (CS:GO / CS2)",
    genre: "Tactical FPS",
    type: "PC",
    peakPrizePool: "$2,100,000",
    overview: "Tier-1 tactical bomb-defusal shooter. Transitioned from CS:GO at Gamers8 2023 to CS2 (2024–2026). Expanded from 16 teams to a 32-team global format.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Vitality", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", team: "ENCE", prize: "$180,000" },
          { rank: "3rd–4th", team: "G2 Esports / Heroic", prize: "$80,000 each" },
          { rank: "5th–8th", team: "Quarterfinalists", prize: "$35,000 each" },
          { rank: "9th–16th", team: "Early exits (NaVi, Cloud9, and others)", prize: "$15,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Team Vitality cruised through later stages with chilling precision right after their BLAST.tv Paris Major victory.",
          clutchesAndRivalries: "NertZ anchored crucial multi-kills for ENCE; cadiaN pulled off a legendary 3v5 defensive stand.",
          lostComposure: "Single-elimination pressure caused Cloud9 and NaVi to crack under rapid LAN pacing.",
          droppedOut: "Big-name organizations stumbled early before the semi-finals.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$1,050,000",
        payouts: [
          { rank: "1st (Champion)", team: "Natus Vincere (NaVi)", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", team: "G2 Esports", prize: "$175,000" },
          { rank: "3rd–4th", team: "Virtus.pro / MOUZ", prize: "$85,000 each" },
          { rank: "5th–8th", team: "Quarterfinalists", prize: "$40,000 each" },
          { rank: "9th–16th", team: "Early exits", prize: "$10,000–$25,000" },
        ],
        highlights: {
          madeItLookEasy: "NaVi under Aleksib turned mid-round calling into art, mastering CS2 sub-tick mechanics effortlessly.",
          clutchesAndRivalries: "b1t and jL delivered clutch multi-kills in grand finals against G2.",
          lostComposure: "G2 unraveled in Map 3 over late-game economic management.",
          droppedOut: "FaZe Clan and Vitality suffered shock opening-phase exits.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,250,000",
        payouts: [
          { rank: "1st (Champion)", team: "The MongolZ", prize: "$500,000" },
          { rank: "2nd (Runner-Up)", team: "Aurora Gaming", prize: "$230,000" },
          { rank: "3rd–4th", team: "Team Falcons / Team Vitality", prize: "$70,000–$130,000" },
          { rank: "5th–8th", team: "TYLOO, 3DMAX, MOUZ, Heroic", prize: "$40,000 each" },
          { rank: "9th–16th", team: "Spirit, NaVi, FaZe, G2, Liquid", prize: "$20,000 each" },
        ],
        highlights: {
          madeItLookEasy: "The MongolZ delivered one of esports' greatest upsets, sweeping Aurora 3-0 in finals.",
          clutchesAndRivalries: "Techno earned MVP with opening duels; mzinho and 910 delivered sniper clutches.",
          lostComposure: "Aurora lost footing completely after dropping Map 1 in finals.",
          droppedOut: "Western giants Spirit, FaZe, NaVi, and G2 crashed out early in 9th–16th.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$2,100,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Spirit", prize: "$600,000+" },
          { rank: "2nd (Runner-Up)", team: "FUT Esports", prize: "$340,000" },
          { rank: "3rd–4th", team: "Deep playoff contenders", prize: "$110,000–$190,000" },
          { rank: "5th–8th", team: "Vitality, Falcons, MOUZ, G2", prize: "$60,000 each" },
          { rank: "9th–16th", team: "The MongolZ, NaVi, FaZe", prize: "$35,000 each" },
          { rank: "17th–32nd", team: "Extended global qualifiers", prize: "$10,000–$20,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Team Spirit dominated, capping a historic day winning CS2 and Dota 2 titles simultaneously.",
          clutchesAndRivalries: "donk posted historic rating metrics; sh1ro and magixx shut down FUT comeback attempts with 2v4 holds.",
          lostComposure: "FUT Esports cracked under donk's opening aggression in finals.",
          droppedOut: "The MongolZ, NaVi, and FaZe stumbled in the expanded 32-team bracket phase.",
        },
      },
    ],
  },
  {
    id: "valorant",
    game: "Valorant",
    fullName: "VALORANT",
    genre: "Tactical FPS",
    type: "PC",
    peakPrizePool: "$2,000,000",
    overview: "Riot Games' premier 5v5 character-based tactical shooter. Joined EWC in 2025, using GSL double-elimination groups into single-elimination playoffs.",
    editions: [
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,250,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Heretics", prize: "$500,000" },
          { rank: "2nd (Runner-Up)", team: "Fnatic", prize: "$230,000" },
          { rank: "3rd–4th", team: "Gen.G Esports / Paper Rex", prize: "$70,000–$130,000" },
          { rank: "5th–8th", team: "BBL, NRG, and others", prize: "$40,000 each" },
          { rank: "9th–16th", team: "100 Thieves, DRX, and others", prize: "$20,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Team Heretics mounted a historic reverse sweep (3-2) from 0-2 down against Fnatic.",
          clutchesAndRivalries: "Boo led Heretics' comeback on Icebox and Haven before dominating map five on Ascent.",
          lostComposure: "Fnatic completely imploded under pressure of closing out a series up 2-0.",
          droppedOut: "100 Thieves and DRX suffered brutal group-stage eliminations.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "100 Thieves", prize: "$600,000" },
          { rank: "2nd (Runner-Up)", team: "NRG", prize: "$340,000" },
          { rank: "3rd–4th", team: "Deep semifinalists", prize: "$120,000–$180,000" },
          { rank: "5th–8th", team: "Quarterfinalists", prize: "$60,000 each" },
          { rank: "9th–16th", team: "Group exits (G2 Esports and others)", prize: "$15,000–$25,000" },
        ],
        highlights: {
          madeItLookEasy: "100 Thieves captured their first international title completely undefeated, dropping only 4 maps overall.",
          clutchesAndRivalries: "Cryocells earned SONY MVP shutting down site entries; Vora delivered multi-bullet clutches through smoke.",
          lostComposure: "NRG mounted a 9-3 half comeback in map 4 but 100T mirrored it to close 3-1.",
          droppedOut: "G2 Esports cracked in early elimination brackets.",
        },
      },
    ],
  },
  {
    id: "overwatch2",
    game: "Overwatch 2",
    fullName: "Overwatch 2",
    genre: "Hero Shooter / FPS",
    type: "PC",
    peakPrizePool: "$1,000,000",
    overview: "Blizzard's 5v5 hero shooter integrated with the OWCS circuit, featuring EWC hero-ban systems.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Crazy Raccoon", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", team: "Toronto Ultra", prize: "$180,000" },
          { rank: "3rd–4th", team: "Team Falcons / Zeta Division", prize: "$60,000–$100,000" },
          { rank: "5th–8th", team: "ENCE, Twisted Minds, SSG, M80", prize: "$25,000–$40,000" },
          { rank: "9th–16th", team: "Fnatic, M80, Virtus.pro, and others", prize: "$15,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Crazy Raccoon dismantled Toronto Ultra 4-1 with LIP earning MVP.",
          clutchesAndRivalries: "Hero ban system forced teams off comfort picks, creating chaotic compositions.",
          lostComposure: "Fnatic and M80 struggled with the rapid group-stage pace.",
          droppedOut: "Team Falcons lost 3-2 in semifinals to Toronto Ultra.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Falcons", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", team: "Crazy Raccoon", prize: "$160,000" },
          { rank: "3rd Place", team: "Spacestation Gaming", prize: "$80,000" },
          { rank: "4th Place", team: "Fnatic", prize: "$50,000" },
          { rank: "5th–8th", team: "Twisted Minds, ENCE, Ultra, M80", prize: "$40,000 each" },
          { rank: "9th–16th", team: "Group-stage exits", prize: "$10,000–$20,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Falcons won the home-soil title beating Crazy Raccoon 4-3 in the final.",
          clutchesAndRivalries: "Proper delivered clutch Tracer eliminations on Push map Esperança.",
          lostComposure: "Crazy Raccoon dropped two straight maps up 3-2 due to overextending on high ground.",
          droppedOut: "Toronto Ultra fell in quarter-finals.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Falcons", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", team: "Spacestation Gaming (SSG)", prize: "$160,000" },
          { rank: "3rd Place", team: "Crazy Raccoon", prize: "$80,000" },
          { rank: "4th Place", team: "Twisted Minds", prize: "$50,000" },
          { rank: "5th–8th", team: "Fnatic, Virtus.pro, ENCE, M80", prize: "$40,000 each" },
          { rank: "9th–16th", team: "Group casualties", prize: "$10,000–$20,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Falcons secured back-to-back world titles beating SSG 4-1.",
          clutchesAndRivalries: "Stalk3r earned SONY MVP leading elims/10min on Genji and Echo.",
          lostComposure: "SSG crumbled on Circuit Royal, surrendering three payloads without team-fight wins.",
          droppedOut: "Crazy Raccoon swept 3-0 by Falcons in semifinals.",
        },
      },
    ],
  },
  {
    id: "r6siege",
    game: "Rainbow Six Siege",
    fullName: "Rainbow Six Siege",
    genre: "Tactical FPS",
    type: "PC / Console",
    peakPrizePool: "$2,000,000",
    overview: "Ubisoft's 5v5 tactical destructive shooter. Core foundation from Gamers8 2023 through EWC 2026.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team BDS", prize: "$750,000" },
          { rank: "2nd (Runner-Up)", team: "M80", prize: "$350,000" },
          { rank: "3rd Place", team: "G2 Esports", prize: "$200,000" },
          { rank: "4th Place", team: "W7m Esports", prize: "$130,000" },
          { rank: "5th–8th", team: "FaZe, DarkZero, Liquid, Oxygen", prize: "$80,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Team BDS dismantled M80 3-0 behind Shaiiko's entry gunplay.",
          clutchesAndRivalries: "M80 clutched the lower bracket but BDS site setups on Clubhouse were impenetrable.",
          lostComposure: "G2 Esports failed to stabilize under single-elimination pressure.",
          droppedOut: "Virtus.pro and DarkZero eliminated early.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team BDS", prize: "$750,000" },
          { rank: "2nd (Runner-Up)", team: "W7m Esports", prize: "$350,000" },
          { rank: "3rd–4th", team: "Team Liquid / FURIA Esports", prize: "$160,000 each" },
          { rank: "5th–8th", team: "Spacestation, DarkZero, FaZe, Bleed", prize: "$80,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Team BDS swept w7m 3-0 with LikEfac taking MVP.",
          clutchesAndRivalries: "Paluh and Nafe pulled 1v3 retakes in Liquid vs w7m semifinals.",
          lostComposure: "Spacestation and DarkZero crumbled during overtime deciders on Kafe.",
          droppedOut: "Geekay and Wolves exited in group stage.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Secret", prize: "$750,000" },
          { rank: "2nd (Runner-Up)", team: "G2 Esports", prize: "$350,000" },
          { rank: "3rd Place", team: "FURIA Esports", prize: "$180,000" },
          { rank: "4th Place", team: "W7m Esports", prize: "$120,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Secret went nearly flawless through playoffs, sweeping G2 3-0 in finals.",
          clutchesAndRivalries: "Adrian earned SONY MVP with anchor holds; G2 vs FURIA semi was a 3-map war.",
          lostComposure: "Team Falcons collapsed early after losing 8-6 OT to Secret.",
          droppedOut: "Team BDS failed to reach playoffs.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "FURIA Esports", prize: "$750,000" },
          { rank: "2nd (Runner-Up)", team: "Team Secret", prize: "$350,000" },
          { rank: "3rd Place", team: "Team BDS", prize: "$180,000" },
          { rank: "4th Place", team: "DarkZero Esports", prize: "$120,000" },
        ],
        highlights: {
          madeItLookEasy: "FURIA defeated defending champion Secret 3-1 behind Kheyze's 42 frags.",
          clutchesAndRivalries: "Kheyze delivered three 1v2 clutch defuses across finals.",
          lostComposure: "Secret got shut out on Skyscraper Map 4 trying to breach hatch defenses.",
          droppedOut: "G2 and FaZe Clan halted in quarterfinals.",
        },
      },
    ],
  },
  {
    id: "apex",
    game: "Apex Legends",
    fullName: "Apex Legends",
    genre: "Battle Royale",
    type: "PC / Console",
    peakPrizePool: "$2,000,000",
    overview: "Fast-paced 3-player squad battle royale utilizing the high-stakes Match Point format.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Alliance", prize: "$600,000" },
          { rank: "2nd (Runner-Up)", team: "Team Falcons", prize: "$375,000" },
          { rank: "3rd Place", team: "Luminosity Gaming", prize: "$200,000" },
          { rank: "4th Place", team: "Gaimin Gladiators", prize: "$135,000" },
        ],
        highlights: {
          madeItLookEasy: "Alliance maintained positioning discipline to steal match point victory.",
          clutchesAndRivalries: "Falcons' God Trio dominated points but failed to close out the final match point zone.",
          lostComposure: "Top NA teams took panicked fights outside safe zones.",
          droppedOut: "TSM failed to reach the final push.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "VK Gaming", prize: "$600,000" },
          { rank: "2nd (Runner-Up)", team: "Team Liquid", prize: "$375,000" },
          { rank: "3rd Place", team: "Team Falcons", prize: "$200,000" },
          { rank: "4th Place", team: "Fnatic", prize: "$135,000" },
        ],
        highlights: {
          madeItLookEasy: "VK Gaming qualified from LCQ and delivered a surgical 3v3 final-circle wipe to win.",
          clutchesAndRivalries: "QQ earned MVP with Kraber sniper picks; Sentinels Monsoon clutched bubble fights.",
          lostComposure: "Alliance and Team Liquid overextended into low-ground chokepoints on match point.",
          droppedOut: "Legacy NA squads pinched in group stage.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "UNLIMIT", prize: "$600,000" },
          { rank: "2nd (Runner-Up)", team: "Team Vision", prize: "$375,000" },
          { rank: "3rd Place", team: "Sentinels", prize: "$200,000" },
          { rank: "4th Place", team: "Wolves Esports", prize: "$135,000" },
        ],
        highlights: {
          madeItLookEasy: "UNLIMIT locked high ground on World's Edge to sweep the finals lobby.",
          clutchesAndRivalries: "Peace took SONY MVP dropping 34 frags.",
          lostComposure: "Falcons and Alliance burned utility too early in ring 5.",
          droppedOut: "ZETA Division eliminated in the finals lobby.",
        },
      },
    ],
  },
  {
    id: "pubg",
    game: "PUBG",
    fullName: "PUBG: Battlegrounds",
    genre: "Battle Royale",
    type: "PC",
    peakPrizePool: "$3,000,000",
    overview: "Tactical 100-player 16-squad survival battle royale on Erangel, Miramar, Taego, and Rondo.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Sonavi Gaming", prize: "$600,000" },
          { rank: "2nd (Runner-Up)", team: "Danawa eSports", prize: "$300,000" },
          { rank: "3rd Place", team: "Twisted Minds", prize: "$200,000" },
          { rank: "4th Place", team: "Question Mark", prize: "$140,000" },
        ],
        highlights: {
          madeItLookEasy: "Sonavi controlled high-ground ridges with sniper coverage to secure the title.",
          clutchesAndRivalries: "Danawa and Twisted Minds traded 1v2 clutches in smoke screens.",
          lostComposure: "Western and Chinese teams caught out during vehicle rotations.",
          droppedOut: "FaZe Clan and Petrichor Road finished lower finals.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "S2G Esports", prize: "$700,000" },
          { rank: "2nd (Runner-Up)", team: "Danawa eSports", prize: "$350,000" },
          { rank: "3rd Place", team: "Twisted Minds", prize: "$220,000" },
          { rank: "4th Place", team: "FaZe Clan", prize: "$150,000" },
        ],
        highlights: {
          madeItLookEasy: "S2G secured back-to-back Chicken Dinners on Taego/Vikendi to jump from 5th to 1st.",
          clutchesAndRivalries: "H3DY locked MVP with opening utility clears.",
          lostComposure: "Danawa suffered a vehicle crash rotation in Game 11, throwing a 1st-place lead.",
          droppedOut: "Petrichor Road and 17 Gaming halted mid-table.",
        },
      },
    ],
  },
  {
    id: "pmwc",
    game: "PUBG Mobile (PMWC)",
    fullName: "PUBG Mobile World Cup",
    genre: "Battle Royale",
    type: "Mobile",
    peakPrizePool: "$3,050,000",
    overview: "Official PUBG Mobile World Cup mid-season flagship, featuring 28 global teams across Group, Survival, and 18-match Grand Finals stages.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 PMWI (Riyadh)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Vampire Esports", prize: "$500,000+" },
          { rank: "2nd (Runner-Up)", team: "Six Two Eight (628)", prize: "$230,000" },
          { rank: "3rd Place", team: "Gaimin Gladiators", prize: "$150,000" },
          { rank: "4th Place", team: "Alpha7 Esports", prize: "$110,000" },
        ],
        highlights: {
          madeItLookEasy: "Vampire Esports shattered kill records on Sanhok to repeat as champions.",
          clutchesAndRivalries: "TonyK clutched 1v3 site retakes against Chinese squad 628.",
          lostComposure: "Western rosters struggled with rapid SEA rotation speeds.",
          droppedOut: "Alter Ego and DRS Gaming fell early.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 PMWC (Riyadh)",
        prizePool: "$3,050,000",
        payouts: [
          { rank: "1st (Champion)", team: "Alpha7 Esports", prize: "$487,000" },
          { rank: "2nd (Runner-Up)", team: "REJECT", prize: "$259,312" },
          { rank: "3rd Place", team: "Tianba", prize: "$212,312" },
          { rank: "4th Place", team: "DRX", prize: "$162,312" },
        ],
        highlights: {
          madeItLookEasy: "Alpha7 won 5 Chicken Dinners to break South America's international curse.",
          clutchesAndRivalries: "REJECT Reiji took MVP driving Japan to historic 2nd place.",
          lostComposure: "Team Falcons collapsed in Survival Stage finishing 17th.",
          droppedOut: "Vampire Esports finished 8th.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 PMWC (Riyadh)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Yangon Galacticos", prize: "$500,000" },
          { rank: "2nd (Runner-Up)", team: "Weibo Gaming", prize: "$260,000" },
          { rank: "3rd Place", team: "Alpha Gaming", prize: "$180,000" },
          { rank: "4th Place", team: "eArena", prize: "$120,000" },
        ],
        highlights: {
          madeItLookEasy: "Yangon Galacticos barely made finals from Survival Stage, then exploded on Day 3 for a miracle title.",
          clutchesAndRivalries: "DOK took SONY MVP with 31 kills.",
          lostComposure: "Weibo Gaming crumbled during water-side crashes on Sanhok.",
          droppedOut: "Defending champs Alpha7 eliminated in Survival Stage.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 PMWC (Paris)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "S2G Esports", prize: "$500,000" },
          { rank: "2nd (Runner-Up)", team: "Nongshim RedForce", prize: "$260,000" },
          { rank: "3rd Place", team: "Aurora Gaming", prize: "$186,000" },
          { rank: "4th Place", team: "eArena", prize: "$120,000" },
        ],
        highlights: {
          madeItLookEasy: "S2G logged 154 total points across 18 matches to secure the championship.",
          clutchesAndRivalries: "Qzz earned Finals MVP; Tianba won Game 18 to deny rival match point triggers.",
          lostComposure: "Nongshim RedForce fell 5 points short in the final circle.",
          droppedOut: "Yangon Galacticos missed top 4.",
        },
      },
    ],
  },
  {
    id: "lol",
    game: "League of Legends",
    fullName: "League of Legends",
    genre: "MOBA",
    type: "PC",
    peakPrizePool: "$2,000,000",
    overview: "Riot Games' 5v5 MOBA titan featuring franchised invites from LCK, LPL, LEC, and LCS.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "T1", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", team: "Top Esports (TES)", prize: "$200,000" },
          { rank: "3rd–4th", team: "Team Liquid / G2 Esports", prize: "$100,000 each" },
          { rank: "5th–8th", team: "BLG, Gen.G, Fnatic, FlyQuest", prize: "$50,000 each" },
        ],
        highlights: {
          madeItLookEasy: "T1 reverse swept Top Esports 3-1 after dropping map one in finals.",
          clutchesAndRivalries: "Faker won $50,000 MVP on Ahri/Azir mid-lane engages.",
          lostComposure: "MSI champions Gen.G suffered a shock 2-0 defeat to Top Esports in quarter-finals.",
          droppedOut: "BLG and Fnatic exited in round 1.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Gen.G Esports", prize: "$600,000" },
          { rank: "2nd (Runner-Up)", team: "AG.AL", prize: "$320,000" },
          { rank: "3rd Place", team: "T1", prize: "$230,000" },
          { rank: "4th Place", team: "G2 Esports", prize: "$160,000" },
        ],
        highlights: {
          madeItLookEasy: "Gen.G dominated macro lane metrics behind Chovy and Kiin (MVP).",
          clutchesAndRivalries: "Canyon clutched an Elder Dragon steal against T1 in semifinals.",
          lostComposure: "AG.AL lost draft flexibility in game 4 of finals.",
          droppedOut: "Fnatic and Cloud9 exited early.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Dplus KIA", prize: "$650,000" },
          { rank: "2nd (Runner-Up)", team: "Hanwha Life Esports (HLE)", prize: "$350,000" },
          { rank: "3rd Place", team: "Gen.G Esports", prize: "$220,000" },
          { rank: "4th Place", team: "BLG", prize: "$150,000" },
        ],
        highlights: {
          madeItLookEasy: "Dplus KIA won 3-2 over HLE led by ShowMaker's rotations and Lucid's early jungle invades.",
          clutchesAndRivalries: "ShowMaker controlled baron contests in game 5.",
          lostComposure: "G2 Esports and Fnatic failed to contain Asian early-game tempos.",
          droppedOut: "T1 missed the top 4 podium.",
        },
      },
    ],
  },
  {
    id: "dota2",
    game: "Dota 2 (Riyadh Masters)",
    fullName: "Dota 2",
    genre: "MOBA",
    type: "PC",
    peakPrizePool: "$15,000,000",
    overview: "Valve's high-complexity MOBA titan anchoring the highest standalone prize pools in esports history.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 Riyadh Masters",
        prizePool: "$15,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Spirit", prize: "$5,000,000" },
          { rank: "2nd (Runner-Up)", team: "Team Liquid", prize: "$2,500,000" },
          { rank: "3rd Place", team: "Talon Esports", prize: "$1,700,000" },
          { rank: "4th Place", team: "Gaimin Gladiators", prize: "$1,200,000" },
          { rank: "5th–6th", team: "9Pandas / BetBoom Team", prize: "$800,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Team Spirit swept Liquid 3-1 in grand finals after a lower-bracket run.",
          clutchesAndRivalries: "Collapse skewered Liquid's high-ground siege setups on Magnus.",
          lostComposure: "Gaimin Gladiators made reckless drafts in lower-bracket finals.",
          droppedOut: "PSG.LGD and OG exited early in playoffs.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$5,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Gaimin Gladiators", prize: "$1,500,000" },
          { rank: "2nd (Runner-Up)", team: "Team Liquid", prize: "$800,000" },
          { rank: "3rd Place", team: "Team Falcons", prize: "$600,000" },
          { rank: "4th Place", team: "Tundra Esports", prize: "$400,000" },
        ],
        highlights: {
          madeItLookEasy: "Gaimin Gladiators swept rival Liquid 3-0 in grand finals.",
          clutchesAndRivalries: "Quinn dominated mid-lane on Pangolier and Leshrac.",
          lostComposure: "Team Spirit threw a 15,000 net-worth lead against PSG.LGD to crash out in 7th.",
          droppedOut: "OG and BetBoom halted early.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Spirit", prize: "$1,000,000" },
          { rank: "2nd (Runner-Up)", team: "PARIVISION", prize: "$500,000" },
          { rank: "3rd Place", team: "Team Falcons", prize: "$300,000" },
          { rank: "4th Place", team: "Tundra Esports", prize: "$200,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Spirit went undefeated in Group A to capture a second EWC title.",
          clutchesAndRivalries: "PARIVISION made a Cinderella run; Spirit won 60-minute Roshan wars.",
          lostComposure: "Gaimin Gladiators knocked out early in playoffs.",
          droppedOut: "Virtus.pro exited in group stage.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "PARIVISION (PVISION)", prize: "$1,000,000" },
          { rank: "2nd (Runner-Up)", team: "BetBoom Team", prize: "$500,000" },
          { rank: "3rd Place", team: "Team Falcons", prize: "$300,000" },
          { rank: "4th Place", team: "Team Spirit", prize: "$200,000" },
        ],
        highlights: {
          madeItLookEasy: "PARIVISION won 3-1 over BetBoom behind Pure~ carry play and Rapier buys.",
          clutchesAndRivalries: "Pure~ won MVP with late-game teamfight survivability.",
          lostComposure: "Team Spirit lost key Tormentor fights in the lower bracket.",
          droppedOut: "NAVI and BOOM exited in group stage.",
        },
      },
    ],
  },
  {
    id: "mlbb",
    game: "Mobile Legends: Bang Bang (MLBB)",
    fullName: "Mobile Legends: Bang Bang",
    genre: "MOBA",
    type: "Mobile",
    peakPrizePool: "$3,000,000",
    overview: "MOONTON's 5v5 mobile MOBA hosting the Mid-Season Cup (MSC) with a record $3M purse across Men's and Women's divisions.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 MSC (Riyadh)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Selangor Red Giants (SRG)", prize: "$1,000,000" },
          { rank: "2nd (Runner-Up)", team: "Falcons AP.Bren", prize: "$500,000" },
          { rank: "3rd–4th", team: "Liquid ECHO / Fire Flux Esports", prize: "$200,000 each" },
          { rank: "5th–8th", team: "HomeBois, NIP Flash, See You Soon", prize: "$100,000 each" },
        ],
        highlights: {
          madeItLookEasy: "SRG ended Malaysia's 7-year drought beating AP.Bren 4-3 in a 7-game final.",
          clutchesAndRivalries: "Sekys won MVP with Retribution Lord steals on Nolan/Fanny.",
          lostComposure: "Fnatic ONIC suffered a devastating group-stage exit.",
          droppedOut: "Cloud9 and Team Liquid ID exited in group stage.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 MSC (Riyadh)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Liquid PH (TLPH)", prize: "$1,000,000" },
          { rank: "2nd (Runner-Up)", team: "Selangor Red Giants (SRG)", prize: "$500,000" },
          { rank: "3rd Place", team: "ONIC PH", prize: "$250,000" },
          { rank: "4th Place", team: "ONIC ID", prize: "$150,000" },
        ],
        highlights: {
          madeItLookEasy: "TLPH dismantled SRG 4-1; KarlTzy completed a historic Career Grand Slam.",
          clutchesAndRivalries: "Sanford took SONY MVP with EXP-lane flank maneuvers.",
          lostComposure: "SRG dropped 3 consecutive maps in finals after losing early jungle invade control.",
          droppedOut: "Virtus.pro halted in quarterfinals.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 MSC (Paris)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Fnatic ONIC", prize: "$1,000,000" },
          { rank: "2nd (Runner-Up)", team: "Team Liquid PH", prize: "$500,000" },
          { rank: "3rd Place", team: "Falcons AP.Bren", prize: "$250,000" },
          { rank: "4th Place", team: "SRG OG Esports", prize: "$150,000" },
        ],
        highlights: {
          madeItLookEasy: "Fnatic ONIC reclaimed the crown 4-2 over TLPH behind Kairi's assassin jungling.",
          clutchesAndRivalries: "Kiboy delivered a 1v2 Tigreal base defense in Game 5 semi against AP.Bren.",
          lostComposure: "Team Liquid PH lost objective smite battles in map 6.",
          droppedOut: "Wildcard qualifiers halted early.",
        },
      },
    ],
  },
  {
    id: "hok",
    game: "Honor of Kings (HoK)",
    fullName: "Honor of Kings",
    genre: "MOBA",
    type: "Mobile",
    peakPrizePool: "$3,000,000",
    overview: "Tencent's 5v5 mobile MOBA hosting the HoK Mid-Season Invitational / World Cup.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 MSI (Riyadh)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "KPL Dream Team", prize: "$1,000,000" },
          { rank: "2nd (Runner-Up)", team: "LGD Gaming My", prize: "$500,000" },
          { rank: "3rd–4th", team: "AG.AL / Keyd Stars", prize: "$250,000 each" },
        ],
        highlights: {
          madeItLookEasy: "KPL Dream Team swept LGD My 3-0 without dropping a map all playoffs.",
          clutchesAndRivalries: "Yinuo captured MVP on Arli and Lady Sun.",
          lostComposure: "International LATAM/EMEA squads struggled against KPL lane rotation speeds.",
          droppedOut: "Team Falcons and Team Vitality exited in group stage.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 World Cup (Riyadh)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "AG.AL", prize: "$750,000" },
          { rank: "2nd (Runner-Up)", team: "ThunderTalk Global (TT Global)", prize: "$460,000" },
          { rank: "3rd Place", team: "Nova Esports", prize: "$300,000" },
          { rank: "4th Place", team: "Black Shrew Esport", prize: "$200,000" },
        ],
        highlights: {
          madeItLookEasy: "AG.AL won 4-3 over TT Global in a 7-game thriller.",
          clutchesAndRivalries: "AG.AL turned around a 10,000 gold deficit on map 6.",
          lostComposure: "TT Global failed to secure Dark Slayer on game point.",
          droppedOut: "Keyd Stars eliminated in quarterfinals.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 World Cup (Paris)",
        prizePool: "$3,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Black Shrew Esport (BSE)", prize: "$850,000" },
          { rank: "2nd (Runner-Up)", team: "AG.AL", prize: "$450,000" },
          { rank: "3rd Place", team: "Dominator Esports", prize: "$280,000" },
          { rank: "4th Place", team: "ThunderTalk Global", prize: "$180,000" },
        ],
        highlights: {
          madeItLookEasy: "Malaysian club BSE became the first non-Chinese team to win the world title, beating AG.AL 4-2.",
          clutchesAndRivalries: "Musanking earned MVP with Retribution smites; BSE pulled a 2v4 nexus stand vs Dominator.",
          lostComposure: "AG.AL crumbled against BSE's jungle invade tempos.",
          droppedOut: "Group-stage non-SEA teams eliminated.",
        },
      },
    ],
  },
  {
    id: "freefire",
    game: "Garena Free Fire",
    fullName: "Garena Free Fire",
    genre: "Battle Royale",
    type: "Mobile",
    peakPrizePool: "$1,050,000",
    overview: "Fast-paced 12-squad mobile battle royale featuring Knockout Points Rush into Grand Finals Point Rush.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$1,050,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Falcons", prize: "$300,000" },
          { rank: "2nd (Runner-Up)", team: "EVOS Divine", prize: "$175,000" },
          { rank: "3rd Place", team: "Netshoes Miners", prize: "$125,000" },
          { rank: "4th Place", team: "Buriram United Esports", prize: "$80,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Falcons dominated Bermuda and Purgatory rotations for a home victory.",
          clutchesAndRivalries: "COUGAR won MVP with opening utility frags.",
          lostComposure: "LOUD and Fluxo failed to adapt to SEA zone crashing.",
          droppedOut: "P Esports exited in knockout stage.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "EVOS Esports (EVOS Divine)", prize: "$300,000" },
          { rank: "2nd (Runner-Up)", team: "P Esports", prize: "$170,000" },
          { rank: "3rd Place", team: "Buriram United Esports", prize: "$110,000" },
          { rank: "4th Place", team: "Team Falcons", prize: "$80,000" },
        ],
        highlights: {
          madeItLookEasy: "EVOS won a 10-game marathon; 15-year-old Rasyah named MVP.",
          clutchesAndRivalries: "Rasyah clutched 1v2 zone-boundary holds.",
          lostComposure: "Falcons slumped on the final day on Nexterra maps.",
          droppedOut: "LATAM squads fell early.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Buriram United Esports", prize: "$300,000" },
          { rank: "2nd (Runner-Up)", team: "EVOS Divine", prize: "$175,000" },
          { rank: "3rd Place", team: "Magic Squad", prize: "$110,000" },
          { rank: "4th Place", team: "Team Falcons", prize: "$80,000" },
        ],
        highlights: {
          madeItLookEasy: "Buriram logged 4 Booyahs across 8 final matches to take the crown.",
          clutchesAndRivalries: "MOSHI secured MVP with 31 elims; a 4v4 final-circle push on Alpine sealed the title.",
          lostComposure: "EVOS Divine lost the final zone rotation.",
          droppedOut: "Knockout-stage casualties eliminated early.",
        },
      },
    ],
  },
  {
    id: "sf6",
    game: "Street Fighter 6",
    fullName: "Street Fighter 6",
    genre: "Fighting",
    type: "Console / PC",
    peakPrizePool: "$1,000,000",
    overview: "Capcom's flagship 1v1 fighter featuring 32 to 48 players in double-stage group brackets.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Kakeru (JP)", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", player: "AngryBird (Ken)", prize: "$200,000" },
          { rank: "3rd Place", player: "Punk (Cammy)", prize: "$100,000" },
          { rank: "4th Place", player: "Big Bird (Marisa)", prize: "$80,000" },
        ],
        highlights: {
          madeItLookEasy: "Kakeru reset the grand finals bracket from the lower side and defeated AngryBird.",
          clutchesAndRivalries: "Kakeru neutralized Ken's rushdown with JP parries and wall triggers.",
          lostComposure: "Daigo and MenaRD made costly execution drops during burnout states.",
          droppedOut: "Xian and Phenom dropped in group stage.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Xiao Hai (M. Bison / Ken)", prize: "$300,000" },
          { rank: "2nd (Runner-Up)", player: "Kawano (Akuma)", prize: "$150,000" },
          { rank: "3rd–4th", player: "Gachikun (Rashid) / Tachikawa (Ed)", prize: "$75,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Xiao Hai swept the upper bracket using frame-perfect Bison and Ken punishes.",
          clutchesAndRivalries: "Kawano caught in burnout traps in grand finals.",
          lostComposure: "Hikaru and AngryBird knocked out in quarterfinals.",
          droppedOut: "Group-stage casualties dropped early.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Xiao Hai (M. Bison / Mai)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "Blaz (Ryu / Ken)", prize: "$140,000" },
          { rank: "3rd Place", player: "Leshar (Ed / Terry)", prize: "$80,000" },
          { rank: "4th Place", player: "AngryBird (Akuma)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "Xiao Hai achieved back-to-back titles winning a 5-4 grand final reset.",
          clutchesAndRivalries: "14-year-old Blaz blew a 3-0 lead after a dropped combo; Xiao Hai reverse swept.",
          lostComposure: "Blaz's mental fortitude wavered under Mai projectile zoning.",
          droppedOut: "Go1 and MenaRD halted in quarterfinals.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Craime (Cammy / Luke)", prize: "$300,000" },
          { rank: "2nd (Runner-Up)", player: "Hinao (Guile)", prize: "$150,000" },
          { rank: "3rd Place", player: "Xiao Hai (M. Bison)", prize: "$80,000" },
          { rank: "4th Place", player: "Blaz (Ken)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "15-year-old Craime (Team Falcons) became the youngest EWC champ with surgical Cammy dive-kicks.",
          clutchesAndRivalries: "Craime navigated Guile sonic boom corridors with pixel-perfect parries.",
          lostComposure: "Hinao lost neutral pacing in map 5.",
          droppedOut: "Xiao Hai eliminated in 3rd by Craime.",
        },
      },
    ],
  },
  {
    id: "tekken8",
    game: "Tekken 8",
    fullName: "Tekken 8",
    genre: "Fighting",
    type: "Console / PC",
    peakPrizePool: "$1,000,000",
    overview: "Bandai Namco's premier 3D fighter integrated with Tekken World Tour.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Atif Butt (Dragunov / Feng)", prize: "$300,000" },
          { rank: "2nd (Runner-Up)", player: "Arslan Ash (Victor / Zafina)", prize: "$150,000" },
          { rank: "3rd Place", player: "MulGold (Claudio)", prize: "$75,000" },
          { rank: "4th Place", player: "CBM (Jin)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "Atif Butt beat mentor Arslan Ash 5-3 in an all-Pakistani grand final.",
          clutchesAndRivalries: "Atif earned MVP with defensive execution and whiff punishment.",
          lostComposure: "Knee and JDCR struggled against Heat-system mixups.",
          droppedOut: "Ulsan and Rangchu halted in quarterfinals.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Ulsan (Bob / Dragunov / Reina)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "LowHigh (Bryan / Shaheen)", prize: "$130,000" },
          { rank: "3rd Place", player: "CBM (Jin)", prize: "$70,000" },
          { rank: "4th Place", player: "JeonDDing (Eddy / Bob)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "Ulsan dismantled LowHigh 5-2 for Korean redemption.",
          clutchesAndRivalries: "Ulsan earned MVP; JeonDDing clutched Eddy stance mixups.",
          lostComposure: "Atif and Arslan Ash suffered early playoff exits.",
          droppedOut: "chikurin and qudans dropped in top 8.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "M. Zubair (Dragunov)", prize: "$250,000 (+$50k Jafonso Award)" },
          { rank: "2nd (Runner-Up)", player: "LowHigh (Bryan)", prize: "$130,000" },
          { rank: "3rd Place", player: "Yagami", prize: "$70,000" },
          { rank: "4th Place", player: "Arslan Ash (Zafina / Victor)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "LCQ qualifier M. Zubair executed a 5-0 grand final sweep against LowHigh.",
          clutchesAndRivalries: "Zubair won the Jafonso Award and propelled AG.AL to a $7M Club Title.",
          lostComposure: "LowHigh dropped 5 consecutive rounds under Zubair's Dragunov pressure.",
          droppedOut: "Ulsan and CBM halted in top 8.",
        },
      },
    ],
  },
  {
    id: "eafc",
    game: "EA Sports FC",
    fullName: "EA Sports FC",
    genre: "Sports Simulation",
    type: "Console / PC",
    peakPrizePool: "$1,000,000",
    overview: "1v1 virtual football integrated with the FC Pro World Championship circuit.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "jafonsogv (Luna Galaxy)", prize: "$300,000" },
          { rank: "2nd (Runner-Up)", player: "Young (Tuzzy E-Sports)", prize: "$150,000" },
          { rank: "3rd–4th", player: "AboMakkah / PHzin", prize: "$90,000 each" },
          { rank: "5th–8th", player: "ManuBachoore, Mark11, Nicolas99FC, Vejrgang", prize: "$50,000 each" },
        ],
        highlights: {
          madeItLookEasy: "jafonsogv controlled tempo with green-timed finishing to dominate finals.",
          clutchesAndRivalries: "jafonsogv won MVP going undefeated in knockout stages.",
          lostComposure: "Vejrgang crumbled in late defensive transitions; MSdossary7 exited early in 13th.",
          droppedOut: "Levi de Weerd exited in group stage.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "ManuBachoore (Team Liquid)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "Brice Masson (Team Vitality)", prize: "$130,000" },
        ],
        highlights: {
          madeItLookEasy: "ManuBachoore fought through a 512-player LCQ to win the world title 5-3 over Masson.",
          clutchesAndRivalries: "Became the first-ever 2-time EA FC / FIFA World Champion.",
          lostComposure: "Top seeds caught off guard by LCQ pressing tactics.",
          droppedOut: "Pre-tournament favorites missed final day.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Vejrgang (RBL ZELD)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "jafonsogv (Luna Galaxy)", prize: "$130,000" },
          { rank: "3rd Place", player: "ManuBachoore (Team Liquid)", prize: "$70,000" },
          { rank: "4th Place", player: "PHzin (Al-Ula FC)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "Vejrgang won 4-3 in a final-minute thriller over 2024 champ jafonsogv.",
          clutchesAndRivalries: "Vejrgang took MVP setting tournament goal records.",
          lostComposure: "ManuBachoore failed to recover from an early 3-0 deficit in semis.",
          droppedOut: "Group-stage favorites exited early.",
        },
      },
    ],
  },
  {
    id: "rocketleague",
    game: "Rocket League",
    fullName: "Rocket League",
    genre: "Sports / Vehicular",
    type: "Console / PC",
    peakPrizePool: "$2,000,000",
    overview: "3v3 vehicular soccer phenomenon anchoring major Club Championship points.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 (Riyadh)",
        prizePool: "$2,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Version1", prize: "$500,000" },
          { rank: "2nd (Runner-Up)", team: "Rule One", prize: "$300,000" },
          { rank: "3rd Place", team: "BDS Esports", prize: "$200,000" },
          { rank: "4th Place", team: "Team Vitality", prize: "$150,000" },
        ],
        highlights: {
          madeItLookEasy: "Version1 demo-heavy aerial playstyle crushed European defenses 4-1 in finals.",
          clutchesAndRivalries: "BeastMode took MVP with backboard saves and flip reset goals.",
          lostComposure: "Falcons and Vitality crumbled in Game 7 OT scenarios.",
          droppedOut: "G2, Gen.G, and FURIA stopped in quarterfinals.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$550,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team BDS", prize: "$200,000" },
          { rank: "2nd (Runner-Up)", team: "Team Falcons", prize: "$100,000" },
          { rank: "3rd–4th", team: "Gen.G Mobil1 / G2 Stride", prize: "$50,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Team BDS weathered a Falcons comeback in a 4-2 series; dralii took MVP.",
          clutchesAndRivalries: "dralii flip-reset pass setups sealed Game 6 OT.",
          lostComposure: "Gentle Mates Alpine failed to escape group stage.",
          droppedOut: "FURIA and Vitality halted in quarterfinals.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "Karmine Corp (KC)", prize: "$200,000" },
          { rank: "2nd (Runner-Up)", team: "Team Falcons", prize: "$100,000" },
          { rank: "3rd Place", team: "G2 Stride", prize: "$50,000" },
          { rank: "4th Place", team: "Spacestation Gaming", prize: "$35,000" },
        ],
        highlights: {
          madeItLookEasy: "Karmine Corp beat Falcons 4-2 in grand finals.",
          clutchesAndRivalries: "Vatira and rise locked backboard rotations.",
          lostComposure: "Falcons suffered defensive miscommunications in Games 5 & 6.",
          droppedOut: "Defending champs BDS swept 4-0 in quarterfinals.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Falcons", prize: "$350,000" },
          { rank: "2nd (Runner-Up)", team: "Spacestation Gaming (SSG)", prize: "$180,000" },
          { rank: "3rd Place", team: "Karmine Corp", prize: "$100,000" },
          { rank: "4th Place", team: "G2 Stride", prize: "$70,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Falcons broke the curse in Paris with a 4-0 sweep over SSG; swept KC 4-0 in semis.",
          clutchesAndRivalries: "Rw9 earned MVP recording zero-second saves.",
          lostComposure: "SSG surrendered three rapid counter-attack goals in Game 4.",
          droppedOut: "FURIA and Astralis exited in quarterfinals.",
        },
      },
    ],
  },
  {
    id: "tft",
    game: "Teamfight Tactics (TFT)",
    fullName: "Teamfight Tactics",
    genre: "Auto Battler",
    type: "PC / Mobile",
    peakPrizePool: "$500,000",
    overview: "Riot Games' 4v4 team-based auto battler strategy tournament.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "Wolves Esports", prize: "$150,000" },
          { rank: "2nd (Runner-Up)", team: "T1", prize: "$90,000" },
          { rank: "3rd Place", team: "Vitality", prize: "$50,000" },
          { rank: "4th Place", team: "Twisted Minds", prize: "$30,000" },
        ],
        highlights: {
          madeItLookEasy: "Wolves Esports dominated cross-board item distribution against T1.",
          clutchesAndRivalries: "LiShao won MVP hitting 3-star 4-cost unit upgrades.",
          lostComposure: "Vitality lost tempo in semis failing fast-8 power spikes.",
          droppedOut: "Weibo and Fnatic halted in quarterfinals.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "Weibo Gaming (WBG)", prize: "$150,000" },
          { rank: "2nd (Runner-Up)", team: "T1", prize: "$90,000" },
          { rank: "3rd Place", team: "Wolves Esports", prize: "$50,000" },
          { rank: "4th Place", team: "Fnatic", prize: "$30,000" },
        ],
        highlights: {
          madeItLookEasy: "Weibo Gaming defeated Wolves in semis and swept T1 in finals.",
          clutchesAndRivalries: "T1 suffered back-to-back runner-up finishes due to Augment RNG.",
          lostComposure: "Fnatic and Vitality struggled with the aggressive leveling meta.",
          droppedOut: "Zeta Division halted early.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Vision", prize: "$150,000" },
          { rank: "2nd (Runner-Up)", team: "Aurora Gaming", prize: "$90,000" },
          { rank: "3rd Place", team: "AG.AL", prize: "$50,000" },
          { rank: "4th Place", team: "WANIN FlashWolves", prize: "$30,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Vision swept Aurora Gaming 3-0 in grand finals.",
          clutchesAndRivalries: "Flancy won SONY MVP with 1.8 average placement.",
          lostComposure: "T1 collapsed in group stage missing top 8 for the first time.",
          droppedOut: "Defending champs Weibo Gaming knocked out 2-0 by Aurora.",
        },
      },
    ],
  },
  {
    id: "fortnite",
    game: "Fortnite",
    fullName: "Fortnite",
    genre: "Battle Royale",
    type: "Console / PC",
    peakPrizePool: "$1,000,000",
    overview: "Epic Games' phenomenon featuring Hardpoint Arena layout in 2024 evolving into Fortnite Reload Championship.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 Arena (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "XSET", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", team: "Exceed", prize: "$160,000" },
          { rank: "3rd Place", team: "Heroic", prize: "$100,000" },
          { rank: "4th Place", team: "Karmine Corp", prize: "$80,000" },
        ],
        highlights: {
          madeItLookEasy: "XSET defeated Exceed 4-2 in arena hardpoint finals.",
          clutchesAndRivalries: "Clix took MVP with 1v2 objective stalls.",
          lostComposure: "Falcons and Karmine Corp burned builds prematurely.",
          droppedOut: "Dignitas and Fnatic exited in group stage.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 Duos (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "HAVOK (SwizzY & Merstach)", prize: "$350,000" },
          { rank: "2nd (Runner-Up)", team: "Team Falcons (Peterbot & Pollo)", prize: "$180,000" },
          { rank: "3rd Place", team: "BIG (vic0 & Malibuca)", prize: "$100,000" },
          { rank: "4th Place", team: "Dignitas (Khanada & Cooper)", prize: "$70,000" },
        ],
        highlights: {
          madeItLookEasy: "SwizzY and Merstach mastered endzone tarping and surge checks.",
          clutchesAndRivalries: "Peterbot & Pollo dominated elims but caught off-guard in Match Point height fight.",
          lostComposure: "Dignitas suffered back-to-back early wipes during storm surge.",
          droppedOut: "XSET missed podium.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 Reload (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "BIG (Malibuca & vic0)", prize: "$260,000 (+$25k MVP)" },
          { rank: "2nd (Runner-Up)", team: "LYOST / RVNS (Momsy & SkyJump)", prize: "$150,000" },
          { rank: "3rd Place", team: "AURA Esports (shxrk & t3eny)", prize: "$100,000" },
          { rank: "4th Place", team: "HAVOK (SwizzY & Pixie)", prize: "$70,000" },
        ],
        highlights: {
          madeItLookEasy: "BIG won Game 13 with 8 elims to cross the 350-point threshold in a 9-team match point frenzy.",
          clutchesAndRivalries: "vic0 won SONY MVP with 32 elims and 19 knocks.",
          lostComposure: "Aurora Gaming held the points lead but shut out early in Games 11-13.",
          droppedOut: "Falcons and Vitality exited in group stage.",
        },
      },
    ],
  },
  {
    id: "starcraft2",
    game: "StarCraft II",
    fullName: "StarCraft II",
    genre: "RTS",
    type: "PC",
    peakPrizePool: "$1,000,000",
    overview: "Blizzard's 1v1 RTS titan serving as the EPT World Championship major.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", player: "Reynor (Zerg)", prize: "$150,000" },
          { rank: "2nd (Runner-Up)", player: "Cure (Terran)", prize: "$75,000" },
          { rank: "3rd–4th", player: "Serral (Zerg) / Maru (Terran)", prize: "$40,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Reynor defeated Cure 4-2 with APM multi-prong ling-bane attacks.",
          clutchesAndRivalries: "Reynor beat Serral 4-3 in a map 7 semifinal decider.",
          lostComposure: "Maru suffered a macro breakdown against Cure's bio drops.",
          droppedOut: "Dark and Classic halted in quarterfinals.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 EPT (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", player: "Clem (Terran)", prize: "$400,000" },
          { rank: "2nd (Runner-Up)", player: "Serral (Zerg)", prize: "$150,000" },
          { rank: "3rd–4th", player: "Dark (Zerg) / herO (Protoss)", prize: "$80,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Clem executed a 5-0 sweep over world champion Serral in grand finals.",
          clutchesAndRivalries: "Clem took MVP with an 82% map win rate.",
          lostComposure: "Serral left shell-shocked by Clem's marine splitting and widow-mine drops.",
          droppedOut: "Maru and Reynor dropped in top 8.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$700,000",
        payouts: [
          { rank: "1st (Champion)", player: "Serral (Zerg)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "Clem (Terran)", prize: "$120,000" },
          { rank: "3rd Place", player: "herO (Protoss)", prize: "$70,000" },
          { rank: "4th Place", player: "Maru (Terran)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "Serral exacted vengeance beating Clem 5-3 in finals.",
          clutchesAndRivalries: "herO reached back-to-back semis with proxy stargate builds.",
          lostComposure: "Clem threw the lead sending maxed mech armies into lurker chokepoints.",
          droppedOut: "Reynor and Cure exited in quarterfinals.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$700,000",
        payouts: [
          { rank: "1st (Champion)", player: "Dark (Zerg)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "Clem (Terran)", prize: "$120,000" },
          { rank: "3rd Place", player: "Serral (Zerg)", prize: "$70,000" },
          { rank: "4th Place", player: "herO (Protoss)", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "Dark (AG.AL) won the lower bracket and beat Clem 5-3 in finals.",
          clutchesAndRivalries: "Dark's win sealed AG.AL's $7M Club Championship title.",
          lostComposure: "Clem faltered against Dark's early Nydus worm aggression.",
          droppedOut: "Maru and MaxPax halted in top 8.",
        },
      },
    ],
  },
  {
    id: "rennsport",
    game: "Rennsport (ESL R1)",
    fullName: "Rennsport",
    genre: "Racing / Sim",
    type: "PC",
    peakPrizePool: "$1,000,000",
    overview: "Ultra-realistic sim racing integrated with ESL R1 featuring automotive manufacturers.",
    editions: [
      {
        year: 2023,
        event: "Gamers8 2023 (Riyadh)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Driver)", player: "Maximilian Benecke (MOUZ)", prize: "$100,000" },
          { rank: "1st (Team)", team: "Porsche Coanda Esports", prize: "$150,000" },
          { rank: "2nd (Driver)", player: "Kevin Siggy (Redline)", prize: "$50,000" },
          { rank: "2nd (Team)", team: "BMW M Team Redline", prize: "$90,000" },
        ],
        highlights: {
          madeItLookEasy: "Porsche Coanda controlled telemetry and pit strategy for the team title.",
          clutchesAndRivalries: "Benecke overtook Siggy in the final chicane on Nürburgring.",
          lostComposure: "BMW Redline suffered track-limit penalties forfeiting grid positions.",
          droppedOut: "FaZe and Heroic dropped early.",
        },
      },
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "Team Redline (BMW M)", prize: "$140,000" },
          { rank: "2nd (Runner-Up)", team: "Porsche Coanda Esports", prize: "$88,000" },
          { rank: "3rd Place", team: "Vitality", prize: "$52,000" },
          { rank: "4th Place", team: "MOUZ", prize: "$36,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Redline locked out the front row at Circuit de la Sarthe; Bennett took MVP.",
          clutchesAndRivalries: "Bennett set three pole positions.",
          lostComposure: "Porsche Coanda caught in a Turn 1 pileup destroying suspension.",
          droppedOut: "FaZe and G2 exited in group stage.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "BMW Redline / Red Bull Sim", prize: "$200,000" },
          { rank: "2nd (Runner-Up)", team: "Virtus.pro", prize: "$100,000" },
          { rank: "3rd Place", team: "Team Vitality", prize: "$60,000" },
          { rank: "4th Place", team: "Porsche Coanda Esports", prize: "$40,000" },
        ],
        highlights: {
          madeItLookEasy: "Team Redline repeated as champions sweeping Sprint and Endurance formats.",
          clutchesAndRivalries: "Luke Bennett took back-to-back MVPs; Virtus.pro made a shock run with hyper-aggressive braking.",
          lostComposure: "Porsche Coanda missed tire-warming windows on Hockenheimring.",
          droppedOut: "Mercedes-AMG exited in group stage.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "AG.AL Sim Racing", prize: "$200,000" },
          { rank: "2nd (Runner-Up)", team: "BMW M Team Redline", prize: "$100,000" },
          { rank: "3rd Place", team: "Virtus.pro", prize: "$60,000" },
          { rank: "4th Place", team: "Porsche Coanda Esports", prize: "$40,000" },
        ],
        highlights: {
          madeItLookEasy: "AG.AL won a final-lap bumper battle on the Paris street track to clinch the $7M Club Championship.",
          clutchesAndRivalries: "AG.AL's 1000 points officially won the EWC Club Crown.",
          lostComposure: "Redline miscalculated fuel load forcing coast-mode on the final straight.",
          droppedOut: "Williams and Vitality halted in quarterfinals.",
        },
      },
    ],
  },
  {
    id: "crossfire",
    game: "Crossfire",
    fullName: "Crossfire",
    genre: "Tactical FPS",
    type: "PC",
    peakPrizePool: "$1,000,000",
    overview: "Tactical 5v5 Search & Destroy shooter, popular in Asia and South America.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "All Gamers (AG.AL)", prize: "$180,000" },
          { rank: "2nd (Runner-Up)", team: "EVOLUTION POWER GAMING", prize: "$100,000" },
          { rank: "3rd Place", team: "BaiSha Gaming (BS)", prize: "$60,000" },
          { rank: "4th Place", team: "Vasco Esports", prize: "$40,000" },
        ],
        highlights: {
          madeItLookEasy: "All Gamers defeated EP 3-1 in grand finals with Even taking MVP.",
          clutchesAndRivalries: "Even dropped game-winning multi-frags in bomb-defuse scenarios.",
          lostComposure: "Vasco and Imperial lost execute tempo in semifinals.",
          droppedOut: "Chengdu AG halted in quarterfinals.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$750,000",
        payouts: [
          { rank: "1st (Champion)", team: "All Gamers (AG.AL)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", team: "BaiSha Gaming (BS)", prize: "$130,000" },
          { rank: "3rd Place", team: "EVOLUTION POWER GAMING", prize: "$80,000" },
          { rank: "4th Place", team: "Chengdu AG", prize: "$50,000" },
        ],
        highlights: {
          madeItLookEasy: "AG.AL reverse swept rival BaiSha Gaming 3-2 to repeat as champions.",
          clutchesAndRivalries: "ZY took SONY MVP with 1v3 clutches on Port.",
          lostComposure: "BaiSha Gaming blew a 2-0 series lead on Map 3 overtime.",
          droppedOut: "Imperial and Vasco stopped in top 8.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,000,000",
        payouts: [
          { rank: "1st (Champion)", team: "BaiSha Gaming (BS)", prize: "$350,000" },
          { rank: "2nd (Runner-Up)", team: "Team Liquid", prize: "$180,000" },
          { rank: "3rd Place", team: "AG.AL", prize: "$100,000" },
          { rank: "4th Place", team: "EVOLUTION POWER GAMING", prize: "$70,000" },
        ],
        highlights: {
          madeItLookEasy: "BaiSha Gaming won 5 lower-bracket matches and swept Team Liquid 3-0 in finals.",
          clutchesAndRivalries: "N9 took MVP with 1.42 K/D in the lower-bracket run.",
          lostComposure: "Team Liquid choked a 9-3 halftime lead on Map 2.",
          droppedOut: "Two-time champs AG.AL stopped in 3rd place.",
        },
      },
    ],
  },
  {
    id: "cod",
    game: "Call of Duty (CDL & Warzone)",
    fullName: "Call of Duty",
    genre: "FPS / Battle Royale",
    type: "Console / PC",
    peakPrizePool: "$2,800,000",
    overview: "Dual tournament featuring 4v4 CDL Multiplayer Arena and 32-Trio Warzone Resurgence.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$2,800,000",
        payouts: [
          { rank: "1st (MWIII)", team: "Atlanta FaZe", prize: "$600,000" },
          { rank: "2nd (MWIII)", team: "100 Thieves", prize: "$320,000" },
          { rank: "1st (Warzone)", team: "Team Falcons", prize: "$200,000" },
          { rank: "2nd (Warzone)", team: "Fnatic", prize: "$120,000" },
        ],
        highlights: {
          madeItLookEasy: "Atlanta FaZe beat 100T 4-2; Cellium took MVP on Karachi SnD.",
          clutchesAndRivalries: "Team Falcons won the Warzone title on home soil.",
          lostComposure: "CDL champs OpTic dropped critical Control rounds in semis.",
          droppedOut: "Cloud9 and Toronto Ultra stopped in quarterfinals.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$2,800,000",
        payouts: [
          { rank: "1st (MW Title)", team: "OpTic Gaming", prize: "$600,000" },
          { rank: "2nd (MW Title)", team: "Atlanta FaZe", prize: "$320,000" },
          { rank: "1st (Warzone)", team: "Gentle Mates", prize: "$200,000" },
          { rank: "2nd (Warzone)", team: "Team Falcons", prize: "$120,000" },
        ],
        highlights: {
          madeItLookEasy: "OpTic won 4-3 in game 7 SnD over FaZe.",
          clutchesAndRivalries: "Gentle Mates won back-to-back high-kill matches to leapfrog Falcons in Warzone.",
          lostComposure: "Warzone champs Falcons needed 6 points but wiped in 18th in game 8.",
          droppedOut: "Cloud9 halted in 4th.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$2,800,000",
        payouts: [
          { rank: "1st (Black Ops)", team: "OpTic Gaming", prize: "$600,000" },
          { rank: "2nd (Black Ops)", team: "Team Heretics", prize: "$320,000" },
          { rank: "1st (Warzone)", team: "G2 Esports", prize: "$200,000" },
          { rank: "2nd (Warzone)", team: "Anziety's Squad", prize: "$120,000" },
        ],
        highlights: {
          madeItLookEasy: "OpTic secured back-to-back titles beating Heretics 5-3.",
          clutchesAndRivalries: "G2's Anziety won SONY MVP in Warzone Resurgence.",
          lostComposure: "Heretics blew a 3-2 lead losing three straight Hardpoints.",
          droppedOut: "Atlanta FaZe halted in semis.",
        },
      },
    ],
  },
  {
    id: "standoff2",
    game: "Standoff 2",
    fullName: "Standoff 2",
    genre: "Tactical FPS",
    type: "Mobile",
    peakPrizePool: "$500,000",
    overview: "Fast-paced mobile 5v5 Search & Destroy tactical shooter.",
    editions: [
      {
        year: 2024,
        event: "Esports World Cup 2024 (Riyadh)",
        prizePool: "$250,000",
        payouts: [
          { rank: "1st (Champion)", team: "Virtus.pro", prize: "$100,000" },
          { rank: "2nd (Runner-Up)", team: "Absolute", prize: "$50,000" },
          { rank: "3rd Place", team: "REVIVAL Esports", prize: "$30,000" },
          { rank: "4th Place", team: "Necessary", prize: "$20,000" },
        ],
        highlights: {
          madeItLookEasy: "Virtus.pro swept the upper bracket and beat Absolute 3-0 in finals.",
          clutchesAndRivalries: "Machao took MVP with a 1.38 K/D ratio.",
          lostComposure: "Absolute surrendered 8 unanswered rounds on Sandstone.",
          droppedOut: "Horizon halted in top 8.",
        },
      },
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "Virtus.pro", prize: "$200,000" },
          { rank: "2nd (Runner-Up)", team: "Necessary", prize: "$100,000" },
          { rank: "3rd Place", team: "Absolute", prize: "$60,000" },
          { rank: "4th Place", team: "Team Falcons", prize: "$40,000" },
        ],
        highlights: {
          madeItLookEasy: "Virtus.pro won back-to-back titles 3-1 over Necessary.",
          clutchesAndRivalries: "Flyn took SONY MVP with 41 frags in grand finals.",
          lostComposure: "Necessary dropped a 4v2 post-plant defense on Zone 9.",
          droppedOut: "Group-stage casualties eliminated early.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", team: "Necessary", prize: "$200,000" },
          { rank: "2nd (Runner-Up)", team: "Virtus.pro", prize: "$100,000" },
          { rank: "3rd Place", team: "Absolute", prize: "$60,000" },
          { rank: "4th Place", team: "REVIVAL Esports", prize: "$40,000" },
        ],
        highlights: {
          madeItLookEasy: "Necessary dethroned two-time champs Virtus.pro 3-1.",
          clutchesAndRivalries: "Necessary pulled a 1v3 AWP clutch with 3 seconds left on Rust.",
          lostComposure: "VP suffered mid-round communication breakdowns on Sakura.",
          droppedOut: "Group-stage qualifiers exited.",
        },
      },
    ],
  },
  {
    id: "trackmania",
    game: "Trackmania",
    fullName: "Trackmania",
    genre: "Racing / Time-Trial",
    type: "PC",
    peakPrizePool: "$500,000",
    overview: "Precision time-trial physics racing featuring Cup-format layouts.",
    editions: [
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$500,000",
        payouts: [
          { rank: "1st (Champion)", player: "Gwen (Team Vitality)", prize: "$130,000" },
          { rank: "2nd (Runner-Up)", player: "Pac (MOUZ)", prize: "$75,000" },
          { rank: "3rd Place", player: "Binkss (Karmine Corp)", prize: "$45,000" },
          { rank: "4th Place", player: "Otaaaq (Solary)", prize: "$30,000" },
          { rank: "5th–8th", player: "Stufts, Epos, Pusztitopako, Mudda", prize: "$18,000 each" },
          { rank: "9th–16th", player: "Carl Jr., Affi, Wosile, LinkMax", prize: "$10,000 each" },
        ],
        highlights: {
          madeItLookEasy: "Gwen (Vitality) hit Finalist status early and won the decider track for $130k.",
          clutchesAndRivalries: "Gwen took SONY MVP setting fastest times on 6 of 9 maps.",
          lostComposure: "Pac (MOUZ) missed the winning lap by 0.008s after clipping a wall on the final chicane.",
          droppedOut: "5-time champion Carl Jr. crashed during Group B decider heat.",
        },
      },
    ],
  },
  {
    id: "chess",
    game: "Chess (EWC Invitational)",
    fullName: "Chess",
    genre: "Mind Sport",
    type: "Digital / Onsite Hybrid",
    peakPrizePool: "$1,500,000",
    overview: "Elite 1v1 Rapid mind sport integrated with Chess.com featuring top Grandmasters under club banners.",
    editions: [
      {
        year: 2025,
        event: "Esports World Cup 2025 (Riyadh)",
        prizePool: "$1,500,000",
        payouts: [
          { rank: "1st (Champion)", player: "Magnus Carlsen (Team Liquid)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "Alireza Firouzja (Team Falcons)", prize: "$190,000" },
          { rank: "3rd Place", player: "Hikaru Nakamura (Team Falcons)", prize: "$145,000" },
          { rank: "4th Place", player: "Arjun Erigaisi (Gen.G)", prize: "$115,000" },
        ],
        highlights: {
          madeItLookEasy: "Magnus Carlsen defeated Alireza Firouzja 3-1 in sets in grand finals.",
          clutchesAndRivalries: "Carlsen won an Armageddon tiebreak with Black against Hikaru in semis.",
          lostComposure: "Firouzja hung a rook under time pressure in the final set.",
          droppedOut: "Nepomniachtchi and Abdusattorov halted in quarterfinals.",
        },
      },
      {
        year: 2026,
        event: "Esports World Cup 2026 (Paris)",
        prizePool: "$1,500,000",
        payouts: [
          { rank: "1st (Champion)", player: "Magnus Carlsen (Team Liquid)", prize: "$250,000" },
          { rank: "2nd (Runner-Up)", player: "Denis Lazavik (AG.AL)", prize: "$190,000" },
          { rank: "3rd Place", player: "Hikaru Nakamura (Team Falcons)", prize: "$145,000" },
          { rank: "4th Place", player: "Alireza Firouzja (Team Falcons)", prize: "$100,000" },
        ],
        highlights: {
          madeItLookEasy: "Magnus Carlsen went undefeated across the entire tournament (11 wins, 9 draws).",
          clutchesAndRivalries: "Lazavik's 2nd-place run secured 750 points to seal AG.AL's $7M Club Championship.",
          lostComposure: "Top grandmasters blundered winning positions under live venue audience noise.",
          droppedOut: "Nepomniachtchi, Wei Yi, and Niemann halted in earlier rounds.",
        },
      },
    ],
  },
];

const HIGHLIGHT_LABELS = [
  ["madeItLookEasy", "Made it look easy"],
  ["clutchesAndRivalries", "Clutches and rivalries"],
  ["lostComposure", "Lost composure"],
  ["droppedOut", "Dropped out"],
];

export function researchHighlightLabels() {
  return HIGHLIGHT_LABELS;
}

export function editionsNewestFirst(editions = []) {
  return [...editions].sort((a, b) => Number(b.year) - Number(a.year));
}

export function yearlyStatsFromEditions(editions = []) {
  return editionsNewestFirst(editions).map((edition) => ({
    year: edition.year,
    tournamentCount: 1,
    circuit: edition.event || "",
    region: /paris/i.test(edition.event || "") ? "Europe" : /riyadh|gamers8/i.test(edition.event || "") ? "Middle East" : "Global",
  }));
}

export function flattenEwcEditions(slides = []) {
  return slides.flatMap((slide) =>
    editionsNewestFirst(slide.editions || [])
      .filter((edition) => {
        if (edition.eventScope === "region" || edition.eventScope === "random") return false;
        return isEwcEdition(edition) || slide.research || slide.eventScope === "ewc";
      })
      .map((edition) => ({
        ...edition,
        eventScope: "ewc",
        game: slide.game,
        slug: slide.slug,
        dossier: slide.title,
        peakPrizePool: slide.peakPrizePool,
      })),
  ).sort((a, b) => Number(b.year) - Number(a.year) || String(a.game).localeCompare(String(b.game)));
}

export function groupEwcChampionships(editions = []) {
  const groups = new Map();
  editions.forEach((edition) => {
    const year = String(edition.year || "");
    const place = /paris/i.test(edition.event || "") ? "Paris" : /riyadh|gamers8/i.test(edition.event || "") ? "Riyadh" : "";
    const family = /gamers8/i.test(edition.event || "") ? "Gamers8" : "Esports World Cup";
    const key = `${year}|${family}|${place}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        year,
        title: [family, year, place && `(${place})`].filter(Boolean).join(" "),
        games: [],
      });
    }
    groups.get(key).games.push(edition);
  });
  return [...groups.values()]
    .sort((a, b) => Number(b.year) - Number(a.year) || String(a.title).localeCompare(String(b.title)))
    .map((group) => ({
      ...group,
      games: [...group.games].sort((a, b) => String(a.game).localeCompare(String(b.game))),
    }));
}

export function seedResearchCmsRecords() {
  return researchVaultSlides().map((slide) => ({
    ...slide,
    id: slide.slug,
    surface: "research",
    research: true,
    floatingPriority: 0,
    region: "Global",
    yearlyStats: yearlyStatsFromEditions(slide.editions),
    relatedTournaments: [],
  }));
}

export function researchVaultSlides() {
  return [...ESPORTS_RESEARCH]
    .map((game) => {
      const editions = editionsNewestFirst(game.editions).map((edition) => ({
        ...normalizeEdition(edition, game.game),
        eventScope: "ewc",
      }));
      const latest = editions[0];
      const oldest = editions[editions.length - 1];
      const top = (rankPrefix) => {
        const row = latest?.payouts?.find((item) => String(item.rank).startsWith(rankPrefix));
        return row?.team || row?.player || "";
      };
      const firstYear = oldest?.year;
      const lastYear = latest?.year;
      return {
        slug: `research-${game.id}`,
        title: `${game.game} · Esports World Cup`,
        game: game.game,
        kicker: "Championship research",
        season: firstYear === lastYear ? String(lastYear || "") : `${lastYear || ""}–${firstYear || ""}`,
        summary: game.overview,
        poster: bannerForGame(game.game),
        eventStatus: "completed",
        surface: "research",
        research: true,
        eventScope: "ewc",
        genre: game.genre,
        type: game.type,
        peakPrizePool: game.peakPrizePool,
        fullName: game.fullName,
        editions,
        winners: top("1st"),
        runnerUps: top("2nd"),
      };
    })
    .sort((a, b) => Number(b.editions[0]?.year || 0) - Number(a.editions[0]?.year || 0));
}

/** Built-in esports fact catalog — flies randomly site-wide. */

export const ESPORTS_FACT_CATEGORY = "fact";

export const ESPORTS_FACTS = [
  {
    id: "olympic-esports-games",
    title: "Esports in the Olympics",
    message:
      "The International Olympic Committee officially created the Olympic Esports Games, with the inaugural event hosting its debut in 2025.",
  },
  {
    id: "spacewar-1972",
    title: "The Pioneer Tournament",
    message:
      "The earliest recorded competitive gaming event took place at Stanford University in 1972, where students battled in the game Spacewar!",
  },
  {
    id: "ti-2021-prize",
    title: "The Massive Dota 2 Prize",
    message:
      "The highest prize pool in esports history was reached at Dota 2's The International 2021, topping a staggering $40 million.",
  },
  {
    id: "lol-worlds-2023",
    title: "League of Legends Viewership",
    message:
      "The 2023 League of Legends World Championship smashed records, drawing a peak viewership of over 6.4 million simultaneous online spectators.",
  },
  {
    id: "kespa-2000",
    title: "South Korea's Pioneer Status",
    message:
      "South Korea pioneered modern esports by founding KeSPA in 2000, turning pro-gaming into a government-supported, televised national sport.",
  },
  {
    id: "apm-400",
    title: "Rapid Pro Reflexes",
    message:
      "Elite esports athletes can execute up to 400 Actions Per Minute (APM), showcasing mind-bending cognitive processing and physical hand speed.",
  },
  {
    id: "bugha-fortnite",
    title: "The Youngest Millionaire",
    message:
      "American Fortnite player Bugha won $3 million at the 2019 Fortnite World Cup when he was just 16 years old.",
  },
  {
    id: "stadium-sellouts",
    title: "Epic Stadium Sellouts",
    message:
      "Major tournaments regularly sell out massive traditional sports arenas, including Seoul’s World Cup Stadium and Los Angeles’ Staples Center.",
  },
  {
    id: "revenue-billion",
    title: "Global Revenue Boom",
    message:
      "The global esports industry generates well over $1 billion annually, fueled by sponsorships, media rights, and massive merchandise sales.",
  },
  {
    id: "college-scholarships",
    title: "University Varsity Scholarships",
    message:
      "Over 200 colleges in the US offer varsity esports programs, handing out millions in academic scholarships to competitive gamers.",
  },
  {
    id: "cs-longevity",
    title: "Counter-Strike's Longevity",
    message:
      "First released as a simple mod in 1999, Counter-Strike remains a top-tier global esport after more than two decades.",
  },
  {
    id: "pro-training",
    title: "Rigorous Pro Training",
    message:
      "Professional esports teams train like traditional athletes, practicing for 8 to 12 hours daily alongside dedicated physical fitness routines.",
  },
  {
    id: "space-invaders-1980",
    title: "First Televised Event",
    message:
      "The 1980 Space Invaders Championship hosted by Atari was the first major tournament, attracting over 10,000 passionate participants.",
  },
  {
    id: "faker-goat",
    title: "Faker's Legendary Reign",
    message:
      "Lee \"Faker\" Sang-hyeok is widely considered the GOAT of League of Legends, winning a record-breaking five World Championship titles.",
  },
  {
    id: "anti-doping",
    title: "Strict Anti-Doping Rules",
    message:
      "To ensure fair play, major esports organizations enforce strict drug testing policies targeting cognitive enhancers like Adderall.",
  },
  {
    id: "mobile-takeover",
    title: "Mobile Gaming Takeover",
    message:
      "Mobile esports are exploding worldwide, with titles like Free Fire and PUBG Mobile pulling in massive global audiences.",
  },
  {
    id: "physical-toll",
    title: "Physical Toll of Gaming",
    message:
      "Pro gamers face unique physical risks, frequently suffering from carpal tunnel syndrome, tendonitis, and severe lower back strain.",
  },
  {
    id: "evo-1996",
    title: "The Iconic Fighting Tourney",
    message:
      "Founded in 1996, the Evolution Championship Series (EVO) stands as the world's largest and longest-running open fighting game tournament.",
  },
  {
    id: "career-burnout",
    title: "Severe Career Burnout",
    message:
      "Due to intense training schedules, many professional esports players retire by age 25 due to burnout or injury.",
  },
  {
    id: "streaming-platforms",
    title: "Massive Streaming Platforms",
    message:
      "Platforms like Twitch and YouTube Gaming host billions of hours of live esports content, driving the industry's massive growth.",
  },
  {
    id: "support-staff",
    title: "Pro Team Support Staff",
    message:
      "Top-tier esports organizations employ full-time psychologists, nutritionists, and physical therapists to keep players performing at their absolute best.",
  },
  {
    id: "starcraft-korea",
    title: "The StarCraft Phenomenon",
    message:
      "StarCraft: Brood War became so culturally massive in South Korea that pro players became mainstream celebrities with major endorsements.",
  },
  {
    id: "sim-racing",
    title: "Sim Racing Integration",
    message:
      "Professional Formula 1 teams now sign dedicated sim racers who help develop real-world car physics using high-tech simulators.",
  },
  {
    id: "game-changers",
    title: "Gender-Inclusive Leagues",
    message:
      "Valorant's Game Changers initiative has successfully created massive competitive pathways, heavily boosting female representation in professional esports.",
  },
  {
    id: "virtual-stadium-2020",
    title: "Virtual Sold-Out Crowds",
    message:
      "The 2020 League of Legends Worlds utilized advanced augmented reality, allowing millions of remote fans to experience an immersive virtual stadium.",
  },
];

export function pickRandomEsportsFact(excludeId = null) {
  const pool = excludeId
    ? ESPORTS_FACTS.filter((fact) => fact.id !== excludeId)
    : ESPORTS_FACTS;
  if (!pool.length) return ESPORTS_FACTS[0] || null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Owner-authored fact popups → same shape as built-ins. */
export function factsFromPopups(popups = [], now = Date.now()) {
  return popups
    .filter((popup) => {
      if (popup?.enabled === false || popup?.type !== ESPORTS_FACT_CATEGORY) return false;
      if (popup.startsAt && popup.startsAt > now) return false;
      if (popup.endsAt && popup.endsAt < now) return false;
      return true;
    })
    .map((popup) => ({
      id: `custom-${popup.id}`,
      title: String(popup.title || "Esports fact").slice(0, 100),
      message: String(popup.message || "").slice(0, 1000),
    }))
    .filter((fact) => fact.message);
}

export function mergeFactCatalog(popups = []) {
  return [...ESPORTS_FACTS, ...factsFromPopups(popups)];
}

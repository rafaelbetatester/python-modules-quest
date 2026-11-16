import { Quiz } from "./engine.js?v=7";

const range = (start, end) => Array.from({ length: end - start }, (_, i) => start + i);
const stage = (name, region, practice, ids) => ({ name, region, practice, ids });

export const CHALLENGES = [
  stage("Alias Meadow", 0, "Chapter skills / imports", [118, 119, 120, 121, 100]),
  stage("Library Lookout", 0, "Chapter skills / standard library", [122, 123, 124, 125, 107]),
  stage("Module Workshop", 0, "Chapter skills / modules & packages", [126, 127, 128, 103, 104, 110]),
  stage("Package Market", 0, "Chapter skills / pip", [129, 130, 131, 132, 112, 113]),
  stage("Code Checkpoint", 0, "Completion skills / code tracing", [101, 102, 105, 106, 108]),
  stage("Tools Checkpoint", 0, "Completion skills / tooling", [109, 111, 114, 115, 116, 117]),
  stage("Import Trail", 1, "Deep practice / imports", range(0, 10)),
  stage("Namespace Falls", 1, "Deep practice / namespaces", range(10, 20)),
  stage("Bytecode Bridge", 1, "Deep practice / modules", range(20, 27)),
  stage("Script Summit", 1, "Deep practice / module behavior", range(27, 34)),
  stage("Package Cavern", 1, "Deep practice / packages", range(34, 44)),
  stage("Number Harbor", 2, "Deep practice / math", range(44, 53)),
  stage("Function Reef", 2, "Deep practice / math", range(53, 62)),
  stage("Random Rapids", 2, "Deep practice / random", range(62, 68)),
  stage("Seed Island", 2, "Deep practice / random", range(68, 74)),
  stage("Platform Observatory", 3, "Deep practice / platform", range(74, 84)),
  stage("Installer Outpost", 3, "Deep practice / pip", range(84, 89)),
  stage("Dependency Tower", 3, "Deep practice / pip", range(89, 95)),
  stage("Mastery Castle", 3, "Final practice / package management", range(95, 100)),
];

export function starsFor(firstTry, total) {
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(firstTry) ||
      firstTry < 0 || firstTry > total) throw new Error("Invalid challenge score.");
  return firstTry * 10 >= total * 9 ? 3 : firstTry * 10 >= total * 7 ? 2 : 1;
}

function shuffledOrder(length) {
  const order = range(0, length);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export class Campaign {
  constructor(bank) {
    if (bank.length !== 133) throw new Error("This adventure needs its 133-question bank.");
    this.bank = bank;
    this.awards = CHALLENGES.map(() => null);
    this.active = null;
    this.trails = CHALLENGES.slice(1).map(() => null);
    this.trail = null;
  }

  get completed() { return this.awards.filter(Boolean).length; }
  get unlocked() { return Math.min(this.completed + 1, CHALLENGES.length); }
  get totalStars() {
    return this.awards.reduce((sum, award, i) =>
      sum + (award ? starsFor(award.firstTry, CHALLENGES[i].ids.length) : 0), 0);
  }
  get level() { return 1 + Math.floor(this.totalStars / 5); }
  get learned() {
    return this.awards.reduce((sum, award, i) => sum + (award ? CHALLENGES[i].ids.length : 0), 0);
  }
  canEnter(index) {
    return Number.isInteger(index) && index >= 0 && index < this.unlocked &&
      (index === 0 || Boolean(this.awards[index]) || this.trails[index - 1] !== null);
  }
  validateTrail(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.trails.length ||
        !this.awards[index] || this.active) throw new Error("Clear its quiz before playing this route.");
  }
  beginTrail(index) {
    this.validateTrail(index);
    this.trail = { index, half: false, collected: 0 };
  }
  checkpointTrail(collected) {
    if (!this.trail || !Number.isInteger(collected) || collected < 0 || collected > 63) {
      throw new Error("Invalid route checkpoint.");
    }
    this.trail = { index: this.trail.index, half: true, collected };
  }
  finishTrail(index, energy) {
    this.validateTrail(index);
    if (!Number.isInteger(energy) || energy < 0 || energy > 6 ||
        (this.trail && this.trail.index !== index)) throw new Error("Invalid route result.");
    this.trails[index] = Math.max(this.trails[index] ?? 0, energy);
    this.trail = null;
  }

  start(index) {
    if (this.active) throw new Error("Finish or resume the current challenge first.");
    if (this.trail) throw new Error("Finish or skip the platform route before starting a quiz.");
    if (!Number.isInteger(index) || index < 0 || index >= this.unlocked) {
      throw new Error("That challenge is locked.");
    }
    const bank = CHALLENGES[index].ids.map(id => this.bank[id]);
    this.active = { challenge: index, quiz: new Quiz(bank, shuffledOrder(bank.length)) };
  }

  finish() {
    if (!this.active || !this.active.quiz.done) throw new Error("Clear every question and review first.");
    const { challenge, quiz } = this.active;
    const previous = this.awards[challenge];
    const stars = starsFor(quiz.firstTry, CHALLENGES[challenge].ids.length);
    if (!previous || quiz.firstTry > previous.firstTry) {
      this.awards[challenge] = { firstTry: quiz.firstTry, reviews: quiz.reviews };
    }
    this.active = null;
    return { challenge, stars, firstTry: quiz.firstTry, reviews: quiz.reviews,
      gained: Math.max(0, stars - (previous ? starsFor(previous.firstTry, CHALLENGES[challenge].ids.length) : 0)) };
  }

  save() {
    return { version: 5, awards: this.awards.map(a => a ? { ...a } : null),
      trails: [...this.trails], trail: this.trail ? { ...this.trail } : null,
      active: this.active ? { challenge: this.active.challenge, quiz: this.active.quiz.save() } : null };
  }

  static restore(bank, text) {
    const data = JSON.parse(text);
    if (!data || ![4, 5].includes(data.version) || !Array.isArray(data.awards) ||
        data.awards.length !== CHALLENGES.length) throw new Error("Unrecognized adventure save.");
    const campaign = new Campaign(bank);
    let gap = false;
    data.awards.forEach((award, i) => {
      if (award === null) { gap = true; return; }
      if (gap || !award || !Number.isInteger(award.reviews) || award.reviews < 0 ||
          award.reviews > 100000) throw new Error("Invalid saved challenge rewards.");
      starsFor(award.firstTry, CHALLENGES[i].ids.length);
      campaign.awards[i] = { firstTry: award.firstTry, reviews: award.reviews };
    });
    if (data.active !== null) {
      const index = data.active?.challenge;
      if (!Number.isInteger(index) || index < 0 || index >= campaign.unlocked) {
        throw new Error("Invalid active challenge.");
      }
      const subset = CHALLENGES[index].ids.map(id => bank[id]);
      campaign.active = { challenge: index, quiz: Quiz.restore(subset, JSON.stringify(data.active.quiz)) };
    }
    if (data.version === 4) {
      campaign.trails = campaign.trails.map((_, i) => i < campaign.completed ? 0 : null);
    } else {
      if (!Array.isArray(data.trails) || data.trails.length !== campaign.trails.length ||
          data.trails.some((score, i) => score !== null &&
            (!Number.isInteger(score) || score < 0 || score > 6 || !campaign.awards[i]))) {
        throw new Error("Invalid saved route rewards.");
      }
      campaign.trails = [...data.trails];
      if (data.trail !== null) {
        const { index, half, collected } = data.trail ?? {};
        campaign.validateTrail(index);
        if (typeof half !== "boolean" || !Number.isInteger(collected) ||
            collected < 0 || collected > 63 || (!half && collected !== 0)) throw new Error("Invalid saved route checkpoint.");
        campaign.trail = { index, half, collected };
      }
    }
    return campaign;
  }
}

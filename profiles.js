import { Campaign } from "./campaign.js?v=7";

export const LEGACY_KEY = "python-modules-quest-v4";
const PREFIX = "python-modules-quest-profile-v1:";
const LAST_PLAYER = "python-modules-quest-last-player-v1";
const LEGACY_OWNER = "python-modules-quest-legacy-owner-v1";

export function playerName(value) {
  if (typeof value !== "string") throw new Error("Enter a player name.");
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 24 ||
      !/^[\p{L}\p{N}][\p{L}\p{N} _.-]+$/u.test(name)) {
    throw new Error("Use 2-24 characters: start with a letter or number, then use letters, numbers, spaces, dots, underscores or hyphens.");
  }
  return name;
}

export function profileKey(name) {
  return PREFIX + encodeURIComponent(playerName(name).toLowerCase());
}

export class Profiles {
  constructor(storage, bank) {
    this.storage = storage;
    this.bank = bank;
  }

  lastPlayer() {
    const saved = this.storage.getItem(LAST_PLAYER);
    return saved === null ? "" : playerName(saved);
  }

  hasLegacy() {
    return this.storage.getItem(LEGACY_KEY) !== null && this.storage.getItem(LEGACY_OWNER) === null;
  }

  load(value, importLegacy = false) {
    const name = playerName(value);
    const key = profileKey(name);
    const saved = this.storage.getItem(key);
    if (saved !== null) {
      const record = JSON.parse(saved);
      if (!record || record.version !== 1 || profileKey(record.name) !== key) {
        throw new Error("This player's saved profile is invalid.");
      }
      return { name: playerName(record.name),
        campaign: Campaign.restore(this.bank, JSON.stringify(record.campaign)), imported: false };
    }
    if (importLegacy && this.hasLegacy()) {
      return { name, campaign: Campaign.restore(this.bank, this.storage.getItem(LEGACY_KEY)), imported: true };
    }
    return { name, campaign: new Campaign(this.bank), imported: false };
  }

  save(value, campaign, claimLegacy = false) {
    const name = playerName(value);
    this.storage.setItem(profileKey(name), JSON.stringify({ version: 1, name, campaign: campaign.save() }));
    if (claimLegacy) this.storage.setItem(LEGACY_OWNER, name.toLowerCase());
    this.storage.setItem(LAST_PLAYER, name);
  }
}

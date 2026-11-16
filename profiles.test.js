export async function runProfileTests(bank) {
  const { Profiles, playerName, profileKey, LEGACY_KEY } = await import("./profiles.js?v=6");
  const { Campaign, CHALLENGES } = await import("./campaign.js?v=6");
  const results = [];
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const throws = action => {
    let caught = false;
    try { action(); } catch { caught = true; }
    assert(caught, "Expected invalid operation to be rejected");
  };
  const memory = () => {
    const values = new Map();
    return {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    };
  };
  function test(name, action) {
    try { action(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  function clear(campaign, index = 0) {
    campaign.start(index);
    const q = campaign.active.quiz;
    while (!q.done) {
      q.answer(bank[CHALLENGES[index].ids[q.current.id]][3]);
      q.next();
    }
    campaign.finish();
  }
  test("names are required, validated, and case-insensitive when resuming", () => {
    assert(playerName("  Learner   One ") === "Learner One", "Whitespace not normalized");
    for (const name of ["", " ", "a", "<script>", "a".repeat(25), "name/email"]) {
      throws(() => playerName(name));
    }
    const storage = memory(), profiles = new Profiles(storage, bank);
    const campaign = new Campaign(bank); clear(campaign);
    profiles.save("Learner One", campaign);
    const loaded = profiles.load(" learner ONE ");
    assert(loaded.name === "Learner One" && loaded.campaign.totalStars === 3, "Existing player was reset");
    assert(profiles.lastPlayer() === "Learner One", "Player name not remembered");
  });
  test("two named players keep separate progress across store instances", () => {
    const storage = memory(), profiles = new Profiles(storage, bank);
    const first = new Campaign(bank); clear(first);
    profiles.save("Player One", first);
    profiles.save("Player Two", new Campaign(bank));
    const reloaded = new Profiles(storage, bank);
    assert(reloaded.load("Player One").campaign.totalStars === 3, "First profile lost");
    assert(reloaded.load("Player Two").campaign.totalStars === 0, "Profiles leaked progress");
  });
  test("active questions, wrong choices and reviews survive named saving", () => {
    const profiles = new Profiles(memory(), bank), campaign = new Campaign(bank);
    campaign.start(0);
    const q = campaign.active.quiz;
    const id = CHALLENGES[0].ids[q.current.id], wrong = (bank[id][3] + 1) % 4;
    q.answer(wrong);
    profiles.save("Retry Player", campaign);
    const restored = profiles.load("retry player").campaign.active.quiz;
    assert(restored.current.id === q.current.id && restored.wrong.includes(wrong), "Retry was not restored");
    restored.answer(bank[id][3]);
    assert(restored.queue.length === CHALLENGES[0].ids.length + 1, "Review was lost");
  });
  test("legacy adventure is explicitly copied once and never deleted", () => {
    const storage = memory(), profiles = new Profiles(storage, bank);
    const old = new Campaign(bank); clear(old);
    const original = JSON.stringify(old.save());
    storage.setItem(LEGACY_KEY, original);
    assert(profiles.hasLegacy(), "Existing adventure not detected");
    const loaded = profiles.load("Returning Player", true);
    assert(loaded.imported && loaded.campaign.totalStars === 3, "Legacy progress was not imported");
    profiles.save(loaded.name, loaded.campaign, loaded.imported);
    assert(storage.getItem(LEGACY_KEY) === original, "Old save was changed");
    assert(!profiles.hasLegacy(), "Another player could silently inherit the claimed save");
    assert(profiles.load("New Player", true).campaign.totalStars === 0, "Legacy copied to another player");
  });
  test("existing named progress wins over an unclaimed legacy save", () => {
    const storage = memory(), profiles = new Profiles(storage, bank);
    const old = new Campaign(bank); clear(old);
    storage.setItem(LEGACY_KEY, JSON.stringify(old.save()));
    profiles.save("Existing Player", new Campaign(bank));
    const loaded = profiles.load("Existing Player", true);
    assert(!loaded.imported && loaded.campaign.totalStars === 0, "Existing named save was overwritten by legacy");
  });
  test("corrupt and mismatched named saves are rejected without overwriting", () => {
    const storage = memory(), profiles = new Profiles(storage, bank);
    const key = profileKey("Broken Player");
    for (const value of ["", "{broken", JSON.stringify({ version: 1, name: "Other Player", campaign: new Campaign(bank).save() })]) {
      storage.setItem(key, value);
      throws(() => profiles.load("Broken Player"));
      assert(storage.getItem(key) === value, "Corrupt profile changed");
    }
  });
  test("failed storage writes preserve the previously saved campaign", () => {
    const storage = memory(), profiles = new Profiles(storage, bank);
    const campaign = new Campaign(bank);
    profiles.save("Safe Player", campaign);
    const previous = storage.getItem(profileKey("Safe Player"));
    clear(campaign);
    storage.setItem = () => { throw new Error("Storage quota exceeded"); };
    throws(() => profiles.save("Safe Player", campaign));
    assert(storage.getItem(profileKey("Safe Player")) === previous, "Previous save destroyed");
  });
  test("completed adventure resumes with all stars and gates instead of restarting", () => {
    const storage = memory(), profiles = new Profiles(storage, bank), campaign = new Campaign(bank);
    CHALLENGES.forEach((_, index) => clear(campaign, index));
    profiles.save("Castle Player", campaign);
    const restored = new Profiles(storage, bank).load("CASTLE PLAYER").campaign;
    assert(restored.completed === 19 && restored.totalStars === 57 && restored.level === 12, "Completed adventure restarted");
    assert(restored.active === null && restored.learned === 133, "Completion not preserved");
  });
  return results;
}

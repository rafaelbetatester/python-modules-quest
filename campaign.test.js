export async function runCampaignTests(bank) {
  const { Campaign, CHALLENGES, starsFor } = await import("./campaign.js?v=4");
  const { Player, World, GROUND, WORLD_WIDTH } = await import("./world.js?v=4");
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const throws = action => {
    let rejected = false;
    try { action(); } catch { rejected = true; }
    assert(rejected, "Expected invalid action to be rejected");
  };
  function test(name, action) {
    try { action(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  function solve(campaign, mistakes = 0) {
    const { quiz, challenge } = campaign.active;
    let missed = 0;
    while (!quiz.done) {
      const correct = bank[CHALLENGES[challenge].ids[quiz.current.id]][3];
      if (!quiz.current.review && missed < mistakes) {
        quiz.answer((correct + 1) % 4);
        missed++;
      }
      quiz.answer(correct);
      quiz.next();
    }
  }
  test("19 stages cover every question once, in groups of 5 to 10", () => {
    assert(CHALLENGES.length === 19, "Wrong stage count");
    const ids = CHALLENGES.flatMap(c => c.ids);
    assert(ids.length === bank.length && new Set(ids).size === bank.length, "Coverage is not exact");
    assert(ids.every(id => id >= 0 && id < bank.length), "Invalid question ID");
    assert(CHALLENGES.every(c => c.ids.length >= 5 && c.ids.length <= 10), "Invalid stage size");
    assert(CHALLENGES.slice(0, 6).every(c => c.ids.every(id => id >= 100)), "Assessment skills must come first");
  });
  test("star boundaries use exact accuracy, not rounded percentages", () => {
    assert(starsFor(9, 10) === 3 && starsFor(8, 10) === 2, "90% boundary");
    assert(starsFor(7, 10) === 2 && starsFor(6, 10) === 1, "70% boundary");
    assert(starsFor(6, 7) === 2 && starsFor(4, 6) === 1, "Fractional boundary");
    throws(() => starsFor(11, 10));
  });
  test("locked stages and incomplete challenges cannot award stars", () => {
    const campaign = new Campaign(bank);
    throws(() => campaign.start(1));
    campaign.start(0);
    throws(() => campaign.finish());
    const { quiz } = campaign.active;
    throws(() => quiz.next());
    const correct = bank[CHALLENGES[0].ids[quiz.current.id]][3];
    assert(!quiz.answer((correct + 1) % 4), "Mistake should stay on question");
    assert(quiz.learned === 0, "Mistake must not advance");
  });
  test("mistakes produce review rounds and reduce first-attempt stars", () => {
    const campaign = new Campaign(bank);
    campaign.start(0);
    solve(campaign, 2);
    assert(campaign.active.quiz.reviews === 2, "Missing reviews");
    const award = campaign.finish();
    assert(award.stars === 1 && campaign.totalStars === 1, "Incorrect reward");
    assert(campaign.unlocked === 2 && campaign.active === null, "Next gate must unlock");
  });
  test("replays improve best rewards but cannot farm stars or levels", () => {
    const campaign = new Campaign(bank);
    campaign.start(0); solve(campaign, 2); campaign.finish();
    campaign.start(0); solve(campaign); campaign.finish();
    assert(campaign.totalStars === 3, "Best stars not applied");
    campaign.start(0); solve(campaign, 3); campaign.finish();
    assert(campaign.totalStars === 3, "Worse replay reduced or duplicated stars");
    campaign.start(1); solve(campaign); campaign.finish();
    assert(campaign.totalStars === 6 && campaign.level === 2, "Level must follow total best stars");
  });
  test("save restores the exact active question, wrong answers and awards", () => {
    const campaign = new Campaign(bank);
    campaign.start(0); solve(campaign); campaign.finish();
    campaign.start(1);
    const q = campaign.active.quiz;
    const correct = bank[CHALLENGES[1].ids[q.current.id]][3];
    q.answer((correct + 1) % 4);
    const restored = Campaign.restore(bank, JSON.stringify(campaign.save()));
    assert(restored.totalStars === 3 && restored.active.challenge === 1, "Awards or stage lost");
    assert(restored.active.quiz.current.id === q.current.id, "Question order changed");
    assert(restored.active.quiz.wrong[0] === (correct + 1) % 4, "Mistake lost");
    solve(restored); restored.finish();
    assert(restored.unlocked === 3, "Restored challenge cannot finish");
  });
  test("corrupt, impossible and old campaign saves are rejected", () => {
    const saved = new Campaign(bank).save();
    throws(() => Campaign.restore(bank, "{}"));
    throws(() => Campaign.restore(bank, JSON.stringify({ ...saved, version: 3 })));
    const gap = { ...saved, awards: [...saved.awards] };
    gap.awards[1] = { firstTry: 5, reviews: 0 };
    throws(() => Campaign.restore(bank, JSON.stringify(gap)));
    const bad = { ...saved, awards: [...saved.awards] };
    bad.awards[0] = { firstTry: 100, reviews: 0 };
    throws(() => Campaign.restore(bank, JSON.stringify(bad)));
  });
  test("full campaign learns all questions and unlocks every gate", () => {
    const campaign = new Campaign(bank);
    CHALLENGES.forEach((_, index) => {
      campaign.start(index); solve(campaign); campaign.finish();
    });
    assert(campaign.completed === 19 && campaign.totalStars === 57, "Campaign not complete");
    assert(campaign.level === 12 && campaign.unlocked === 19, "Final progression incorrect");
    assert(Campaign.restore(bank, JSON.stringify(campaign.save())).completed === 19, "Completion not persistent");
  });
  test("player moves, jumps, lands, and stays inside world boundaries", () => {
    const player = new Player();
    const start = player.x;
    player.step(0.05, { right: true });
    assert(player.x > start, "Movement is missing");
    player.step(0.05, { jump: true });
    assert(player.y + player.height < GROUND, "Jump is missing");
    for (let i = 0; i < 100; i++) player.step(0.016, {});
    assert(player.y + player.height === GROUND && player.grounded, "Player did not land");
    for (let i = 0; i < 1000; i++) player.step(0.05, { left: true });
    assert(player.x === 0, "Left boundary escaped");
    for (let i = 0; i < 1000; i++) player.step(0.05, { right: true });
    assert(player.x + player.width <= WORLD_WIDTH, "Right boundary escaped");
  });
  test("modifier-held releases cannot leave movement or jumping stuck", () => {
    const world = Object.create(World.prototype);
    world.paused = false;
    world.keys = {};
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
      for (const [key, action] of [["ArrowRight", "right"], ["a", "left"], [" ", "jump"]]) {
        world.key({ key, preventDefault() {} }, true);
        assert(world.keys[action], "Key press did not start action");
        world.key({ key, [modifier]: true, preventDefault() {} }, false);
        assert(!world.keys[action], `${modifier} swallowed ${action} release`);
      }
    }
  });
  test("player can land on a platform and fall after walking off", () => {
    const player = new Player();
    player.x = 100;
    const platforms = [{ x: 80, width: 100, y: 274 }];
    player.step(0.016, { jump: true }, platforms);
    for (let i = 0; i < 100; i++) player.step(0.016, {}, platforms);
    assert(player.y + player.height === 274 && player.grounded, "Platform landing failed");
    for (let i = 0; i < 50; i++) player.step(0.016, { right: true }, platforms);
    assert(player.y + player.height === GROUND && player.grounded, "Walking off a platform did not fall");
  });
  return results;
}

import { Campaign, CHALLENGES, starsFor } from "./campaign.js?v=7";
import { World } from "./world.js?v=7";
import { renderQuestion, renderOption } from "./renderer.js?v=7";
import { Profiles, playerName } from "./profiles.js?v=7";

const $ = id => document.getElementById(id);
const letters = "ABCD";
let campaign;
let world;
let bank;
let profiles;
let player = "";
let temporaryPlayer = false;
let receipt = null;
let storageAvailable = true;
let nearbyIndex = 0;

function persist() {
  if (!storageAvailable || !player) return false;
  try {
    profiles.save(player, campaign);
    $("save-status").textContent = `Saved for ${player} in this browser.`;
    return true;
  } catch (error) {
    storageAvailable = false;
    $("storage").textContent = `Progress cannot be saved: ${error.message}. Keep this tab open to continue.`;
    $("save-status").textContent = "Progress is not being saved.";
    $("switch-player").disabled = true;
    return false;
  }
}

function quiz() { return campaign?.active?.quiz; }
function currentId() { return CHALLENGES[campaign.active.challenge].ids[quiz().current.id]; }

function hintText() {
  const q = bank[currentId()];
  const wrong = quiz().wrong;
  if (wrong.length >= 2) {
    const remaining = letters.split("").filter((_, i) => !wrong.includes(i));
    return `${q[4]}\nRemaining choices: ${remaining.join(" or ")}. Try again.`;
  }
  return q[4];
}

function updateNearby(index) {
  nearbyIndex = index;
  const challenge = CHALLENGES[index];
  const blocked = index === null || !campaign.canEnter(index) || world?.trail ||
    (campaign.active && campaign.active.challenge !== index);
  $("enter-gate").disabled = Boolean(blocked);
  $("nearby").textContent = challenge
    ? `Gate ${index + 1}: ${challenge.name} / ${challenge.ids.length} questions${index >= campaign.unlocked ? " / locked" : ""}`
    : world?.trail ? "Finish this route to reach the next quiz gate." : "Follow the trail to a challenge gate.";
  $("enter-gate").textContent = campaign.active?.challenge === index ? "Resume challenge"
    : campaign.awards[index] ? "Replay challenge" : "Enter challenge";
}

function routeIndex() {
  if (world?.trail) return world.trail.index;
  if (nearbyIndex !== null && nearbyIndex < 18 && campaign.awards[nearbyIndex]) return nearbyIndex;
  return Math.min(campaign.completed - 1, 17);
}

function renderArcade() {
  const trail = world?.trail;
  $("arcade-score").textContent = `Best energy: ${campaign.trails.reduce((sum, score) => sum + (score ?? 0), 0)} / 108`;
  $("arcade-hud").textContent = trail
    ? `Route ${trail.index + 1}/18 / Difficulty ${trail.difficulty}/5 / Shields ${trail.hearts}/3 / Energy ${trail.energy}/6 / ${trail.saved.half ? "Checkpoint saved" : "Reach the SAVE flag"} / Retries ${trail.retries}`
    : campaign.completed ? campaign.trails[routeIndex()] === null
      ? "Your next platform route is ready. Play it, or skip it to reach the next quiz."
      : "Next quiz ahead! Replay a route for more energy, or use the map to focus on learning."
    : "Clear your first quiz to begin Byte Runner: jump, collect energy and disable glitch-bots!";
  $("run-route").disabled = routeIndex() < 0 || Boolean(campaign.active);
  $("run-route").textContent = trail ? "Restart route" : `Play route ${Math.max(0, routeIndex()) + 1}`;
  $("skip-route").disabled = routeIndex() < 0 || Boolean(campaign.active);
}

function arcadeChanged(kind, trail) {
  if (kind !== "hud") {
    persist();
    if (kind === "checkpoint") $("world-message").textContent = "Checkpoint saved! Retries and reloads resume here. Quiz stars are safe.";
    else if (kind === "finish") $("world-message").textContent = `Route cleared! ${trail.energy}/6 energy collected. Your next quiz gate is ready.`;
    else if (kind === "skip") $("world-message").textContent = "Route skipped. Your quiz stars and learning progress are unchanged.";
    else if (kind === "start") $("world-message").textContent = "Byte Runner! Jump or pulse the bots, collect gold energy cells, and reach the next gate.";
    renderWorld();
  } else renderArcade();
}

function renderWorld() {
  $("completed-count").textContent = `${campaign.completed} / ${CHALLENGES.length}`;
  $("stars-count").textContent = `${campaign.totalStars} / ${CHALLENGES.length * 3}`;
  $("level").textContent = campaign.level;
  $("learned").textContent = `${campaign.learned} / ${bank.length}`;
  $("progress").max = CHALLENGES.length * 3;
  $("progress").value = campaign.totalStars;
  const maximumStars = CHALLENGES.length * 3;
  const nextLevel = 5 - campaign.totalStars % 5;
  const remainingStars = maximumStars - campaign.totalStars;
  $("level-progress").textContent = remainingStars === 0
    ? "All stars earned. You are a Python trail master!"
    : campaign.level === 1 + Math.floor(maximumStars / 5)
    ? `Maximum level reached / ${remainingStars} ${remainingStars === 1 ? "star" : "stars"} left to earn`
    : `${nextLevel} more ${nextLevel === 1 ? "star" : "stars"} to level ${campaign.level + 1}`;
  $("resume").hidden = !campaign.active;
  $("quest-complete").hidden = campaign.completed !== CHALLENGES.length;
  $("challenge-list").replaceChildren();
  CHALLENGES.forEach((challenge, index) => {
    const award = campaign.awards[index];
    const count = award ? starsFor(award.firstTry, challenge.ids.length) : 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stage-button ${award ? "cleared" : ""}`;
    button.dataset.stage = index;
    button.disabled = index >= campaign.unlocked || Boolean(campaign.active && campaign.active.challenge !== index);
    const title = document.createElement("strong");
    title.textContent = `${String(index + 1).padStart(2, "0")} ${challenge.name}`;
    const meta = document.createElement("span");
    meta.textContent = `${challenge.ids.length} questions / ${count ? "\u2605".repeat(count) + "\u2606".repeat(3 - count) : index >= campaign.unlocked ? "Locked" : "Ready"}`;
    button.append(title, meta);
    button.addEventListener("click", () => {
      if (world.trail) world.skipTrail(world.trail.index);
      if (!campaign.canEnter(index) && !campaign.active) world.skipTrail(index - 1);
      world.travelTo(index);
      openChallenge(index);
    });
    $("challenge-list").append(button);
  });
  updateNearby(world ? world.nearest() : 0);
  renderArcade();
}

function openDialog() {
  world.pause(true);
  if (!$("challenge-dialog").open) $("challenge-dialog").showModal();
}

function openChallenge(index) {
  if (!player) return;
  if (index >= campaign.unlocked) {
    $("world-message").textContent = "This gate is locked. Complete the earlier challenges to open it.";
    return;
  }
  if (campaign.active && campaign.active.challenge !== index) {
    $("world-message").textContent = "Your current challenge is paused. Resume and finish it before entering another gate.";
    return;
  }
  if (world.trail || (!campaign.active && !campaign.canEnter(index))) {
    $("world-message").textContent = "Finish the platform route, choose Skip route, or use the accessible challenge map.";
    return;
  }
  receipt = null;
  $("world-message").textContent = "";
  if (!campaign.active) campaign.start(index);
  persist();
  renderWorld();
  renderQuiz();
  openDialog();
  $("question").focus();
}

function renderQuiz() {
  $("quiz").hidden = Boolean(receipt);
  $("complete").hidden = !receipt;
  if (receipt) {
    const challenge = CHALLENGES[receipt.challenge];
    $("dialog-title").textContent = challenge.name;
    $("result-stars").textContent = "\u2605".repeat(receipt.stars) + "\u2606".repeat(3 - receipt.stars);
    $("result-stars").setAttribute("aria-label", `${receipt.stars} out of 3 stars earned`);
    $("complete-title").textContent = campaign.completed === CHALLENGES.length ? "Adventure complete!" : "Challenge cleared!";
    $("summary").textContent = `${receipt.firstTry}/${challenge.ids.length} correct on the first attempt. ${receipt.reviews} reviews cleared. ${receipt.gained} new ${receipt.gained === 1 ? "star" : "stars"} earned. You are level ${campaign.level}.`;
    $("result-tip").textContent = receipt.stars < 3 ? "Replay this gate to improve your best stars. You never lose earned stars."
      : "Three-star clear! Your best score is saved. Follow the trail to the next gate.";
    return;
  }
  const activeQuiz = quiz();
  const challenge = CHALLENGES[campaign.active.challenge];
  const id = currentId();
  const q = bank[id];
  $("dialog-title").textContent = `Gate ${campaign.active.challenge + 1} / ${challenge.name}`;
  $("topic").textContent = q[0];
  $("mode").textContent = activeQuiz.current.review ? "REVIEW ROUND"
    : `QUESTION ${activeQuiz.learned + (activeQuiz.solved ? 0 : 1)} / ${challenge.ids.length}`;
  $("practice-group").textContent = challenge.practice;
  $("challenge-score").textContent = `${activeQuiz.firstTry} first-try / ${activeQuiz.reviews} reviews cleared`;
  $("challenge-progress").max = challenge.ids.length;
  $("challenge-progress").value = activeQuiz.learned;
  $("question").textContent = renderQuestion($("question-body"), q[1], id);
  $("options").replaceChildren();
  q[2].forEach((text, i) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.dataset.choice = i;
    const letter = document.createElement("span");
    letter.className = "letter";
    letter.textContent = letters[i];
    const label = document.createElement("span");
    label.className = "option-text";
    renderOption(label, text);
    button.append(letter, label);
    if (activeQuiz.wrong.includes(i)) {
      button.classList.add("wrong");
      label.append(document.createTextNode(" (not correct)"));
    }
    if (activeQuiz.solved && i === q[3]) {
      button.classList.add("correct");
      label.append(document.createTextNode(" (correct)"));
    }
    button.disabled = activeQuiz.solved || activeQuiz.wrong.includes(i);
    button.addEventListener("click", () => submit(i));
    $("options").append(button);
  });
  $("hint").hidden = activeQuiz.solved;
  $("next").hidden = !activeQuiz.solved;
  $("next").textContent = activeQuiz.position === activeQuiz.queue.length - 1 ? "Collect stars" : "Next question \u2192";
  $("feedback").className = `feedback ${activeQuiz.solved ? "success" : "retry"}`;
  $("feedback").textContent = activeQuiz.solved
    ? `Correct! ${q[5]}${activeQuiz.wrong.length ? "\nThis question will return for review before the gate is cleared." : ""}`
    : activeQuiz.wrong.length ? `Not quite. Let's work it out.\nHint: ${hintText()}` : "";
}

function submit(choice) {
  quiz().answer(choice);
  persist();
  renderQuiz();
  if (quiz().solved) $("next").focus();
  else $("options").querySelector("button:not(:disabled)")?.focus();
}

function finishChallenge() {
  receipt = campaign.finish();
  persist();
  renderWorld();
  renderQuiz();
}

function next() {
  quiz().next();
  if (quiz().done) {
    finishChallenge();
    $("continue").focus();
  } else {
    persist();
    renderQuiz();
    $("question").focus();
  }
}

$("hint").addEventListener("click", () => {
  if (!quiz() || quiz().solved) return;
  $("feedback").className = "feedback retry";
  $("feedback").textContent = `Hint: ${hintText()}`;
});
$("next").addEventListener("click", next);
$("close-challenge").addEventListener("click", () => $("challenge-dialog").close());
$("continue").addEventListener("click", () => {
  const index = receipt?.challenge;
  $("challenge-dialog").close();
  if (index !== undefined && index < 18) world.beginTrail(index);
});
$("run-route").addEventListener("click", () => {
  world.beginTrail(routeIndex());
  $("world").focus({ preventScroll: true });
});
$("skip-route").addEventListener("click", () => {
  world.skipTrail(routeIndex());
  $("world").focus({ preventScroll: true });
});
$("challenge-dialog").addEventListener("close", () => {
  world.pause($("player-dialog").open);
  renderWorld();
  $("world").focus({ preventScroll: true });
});
$("enter-gate").addEventListener("click", () => { if (nearbyIndex !== null) openChallenge(nearbyIndex); });
$("resume").addEventListener("click", () => openChallenge(campaign.active.challenge));
$("reset").addEventListener("click", () => {
  if (!confirm(`Reset ${player}'s adventure stars, levels and current challenge? Other players and older saves are kept.`)) return;
  if ($("challenge-dialog").open) $("challenge-dialog").close();
  campaign = new Campaign(bank);
  world.setCampaign(campaign);
  receipt = null;
  $("storage").textContent = "";
  $("world-message").textContent = "";
  storageAvailable = !temporaryPlayer;
  persist();
  $("switch-player").disabled = !storageAvailable;
  renderWorld();
});
$("player-dialog").addEventListener("cancel", event => event.preventDefault());
$("switch-player").addEventListener("click", () => {
  if (!persist()) return;
  world.pause(true);
  showPlayerScreen(true);
});
$("cancel-switch").addEventListener("click", () => {
  $("player-dialog").close();
  world.pause(false);
  $("world").focus({ preventScroll: true });
});
$("player-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    const name = playerName($("player-name").value);
    const temporary = $("temporary-player").checked;
    if (!profiles && !temporary) throw new Error("Browser storage is unavailable. Enable it, or choose temporary play.");
    const loaded = temporary ? { name, campaign: new Campaign(bank), imported: false }
      : profiles.load(name, $("import-legacy").checked);
    if (!temporary) profiles.save(loaded.name, loaded.campaign, loaded.imported);
    activatePlayer(loaded, temporary);
  } catch (error) {
    $("player-error").textContent = `Could not open this player: ${error.message}. Stored progress has not been reset. Try another name, fix browser storage, or choose temporary play.`;
    $("temporary-choice").hidden = false;
  }
});
document.addEventListener("keydown", event => {
  const activeQuiz = quiz();
  if (!$("challenge-dialog").open || !activeQuiz || activeQuiz.done || event.repeat ||
      event.ctrlKey || event.metaKey || event.altKey) return;
  const choice = letters.indexOf(event.key.toUpperCase());
  if (choice >= 0 && !activeQuiz.solved && !activeQuiz.wrong.includes(choice)) {
    event.preventDefault();
    submit(choice);
  } else if (event.key === "Enter" && activeQuiz.solved &&
      (event.target === $("next") || event.target === $("question") || event.target.closest(".option"))) {
    event.preventDefault();
    next();
  }
});

function showPlayerScreen(switching = false) {
  $("player-error").textContent = "";
  $("temporary-player").checked = false;
  $("temporary-choice").hidden = true;
  $("cancel-switch").hidden = !player;
  $("player-name").value = switching ? "" : player;
  try {
    if (profiles) {
      if (!switching) $("player-name").value = profiles.lastPlayer();
      $("legacy-choice").hidden = !profiles.hasLegacy();
      $("import-legacy").checked = true;
    } else {
      $("legacy-choice").hidden = true;
      $("temporary-choice").hidden = false;
      $("player-error").textContent = "Browser storage is unavailable. Enable it to save, or explicitly choose temporary play.";
    }
  } catch (error) {
    $("player-error").textContent = `Could not read player preferences: ${error.message}. Enter your name to try opening your saved profile.`;
    $("legacy-choice").hidden = true;
    $("temporary-choice").hidden = false;
  }
  if (!$("player-dialog").open) $("player-dialog").showModal();
  $("player-name").focus();
}

function activatePlayer(loaded, temporary) {
  campaign = loaded.campaign;
  player = loaded.name;
  receipt = null;
  storageAvailable = !temporary;
  temporaryPlayer = temporary;
  $("storage").textContent = temporary ? "Temporary play: this adventure will not be saved. Keep this tab open."
    : loaded.imported ? "Your previous unnamed adventure was copied to this player. Its original save is kept." : "";
  $("save-status").textContent = temporary ? "Progress is not being saved." : `Saved for ${player} in this browser.`;
  $("world-message").textContent = "";
  $("current-player").textContent = player;
  $("player-bar").hidden = false;
  $("switch-player").disabled = temporary;
  if (world) {
    world.setCampaign(campaign);
    world.pause(false);
  } else {
    world = new World($("world"), campaign, openChallenge, updateNearby, arcadeChanged);
    world.bindControl($("move-left"), "left");
    world.bindControl($("move-right"), "right");
    world.bindControl($("jump"), "jump");
    world.bindControl($("fire"), "fire");
  }
  $("player-dialog").close();
  $("game").inert = false;
  renderWorld();
  $("reset").disabled = false;
  $("hint").disabled = false;
  $("world").focus({ preventScroll: true });
  if (campaign.active) {
    world.travelTo(campaign.active.challenge);
    if (quiz().done) {
      finishChallenge();
      openDialog();
    } else openChallenge(campaign.active.challenge);
  }
}

async function start() {
  const response = await fetch("questions.json?v=7");
  if (!response.ok) throw new Error(`Question bank request failed (${response.status}).`);
  bank = await response.json();
  if (!Array.isArray(bank) || bank.length !== 133 || bank.some(q =>
    !Array.isArray(q) || q.length !== 6 || !Array.isArray(q[2]) || q[2].length !== 4 ||
    !Number.isInteger(q[3]) || q[3] < 0 || q[3] > 3 ||
    ![q[0], q[1], q[4], q[5], ...q[2]].every(s => typeof s === "string" && s.length))) {
    throw new Error("The question bank is incomplete or invalid.");
  }
  try {
    profiles = new Profiles(localStorage, bank);
  } catch (error) {
    $("storage").textContent = `Browser storage is unavailable: ${error.message}. Progress lasts only in this tab.`;
  }
  $("start-player").disabled = false;
  showPlayerScreen();
}

start().catch(error => {
  $("storage").textContent = `The adventure could not start: ${error.message}. Reload the page, or run python play.py for local play.`;
  $("world-message").textContent = "Unable to load the adventure.";
  $("enter-gate").disabled = true;
  $("game").inert = false;
});

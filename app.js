import { Campaign, CHALLENGES, starsFor } from "./campaign.js?v=4";
import { World } from "./world.js?v=4";
import { renderQuestion, renderOption } from "./renderer.js?v=4";

const $ = id => document.getElementById(id);
const KEY = "python-modules-quest-v4";
const letters = "ABCD";
let campaign;
let world;
let bank;
let receipt = null;
let storageAvailable = true;
let nearbyIndex = 0;

function persist() {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(campaign.save()));
    $("save-status").textContent = "Adventure saved in this browser.";
  } catch (error) {
    storageAvailable = false;
    $("storage").textContent = `Progress cannot be saved: ${error.message}. Keep this tab open to continue.`;
    $("save-status").textContent = "Progress is not being saved.";
  }
}

function quiz() { return campaign.active?.quiz; }
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
  const blocked = index === null || index >= campaign.unlocked ||
    (campaign.active && campaign.active.challenge !== index);
  $("enter-gate").disabled = Boolean(blocked);
  $("nearby").textContent = challenge
    ? `Gate ${index + 1}: ${challenge.name} / ${challenge.ids.length} questions${index >= campaign.unlocked ? " / locked" : ""}`
    : "Follow the trail to a challenge gate.";
  $("enter-gate").textContent = campaign.active?.challenge === index ? "Resume challenge"
    : campaign.awards[index] ? "Replay challenge" : "Enter challenge";
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
      world.travelTo(index);
      openChallenge(index);
    });
    $("challenge-list").append(button);
  });
  updateNearby(world ? world.nearest() : 0);
}

function openDialog() {
  world.pause(true);
  if (!$("challenge-dialog").open) $("challenge-dialog").showModal();
}

function openChallenge(index) {
  if (index >= campaign.unlocked) {
    $("world-message").textContent = "This gate is locked. Complete the earlier challenges to open it.";
    return;
  }
  if (campaign.active && campaign.active.challenge !== index) {
    $("world-message").textContent = "Your current challenge is paused. Resume and finish it before entering another gate.";
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
$("continue").addEventListener("click", () => $("challenge-dialog").close());
$("challenge-dialog").addEventListener("close", () => {
  world.pause(false);
  renderWorld();
  $("world").focus({ preventScroll: true });
});
$("enter-gate").addEventListener("click", () => { if (nearbyIndex !== null) openChallenge(nearbyIndex); });
$("resume").addEventListener("click", () => openChallenge(campaign.active.challenge));
$("reset").addEventListener("click", () => {
  if (!confirm("Reset adventure stars, levels and current challenge? Older quiz saves are kept.")) return;
  if ($("challenge-dialog").open) $("challenge-dialog").close();
  campaign = new Campaign(bank);
  world.campaign = campaign;
  world.travelTo(0);
  receipt = null;
  $("storage").textContent = "";
  $("world-message").textContent = "";
  storageAvailable = true;
  persist();
  renderWorld();
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

async function start() {
  const response = await fetch("questions.json?v=4");
  if (!response.ok) throw new Error(`Question bank request failed (${response.status}).`);
  bank = await response.json();
  if (!Array.isArray(bank) || bank.length !== 133 || bank.some(q =>
    !Array.isArray(q) || q.length !== 6 || !Array.isArray(q[2]) || q[2].length !== 4 ||
    !Number.isInteger(q[3]) || q[3] < 0 || q[3] > 3 ||
    ![q[0], q[1], q[4], q[5], ...q[2]].every(s => typeof s === "string" && s.length))) {
    throw new Error("The question bank is incomplete or invalid.");
  }
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
    if (saved === null && ["v1", "v2", "v3"].some(v => localStorage.getItem(`python-modules-quest-${v}`))) {
      $("storage").textContent = "Welcome to the 2D adventure! Stars start fresh; your older quiz progress is kept separately.";
    }
  } catch (error) {
    storageAvailable = false;
    $("storage").textContent = `Browser storage is unavailable: ${error.message}. Progress lasts only in this tab.`;
    $("save-status").textContent = "Progress is not being saved.";
  }
  if (saved !== null) {
    try { campaign = Campaign.restore(bank, saved); }
    catch (error) {
      storageAvailable = false;
      $("storage").textContent = `Saved adventure could not be restored: ${error.message}. The saved data is left untouched. Play temporarily, or use Reset adventure to replace it.`;
      $("save-status").textContent = "Progress is not being saved.";
    }
  }
  campaign ??= new Campaign(bank);
  world = new World($("world"), campaign, openChallenge, updateNearby);
  world.bindControl($("move-left"), "left");
  world.bindControl($("move-right"), "right");
  world.bindControl($("jump"), "jump");
  persist();
  renderWorld();
  $("reset").disabled = false;
  $("hint").disabled = false;
  if (campaign.active) {
    world.travelTo(campaign.active.challenge);
    if (quiz().done) {
      finishChallenge();
      openDialog();
    } else openChallenge(campaign.active.challenge);
  }
}

start().catch(error => {
  $("storage").textContent = `The adventure could not start: ${error.message}. Reload the page, or run python play.py for local play.`;
  $("world-message").textContent = "Unable to load the adventure.";
  $("enter-gate").disabled = true;
});

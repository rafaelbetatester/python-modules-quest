import { Quiz } from "./engine.js?v=2";

const $ = id => document.getElementById(id);
const KEY = "python-modules-quest-v2";
const letters = "ABCD";
let quiz;
let bank;
let storageAvailable = true;

function shuffledOrder() {
  const order = bank.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function persist() {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(quiz.save()));
    $("save-status").textContent = "Progress saved in this browser.";
  } catch (error) {
    storageAvailable = false;
    $("storage").textContent = `Progress cannot be saved: ${error.message}. Keep this tab open to continue this session.`;
    $("save-status").textContent = "Progress is not being saved.";
  }
}

function hintText() {
  const q = bank[quiz.current.id];
  if (quiz.wrong.length >= 2) {
    const remaining = letters.split("").filter((_, i) => !quiz.wrong.includes(i));
    return `${q[4]}\nRemaining choices: ${remaining.join(" or ")}.\nThink it through and try again.`;
  }
  return q[4];
}

function render() {
  $("learned").textContent = `${quiz.learned} / ${bank.length}`;
  $("score").textContent = quiz.firstTry;
  $("reviews").textContent = quiz.reviews;
  $("progress").value = quiz.learned;
  $("quiz").hidden = quiz.done;
  $("complete").hidden = !quiz.done;
  if (quiz.done) {
    $("summary").textContent = `First-try score: ${quiz.firstTry}/${bank.length} (${Math.round(100 * quiz.firstTry / bank.length)}%). Review questions completed: ${quiz.reviews}.`;
    return;
  }
  const q = bank[quiz.current.id];
  $("topic").textContent = q[0];
  $("mode").textContent = quiz.current.review ? "REVIEW ROUND" : `QUESTION ${quiz.learned + (quiz.solved ? 0 : 1)} / ${bank.length}`;
  $("question").textContent = q[1];
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
    label.textContent = text;
    button.append(letter, label);
    if (quiz.wrong.includes(i)) {
      button.classList.add("wrong");
      label.textContent += " (not correct)";
    }
    if (quiz.solved && i === q[3]) {
      button.classList.add("correct");
      label.textContent += " (correct)";
    }
    button.disabled = quiz.solved || quiz.wrong.includes(i);
    button.addEventListener("click", () => submit(i));
    $("options").append(button);
  });
  $("hint").hidden = quiz.solved;
  $("next").hidden = !quiz.solved;
  $("next").textContent = quiz.position === quiz.queue.length - 1 ? "See results" : "Next question \u2192";
  $("feedback").className = `feedback ${quiz.solved ? "success" : "retry"}`;
  if (quiz.solved) {
    $("feedback").textContent = `Correct! ${q[5]}${quiz.wrong.length ? "\nThis question will return for review after up to four other questions." : ""}`;
  } else if (quiz.wrong.length) {
    $("feedback").textContent = `Not quite. No problem - let's work it out.\nHint: ${hintText()}`;
  } else {
    $("feedback").textContent = "";
  }
}

function submit(choice) {
  quiz.answer(choice);
  persist();
  render();
  if (quiz.solved) $("next").focus();
  else $("options").querySelector("button:not(:disabled)")?.focus();
}

function next() {
  quiz.next();
  persist();
  render();
  if (!quiz.done) $("options").querySelector("button").focus();
}

$("hint").addEventListener("click", () => {
  $("feedback").className = "feedback retry";
  $("feedback").textContent = `Hint: ${hintText()}`;
});
$("next").addEventListener("click", next);
$("reset").addEventListener("click", () => {
  if (!confirm("Start a new shuffled quest? This replaces your saved progress.")) return;
  quiz = new Quiz(bank, shuffledOrder());
  $("storage").textContent = "";
  storageAvailable = true;
  persist();
  render();
});
document.addEventListener("keydown", event => {
  if (!quiz || quiz.done || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const choice = letters.indexOf(event.key.toUpperCase());
  if (choice >= 0 && !quiz.solved && !quiz.wrong.includes(choice)) {
    event.preventDefault();
    submit(choice);
  } else if (event.key === "Enter" && quiz.solved && event.target !== $("reset")) {
    event.preventDefault();
    next();
  }
});

async function start() {
  const response = await fetch("questions.json?v=2");
  if (!response.ok) throw new Error(`Question bank request failed (${response.status}).`);
  bank = await response.json();
  if (!Array.isArray(bank) || bank.length !== 100 || bank.some(q =>
    !Array.isArray(q) || q.length !== 6 || !Array.isArray(q[2]) || q[2].length !== 4 ||
    !Number.isInteger(q[3]) || q[3] < 0 || q[3] > 3 ||
    ![q[0], q[1], q[4], q[5], ...q[2]].every(s => typeof s === "string" && s.length))) {
    throw new Error("The question bank is incomplete or invalid.");
  }
  let saved;
  try {
    saved = localStorage.getItem(KEY);
    if (!saved && localStorage.getItem("python-modules-quest-v1")) {
      $("storage").textContent = "New course-aligned questions! This bank starts fresh progress; your previous bank's saved data has been kept separately.";
    }
  }
  catch (error) {
    storageAvailable = false;
    $("storage").textContent = `Browser storage is unavailable: ${error.message}. Progress will last only in this tab.`;
    $("save-status").textContent = "Progress is not being saved.";
  }
  if (saved) {
    try { quiz = Quiz.restore(bank, saved); }
    catch (error) {
      $("storage").textContent = `Saved progress could not be restored: ${error.message}. A new quest has started.`;
    }
  }
  quiz ??= new Quiz(bank, shuffledOrder());
  persist();
  render();
}

$("reset").disabled = true;
start().then(() => {
  $("reset").disabled = false;
  $("hint").disabled = false;
}).catch(error => {
  $("question").textContent = "The quiz could not start.";
  $("feedback").textContent = `${error.message}\nRun python play.py, then open the printed local URL. Do not open index.html directly.`;
  $("hint").hidden = true;
});

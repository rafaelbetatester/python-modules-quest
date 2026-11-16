MODULES & PACKAGES QUEST / BYTE RUNNER
A 2D browser adventure for Python Essentials 2, Module 1.
19 challenge gates / 133 original questions / 57 mastery stars.

PUBLIC WEBSITE
https://rafaelbetatester.github.io/python-modules-quest/
The v8 release makes Byte Runner substantially harder with 18 distinct routes.
Modules-Packages-Quest.zip contains this release for local play.
Share the game link. The hosted version needs no Python installation and does
not depend on the author's computer. Each browser keeps its own progress.
GitHub Pages hosts static files. GitHub may log visitor IP addresses for
security; the game has no accounts, analytics or server-side progress.

LOCAL PLAY
1. Install Python 3.10 or newer if needed.
2. Extract the complete folder.
3. In that folder run: python play.py
   Windows users can also use: py play.py
4. Your browser opens the printed loopback URL. Keep the terminal open.
   Ctrl+C stops the server. Your saved browser progress remains.
Do not open index.html directly. No pip installs or external libraries needed.
If the port is busy: python play.py --port 8766
To open the browser yourself: python play.py --no-browser

EXPLORE
Click or tap the scene to focus it. Arrow keys or A/D walk, Space jumps,
X or J fires a pulse, and Enter opens the nearby gate. On-screen buttons work with
pointer/touch or a held Space/Enter key. Release controls to stop moving.
The character travels through four original pixel-art regions: Sunrise
Meadow, Emerald Woods, Crystal Coast and Starlight Summit.
After each quiz, Continue starts one of 18 platform routes to the next gate.
Routes gradually add roaming glitch-bots, real pits, spikes, moving platforms
and timed ZAP fields. Jump onto bots or pulse them; wait for fields to turn OFF.
Each route now has 5-13 enemies instead of 1-4. Silver armored bots take two
pulses or one stomp; green hoppers jump, purple drones fly, and orange sentries
flash ! before firing aimed projectiles. Dodge by jumping or changing position.
Pulses travel about 320 pixels and fire at most once per 0.48 seconds.
The 18 terrain layouts span Rift Causeway, Switchback Yard, Skybridge Ruins,
Pulse Foundry, Drone Gardens and Glitch Gauntlet, with different pit positions,
spike beds, ledges, moving platforms and staggered timed fields as you progress.
Every route requires deliberate jumping; holding right and fire no longer wins.
Gold energy cells are optional: collect up to six per route. Best energy is
separate from quiz stars and levels. Worse replays never lower the best score.
Each route has three shields, damage protection and a SAVE checkpoint.
Falling or losing all shields retries only this route from the checkpoint.
Checkpoint energy survives retry/reload; unsaved pickups and bots reset.
Enemy shots cannot enter the safe start, SAVE pad or exit. Retrying resets enemy
positions, armor, shot timers and moving terrain as well as restoring shields.
v7 route/checkpoint saves remain compatible; checkpoints use the new layouts.
Restart route starts that route fresh. Quiz rewards are NEVER removed.
Use Skip route or the Challenge map for accessible play without any arcade
requirement or quiz-star penalty. Completed routes can be replayed.
Quizzes have no timers. Background decorations are not collectibles.
Reduced-motion preferences disable ambient floating effects.

CHALLENGES AND STARS
- Each of the 19 gates owns 5-10 questions. Every bank question belongs to
  exactly one gate; all 133 are covered without duplicate initial questions.
- The first six gates cover chapter-quiz and completion-assessment skills
  with original scenarios. Later gates provide deeper topic practice.
- Each challenge shuffles its questions. Answer A/B/C/D with buttons or keys.
- Wrong choices stay on the question, are disabled, and reveal a hint.
- You must answer correctly before Next. Correct answers show explanations.
- Missed questions return after up to four intervening questions. A failed
  review is scheduled again. Clear all reviews to finish the challenge.
- 3 stars: at least 90% of initial questions correct on their first attempt.
  2 stars: at least 70%. Otherwise 1 star after completion.
  Thresholds use exact fractions, not rounded displayed percentages.
- Hints are available without a separate penalty. A wrong submitted choice
  removes first-attempt credit. Reviews cannot inflate the original score.
- Completing a gate unlocks its next quiz; reach it through the platform route
  or explicitly skip that route with the map/button.
- Every five total stars raises your level: level = 1 + floor(stars / 5).
  Maximum: 57 stars, level 12.
- Replay gates to improve the best score. Worse/equal replays never remove
  or duplicate earned stars. Replays do not inflate questions learned.
- Return to world or Escape pauses an unfinished challenge. Resume it before
  entering a different gate. Even an answered question awaiting Next is saved.
- Syntax-colored snippets preserve source indentation and quotes. Multiple
  files have separate blocks. Wide code scrolls inside its block on mobile.
  Displayed snippets and intentionally incorrect distractors never execute.

SAVED PROGRESS
Enter a player name before starting. The player screen appears on every visit,
with the most recently used name prefilled. Use that same name to resume stars,
level, completed gates, and the exact unfinished question/review. Completed
adventures remain completed; returning never automatically starts over.
Names have 2-24 characters, start with a letter or number, and can contain
letters, numbers, spaces, dots, underscores and hyphens. Names ignore case;
leading/trailing spaces and repeated whitespace are normalized.
Named saves use python-modules-quest-profile-v1:<encoded-lowercase-name>.
The profile envelope remains v1; its campaign now uses v5, including route best
energy and the active checkpoint. Valid published v4 campaigns migrate with
all quiz rewards, questions and reviews preserved. Previously reached routes
are marked skipped (zero energy), so returning players are never relocked.
Switch player saves the current adventure before opening the player screen.
Each name has separate progress. Reset requires confirmation and affects only
the current player's named save, never other players or older unnamed saves.
If an unclaimed v4 adventure exists, the player screen offers to copy it to a
new player. This is checked by default; uncheck it to start that player fresh.
Existing named profiles always resume their own progress rather than importing
old progress. Once claimed, the old adventure is not offered to another name.
The original v4 data is never deleted. v1, v2 and v3 saves also remain untouched;
those older linear quizzes cannot be interpreted as adventure star rewards.
Profiles are local browser identities, NOT password-protected authentication.
Anyone using the same browser and name can open a profile. No login credentials
are requested, and usernames/progress are not sent to any service.
Return to the same browser and website origin to resume. Different hostnames,
ports, local/public URLs, or devices have separate progress. Multiple tabs do
not synchronize. Private browsing and clearing website data can erase saves.
Storage errors and corrupt profiles are explicitly displayed, never silently
replaced with a fresh saved game. You can correct the name/storage problem or
explicitly choose a temporary new adventure that leaves stored data untouched.
Temporary adventures do not save, even after resetting. Switching is disabled
for unsaved sessions to avoid losing in-memory progress.

CONTENT AND PROVENANCE
100 core questions: 20 imports, 14 modules, 10 packages, 18 math, 12 random,
10 platform and 16 pip. Plus 33 chapter/completion-topic original exercises.
The v6 refresh improves 23 exercises with plausible, often valid-code or
valid-command distractors, multi-step namespace tracing, wildcard collisions,
shared module state versus separately imported values, and random endpoints
and return types. It also covers the Cheese Shop nickname's Monty Python
origin. Multi-file snippets remain separately formatted.
Original practice, not official questions and not copied or closely reworded
assessments. In the shared authenticated course browser, all four Module 1
chapter quizzes (15 prompts), the Module 1 completion test (18 items), and
Module 1-related topics displayed on the full-course Final Test page were
reviewed. No Final Test attempt was started and no assessment was submitted.
The bank covers those skills with original exercises, not a reproduction of
the official assessments. It remains a Module 1 game; later strings, OOP,
file/OS/calendar/datetime topics and the rest of the full-course exam are not
included. Question IDs, topic placement, correct-option positions, 19 gates,
are unchanged. This release upgrades only the campaign save schema and
accepts existing v4 campaigns; older v6 code cannot read new v5 campaign saves.
Local and public origins keep separate saves; progress does not sync.
Course scope: https://www.netacad.com/courses/python-essentials-2?courseLang=en-US
Historical pip search questions explicitly explain the retired PyPI service.
Questions distinguish modern pip behavior, regular/namespace packages, and
platform functions whose strings can be empty.

TESTING
    python -m unittest -v
Python tests execute deterministic output examples in fresh interpreters,
check multifile modules in isolated directories, and validate the HTTP server.
With the server running, execute in browser developer tools:
    const bank = await (await fetch('questions.json?v=8')).json();
    const { runTests } = await import('./engine.test.js?v=8');
    console.table(runTests(bank));
    const { runRendererTests } = await import('./renderer.test.js?v=8');
    console.table(await runRendererTests(bank));
    const { runCampaignTests } = await import('./campaign.test.js?v=8');
    console.table(await runCampaignTests(bank));
    const { runProfileTests } = await import('./profiles.test.js?v=8');
    console.table(await runProfileTests(bank));
    const { runArcadeTests } = await import('./arcade.test.js?v=8');
    console.table(await runArcadeTests());
Every result should have passed: true. Tests cover retries, exact star
thresholds, stage coverage, review scoring, replay rewards, save validation,
full campaign completion, walking/jumping/landing, and code-rendering safety.
The random spread exercise is checked exhaustively over all 27 ordered draws.
Multi-file rendering checks that final source lines stay inside code blocks.
Profile tests check name validation, player separation, exact unfinished-state
restore, completed-adventure restore, safe legacy adoption and storage errors.
Arcade tests check energy, pulse cooldown/hits, stomp/side collisions, damage
protection, checkpoint retry, moving-platform carry, route saves and switching.
All 18 complete encounters are searched using real 100ms movement/jump/fire
and wait inputs, including every enemy and hazard. Each must reach a checkpoint
and finish alive without retries; no enemies are removed to make tests pass.
The separate naive-input check proves holding right/fire fails on all routes.
Focused tests cover armor, airborne enemies, sentry shots, safe pads and resets.

FILES
play.py           Standard-library loopback-only Python HTTP launcher.
questions.json    Original 133-question bank.
engine.js         Question retry/review and first-attempt scoring rules.
campaign.js       Challenge groups, unlocks, stars, levels and campaign saves.
profiles.js       Required player names and independent localStorage saves.
world.js          Original Canvas 2D art, movement, gates and input controls.
arcade.js         Progressive platform routes, hazards, shields and energy.
renderer.js       Safe code/text formatting and syntax colors.
app.js            Browser UI, dialogs and local progress persistence.
index.html        Accessible adventure page.
style.css         Responsive world and challenge styles.
test_quiz.py      Question bank and launcher tests.
engine.test.js    Browser question-engine tests.
renderer.test.js  Browser code-rendering tests.
campaign.test.js  Browser challenge-progression and movement tests.
profiles.test.js  Browser named-save and migration tests.
arcade.test.js    Browser arcade collision and physical reachability tests.

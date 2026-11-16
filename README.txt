MODULES & PACKAGES QUEST / THE PYTHON TRAIL
A 2D browser adventure for Python Essentials 2, Module 1.
19 challenge gates / 133 original questions / 57 mastery stars.

PUBLIC WEBSITE
https://rafaelbetatester.github.io/python-modules-quest/
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
and Enter opens the nearby gate. On-screen movement buttons also work with
pointer/touch or a held Space/Enter key. Release controls to stop moving.
The character travels through four original pixel-art regions: Sunrise
Meadow, Emerald Woods, Crystal Coast and Starlight Summit.
There are no enemies, lives, movement penalties or timers.
Use the Challenge map for accessible play without walking.
Background decorations are not collectibles. Stars are earned by learning.
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
- Completing a gate unlocks the next. All 19 gates unlock after all are cleared.
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
Adventure progress automatically saves locally under python-modules-quest-v4.
This new campaign does not reinterpret old quiz answers as challenge scores.
v1, v2 and v3 keys remain untouched, including when resetting the adventure.
Return to the same browser and origin to resume. Different hostnames, ports,
or local/public URLs have separate progress. Multiple tabs do not synchronize.
Private browsing or clearing site data can remove progress. Storage failures
are explicitly displayed. Invalid saves remain untouched; temporary play is
available, or Reset adventure can replace the invalid adventure save.
Reset adventure requires confirmation and resets stars, levels and progress.
No saved data is sent to a service.

CONTENT AND PROVENANCE
100 core questions: 20 imports, 14 modules, 10 packages, 18 math, 12 random,
10 platform and 16 pip. Plus 33 chapter/completion-topic original exercises.
The adventure improves twelve assessment-topic exercises with more plausible
distractors, realistic scenarios and additional namespace/code tracing.
Original practice, not official questions and not copied or closely reworded
assessments. The question bank covers the Module 1 chapters, chapter quizzes
and completion-test topics previously inspected in the user's shared browser.
It does not include later Python Essentials 2 modules or the full-course exam.
Course scope: https://www.netacad.com/courses/python-essentials-2?courseLang=en-US
Historical pip search questions explicitly explain the retired PyPI service.
Questions distinguish modern pip behavior, regular/namespace packages, and
platform functions whose strings can be empty.

TESTING
    python -m unittest -v
Python tests execute deterministic output examples in fresh interpreters,
check multifile modules in isolated directories, and validate the HTTP server.
With the server running, execute in browser developer tools:
    const bank = await (await fetch('questions.json?v=4')).json();
    const { runTests } = await import('./engine.test.js?v=4');
    console.table(runTests(bank));
    const { runRendererTests } = await import('./renderer.test.js?v=4');
    console.table(await runRendererTests(bank));
    const { runCampaignTests } = await import('./campaign.test.js?v=4');
    console.table(await runCampaignTests(bank));
Every result should have passed: true. Tests cover retries, exact star
thresholds, stage coverage, review scoring, replay rewards, save validation,
full campaign completion, walking/jumping/landing, and code-rendering safety.

FILES
play.py           Standard-library loopback-only Python HTTP launcher.
questions.json    Original 133-question bank.
engine.js         Question retry/review and first-attempt scoring rules.
campaign.js       Challenge groups, unlocks, stars, levels and campaign saves.
world.js          Original Canvas 2D art, movement, gates and input controls.
renderer.js       Safe code/text formatting and syntax colors.
app.js            Browser UI, dialogs and local progress persistence.
index.html        Accessible adventure page.
style.css         Responsive world and challenge styles.
test_quiz.py      Question bank and launcher tests.
engine.test.js    Browser question-engine tests.
renderer.test.js  Browser code-rendering tests.
campaign.test.js  Browser challenge-progression and movement tests.

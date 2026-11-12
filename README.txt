MODULES & PACKAGES QUEST
133 original Python Essentials 2 Module 1-style practice questions.

PUBLIC WEBSITE
https://rafaelbetatester.github.io/python-modules-quest/
Open this link to play or share it with learners. No Python installation is
needed for the hosted version. Each browser keeps its own progress.
GitHub Pages hosts the static files; the Python launcher is only for local play.
GitHub may log visitor IP addresses for security purposes. The quiz itself
has no accounts, analytics, or server-side progress collection.

START
1. Install Python 3.10 or newer if needed.
2. Extract this entire folder.
3. Open a terminal in this folder and run:
       python play.py
   On Windows, py play.py also works if the Python launcher is installed.
4. Your browser opens http://127.0.0.1:8765.
   Keep the terminal open while playing; Ctrl+C stops the server.

No pip installs, accounts, or internet access are required.
Do not open index.html directly: use the Python launcher.
If the port is occupied: python play.py --port 8766
To open the URL yourself: python play.py --no-browser

HOW TO PLAY
- Click A/B/C/D or press the corresponding key.
- Wrong answers stay on the same question and give a hint.
- After multiple mistakes, remaining choices are highlighted in the hint.
- You must answer correctly to continue; an explanation then appears.
- Click Next or press Enter.
- A question missed on its initial appearance returns after up to four other
  questions. A missed review is scheduled again. A clean correct review clears it.
- The final score counts FIRST-TRY answers across the 133-question bank.
  Correcting a mistake still increases "Questions learned", not the first-try score.
- Finish all 133 questions and every scheduled review to complete the quest.
- Start over resets the game and shuffles question order.
- For questions asking for two true statements, select the A/B/C/D option
  containing the correct pair. The controls remain single-answer.
- Each question is labeled Core practice, Module completion practice, or
  the appropriate Chapter quiz practice.
- Python snippets use syntax colors and preserved indentation. Source files
  are separated into labeled blocks. File trees and terminal output have
  distinct labels; statements remain normal numbered lists.
- Wide code scrolls within its block on small screens. Code in answer choices
  uses monospace formatting too. Snippets are displayed, never executed.

SAVED PROGRESS
Progress saves automatically in this browser's local storage. Return using the
same browser, hostname and port to resume. Changing the port or using localhost
instead of 127.0.0.1 creates a different browser storage location.
The public website and the local version have separate saved progress.
The expanded bank uses its own v3 saved-progress key. Old v1 and v2 data is
left untouched, but answers from those banks are not applied to the expanded
question order. Returning learners see a notice explaining the fresh progress.
Private browsing, storage restrictions, or clearing site data can remove progress.
Storage errors appear on the page rather than being hidden.
Use one quiz tab at a time: separate tabs do not synchronize their progress.
No progress is sent to external services.

CONTENT
100 core questions, preserving the previous course-aligned bank:
20 imports/namespace; 14 user modules; 10 packages; 18 math; 12 random;
10 platform; 16 pip.
Plus 18 original completion-test-style practice questions and 15 original
chapter-quiz-style practice questions: 4 for Section 1, 4 for Section 2,
3 for Section 3, and 4 for Section 4.
Code tracing, name collisions, import aliases, repeated imports, shared module
state, __name__, __pycache__, shebangs, underscore conventions, sys.path, ZIP
imports, package initialization, qualified imports, trigonometry, logarithms,
rounding, pseudorandom ranges, sampling, platform data, and package management.
Questions are original practice material, not official or copied exam questions.
Public scope reference:
https://www.netacad.com/courses/python-essentials-2?courseLang=en-US
The refreshed bank was aligned to the four Module 1 chapters, chapter quizzes,
and module-test review that the user shared in their browser. Source questions
were not copied or closely reworded; scenarios, code, options, hints, and
explanations are original. Login-protected course content is not distributed.
The chapter quizzes and 18-item completed module-test review were revisited
through the user's shared browser to check coverage. No test attempt was
started or submitted.
Legacy pip search behavior is explicitly labeled historical: PyPI's XML-RPC
search has been retired. Modern installation defaults and namespace-package
exceptions are explained accurately instead of teaching obsolete absolutes.
Distractors are incorrect examples: they are never executed by the game.

TESTING
    python -m unittest -v
Browser learning-rule tests (with the quiz server running):
Open browser developer tools and run:
    const { runTests } = await import('./engine.test.js');
    console.table(runTests(await (await fetch('questions.json')).json()));
All returned results should have passed: true.
Formatting checks:
    const { runRendererTests } = await import('./renderer.test.js');
    console.table(await runRendererTests(await (await fetch('questions.json')).json()));
These checks cover source preservation for every question, indentation,
syntax colors, safe HTML-shaped text, statement lists, and multiple files.
The Python tests execute at least 40 deterministic output questions in fresh
interpreters and compare actual output with each stored correct choice.

FILES
play.py           Standard-library, loopback-only Python HTTP launcher.
questions.json    Editable 100-question bank.
engine.js         Retry, review, score and save/restore learning rules.
renderer.js       Safe code/text formatting and dependency-free syntax colors.
app.js            Browser controls and local progress persistence.
index.html        Accessible quiz page.
style.css         Responsive dark theme.
test_quiz.py      Bank and launcher tests.
engine.test.js    Browser learning-rule tests.
renderer.test.js  Browser code-formatting tests.

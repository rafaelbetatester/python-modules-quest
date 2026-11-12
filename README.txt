MODULES & PACKAGES QUEST
100 original Python Essentials 2 Module 1-style practice questions.

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
- The final score counts FIRST-TRY answers on the original 100 questions only.
  Correcting a mistake still increases "Questions learned", not the first-try score.
- Finish all 100 questions and every scheduled review to complete the quest.
- Start over resets the game and shuffles question order.

SAVED PROGRESS
Progress saves automatically in this browser's local storage. Return using the
same browser, hostname and port to resume. Changing the port or using localhost
instead of 127.0.0.1 creates a different browser storage location.
The public website and the local version have separate saved progress.
Private browsing, storage restrictions, or clearing site data can remove progress.
Storage errors appear on the page rather than being hidden.
Use one quiz tab at a time: separate tabs do not synchronize their progress.
No progress is sent to external services.

CONTENT
Imports, module namespaces, user modules, __name__, sys.path, bytecode caches,
regular and namespace packages, relative imports, math, random, platform, and pip.
Questions are original practice material, not official or copied exam questions.
Public scope reference:
https://www.netacad.com/courses/python-essentials-2?courseLang=en-US
The detailed course lessons require login and were not accessed.
Some examples intentionally explain nuances of modern Python/pip, including
namespace packages and automatic user-installation defaults.
Distractors are incorrect examples: they are never executed by the game.

TESTING
    python -m unittest -v
Browser learning-rule tests (with the quiz server running):
Open browser developer tools and run:
    const { runTests } = await import('./engine.test.js');
    console.table(runTests(await (await fetch('questions.json')).json()));
All returned results should have passed: true.

FILES
play.py           Standard-library, loopback-only Python HTTP launcher.
questions.json    Editable 100-question bank.
engine.js         Retry, review, score and save/restore learning rules.
app.js            Browser controls and local progress persistence.
index.html        Accessible quiz page.
style.css         Responsive dark theme.
test_quiz.py      Bank and launcher tests.
engine.test.js    Browser learning-rule tests.

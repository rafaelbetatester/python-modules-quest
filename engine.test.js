import { Quiz } from "./engine.js?v=5";

export function runTests(bank) {
  const results = [];
  function test(name, fn) {
    try { fn(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  function assert(value, message) {
    if (!value) throw new Error(message);
  }
  function throws(fn) {
    let caught = false;
    try { fn(); } catch { caught = true; }
    assert(caught, "Expected invalid action to be rejected");
  }
  const fresh = () => new Quiz(bank, bank.map((_, i) => i));
  test("Wrong answer stays on question and cannot be selected twice", () => {
    const quiz = fresh();
    const wrong = (bank[0][3] + 1) % 4;
    quiz.answer(wrong);
    assert(quiz.current.id === 0 && !quiz.solved, "Advanced after mistake");
    assert(quiz.wrong.includes(wrong), "Mistake not recorded");
    throws(() => quiz.answer(wrong));
    throws(() => quiz.next());
  });
  test("Correct first attempt counts once and requires Next", () => {
    const quiz = fresh();
    quiz.answer(bank[0][3]);
    assert(quiz.solved && quiz.firstTry === 1 && quiz.learned === 1, "Bad score");
    throws(() => quiz.answer(bank[0][3]));
    quiz.next();
    assert(quiz.current.id === 1, "Next did not advance");
  });
  test("Missed question returns after four intervening questions", () => {
    const quiz = fresh();
    quiz.answer((bank[0][3] + 1) % 4);
    quiz.answer(bank[0][3]);
    quiz.next();
    for (let i = 1; i <= 4; i++) {
      assert(quiz.current.id === i, "Review appeared too early");
      quiz.answer(bank[i][3]); quiz.next();
    }
    assert(quiz.current.id === 0 && quiz.current.review, "Review not scheduled");
    assert(quiz.firstTry === 4 && quiz.learned === 5, "Reviews inflated score");
  });
  test("A failed review returns again until answered cleanly", () => {
    const quiz = fresh();
    for (let turn = 0; turn < 2; turn++) {
      const id = quiz.current.id;
      quiz.answer((bank[id][3] + 1) % 4);
      quiz.answer(bank[id][3]); quiz.next();
      for (let i = 0; i < 4; i++) {
        quiz.answer(bank[quiz.current.id][3]); quiz.next();
      }
      assert(quiz.current.id === 0 && quiz.current.review, "Lost failed review");
    }
  });
  test("All-correct run finishes every question in the bank", () => {
    const quiz = fresh();
    for (let i = 0; i < bank.length; i++) {
      quiz.answer(bank[quiz.current.id][3]); quiz.next();
    }
    assert(quiz.done && quiz.firstTry === bank.length && quiz.learned === bank.length, "Not complete");
    throws(() => quiz.next());
  });
  test("All-missed run completes after clean reviews", () => {
    const quiz = fresh();
    let turns = 0;
    while (!quiz.done && turns < bank.length * 3) {
      const id = quiz.current.id;
      if (!quiz.current.review) quiz.answer((bank[id][3] + 1) % 4);
      quiz.answer(bank[id][3]); quiz.next(); turns++;
    }
    assert(quiz.done && turns === bank.length * 2 && quiz.firstTry === 0, "Review loop broken");
  });
  test("Save restores wrong choices, feedback, score and delayed reviews", () => {
    const quiz = fresh();
    quiz.answer((bank[0][3] + 1) % 4);
    let restored = Quiz.restore(bank, JSON.stringify(quiz.save()));
    assert(restored.wrong.length === 1 && !restored.solved, "Retry not restored");
    restored.answer(bank[0][3]);
    restored = Quiz.restore(bank, JSON.stringify(restored.save()));
    assert(restored.solved && restored.learned === 1, "Feedback not restored");
    assert(restored.queue.length === bank.length + 1, "Review not restored");
  });
  test("Corrupt, incompatible and impossible saved data are rejected", () => {
    throws(() => Quiz.restore(bank, "{bad"));
    throws(() => Quiz.restore(bank, JSON.stringify({ version: 9 })));
    const data = fresh().save();
    data.order[1] = data.order[0];
    throws(() => Quiz.restore(bank, JSON.stringify(data)));
    const impossible = fresh().save(); impossible.events = ["next"];
    throws(() => Quiz.restore(bank, JSON.stringify(impossible)));
  });
  test("Invalid answer types and out-of-range choices are rejected", () => {
    const quiz = fresh();
    for (const value of [-1, 4, null, "A", 0.5]) throws(() => quiz.answer(value));
  });
  return results;
}

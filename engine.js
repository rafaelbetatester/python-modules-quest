export class Quiz {
  constructor(bank, order) {
    if (!Array.isArray(order) || order.length !== bank.length ||
        new Set(order).size !== bank.length ||
        order.some(id => !Number.isInteger(id) || id < 0 || id >= bank.length)) {
      throw new Error("Invalid question order.");
    }
    this.bank = bank;
    this.order = [...order];
    this.queue = order.map(id => ({ id, review: false }));
    this.position = 0;
    this.wrong = [];
    this.solved = false;
    this.learned = 0;
    this.firstTry = 0;
    this.reviews = 0;
    this.events = [];
  }

  get done() { return this.position >= this.queue.length; }
  get current() { return this.queue[this.position]; }

  answer(choice) {
    if (this.done || this.solved || !Number.isInteger(choice) ||
        choice < 0 || choice > 3 || this.wrong.includes(choice)) {
      throw new Error("Choose an available answer on the current question.");
    }
    this.events.push(choice);
    if (choice !== this.bank[this.current.id][3]) {
      this.wrong.push(choice);
      return false;
    }
    this.solved = true;
    if (!this.current.review) {
      this.learned++;
      if (!this.wrong.length) this.firstTry++;
    } else {
      this.reviews++;
    }
    if (this.wrong.length) {
      this.queue.splice(Math.min(this.position + 5, this.queue.length), 0,
        { id: this.current.id, review: true });
    }
    return true;
  }

  next() {
    if (this.done || !this.solved) throw new Error("Answer correctly before continuing.");
    this.events.push("next");
    this.position++;
    this.solved = false;
    this.wrong = [];
  }

  save() {
    return { version: 1, order: [...this.order], events: [...this.events] };
  }

  static restore(bank, text) {
    const data = JSON.parse(text);
    if (!data || data.version !== 1 || !Array.isArray(data.events) ||
        data.events.length > 100000) throw new Error("Unrecognized saved progress.");
    const quiz = new Quiz(bank, data.order);
    for (const event of data.events) {
      if (event === "next") quiz.next();
      else quiz.answer(event);
    }
    return quiz;
  }
}

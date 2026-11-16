export async function runRendererTests(bank) {
  const results = [];
  const { renderQuestion, renderOption } = await import("./renderer.js?v=5");
  function assert(value, message) {
    if (!value) throw new Error(message);
  }
  function test(name, fn) {
    try { fn(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  const body = () => document.createElement("div");
  test("Output question separates stem from highlighted Python", () => {
    const node = body();
    const stem = renderQuestion(node, bank[0][1], 0);
    assert(stem === "What is printed?", "Code leaked into heading");
    assert(node.querySelector("pre code").textContent === bank[0][1].split("\n").slice(1).join("\n"), "Source changed");
    assert(node.querySelector(".token-keyword")?.textContent === "import", "No keyword highlighting");
    assert(node.querySelector(".token-number"), "No numeric highlighting");
  });
  test("Indentation, quotes, blank lines and comments remain exact", () => {
    const node = body();
    const code = "def example():\n    text = '# not a comment'\n\n    return text  # real comment";
    renderQuestion(node, `What is printed?\n${code}`, 999);
    assert(node.querySelector("code").textContent === code, "Whitespace or source changed");
    assert(node.querySelector(".token-string").textContent === "'# not a comment'", "String parsed as comment");
    assert(node.querySelector(".token-comment").textContent === "# real comment", "Comment not colored");
  });
  test("HTML-shaped source is displayed, never interpreted as markup", () => {
    const node = body();
    const code = "print('<img src=x onerror=alert(1)>')";
    renderQuestion(node, `What is printed?\n${code}`, 999);
    assert(!node.querySelector("img,script"), "Source interpreted as HTML");
    assert(node.querySelector("code").textContent === code, "Source was not preserved");
  });
  test("Statement pairs become ordered lists, not Python code", () => {
    const node = body();
    renderQuestion(node, bank[18][1], 18);
    assert(node.querySelectorAll("ol li").length === 4, "Statements not listed");
    assert(!node.querySelector("pre"), "Prose incorrectly formatted as code");
  });
  test("Separate source files get separate code blocks", () => {
    const node = body();
    renderQuestion(node, bank[22][1], 22);
    const blocks = node.querySelectorAll("pre code");
    assert(blocks.length === 2, "Source files not separated");
    assert(blocks[0].textContent === "print('load')\nready = True", "First source file wrong");
    assert(blocks[1].textContent === "import status\nimport status\nprint(status.ready)", "Second source file wrong");
  });
  test("Package trees leave the follow-up question as prose", () => {
    const node = body();
    renderQuestion(node, bank[34][1], 34);
    assert(node.querySelector("pre").textContent.includes("        indoor.py"), "Tree indentation lost");
    assert(node.querySelector("p").textContent.includes("indoor.py defines read"), "Follow-up text lost");
  });
  test("Multiline code choices preserve source and terminal commands are identified", () => {
    const node = body();
    renderOption(node, "if __name__ == '__main__':\n    check()");
    assert(node.querySelector("code").textContent.includes("\n    check()"), "Option indentation lost");
    renderOption(node, "python -m pip install -U pygame");
    assert(node.querySelector("code"), "Terminal command rendered as prose");
    renderOption(node, "A friendly explanation without any code.");
    assert(!node.querySelector("code"), "Ordinary answer turned into code");
  });
  test("Every question retains all nonblank source text after formatting", () => {
    const normalize = s => s.replace(/\s+/g, " ").trim();
    for (let id = 0; id < bank.length; id++) {
      const node = body();
      const stem = renderQuestion(node, bank[id][1], id);
      const clone = node.cloneNode(true);
      clone.querySelectorAll("figcaption").forEach(label => label.remove());
      const rendered = `${stem} ${clone.textContent}`;
      const expected = bank[id][1].replace(/^\d+\.\s*/gm, "");
      assert(normalize(rendered) === normalize(expected), `Question ${id + 1} text changed`);
    }
  });
  return results;
}

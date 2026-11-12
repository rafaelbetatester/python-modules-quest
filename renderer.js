const CODE_RANGES = {
  6: [[1, null, "python"]],
  7: [[1, null, "python"]],
  19: [[1, null, "python"]],
  22: [[2, 4, "python"], [6, 9, "python"]],
  24: [[2, 6, "python"], [8, 13, "python"]],
  30: [[1, 2, "python"]],
  34: [[1, 6, "tree"]],
  59: [[1, null, "python"]],
  63: [[1, null, "python"]],
  69: [[1, null, "python"]],
  70: [[1, null, "python"]],
  90: [[1, null, "terminal"]],
  104: [[2, 4, "python"], [6, 9, "python"]],
  106: [[1, null, "python"]],
  108: [[1, null, "python"]],
  112: [[1, null, "terminal"]],
  113: [[1, null, "terminal"]],
  115: [[1, null, "terminal"]],
  117: [[1, null, "terminal"]],
  118: [[1, null, "python"]],
  128: [[1, null, "tree"]],
  131: [[1, null, "terminal"]],
};

const KEYWORDS = new Set("import from as def return global if elif else for in is not and or while try except raise with lambda True False None".split(" "));
const BUILTINS = new Set("print int float bool str range len set sorted round type all callable isinstance list tuple dict".split(" "));
const TOKENS = /#[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b[A-Za-z_]\w*\b/g;

function appendHighlighted(code, source, language) {
  if (language !== "python") {
    code.textContent = source;
    return;
  }
  let cursor = 0;
  for (const match of source.matchAll(TOKENS)) {
    code.append(document.createTextNode(source.slice(cursor, match.index)));
    const token = match[0];
    let category;
    if (token.startsWith("#")) category = "comment";
    else if (/^['"]/.test(token)) category = "string";
    else if (/^\d/.test(token)) category = "number";
    else if (KEYWORDS.has(token)) category = "keyword";
    else if (BUILTINS.has(token)) category = "builtin";
    if (category) {
      const span = document.createElement("span");
      span.className = `token-${category}`;
      span.textContent = token;
      code.append(span);
    } else {
      code.append(document.createTextNode(token));
    }
    cursor = match.index + token.length;
  }
  code.append(document.createTextNode(source.slice(cursor)));
}

function codeBlock(source, language) {
  const figure = document.createElement("figure");
  figure.className = "code-block";
  const caption = document.createElement("figcaption");
  caption.textContent = { python: "Python", terminal: "Terminal / output", tree: "File layout" }[language];
  const pre = document.createElement("pre");
  pre.tabIndex = 0;
  pre.setAttribute("aria-label", caption.textContent);
  const code = document.createElement("code");
  appendHighlighted(code, source, language);
  pre.append(code);
  figure.append(caption, pre);
  return figure;
}

function appendProse(container, lines) {
  const nonblank = lines.filter(line => line.trim());
  if (!nonblank.length) return;
  if (nonblank.every(line => /^\d+\.\s/.test(line))) {
    const list = document.createElement("ol");
    for (const line of nonblank) {
      const item = document.createElement("li");
      item.textContent = line.replace(/^\d+\.\s*/, "");
      list.append(item, document.createTextNode("\n"));
    }
    container.append(list, document.createTextNode("\n"));
    return;
  }
  for (const line of nonblank) {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    if (/^[\w-]+\.py:$/.test(line)) paragraph.className = "source-label";
    container.append(paragraph, document.createTextNode("\n"));
  }
}

export function renderQuestion(container, prompt, id) {
  const lines = prompt.split("\n");
  const ranges = prompt.startsWith("What is printed?\n")
    ? [[1, lines.length, "python"]]
    : CODE_RANGES[id] ?? [];
  container.replaceChildren();
  let cursor = 1;
  for (const [start, stop, language] of ranges) {
    const end = stop ?? lines.length;
    if (!Number.isInteger(start) || !Number.isInteger(end) ||
        start < cursor || end <= start || end > lines.length) {
      throw new Error(`Invalid code layout for question ${id + 1}.`);
    }
    appendProse(container, lines.slice(cursor, start));
    container.append(codeBlock(lines.slice(start, end).join("\n"), language), document.createTextNode("\n"));
    cursor = end;
  }
  appendProse(container, lines.slice(cursor));
  return lines[0];
}

export function renderOption(container, text) {
  container.replaceChildren();
  const terminal = /^(?:python(?:3)?|pip)\b/.test(text);
  const python = /^(?:import|from|if)\b/.test(text) ||
    /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\(.*\)$/.test(text);
  if (terminal || python) {
    const code = document.createElement("code");
    code.className = "answer-code";
    appendHighlighted(code, text, terminal ? "terminal" : "python");
    container.append(code);
  } else {
    container.textContent = text;
  }
}

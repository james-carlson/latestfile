// Tokenizer for the HCL2 subset used by Latestfile v0.1.
//
// The spec's grammar surface is small: top-level attributes, named blocks,
// scalars, arrays, and traversal expressions (tool.cursor, tool["claude-code"],
// org.model["gpt4-azure"]). We tokenize by hand rather than pulling in a wasm
// HCL parser so that every diagnostic carries a real line and column — the
// error messages are most of what makes a validator worth using.

export type TokenKind =
  | "ident"
  | "string"
  | "number"
  | "lbrace"
  | "rbrace"
  | "lbracket"
  | "rbracket"
  | "equals"
  | "comma"
  | "dot"
  | "newline"
  | "eof";

export interface Token {
  kind: TokenKind;
  /** Decoded value for strings/idents/numbers; raw punctuation otherwise. */
  value: string;
  line: number;
  col: number;
}

export class LexError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(message);
    this.name = "LexError";
    this.line = line;
    this.col = col;
  }
}

const IDENT_START = /[A-Za-z_]/;
const IDENT_CHAR = /[A-Za-z0-9_-]/;

export function lex(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const peek = (o = 0) => src[i + o] ?? "";

  function advance(n = 1) {
    for (let k = 0; k < n; k++) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  function push(kind: TokenKind, value: string, l: number, c: number) {
    tokens.push({ kind, value, line: l, col: c });
  }

  while (i < src.length) {
    const ch = peek();

    // Line comments: # ... and // ...
    if (ch === "#" || (ch === "/" && peek(1) === "/")) {
      while (i < src.length && peek() !== "\n") advance();
      continue;
    }

    // Block comments: /* ... */
    if (ch === "/" && peek(1) === "*") {
      const startLine = line;
      const startCol = col;
      advance(2);
      let closed = false;
      while (i < src.length) {
        if (peek() === "*" && peek(1) === "/") {
          advance(2);
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) {
        throw new LexError("Unterminated block comment", startLine, startCol);
      }
      continue;
    }

    if (ch === "\n") {
      push("newline", "\n", line, col);
      advance();
      continue;
    }

    // Other whitespace is insignificant.
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      continue;
    }

    // Heredocs are valid HCL2 but outside the Latestfile v0.1 subset. Fail
    // loudly with a pointer rather than mis-parsing the rest of the file.
    if (ch === "<" && peek(1) === "<") {
      throw new LexError(
        "Heredoc strings are not supported in Latestfile v0.1 — use a quoted string",
        line,
        col
      );
    }

    if (ch === '"') {
      const startLine = line;
      const startCol = col;
      advance(); // opening quote
      let out = "";
      let closed = false;
      while (i < src.length) {
        const c = peek();
        if (c === "\\") {
          const esc = peek(1);
          switch (esc) {
            case "n": out += "\n"; break;
            case "t": out += "\t"; break;
            case "r": out += "\r"; break;
            case '"': out += '"'; break;
            case "\\": out += "\\"; break;
            default:
              throw new LexError(`Unknown escape sequence \\${esc}`, line, col);
          }
          advance(2);
          continue;
        }
        if (c === '"') {
          advance();
          closed = true;
          break;
        }
        if (c === "\n") {
          throw new LexError("Unterminated string (newline inside quotes)", startLine, startCol);
        }
        out += c;
        advance();
      }
      if (!closed) throw new LexError("Unterminated string", startLine, startCol);
      push("string", out, startLine, startCol);
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(peek(1)))) {
      const startLine = line;
      const startCol = col;
      let out = "";
      if (peek() === "-") { out += "-"; advance(); }
      while (i < src.length && /[0-9]/.test(peek())) { out += peek(); advance(); }
      if (peek() === "." && /[0-9]/.test(peek(1))) {
        out += "."; advance();
        while (i < src.length && /[0-9]/.test(peek())) { out += peek(); advance(); }
      }
      push("number", out, startLine, startCol);
      continue;
    }

    if (IDENT_START.test(ch)) {
      const startLine = line;
      const startCol = col;
      let out = "";
      while (i < src.length && IDENT_CHAR.test(peek())) { out += peek(); advance(); }
      push("ident", out, startLine, startCol);
      continue;
    }

    const simple: Record<string, TokenKind> = {
      "{": "lbrace",
      "}": "rbrace",
      "[": "lbracket",
      "]": "rbracket",
      "=": "equals",
      ",": "comma",
      ".": "dot",
    };
    const kind = simple[ch];
    if (kind) {
      push(kind, ch, line, col);
      advance();
      continue;
    }

    throw new LexError(`Unexpected character '${ch}'`, line, col);
  }

  push("eof", "", line, col);
  return tokens;
}

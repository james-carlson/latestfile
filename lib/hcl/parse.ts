// Parser for the HCL2 subset used by Latestfile v0.1.
//
// Produces two things at once:
//   1. `json`   — the canonical JSON form defined in SPEC.md, suitable for
//                 JSON Schema validation. Block labels become object keys;
//                 traversals become "${...}" template strings.
//   2. `blocks` — the same content with source positions attached, so the
//                 validator can point at the exact line a problem is on.

import { lex, LexError, type Token } from "./lex";

export interface Pos {
  line: number;
  col: number;
}

/** A reference expression such as `tool.cursor` or `org.model["gpt4-azure"]`. */
export interface Ref extends Pos {
  /** Source form, e.g. `tool["claude-code"]`. */
  text: string;
  /** Dotted parts, e.g. ["tool", "claude-code"] or ["org", "model", "gpt4-azure"]. */
  parts: string[];
  /**
   * How each part after the root was written. SPEC.md § Relationships requires
   * bracket syntax for any name that is not a bare [a-zA-Z][a-zA-Z0-9_]*
   * identifier, so the validator needs the surface form, not just the value.
   */
  styles: ("dot" | "bracket")[];
}

export type HclValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "bool"; value: boolean }
  | { kind: "array"; items: HclValue[] }
  | { kind: "ref"; ref: Ref };

export interface Attr extends Pos {
  key: string;
  value: HclValue;
}

export interface Block extends Pos {
  type: string;
  /** Block label. Blocks are always given exactly one label in v0.1. */
  name: string;
  namePos: Pos;
  attrs: Attr[];
  /** Nested blocks. Not used by v0.1, but tolerated for forward-compat. */
  blocks: Block[];
}

export interface ParseResult {
  json: Record<string, unknown>;
  topAttrs: Attr[];
  blocks: Block[];
}

export class ParseError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(message);
    this.name = "ParseError";
    this.line = line;
    this.col = col;
  }
}

export function parse(src: string): ParseResult {
  let tokens: Token[];
  try {
    tokens = lex(src);
  } catch (e) {
    if (e instanceof LexError) throw new ParseError(e.message, e.line, e.col);
    throw e;
  }

  let p = 0;
  const peek = (o = 0): Token => tokens[Math.min(p + o, tokens.length - 1)];

  function skipNewlines() {
    while (peek().kind === "newline") p++;
  }

  function expect(kind: Token["kind"], what: string): Token {
    const t = peek();
    if (t.kind !== kind) {
      throw new ParseError(
        `Expected ${what}, found ${describe(t)}`,
        t.line,
        t.col
      );
    }
    p++;
    return t;
  }

  function describe(t: Token): string {
    switch (t.kind) {
      case "eof": return "end of file";
      case "newline": return "end of line";
      case "string": return `string "${t.value}"`;
      case "ident": return `'${t.value}'`;
      default: return `'${t.value}'`;
    }
  }

  /** Parses `IDENT ('.' IDENT | '[' STRING ']')*` starting at an ident. */
  function parseTraversal(): Ref {
    const start = expect("ident", "an identifier");
    const parts = [start.value];
    const styles: ("dot" | "bracket")[] = [];
    let text = start.value;
    for (;;) {
      if (peek().kind === "dot") {
        p++;
        const seg = expect("ident", "a name after '.'");
        parts.push(seg.value);
        styles.push("dot");
        text += `.${seg.value}`;
        continue;
      }
      if (peek().kind === "lbracket") {
        p++;
        const seg = expect("string", "a quoted name inside [ ]");
        expect("rbracket", "']'");
        parts.push(seg.value);
        styles.push("bracket");
        text += `["${seg.value}"]`;
        continue;
      }
      break;
    }
    return { text, parts, styles, line: start.line, col: start.col };
  }

  function parseValue(): HclValue {
    const t = peek();
    switch (t.kind) {
      case "string":
        p++;
        return { kind: "string", value: t.value };
      case "number":
        p++;
        return { kind: "number", value: Number(t.value) };
      case "lbracket": {
        p++;
        const items: HclValue[] = [];
        skipNewlines();
        while (peek().kind !== "rbracket") {
          if (peek().kind === "eof") {
            throw new ParseError("Unclosed '[' — expected ']'", t.line, t.col);
          }
          items.push(parseValue());
          skipNewlines();
          if (peek().kind === "comma") {
            p++;
            skipNewlines();
            continue;
          }
          skipNewlines();
          if (peek().kind !== "rbracket") {
            const bad = peek();
            throw new ParseError(
              `Expected ',' or ']' in list, found ${describe(bad)}`,
              bad.line,
              bad.col
            );
          }
        }
        p++; // ']'
        return { kind: "array", items };
      }
      case "ident": {
        if (t.value === "true" || t.value === "false") {
          // Only a bare keyword is a boolean; `true.x` would be a traversal.
          if (peek(1).kind !== "dot" && peek(1).kind !== "lbracket") {
            p++;
            return { kind: "bool", value: t.value === "true" };
          }
        }
        return { kind: "ref", ref: parseTraversal() };
      }
      default:
        throw new ParseError(`Expected a value, found ${describe(t)}`, t.line, t.col);
    }
  }

  function parseBody(insideBlock: boolean): { attrs: Attr[]; blocks: Block[] } {
    const attrs: Attr[] = [];
    const blocks: Block[] = [];

    for (;;) {
      skipNewlines();
      const t = peek();
      if (t.kind === "eof") {
        if (insideBlock) {
          throw new ParseError("Unclosed '{' — expected '}'", t.line, t.col);
        }
        break;
      }
      if (t.kind === "rbrace") {
        if (!insideBlock) {
          throw new ParseError("Unexpected '}'", t.line, t.col);
        }
        break;
      }
      if (t.kind !== "ident") {
        throw new ParseError(
          `Expected an attribute or block, found ${describe(t)}`,
          t.line,
          t.col
        );
      }

      // Attribute: IDENT '='
      if (peek(1).kind === "equals") {
        p += 2;
        const value = parseValue();
        attrs.push({ key: t.value, value, line: t.line, col: t.col });
        continue;
      }

      // Block: IDENT STRING* '{'
      if (peek(1).kind === "string" || peek(1).kind === "lbrace") {
        p++; // block type
        const labels: Token[] = [];
        while (peek().kind === "string") {
          labels.push(peek());
          p++;
        }
        if (labels.length > 1) {
          const extra = labels[1];
          throw new ParseError(
            `Block '${t.value}' takes exactly one name, found ${labels.length}`,
            extra.line,
            extra.col
          );
        }
        if (peek().kind !== "lbrace") {
          // `provider "anthropic"` looks like a block header but is almost
          // always a forgotten '='. Say so instead of demanding a brace.
          const at = peek();
          if (labels.length === 1) {
            // v0.1 has no nested blocks, so `provider "anthropic"` inside a
            // block is always a forgotten '='. At the top level it is more
            // likely a block header with its brace on the wrong line.
            if (insideBlock || at.kind !== "newline") {
              throw new ParseError(
                `Expected '=' after '${t.value}' — did you mean ${t.value} = "${labels[0].value}"?`,
                t.line,
                t.col
              );
            }
            throw new ParseError(
              `'{' must be on the same line as the '${t.value}' block header`,
              at.line,
              at.col
            );
          }
          throw new ParseError(`Expected '{' after '${t.value}', found ${describe(at)}`, at.line, at.col);
        }
        const open = expect("lbrace", "'{'");
        const inner = parseBody(true);
        expect("rbrace", "'}'");
        const label = labels[0];
        blocks.push({
          type: t.value,
          name: label ? label.value : "",
          namePos: label
            ? { line: label.line, col: label.col }
            : { line: open.line, col: open.col },
          attrs: inner.attrs,
          blocks: inner.blocks,
          line: t.line,
          col: t.col,
        });
        continue;
      }

      throw new ParseError(
        `Expected '=' or a block name after '${t.value}'`,
        peek(1).line,
        peek(1).col
      );
    }

    return { attrs, blocks };
  }

  const body = parseBody(false);
  return {
    json: toCanonicalJson(body.attrs, body.blocks),
    topAttrs: body.attrs,
    blocks: body.blocks,
  };
}

/** Renders a parsed value into its canonical JSON representation. */
export function valueToJson(v: HclValue): unknown {
  switch (v.kind) {
    case "string": return v.value;
    case "number": return v.value;
    case "bool": return v.value;
    case "array": return v.items.map(valueToJson);
    case "ref": return "${" + v.ref.text + "}";
  }
}

export function toCanonicalJson(attrs: Attr[], blocks: Block[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of attrs) out[a.key] = valueToJson(a.value);
  for (const b of blocks) {
    const bucket = (out[b.type] ??= {}) as Record<string, unknown>;
    // A duplicate name is reported by the validator; last write wins here so
    // that schema validation still sees a well-formed document.
    bucket[b.name] = toCanonicalJson(b.attrs, b.blocks);
  }
  return out;
}

/** Collects every reference expression in a value, depth-first. */
export function refsIn(v: HclValue): Ref[] {
  switch (v.kind) {
    case "ref": return [v.ref];
    case "array": return v.items.flatMap(refsIn);
    default: return [];
  }
}

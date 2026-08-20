// Seed catalog for the builder.
//
// SPEC.md § Registry describes `registry:` URIs resolving to vendor-published
// entity definitions. No registry exists yet, so these URIs are the names those
// definitions *would* have — the catalog is a convenience layer over free-form
// entry, never a gate. Anything not listed here can be typed in by hand, which
// is exactly what a `tool` block without a `from` field is for.

export interface CatalogEntry {
  /** Block name — must match the spec's identifier pattern. */
  name: string;
  label: string;
  provider: string;
  /** Registry URI for the `from` field. */
  from: string;
  /** Short note shown in the picker. */
  note?: string;
}

export const TOOL_CATALOG: CatalogEntry[] = [
  { name: "claude-code", label: "Claude Code", provider: "anthropic", from: "registry:anthropic/claude-code", note: "Terminal / IDE agent" },
  { name: "cursor", label: "Cursor", provider: "anysphere", from: "registry:anysphere/cursor", note: "AI-native editor" },
  { name: "github-copilot", label: "GitHub Copilot", provider: "github", from: "registry:github/copilot", note: "Inline completion + chat" },
  { name: "codex", label: "Codex", provider: "openai", from: "registry:openai/codex", note: "OpenAI coding agent" },
  { name: "windsurf", label: "Windsurf", provider: "codeium", from: "registry:codeium/windsurf", note: "Agentic IDE" },
  { name: "zed", label: "Zed", provider: "zed-industries", from: "registry:zed-industries/zed", note: "Editor with built-in agents" },
  { name: "aider", label: "Aider", provider: "aider", from: "registry:aider/aider", note: "Terminal pair programmer" },
  { name: "cline", label: "Cline", provider: "cline", from: "registry:cline/cline", note: "VS Code agent" },
  { name: "continue", label: "Continue", provider: "continue", from: "registry:continue/continue", note: "Open-source assistant" },
  { name: "gemini-cli", label: "Gemini CLI", provider: "google", from: "registry:google/gemini-cli", note: "Terminal agent" },
  { name: "jetbrains-ai", label: "JetBrains AI", provider: "jetbrains", from: "registry:jetbrains/ai-assistant", note: "IDE assistant" },
];

export const MODEL_CATALOG: CatalogEntry[] = [
  { name: "claude-opus", label: "Claude Opus 5", provider: "anthropic", from: "registry:anthropic/claude-opus-5" },
  { name: "claude-sonnet", label: "Claude Sonnet 5", provider: "anthropic", from: "registry:anthropic/claude-sonnet-5" },
  { name: "claude-haiku", label: "Claude Haiku 4.5", provider: "anthropic", from: "registry:anthropic/claude-haiku-4-5" },
  { name: "gpt", label: "GPT", provider: "openai", from: "registry:openai/gpt" },
  { name: "gemini", label: "Gemini", provider: "google", from: "registry:google/gemini" },
  { name: "llama", label: "Llama", provider: "meta", from: "registry:meta/llama" },
  { name: "mistral", label: "Mistral", provider: "mistralai", from: "registry:mistralai/mistral" },
  { name: "qwen", label: "Qwen", provider: "alibaba", from: "registry:alibaba/qwen" },
  { name: "deepseek", label: "DeepSeek", provider: "deepseek", from: "registry:deepseek/deepseek" },
];

/** Starter workflows. Descriptions are editable; these are prompts, not rules. */
export const WORKFLOW_PRESETS: { name: string; description: string }[] = [
  { name: "feature-development", description: "End-to-end AI-assisted feature work, from spec to PR" },
  { name: "code-review", description: "AI-assisted PR review and pre-landing checks" },
  { name: "debugging", description: "Reproduce, isolate, and fix defects with AI assistance" },
  { name: "refactoring", description: "Structural changes with AI-generated test coverage" },
  { name: "documentation", description: "Keep docs in sync with what actually shipped" },
  { name: "research", description: "Explore unfamiliar codebases and evaluate approaches" },
];

/** Common instructions files, offered as one-click additions. */
export const INSTRUCTIONS_PRESETS: { name: string; source: string; appliesToTool?: string }[] = [
  { name: "claude", source: "./CLAUDE.md", appliesToTool: "claude-code" },
  { name: "agents", source: "./AGENTS.md" },
  { name: "cursor", source: "./.cursorrules", appliesToTool: "cursor" },
  { name: "copilot", source: "./.github/copilot-instructions.md", appliesToTool: "github-copilot" },
];

export function toolByName(name: string): CatalogEntry | undefined {
  return TOOL_CATALOG.find((t) => t.name === name);
}

export function modelByName(name: string): CatalogEntry | undefined {
  return MODEL_CATALOG.find((m) => m.name === name);
}

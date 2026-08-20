// Persistence for claimed namespaces.
//
// SPEC.md § Registry defines a namespace as [a-z0-9][a-z0-9-]* and says
// `registry:acme` resolves to namespace `acme`. Claiming latest.dev/@acme is
// therefore the same act as claiming the registry namespace — this store is the
// registry's first real implementation, minus the publishing protocol and
// governance the spec explicitly defers.
//
// Two drivers:
//   - redis: Upstash. SET NX makes a claim atomic, so a race between two people
//     picking the same name has exactly one winner.
//   - fs:    local JSON files, for development without provisioning anything.
//
// The driver is chosen by whether Upstash env vars are present.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface ProfileRecord {
  slug: string;
  /** HCL2 native source as submitted. */
  hcl: string;
  scope: string;
  /** Display name from the profile block, when the file has one. */
  title?: string;
  createdAt: string;
  updatedAt: string;
  /** SHA-256 of the edit token. The raw token is shown to the claimer once. */
  tokenHash: string;
}

export type ClaimResult =
  | { ok: true; record: ProfileRecord; editToken: string }
  | { ok: false; reason: "taken" | "reserved" | "invalid-slug" };

export type UpdateResult =
  | { ok: true; record: ProfileRecord }
  | { ok: false; reason: "not-found" | "forbidden" };

/** Namespace grammar from SPEC.md § Registry URI Grammar. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
export const SLUG_MIN = 2;
export const SLUG_MAX = 32;

/**
 * Names the app itself needs, plus a few kept back so the registry can grow
 * without breaking someone's claimed URL later.
 */
export const RESERVED_SLUGS = new Set([
  "about", "admin", "api", "app", "auth", "blog", "changelog", "dashboard",
  "docs", "examples", "explore", "faq", "favicon", "health", "help", "index",
  "latest", "latestfile", "legal", "login", "logout", "new", "org", "pricing",
  "privacy", "profile", "public", "registry", "robots", "schema", "schemas",
  "search", "settings", "signup", "sitemap", "spec", "static", "status",
  "support", "team", "terms", "test", "validate", "www", "_next",
]);

export function slugProblem(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `Names must be at least ${SLUG_MIN} characters.`;
  if (slug.length > SLUG_MAX) return `Names must be at most ${SLUG_MAX} characters.`;
  if (!SLUG_RE.test(slug)) {
    return "Names use lowercase letters, digits and hyphens, and must start with a letter or digit.";
  }
  if (slug.endsWith("-")) return "Names cannot end with a hyphen.";
  if (slug.includes("--")) return "Names cannot contain two hyphens in a row.";
  if (RESERVED_SLUGS.has(slug)) return "That name is reserved.";
  return null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Driver {
  name: string;
  /** Returns false when the key already exists. Must be atomic. */
  setIfAbsent(key: string, value: string): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  incr(key: string): Promise<number>;
  /** Most recently claimed slugs, newest first. */
  recent(limit: number): Promise<string[]>;
  pushRecent(slug: string): Promise<void>;
}

// ---------------------------------------------------------------- redis driver

/**
 * Upstash credentials arrive under two different names depending on how the
 * store was provisioned: UPSTASH_REDIS_REST_* when you configure it by hand,
 * KV_REST_API_* when the Vercel Marketplace integration provisions it. Support
 * both rather than depending on Redis.fromEnv(), which only knows the first.
 */
function upstashCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function redisDriver(): Driver {
  // Imported lazily so local development never needs the env vars.
  const load = async () => {
    const { Redis } = await import("@upstash/redis");
    const creds = upstashCredentials();
    if (!creds) throw new Error("Upstash credentials are not configured");
    return new Redis({ url: creds.url, token: creds.token });
  };
  return {
    name: "upstash-redis",
    async setIfAbsent(key, value) {
      const redis = await load();
      const res = await redis.set(key, value, { nx: true });
      return res === "OK";
    },
    async get(key) {
      const redis = await load();
      const v = await redis.get<string>(key);
      // Upstash deserializes JSON strings; normalise back to a string.
      return v == null ? null : typeof v === "string" ? v : JSON.stringify(v);
    },
    async set(key, value) {
      const redis = await load();
      await redis.set(key, value);
    },
    async incr(key) {
      const redis = await load();
      return await redis.incr(key);
    },
    async recent(limit) {
      const redis = await load();
      return (await redis.lrange<string>("recent", 0, limit - 1)) ?? [];
    },
    async pushRecent(slug) {
      const redis = await load();
      await redis.lpush("recent", slug);
      await redis.ltrim("recent", 0, 199);
    },
  };
}

// ------------------------------------------------------------------- fs driver

function fsDriver(): Driver {
  const dir = process.env.LATESTFILE_STORE_DIR || ".latestfile-store";
  const ready = (async () => {
    const fs = await import("node:fs/promises");
    await fs.mkdir(dir, { recursive: true });
    return fs;
  })();
  const file = async (key: string) => {
    const path = await import("node:path");
    return path.join(dir, encodeURIComponent(key) + ".json");
  };

  return {
    name: "filesystem",
    async setIfAbsent(key, value) {
      const fs = await ready;
      try {
        // wx fails if the file exists, which is the atomicity we need locally.
        await fs.writeFile(await file(key), value, { flag: "wx" });
        return true;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw e;
      }
    },
    async get(key) {
      const fs = await ready;
      try {
        return await fs.readFile(await file(key), "utf8");
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async set(key, value) {
      const fs = await ready;
      await fs.writeFile(await file(key), value);
    },
    async incr(key) {
      const fs = await ready;
      const cur = Number((await this.get(key)) ?? "0");
      const next = cur + 1;
      await fs.writeFile(await file(key), String(next));
      return next;
    },
    async recent(limit) {
      const raw = await this.get("recent");
      const list: string[] = raw ? JSON.parse(raw) : [];
      return list.slice(0, limit);
    },
    async pushRecent(slug) {
      const raw = await this.get("recent");
      const list: string[] = raw ? JSON.parse(raw) : [];
      await this.set("recent", JSON.stringify([slug, ...list.filter((s) => s !== slug)].slice(0, 200)));
    },
  };
}

let cached: Driver | null = null;

export function driver(): Driver {
  if (cached) return cached;
  cached = upstashCredentials() ? redisDriver() : fsDriver();
  return cached;
}

export function driverName(): string {
  return driver().name;
}

const profileKey = (slug: string) => `profile:${slug}`;
const viewsKey = (slug: string) => `views:${slug}`;

export async function claimProfile(input: {
  slug: string;
  hcl: string;
  scope: string;
  title?: string;
}): Promise<ClaimResult> {
  const problem = slugProblem(input.slug);
  if (problem) {
    return { ok: false, reason: RESERVED_SLUGS.has(input.slug) ? "reserved" : "invalid-slug" };
  }

  const editToken = randomBytes(24).toString("base64url");
  const now = new Date().toISOString();
  const record: ProfileRecord = {
    slug: input.slug,
    hcl: input.hcl,
    scope: input.scope,
    title: input.title,
    createdAt: now,
    updatedAt: now,
    tokenHash: hashToken(editToken),
  };

  const won = await driver().setIfAbsent(profileKey(input.slug), JSON.stringify(record));
  if (!won) return { ok: false, reason: "taken" };

  await driver().pushRecent(input.slug);
  return { ok: true, record, editToken };
}

export async function getProfile(slug: string): Promise<ProfileRecord | null> {
  if (slugProblem(slug)) return null;
  const raw = await driver().get(profileKey(slug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfileRecord;
  } catch {
    return null;
  }
}

export async function updateProfile(input: {
  slug: string;
  hcl: string;
  scope: string;
  title?: string;
  editToken: string;
}): Promise<UpdateResult> {
  const existing = await getProfile(input.slug);
  if (!existing) return { ok: false, reason: "not-found" };
  if (!input.editToken || !tokenMatches(input.editToken, existing.tokenHash)) {
    return { ok: false, reason: "forbidden" };
  }
  const record: ProfileRecord = {
    ...existing,
    hcl: input.hcl,
    scope: input.scope,
    title: input.title,
    updatedAt: new Date().toISOString(),
  };
  await driver().set(profileKey(input.slug), JSON.stringify(record));
  return { ok: true, record };
}

export async function isAvailable(slug: string): Promise<boolean> {
  if (slugProblem(slug)) return false;
  return (await driver().get(profileKey(slug))) === null;
}

export async function bumpViews(slug: string): Promise<number> {
  try {
    return await driver().incr(viewsKey(slug));
  } catch {
    return 0;
  }
}

export async function getViews(slug: string): Promise<number> {
  const raw = await driver().get(viewsKey(slug));
  return raw ? Number(raw) || 0 : 0;
}

export async function recentProfiles(limit = 12): Promise<string[]> {
  try {
    return await driver().recent(limit);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- feedback

export interface FeedbackRecord {
  id: string;
  message: string;
  /** Optional — the form does not require it. */
  name?: string;
  email?: string;
  /** Where the submission came from, e.g. "/@james" or "suggest:cursor". */
  context?: string;
  createdAt: string;
}

const FEEDBACK_LIST = "feedback:list";

export async function addFeedback(input: {
  message: string;
  name?: string;
  email?: string;
  context?: string;
}): Promise<FeedbackRecord> {
  const record: FeedbackRecord = {
    id: randomBytes(8).toString("hex"),
    message: input.message,
    name: input.name || undefined,
    email: input.email || undefined,
    context: input.context || undefined,
    createdAt: new Date().toISOString(),
  };
  await driver().set(`feedback:${record.id}`, JSON.stringify(record));
  const raw = await driver().get(FEEDBACK_LIST);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  await driver().set(FEEDBACK_LIST, JSON.stringify([record.id, ...ids].slice(0, 1000)));
  return record;
}

export async function listFeedback(limit = 200): Promise<FeedbackRecord[]> {
  const raw = await driver().get(FEEDBACK_LIST);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  const out: FeedbackRecord[] = [];
  for (const id of ids.slice(0, limit)) {
    const r = await driver().get(`feedback:${id}`);
    if (r) {
      try {
        out.push(JSON.parse(r) as FeedbackRecord);
      } catch {
        /* skip unreadable record */
      }
    }
  }
  return out;
}

// 9-pattern config username generator (per-server setting, with collision fallback).
import { api } from "./api.js";

export const NAMING_PATTERNS = [
  { value: "tg_user_random", label: "نام کاربری + حروف و عدد رندم" },
  { value: "numeric_random", label: "آیدی عددی + حروف و عدد رندم" },
  { value: "tg_custom_random", label: "نام کاربری + دلخواه + عدد رندم" },
  { value: "custom_random", label: "متن دلخواه + عدد رندم" },
  { value: "custom_sequential", label: "متن دلخواه + عدد ترتیبی" },
  { value: "tg_sequential", label: "نام کاربری + عدد ترتیبی" },
  { value: "coworker_custom_seq", label: "متن دلخواه همکار + عدد ترتیبی" },
  { value: "coworker_numeric_seq", label: "آیدی عددی همکار + عدد ترتیبی" },
  { value: "custom_choice", label: "نام کاربری دلخواه (انتخاب مشتری)" },
];

export const patternLabel = (v) => (NAMING_PATTERNS.find((n) => n.value === v) || {}).label || v;

const rand = (n) => Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, n) || "0";

async function nextSeq(panel) {
  try {
    const v = await api("settings/inc", { key: `naming.seq.${panel.id}` });
    return String(v).padStart(3, "0");
  } catch {
    return String(Date.now()).slice(-5);
  }
}

/**
 * Generate the panel username for a new subscription.
 * Returns null for "custom_choice" — the customer types their own username.
 * Collision handling: if the panel reports the name exists, deliver.js appends a random number.
 * Users without a Telegram username fall back to the word "user".
 */
export async function generateUsername(panel, tg = {}) {
  const pattern = panel.naming_pattern || "tg_user_random";
  if (pattern === "custom_choice") return null;

  const tgName = String(tg.username || "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) || "user";
  const custom = String(panel.custom_text || "shop").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) || "shop";

  switch (pattern) {
    case "numeric_random": return `${tg.id}${rand(4)}`;
    case "tg_custom_random": return `${tgName}_${custom}_${rand(4)}`;
    case "custom_random": return `${custom}${rand(5)}`;
    case "custom_sequential": return `${custom}${await nextSeq(panel)}`;
    case "tg_sequential": return `${tgName}${await nextSeq(panel)}`;
    case "coworker_custom_seq": return `${custom}x${await nextSeq(panel)}`;
    case "coworker_numeric_seq": return `x${tg.id}${await nextSeq(panel)}`;
    case "tg_user_random":
    default: return `${tgName}_${rand(5)}`;
  }
}

export const fallbackUsername = () => `user${String(Date.now()).slice(-8)}`;
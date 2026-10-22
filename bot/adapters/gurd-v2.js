// Gurd v2 adapter — Solid Layer Management API (token auth).
import axios from "axios";

const timeout = 15000;

async function req(panel, method, path, body) {
  const base = String(panel.url || "").replace(/\/+$/, "");
  const { data } = await axios({
    method,
    url: `${base}/api/${path}`,
    data: body,
    headers: { Authorization: `Bearer ${panel.token || ""}` },
    timeout,
  });
  return data;
}

export default {
  name: "Gurd v2",

  async test(panel) {
    await req(panel, "GET", "subscriptions/stats");
    return "اتصال به Gurd v2 برقرار است ✅";
  },

  async createSub(panel, { username, volumeGb = 0, durationDays = 0 }) {
    const d = await req(panel, "POST", "subscriptions", {
      username,
      volume_gb: volumeGb,
      duration_days: durationDays,
    });
    return {
      configUrl: d.config_url || d.config || "",
      subscriptionUrl: d.subscription_url || d.url || "",
      username,
    };
  },

  async extendSub(panel, { username, addDays = 0, addGb = 0 }) {
    const d = await req(panel, "POST", `subscriptions/${encodeURIComponent(username)}/extend`, {
      add_days: addDays,
      add_gb: addGb,
    });
    return { ok: true, expireDate: d.expire_date || d.expireDate || "" };
  },

  async getUsage(panel, { username }) {
    const d = await req(panel, "GET", `subscriptions/${encodeURIComponent(username)}/stats`);
    return {
      usedGb: d.used_gb ?? null,
      totalGb: d.volume_gb ?? null,
      expireDate: d.expire_date ?? null,
    };
  },
};
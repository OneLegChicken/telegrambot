// 3x-ui (MHSanaei) adapter — login + inbound/user API.
import axios from "axios";
import crypto from "crypto";

const timeout = 15000;

async function login(panel) {
  const base = String(panel.url || "").replace(/\/+$/, "");
  const { data, headers } = await axios.post(
    `${base}/login`,
    new URLSearchParams({ username: panel.username || "", password: panel.password || "" }),
    { timeout }
  );
  const cookie = (headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");
  if (!data?.success) throw new Error(data?.msg || "ورود به پنل 3x-ui ناموفق بود");
  return { base, cookie };
}

async function listInbounds(s) {
  const { data } = await axios.get(`${s.base}/panel/api/inbounds/list`, {
    headers: { Cookie: s.cookie }, timeout,
  });
  return data?.obj || [];
}

function configLink(base, inbound, clientId) {
  try {
    const u = new URL(base);
    const stream = JSON.parse(inbound.streamSettings || "{}");
    const net = stream.network || "tcp";
    const sec = stream.security || "none";
    const sni = sec !== "none" ? (stream.tlsSettings?.serverName || stream.realitySettings?.serverName || "") : "";
    const remark = encodeURIComponent(inbound.remark || "salesgram");
    return `vless://${clientId}@${u.hostname}:${inbound.port}?type=${net}&security=${sec}${sni ? `&sni=${sni}` : ""}#${remark}`;
  } catch {
    return "";
  }
}

async function findClient(s, inboundId, email) {
  const { data } = await axios.get(`${s.base}/panel/api/inbounds/get/${inboundId}`, {
    headers: { Cookie: s.cookie }, timeout,
  });
  const inbound = data?.obj;
  const clients = JSON.parse(inbound?.settings || "{}").clients || [];
  return { inbound, client: clients.find((c) => c.email === email) };
}

export default {
  name: "3x-ui",

  async listInbounds(panel) {
    const s = await login(panel);
    return listInbounds(s);
  },

  async test(panel) {
    const s = await login(panel);
    const inbounds = await listInbounds(s);
    return `اتصال به 3x-ui برقرار است ✅ — ${inbounds.length} inbound یافت شد`;
  },

  async createSub(panel, { username, volumeGb = 0, durationDays = 0 }) {
    const s = await login(panel);
    const inboundId = panel.inbound_id || "";
    const inbounds = await listInbounds(s);
    const inbound = inbounds.find((i) => String(i.id) === String(inboundId)) || inbounds[0];
    if (!inbound) throw new Error("هیچ Inboundی در پنل یافت نشد");
    const clientId = crypto.randomUUID();
    const totalBytes = volumeGb > 0 ? volumeGb * 1024 ** 3 : 0;
    const expiry = durationDays > 0 ? Date.now() + durationDays * 86400000 : 0;
    const { data } = await axios.post(
      `${s.base}/panel/api/inbounds/addClient`,
      {
        id: Number(inbound.id),
        settings: JSON.stringify({
          clients: [{ id: clientId, email: username, limitIp: 0, totalGB: totalBytes, expiryTime: expiry, enable: true, flow: inbound.streamSettings?.includes("reality") ? "xtls-rprx-vision" : "" }],
        }),
      },
      { headers: { Cookie: s.cookie, "Content-Type": "application/json" }, timeout }
    );
    if (!data?.success) throw new Error(data?.msg || "ساخت اشتراک در پنل ناموفق بود");
    return {
      configUrl: configLink(s.base, inbound, clientId),
      subscriptionUrl: `${s.base}/sub/${clientId}`,
      username,
    };
  },

  async extendSub(panel, { username, addDays = 0, addGb = 0 }) {
    const s = await login(panel);
    const { inbound, client } = await findClient(s, panel.inbound_id, username);
    if (!client) throw new Error("این نام کاربری در پنل یافت نشد");
    const newExpiry = addDays > 0 ? (client.expiryTime > 0 ? client.expiryTime : Date.now()) + addDays * 86400000 : client.expiryTime;
    const newTotal = addGb > 0 ? (client.totalGB || 0) + addGb * 1024 ** 3 : client.totalGB;
    const { data } = await axios.post(
      `${s.base}/panel/api/inbounds/updateClient`,
      {
        id: Number(inbound.id),
        clientId: client.id,
        settings: JSON.stringify({ clients: [{ ...client, expiryTime: newExpiry, totalGB: newTotal }] }),
      },
      { headers: { Cookie: s.cookie, "Content-Type": "application/json" }, timeout }
    );
    if (!data?.success) throw new Error(data?.msg || "تمدید در پنل ناموفق بود");
    return { ok: true, expireDate: newExpiry > 0 ? new Date(newExpiry).toISOString() : "" };
  },

  async getUsage(panel, { username }) {
    const s = await login(panel);
    const { data } = await axios.get(`${s.base}/panel/api/inbounds/getClientTraffic/${encodeURIComponent(username)}`, {
      headers: { Cookie: s.cookie }, timeout,
    });
    const o = data?.obj;
    if (!o) return { usedGb: null, totalGb: null, expireDate: null };
    return {
      usedGb: o.total ? Number(((o.up + o.down) / 1024 ** 3).toFixed(2)) : null,
      totalGb: o.total ? Number((o.total / 1024 ** 3).toFixed(2)) : null,
      expireDate: o.expiryTime > 0 ? new Date(o.expiryTime).toISOString() : null,
    };
  },
};
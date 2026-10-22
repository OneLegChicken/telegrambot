// Simple in-memory conversation state, per chat id.
const states = new Map();

export const setState = (chatId, flow, data = {}) => states.set(String(chatId), { flow, data });
export const getState = (chatId) => states.get(String(chatId));
export const clearState = (chatId) => states.delete(String(chatId));
export const patchState = (chatId, patch) => {
  const s = states.get(String(chatId));
  if (s) Object.assign(s.data, patch);
  return s;
};
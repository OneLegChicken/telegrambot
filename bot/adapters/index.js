// PanelAdapter factory — add a new panel type here and every flow picks it up.
import threeXui from "./three-xui.js";
import gurdV2 from "./gurd-v2.js";

const ADAPTERS = {
  "3xui": threeXui,
  gurdv2: gurdV2,
};

export const getAdapter = (panel) => ADAPTERS[panel?.type] || null;
export const listAdapters = () => Object.entries(ADAPTERS).map(([id, a]) => ({ id, name: a.name }));
// Preload runs in an isolated context. Expose only what the renderer needs.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("intelAir", {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});

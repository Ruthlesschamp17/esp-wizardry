const { app, BrowserWindow, Menu, shell, globalShortcut } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

// Surface renderer crashes to the terminal / log file instead of freezing silently.
process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException:", err);
});

function buildMenu(win) {
  const template = [
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "CmdOrCtrl+R" },
        { role: "forceReload", accelerator: "CmdOrCtrl+Shift+R" },
        {
          label: "Toggle Developer Tools",
          accelerator: process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
          click: () => win.webContents.toggleDevTools(),
        },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0b0f14",
    show: false,
    title: "Intel Air ESP Pro",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox:true breaks some Radix/portal timings in packaged apps; keep off.
      sandbox: false,
      spellcheck: false,
      // Allow devtools in production too — this is a desktop engineering tool.
      devTools: true,
      webSecurity: true,
    },
  });

  buildMenu(win);

  // External links open in the OS browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Any renderer-initiated navigation to a non-file URL should open externally.
  // This also prevents accidental full-page navigations (e.g. <a href="/">)
  // from replacing the app with a blank file:// page and appearing to "freeze".
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] render-process-gone:", details);
  });
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[main] did-fail-load:", code, desc, url);
  });

  const indexPath = path.join(__dirname, "..", "dist-electron", "renderer", "electron.html");
  win.loadFile(indexPath).catch((err) => console.error("[main] loadFile failed:", err));

  win.once("ready-to-show", () => win.show());

  if (isDev) win.webContents.openDevTools({ mode: "detach" });

  // Belt-and-braces: also register a global shortcut so DevTools open even if
  // the app menu is hidden or focus is inside a native control.
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) focused.webContents.toggleDevTools();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

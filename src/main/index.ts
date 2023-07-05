import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { store } from "./store";

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  const handleUrlOpen = (e, url) => {
    if (url.match(/^http/)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  };
  mainWindow.webContents.on("will-navigate", handleUrlOpen);

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("getKeys", (e) => {
  e.sender.send("keys", store.get("keys") || []);
});
ipcMain.on("addKey", (e, value: { key: string; site: string }) => {
  console.log("addKey", value);
  store.set("keys", (store.get("keys") || []).concat(value));
  e.sender.send("keys", store.get("keys") || []);
});
ipcMain.on("removeKey", (e, value: { key: string }) => {
  const keys = store.get("keys") || [];
  const targetIndex = keys.findIndex((key) => key.key === value.key);
  keys.splice(targetIndex, 1);
  store.set("keys", keys);
  e.sender.send("keys", store.get("keys") || []);
});
ipcMain.on("enableKey", (e, value: { key: string }) => {
  const keys = store.get("keys") || [];
  const targetIndex = keys.findIndex((key) => key.key === value.key);
  keys.splice(targetIndex, 1, { ...keys[targetIndex], enabled: undefined });
  store.set("keys", keys);
  e.sender.send("keys", store.get("keys") || []);
});
ipcMain.on("disableKey", (e, value: { key: string }) => {
  const keys = store.get("keys") || [];
  const targetIndex = keys.findIndex((key) => key.key === value.key);
  keys.splice(targetIndex, 1, { ...keys[targetIndex], enabled: false });
  store.set("keys", keys);
  e.sender.send("keys", store.get("keys") || []);
});

import * as Misskey from "../../misskey/packages/misskey-js/src";
import { FollowingsMap } from "../preload/FollowingsMap";
const limit = 50;
ipcMain.on("fetchFollowings", async (e) => {
  const keys = store.get("keys") || [];
  await Promise.all(
    keys
      .filter((key) => key.enabled !== false)
      .map(async (key) => {
        try {
          const cli = new Misskey.api.APIClient({ origin: key.site, credential: key.key });
          const instance = await cli.request("federation/show-instance", {
            host: new URL(key.site).hostname,
          });
          const user = await cli.request("i");
          const followings: Misskey.entities.FollowingFolloweePopulated[] = [];
          let untilId: string | undefined = undefined;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const followingsPart = await cli.request("users/following", {
              userId: user.id,
              limit,
              untilId,
            });
            followings.push(...followingsPart);
            if (followingsPart.length === 0) break;
            untilId = followingsPart[followingsPart.length - 1].id;
          }

          const map: FollowingsMap = { [key.key]: { followings, user, instance } };
          e.sender.send("followings", map);
        } catch (error) {
          e.sender.send("followings", { [key.key]: undefined }, (error as Error).message);
        }
      }),
  );
});

ipcMain.on("follow", async (e, value: { key: string; username: string; host: string }) => {
  const keys = store.get("keys") || [];
  const targetKey = keys.find((key) => key.key === value.key);
  if (!targetKey) return;
  const cli = new Misskey.api.APIClient({ origin: targetKey.site, credential: targetKey.key });
  try {
    const { id } = await cli.request("users/show", { host: value.host, username: value.username });
    await cli.request("following/create", { userId: id });
    e.sender.send("followed", value);
  } catch (error) {
    e.sender.send("followed", value, (error as Error).message);
  }
});

ipcMain.on("unfollow", async (e, value: { key: string; username: string; host: string }) => {
  const keys = store.get("keys") || [];
  const targetKey = keys.find((key) => key.key === value.key);
  if (!targetKey) return;
  const cli = new Misskey.api.APIClient({ origin: targetKey.site, credential: targetKey.key });
  try {
    const { id } = await cli.request("users/show", { host: value.host, username: value.username });
    await cli.request("following/delete", { userId: id });
    e.sender.send("unfollowed", value);
  } catch (error) {
    e.sender.send("unfollowed", value, (error as Error).message);
  }
});

import * as Electron from "electron";

Electron.app.whenReady().then(async () => {
  const window = new Electron.BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
    },
  });

  window.setMenu(null);

  Electron.ipcMain.handle("open-file", () => {
    return Electron.dialog.showSaveDialogSync(window, {
      title: "Open or Create File",
      buttonLabel: "Open",
    });
  });

  // [TODO] We need to do build/whatever only when using electron-builder for
  // some reason. Idk, maybe we should just add a hack to detect when we're
  // being run inside builder, and then use this then?
  window.loadFile("build/index.html");
});

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 720,
    height: 640,
    minWidth: 660,
    minHeight: 560,
    frame: false,
    hasShadow: true,
    thickFrame: false,
    backgroundColor: '#060606',
    icon: path.join(__dirname, 'icon.ico'),
    title: 'KiCaps',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('KiCaps.html');
  win.setMenuBarVisibility(false);
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(
      'document.documentElement.classList.add("electron-app")'
    );
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('win-minimize', () => win && win.minimize());
ipcMain.on('win-maximize', () => win && (win.isMaximized() ? win.unmaximize() : win.maximize()));
ipcMain.on('win-close',    () => win && win.close());

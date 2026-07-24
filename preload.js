const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('win-minimize'),
  maximize: () => ipcRenderer.send('win-maximize'),
  close:    () => ipcRenderer.send('win-close'),
  getVersion:   () => ipcRenderer.invoke('app-version'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
});

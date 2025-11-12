const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const uploadHandler = require('./src/upload-handler');
const channelsManager = require('./src/channels-manager');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('pages/index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('select-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-credentials', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-channels', async () => {
  return await channelsManager.getChannels();
});

ipcMain.handle('add-channel', async (event, credentialsPath) => {
  return await channelsManager.addChannel(credentialsPath);
});

ipcMain.handle('remove-channel', async (event, channelId) => {
  return await channelsManager.removeChannel(channelId);
});

ipcMain.handle('refresh-channel-data', async (event, channelId) => {
  return await channelsManager.refreshChannelData(channelId);
});

ipcMain.handle('complete-channel-auth', async (event, channelId) => {
  return await channelsManager.completeChannelAuth(channelId);
});

ipcMain.handle('upload-video', async (event, uploadData) => {
  return await uploadHandler.uploadVideo(uploadData, (progress) => {
    mainWindow.webContents.send('upload-progress', progress);
  });
});

ipcMain.handle('navigate', (event, page) => {
  mainWindow.loadFile(`pages/${page}.html`);
});

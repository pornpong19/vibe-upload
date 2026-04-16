const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const uploadHandler = require('./src/upload-handler');
const channelsManager = require('./src/channels-manager');
const presetManager = require('./src/preset-manager');
const uploadHistory = require('./src/upload-history');
const aiTitleGenerator = require('./src/ai-title-generator');

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

ipcMain.handle('select-multiple-videos', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
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

ipcMain.handle('add-channel-with-code', async (event, credentialsPath, authCode) => {
  return await channelsManager.addChannelWithCode(credentialsPath, authCode);
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

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// Preset handlers
ipcMain.handle('get-presets', async () => {
  return await presetManager.getPresets();
});

ipcMain.handle('add-preset', async (event, presetData) => {
  return await presetManager.addPreset(presetData);
});

ipcMain.handle('update-preset', async (event, presetId, presetData) => {
  return await presetManager.updatePreset(presetId, presetData);
});

ipcMain.handle('delete-preset', async (event, presetId) => {
  return await presetManager.deletePreset(presetId);
});

ipcMain.handle('get-preset', async (event, presetId) => {
  return await presetManager.getPreset(presetId);
});

ipcMain.handle('export-presets', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Presets',
    defaultPath: `presets-${new Date().toISOString().split('T')[0]}.json`,
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    return await presetManager.exportPresets(result.filePath);
  }
  return { success: false, message: 'ยกเลิกการ Export' };
});

ipcMain.handle('import-presets', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Presets',
    properties: ['openFile'],
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return await presetManager.importPresets(result.filePaths[0], options);
  }
  return { success: false, message: 'ยกเลิกการ Import' };
});

// Upload history handlers
ipcMain.handle('get-latest-uploads', async () => {
  return await uploadHistory.getLatestUploadPerChannel();
});

ipcMain.handle('get-upload-history', async () => {
  return await uploadHistory.getUploadHistory();
});

ipcMain.handle('get-channel-history', async (event, channelId) => {
  return await uploadHistory.getChannelHistory(channelId);
});

ipcMain.handle('clear-upload-history', async () => {
  return await uploadHistory.clearHistory();
});

ipcMain.handle('delete-upload-history-item', async (event, id) => {
  return await uploadHistory.deleteHistoryEntry(id);
});

// AI Title Generator handlers
ipcMain.handle('generate-ai-titles', async (event, apiKey, topic, videoInfos, volEpType, position, languages, requiredWords) => {
  try {
    const titles = await aiTitleGenerator.generateTitles(apiKey, topic, videoInfos, volEpType, position, languages, requiredWords);
    return { success: true, titles };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('save-gemini-api-key', async (event, apiKey) => {
  try {
    await aiTitleGenerator.saveApiKey(apiKey);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-gemini-api-key', async () => {
  try {
    const apiKey = await aiTitleGenerator.getApiKey();
    return { success: true, apiKey };
  } catch (error) {
    return { success: false, apiKey: '' };
  }
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  selectCredentials: () => ipcRenderer.invoke('select-credentials'),
  getChannels: () => ipcRenderer.invoke('get-channels'),
  addChannel: (credentialsPath) => ipcRenderer.invoke('add-channel', credentialsPath),
  removeChannel: (channelId) => ipcRenderer.invoke('remove-channel', channelId),
  refreshChannelData: (channelId) => ipcRenderer.invoke('refresh-channel-data', channelId),
  completeChannelAuth: (channelId) => ipcRenderer.invoke('complete-channel-auth', channelId),
  uploadVideo: (uploadData) => ipcRenderer.invoke('upload-video', uploadData),
  navigate: (page) => ipcRenderer.invoke('navigate', page),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onUploadProgress: (callback) => {
    ipcRenderer.on('upload-progress', (event, progress) => callback(progress));
  },
  // Preset APIs
  getPresets: () => ipcRenderer.invoke('get-presets'),
  addPreset: (presetData) => ipcRenderer.invoke('add-preset', presetData),
  updatePreset: (presetId, presetData) => ipcRenderer.invoke('update-preset', presetId, presetData),
  deletePreset: (presetId) => ipcRenderer.invoke('delete-preset', presetId),
  getPreset: (presetId) => ipcRenderer.invoke('get-preset', presetId)
});

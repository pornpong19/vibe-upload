const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

// Path to store upload history
const HISTORY_FILE = path.join(app.getPath('userData'), 'upload-history.json');

// Get all upload history
async function getUploadHistory() {
    try {
        const data = await fs.readFile(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Save upload history
async function saveUploadHistory(history) {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Record a successful upload
async function recordUpload(channelId, channelName, videoTitle, videoUrl, scheduledTime) {
    const history = await getUploadHistory();

    history.push({
        id: Date.now().toString(),
        channelId,
        channelName,
        videoTitle,
        videoUrl,
        scheduledTime: scheduledTime || null,
        uploadedAt: new Date().toISOString()
    });

    await saveUploadHistory(history);
    return { success: true };
}

// Get latest upload time per channel (only successful uploads)
async function getLatestUploadPerChannel() {
    const history = await getUploadHistory();

    // Group by channelId and find the latest upload for each
    const latestPerChannel = {};

    history.forEach(entry => {
        if (!latestPerChannel[entry.channelId] ||
            new Date(entry.uploadedAt) > new Date(latestPerChannel[entry.channelId].uploadedAt)) {
            latestPerChannel[entry.channelId] = entry;
        }
    });

    return Object.values(latestPerChannel);
}

// Get all upload history for a specific channel
async function getChannelHistory(channelId) {
    const history = await getUploadHistory();
    return history
        .filter(entry => entry.channelId === channelId)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

// Clear all history
async function clearHistory() {
    await saveUploadHistory([]);
    return { success: true, message: 'ล้างประวัติสำเร็จ' };
}

module.exports = {
    getUploadHistory,
    recordUpload,
    getLatestUploadPerChannel,
    getChannelHistory,
    clearHistory
};

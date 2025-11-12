const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

// Get presets directory path
function getPresetsDir() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'presets');
}

// Get presets file path
function getPresetsFilePath() {
  return path.join(getPresetsDir(), 'presets.json');
}

// Ensure presets directory exists
async function ensurePresetsDir() {
  const presetsDir = getPresetsDir();
  try {
    await fs.access(presetsDir);
  } catch (error) {
    await fs.mkdir(presetsDir, { recursive: true });
  }
}

// Load all presets
async function loadPresets() {
  await ensurePresetsDir();
  const presetsFile = getPresetsFilePath();

  try {
    const data = await fs.readFile(presetsFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

// Save all presets
async function savePresets(presets) {
  await ensurePresetsDir();
  const presetsFile = getPresetsFilePath();
  await fs.writeFile(presetsFile, JSON.stringify(presets, null, 2), 'utf-8');
}

// Get all presets
async function getPresets() {
  return await loadPresets();
}

// Add a new preset
async function addPreset(presetData) {
  const presets = await loadPresets();

  // Check if preset name already exists
  const existingIndex = presets.findIndex(p => p.name === presetData.name);

  if (existingIndex !== -1) {
    return {
      success: false,
      message: 'มีชื่อพรีเซ็ตนี้อยู่แล้ว กรุณาใช้ชื่ออื่น'
    };
  }

  // Add new preset
  const newPreset = {
    id: Date.now().toString(),
    name: presetData.name,
    description: presetData.description || '',
    tags: presetData.tags || [],
    categoryId: presetData.categoryId || '1',
    privacyStatus: presetData.privacyStatus || 'public',
    createdAt: new Date().toISOString()
  };

  presets.push(newPreset);
  await savePresets(presets);

  return {
    success: true,
    message: 'บันทึกพรีเซ็ตสำเร็จ',
    preset: newPreset
  };
}

// Update an existing preset
async function updatePreset(presetId, presetData) {
  const presets = await loadPresets();
  const index = presets.findIndex(p => p.id === presetId);

  if (index === -1) {
    return {
      success: false,
      message: 'ไม่พบพรีเซ็ตนี้'
    };
  }

  // Update preset
  presets[index] = {
    ...presets[index],
    name: presetData.name,
    description: presetData.description || '',
    tags: presetData.tags || [],
    categoryId: presetData.categoryId || '1',
    privacyStatus: presetData.privacyStatus || 'public',
    updatedAt: new Date().toISOString()
  };

  await savePresets(presets);

  return {
    success: true,
    message: 'อัพเดทพรีเซ็ตสำเร็จ',
    preset: presets[index]
  };
}

// Delete a preset
async function deletePreset(presetId) {
  const presets = await loadPresets();
  const index = presets.findIndex(p => p.id === presetId);

  if (index === -1) {
    return {
      success: false,
      message: 'ไม่พบพรีเซ็ตนี้'
    };
  }

  presets.splice(index, 1);
  await savePresets(presets);

  return {
    success: true,
    message: 'ลบพรีเซ็ตสำเร็จ'
  };
}

// Get a specific preset
async function getPreset(presetId) {
  const presets = await loadPresets();
  const preset = presets.find(p => p.id === presetId);

  if (!preset) {
    return {
      success: false,
      message: 'ไม่พบพรีเซ็ตนี้'
    };
  }

  return {
    success: true,
    preset
  };
}

module.exports = {
  getPresets,
  addPreset,
  updatePreset,
  deletePreset,
  getPreset
};

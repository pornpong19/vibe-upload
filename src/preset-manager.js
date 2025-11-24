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
    title: presetData.title || '',
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
    title: presetData.title || '',
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

// Export presets to a file
async function exportPresets(exportPath) {
  try {
    const presets = await loadPresets();

    if (presets.length === 0) {
      return {
        success: false,
        message: 'ไม่มีพรีเซ็ตให้ Export'
      };
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      presets: presets
    };

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

    return {
      success: true,
      message: `Export พรีเซ็ตสำเร็จ (${presets.length} รายการ)`,
      count: presets.length
    };
  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการ Export: ' + error.message
    };
  }
}

// Import presets from a file
async function importPresets(importPath, options = {}) {
  try {
    const data = await fs.readFile(importPath, 'utf-8');
    const importData = JSON.parse(data);

    // Validate import data structure
    if (!importData.presets || !Array.isArray(importData.presets)) {
      return {
        success: false,
        message: 'ไฟล์ไม่ถูกต้อง: ไม่พบข้อมูลพรีเซ็ต'
      };
    }

    const currentPresets = await loadPresets();
    const importedPresets = importData.presets;
    let addedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    const duplicates = [];

    for (const preset of importedPresets) {
      // Check if preset name already exists
      const existingIndex = currentPresets.findIndex(p => p.name === preset.name);

      if (existingIndex !== -1) {
        if (options.overwrite) {
          // Overwrite existing preset but keep the original ID
          currentPresets[existingIndex] = {
            ...preset,
            id: currentPresets[existingIndex].id,
            updatedAt: new Date().toISOString()
          };
          updatedCount++;
        } else if (options.rename) {
          // Add with a new name
          let newName = preset.name;
          let counter = 1;
          while (currentPresets.some(p => p.name === newName)) {
            newName = `${preset.name} (${counter})`;
            counter++;
          }
          currentPresets.push({
            ...preset,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: newName,
            importedAt: new Date().toISOString()
          });
          addedCount++;
        } else {
          // Skip duplicates
          duplicates.push(preset.name);
          skippedCount++;
        }
      } else {
        // Add new preset with new ID
        currentPresets.push({
          ...preset,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          importedAt: new Date().toISOString()
        });
        addedCount++;
      }
    }

    await savePresets(currentPresets);

    let message = `Import สำเร็จ: เพิ่ม ${addedCount} รายการ`;
    if (updatedCount > 0) {
      message += `, อัพเดท ${updatedCount} รายการ`;
    }
    if (skippedCount > 0) {
      message += `, ข้าม ${skippedCount} รายการ (ชื่อซ้ำ)`;
    }

    return {
      success: true,
      message,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      duplicates
    };
  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการ Import: ' + error.message
    };
  }
}

module.exports = {
  getPresets,
  addPreset,
  updatePreset,
  deletePreset,
  getPreset,
  exportPresets,
  importPresets
};

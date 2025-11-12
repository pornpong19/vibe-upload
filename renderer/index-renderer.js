// State
let selectedVideoPath = null;
let channels = [];
let tags = [];
let presets = [];
const MAX_TAGS_LENGTH = 500;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadChannels();
  await loadPresetsList();
  updateUploadButton();
  initTagsInput();
  initScheduleTimeOptions();
  initScheduleValidation();
});

// Navigate to channels page
function navigateToChannels() {
  window.electronAPI.navigate('channels');
}

// Initialize tags input
function initTagsInput() {
  const tagsInput = document.getElementById('videoTags');

  // Handle keydown events
  tagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagsInput.value.trim());
      tagsInput.value = '';
    } else if (e.key === 'Backspace' && tagsInput.value === '' && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags.length - 1);
    }
  });

  // Handle blur event (when input loses focus)
  tagsInput.addEventListener('blur', () => {
    if (tagsInput.value.trim()) {
      addTag(tagsInput.value.trim());
      tagsInput.value = '';
    }
  });

  // Handle comma input
  tagsInput.addEventListener('input', (e) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const tagValue = value.replace(',', '').trim();
      if (tagValue) {
        addTag(tagValue);
      }
      tagsInput.value = '';
    }
  });
}

// Add tag
function addTag(tagValue) {
  if (!tagValue) return;

  // Remove commas from tag value
  tagValue = tagValue.replace(/,/g, '').trim();

  // Check if tag already exists
  if (tags.includes(tagValue)) {
    return;
  }

  // Calculate total length
  const currentLength = tags.join(', ').length;
  const newLength = currentLength + (tags.length > 0 ? 2 : 0) + tagValue.length; // +2 for ', '

  // Check if adding this tag would exceed the limit
  if (newLength > MAX_TAGS_LENGTH) {
    showError(`ไม่สามารถเพิ่มแท็กได้ เนื่องจากจะเกินขีดจำกัด ${MAX_TAGS_LENGTH} ตัวอักษร`);
    return;
  }

  // Add tag
  tags.push(tagValue);
  renderTags();
  updateCharCounter();
}

// Remove tag
function removeTag(index) {
  tags.splice(index, 1);
  renderTags();
  updateCharCounter();
}

// Render tags as chips
function renderTags() {
  const tagsDisplay = document.getElementById('tagsDisplay');
  tagsDisplay.innerHTML = '';

  tags.forEach((tag, index) => {
    const chip = document.createElement('div');
    chip.className = 'tag-chip';
    chip.innerHTML = `
      <span>${tag}</span>
      <span class="tag-chip-remove" onclick="removeTag(${index})">×</span>
    `;
    tagsDisplay.appendChild(chip);
  });
}

// Update character counter
function updateCharCounter() {
  const counter = document.getElementById('tagsCharCounter');
  const tagsString = tags.join(', ');
  const length = tagsString.length;

  counter.textContent = `${length}/${MAX_TAGS_LENGTH}`;

  // Update counter style based on length
  counter.classList.remove('warning', 'danger');
  if (length > MAX_TAGS_LENGTH * 0.9) {
    counter.classList.add('danger');
  } else if (length > MAX_TAGS_LENGTH * 0.75) {
    counter.classList.add('warning');
  }
}

// Get tags as comma-separated string
function getTagsString() {
  return tags.join(', ');
}

// Initialize schedule time options (every 15 minutes)
function initScheduleTimeOptions() {
  const timeSelect = document.getElementById('scheduleTime');

  // Generate time options every 15 minutes
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      const timeValue = `${hourStr}:${minuteStr}`;

      const option = document.createElement('option');
      option.value = timeValue;
      option.textContent = timeValue;
      timeSelect.appendChild(option);
    }
  }

  // Set minimum date to today
  const dateInput = document.getElementById('scheduleDate');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  dateInput.setAttribute('min', todayStr);
}

// Initialize schedule validation
function initScheduleValidation() {
  const scheduleDate = document.getElementById('scheduleDate');
  const scheduleTime = document.getElementById('scheduleTime');
  const privacySelect = document.getElementById('videoPrivacy');

  // When schedule is set, force privacy to private
  function validateSchedule() {
    const hasSchedule = scheduleDate.value || scheduleTime.value;

    if (hasSchedule && privacySelect.value !== 'private') {
      privacySelect.value = 'private';
      showWarning('การตั้งเวลาเผยแพร่ต้องใช้สถานะ "ส่วนตัว" เท่านั้น ระบบได้เปลี่ยนสถานะให้อัตโนมัติแล้ว');
    }
  }

  scheduleDate.addEventListener('change', validateSchedule);
  scheduleTime.addEventListener('change', validateSchedule);

  // Warn if changing privacy from private when schedule is set
  privacySelect.addEventListener('change', () => {
    const hasSchedule = scheduleDate.value || scheduleTime.value;

    if (hasSchedule && privacySelect.value !== 'private') {
      showWarning('ไม่สามารถเปลี่ยนสถานะได้เนื่องจากมีการตั้งเวลาเผยแพร่ กรุณาล้างเวลาก่อน');
      privacySelect.value = 'private';
    }
  });
}

// Show warning message
function showWarning(message) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = '⚠️ ' + message;
  errorMessage.style.color = '#d97706';

  // Clear after 5 seconds
  setTimeout(() => {
    if (errorMessage.textContent.includes('⚠️')) {
      errorMessage.textContent = '';
      errorMessage.style.color = '';
    }
  }, 5000);
}

// Load presets list
async function loadPresetsList() {
  try {
    presets = await window.electronAPI.getPresets();
    const presetSelect = document.getElementById('presetSelect');

    // Clear existing options except the first one
    presetSelect.innerHTML = '<option value="">-- เลือกพรีเซ็ต --</option>';

    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });

    // Add event listener for auto-load on selection
    presetSelect.addEventListener('change', handlePresetSelection);
  } catch (error) {
    console.error('Error loading presets:', error);
  }
}

// Handle preset selection
async function handlePresetSelection() {
  const presetSelect = document.getElementById('presetSelect');
  const presetId = presetSelect.value;

  if (presetId) {
    await loadPreset();
  }
}

// Save preset
async function savePreset() {
  const presetName = document.getElementById('presetName').value.trim();

  if (!presetName) {
    showError('กรุณากรอกชื่อพรีเซ็ต');
    return;
  }

  // Get current form values
  const description = document.getElementById('videoDescription').value.trim();
  const categoryId = document.getElementById('videoCategory').value;
  const privacyStatus = document.getElementById('videoPrivacy').value;

  const presetData = {
    name: presetName,
    description: description,
    tags: tags, // Use current tags array
    categoryId: categoryId,
    privacyStatus: privacyStatus
  };

  try {
    const result = await window.electronAPI.addPreset(presetData);

    if (result.success) {
      showSuccess(result.message);
      document.getElementById('presetName').value = '';
      await loadPresetsList();
    } else {
      showError(result.message);
    }
  } catch (error) {
    console.error('Error saving preset:', error);
    showError('เกิดข้อผิดพลาดในการบันทึกพรีเซ็ต');
  }
}

// Load preset
async function loadPreset() {
  const presetSelect = document.getElementById('presetSelect');
  const presetId = presetSelect.value;

  if (!presetId) {
    return;
  }

  try {
    const result = await window.electronAPI.getPreset(presetId);

    if (result.success) {
      const preset = result.preset;

      // Apply preset to form
      document.getElementById('videoDescription').value = preset.description || '';
      document.getElementById('videoCategory').value = preset.categoryId || '1';
      document.getElementById('videoPrivacy').value = preset.privacyStatus || 'public';

      // Apply tags
      tags = preset.tags || [];
      renderTags();
      updateCharCounter();

      showSuccess(`โหลดพรีเซ็ต "${preset.name}" สำเร็จ`);
    } else {
      showError(result.message);
    }
  } catch (error) {
    console.error('Error loading preset:', error);
    showError('เกิดข้อผิดพลาดในการโหลดพรีเซ็ต');
  }
}

// Delete preset
async function deletePreset() {
  const presetSelect = document.getElementById('presetSelect');
  const presetId = presetSelect.value;

  if (!presetId) {
    showWarning('กรุณาเลือกพรีเซ็ตที่ต้องการลบ');
    return;
  }

  // Confirm deletion
  const selectedPreset = presets.find(p => p.id === presetId);
  if (!selectedPreset) {
    showError('ไม่พบพรีเซ็ตนี้');
    return;
  }

  if (!confirm(`คุณต้องการลบพรีเซ็ต "${selectedPreset.name}" หรือไม่?`)) {
    return;
  }

  try {
    const result = await window.electronAPI.deletePreset(presetId);

    if (result.success) {
      showSuccess(result.message);
      await loadPresetsList();
    } else {
      showError(result.message);
    }
  } catch (error) {
    console.error('Error deleting preset:', error);
    showError('เกิดข้อผิดพลาดในการลบพรีเซ็ต');
  }
}

// Load channels
async function loadChannels() {
  try {
    channels = await window.electronAPI.getChannels();
    const channelSelect = document.getElementById('channelSelect');
    const channelError = document.getElementById('channelError');

    // Clear existing options except the first one
    channelSelect.innerHTML = '<option value="">-- เลือกช่อง --</option>';

    if (channels.length === 0) {
      channelError.textContent = 'ยังไม่มีช่องที่เชื่อมต่อ กรุณาไปที่หน้าจัดการช่องเพื่อเพิ่มช่อง';
      channelError.classList.remove('hidden');
      return;
    }

    channelError.classList.add('hidden');

    channels.forEach(channel => {
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = channel.name;
      channelSelect.appendChild(option);
    });

    updateUploadButton();
  } catch (error) {
    console.error('Error loading channels:', error);
  }
}

// Select video
async function selectVideo() {
  try {
    const videoPath = await window.electronAPI.selectVideo();

    if (videoPath) {
      selectedVideoPath = videoPath;

      // Update UI
      document.getElementById('uploadPlaceholder').classList.add('hidden');
      document.getElementById('uploadSelected').classList.remove('hidden');
      document.getElementById('videoUploadArea').classList.add('has-file');

      // Extract filename
      const fileName = videoPath.split('\\').pop().split('/').pop();
      document.getElementById('videoFileName').textContent = fileName;

      // Auto-fill title if empty
      const titleInput = document.getElementById('videoTitle');
      if (!titleInput.value) {
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        titleInput.value = nameWithoutExt;
      }

      updateUploadButton();
    }
  } catch (error) {
    console.error('Error selecting video:', error);
  }
}

// Update upload button state
function updateUploadButton() {
  const uploadBtn = document.getElementById('uploadBtn');
  const title = document.getElementById('videoTitle').value.trim();
  const channelId = document.getElementById('channelSelect').value;

  if (selectedVideoPath && title && channelId) {
    uploadBtn.disabled = false;
  } else {
    uploadBtn.disabled = true;
  }
}

// Listen to form changes
document.getElementById('videoTitle').addEventListener('input', updateUploadButton);
document.getElementById('channelSelect').addEventListener('change', updateUploadButton);

// Start upload
async function startUpload() {
  const title = document.getElementById('videoTitle').value.trim();
  const description = document.getElementById('videoDescription').value.trim();
  const tagsString = getTagsString();
  const categoryId = document.getElementById('videoCategory').value;
  const privacyStatus = document.getElementById('videoPrivacy').value;
  const scheduleDate = document.getElementById('scheduleDate').value;
  const scheduleTimeValue = document.getElementById('scheduleTime').value;
  const channelId = document.getElementById('channelSelect').value;

  // Combine date and time
  let scheduledTime = null;
  if (scheduleDate && scheduleTimeValue) {
    scheduledTime = `${scheduleDate}T${scheduleTimeValue}:00`;
  }

  // Validate schedule and privacy
  if (scheduledTime && privacyStatus !== 'private') {
    showError('การตั้งเวลาเผยแพร่ต้องใช้สถานะ "ส่วนตัว" เท่านั้น');
    return;
  }

  if (!selectedVideoPath) {
    showError('กรุณาเลือกวิดีโอที่ต้องการอัพโหลด');
    return;
  }

  if (!title) {
    showError('กรุณากรอกชื่อวิดีโอ');
    return;
  }

  if (!channelId) {
    showError('กรุณาเลือกช่อง YouTube');
    return;
  }

  // Prepare upload data
  const uploadData = {
    channelId,
    videoPath: selectedVideoPath,
    title,
    description,
    tags: tagsString,
    categoryId,
    privacyStatus,
    scheduledTime: scheduledTime
  };

  // Disable upload button
  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'กำลังอัพโหลด...';

  // Show progress
  document.getElementById('progressContainer').classList.remove('hidden');
  document.getElementById('successMessage').classList.add('hidden');
  document.getElementById('errorMessage').textContent = '';

  // Listen to progress
  window.electronAPI.onUploadProgress((progress) => {
    updateProgress(progress.progress);
  });

  try {
    // Upload video
    const result = await window.electronAPI.uploadVideo(uploadData);

    if (result.success) {
      showSuccess(result.message, result.videoUrl, title);
      resetForm();
    } else {
      showError(result.message);
    }
  } catch (error) {
    console.error('Upload error:', error);
    showError('เกิดข้อผิดพลาดในการอัพโหลด');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'อัพโหลดวิดีโอ';
  }
}

// Update progress
function updateProgress(progress) {
  const progressFill = document.getElementById('progressFill');
  const progressStatus = document.getElementById('progressStatus');

  progressFill.style.width = `${progress}%`;
  progressFill.textContent = `${progress}%`;

  if (progress === 100) {
    progressStatus.textContent = 'กำลังประมวลผล...';
  } else {
    progressStatus.textContent = `กำลังอัพโหลด... ${progress}%`;
  }
}

// Show success message
function showSuccess(message, videoUrl = null, videoTitle = null) {
  const successMessage = document.getElementById('successMessage');

  if (videoUrl && videoTitle) {
    successMessage.innerHTML = `
      <div style="padding: 1rem; background-color: #f0fdf4; border-radius: 8px; border: 2px solid #16a34a;">
        <p style="margin: 0 0 0.75rem 0; font-size: 1rem;">
          <strong style="color: #16a34a;">✓ ${message}</strong>
        </p>
        <p style="margin: 0 0 0.5rem 0; color: #374151;">
          <strong>ชื่อวิดีโอ:</strong> <span style="color: #111827;">${videoTitle}</span>
        </p>
        <p style="margin: 0; color: #374151;">
          <strong>URL:</strong>
          <a href="#" class="video-link" onclick="openVideoUrl('${videoUrl}'); return false;">
            ${videoUrl}
          </a>
        </p>
      </div>
    `;
  } else {
    successMessage.textContent = message;
  }

  successMessage.classList.remove('hidden');
  document.getElementById('errorMessage').textContent = '';
}

// Open video URL in external browser
function openVideoUrl(url) {
  window.electronAPI.openExternal(url);
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  document.getElementById('successMessage').classList.add('hidden');
}

// Reset form
function resetForm() {
  selectedVideoPath = null;

  // Reset video selection
  document.getElementById('uploadPlaceholder').classList.remove('hidden');
  document.getElementById('uploadSelected').classList.add('hidden');
  document.getElementById('videoUploadArea').classList.remove('has-file');

  // Reset form fields
  document.getElementById('videoTitle').value = '';
  document.getElementById('videoDescription').value = '';
  document.getElementById('videoTags').value = '';
  document.getElementById('videoCategory').value = '1';
  document.getElementById('videoPrivacy').value = 'public';
  document.getElementById('scheduleDate').value = '';
  document.getElementById('scheduleTime').value = '';

  // Reset tags
  tags = [];
  renderTags();
  updateCharCounter();

  // Hide progress
  document.getElementById('progressContainer').classList.add('hidden');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressFill').textContent = '0%';

  updateUploadButton();
}

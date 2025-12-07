// State
let selectedVideos = [];
let channels = [];
let presets = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadChannels();
  await loadPresets();
  initDragAndDrop();
  initTimeDropdowns();
});

// Navigate
function navigateToIndex() {
  window.electronAPI.navigate('index');
}

function navigateToChannels() {
  window.electronAPI.navigate('channels');
}

// Load channels
async function loadChannels() {
  try {
    channels = await window.electronAPI.getChannels();
    const channelSelect = document.getElementById('bulkChannel');

    channelSelect.innerHTML = '<option value="">-- เลือกช่อง --</option>';

    channels.forEach(channel => {
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = channel.name;
      channelSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading channels:', error);
  }
}

// Load presets
async function loadPresets() {
  try {
    presets = await window.electronAPI.getPresets();
    const presetSelect = document.getElementById('bulkPreset');

    presetSelect.innerHTML = '<option value="">-- ไม่ใช้พรีเซ็ต --</option>';

    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading presets:', error);
  }
}

// Initialize time dropdowns
function initTimeDropdowns() {
  const time1Select = document.getElementById('bulkTime1');
  const time2Select = document.getElementById('bulkTime2');

  // Generate time options (every 15 minutes)
  const timeOptions = generateTimeOptionsForBulk();

  time1Select.innerHTML = '<option value="">-- เลือกเวลา --</option>' + timeOptions;
  time2Select.innerHTML = '<option value="">-- ไม่ใช้เวลาสลับ --</option>' + timeOptions;
}

// Generate time options for bulk settings
function generateTimeOptionsForBulk() {
  let options = '';
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      const timeValue = `${hourStr}:${minuteStr}`;
      options += `<option value="${timeValue}">${timeValue}</option>`;
    }
  }
  return options;
}

// Extract number from filename
function extractNumberFromFilename(fileName) {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

  // Try to find numbers in the filename
  const numbers = nameWithoutExt.match(/\d+/g);

  if (numbers && numbers.length > 0) {
    // Return the last number found (usually the episode/volume number)
    return numbers[numbers.length - 1];
  }

  return null;
}

// Replace episode/volume number in title
function replaceEpisodeNumber(title, newNumber) {
  if (!newNumber) return title;

  // Replace patterns like "Vol.001", "Vol. 001", "EP.507", "EP. 507", etc.
  // This regex matches "Vol." or "EP." (case insensitive) followed by optional space and digits
  const volPattern = /(\bVol\.?\s*)(\d+)/i;
  const epPattern = /(\bEP\.?\s*)(\d+)/i;

  let result = title;

  // Try to replace Vol. pattern first
  if (volPattern.test(title)) {
    result = title.replace(volPattern, `$1${newNumber}`);
  }
  // If no Vol. pattern, try EP. pattern
  else if (epPattern.test(title)) {
    result = title.replace(epPattern, `$1${newNumber}`);
  }

  return result;
}

// Initialize drag and drop
function initDragAndDrop() {
  const uploadArea = document.getElementById('videoUploadArea');

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.classList.remove('drag-over');
    }, false);
  });

  uploadArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = Array.from(dt.files);
  addVideos(files);
}

// Select multiple videos
async function selectMultipleVideos() {
  try {
    const videoPaths = await window.electronAPI.selectMultipleVideos();

    if (videoPaths && videoPaths.length > 0) {
      const files = videoPaths.map(path => ({
        path: path,
        name: path.split('\\').pop().split('/').pop()
      }));
      addVideos(files);
    }
  } catch (error) {
    console.error('Error selecting videos:', error);
  }
}

// Add videos to list
function addVideos(files) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

  files.forEach(file => {
    const fileName = file.name || file.path.split('\\').pop().split('/').pop();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (videoExtensions.includes(fileExtension)) {
      const videoPath = file.path;

      // Check if already added
      if (selectedVideos.some(v => v.path === videoPath)) {
        return;
      }

      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));

      selectedVideos.push({
        id: Date.now().toString() + Math.random(),
        path: videoPath,
        fileName: fileName,
        title: nameWithoutExt,
        description: '',
        tags: [],
        categoryId: '1',
        privacyStatus: 'public',
        channelId: '',
        scheduleDate: '',
        scheduleTime: '',
        presetId: '',
        status: 'pending' // pending, uploading, success, error
      });
    }
  });

  updateUI();
}

// Update UI
function updateUI() {
  const count = selectedVideos.length;

  if (count > 0) {
    document.getElementById('uploadPlaceholder').classList.add('hidden');
    document.getElementById('uploadSelected').classList.remove('hidden');
    document.getElementById('videoUploadArea').classList.add('has-file');
    document.getElementById('videoCount').textContent = count;
    document.getElementById('videosListCard').style.display = 'block';
    document.getElementById('totalVideos').textContent = count;
  } else {
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('uploadSelected').classList.add('hidden');
    document.getElementById('videoUploadArea').classList.remove('has-file');
    document.getElementById('videosListCard').style.display = 'none';
  }

  renderVideosList();
  updateUploadButton();
}

// Render videos list
function renderVideosList() {
  const videosList = document.getElementById('videosList');
  videosList.innerHTML = '';

  selectedVideos.forEach((video, index) => {
    const videoCard = document.createElement('div');
    videoCard.className = 'video-item';
    videoCard.innerHTML = `
      <div class="video-item-header">
        <span class="video-number">#${index + 1}</span>
        <span class="video-filename">${video.fileName}</span>
        <button class="btn-small btn-danger" onclick="removeVideo('${video.id}')">ลบ</button>
      </div>

      <div class="video-item-body">
        <div class="form-group" style="margin-bottom: 0.75rem;">
          <label class="form-label-small">ชื่อวิดีโอ</label>
          <input type="text" class="form-input" value="${video.title}"
            onchange="updateVideoField('${video.id}', 'title', this.value)">
        </div>

        <div class="grid-3" style="margin-bottom: 0.75rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label-small">พรีเซ็ต</label>
            <select class="form-select" onchange="applyPresetToVideo('${video.id}', this.value)">
              <option value="">-- เลือกพรีเซ็ต --</option>
              ${presets.map(p => `<option value="${p.id}" ${video.presetId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label-small">ช่อง</label>
            <select class="form-select" onchange="updateVideoField('${video.id}', 'channelId', this.value)">
              <option value="">-- เลือกช่อง --</option>
              ${channels.map(c => `<option value="${c.id}" ${video.channelId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label-small">สถานะ</label>
            <select class="form-select" onchange="updateVideoField('${video.id}', 'privacyStatus', this.value)">
              <option value="public" ${video.privacyStatus === 'public' ? 'selected' : ''}>สาธารณะ</option>
              <option value="unlisted" ${video.privacyStatus === 'unlisted' ? 'selected' : ''}>ไม่อยู่ในรายการ</option>
              <option value="private" ${video.privacyStatus === 'private' ? 'selected' : ''}>ส่วนตัว</option>
            </select>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label-small">วันที่เผยแพร่</label>
            <input type="date" class="form-input" value="${video.scheduleDate}"
              onchange="updateVideoField('${video.id}', 'scheduleDate', this.value)">
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label-small">เวลา</label>
            <select class="form-select" onchange="updateVideoField('${video.id}', 'scheduleTime', this.value)">
              <option value="">-- เลือกเวลา --</option>
              ${generateTimeOptions(video.scheduleTime)}
            </select>
          </div>
        </div>

        ${video.status !== 'pending' ? `
          <div class="video-status video-status-${video.status}">
            ${video.status === 'uploading' ? '🔄 กำลังอัพโหลด...' : ''}
            ${video.status === 'success' ? '✅ อัพโหลดสำเร็จ' : ''}
            ${video.status === 'error' ? '❌ เกิดข้อผิดพลาด: ' + (video.error || '') : ''}
          </div>
        ` : ''}
      </div>
    `;
    videosList.appendChild(videoCard);
  });
}

// Generate time options
function generateTimeOptions(selectedTime) {
  let options = '';
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      const timeValue = `${hourStr}:${minuteStr}`;
      const selected = timeValue === selectedTime ? 'selected' : '';
      options += `<option value="${timeValue}" ${selected}>${timeValue}</option>`;
    }
  }
  return options;
}

// Update video field
function updateVideoField(videoId, field, value) {
  const video = selectedVideos.find(v => v.id === videoId);
  if (video) {
    video[field] = value;

    // Auto-change privacy to private if schedule is set
    if ((field === 'scheduleDate' || field === 'scheduleTime') && value) {
      if (video.scheduleDate || video.scheduleTime) {
        if (video.privacyStatus !== 'private') {
          video.privacyStatus = 'private';
          showWarning(`วิดีโอ "${video.fileName}" ถูกเปลี่ยนสถานะเป็น "ส่วนตัว" เนื่องจากมีการตั้งเวลาเผยแพร่`);
          renderVideosList();
        }
      }
    }

    // Warn if trying to change privacy when schedule is set
    if (field === 'privacyStatus' && value !== 'private') {
      if (video.scheduleDate || video.scheduleTime) {
        video.privacyStatus = 'private';
        showWarning(`ไม่สามารถเปลี่ยนสถานะได้เนื่องจากวิดีโอ "${video.fileName}" มีการตั้งเวลาเผยแพร่`);
        renderVideosList();
        return;
      }
    }

    updateUploadButton();
  }
}

// Remove video
function removeVideo(videoId) {
  selectedVideos = selectedVideos.filter(v => v.id !== videoId);
  updateUI();
}

// Apply preset to video
async function applyPresetToVideo(videoId, presetId) {
  if (!presetId) {
    updateVideoField(videoId, 'presetId', '');
    return;
  }

  try {
    const result = await window.electronAPI.getPreset(presetId);
    if (result.success) {
      const preset = result.preset;
      const video = selectedVideos.find(v => v.id === videoId);

      if (video) {
        video.presetId = presetId;

        // Get the title from preset
        let newTitle = preset.title || video.title;

        // Check if auto-rename is enabled
        const autoRenameToggle = document.getElementById('autoRenameToggle');
        if (autoRenameToggle && autoRenameToggle.checked) {
          // Extract number from video filename
          const fileNumber = extractNumberFromFilename(video.fileName);
          if (fileNumber) {
            // Replace Vol./EP. number in title
            newTitle = replaceEpisodeNumber(newTitle, fileNumber);
          }
        }

        video.title = newTitle;
        video.description = preset.description || '';
        video.tags = preset.tags || [];
        video.categoryId = preset.categoryId || '1';
        video.privacyStatus = preset.privacyStatus || 'public';
        renderVideosList();
      }
    }
  } catch (error) {
    console.error('Error applying preset:', error);
  }
}

// Apply bulk settings
function applyBulkSettings() {
  const bulkChannel = document.getElementById('bulkChannel').value;
  const bulkPreset = document.getElementById('bulkPreset').value;
  const bulkPrivacy = document.getElementById('bulkPrivacy').value;
  const bulkStartDate = document.getElementById('bulkStartDate').value;
  const bulkVideosPerDay = parseInt(document.getElementById('bulkVideosPerDay').value) || 1;
  const bulkTime1 = document.getElementById('bulkTime1').value;
  const bulkTime2 = document.getElementById('bulkTime2').value;

  // Apply basic settings
  selectedVideos.forEach(video => {
    if (bulkChannel) {
      video.channelId = bulkChannel;
    }
    if (bulkPrivacy) {
      video.privacyStatus = bulkPrivacy;
    }
    if (bulkPreset) {
      applyPresetToVideo(video.id, bulkPreset);
    }
  });

  // Apply automatic date and time scheduling
  if (bulkStartDate && bulkTime1) {
    applyAutomaticScheduling(bulkStartDate, bulkVideosPerDay, bulkTime1, bulkTime2);
  } else if (bulkStartDate || bulkTime1) {
    showWarning('กรุณาระบุทั้งวันที่เริ่มต้นและเวลาที่ 1 เพื่อใช้การตั้งเวลาอัตโนมัติ');
  }

  renderVideosList();
  showSuccess('ใช้การตั้งค่ากับทุกวิดีโอสำเร็จ');
}

// Apply automatic scheduling to all videos
function applyAutomaticScheduling(startDate, videosPerDay, time1, time2) {
  const hasAlternatingTime = time2 && time2 !== '';
  let currentDate = new Date(startDate);
  let videoCountForCurrentDay = 0;

  selectedVideos.forEach((video, index) => {
    // Determine which time to use (alternate between time1 and time2 if time2 is provided)
    let timeToUse;
    if (hasAlternatingTime) {
      // Alternate between time1 and time2
      timeToUse = (index % 2 === 0) ? time1 : time2;
    } else {
      // Use time1 for all videos
      timeToUse = time1;
    }

    // Format date as YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Apply to video
    video.scheduleDate = formattedDate;
    video.scheduleTime = timeToUse;
    video.privacyStatus = 'private'; // Auto-set to private when scheduling

    // Increment counter
    videoCountForCurrentDay++;

    // Move to next day if we've reached the videos per day limit
    if (videoCountForCurrentDay >= videosPerDay) {
      currentDate.setDate(currentDate.getDate() + 1);
      videoCountForCurrentDay = 0;
    }
  });
}

// Update upload button
function updateUploadButton() {
  const uploadBtn = document.getElementById('uploadAllBtn');
  const canUpload = selectedVideos.length > 0 && selectedVideos.every(v => v.channelId && v.title);
  uploadBtn.disabled = !canUpload;
}

// Start bulk upload
async function startBulkUpload() {
  const uploadBtn = document.getElementById('uploadAllBtn');
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'กำลังอัพโหลด...';

  document.getElementById('bulkProgressContainer').classList.remove('hidden');
  document.getElementById('bulkSuccessMessage').classList.add('hidden');
  document.getElementById('bulkErrorMessage').textContent = '';

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < selectedVideos.length; i++) {
    const video = selectedVideos[i];
    video.status = 'uploading';
    renderVideosList();

    const progress = Math.round(((i) / selectedVideos.length) * 100);
    updateBulkProgress(i, selectedVideos.length, video.fileName);

    try {
      const scheduledTime = video.scheduleDate && video.scheduleTime
        ? `${video.scheduleDate}T${video.scheduleTime}:00`
        : null;

      const uploadData = {
        channelId: video.channelId,
        videoPath: video.path,
        title: video.title,
        description: video.description,
        tags: video.tags.join(', '),
        categoryId: video.categoryId,
        privacyStatus: video.privacyStatus,
        scheduledTime: scheduledTime
      };

      const result = await window.electronAPI.uploadVideo(uploadData);

      if (result.success) {
        video.status = 'success';
        video.videoUrl = result.videoUrl;
        successCount++;
      } else {
        video.status = 'error';
        video.error = result.message;
        errorCount++;
      }
    } catch (error) {
      video.status = 'error';
      video.error = error.message;
      errorCount++;
    }

    renderVideosList();
  }

  updateBulkProgress(selectedVideos.length, selectedVideos.length, null, true);

  uploadBtn.disabled = false;
  uploadBtn.textContent = 'เริ่มอัพโหลดทั้งหมด';

  showSuccess(`อัพโหลดเสร็จสิ้น! สำเร็จ ${successCount} วิดีโอ${errorCount > 0 ? `, ผิดพลาด ${errorCount} วิดีโอ` : ''}`);
}

// Update bulk progress
function updateBulkProgress(current, total, fileName = null, completed = false) {
  const progressFill = document.getElementById('bulkProgressFill');
  const progressStatus = document.getElementById('bulkProgressStatus');

  const percentage = Math.round((current / total) * 100);
  progressFill.style.width = `${percentage}%`;

  if (completed) {
    progressFill.textContent = `${total}/${total} (100%)`;
    progressStatus.textContent = '✅ เสร็จสิ้นการอัพโหลดทั้งหมด';
  } else {
    const currentItem = current + 1; // +1 because we're starting the next upload
    progressFill.textContent = `${currentItem}/${total} (${percentage}%)`;

    if (fileName) {
      // Truncate filename if too long
      const displayName = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName;
      progressStatus.textContent = `กำลังอัพโหลด: ${displayName}`;
    } else {
      progressStatus.textContent = `กำลังอัพโหลด ${currentItem} จาก ${total}`;
    }
  }
}

// Show success message
function showSuccess(message) {
  const successMessage = document.getElementById('bulkSuccessMessage');
  successMessage.textContent = message;
  successMessage.classList.remove('hidden');
  document.getElementById('bulkErrorMessage').textContent = '';
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById('bulkErrorMessage');
  errorMessage.textContent = message;
  document.getElementById('bulkSuccessMessage').classList.add('hidden');
}

// Show warning message
function showWarning(message) {
  const errorMessage = document.getElementById('bulkErrorMessage');
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

// State
let selectedVideoPath = null;
let channels = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadChannels();
  updateUploadButton();
});

// Navigate to channels page
function navigateToChannels() {
  window.electronAPI.navigate('channels');
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
  const tags = document.getElementById('videoTags').value.trim();
  const categoryId = document.getElementById('videoCategory').value;
  const privacyStatus = document.getElementById('videoPrivacy').value;
  const scheduleTime = document.getElementById('scheduleTime').value;
  const madeForKids = document.getElementById('madeForKids').checked;
  const channelId = document.getElementById('channelSelect').value;

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
    tags,
    categoryId,
    privacyStatus,
    scheduledTime: scheduleTime || null,
    madeForKids
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
      showSuccess(`${result.message}\nURL: ${result.videoUrl}`);
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
function showSuccess(message) {
  const successMessage = document.getElementById('successMessage');
  successMessage.textContent = message;
  successMessage.classList.remove('hidden');
  document.getElementById('errorMessage').textContent = '';
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
  document.getElementById('scheduleTime').value = '';
  document.getElementById('madeForKids').checked = false;

  // Hide progress
  document.getElementById('progressContainer').classList.add('hidden');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressFill').textContent = '0%';

  updateUploadButton();
}

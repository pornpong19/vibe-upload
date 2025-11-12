// State
let selectedCredentialsPath = null;
let channels = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadChannels();
});

// Format number with commas or K/M suffix
function formatNumber(num) {
  const number = parseInt(num);

  if (isNaN(number)) return '0';

  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }

  return number.toLocaleString('th-TH');
}

// Navigate to home page
function navigateToHome() {
  window.electronAPI.navigate('index');
}

// Select credentials file
async function selectCredentials() {
  try {
    const credentialsPath = await window.electronAPI.selectCredentials();

    if (credentialsPath) {
      selectedCredentialsPath = credentialsPath;

      // Update UI
      document.getElementById('credentialsPlaceholder').classList.add('hidden');
      document.getElementById('credentialsSelected').classList.remove('hidden');
      document.getElementById('credentialsUploadArea').classList.add('has-file');

      // Extract filename
      const fileName = credentialsPath.split('\\').pop().split('/').pop();
      document.getElementById('credentialsFileName').textContent = fileName;

      // Enable add button
      document.getElementById('addChannelBtn').disabled = false;

      // Clear messages
      document.getElementById('addSuccessMessage').classList.add('hidden');
      document.getElementById('addErrorMessage').textContent = '';
    }
  } catch (error) {
    console.error('Error selecting credentials:', error);
  }
}

// Add channel
async function addChannel() {
  if (!selectedCredentialsPath) {
    showAddError('กรุณาเลือกไฟล์ credentials.json');
    return;
  }

  const addBtn = document.getElementById('addChannelBtn');
  addBtn.disabled = true;
  addBtn.textContent = 'กำลังเชื่อมต่อ...';

  try {
    const result = await window.electronAPI.addChannel(selectedCredentialsPath);

    if (result.success) {
      showAddSuccess(result.message);
      resetCredentialsForm();
      await loadChannels();
    } else {
      showAddError(result.message);
    }
  } catch (error) {
    console.error('Error adding channel:', error);
    showAddError('เกิดข้อผิดพลาดในการเพิ่มช่อง');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'เชื่อมต่อและเพิ่มช่อง';
  }
}

// Load channels
async function loadChannels() {
  try {
    channels = await window.electronAPI.getChannels();
    renderChannelsList();
  } catch (error) {
    console.error('Error loading channels:', error);
  }
}

// Render channels list
function renderChannelsList() {
  const channelsListContainer = document.getElementById('channelsListContainer');
  const channelsList = document.getElementById('channelsList');

  if (channels.length === 0) {
    channelsListContainer.classList.remove('hidden');
    channelsList.classList.add('hidden');
    return;
  }

  channelsListContainer.classList.add('hidden');
  channelsList.classList.remove('hidden');
  channelsList.innerHTML = '';

  channels.forEach(channel => {
    const li = document.createElement('li');
    li.className = 'channel-item';

    const channelInfo = document.createElement('div');
    channelInfo.className = 'channel-info';

    // Channel Header (with thumbnail)
    const channelHeader = document.createElement('div');
    channelHeader.className = 'channel-header';

    // Thumbnail
    if (channel.thumbnailUrl) {
      const thumbnail = document.createElement('img');
      thumbnail.className = 'channel-thumbnail';
      thumbnail.src = channel.thumbnailUrl;
      thumbnail.alt = channel.name;
      channelHeader.appendChild(thumbnail);
    }

    // Title section
    const channelTitle = document.createElement('div');
    channelTitle.className = 'channel-title';

    const channelName = document.createElement('div');
    channelName.className = 'channel-name';
    channelName.textContent = channel.name;

    const channelId = document.createElement('div');
    channelId.className = 'channel-id';
    channelId.textContent = channel.customUrl || `ID: ${channel.id}`;

    const channelStatus = document.createElement('div');
    channelStatus.style.fontSize = '0.75rem';
    channelStatus.style.marginTop = '0.25rem';

    if (channel.authenticated) {
      channelStatus.style.color = '#16a34a';
      channelStatus.textContent = '✓ เชื่อมต่อแล้ว';
    } else {
      channelStatus.style.color = '#f59e0b';
      channelStatus.textContent = '⚠ รอการยืนยัน OAuth';
    }

    channelTitle.appendChild(channelName);
    channelTitle.appendChild(channelId);
    channelTitle.appendChild(channelStatus);

    channelHeader.appendChild(channelTitle);
    channelInfo.appendChild(channelHeader);

    // Statistics
    if (channel.statistics) {
      const stats = channel.statistics;
      const statisticsDiv = document.createElement('div');
      statisticsDiv.className = 'channel-statistics';

      // Subscribers
      const subsDiv = document.createElement('div');
      subsDiv.className = 'stat-item';
      subsDiv.innerHTML = `
        <span class="stat-label">ผู้ติดตาม</span>
        <span class="stat-value">${formatNumber(stats.subscriberCount)}</span>
      `;

      // Videos
      const videosDiv = document.createElement('div');
      videosDiv.className = 'stat-item';
      videosDiv.innerHTML = `
        <span class="stat-label">วิดีโอ</span>
        <span class="stat-value">${formatNumber(stats.videoCount)}</span>
      `;

      // Views
      const viewsDiv = document.createElement('div');
      viewsDiv.className = 'stat-item';
      viewsDiv.innerHTML = `
        <span class="stat-label">การดู</span>
        <span class="stat-value">${formatNumber(stats.viewCount)}</span>
      `;

      statisticsDiv.appendChild(subsDiv);
      statisticsDiv.appendChild(videosDiv);
      statisticsDiv.appendChild(viewsDiv);

      channelInfo.appendChild(statisticsDiv);
    }

    const channelActions = document.createElement('div');
    channelActions.className = 'channel-actions';

    // Show different buttons based on authentication status
    if (channel.authenticated) {
      // Refresh button (only for authenticated channels)
      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'btn btn-secondary';
      refreshBtn.textContent = '🔄';
      refreshBtn.title = 'รีเฟรชข้อมูล';
      refreshBtn.style.padding = '0.5rem 0.75rem';
      refreshBtn.onclick = () => refreshChannel(channel.id);
      channelActions.appendChild(refreshBtn);
    } else {
      // Auth button (for pending channels)
      const authBtn = document.createElement('button');
      authBtn.className = 'btn';
      authBtn.textContent = 'ยืนยันตัวตน';
      authBtn.onclick = () => completeAuth(channel.id);
      channelActions.appendChild(authBtn);
    }

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = 'ลบ';
    removeBtn.onclick = () => removeChannel(channel.id);

    channelActions.appendChild(removeBtn);

    li.appendChild(channelInfo);
    li.appendChild(channelActions);

    channelsList.appendChild(li);
  });
}

// Complete authentication for pending channel
async function completeAuth(channelId) {
  const confirmed = confirm('จะเปิดเบราว์เซอร์เพื่อยืนยันตัวตน คุณพร้อมแล้วหรือไม่?');

  if (!confirmed) {
    return;
  }

  try {
    const result = await window.electronAPI.completeChannelAuth(channelId);

    if (result.success) {
      alert('ยืนยันตัวตนสำเร็จ!');
      await loadChannels();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error completing authentication:', error);
    alert('เกิดข้อผิดพลาดในการยืนยันตัวตน');
  }
}

// Refresh channel data
async function refreshChannel(channelId) {
  try {
    const result = await window.electronAPI.refreshChannelData(channelId);

    if (result.success) {
      await loadChannels();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error refreshing channel:', error);
    alert('เกิดข้อผิดพลาดในการรีเฟรชข้อมูลช่อง');
  }
}

// Remove channel
async function removeChannel(channelId) {
  const confirmed = confirm('คุณต้องการลบช่องนี้ใช่หรือไม่?');

  if (!confirmed) {
    return;
  }

  try {
    const result = await window.electronAPI.removeChannel(channelId);

    if (result.success) {
      await loadChannels();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error removing channel:', error);
    alert('เกิดข้อผิดพลาดในการลบช่อง');
  }
}

// Show add success message
function showAddSuccess(message) {
  const successMessage = document.getElementById('addSuccessMessage');
  successMessage.textContent = message;
  successMessage.classList.remove('hidden');
  document.getElementById('addErrorMessage').textContent = '';
}

// Show add error message
function showAddError(message) {
  const errorMessage = document.getElementById('addErrorMessage');
  errorMessage.textContent = message;
  document.getElementById('addSuccessMessage').classList.add('hidden');
}

// Reset credentials form
function resetCredentialsForm() {
  selectedCredentialsPath = null;

  document.getElementById('credentialsPlaceholder').classList.remove('hidden');
  document.getElementById('credentialsSelected').classList.add('hidden');
  document.getElementById('credentialsUploadArea').classList.remove('has-file');
  document.getElementById('addChannelBtn').disabled = true;
}

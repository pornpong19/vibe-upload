// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadLatestUploads();
  await loadFullHistory();
});

// Navigate
function navigateToIndex() {
  window.electronAPI.navigate('index');
}

function navigateToBulkUpload() {
  window.electronAPI.navigate('bulk-upload');
}

function navigateToChannels() {
  window.electronAPI.navigate('channels');
}

// Format date/time to Thai-friendly format
function formatDateTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Format scheduled time (can be ISO string or local datetime string like "2026-02-15T18:00:00")
function formatScheduledTime(scheduledTime) {
  const date = new Date(scheduledTime);
  if (isNaN(date.getTime())) return scheduledTime; // fallback to raw string

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  const now = new Date();
  const isPast = date < now;

  const dateStr = `${day}/${month}/${year} ${hours}:${minutes}`;

  if (isPast) {
    return `${dateStr} (ลงแล้ว)`;
  } else {
    // Calculate how far in the future
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainHours = diffHours % 24;

    let futureText = '';
    if (diffDays > 0) {
      futureText = `อีก ${diffDays} วัน ${remainHours} ชม.`;
    } else {
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      futureText = `อีก ${diffHours} ชม. ${diffMins} นาที`;
    }
    return `${dateStr} (${futureText})`;
  }
}

// Calculate time difference
function getTimeDifference(isoString) {
  const uploadDate = new Date(isoString);
  const now = new Date();
  const diffMs = now - uploadDate;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours >= 24) {
    const diffDays = Math.floor(diffHours / 24);
    const remainHours = diffHours % 24;
    return `${diffDays} วัน ${remainHours} ชม. ที่แล้ว`;
  }

  return `${diffHours} ชม. ${diffMinutes} นาที ที่แล้ว`;
}

// Check if within 24-hour quota
function isWithinQuota(isoString) {
  const uploadDate = new Date(isoString);
  const now = new Date();
  const diffMs = now - uploadDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours < 24;
}

// Calculate remaining time until 24h quota resets
function getQuotaResetTime(isoString) {
  const uploadDate = new Date(isoString);
  const resetTime = new Date(uploadDate.getTime() + (24 * 60 * 60 * 1000));
  const now = new Date();
  const diffMs = resetTime - now;

  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours} ชม. ${minutes} นาที`;
}

// Load latest uploads per channel
async function loadLatestUploads() {
  const container = document.getElementById('latestUploadsContainer');

  try {
    const latestUploads = await window.electronAPI.getLatestUploads();

    if (latestUploads.length === 0) {
      container.innerHTML = `
        <div class="upload-times-empty">
          <p style="font-size: 3rem; margin-bottom: 0.5rem;">📭</p>
          <p style="font-weight: 600; color: var(--dark-gray);">ยังไม่มีประวัติการอัพโหลด</p>
          <p style="font-size: 0.85rem; color: var(--dark-gray); margin-top: 0.5rem;">
            เมื่อคุณอัพโหลดคลิปสำเร็จ เวลาจะปรากฏที่นี่
          </p>
        </div>
      `;
      return;
    }

    // Sort by upload time (most recent first)
    latestUploads.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    let html = '<div class="upload-times-grid">';

    latestUploads.forEach(upload => {
      const withinQuota = isWithinQuota(upload.uploadedAt);
      const resetTime = getQuotaResetTime(upload.uploadedAt);
      const timeDiff = getTimeDifference(upload.uploadedAt);
      const formattedTime = formatDateTime(upload.uploadedAt);

      const statusClass = withinQuota ? 'quota-warning' : 'quota-ok';
      const statusIcon = withinQuota ? '🔴' : '🟢';
      const statusText = withinQuota
        ? `ยังไม่ครบ 24 ชม. (เหลืออีก ${resetTime})`
        : 'ครบ 24 ชม. แล้ว พร้อมอัพโหลด!';

      html += `
        <div class="upload-time-card ${statusClass}">
          <div class="upload-time-header">
            <div class="upload-time-channel">
              <span class="upload-time-status-icon">${statusIcon}</span>
              <div>
                <div class="upload-time-channel-name">${upload.channelName}</div>
                <div class="upload-time-channel-id">${upload.channelId}</div>
              </div>
            </div>
          </div>

          <div class="upload-time-body">
            <div class="upload-time-info">
              <div class="upload-time-label">🕐 อัพโหลดล่าสุด</div>
              <div class="upload-time-value">${formattedTime}</div>
            </div>

            <div class="upload-time-info">
              <div class="upload-time-label">⏳ เวลาที่ผ่านไป</div>
              <div class="upload-time-value">${timeDiff}</div>
            </div>

            <div class="upload-time-info">
              <div class="upload-time-label">📅 ตั้งเวลาลงยูทูป</div>
              <div class="upload-time-value ${upload.scheduledTime ? 'upload-time-scheduled' : ''}">${upload.scheduledTime ? formatScheduledTime(upload.scheduledTime) : '<span style="color: var(--dark-gray); font-weight: 500;">ไม่ได้ตั้งเวลา</span>'}</div>
            </div>

            <div class="upload-time-info">
              <div class="upload-time-label">🎬 คลิปล่าสุด</div>
              <div class="upload-time-value upload-time-video-title">${upload.videoTitle}</div>
            </div>

            <div class="upload-time-quota-status ${statusClass}">
              ${statusText}
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Start auto-refresh timer
    startAutoRefresh();

  } catch (error) {
    console.error('Error loading latest uploads:', error);
    container.innerHTML = `
      <p style="text-align: center; color: var(--primary-red); padding: 2rem;">
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </p>
    `;
  }
}

// Load full upload history
async function loadFullHistory() {
  const container = document.getElementById('historyContainer');

  try {
    const history = await window.electronAPI.getUploadHistory();

    if (history.length === 0) {
      container.innerHTML = `
        <p style="text-align: center; color: var(--dark-gray); padding: 2rem;">
          ยังไม่มีประวัติการอัพโหลด
        </p>
      `;
      return;
    }

    // Sort by upload time (most recent first)
    history.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    let html = '<div class="history-list">';

    history.forEach((entry, index) => {
      const formattedTime = formatDateTime(entry.uploadedAt);

      const scheduledDisplay = entry.scheduledTime ? `<span class="history-item-scheduled">📅 ลงวันที่ ${formatScheduledTime(entry.scheduledTime)}</span>` : '';

      html += `
        <div class="history-item">
          <div class="history-item-number">#${history.length - index}</div>
          <div class="history-item-content">
            <div class="history-item-title">${entry.videoTitle}</div>
            <div class="history-item-meta">
              <span class="history-item-channel">📺 ${entry.channelName}</span>
              <span class="history-item-time">🕐 ${formattedTime}</span>
              ${scheduledDisplay}
            </div>
          </div>
          ${entry.videoUrl ? `
            <a href="#" class="history-item-link" onclick="openVideoUrl('${entry.videoUrl}'); return false;">
              🔗 เปิด
            </a>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading history:', error);
    container.innerHTML = `
      <p style="text-align: center; color: var(--primary-red); padding: 2rem;">
        เกิดข้อผิดพลาดในการโหลดประวัติ
      </p>
    `;
  }
}

// Open video URL
function openVideoUrl(url) {
  window.electronAPI.openExternal(url);
}

// Clear all history
async function clearAllHistory() {
  if (!confirm('คุณต้องการล้างประวัติการอัพโหลดทั้งหมดหรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้')) {
    return;
  }

  try {
    const result = await window.electronAPI.clearUploadHistory();
    if (result.success) {
      await loadLatestUploads();
      await loadFullHistory();
    }
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

// Auto refresh every minute
let refreshInterval = null;

function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(async () => {
    await loadLatestUploads();
  }, 60000); // Refresh every 1 minute
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

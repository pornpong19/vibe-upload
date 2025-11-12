const fs = require('fs');
const { google } = require('googleapis');
const channelsManager = require('./channels-manager');

// Upload video to YouTube
async function uploadVideo(uploadData, progressCallback) {
  try {
    const {
      channelId,
      videoPath,
      title,
      description,
      tags,
      categoryId,
      privacyStatus,
      scheduledTime,
      madeForKids
    } = uploadData;

    // Get OAuth client for the channel
    const auth = await channelsManager.getOAuthClient(channelId);

    // Create YouTube service
    const youtube = google.youtube({ version: 'v3', auth });

    // Get file size
    const fileSize = fs.statSync(videoPath).size;

    // Prepare video metadata
    const videoMetadata = {
      snippet: {
        title: title,
        description: description || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        categoryId: categoryId || '22'
      },
      status: {
        privacyStatus: privacyStatus || 'private',
        selfDeclaredMadeForKids: madeForKids || false
      }
    };

    // Add scheduled publish time if provided
    if (scheduledTime) {
      videoMetadata.status.publishAt = new Date(scheduledTime).toISOString();
    }

    // Upload video
    const response = await youtube.videos.insert(
      {
        part: 'snippet,status',
        requestBody: videoMetadata,
        media: {
          body: fs.createReadStream(videoPath)
        }
      },
      {
        onUploadProgress: (evt) => {
          const progress = Math.round((evt.bytesRead / fileSize) * 100);
          if (progressCallback) {
            progressCallback({
              progress,
              bytesRead: evt.bytesRead,
              totalBytes: fileSize
            });
          }
        }
      }
    );

    return {
      success: true,
      videoId: response.data.id,
      videoUrl: `https://www.youtube.com/watch?v=${response.data.id}`,
      message: 'อัพโหลดวิดีโอสำเร็จ!'
    };
  } catch (error) {
    console.error('Upload error:', error);

    let errorMessage = 'เกิดข้อผิดพลาดในการอัพโหลด';

    if (error.code === 'ENOENT') {
      errorMessage = 'ไม่พบไฟล์วิดีโอ';
    } else if (error.message.includes('invalid_grant')) {
      errorMessage = 'โทเค็นหมดอายุ กรุณาเชื่อมต่อช่องใหม่';
    } else if (error.message.includes('quotaExceeded')) {
      errorMessage = 'ใช้โควต้า API เกินกำหนด กรุณาลองใหม่ในภายหลัง';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage
    };
  }
}

// Validate video file
function validateVideoFile(filePath) {
  const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      message: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์วิดีโอที่รองรับ'
    };
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      message: 'ไม่พบไฟล์วิดีโอ'
    };
  }

  // Check file size (max 256GB for YouTube)
  const fileSize = fs.statSync(filePath).size;
  const maxSize = 256 * 1024 * 1024 * 1024; // 256GB in bytes

  if (fileSize > maxSize) {
    return {
      valid: false,
      message: 'ไฟล์วิดีโอมีขนาดใหญ่เกิน 256GB'
    };
  }

  if (fileSize === 0) {
    return {
      valid: false,
      message: 'ไฟล์วิดีโอมีขนาด 0 ไบต์'
    };
  }

  return {
    valid: true,
    message: 'ไฟล์วิดีโอถูกต้อง'
  };
}

module.exports = {
  uploadVideo,
  validateVideoFile
};

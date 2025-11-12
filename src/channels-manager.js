const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { app, shell } = require('electron');
const http = require('http');
const url = require('url');

// Path to store channels data
const CHANNELS_FILE = path.join(app.getPath('userData'), 'channels.json');
const CREDENTIALS_DIR = path.join(app.getPath('userData'), 'credentials');

// Initialize directories
async function initDirectories() {
  try {
    await fs.mkdir(CREDENTIALS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Get all channels
async function getChannels() {
  try {
    await initDirectories();
    const data = await fs.readFile(CHANNELS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Save channels
async function saveChannels(channels) {
  await fs.writeFile(CHANNELS_FILE, JSON.stringify(channels, null, 2));
}

// Start local OAuth callback server
function startOAuthCallbackServer(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const queryObject = url.parse(req.url, true).query;

        if (queryObject.code) {
          // Send success response to browser
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>การยืนยันตัวตนสำเร็จ</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f5f5f5;
                }
                .container {
                  text-align: center;
                  background: white;
                  padding: 3rem;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .success {
                  color: #16a34a;
                  font-size: 4rem;
                  margin-bottom: 1rem;
                }
                h1 {
                  color: #dc2626;
                  margin-bottom: 0.5rem;
                }
                p {
                  color: #737373;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success">✓</div>
                <h1>การยืนยันตัวตนสำเร็จ!</h1>
                <p>คุณสามารถปิดหน้าต่างนี้และกลับไปที่แอปพลิเคชันได้</p>
              </div>
            </body>
            </html>
          `);

          // Get tokens from code
          const { tokens } = await oAuth2Client.getToken(queryObject.code);
          oAuth2Client.setCredentials(tokens);

          server.close();
          resolve({ oAuth2Client, tokens });
        } else if (queryObject.error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>การยืนยันตัวตนล้มเหลว</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f5f5f5;
                }
                .container {
                  text-align: center;
                  background: white;
                  padding: 3rem;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .error {
                  color: #dc2626;
                  font-size: 4rem;
                  margin-bottom: 1rem;
                }
                h1 {
                  color: #dc2626;
                  margin-bottom: 0.5rem;
                }
                p {
                  color: #737373;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="error">✕</div>
                <h1>การยืนยันตัวตนล้มเหลว</h1>
                <p>กรุณาลองใหม่อีกครั้ง</p>
              </div>
            </body>
            </html>
          `);

          server.close();
          reject(new Error('การยืนยันตัวตนถูกยกเลิก'));
        }
      } catch (error) {
        server.close();
        reject(error);
      }
    });

    // Listen on port 3000
    server.listen(3000, () => {
      console.log('OAuth callback server listening on port 3000');
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('หมดเวลารอการยืนยันตัวตน'));
    }, 5 * 60 * 1000);
  });
}

// Authenticate with Google OAuth
async function authenticateWithGoogle(credentialsPath) {
  const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
  const credentials = JSON.parse(credentialsContent);

  const { client_secret, client_id } = credentials.installed || credentials.web;

  // Use localhost:3000 as redirect URI
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3000'
  );

  // Generate auth URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ],
    prompt: 'consent'
  });

  // Open auth URL in default browser
  await shell.openExternal(authUrl);

  // Wait for OAuth callback
  const { oAuth2Client: authenticatedClient, tokens } = await startOAuthCallbackServer(oAuth2Client);

  return { oAuth2Client: authenticatedClient, tokens };
}

// Get channel info
async function getChannelInfo(auth) {
  const youtube = google.youtube({ version: 'v3', auth });

  const response = await youtube.channels.list({
    part: 'snippet,contentDetails,statistics',
    mine: true
  });

  if (response.data.items.length === 0) {
    throw new Error('ไม่พบช่อง YouTube');
  }

  const channel = response.data.items[0];
  return {
    id: channel.id,
    name: channel.snippet.title,
    customUrl: channel.snippet.customUrl || '',
    thumbnailUrl: channel.snippet.thumbnails.default.url,
    statistics: {
      subscriberCount: channel.statistics.subscriberCount || '0',
      videoCount: channel.statistics.videoCount || '0',
      viewCount: channel.statistics.viewCount || '0'
    }
  };
}

// Add new channel
async function addChannel(credentialsPath) {
  try {
    await initDirectories();

    // Read and validate credentials
    const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
    const credentials = JSON.parse(credentialsContent);

    // Create unique filename for this channel's credentials
    const timestamp = Date.now();
    const newCredentialsPath = path.join(
      CREDENTIALS_DIR,
      `credentials_${timestamp}.json`
    );
    const tokensPath = path.join(CREDENTIALS_DIR, `tokens_${timestamp}.json`);

    // Copy credentials to app data directory
    await fs.writeFile(newCredentialsPath, credentialsContent);

    // Authenticate with Google OAuth (this will open browser)
    const { oAuth2Client, tokens } = await authenticateWithGoogle(newCredentialsPath);

    // Save tokens
    await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2));

    // Get channel info from YouTube
    const channelInfo = await getChannelInfo(oAuth2Client);

    // Get existing channels
    const channels = await getChannels();

    // Check if channel already exists
    const existingChannel = channels.find(c => c.id === channelInfo.id);
    if (existingChannel) {
      // Remove the credentials file we just created
      await fs.unlink(newCredentialsPath);
      await fs.unlink(tokensPath);

      return {
        success: false,
        message: 'ช่องนี้ถูกเพิ่มไว้แล้ว'
      };
    }

    // Create channel data
    const channelData = {
      id: channelInfo.id,
      name: channelInfo.name,
      customUrl: channelInfo.customUrl,
      thumbnailUrl: channelInfo.thumbnailUrl,
      statistics: channelInfo.statistics,
      credentialsPath: newCredentialsPath,
      tokensPath: tokensPath,
      addedAt: new Date().toISOString(),
      authenticated: true
    };

    channels.push(channelData);
    await saveChannels(channels);

    return {
      success: true,
      channel: channelData,
      message: 'เพิ่มช่องสำเร็จ!'
    };
  } catch (error) {
    console.error('Error adding channel:', error);

    let errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มช่อง';

    if (error.message.includes('หมดเวลา')) {
      errorMessage = 'หมดเวลารอการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง';
    } else if (error.message.includes('ยกเลิก')) {
      errorMessage = 'การยืนยันตัวตนถูกยกเลิก';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage
    };
  }
}

// Remove channel
async function removeChannel(channelId) {
  try {
    const channels = await getChannels();
    const channelIndex = channels.findIndex(c => c.id === channelId);

    if (channelIndex === -1) {
      return {
        success: false,
        message: 'ไม่พบช่องที่ต้องการลบ'
      };
    }

    const channel = channels[channelIndex];

    // Remove credentials and tokens files
    try {
      if (channel.credentialsPath) {
        await fs.unlink(channel.credentialsPath);
      }
      if (channel.tokensPath) {
        await fs.unlink(channel.tokensPath);
      }
    } catch (error) {
      console.error('Error deleting files:', error);
    }

    // Remove from channels list
    channels.splice(channelIndex, 1);
    await saveChannels(channels);

    return {
      success: true,
      message: 'ลบช่องสำเร็จ'
    };
  } catch (error) {
    console.error('Error removing channel:', error);
    return {
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการลบช่อง'
    };
  }
}

// Get OAuth client for a channel
async function getOAuthClient(channelId) {
  const channels = await getChannels();
  const channel = channels.find(c => c.id === channelId);

  if (!channel) {
    throw new Error('ไม่พบช่องที่ระบุ');
  }

  const credentialsContent = await fs.readFile(channel.credentialsPath, 'utf-8');
  const credentials = JSON.parse(credentialsContent);

  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Load tokens if they exist
  try {
    const tokensContent = await fs.readFile(channel.tokensPath, 'utf-8');
    const tokens = JSON.parse(tokensContent);
    oAuth2Client.setCredentials(tokens);
  } catch (error) {
    console.error('No tokens found for channel:', channelId);
  }

  return oAuth2Client;
}

// Save tokens for a channel
async function saveTokens(channelId, tokens) {
  const channels = await getChannels();
  const channel = channels.find(c => c.id === channelId);

  if (!channel) {
    throw new Error('ไม่พบช่องที่ระบุ');
  }

  await fs.writeFile(channel.tokensPath, JSON.stringify(tokens, null, 2));
}

// Complete authentication for pending channel
async function completeChannelAuth(channelId) {
  try {
    const channels = await getChannels();
    const channelIndex = channels.findIndex(c => c.id === channelId);

    if (channelIndex === -1) {
      return {
        success: false,
        message: 'ไม่พบช่องที่ระบุ'
      };
    }

    const channel = channels[channelIndex];

    if (channel.authenticated) {
      return {
        success: false,
        message: 'ช่องนี้ได้รับการยืนยันแล้ว'
      };
    }

    // Authenticate with Google OAuth
    const { oAuth2Client, tokens } = await authenticateWithGoogle(channel.credentialsPath);

    // Save tokens
    await fs.writeFile(channel.tokensPath, JSON.stringify(tokens, null, 2));

    // Get channel info from YouTube
    const channelInfo = await getChannelInfo(oAuth2Client);

    // Update channel data
    channels[channelIndex].id = channelInfo.id;
    channels[channelIndex].name = channelInfo.name;
    channels[channelIndex].customUrl = channelInfo.customUrl;
    channels[channelIndex].thumbnailUrl = channelInfo.thumbnailUrl;
    channels[channelIndex].statistics = channelInfo.statistics;
    channels[channelIndex].authenticated = true;
    channels[channelIndex].lastUpdated = new Date().toISOString();

    await saveChannels(channels);

    return {
      success: true,
      channel: channels[channelIndex],
      message: 'ยืนยันตัวตนสำเร็จ!'
    };
  } catch (error) {
    console.error('Error completing authentication:', error);

    let errorMessage = 'เกิดข้อผิดพลาดในการยืนยันตัวตน';

    if (error.message.includes('หมดเวลา')) {
      errorMessage = 'หมดเวลารอการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง';
    } else if (error.message.includes('ยกเลิก')) {
      errorMessage = 'การยืนยันตัวตนถูกยกเลิก';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage
    };
  }
}

// Refresh channel data (update statistics)
async function refreshChannelData(channelId) {
  try {
    const channels = await getChannels();
    const channelIndex = channels.findIndex(c => c.id === channelId);

    if (channelIndex === -1) {
      return {
        success: false,
        message: 'ไม่พบช่องที่ระบุ'
      };
    }

    // Get OAuth client for the channel
    const auth = await getOAuthClient(channelId);

    // Get updated channel info
    const channelInfo = await getChannelInfo(auth);

    // Update channel data
    channels[channelIndex].name = channelInfo.name;
    channels[channelIndex].customUrl = channelInfo.customUrl;
    channels[channelIndex].thumbnailUrl = channelInfo.thumbnailUrl;
    channels[channelIndex].statistics = channelInfo.statistics;
    channels[channelIndex].lastUpdated = new Date().toISOString();

    await saveChannels(channels);

    return {
      success: true,
      channel: channels[channelIndex],
      message: 'อัพเดทข้อมูลช่องสำเร็จ'
    };
  } catch (error) {
    console.error('Error refreshing channel:', error);
    return {
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลช่อง'
    };
  }
}

module.exports = {
  getChannels,
  addChannel,
  removeChannel,
  getOAuthClient,
  saveTokens,
  authenticateWithGoogle,
  getChannelInfo,
  refreshChannelData,
  completeChannelAuth
};

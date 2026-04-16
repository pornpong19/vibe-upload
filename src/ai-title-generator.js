const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'ai-settings.json');
}

async function loadSettings() {
  try {
    const data = await fs.readFile(getSettingsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveSettings(settings) {
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2));
}

async function saveApiKey(apiKey) {
  const settings = await loadSettings();
  settings.geminiApiKey = apiKey;
  await saveSettings(settings);
}

async function getApiKey() {
  const settings = await loadSettings();
  return settings.geminiApiKey || '';
}

/**
 * Generate AI titles for YouTube videos
 * @param {string} apiKey - Gemini API Key
 * @param {string} topic - Topic/theme for the titles
 * @param {Array} videoInfos - Array of { fileName, number } objects
 * @param {string} volEpType - "Vol." or "EP."
 * @param {string} position - "front" or "back"
 * @param {Array} languages - Array of language strings e.g. ["ไทย", "English", "한국어"]
 * @param {Array} requiredWords - Array of words that must appear in every title
 * @returns {Array} Array of generated titles
 */
async function generateTitles(apiKey, topic, videoInfos, volEpType, position, languages, requiredWords) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const videoCount = videoInfos.length;

  // Calculate the longest Vol/EP string to determine max content length
  let longestVolEp = 0;
  videoInfos.forEach(info => {
    const volEpStr = `${volEpType}${info.number || '1'}`;
    if (volEpStr.length > longestVolEp) {
      longestVolEp = volEpStr.length;
    }
  });

  // Max content length: 100 total - vol/ep length - 1 (space)
  const maxContentLength = 100 - longestVolEp - 1;

  // Build language instruction
  const langList = languages && languages.length > 0 ? languages.join(', ') : 'ไทย';
  const langInstruction = languages && languages.length > 1
    ? `ชื่อต้องผสมภาษาต่อไปนี้: ${langList} (ใช้หลายภาษาในชื่อเดียวกันได้)`
    : `ชื่อต้องเป็นภาษา${langList}`;

  // Build required words instruction
  const requiredWordsInstruction = requiredWords && requiredWords.length > 0
    ? `\n8. ทุกชื่อต้องมีคำว่า "${requiredWords.join('" และ "')}" อยู่ในชื่อด้วยเสมอ`
    : '';

  const prompt = `คุณเป็นผู้เชี่ยวชาญในการตั้งชื่อวิดีโอ YouTube ที่ดึงดูดผู้ชม

สร้างชื่อวิดีโอ YouTube จำนวน ${videoCount} ชื่อ

หัวข้อ: ${topic}

กฎสำคัญ:
1. แต่ละชื่อต้องมีความยาวไม่เกิน ${maxContentLength} ตัวอักษร
2. ${langInstruction}
3. ชื่อต้องน่าสนใจ ดึงดูดให้คนอยากคลิกดู
4. แต่ละชื่อต้องมีความหลากหลาย ไม่ซ้ำกัน
5. ห้ามใส่เครื่องหมายคำพูด ("") รอบชื่อ
6. ห้ามใส่ตัวเลขลำดับ (1. 2. 3.) หน้าชื่อ
7. ห้ามใส่ Vol. หรือ EP. ในชื่อ (ระบบจะเพิ่มให้เอง)${requiredWordsInstruction}

ตอบเป็นรายการ แต่ละบรรทัดเป็นชื่อ 1 ชื่อเท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม จำนวน ${videoCount} ชื่อ`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse the response - each line is a title
  const titles = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-'))
    // Remove leading numbers like "1. " or "1) " or "1: "
    .map(line => line.replace(/^\d+[\.\)\-\:\s]+\s*/, ''))
    // Remove surrounding quotes
    .map(line => line.replace(/^["'「『]|["'」』]$/g, ''))
    .filter(line => line.length > 0)
    .slice(0, videoCount);

  // Combine with Vol./EP. info
  const finalTitles = [];
  for (let i = 0; i < videoCount; i++) {
    const info = videoInfos[i];
    // Use the generated title or fallback to topic
    const title = titles[i] || titles[titles.length - 1] || topic;
    const volEpStr = `${volEpType}${info.number || (i + 1)}`;

    let finalTitle;
    if (position === 'front') {
      finalTitle = `${volEpStr} ${title}`;
    } else {
      finalTitle = `${title} ${volEpStr}`;
    }

    // Truncate if still too long
    if (finalTitle.length > 100) {
      const maxLen = 100 - volEpStr.length - 1;
      const truncatedTitle = title.substring(0, maxLen);
      if (position === 'front') {
        finalTitle = `${volEpStr} ${truncatedTitle}`;
      } else {
        finalTitle = `${truncatedTitle} ${volEpStr}`;
      }
    }

    finalTitles.push(finalTitle);
  }

  return finalTitles;
}

module.exports = { generateTitles, saveApiKey, getApiKey };

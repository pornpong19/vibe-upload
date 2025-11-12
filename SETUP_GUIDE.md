# คู่มือการตั้งค่า YouTube API สำหรับ Vibe Upload

คู่มือนี้จะแนะนำวิธีการตั้งค่า Google Cloud Console และ YouTube API เพื่อใช้งานกับโปรแกรม Vibe Upload

## ขั้นตอนที่ 1: สร้างโปรเจคใน Google Cloud Console

1. เปิดเบราว์เซอร์และไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. ล็อกอินด้วยบัญชี Google ของคุณ
3. คลิกที่เมนู **Select a project** ด้านบนซ้าย
4. คลิก **NEW PROJECT**
5. ตั้งชื่อโปรเจค เช่น "Vibe Upload"
6. คลิก **CREATE**
7. รอสักครู่จนโปรเจคถูกสร้างเสร็จ

## ขั้นตอนที่ 2: เปิดใช้งาน YouTube Data API v3

1. ในหน้า Dashboard ของโปรเจคที่สร้างไว้
2. ไปที่ **APIs & Services > Library** (จากเมนูด้านซ้าย)
3. ค้นหา "YouTube Data API v3"
4. คลิกที่ **YouTube Data API v3**
5. คลิก **ENABLE**
6. รอจนสถานะเปลี่ยนเป็น "API enabled"

## ขั้นตอนที่ 3: ตั้งค่า OAuth Consent Screen

1. ไปที่ **APIs & Services > OAuth consent screen**
2. เลือก **External** (สำหรับการใช้งานส่วนตัว)
3. คลิก **CREATE**
4. กรอกข้อมูลดังนี้:
   - **App name**: Vibe Upload (หรือชื่อที่คุณต้องการ)
   - **User support email**: อีเมลของคุณ
   - **Developer contact email**: อีเมลของคุณ
5. คลิก **SAVE AND CONTINUE**
6. ในหน้า **Scopes** ให้คลิก **SAVE AND CONTINUE** (ไม่ต้องเพิ่ม scope เพราะจะเพิ่มใน code)
7. ในหน้า **Test users** ให้เพิ่มอีเมล Google ของคุณ
   - คลิก **ADD USERS**
   - ใส่อีเมล Google ที่ใช้กับช่อง YouTube ของคุณ
   - คลิก **ADD**
8. คลิก **SAVE AND CONTINUE**
9. ตรวจสอบข้อมูลและคลิก **BACK TO DASHBOARD**

## ขั้นตอนที่ 4: สร้าง OAuth 2.0 Client ID

1. ไปที่ **APIs & Services > Credentials**
2. คลิก **CREATE CREDENTIALS** ด้านบน
3. เลือก **OAuth client ID**
4. เลือก Application type: **Desktop app**
5. ตั้งชื่อ: "Vibe Upload Desktop Client" (หรือชื่อที่คุณต้องการ)
6. คลิก **CREATE**
7. จะมี popup แสดง Client ID และ Client Secret ขึ้นมา
8. **อย่ารีบปิด!** ให้ทำขั้นตอนถัดไปก่อน

## ขั้นตอนที่ 5: เพิ่ม Authorized Redirect URI (สำคัญมาก!)

1. คลิก **OK** เพื่อปิด popup
2. ในหน้า Credentials จะเห็น OAuth 2.0 Client IDs ที่สร้างไว้
3. คลิกที่ **ชื่อ client** ที่เพิ่งสร้าง (ไม่ใช่คลิกไอคอนดาวน์โหลด)
4. ในหน้า Edit OAuth client ให้เลื่อนลงไปที่ **Authorized redirect URIs**
5. คลิก **ADD URI**
6. ใส่: `http://localhost:3000`
7. คลิก **SAVE** ด้านล่าง
8. รอจนเห็นข้อความ "OAuth client updated"

## ขั้นตอนที่ 6: ดาวน์โหลด credentials.json

1. กลับไปที่หน้า **Credentials** อีกครั้ง
2. ในส่วน **OAuth 2.0 Client IDs** ให้คลิกที่ **ไอคอนดาวน์โหลด** (รูปลูกศรชี้ลง)
3. ไฟล์ JSON จะถูกดาวน์โหลดลงเครื่องของคุณ
4. เปลี่ยนชื่อไฟล์เป็น `credentials.json` (ถ้ายังไม่ได้ตั้งชื่อ)

## ขั้นตอนที่ 7: เพิ่มช่องใน Vibe Upload

1. เปิดโปรแกรม Vibe Upload
2. คลิกปุ่ม **จัดการช่อง**
3. คลิกที่พื้นที่อัพโหลดและเลือกไฟล์ `credentials.json` ที่ดาวน์โหลดมา
4. คลิก **เชื่อมต่อและเพิ่มช่อง**
5. **เบราว์เซอร์จะเปิดขึ้นอัตโนมัติ** พร้อมหน้าการยืนยันตัวตนของ Google
6. เลือกบัญชี Google ที่เป็นเจ้าของช่อง YouTube
7. Google อาจแจ้งเตือนว่า "Google hasn't verified this app" - ให้คลิก **Advanced** แล้วคลิก **Go to [App Name] (unsafe)**
8. อนุญาตการเข้าถึงโดยคลิก **Allow**
9. เมื่อเห็นหน้า "การยืนยันตัวตนสำเร็จ!" ให้ปิดหน้าต่างเบราว์เซอร์
10. กลับมาที่โปรแกรม Vibe Upload จะเห็นช่อง YouTube ปรากฏในรายการ

## การแก้ปัญหา

### ปัญหา: "redirect_uri_mismatch"

**สาเหตุ**: ไม่ได้เพิ่ม `http://localhost:3000` ใน Authorized redirect URIs

**วิธีแก้**:
1. กลับไปที่ Google Cloud Console
2. ไปที่ Credentials และคลิกแก้ไข OAuth client
3. เพิ่ม `http://localhost:3000` ใน Authorized redirect URIs
4. Save และลองใหม่

### ปัญหา: "Access blocked: This app's request is invalid"

**สาเหตุ**: ไม่ได้เพิ่มตัวเองเป็น Test user ใน OAuth consent screen

**วิธีแก้**:
1. ไปที่ OAuth consent screen
2. เพิ่มอีเมล Google ของคุณใน Test users
3. Save และลองใหม่

### ปัญหา: "API not enabled"

**สาเหตุ**: ไม่ได้เปิดใช้งาน YouTube Data API v3

**วิธีแก้**:
1. ไปที่ APIs & Services > Library
2. ค้นหา YouTube Data API v3
3. คลิก Enable
4. ลองใหม่

### ปัญหา: "Daily Limit Exceeded"

**สาเหตุ**: ใช้โควต้า API เกินกำหนด (10,000 units/วัน)

**วิธีแก้**:
- รอจนถึงวันถัดไป (โควต้ารีเซ็ตตอน 00:00 PST)
- หรือขอเพิ่มโควต้าใน Google Cloud Console

## โควต้า YouTube API

- โควต้าฟรี: **10,000 units ต่อวัน**
- การอัพโหลด 1 วิดีโอ = **1,600 units**
- จำนวนวิดีโอที่อัพโหลดได้ต่อวัน: ประมาณ **6 วิดีโอ**

## ข้อควรระวัง

1. **อย่าแชร์ไฟล์ credentials.json** กับผู้อื่น
2. **อย่าอัพโหลด credentials.json** ขึ้น GitHub หรือที่สาธารณะ
3. **ใช้ Test mode** เมื่อพัฒนาและทดสอบ
4. **ตรวจสอบโควต้า** ก่อนอัพโหลดวิดีโอจำนวนมาก

## ทรัพยากรเพิ่มเติม

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

หากมีปัญหาหรือข้อสงสัย สามารถดูรายละเอียดเพิ่มเติมใน README.md

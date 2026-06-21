#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "base64.h"

// Audio Libraries
#include "AudioFileSourceHTTPStream.h"
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"

// ====== WiFi Config ======
const char* WIFI_SSID = "Mi";
const char* WIFI_PASS = "owen23178";

// ====== YOUR API URL ======
const char* SERVER_HOST = "10.85.230.85"; 
const int   SERVER_PORT = 8000;
String BASE_URL = "http://10.85.230.85:8000";

// Audio Objects
AudioOutputI2S* audioOut;
AudioFileSourceHTTPStream* audioFile;
AudioGeneratorMP3* mp3;

// ====== Pin Definitions ======
#define I2S_BCLK  21
#define I2S_LRCLK 22
#define I2S_DOUT  19

// เพิ่มขาปุ่ม
#define BUTTON_PIN 15

const char* DEVICE_ID = "GLASSES_001";  

void camera_setup() {
    Serial.println("[INIT] 📷 Initializing Camera...");
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0 = 34; config.pin_d1 = 13; config.pin_d2 = 14; config.pin_d3 = 35;
    config.pin_d4 = 39; config.pin_d5 = 38; config.pin_d6 = 37; config.pin_d7 = 36;
    config.pin_xclk = 4; config.pin_pclk = 25; config.pin_vsync = 5; config.pin_href = 27;
    config.pin_sccb_sda = 18; config.pin_sccb_scl = 23; config.pin_pwdn = -1; config.pin_reset = -1;
    
    config.xclk_freq_hz = 10000000; // 10MHz
    config.pixel_format = PIXFORMAT_JPEG;

    if (psramFound()) {
        config.frame_size = FRAMESIZE_SXGA; 
        config.jpeg_quality = 12;
        config.fb_count = 2;
        config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    } else {
        config.frame_size = FRAMESIZE_VGA;
        config.jpeg_quality = 12;
        config.fb_count = 1;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("❌ Camera Init Failed! Error: 0x%x\n", err);
        delay(1000);
        ESP.restart(); 
    }

    sensor_t * s = esp_camera_sensor_get();
    if(s){
        s->set_whitebal(s, 1);
        s->set_awb_gain(s, 1);
        s->set_wb_mode(s, 0); 
    }
    Serial.println("📷 Camera Ready!");
}

const char* b64_alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

String sendImageAndGetJobID() {
  Serial.println("\n[STEP 1] 📸 Capturing image...");
  
  camera_fb_t *fb = NULL;

  // --- ส่วนที่แก้ไข: ล้าง Buffer เก่าทิ้ง ---
  // วนลูปถ่ายภาพทิ้งไป 2-3 ใบเพื่อให้ได้ภาพปัจจุบันที่สุด
  for(int i = 0; i < 3; i++) {
      fb = esp_camera_fb_get();
      if(fb) {
          esp_camera_fb_return(fb); // คืนค่า Buffer ทันที (ถ่ายทิ้ง)
          fb = NULL;
      }
      delay(50); // หน่วงเวลาเล็กน้อยระหว่างเฟรม
  }
  // ------------------------------------

  // ถ่ายภาพจริงที่จะใช้งาน
  fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("❌ [ERROR] Camera capture failed!");
    return "";
  }

  if (!fb) {
    Serial.println("❌ [ERROR] Camera capture failed!");
    return "";
  }
  
  Serial.printf("   Image Size: %d bytes\n", fb->len);

  String macAddress = WiFi.macAddress(); 
  String fullDeviceId = String(DEVICE_ID) + "_" + macAddress; 

  size_t base64Len = ((fb->len + 2) / 3) * 4;
  
  String jsonHead = "{\"device_id\":\"" + fullDeviceId + "\",\"file\":\"data:image/jpeg;base64,";
  String jsonTail = "\"}";
  size_t totalLen = jsonHead.length() + base64Len + jsonTail.length();

  Serial.println("[STEP 2] 📤 Connecting to AI Server...");
  WiFiClient client;
  client.setTimeout(30000);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println("❌ Connection failed!");
    esp_camera_fb_return(fb);
    return "";
  }

  client.println("POST /detect?enable_speech=true HTTP/1.1");
  client.println("Host: " + String(SERVER_HOST) + ":" + String(SERVER_PORT));
  client.println("Content-Type: application/json");
  client.print("Content-Length: "); client.println(totalLen);
  client.println("Connection: close");
  client.println();

  client.print(jsonHead);
  
  uint8_t* input = fb->buf;
  size_t inputLen = fb->len;
  char outBuf[1024];
  int outIdx = 0;
  
  for (size_t i = 0; i < inputLen; i += 3) {
    uint32_t val = 0;
    int count = 0;
    val |= input[i] << 16; count++;
    if (i + 1 < inputLen) { val |= input[i + 1] << 8; count++; }
    if (i + 2 < inputLen) { val |= input[i + 2]; count++; }

    outBuf[outIdx++] = b64_alphabet[(val >> 18) & 0x3F];
    outBuf[outIdx++] = b64_alphabet[(val >> 12) & 0x3F];
    outBuf[outIdx++] = (count > 1) ? b64_alphabet[(val >> 6) & 0x3F] : '=';
    outBuf[outIdx++] = (count > 2) ? b64_alphabet[val & 0x3F] : '=';

    if (outIdx >= 1024) {
      client.write((const uint8_t*)outBuf, outIdx);
      outIdx = 0;
      if ((i % 10000) == 0) delay(1); 
    }
  }
  if (outIdx > 0) client.write((const uint8_t*)outBuf, outIdx);
  client.print(jsonTail);

  esp_camera_fb_return(fb);
  Serial.println("✓ Upload Complete! Waiting for response...");

  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 25000) {
      Serial.println("❌ Server Timeout!");
      client.stop(); return "";
    }
    delay(10);
  }

  String response = "";
  bool headerEnded = false;
  while(client.connected() || client.available()) {
    if (client.available()) {
      String line = client.readStringUntil('\n');
      if (line == "\r") headerEnded = true;
      else if (headerEnded) response += line;
    }
  }
  client.stop();

  DynamicJsonDocument doc(4096);
  deserializeJson(doc, response);
  
  if (doc.containsKey("detail")) {
     Serial.println("❌ API Error: " + doc["detail"].as<String>());
     return "";
  }

  if (doc.containsKey("job_id")) return doc["job_id"].as<String>();
  return "";
}

bool waitForJobDone(String job_id, String &speech) {
  Serial.println("\n[STEP 6] ⏳ Checking status...");
  HTTPClient http;
  int max_retries = 240; 
  
  for(int attempt=1; attempt <= max_retries; attempt++) { 
    http.begin(BASE_URL + "/status/" + job_id);
    int code = http.GET();
    if (code == 200) {
       String txt = http.getString();
       DynamicJsonDocument doc(2048);
       deserializeJson(doc, txt);
       
       String status = doc["status"].as<String>();
       if (status == "completed") {
         speech = doc["speech_text"].as<String>();
         Serial.println("\n✓ Job Completed: " + speech);
         http.end();
         return true;
       } else if (status == "failed") {
         Serial.println("\n❌ Job Failed.");
         http.end();
         return false;
       }
       Serial.print(".");
    }
    http.end();
    delay(2000); 
  }
  Serial.println("\n❌ Timeout!");
  return false;
}

void playAudioFromServer(String job_id) {
  Serial.println("💤 De-initializing Camera...");
  esp_camera_deinit(); 
  delay(500); 

  Serial.println("\n[STEP 7] 🔊 Requesting audio...");
  String url = BASE_URL + "/audio/" + job_id;
  
  pinMode(I2S_BCLK, OUTPUT); digitalWrite(I2S_BCLK, LOW);
  pinMode(I2S_LRCLK, OUTPUT); digitalWrite(I2S_LRCLK, LOW);
  pinMode(I2S_DOUT, OUTPUT); digitalWrite(I2S_DOUT, LOW);
  delay(100);

  audioOut = new AudioOutputI2S();
  audioOut->SetPinout(I2S_BCLK, I2S_LRCLK, I2S_DOUT);
  audioOut->SetGain(0.1); 

  audioFile = new AudioFileSourceHTTPStream();
  mp3 = new AudioGeneratorMP3();

  Serial.print("Connecting stream... ");
  if (audioFile->open(url.c_str())) {
      Serial.println("OK");
      
      int fileSize = audioFile->getSize();
      Serial.printf("📁 Audio File Size: %d bytes\n", fileSize);
      if (fileSize < 1000) { Serial.println("⚠️ File too small! Possible error."); }
      
      if (mp3->begin(audioFile, audioOut)) {
          Serial.println("♫ Playing...");
          unsigned long start = millis();
          int loopCount = 0;
          
          while (mp3->isRunning()) {
              if (!mp3->loop()) {
                  Serial.println("⚠️ MP3 Loop returned false");
                  mp3->stop(); break;
              }
              loopCount++;
              if (millis() - start > 60000) {
                  Serial.println("⏱️ Timeout!");
                  mp3->stop(); break;
              }
              yield();
          }
          unsigned long elapsed = millis() - start;
          Serial.printf("✓ Playback finished in %lu ms\n", elapsed);
      } else { Serial.println("❌ MP3 Begin Failed"); }
  } else { Serial.println("❌ Open URL Failed"); }

  audioFile->close();
  delete mp3; delete audioFile; delete audioOut;
  
  Serial.println("\n🔄 Job Finished. Restarting System to clear memory...");
  delay(2000);
  ESP.restart(); 
}

// ============================================
// ฟังก์ชันปิดเครื่องเข้าสู่โหมด Deep Sleep
// ============================================
void goToDeepSleep() {
  Serial.println("\n💤 POWERING OFF (Deep Sleep)...");
  
  // ปิด WiFi
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  
  // ตั้งค่าให้ปลุกเมื่อขา 34 มีสถานะ LOW (โดนกด)
  esp_sleep_enable_ext0_wakeup((gpio_num_t)BUTTON_PIN, 0); 
  
  delay(1000); 
  esp_deep_sleep_start();
}

// ============================================
// ฟังก์ชันรันกระบวนการถ่ายรูป -> ส่งข้อมูล -> เสียง
// ============================================
void processImageTask() {
  Serial.println("\n--- Starting New Process ---");
  String job_id = sendImageAndGetJobID();
  
  if (job_id != "") {
    String text_output;
    if (waitForJobDone(job_id, text_output)) {
      playAudioFromServer(job_id); // ข้างในนี้มี ESP.restart() อยู่แล้วเมื่อเล่นเสร็จ
    }
  }
  
  Serial.println("⚠️ Process Loop Failed. Restarting in 5s...");
  delay(5000);
  ESP.restart();
}

void setup() {
  Serial.begin(115200);
  
  // GPIO 34 เป็น Input Only สำหรับปุ่มบนบอร์ด TTGO 
  // (บอร์ดมี Pull-up ภายนอกอยู่แล้ว เมื่อปล่อย=HIGH เมื่อกด=LOW)
  pinMode(BUTTON_PIN, INPUT); 

  // ถ้าระบบเปิดขึ้นมาเพราะปุ่มถูกกดให้ตื่น (Wake from Deep Sleep)
  // ให้รอจนกว่าผู้ใช้จะ "ปล่อยปุ่ม" ก่อน เพื่อป้องกันไม่ให้คำสั่งลั่นซ้อนกัน
  if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_EXT0) {
      Serial.println("\n☀️ POWERED ON! Woke up from Deep Sleep.");
      while(digitalRead(BUTTON_PIN) == LOW) {
          delay(10); 
      }
      delay(500); // หน่วงเวลาอีกนิดกันสวิทช์เด้ง
  }

  Serial.print("\n📡 Connecting to " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n✓ Connected: " + WiFi.localIP().toString());
  
  camera_setup(); 
  Serial.println("\n==================================");
  Serial.println(" READY: Press 1 time to Capture ");
  Serial.println("        Hold 2 secs to Power OFF");
  Serial.println("==================================");
}

void loop() {
  // เมื่อตรวจพบว่าปุ่มถูกกด (LOW)
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // Debounce กันสัญญาณรบกวนสวิทช์
    
    if (digitalRead(BUTTON_PIN) == LOW) {
      unsigned long pressStart = millis();
      bool isLongPress = false;
      
      // วนลูปจับเวลาขณะที่ปุ่มยังถูกกดแช่ไว้
      while (digitalRead(BUTTON_PIN) == LOW) {
        if (millis() - pressStart >= 2000) { // หากกดค้างเกิน 2 วินาที
          isLongPress = true;
          break; // ออกจาก loop จับเวลา
        }
        delay(10);
      }
      
      if (isLongPress) {
        // --- ผู้ใช้กดค้าง ---
        Serial.println("\n🛑 Long Press Detected -> Shutting down...");
        // รอให้ปล่อยปุ่มก่อนเครื่องดับ
        while (digitalRead(BUTTON_PIN) == LOW) { delay(10); }
        Serial.println("ON/OFF");
        goToDeepSleep(); 
        
      } else {
        // --- ผู้ใช้กดสั้นๆ (ปล่อยก่อน 2 วิ) ---
        Serial.println("\n📸 Short Press Detected -> Taking Picture...");
        processImageTask(); 
      }
    }
  }
  
  delay(100); // ลดภาระ CPU ในโหมดรอคำสั่ง (Idle)
}
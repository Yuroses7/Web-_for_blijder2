"""
VisionAssist API - End-to-End Test Script
==========================================
ทดสอบ flow เต็มรูปแบบ: register -> login -> เช็ค device -> detect รูป -> รอผล -> ดึงผล -> ดาวน์โหลดเสียง

วิธีใช้:
    1. ติดตั้ง dependency (ถ้ายังไม่มี):
       pip install requests

    2. แก้ค่าตั้งต้นในส่วน CONFIG ด้านล่างให้ตรงกับเครื่องคุณ
       - แก้ IMAGE_PATH ให้ชี้ไปที่รูปจริงที่มีอยู่ในเครื่อง

    3. รัน:
       python test_visionassist_flow.py

หมายเหตุ:
    - Script นี้ไม่ใช้ async/threading ซับซ้อน เพื่อให้อ่าน flow ตามลำดับได้ง่าย
    - ถ้า username ซ้ำจากการรันครั้งก่อน ให้เปลี่ยน USERNAME ด้านล่าง หรือลบ user เดิมออกจาก DB ก่อน
"""

import sys
import time
import requests
from pathlib import Path

# ─── CONFIG ───────────────────────────────────────────────────────────
BASE_URL = "http://localhost:8000"

# เปลี่ยน username ทุกครั้งที่รันซ้ำ ถ้า endpoint register ไม่อนุญาตให้ username ซ้ำ
USERNAME = "Yuro6"
PASSWORD = "Yuro66"

REGISTER_PAYLOAD = {
    "username": USERNAME,
    "password": PASSWORD,
    "full_name": "Chayanan Ruaysup",
    "emergency_contact": "+66891234567",
    "disability_details": "ตาบอดความรัก",
    "device_serial": "Se66",
    "device_name": "Seeing Eyes Glass",
}

LOGIN_PAYLOAD = {
    "username": USERNAME,
    "password": PASSWORD,
}

DEVICE_SERIAL = REGISTER_PAYLOAD["device_serial"]

# แก้ path นี้ให้ชี้ไปที่รูปจริงในเครื่องคุณ
IMAGE_PATH = r"C:\Users\chaya\Downloads\ตลาด5.jpg"

# ตั้งเวลารอผลสูงสุด (วินาที) และความถี่ในการ poll สถานะ
MAX_WAIT_SECONDS = 60
POLL_INTERVAL_SECONDS = 2

# โฟลเดอร์สำหรับเก็บไฟล์เสียงที่ดาวน์โหลดมา
DOWNLOAD_DIR = Path("downloaded_audio")
DOWNLOAD_DIR.mkdir(exist_ok=True)


# ─── Helper ───────────────────────────────────────────────────────────
def print_step(step_num: int, title: str):
    print("\n" + "=" * 60)
    print(f"ขั้นที่ {step_num}: {title}")
    print("=" * 60)


def print_response(resp: requests.Response):
    print(f"Status code: {resp.status_code}")
    try:
        print("Response JSON:")
        print(resp.json())
    except ValueError:
        print("Response (raw, ไม่ใช่ JSON):", resp.text[:300])


def fail_and_exit(message: str):
    print(f"\n❌ หยุดการทดสอบ: {message}")
    sys.exit(1)


# ─── Step 1: Register ────────────────────────────────────────────────
def step1_register():
    print_step(1, "Register สมาชิกใหม่ (POST /auth/register)")
    resp = requests.post(f"{BASE_URL}/auth/register", json=REGISTER_PAYLOAD)
    print_response(resp)

    if resp.status_code == 200:
        print("✓ Register สำเร็จ")
    elif resp.status_code in (400, 409):
        # หลายระบบจะ return 400/409 ถ้า username ซ้ำ — ถือว่าไม่ critical
        # ผู้ใช้นี้อาจเคย register ไว้แล้วจากการรัน script ครั้งก่อน
        print("⚠️ Register ไม่สำเร็จ (อาจเพราะ username ซ้ำ) จะลอง login ต่อด้วย user เดิม")
    else:
        fail_and_exit(f"Register ล้มเหลวแบบไม่คาดคิด (status {resp.status_code})")


# ─── Step 2: Login ────────────────────────────────────────────────────
def step2_login() -> str:
    print_step(2, "Login เพื่อยืนยันตัวตน (POST /auth/login)")
    resp = requests.post(f"{BASE_URL}/auth/login", json=LOGIN_PAYLOAD)
    print_response(resp)

    if resp.status_code != 200:
        fail_and_exit(f"Login ล้มเหลว (status {resp.status_code})")

    data = resp.json()
    user_id = data.get("user_id")
    if not user_id:
        fail_and_exit("Login สำเร็จแต่ไม่พบ user_id ใน response — เช็ค field name ให้ตรงกับ API จริง")

    print(f"✓ Login สำเร็จ, user_id = {user_id}")
    return user_id


# ─── Step 3: เช็ค devices ─────────────────────────────────────────────
def step3_check_devices(user_id: str):
    print_step(3, f"ตรวจสอบ device ของ user_id={user_id} (GET /auth/devices/{{user_id}})")
    resp = requests.get(f"{BASE_URL}/auth/devices/{user_id}")
    print_response(resp)

    if resp.status_code != 200:
        print("⚠️ เช็ค device ไม่สำเร็จ แต่จะทดสอบขั้นต่อไปต่อ (ไม่ critical สำหรับ flow detect)")
        return

    devices = resp.json()
    found = any(
        (d.get("device_serial") == DEVICE_SERIAL) for d in devices
    ) if isinstance(devices, list) else False

    if found:
        print(f"✓ พบ device {DEVICE_SERIAL} ในรายการ")
    else:
        print(f"⚠️ ไม่พบ device {DEVICE_SERIAL} ในรายการ (ตรวจสอบ field name ของ response เพิ่มเติม)")


# ─── Step 4: Health check ────────────────────────────────────────────
def step4_health_check():
    print_step(4, "เช็คสถานะระบบก่อน detect (GET /health)")
    resp = requests.get(f"{BASE_URL}/health")
    print_response(resp)

    if resp.status_code != 200:
        fail_and_exit("Health check ล้มเหลว — เช็คว่า server รันอยู่หรือไม่")

    data = resp.json()
    if not data.get("models_loaded"):
        fail_and_exit("models_loaded = false — YOLO ยังโหลดไม่สำเร็จ, แก้ตรงนี้ก่อน detect")

    print("✓ models_loaded = true, พร้อม detect")
    if not data.get("depth_available"):
        print("ℹ️ depth_available = false (Depth Pro ปิดอยู่ — ใช้ระยะแบบประมาณแทน ไม่ critical)")


# ─── Step 5: Post รูปเพื่อ detect ─────────────────────────────────────
def step5_detect_image() -> str:
    print_step(5, "Post รูปเพื่อ detect (POST /detectpostman)")

    image_path = Path(IMAGE_PATH)
    if not image_path.exists():
        fail_and_exit(
            f"ไม่พบไฟล์รูป '{IMAGE_PATH}' — แก้ตัวแปร IMAGE_PATH ใน script ให้ชี้ไปที่รูปจริงในเครื่องคุณ"
        )

    with open(image_path, "rb") as f:
        files = {"file": (image_path.name, f, "image/jpeg")}
        params = {
            "enable_speech": "true",
            "device_serial": DEVICE_SERIAL,
        }
        resp = requests.post(f"{BASE_URL}/detectpostman", files=files, params=params)

    print_response(resp)

    if resp.status_code != 200:
        fail_and_exit(f"Detect request ล้มเหลว (status {resp.status_code})")

    job_id = resp.json().get("job_id")
    if not job_id:
        fail_and_exit("ไม่พบ job_id ใน response")

    print(f"✓ ส่งรูปสำเร็จ, job_id = {job_id}")
    return job_id


# ─── Step 6: รอจน completed ───────────────────────────────────────────
def step6_wait_for_completion(job_id: str) -> dict:
    print_step(6, f"เช็คสถานะ job {job_id} จนกว่าจะ completed (GET /status/{{job_id}})")

    waited = 0
    while waited < MAX_WAIT_SECONDS:
        resp = requests.get(f"{BASE_URL}/status/{job_id}")
        if resp.status_code != 200:
            fail_and_exit(f"เช็ค status ล้มเหลว (status code {resp.status_code})")

        data = resp.json()
        status = data.get("status")
        progress = data.get("progress", 0)
        print(f"  [{waited}s] status={status}, progress={progress}%")

        if status == "completed":
            print("✓ Job เสร็จสมบูรณ์")
            return data
        if status == "failed":
            error_msg = data.get("error", "ไม่มีรายละเอียด error")
            fail_and_exit(f"Job ล้มเหลว: {error_msg}")

        time.sleep(POLL_INTERVAL_SECONDS)
        waited += POLL_INTERVAL_SECONDS

    fail_and_exit(f"รอเกิน {MAX_WAIT_SECONDS} วินาทีแล้วยังไม่ completed — เช็ค log ฝั่ง server")


# ─── Step 7: ดูผลการตรวจจับ ───────────────────────────────────────────
def step7_get_result(job_id: str):
    print_step(7, f"ดูผลการตรวจจับ (GET /result/{{job_id}})")
    resp = requests.get(f"{BASE_URL}/result/{job_id}")
    print_response(resp)

    if resp.status_code != 200:
        fail_and_exit(f"ดึงผลล้มเหลว (status {resp.status_code})")

    data = resp.json()
    results = data.get("results", [])
    speech_text = data.get("speech_text")

    print(f"\nจำนวนวัตถุที่ตรวจพบ: {len(results)}")
    for obj in results:
        print(f"  - {obj.get('label')} ระยะ {obj.get('distance')} {obj.get('distance_unit')} "
              f"ตำแหน่ง {obj.get('position')} (วิธีวัดระยะ: {obj.get('depth_model')})")
    print(f"\nข้อความเสียงที่สร้าง: {speech_text}")


# ─── Step 8: ดาวน์โหลดเสียง ───────────────────────────────────────────
def step8_download_audio(job_id: str):
    print_step(8, f"ดาวน์โหลดไฟล์เสียง (GET /audio/{{job_id}})")
    resp = requests.get(f"{BASE_URL}/audio/{job_id}")

    if resp.status_code != 200:
        print(f"⚠️ ดาวน์โหลดเสียงไม่สำเร็จ (status {resp.status_code}) — "
              "อาจเป็นเพราะ enable_speech=false หรือ ffmpeg ไม่พร้อมในเครื่อง server")
        return

    out_path = DOWNLOAD_DIR / f"{job_id}.mp3"
    out_path.write_bytes(resp.content)
    print(f"✓ ดาวน์โหลดเสียงสำเร็จ -> {out_path.resolve()}")


# ─── Main ─────────────────────────────────────────────────────────────
def main():
    print(f"🚀 เริ่มทดสอบ VisionAssist API ที่ {BASE_URL}\n")

    step1_register()
    user_id = step2_login()
    step3_check_devices(user_id)
    step4_health_check()
    job_id = step5_detect_image()
    step6_wait_for_completion(job_id)
    step7_get_result(job_id)
    step8_download_audio(job_id)

    print("\n" + "=" * 60)
    print("🎉 ทดสอบ flow ครบทุกขั้นตอนแล้ว")
    print("=" * 60)


if __name__ == "__main__":
    main()

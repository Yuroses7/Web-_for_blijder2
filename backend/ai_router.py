from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from threading import Lock
import subprocess
from pathlib import Path
import uvicorn
import os
import cv2
import torch
import numpy as np
import json
import io
import contextlib
import uuid
import time
import base64
import re
import shutil
import warnings
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple, Any
from PIL import Image, ImageFile
from ultralytics.models import YOLO
from gtts import gTTS
import google.generativeai as genai
import asyncio

# ✅ import database
from database import database
from models import job_logs
from database import engine 
try:
    from depth_pro import create_model_and_transforms, load_rgb
    DEPTH_PRO_AVAILABLE = False
except ImportError:
    print("⚠️ depth_pro not installed, skipping...")
    create_model_and_transforms = None
    DEPTH_PRO_AVAILABLE = False

warnings.filterwarnings("ignore")

router = APIRouter(tags=["AI Detection"])

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
AUDIO_DIR  = Path("audio")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)

job_status: Dict[str, dict] = {}
job_status_lock = Lock()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

yolo_model:    Optional[Any] = None
depth_model:   Optional[Any] = None
depth_transform: Optional[Any] = None
gemini_model:  Optional[Any] = None

THAI_LABELS = {
    "person": "คน", "dog": "สุนัข", "cat": "แมว", "bird": "นก",
    "bicycle": "จักรยาน", "car": "รถยนต์", "motorcycle": "มอเตอร์ไซค์",
    "bus": "รถบัส", "truck": "รถบรรทุก", "traffic light": "ไฟจราจร",
    "stop sign": "ป้ายหยุด", "bench": "ม้านั่ง", "chair": "เก้าอี้",
    "couch": "โซฟา", "potted plant": "ต้นไม้กระถาง",
    "dining table": "โต๊ะอาหาร", "backpack": "กระเป้า",
    "handbag": "กระเป๋าถือ", "suitcase": "กระเป๋าเดินทาง",
    "umbrella": "ร่ม", "cell phone": "มือถือ", "bottle": "ขวด",
    "cup": "ถ้วย", "bowl": "ชาม", "refrigerator": "ตู้เย็น",
    "tv": "ทีวี", "laptop": "แล็ปท็อป", "book": "หนังสือ",
    "clock": "นาฬิกา", "banana": "กล้วย", "apple": "แอปเปิล",
    "orange": "ส้ม",
}

THAI_POSITIONS = {
    "far left": "ทางซ้ายสุด", "left": "ทางซ้าย", "center": "ตรงกลาง",
    "right": "ทางขวา", "far right": "ทางขวาสุด",
}

def number_to_thai(num: float) -> str:
    mapping = {
        0.5: "ครึ่ง", 1: "หนึ่ง", 1.5: "หนึ่งครึ่ง", 2: "สอง",
        2.5: "สองครึ่ง", 3: "สาม", 3.5: "สามครึ่ง", 4: "สี่",
        4.5: "สี่ครึ่ง", 5: "ห้า",
    }
    return mapping.get(num, f"{int(num)}")

def generate_enhanced_speech_text(detections, scene_analysis):
    place = ""
    if scene_analysis.get("status") == "success":
        desc = scene_analysis.get("analysis", {}).get("description", "").strip()
        if desc:
            place = desc.split("และ")[0].split(".")[0].strip()[:40]

    if not detections:
        return place if place else "ปลอดภัย"

    nearest  = min(detections, key=lambda x: x["distance"])
    label    = THAI_LABELS.get(nearest["label"], nearest["label"])
    distance = nearest["distance"]
    position = THAI_POSITIONS.get(nearest["position"], nearest["position"])

    if distance < 3.5:
        return (f"{place} ระวังมี{label} {position} {number_to_thai(distance)} เมตร ใกล้มาก"
                if place else
                f"ระวัง มี{label} {position} {number_to_thai(distance)} เมตร ใกล้มาก")
    else:
        return (f"{place} มี{label} {position} {number_to_thai(distance)} เมตร"
                if place else
                f"มี{label} {position} {number_to_thai(distance)} เมตร")

def create_speech_audio(text: str, job_id: str) -> str:
    temp_path  = None
    final_path = None
    try:
        temp_path  = AUDIO_DIR / f"{job_id}_temp.mp3"
        final_path = AUDIO_DIR / f"{job_id}_speech.mp3"
        tts = gTTS(text=text, lang='th', slow=False)
        tts.save(str(temp_path))

        ffmpeg_cmd = shutil.which("ffmpeg") or r"C:\ffmpeg\bin\ffmpeg.exe"
        print(f"🔍 ffmpeg: {ffmpeg_cmd}")

        result = subprocess.run([
            ffmpeg_cmd, '-i', str(temp_path),
            '-ar', '16000', '-ac', '1', '-b:a', '48k',
            '-codec:a', 'libmp3lame', '-q:a', '5', '-y', str(final_path)
        ], capture_output=True, text=True, timeout=30)
        if temp_path and temp_path.exists():
            temp_path.unlink()
        if not final_path.exists():
            raise Exception(f"FFmpeg failed: {result.stderr[:100]}")
        return str(final_path)
    except Exception as e:
        print(f"❌ Error creating speech: {e}")
        if temp_path and temp_path.exists():
            temp_path.unlink()
        return ""

def estimate_distance_depthpro(depth_map, box, img_shape):
    x1, y1, x2, y2 = box
    img_height, img_width = img_shape[:2]
    depth_h, depth_w = depth_map.shape
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    box_width = x2 - x1
    sample_points = [
        (cx, cy),
        (int(cx - box_width * 0.2), cy),
        (int(cx + box_width * 0.2), cy),
    ]
    distances = []
    for px, py in sample_points:
        dx = max(0, min(int(px * depth_w / img_width),  depth_w - 1))
        dy = max(0, min(int(py * depth_h / img_height), depth_h - 1))
        dist = depth_map[dy, dx]
        if 0.1 < dist < 50.0:
            distances.append(dist)
    return float(np.median(distances)) if distances else 5.0

def fallback_response(detections):
    if not detections:
        return {"status": "fallback", "analysis": {"description": "ปลอดภัย", "place": "บริเวณที่ปลอดภัย"}}
    person_count  = sum(1 for d in detections if d["label"] == "person")
    vehicle_count = sum(1 for d in detections if d["label"] in ["car","motorcycle","bus","truck"])
    if person_count >= 3:    place = "พื้นที่ที่มีคนหนาแน่น"
    elif vehicle_count >= 2: place = "ถนนที่มียานพาหนะ"
    elif person_count > 0:   place = "พื้นที่ที่มีคนเดิน"
    else:                    place = "พื้นที่โล่ง"
    return {"status": "fallback", "analysis": {"description": place, "place": place}}

def analyze_scene_with_ai(image_path, detections):
    global gemini_model
    if not gemini_model:
        return fallback_response(detections)
    try:
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
        genai.configure(api_key=GEMINI_API_KEY)
        image = Image.open(image_path).convert("RGB")
        if max(image.size) > 224:
            ratio = 224 / max(image.size)
            image = image.resize(
                (int(image.width * ratio), int(image.height * ratio)),
                Image.Resampling.BILINEAR
            )
        prompt = "จากภาพบอกทีที่ไหนคร่าวๆ เช่น ตลาดที่คนเยอะ ทางเดินที่มีหลุม ไม่พูดถึงสิ่งที่ชนไม่ได้ สั้นๆๆ เป็นภาษาไทย"
        response = gemini_model.generate_content(
            [prompt, image],
            generation_config=genai.GenerationConfig(temperature=0.3, max_output_tokens=750)
        )
        if response.candidates and response.candidates[0].content.parts:
            text = response.candidates[0].content.parts[0].text.strip()
            text = re.sub(r'\*\*|\*|__?|```|#{1,6}', '', text)
            text = re.sub(r'\s+', ' ', text).strip()
            return {"status": "success", "analysis": {
                "description": text,
                "place": text.split(".")[0] if "." in text else text,
            }}
    except Exception as e:
        print(f"⚠️ Gemini error: {e}")
    return fallback_response(detections)


def process_image(job_id: str, file_path: str, enable_speech: bool = True,
                  device_serial: str = "SE-2026-X00"):  # ✅ เพิ่ม device_serial
    global yolo_model, depth_model, depth_transform
    start_time = time.time()
    timing: Dict[str, float] = {}
    output: List[Dict[str, Any]] = []
    scene_analysis: Dict[str, Any] = {}
    audio_path: Optional[str] = None
    speech_text: Optional[str] = None
    output_path: Optional[Path] = None

    try:
        if yolo_model is None:
            raise RuntimeError("YOLO not loaded")

        with job_status_lock:
            job_status[job_id]["status"] = "processing"

        # Load image
        t = time.time()
        rgb_pil = Image.open(file_path).convert('RGB')
        max_dim = 320
        ow, oh = rgb_pil.size
        scale = 1.0
        if max(ow, oh) > max_dim:
            scale = max_dim / max(ow, oh)
            rgb_pil = rgb_pil.resize((int(ow*scale), int(oh*scale)), Image.Resampling.BILINEAR)
        img_rgb = np.array(rgb_pil)
        height, width = img_rgb.shape[:2]
        timing["image_loading"] = time.time() - t

        # YOLO
        with job_status_lock:
            job_status[job_id]["progress"] = 30
        t = time.time()
        results = yolo_model(
            img_rgb, device=device, verbose=False,
            conf=0.4, iou=0.5, max_det=10, imgsz=320,
            half=True if device.type == 'cuda' else False
        )[0]
        timing["yolo"] = time.time() - t

        # Depth
        with job_status_lock:
            job_status[job_id]["progress"] = 50
        t = time.time()
        if depth_model is not None and depth_transform is not None:
            transformed = depth_transform(rgb_pil)
            with torch.no_grad(), torch.inference_mode():
                if device.type == 'cuda':
                    with torch.cuda.amp.autocast():
                        predictions = depth_model.infer(transformed, f_px=None)
                else:
                    predictions = depth_model.infer(transformed, f_px=None)
            depth_map = predictions["depth"].cpu().numpy().squeeze()
            if depth_map.shape != (height, width):
                depth_map = cv2.resize(depth_map, (width, height), interpolation=cv2.INTER_LINEAR)
        else:
            # ✅ fallback ถ้าไม่มี Depth Pro
            depth_map = np.full((height, width), 5.0)
        timing["depth"] = time.time() - t

        # Process detections
        with job_status_lock:
            job_status[job_id]["progress"] = 70
        t = time.time()
        if hasattr(results, 'boxes') and results.boxes is not None:
            for idx, box in enumerate(results.boxes):
                cls_id     = int(box.cls)
                label      = yolo_model.names[cls_id] if hasattr(yolo_model, 'names') else f"obj_{cls_id}"
                confidence = float(box.conf)
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                if scale != 1.0:
                    x1,y1,x2,y2 = int(x1/scale),int(y1/scale),int(x2/scale),int(y2/scale)
                cx = (x1+x2)//2
                cy = (y1+y2)//2
                dist = estimate_distance_depthpro(depth_map, [x1,y1,x2,y2], (height,width))
                if label == 'person':               dist = max(0.5, min(dist, 25.0))
                elif label in ['car','truck','bus']: dist = max(1.0, min(dist, 50.0))
                else:                               dist = max(0.3, min(dist, 30.0))
                if dist < 2.0:    dist = round(dist*2)/2
                elif dist < 5.0:  dist = round(dist)
                elif dist < 10.0: dist = round(dist*2)/2
                else:             dist = round(dist/2)*2
                pos = ("far left" if cx < width*0.25 else "left" if cx < width*0.45
                       else "center" if cx < width*0.55 else "right" if cx < width*0.75
                       else "far right")
                output.append({
                    "id": idx+1, "label": label, "confidence": round(confidence,2),
                    "distance": round(dist,1), "distance_unit": "meters",
                    "position": pos, "box": [x1,y1,x2,y2], "center": [cx,cy],
                    "depth_model": "depth_pro" if depth_model else "fallback",
                })
        timing["processing"] = time.time() - t

        # Save image
        output_path = OUTPUT_DIR / f"{job_id}.jpg"
        shutil.copy(file_path, output_path)
        output = sorted(output, key=lambda x: x['distance'])

        # AI Scene
        if enable_speech and gemini_model:
            with job_status_lock:
                job_status[job_id]["progress"] = 85
            t = time.time()
            scene_analysis = analyze_scene_with_ai(file_path, output)
            timing["ai_scene"] = time.time() - t

        # Speech
        if enable_speech:
            with job_status_lock:
                job_status[job_id]["progress"] = 90
            t = time.time()
            speech_text = generate_enhanced_speech_text(output, scene_analysis)
            audio_path  = create_speech_audio(speech_text, job_id)
            timing["speech"] = time.time() - t

        total = time.time() - start_time

        with job_status_lock:
            job_status[job_id].update({
                "status": "completed", "progress": 100,
                "results": output, "audio_path": audio_path,
                "speech_text": speech_text, "scene_analysis": scene_analysis,
                "end_time": datetime.now().isoformat(),
                "output_image": str(output_path) if output_path else None,
                "timing": {"total_seconds": round(total,3),
                           "breakdown": {k: round(v,3) for k,v in timing.items()}},
            })

        # ✅ บันทึกลง database
        save_job_to_db(
            job_id=       job_id,
            device_serial=device_serial,
            status=       "completed",
            speech_text=  speech_text or "",
            image_path=   str(output_path) if output_path else "",
            audio_path=   audio_path or "",
        )

        print(f"✓ Job {job_id} done in {total:.2f}s")

    except Exception as e:
        total = time.time() - start_time
        with job_status_lock:
            job_status[job_id].update({
                "status": "failed", "error": str(e),
                "end_time": datetime.now().isoformat(),
                "timing": {"total_seconds": round(total,3)},
            })
        # ✅ บันทึก failed ลง database ด้วย
        
        save_job_to_db(
            job_id=       job_id,
            device_serial=device_serial,
            status=       "failed",
            speech_text=  str(e),
            image_path=   "",
            audio_path=   "",
        )
        print(f"✗ Job {job_id} failed: {e}")
    


def save_job_to_db(job_id: str, device_serial: str, status: str,
                   speech_text: str, image_path: str, audio_path: str):
    """บันทึก job log ลง database ด้วย sync SQLAlchemy (ปลอดภัยใน background thread)"""
    try:
        from database import engine
        from models import job_logs

        with engine.connect() as conn:
            existing = conn.execute(
                job_logs.select().where(job_logs.c.job_uuid == job_id)
            ).fetchone()
            if existing:
                return
            conn.execute(job_logs.insert().values(
                job_uuid=      job_id,
                device_serial= device_serial,
                status=        status,
                result_text=   speech_text or "",
                image_path=    image_path or None,
                audio_path=    audio_path or None,
            ))
            conn.commit()
        print(f"✓ Job {job_id} saved to DB")

    except Exception as e:
        print(f"❌ save_job_to_db error: {e}")

def load_models():
    global yolo_model, depth_model, depth_transform, gemini_model

    print("Loading YOLO...")
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        yolo_model = YOLO("yolov8n.pt").to(device)
    print("✓ YOLO loaded")

    print("Loading Depth Pro...")
    if DEPTH_PRO_AVAILABLE and create_model_and_transforms:
        try:
            model, transform = create_model_and_transforms(device=device, precision=torch.float16)
            if model and transform:
                depth_model = model
                depth_transform = transform
                depth_model.eval()
                if device.type == 'cuda':
                    depth_model = depth_model.half()
                    try:
                        compiled = torch.compile(depth_model, mode="reduce-overhead")
                        if compiled: depth_model = compiled
                    except: pass
                for p in depth_model.parameters():
                    p.requires_grad = False
                print("✓ Depth Pro loaded")
        except Exception as e:
            print(f"❌ Depth Pro error: {e}")
            depth_model = depth_transform = None
    else:
        print("❌ Depth Pro not available")

    print("Loading Gemini...")
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if key and key.startswith("AIza"):
        try:
            genai.configure(api_key=key)
            gemini_model = genai.GenerativeModel(
                model_name="gemini-flash-latest",
                generation_config=genai.GenerationConfig(temperature=0.4, max_output_tokens=500),
                safety_settings=[{"category": c, "threshold": "BLOCK_NONE"} for c in [
                    "HARM_CATEGORY_HARASSMENT","HARM_CATEGORY_HATE_SPEECH",
                    "HARM_CATEGORY_SEXUALLY_EXPLICIT","HARM_CATEGORY_DANGEROUS_CONTENT",
                ]],
            )
            test = gemini_model.generate_content("ตอบ: OK",
                generation_config=genai.GenerationConfig(max_output_tokens=10))
            if test.candidates:
                print(f"✓ Gemini loaded")
        except Exception as e:
            print(f"❌ Gemini error: {e}")
            gemini_model = None
    else:
        print("❌ GEMINI_API_KEY not found")

class ImagePayload(BaseModel):
    file: str

@router.post("/detect")
async def detect(payload: ImagePayload, enable_speech: bool = True,
                 device_serial: str = "SE-2026-X00",
                 background_tasks: BackgroundTasks = BackgroundTasks()):
    try:
        job_id = str(uuid.uuid4())
        base64_str = payload.file
        if "," in base64_str:
            _, base64_str = base64_str.split(",", 1)
        image_data = base64.b64decode(base64_str)
        file_path  = UPLOAD_DIR / f"{job_id}.jpg"
        with open(file_path, "wb") as f:
            f.write(image_data)
        job_status[job_id] = {
            "status": "queued", "progress": 0,
            "job_id": job_id, "created_time": datetime.now().isoformat(),
        }
        background_tasks.add_task(process_image, job_id, str(file_path), enable_speech, device_serial)
        return {"job_id": job_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detectpostman")
async def detect_postman(
    file: UploadFile = File(...),
    enable_speech: bool = True,
    device_serial: str = "SE-2026-X00",   # ✅ เพิ่ม param
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    try:
        job_id    = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())
        job_status[job_id] = {
            "status": "queued", "progress": 0,
            "job_id": job_id, "created_time": datetime.now().isoformat(),
        }
        background_tasks.add_task(process_image, job_id, str(file_path), enable_speech, device_serial)
        return {"job_id": job_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_status[job_id].copy()

@router.get("/result/{job_id}")
async def get_result(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    if job_status[job_id]["status"] != "completed":
        raise HTTPException(status_code=202, detail="Job still processing")
    return {
        "results":     job_status[job_id]["results"],
        "speech_text": job_status[job_id].get("speech_text"),
        "timing":      job_status[job_id].get("timing", {}),
    }

@router.get("/analysis/{job_id}")
async def get_analysis(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    if job_status[job_id]["status"] != "completed":
        raise HTTPException(status_code=202, detail="Job still processing")
    return {
        "job_id":           job_id,
        "scene_analysis":   job_status[job_id].get("scene_analysis", {}),
        "speech_text":      job_status[job_id].get("speech_text"),
        "total_detections": len(job_status[job_id]["results"]),
    }

@router.get("/audio/{job_id}")
async def get_audio(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    if job_status[job_id]["status"] != "completed":
        raise HTTPException(status_code=202, detail="Job still processing")
    audio_path = job_status[job_id].get("audio_path")
    if not audio_path or not Path(audio_path).exists():
        raise HTTPException(status_code=404, detail="Audio not available")
    return FileResponse(audio_path, media_type="audio/mpeg",
                        headers={"Content-Length": str(Path(audio_path).stat().st_size)})

@router.get("/image/{job_id}")
async def get_image(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    image_path = job_status[job_id].get("output_image")
    if not image_path or not Path(image_path).exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path, media_type="image/jpeg")

@router.get("/health")
async def health():
    return {
        "status": "healthy", "device": str(device),
        "models_loaded": yolo_model is not None,
        "depth_available": depth_model is not None,
        "gemini_available": gemini_model is not None,
    }

@router.delete("/cleanup")
async def cleanup():
    now = datetime.now()
    to_delete = [jid for jid, s in job_status.items()
                 if now - datetime.fromisoformat(s["created_time"]) > timedelta(hours=24)]
    for jid in to_delete:
        if "output_image" in job_status[jid]:
            Path(job_status[jid]["output_image"]).unlink(missing_ok=True)
        if "audio_path" in job_status[jid]:
            Path(job_status[jid]["audio_path"]).unlink(missing_ok=True)
        del job_status[jid]
    return {"deleted": len(to_delete)}
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional
from database import database
from models import users, devices, job_logs

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Schemas ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username:           str
    password:           str
    full_name:          str
    emergency_contact:  str
    disability_details: Optional[str] = None
    device_serial:      Optional[str] = None        # ✅ เพิ่ม
    device_name:        Optional[str] = "Seeing Eyes Glass"  # ✅ เพิ่ม

class LoginRequest(BaseModel):
    username: str
    password: str

# ─── Register ───────────────────────────────────────────────

@router.post("/register")
async def register(body: RegisterRequest):
    try:
        if len(body.username) < 4:
            raise HTTPException(status_code=400, detail="Username ต้องมีอย่างน้อย 4 ตัวอักษร")
        if len(body.password) < 6:
            raise HTTPException(status_code=400, detail="Password ต้องมีอย่างน้อย 6 ตัวอักษร")

        existing = await database.fetch_one(
            users.select().where(users.c.username == body.username)
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username นี้ถูกใช้แล้ว")

        # ✅ เช็ค device_serial ซ้ำก่อน
        if body.device_serial:
            existing_device = await database.fetch_one(
                devices.select().where(devices.c.device_serial == body.device_serial)
            )
            if existing_device:
                raise HTTPException(status_code=400, detail="Device Serial นี้ถูกใช้แล้ว")

        # บันทึก user
        user_id = await database.execute(users.insert().values(
            username=          body.username,
            password_hash=     pwd_context.hash(body.password[:72]),
            full_name=         body.full_name,
            emergency_contact= body.emergency_contact,
            disability_details=body.disability_details,
        ))

        # ✅ บันทึก device อัตโนมัติถ้ามี device_serial
        if body.device_serial:
            await database.execute(devices.insert().values(
                device_serial= body.device_serial,
                user_id=       user_id,
                device_name=   body.device_name or "Seeing Eyes Glass",
                is_active=     True,
            ))
            print(f"✓ Device {body.device_serial} linked to user {user_id}")

        return {"message": "สมัครสมาชิกสำเร็จ"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Login ──────────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginRequest):
    try:
        user = await database.fetch_one(
            users.select().where(users.c.username == body.username)
        )
        if not user or not pwd_context.verify(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Username หรือ Password ไม่ถูกต้อง")
        device = await database.fetch_one(
        devices.select().where(devices.c.user_id == user["user_id"]))
        return {
            "user_id":           user["user_id"],
            "username":          user["username"],
            "full_name":         user["full_name"],
            "emergency_contact": user["emergency_contact"],
            "disability_details":user["disability_details"],
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Users ──────────────────────────────────────────────────

@router.get("/users")
async def get_all_users():
    rows = await database.fetch_all(
        users.select().order_by(users.c.created_at.desc())
    )
    return [dict(r) for r in rows]

@router.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await database.fetch_one(
        users.select().where(users.c.user_id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบ user")
    return dict(user)

# ─── Devices ────────────────────────────────────────────────

class DeviceRequest(BaseModel):
    device_serial: str
    user_id:       int
    device_name:   str
    is_active:     bool = True

@router.post("/devices")
async def add_device(body: DeviceRequest):
    try:
        existing = await database.fetch_one(
            devices.select().where(devices.c.device_serial == body.device_serial)
        )
        if existing:
            raise HTTPException(status_code=400, detail="Device นี้ถูกเพิ่มแล้ว")

        await database.execute(devices.insert().values(
            device_serial=body.device_serial,
            user_id=      body.user_id,
            device_name=  body.device_name,
            is_active=    body.is_active,
        ))
        return {"message": "เพิ่มอุปกรณ์สำเร็จ"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{user_id}")
async def get_devices(user_id: int):
    rows = await database.fetch_all(
        devices.select().where(devices.c.user_id == user_id)
    )
    return [dict(r) for r in rows]

# ─── Job Logs ───────────────────────────────────────────────

@router.post("/logs/save")
async def save_log(
    job_uuid:      str,
    device_serial: str,
    status:        str,
    result_text:   str,
    image_path:    Optional[str] = None,
    audio_path:    Optional[str] = None,
):
    try:
        existing = await database.fetch_one(
            job_logs.select().where(job_logs.c.job_uuid == job_uuid)
        )
        if existing:
            return {"message": "log นี้มีอยู่แล้ว"}

        await database.execute(job_logs.insert().values(
            job_uuid=      job_uuid,
            device_serial= device_serial,
            status=        status,
            result_text=   result_text,
            image_path=    image_path,
            audio_path=    audio_path,
        ))
        return {"message": "บันทึก log สำเร็จ"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/{device_serial}")
async def get_logs(device_serial: str, limit: int = 20):
    rows = await database.fetch_all(
        job_logs.select()
        .where(job_logs.c.device_serial == device_serial)
        .order_by(job_logs.c.created_at.desc())
        .limit(limit)
    )
    return [dict(r) for r in rows]
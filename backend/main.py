from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

from database import database, engine, metadata
from auth import router as auth_router
from ai_router import router as ai_router, load_models

app = FastAPI(
    title="VisionAssist API",
    description="AI Object Detection + Database Backend",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ─────────────────────────────────────────
app.include_router(auth_router)   # /auth/register, /auth/login ...
app.include_router(ai_router)     # /detect, /status, /audio ...

# ─── Create DB Tables ─────────────────────────────────────────
metadata.create_all(engine)

# ─── Startup / Shutdown ───────────────────────────────────────
@app.on_event("startup")
async def startup():
    await database.connect()
    print("✓ Database connected")
    import ai_router
    ai_router.load_models()
    print(f"✓ yolo_model after load: {ai_router.yolo_model}")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()
    print("✓ Database disconnected")

# ─── Root ─────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "title": "VisionAssist API",
        "version": "3.0.0",
        "endpoints": {
            "auth":      ["/auth/register", "/auth/login", "/auth/users", "/auth/devices", "/auth/logs/save"],
            "detection": ["/detect", "/detectpostman", "/status/{id}", "/result/{id}", "/audio/{id}"],
            "docs":      "/docs",
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
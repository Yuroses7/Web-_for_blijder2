@echo off
echo ================================
echo  VisionAssist Setup Script
echo ================================

echo.
echo [1/4] Installing Python dependencies...
cd backend
pip install fastapi "uvicorn[standard]" python-multipart python-dotenv
pip install "databases[asyncpg]" sqlalchemy psycopg2-binary asyncpg
pip install "passlib[bcrypt]" bcrypt==4.0.1
pip install torch ultralytics opencv-python Pillow numpy
pip install gtts google-generativeai
pip install timm
echo Done Python dependencies!

echo.
echo [2/4] Installing Node dependencies...
cd ..
npm install
echo Done Node dependencies!

echo.
echo [3/4] Checking FFmpeg...
where ffmpeg >nul 2>&1
if %errorlevel% == 0 (
    echo FFmpeg found!
) else (
    echo FFmpeg NOT found!
    echo Please download from: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
    echo Extract to C:\ffmpeg and add C:\ffmpeg\bin to PATH
)

echo.
echo [4/4] Checking .env file...
if exist backend\.env (
    echo .env found!
) else (
    echo Creating .env template...
    echo DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/caregiver_system > backend\.env
    echo GEMINI_API_KEY=your_gemini_key_here >> backend\.env
    echo Please edit backend\.env with your actual credentials!
)

echo.
echo ================================
echo  Setup Complete!
echo  
echo  To run backend:
echo  cd backend
echo  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo  To run frontend:
echo  npx expo start
echo ================================
pause

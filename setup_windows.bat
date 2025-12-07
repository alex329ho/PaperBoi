@echo off
REM Automated setup script for PaperBoi on Windows (PowerShell recommended for running).

SETLOCAL ENABLEDELAYEDEXPANSION

where python >nul 2>&1 || (echo Python is required && exit /b 1)
where node >nul 2>&1 || (echo Node.js is required && exit /b 1)
where docker >nul 2>&1 || (echo Docker is required && exit /b 1)
where docker-compose >nul 2>&1 || (echo docker-compose is required && exit /b 1)

REM Create virtual environment
python -m venv .venv
CALL .venv\\Scripts\\activate.bat
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

REM Install mobile dependencies
cd mobile
npm install --legacy-peer-deps
cd ..

REM Copy env templates if missing
IF NOT EXIST backend\.env COPY backend\.env.example backend\.env
IF NOT EXIST mobile\.env COPY mobile\.env.example mobile\.env

docker-compose up -d db cache

echo Setup complete!
echo - Activate backend venv: .venv\\Scripts\\activate

echo - Start API locally: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend

echo - Start Expo app: cd mobile && npm start

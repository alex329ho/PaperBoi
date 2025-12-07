# PaperBoi Verification Checklist

Use this list after running `setup.sh` or `setup_windows.bat` to ensure everything works.

- [ ] Python 3.11+ installed (`python3 --version`).
- [ ] Node.js 18+ installed (`node --version`).
- [ ] Docker and docker-compose running (`docker ps`).
- [ ] Backend virtual environment created (`.venv` exists).
- [ ] Python dependencies installed (`pip show fastapi`).
- [ ] Mobile dependencies installed (`mobile/node_modules` exists).
- [ ] Environment files copied (`backend/.env`, `mobile/.env`).
- [ ] Containers started (`docker ps` shows `paperboi_db`, `paperboi_cache`).
- [ ] API health endpoint responds (`curl http://localhost:8000/healthz`).
- [ ] Readiness endpoint responds (`curl http://localhost:8000/ready`).
- [ ] Expo starts successfully (`cd mobile && npm start`).
- [ ] Verification script passes (`./scripts/verify_setup.sh`).

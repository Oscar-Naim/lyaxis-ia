# Iniciar el Backend en segundo plano
Write-Host "Iniciando Backend (FastAPI)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (!(Test-Path venv)) { python -m venv venv }; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn main:app --reload" -WindowStyle Normal

# Iniciar el Frontend
Write-Host "Iniciando Frontend (Vite)..." -ForegroundColor Magenta
cd frontend
npm install
npm run dev

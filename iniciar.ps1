$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el entorno Python.' }
}
& '.venv/Scripts/python.exe' -c 'import flask, requests, dotenv, langchain_openai'
if ($LASTEXITCODE -ne 0) {
    & '.venv/Scripts/python.exe' -m pip install -r requirements.lock
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
}
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
    Write-Host 'Completa SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en .env antes de continuar.'
    exit 1
}
Write-Host 'Abre http://127.0.0.1:5000/ ; Ctrl+C para detener.'
& '.venv/Scripts/python.exe' app.py

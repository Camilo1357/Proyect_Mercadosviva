import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException
from .database.client import APIError
from .routes.api import api
from .services.tourism import SearchState

ROOT = Path(__file__).resolve().parents[3]

def create_app(test_config=None):
    load_dotenv(ROOT / ".env")
    app = Flask(__name__, static_folder=None)
    app.config.update(
        SUPABASE_URL=os.getenv("SUPABASE_URL", ""),
        SUPABASE_PUBLISHABLE_KEY=os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
        APP_URL=os.getenv("APP_URL", "http://127.0.0.1:5000"),
        EXA_API_KEY=os.getenv("EXA_API_KEY", ""),
        OPENAI_API_KEY=os.getenv("OPENAI_API_KEY", ""),
        OPENAI_MODEL=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        MAX_CONTENT_LENGTH=65536,
    )
    if test_config:
        app.config.update(test_config)
    app.register_blueprint(api, url_prefix="/api")
    app.extensions["tourism_search"] = SearchState()
    app.extensions["photo_limits"] = SearchState(per_user=12, per_worker=60)

    @app.get("/")
    def index():
        return send_from_directory(ROOT / "frontend", "index.html")

    @app.get("/src/<path:filename>")
    def assets(filename):
        return send_from_directory(ROOT / "frontend" / "src", filename)

    @app.errorhandler(APIError)
    def api_error(exc):
        return jsonify(error=exc.message), exc.status

    @app.errorhandler(HTTPException)
    def http_error(exc):
        return jsonify(error="La solicitud no se pudo procesar." if exc.code != 404 else "No se encontró este recurso."), exc.code

    @app.errorhandler(Exception)
    def internal_error(exc):
        app.logger.exception("Unhandled request error")
        return jsonify(error="Ocurrió un error. Intenta de nuevo en un momento."), 500

    @app.after_request
    def headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        if response.mimetype == "application/json":
            response.headers["Cache-Control"] = "no-store"
        return response
    return app

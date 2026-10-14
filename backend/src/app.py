from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os

from config import Config
from utils.db import Database
from routes.trips import trips_bp
from routes.zones import zones_bp
from routes.insights import insights_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=Config.CORS_ORIGINS)

    db = Database(Config.DATABASE_URL)
    app.db = db

    app.register_blueprint(trips_bp, url_prefix='/api')
    app.register_blueprint(zones_bp, url_prefix='/api')
    app.register_blueprint(insights_bp, url_prefix='/api')

    @app.route('/api/health', methods=['GET'])
    def health():
        try:
            db.fetch_one("SELECT 1")
            return jsonify({'status': 'ok'}), 200
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad request', 'message': str(e)}), 400

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5001)

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "backend"})

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({
        "message": "Hello from Flask Backend!",
        "environment": os.getenv('ENVIRONMENT', 'development')
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 
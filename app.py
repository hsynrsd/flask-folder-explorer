import os
from datetime import datetime
from flask import Flask, jsonify, request, send_file, render_template
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from pathlib import Path
from mega import Mega

MEGA_EMAIL = os.getenv('MEGA_EMAIL')
MEGA_PASSWORD = os.getenv('MEGA_PASSWORD')

load_dotenv(override=True)

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'shared_files'
app.config['TOKEN'] = os.environ.get('TOKEN')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# Add debug print to verify
print(f"Token loaded from .env: '{app.config['TOKEN']}'")

if 'TOKEN' not in os.environ:
    raise ValueError("TOKEN not found in environment variables. Check your .env file")

@app.before_request
def check_token():
    if request.path.startswith('/api'):
        token = request.args.get('token')
        print(f"Received token: '{token}'")  # Debug output
        print(f"Expected token: '{app.config['TOKEN']}'")  # Debug output
        
        if token != app.config['TOKEN']:
            print("Token mismatch!")  # Debug output
            return jsonify({'error': 'Unauthorized'}), 401

@app.route('/debug/env')
def debug_env():
    return {
        'env_file_exists': Path('.env').exists(),
        'TOKEN_in_env': 'TOKEN' in os.environ,
        'TOKEN_value': os.environ.get('TOKEN'),
        'flask_config_token': app.config.get('TOKEN')
    }
    
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/files', methods=['GET'])
def list_files():
    files = []
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.isfile(file_path):
            stat = os.stat(file_path)
            files.append({
                'name': filename,
                'size': stat.st_size,
                'modification_date': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })
    return jsonify(files)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    filename = secure_filename(file.filename)
    temp_path = os.path.join('temp_uploads', filename)
    os.makedirs('temp_uploads', exist_ok=True)
    file.save(temp_path)
    
    try:
        mega = Mega()
        m = mega.login(MEGA_EMAIL, MEGA_PASSWORD)
        uploaded_file = m.upload(temp_path)
        
        os.remove(temp_path)  # Clean up
        return jsonify({
            'message': 'File uploaded to Mega.nz',
            'file_url': m.get_upload_link(uploaded_file)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.isfile(file_path):
        os.remove(file_path)
        return jsonify({'message': 'File deleted'}), 200
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/download/<filename>')
def download_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.isfile(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(host='0.0.0.0', port=5000, debug=True)
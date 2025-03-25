import os
from datetime import datetime
from flask import Flask, jsonify, request, send_file, render_template
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from pathlib import Path
from mega import Mega
from functools import wraps

# Load environment variables
load_dotenv(override=True)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'shared_files'
app.config['TOKEN'] = os.environ.get('TOKEN')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# Mega.nz configuration
MEGA_EMAIL = os.getenv('MEGA_EMAIL')
MEGA_PASSWORD = os.getenv('MEGA_PASSWORD')

# Ensure upload directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('temp_uploads', exist_ok=True)

def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header missing'}), 401
        
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return jsonify({'error': 'Bearer token malformed'}), 401
        
        if token != app.config['TOKEN']:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/verify-token', methods=['POST'])
def verify_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Authorization header missing'}), 401
    
    try:
        token = auth_header.split(' ')[1]
    except IndexError:
        return jsonify({'error': 'Bearer token malformed'}), 401
    
    if token != app.config['TOKEN']:
        return jsonify({'error': 'Invalid token'}), 401
    
    return jsonify({'message': 'Token is valid'}), 200

@app.route('/api/files', methods=['GET'])
@token_required
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
@token_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    filename = secure_filename(file.filename)
    temp_path = os.path.join('temp_uploads', filename)
    file.save(temp_path)
    
    try:
        # Upload to Mega.nz
        mega = Mega()
        m = mega.login(MEGA_EMAIL, MEGA_PASSWORD)
        uploaded_file = m.upload(temp_path)
        
        # Also save locally
        local_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        os.rename(temp_path, local_path)
        
        return jsonify({
            'message': 'File uploaded successfully',
            'file_url': m.get_upload_link(uploaded_file),
            'filename': filename
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route('/api/files/<filename>', methods=['DELETE'])
@token_required
def delete_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.isfile(file_path):
        os.remove(file_path)
        return jsonify({'message': 'File deleted'}), 200
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/download/<filename>')
@token_required
def download_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.isfile(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
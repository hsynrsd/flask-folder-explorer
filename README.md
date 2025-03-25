# File Sharing Application with MEGA.io Integration

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)
![MEGA](https://img.shields.io/badge/MEGA-API-orange.svg)

A secure file sharing web application that stores files both locally and on MEGA.io cloud storage, with user authentication and file management capabilities.

## Features

- **Secure Token Authentication** - JWT-based access control
- **Dual Storage System** - Files stored both locally and on MEGA.io
- **File Management** - Upload, download, and delete files
- **Responsive UI** - Clean interface with file icons and size formatting
- **Large File Support** - Supports files up to 500MB

## Prerequisites

- Python 3.8+
- MEGA.nz account (free tier sufficient)
- Basic understanding of environment variables

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/file-share-app.git
cd file-share-app
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file with your credentials:
```env
TOKEN=your_secure_jwt_token
MEGA_EMAIL=your@mega.email
MEGA_PASSWORD=your_mega_password
```

## Usage

1. Start the development server:
```bash
python app.py
```

2. Access the application at:
```
http://localhost:5000
```

3. Use the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application interface |
| `/api/verify-token` | POST | Verify authentication token |
| `/api/files` | GET | List all available files |
| `/api/upload` | POST | Upload new files |
| `/api/files/<filename>` | DELETE | Delete specific file |
| `/api/download/<filename>` | GET | Download specific file |

## Configuration

You can modify these settings in `app.py`:

```python
app.config['UPLOAD_FOLDER'] = 'shared_files'  # Local storage directory
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB upload limit
```

## Project Structure

```
file-share-app/
├── app.py                # Main application file
├── requirements.txt      # Python dependencies
├── .env                  # Environment variables
├── shared_files/         # Local file storage
├── temp_uploads/         # Temporary upload directory
├── static/
│   ├── icons/            # File type icons
│   └── styles.css        # Optional CSS
└── templates/
    └── index.html        # Frontend interface
```

## Troubleshooting

**MEGA API Errors:**
- Ensure your MEGA credentials are correct
- Check your API rate limits (free tier has limitations)
- Verify sufficient storage space in your MEGA account

**Local Storage Issues:**
- Check directory permissions for `shared_files/`
- Ensure disk space is available

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Future Improvements

- [ ] Add user registration system
- [ ] Implement file sharing links
- [ ] Add progress bars for uploads/downloads
- [ ] Support for file previews

---

**Note:** Always keep your `.env` file secure and never commit it to version control. Add it to your `.gitignore` file.

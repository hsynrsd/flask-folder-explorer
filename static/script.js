document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
        showLoginModal();
    } else {
        loadFiles();
    }
});

// Helper functions
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'],
        audio: ['mp3', 'wav', 'ogg', 'm4a'],
        video: ['mp4', 'mov', 'avi', 'mkv'],
        archive: ['zip', 'rar', 'tar', 'gz'],
        code: ['js', 'py', 'html', 'css', 'json', 'xml'],
        document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
    };

    for (const [type, exts] of Object.entries(iconMap)) {
        if (exts.includes(ext)) {
            // Use relative path or base URL
            return `${window.location.pathname.includes('index.html') ? '.' : ''}/static/icons/${type}.png`;
        }
    }
    return `${window.location.pathname.includes('index.html') ? '.' : ''}/static/icons/default.png`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showLoginModal(message = '') {
    if (message) {
        document.getElementById('login-message').textContent = message;
    }
    document.getElementById('login-modal').style.display = 'flex';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Event handlers
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = document.getElementById('token-input').value.trim();
    
    if (!token) {
        alert('Please enter a token');
        return;
    }
    
    // Verify token with server
    try {
        const response = await fetch('/api/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        sessionStorage.setItem('token', token);
        document.getElementById('login-modal').style.display = 'none';
        loadFiles();
    } catch (error) {
        alert('Invalid token. Please try again.');
        console.error('Login error:', error);
    }
});

document.getElementById('upload-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    const token = sessionStorage.getItem('token');
    
    if (!token) {
        showLoginModal('Please login to upload files');
        return;
    }

    if (!fileInput.files[0]) {
        showToast('Please select a file to upload', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            throw new Error(await response.text());
        }

        fileInput.value = '';
        await loadFiles();
        showToast('File uploaded successfully');
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
    }
});

// File operations
async function loadFiles() {
    const token = sessionStorage.getItem('token');
    if (!token) {
        showLoginModal();
        return;
    }

    try {
        const response = await fetch('/api/files', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            throw new Error('Failed to load files');
        }

        const files = await response.json();
        const tbody = document.getElementById('file-table-body');
        tbody.innerHTML = '';
        
        files.forEach(file => {
            const row = document.createElement('tr');
            const icon = getFileIcon(file.name);
            
            row.innerHTML = `
                <td>
                    <img src="${icon}" alt="File icon" class="file-icon">
                    <a href="#" onclick="downloadFile('${encodeURIComponent(file.name)}'); return false;">
                        ${file.name}
                    </a>
                </td>
                <td>${formatFileSize(file.size)}</td>
                <td>${file.modification_date}</td>
                <td><button onclick="deleteFile('${encodeURIComponent(file.name)}')">Delete</button></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Failed to load files', 'error');
    }
}

async function downloadFile(filename) {
    const token = sessionStorage.getItem('token');
    try {
        const response = await fetch(`/api/download/${filename}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download error:', error);
        showToast('Download failed', 'error');
    }
}

async function deleteFile(filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    const token = sessionStorage.getItem('token');
    try {
        // First delete from your server
        const deleteResponse = await fetch(`/api/files/${filename}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!deleteResponse.ok) {
            if (deleteResponse.status === 401) {
                handleSessionExpired();
                return;
            }
            throw new Error('Delete from server failed');
        }

        // Then delete from MEGA.io
        const megaDeleteResponse = await fetch('/api/mega/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ filename: filename })
        });

        if (!megaDeleteResponse.ok) {
            throw new Error('Delete from MEGA.io failed');
        }

        await loadFiles();
        showToast('File deleted successfully from both server and MEGA.io');
    } catch (error) {
        console.error('Delete error:', error);
        showToast(`Delete failed: ${error.message}`, 'error');
    }
}

function handleSessionExpired() {
    sessionStorage.removeItem('token');
    showLoginModal('Your session has expired. Please login again.');
}
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
        document.getElementById('login-modal').style.display = 'flex';
    } else {
        loadFiles();
    }
});

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'm4a'];
    const videoTypes = ['mp4', 'mov', 'avi', 'mkv'];
    const archiveTypes = ['zip', 'rar', 'tar', 'gz'];
    const codeTypes = ['js', 'py', 'html', 'css', 'json', 'xml'];
    const docTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (imageTypes.includes(ext)) return '/static/icons/image.png';
    if (audioTypes.includes(ext)) return '/static/icons/audio.png';
    if (videoTypes.includes(ext)) return '/static/icons/video.png';
    if (archiveTypes.includes(ext)) return '/static/icons/archive.png';
    if (codeTypes.includes(ext)) return '/static/icons/code.png';
    if (docTypes.includes(ext)) return '/static/icons/pdf.png';
    return '/static/icons/default.png';
}

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const token = document.getElementById('token-input').value.trim();
    
    // Verify token is not empty
    if (!token) {
        alert('Please enter a token');
        return;
    }
    
    // Store token in sessionStorage
    sessionStorage.setItem('token', token);
    console.log("Token stored:", token);  // Debug line
    
    // Hide login modal
    document.getElementById('login-modal').style.display = 'none';
    
    // Load files
    loadFiles();
});

document.getElementById('upload-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    // Add token to the FormData
    formData.append('token', sessionStorage.getItem('token'));

    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            fileInput.value = '';
            loadFiles();
        } else {
            alert('Upload failed');
        }
    });
});

function loadFiles() {
    fetch(`/api/files?token=${sessionStorage.getItem('token')}`)
        .then(response => response.json())
        .then(files => {
            const tbody = document.getElementById('file-table-body');
            tbody.innerHTML = '';
            
            files.forEach(file => {
                const row = document.createElement('tr');
                const icon = getFileIcon(file.name);
                
                row.innerHTML = `
                    <td>
                        <img src="${icon}" alt="File icon" class="file-icon">
                        <a href="/api/download/${encodeURIComponent(file.name)}?token=${sessionStorage.getItem('token')}">${file.name}</a>
                    </td>
                    <td>${formatFileSize(file.size)}</td>
                    <td>${file.modification_date}</td>
                    <td><button onclick="deleteFile('${encodeURIComponent(file.name)}')">Delete</button></td>
                `;
                tbody.appendChild(row);
            });
        });
}

function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
        fetch(`/api/files/${filename}?token=${sessionStorage.getItem('token')}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                loadFiles();
            } else {
                alert('Delete failed');
            }
        });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
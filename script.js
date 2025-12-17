const urlInput = document.getElementById('url-input');
const searchBtn = document.getElementById('search-btn');
const pasteBtn = document.getElementById('paste-btn');
const loader = document.getElementById('loader');
const errorMsg = document.getElementById('error-msg');
const resultSection = document.getElementById('result-section');
const themeToggle = document.getElementById('theme-toggle');

// Result Elements
const videoCover = document.getElementById('video-cover');
const videoTitle = document.getElementById('video-title');
const videoAuthor = document.getElementById('video-author');
const downloadBtn = document.getElementById('download-btn');
const reloadBtn = document.getElementById('reload-btn');

let currentVideoData = null;

// 1. Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// 2. Paste Button
pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
    } catch (err) {
        alert('Clipboard permission denied');
    }
});

// 3. Search Handler
searchBtn.addEventListener('click', fetchVideoInfo);
urlInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') fetchVideoInfo(); });
reloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resultSection.classList.add('hidden');
    urlInput.value = '';
    urlInput.focus();
});

async function fetchVideoInfo() {
    const url = urlInput.value.trim();
    if (!url) return showError('Please paste a TikTok URL first');

    // Reset UI
    errorMsg.classList.add('hidden');
    resultSection.classList.add('hidden');
    loader.classList.remove('hidden');
    searchBtn.disabled = true;

    try {
        // Step 1: Call Backend to get Info
        const response = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentVideoData = data;
            renderPreview(data);
        } else {
            showError(data.error || 'Failed to fetch video');
        }

    } catch (err) {
        showError('Network Error. Is the server running?');
    } finally {
        loader.classList.add('hidden');
        searchBtn.disabled = false;
    }
}

function renderPreview(data) {
    videoCover.src = data.cover;
    videoTitle.textContent = data.title || 'TikTok Video';
    videoAuthor.textContent = `@${data.author}`;
    resultSection.classList.remove('hidden');
    
    // Smooth scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

// 4. Download Handler (Triggers Backend Proxy)
downloadBtn.addEventListener('click', () => {
    if (!currentVideoData) return;

    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Downloading...`;
    downloadBtn.disabled = true;

    // We redirect the browser to our backend /download endpoint.
    // The backend sets "Content-Disposition: attachment", 
    // which forces the browser to save the file instead of playing it.
    
    const downloadUrl = `/download?url=${encodeURIComponent(currentVideoData.downloadUrl)}&title=${encodeURIComponent(currentVideoData.title)}`;
    
    // Trigger download via hidden iframe or window location to avoid page reload issues
    window.location.href = downloadUrl;

    // Reset button after a short delay
    setTimeout(() => {
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }, 3000);
});
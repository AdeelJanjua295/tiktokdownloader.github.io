const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// --- API 1: Get Video Metadata ---
// Returns title, author, cover image, and the 'no-watermark' URL
app.post('/api/info', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes('tiktok.com')) {
        return res.status(400).json({ success: false, error: 'Invalid URL' });
    }

    try {
        // We use a public upstream API (TikWM) to resolve the video URL
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);

        if (response.data.code === 0) {
            const data = response.data.data;
            res.json({
                success: true,
                title: data.title,
                cover: data.cover,
                author: data.author.unique_id,
                // We send the resolved URL back to frontend, 
                // but the frontend will send it back to our /download route to proxy it.
                downloadUrl: data.play 
            });
        } else {
            res.status(404).json({ success: false, error: 'Video not found or private.' });
        }
    } catch (error) {
        console.error('Meta Error:', error.message);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// --- API 2: Proxy Stream (The Direct Download Logic) ---
// This endpoint fetches the video file and streams it to the client as an attachment
app.get('/download', async (req, res) => {
    const videoUrl = req.query.url;
    const title = req.query.title || 'tiktok_video';
    
    // Sanitize filename
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.mp4`;

    if (!videoUrl) return res.status(400).send('Missing video URL');

    try {
        // 1. Fetch the video stream from the CDN
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream'
        });

        // 2. Set Headers to force browser download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'video/mp4');

        // 3. Pipe the stream directly to the user
        response.data.pipe(res);

    } catch (error) {
        console.error('Download Stream Error:', error.message);
        res.status(500).send('Failed to download video. Link might have expired.');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
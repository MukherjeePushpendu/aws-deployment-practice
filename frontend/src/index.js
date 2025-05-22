const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'frontend' });
});

// Main page
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Express Frontend',
        backendUrl: process.env.BACKEND_URL || 'http://localhost:5000'
    });
});

// Proxy endpoint to backend
app.get('/api/data', async (req, res) => {
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const response = await axios.get(`${backendUrl}/api/data`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data from backend' });
    }
});

app.listen(port, () => {
    console.log(`Frontend server running on port ${port}`);
}); 
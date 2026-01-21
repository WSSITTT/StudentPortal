require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API Routes
app.post('/api/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📱 OTP for ${phoneNumber}: ${otp}`);
    
    res.json({ 
        success: true, 
        message: 'OTP generated (check console)',
        otp: otp // For testing only!
    });
});

app.post('/api/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;
    
    // Simple verification for testing
    if (otp && otp.length === 6) {
        try {
            // Load users database
            const usersData = JSON.parse(
                fs.readFileSync(path.join(__dirname, 'db', 'logins.json'), 'utf8')
            );
            
            // Find user by phone number
            const user = usersData.users.find(u => u.phone === phoneNumber);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Phone number not found in our system' 
                });
            }
            
            // Create JWT token
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { 
                    name: user.name,
                    phone: user.phone,
                    email: user.email
                },
                process.env.JWT_SECRET || 'development_secret',
                { expiresIn: '7d' }
            );
            
            res.json({ 
                success: true, 
                message: 'Login successful!',
                token: token,
                user: { 
                    name: user.name,
                    phone: user.phone,
                    email: user.email
                }
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Database error' 
            });
        }
    } else {
        res.status(400).json({ 
            success: false, 
            error: 'Invalid OTP' 
        });
    }
});

app.get('/api/results', (req, res) => {
    try {
        const results = JSON.parse(
            fs.readFileSync(path.join(__dirname, 'db', 'results.json'), 'utf8')
        );
        res.json(results);
    } catch (error) {
        console.error('Error reading results:', error);
        res.status(500).json({ error: 'Failed to load results' });
    }
});

// Google Auth route (simplified)
app.get('/auth/google', (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent('http://localhost:3000/api/google-auth')}` +
        `&response_type=code` +
        `&scope=profile email`;
    
    res.redirect(googleAuthUrl);
});

app.get('/api/google-auth', async (req, res) => {
    const { code } = req.query;
    
    // Simple response for now
    res.send(`
        <html>
            <body>
                <h2>Google Login Successful!</h2>
                <p>In a full implementation, we would exchange the code for user info.</p>
                <button onclick="window.close()">Close</button>
            </body>
        </html>
    `);
});

// Serve static files from app folder
app.use('/app', express.static(path.join(__dirname, 'public', 'app')));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📱 Login: http://localhost:${PORT}/login`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔧 API Base: http://localhost:${PORT}/api`);
});
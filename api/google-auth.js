// At the top of api/google-auth.js
const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://waterloosecstudentportal.vercel.app/api/google-auth'
    : 'http://localhost:3000/api/google-auth';

// API endpoint for Google OAuth callback
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        const { code } = req.query;
        
        if (!code) {
            // If no code, redirect to login
            return res.redirect('/login.html?error=no_auth_code');
        }
        
        console.log('Google auth code received:', code.substring(0, 20) + '...');
        
        // Initialize Google OAuth client
        const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            req.headers.origin + '/api/google-auth' // Dynamic redirect URI
        );
        
        // Exchange code for tokens
        const { tokens } = await client.getToken({
            code: code,
            redirect_uri: req.headers.origin + '/api/google-auth'
        });
        
        // Get user info
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const userEmail = payload.email;
        const userName = payload.name;
        
        console.log('Google user authenticated:', userEmail);
        
        // For now, create a simple token and redirect
        const token = jwt.sign(
            { 
                email: userEmail,
                name: userName,
                loginMethod: 'google'
            },
            process.env.JWT_SECRET || 'dev_secret',
            { expiresIn: '7d' }
        );
        
        // Create HTML page that sets localStorage and redirects
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Google Login Successful</title>
            <script>
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify({
                    name: '${userName}',
                    email: '${userEmail}',
                    loginMethod: 'google'
                }));
                localStorage.setItem('auth_token', '${token}');
                
                // Redirect to dashboard
                window.location.href = '/index.html';
            </script>
        </head>
        <body>
            <p>Google login successful! Redirecting...</p>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        
    } catch (error) {
        console.error('Google auth error:', error);
        
        // Return error page
        const errorHtml = `
        <!DOCTYPE html>
        <html>
        <body>
            <h2>Google Login Failed</h2>
            <p>Error: ${error.message}</p>
            <a href="/login.html">Back to Login</a>
        </body>
        </html>
        `;
        
        res.send(errorHtml);
    }
};
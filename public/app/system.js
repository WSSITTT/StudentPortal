// Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://waterloosecstudentportal.vercel.app/api';

let currentPhoneNumber = '';

// ========== AUTHENTICATION FUNCTIONS ==========

// Check if user is logged in
function checkAuth() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');
    
    // If on dashboard but not logged in, redirect to login
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        if (!user || !token) {
            window.location.href = '/login.html';
        } else {
            // User is logged in, show their name
            const userData = JSON.parse(user);
            if (document.getElementById('studentName')) {
                document.getElementById('studentName').textContent = userData.name || 'Student';
            }
            if (document.getElementById('userName')) {
                document.getElementById('userName').textContent = userData.name || 'Student';
            }
        }
    }
    
    // If on login page but already logged in, redirect to dashboard
    if (window.location.pathname.includes('login.html') && user && token) {
        window.location.href = '/index.html';
    }
}

// Phone Login Functions
async function handlePhoneLogin() {
    const phoneInput = document.getElementById('phoneNumber');
    const phoneNumber = phoneInput.value.trim();
    
    if (!phoneNumber) {
        showError('Please enter your phone number');
        return;
    }
    
    currentPhoneNumber = phoneNumber;
    
    try {
        const response = await fetch(`${API_BASE}/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show OTP input
            document.getElementById('phoneBtn').style.display = 'none';
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('verifyBtn').style.display = 'block';
            
            // For testing: if OTP is returned, show it
            if (data.otp) {
                console.log('OTP for testing:', data.otp);
                document.getElementById('otpCode').value = data.otp;
            }
        } else {
            showError(data.error || 'Failed to send OTP');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

async function verifyOTP() {
    const otpCode = document.getElementById('otpCode').value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
        showError('Please enter a valid 6-digit OTP');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phoneNumber: currentPhoneNumber, 
                otp: otpCode 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Save user data
            const userData = {
                phone: currentPhoneNumber,
                name: data.user?.name || 'Student',
                loginMethod: 'phone'
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('auth_token', data.token);
            
            // Redirect to dashboard
            window.location.href = '/index.html';
        } else {
            showError(data.error || 'Invalid OTP');
        }
    } catch (error) {
        showError('Verification failed. Please try again.');
    }
}

// Google Login
function loginWithGoogle() {
    // Use the Google Client ID from your Vercel environment
    const clientId = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
    
    // Determine redirect URI based on environment
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    const redirectUri = isLocalhost 
        ? 'http://localhost:3000/api/google-auth'
        : 'https://waterloosecstudentportal.vercel.app/api/google-auth';
    
    // Create Google OAuth URL
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=profile%20email` +
        `&access_type=offline` +
        `&prompt=consent`;
    
    console.log('Redirecting to Google login...');
    window.location.href = googleAuthUrl;
}

// Logout
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    window.location.href = '/login.html';
}

// ========== RESULTS FUNCTIONS ==========

// Load Student Results
async function loadStudentResults() {
    try {
        const response = await fetch(`${API_BASE}/results`);
        const data = await response.json();
        
        // Get current user
        const user = JSON.parse(localStorage.getItem('user'));
        const userName = user?.name;
        
        // Find student in results
        const student = data.students.find(s => 
            s.name.toLowerCase() === userName.toLowerCase()
        );
        
        if (!student) {
            document.getElementById('resultsTable').innerHTML = 
                '<tr><td colspan="4">No results found for your account.</td></tr>';
            return;
        }
        
        // Update student name
        if (document.getElementById('studentName')) {
            document.getElementById('studentName').textContent = student.name;
        }
        
        // Calculate totals
        const scores = Object.values(student.scores);
        const total = scores.reduce((sum, score) => sum + score, 0);
        const average = Math.round(total / scores.length);
        
        // Update summary
        if (document.getElementById('overallAverage')) {
            document.getElementById('overallAverage').textContent = average;
        }
        if (document.getElementById('totalScore')) {
            document.getElementById('totalScore').textContent = total;
        }
        
        // Calculate rank
        const allStudents = data.students.map(s => ({
            name: s.name,
            total: Object.values(s.scores).reduce((sum, score) => sum + score, 0)
        }));
        
        allStudents.sort((a, b) => b.total - a.total);
        const rank = allStudents.findIndex(s => s.name === student.name) + 1;
        
        if (document.getElementById('classRank')) {
            document.getElementById('classRank').textContent = `#${rank}`;
        }
        
        // Fill table
        const tableBody = document.getElementById('resultsTable').querySelector('tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            Object.entries(student.scores).forEach(([subject, score]) => {
                const grade = getGrade(score);
                const status = score >= 50 ? 'pass' : 'fail';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${subject.charAt(0).toUpperCase() + subject.slice(1)}</td>
                    <td>${score}/100</td>
                    <td class="grade ${grade}">${grade}</td>
                    <td><span class="status ${status}">${status.toUpperCase()}</span></td>
                `;
                tableBody.appendChild(row);
            });
        }
        
    } catch (error) {
        console.error('Error loading results:', error);
        if (document.getElementById('resultsTable')) {
            document.getElementById('resultsTable').innerHTML = 
                '<tr><td colspan="4" class="error">Failed to load results. Please try again later.</td></tr>';
        }
    }
}

function getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

// ========== UTILITY FUNCTIONS ==========

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// ========== INITIALIZATION ==========

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Load results if on dashboard
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadStudentResults();
    }
});
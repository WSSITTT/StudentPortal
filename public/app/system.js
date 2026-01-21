// Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api'; // Use relative path for Vercel

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
        console.log('Sending OTP request for:', phoneNumber);
        const response = await fetch(`${API_BASE}/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        
        const data = await response.json();
        console.log('OTP response:', data);
        
        if (data.success) {
            // Show OTP input
            document.getElementById('phoneBtn').style.display = 'none';
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('verifyBtn').style.display = 'block';
            
            // For testing: if OTP is returned, show it
            if (data.otp) {
                console.log('OTP for testing:', data.otp);
                document.getElementById('otpCode').value = data.otp;
                showError(`OTP: ${data.otp} (Check console for real SMS)`);
            } else {
                showError('OTP sent! Check Vercel logs for code.');
            }
        } else {
            showError(data.error || 'Failed to send OTP');
        }
    } catch (error) {
        console.error('Network error:', error);
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
        console.log('Verifying OTP for:', currentPhoneNumber);
        const response = await fetch(`${API_BASE}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phoneNumber: currentPhoneNumber, 
                otp: otpCode 
            })
        });
        
        const data = await response.json();
        console.log('Verify response:', data);
        
        if (data.success) {
            // Save user data
            const userData = {
                phone: currentPhoneNumber,
                name: data.user?.name || 'Student',
                email: data.user?.email,
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
        console.error('Verification error:', error);
        showError('Verification failed. Please try again.');
    }
}

// Google Login - SIMPLIFIED VERSION FOR TESTING
function loginWithGoogle() {
    console.log('Google login clicked');
    
    // SIMULATE GOOGLE LOGIN FOR NOW
    const email = prompt('Student Portal Login\n\nEnter your registered email:\n\n• patrobloxgaming15@gmail.com (Keyshaun Sookdar)\n• KSookdar@proton.me (Keith Sookdar)\n• favnc@proton.me (Pat Williams)');
    
    if (!email) {
        console.log('Login cancelled');
        return;
    }
    
    // Check if email is in our database
    const testUsers = {
        'patrobloxgaming15@gmail.com': 'Keyshaun Sookdar',
        'KSookdar@proton.me': 'Keith Sookdar', 
        'favnc@proton.me': 'Pat Williams'
    };
    
    const userName = testUsers[email];
    
    if (userName) {
        console.log('Login successful for:', email);
        
        // Save to localStorage
        const userData = {
            name: userName,
            email: email,
            loginMethod: 'google'
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('auth_token', 'google_token_' + Date.now());
        
        // Redirect to dashboard
        window.location.href = '/index.html';
    } else {
        alert('❌ Email not registered in student portal.\n\nPlease use one of these test emails:\n\n• patrobloxgaming15@gmail.com (Keyshaun Sookdar)\n• KSookdar@proton.me (Keith Sookdar)\n• favnc@proton.me (Pat Williams)');
        console.log('Email not registered:', email);
    }
}

// Logout
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    window.location.href = '/login.html';
}

// ========== RESULTS FUNCTIONS ==========

// Load Student Results - FIXED VERSION
async function loadStudentResults() {
    console.log('Loading student results...');
    
    try {
        // Get current user
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('auth_token');
        
        if (!userStr || !token) {
            console.error('No user data found');
            window.location.href = '/login.html';
            return;
        }
        
        const user = JSON.parse(userStr);
        const userName = user?.name;
        
        console.log('Current user:', userName);
        
        // Fetch results
        const response = await fetch(`${API_BASE}/results`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Results data loaded');
        
        // Find student in results - IMPROVED MATCHING
        let student = null;
        
        if (data && data.students) {
            // Try exact match first
            student = data.students.find(s => s.name === userName);
            
            // If not found, try case-insensitive match
            if (!student) {
                student = data.students.find(s => 
                    s.name.toLowerCase() === userName.toLowerCase()
                );
            }
            
            // If still not found, try partial match
            if (!student && userName) {
                const firstName = userName.split(' ')[0];
                student = data.students.find(s => 
                    s.name.toLowerCase().includes(firstName.toLowerCase())
                );
            }
        }
        
        if (!student) {
            console.error('Student not found in results:', userName);
            console.log('Available students:', data.students?.map(s => s.name));
            
            const tableBody = document.getElementById('resultsTable')?.querySelector('tbody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 40px;">
                            <h3>No results found for: ${userName}</h3>
                            <p>Available students in system:</p>
                            <ul style="list-style: none; padding: 0;">
                                ${data.students?.map(s => `<li>• ${s.name}</li>`).join('') || ''}
                            </ul>
                        </td>
                    </tr>
                `;
            }
            return;
        }
        
        console.log('Found student:', student.name);
        
        // Update student name on dashboard
        if (document.getElementById('studentName')) {
            document.getElementById('studentName').textContent = student.name;
        }
        if (document.getElementById('userName')) {
            document.getElementById('userName').textContent = student.name;
        }
        
        // Calculate totals
        const scores = student.scores ? Object.values(student.scores) : [];
        const total = scores.reduce((sum, score) => sum + (score || 0), 0);
        const average = scores.length > 0 ? Math.round(total / scores.length) : 0;
        
        // Update summary cards
        if (document.getElementById('overallAverage')) {
            document.getElementById('overallAverage').textContent = average;
        }
        if (document.getElementById('totalScore')) {
            document.getElementById('totalScore').textContent = total;
        }
        
        // Calculate rank
        if (data.students && data.students.length > 0) {
            const allStudents = data.students.map(s => ({
                name: s.name,
                total: s.scores ? Object.values(s.scores).reduce((sum, score) => sum + (score || 0), 0) : 0
            }));
            
            allStudents.sort((a, b) => b.total - a.total);
            const rank = allStudents.findIndex(s => s.name === student.name) + 1;
            
            if (document.getElementById('classRank')) {
                document.getElementById('classRank').textContent = `#${rank}`;
                document.getElementById('classRank').nextElementSibling.textContent = 
                    `Out of ${data.students.length} students`;
            }
        }
        
        // Fill table with results
        const tableBody = document.getElementById('resultsTable')?.querySelector('tbody');
        if (tableBody && student.scores) {
            tableBody.innerHTML = '';
            
            Object.entries(student.scores).forEach(([subject, score]) => {
                const grade = getGrade(score);
                const status = score >= 50 ? 'pass' : 'fail';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${subject.charAt(0).toUpperCase() + subject.slice(1)}</strong></td>
                    <td>${score}/100</td>
                    <td class="grade ${grade}">${grade}</td>
                    <td><span class="status ${status}">${status.toUpperCase()}</span></td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        console.log('Results loaded successfully for:', student.name);
        
    } catch (error) {
        console.error('Error loading results:', error);
        
        const tableBody = document.getElementById('resultsTable')?.querySelector('tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="error">
                        <h3>Error Loading Results</h3>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px;">
                            Retry Loading Results
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

function getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    if (score >= 50) return 'E';
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
    console.log('Page loaded, checking auth...');
    checkAuth();
    
    // Load results if on dashboard
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        console.log('On dashboard, loading results...');
        setTimeout(() => {
            loadStudentResults();
        }, 100); // Small delay to ensure DOM is ready
    }
    
    // Add test credentials info for login page
    if (window.location.pathname.includes('login.html')) {
        console.log('On login page, ready for authentication');
    }
});

// Debug function to check localStorage
function debugAuth() {
    console.log('User:', localStorage.getItem('user'));
    console.log('Token:', localStorage.getItem('auth_token'));
    console.log('API Base:', API_BASE);
}
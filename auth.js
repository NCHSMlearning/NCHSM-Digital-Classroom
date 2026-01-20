// auth.js - COMPLETE VERSION WITH ALL FUNCTIONS
console.log('🔐 auth.js loading');

// =====================
// CORE AUTH FUNCTIONS
// =====================

// Safe Supabase getter
function getSupabase() {
    if (!window.supabase) {
        throw new Error('Authentication service not loaded');
    }
    if (!window.supabase.auth) {
        throw new Error('Authentication service not ready');
    }
    return window.supabase;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 auth.js: DOM ready');
    
    // Show auth screen immediately
    showLoginScreen();
    
    // Setup auth listener if supabase is available
    if (window.supabase?.auth) {
        setupAuthListener();
        checkCurrentSession();
    }
});

// Setup auth state listener
function setupAuthListener() {
    try {
        const supabase = getSupabase();
        
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state:', event);
            
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (session) {
                    console.log('✅ User:', session.user.email);
                    showMainApp();
                    loadUserData(session.user);
                } else {
                    showLoginScreen();
                }
            } else if (event === 'SIGNED_OUT') {
                showLoginScreen();
            }
        });
        
    } catch (error) {
        console.error('❌ Auth listener:', error);
    }
}

// Check current session
async function checkCurrentSession() {
    try {
        const supabase = getSupabase();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            console.log('✅ Existing session:', session.user.email);
            showMainApp();
            loadUserData(session.user);
        }
        
    } catch (error) {
        console.error('❌ Session check:', error);
    }
}

// =====================
// USER DATA FUNCTIONS
// =====================

function loadUserData(user) {
    console.log('👤 Loading user data for:', user.email);
    
    try {
        // Update header
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            const userName = user.user_metadata?.full_name || user.email || 'User';
            const userRole = user.user_metadata?.role || 'student';
            
            userInfo.innerHTML = `
                <span class="user-name">${userName}</span>
                <span class="user-role">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
            `;
        }
        
        // Show welcome
        showToast(`Welcome back, ${user.user_metadata?.full_name || user.email}!`, 'success');
        
        // Load additional data
        if (typeof loadDashboardData === 'function') {
            setTimeout(loadDashboardData, 500);
        }
        
        if (typeof loadNotifications === 'function') {
            setTimeout(loadNotifications, 1000);
        }
        
    } catch (error) {
        console.error('❌ loadUserData error:', error);
    }
}

// =====================
// UI HELPER FUNCTIONS
// =====================

function showLoginScreen() {
    console.log('👁️ Showing login screen');
    
    const loading = document.getElementById('loading-screen');
    const auth = document.getElementById('auth-screens');
    const main = document.getElementById('main-app');
    
    if (loading) loading.classList.add('hidden');
    if (auth) auth.classList.remove('hidden');
    if (main) main.classList.add('hidden');
}

function showMainApp() {
    console.log('🏠 Showing main app');
    
    const loading = document.getElementById('loading-screen');
    const auth = document.getElementById('auth-screens');
    const main = document.getElementById('main-app');
    
    if (loading) loading.classList.add('hidden');
    if (auth) auth.classList.add('hidden');
    if (main) main.classList.remove('hidden');
}

function showAuthTab(tab) {
    console.log('📱 Switching to tab:', tab);
    
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const form = document.getElementById(`${tab}-form`);
    if (form) form.classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(b => {
        if (b.textContent.toLowerCase().includes(tab)) {
            b.classList.add('active');
        }
    });
}

// =====================
// AUTH ACTION FUNCTIONS
// =====================

async function login() {
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ Login successful:', data.user.email);
        showToast('Login successful!', 'success');
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast(error.message.includes('credentials') ? 'Invalid email or password' : error.message, 'error');
    }
}

async function register() {
    const name = document.getElementById('register-name')?.value;
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    const role = document.getElementById('register-role')?.value;
    
    if (!name || !email || !password || !role) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: role
                }
            }
        });
        
        if (error) throw error;
        
        showToast('Registration successful! Check your email to verify.', 'success');
        showAuthTab('login');
        
        // Clear form
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        showToast(error.message, 'error');
    }
}

async function logout() {
    try {
        const supabase = getSupabase();
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        showToast('Logged out successfully', 'success');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
}

async function forgotPassword() {
    const email = prompt('Enter your email to reset password:');
    if (!email) return;
    
    try {
        const supabase = getSupabase();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        
        if (error) throw error;
        
        showToast('Password reset email sent!', 'success');
        
    } catch (error) {
        console.error('❌ Password reset error:', error);
        showToast('Failed to send reset email', 'error');
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`📣 ${type}: ${message}`);
        if (typeof Toastify === 'function') {
            Toastify({
                text: message,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: {
                    success: '#10b981',
                    error: '#ef4444',
                    warning: '#f59e0b',
                    info: '#3b82f6'
                }[type] || '#3b82f6',
                stopOnFocus: true,
            }).showToast();
        }
    };
}

// Placeholder functions for script.js
if (typeof loadDashboardData === 'undefined') {
    window.loadDashboardData = function() {
        console.log('📊 Loading dashboard...');
    };
}

if (typeof loadNotifications === 'undefined') {
    window.loadNotifications = function() {
        console.log('🔔 Loading notifications...');
    };
}

console.log('✅ auth.js loaded with all functions');

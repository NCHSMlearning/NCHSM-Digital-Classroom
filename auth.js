// auth.js - COMPLETE AUTHENTICATION FILE
console.log('🔐 auth.js loading...');

// =====================
// GLOBAL AUTH FUNCTIONS
// =====================

// Login function - MUST BE GLOBAL
window.login = async function() {
    console.log('🔑 Login function called');
    
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    console.log('Attempting login for:', email);
    
    try {
        // Check if Supabase is available
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Authentication service not available');
        }
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            showToast('Invalid email or password', 'error');
            return;
        }
        
        console.log('✅ Login successful:', data.user.email);
        showToast('Login successful!', 'success');
        
        // The auth state change listener in script.js will handle the redirect
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    }
};

// Register function - MUST BE GLOBAL
window.register = async function() {
    console.log('📝 Register function called');
    
    const name = document.getElementById('register-name')?.value;
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    const role = document.getElementById('register-role')?.value;
    
    if (!name || !email || !password || !role) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    console.log('Attempting registration for:', email);
    
    try {
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Registration service not available');
        }
        
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: role
                }
            }
        });
        
        if (error) {
            console.error('Registration error:', error);
            
            let message = error.message;
            if (error.message.includes('already registered')) {
                message = 'This email is already registered. Try logging in instead.';
            }
            
            showToast(message, 'error');
            return;
        }
        
        console.log('✅ Registration successful');
        showToast('Registration successful! Please check your email to verify your account.', 'success');
        
        // Switch to login tab
        showAuthTab('login');
        
        // Clear form
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
    }
};

// Logout function
window.logout = async function() {
    console.log('🚪 Logout function called');
    
    try {
        if (!window.supabase?.auth) {
            throw new Error('Logout service not available');
        }
        
        const { error } = await window.supabase.auth.signOut();
        
        if (error) throw error;
        
        showToast('Logged out successfully', 'success');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('Logout failed', 'error');
    }
};

// Forgot password
window.forgotPassword = async function() {
    const email = prompt('Enter your email to reset password:');
    if (!email) return;
    
    try {
        if (!window.supabase?.auth) {
            throw new Error('Password reset not available');
        }
        
        const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        
        if (error) throw error;
        
        showToast('Password reset email sent! Check your inbox.', 'success');
        
    } catch (error) {
        console.error('❌ Password reset error:', error);
        showToast('Failed to send reset email', 'error');
    }
};

// Tab switching
window.showAuthTab = function(tab) {
    console.log('📱 Switching to tab:', tab);
    
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected form
    const form = document.getElementById(`${tab}-form`);
    if (form) form.classList.add('active');
    
    // Activate selected tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        }
    });
};

// =====================
// HELPER FUNCTIONS
// =====================

// Toast function (if not defined elsewhere)
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`📣 ${type}: ${message}`);
        
        if (typeof Toastify !== 'undefined') {
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            
            Toastify({
                text: message,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: colors[type] || colors.info,
                stopOnFocus: true,
            }).showToast();
        }
    };
}

// =====================
// MISSING FUNCTIONS FOR script.js
// =====================

// Add missing functions that script.js expects
if (typeof loadTeacherNotifications === 'undefined') {
    window.loadTeacherNotifications = async function() {
        console.log('📨 Loading teacher notifications');
        // Implementation would go here
    };
}

if (typeof loadAnnouncements === 'undefined') {
    window.loadAnnouncements = async function() {
        console.log('📢 Loading announcements');
        // Implementation would go here
    };
}

if (typeof loadTeacherData === 'undefined') {
    window.loadTeacherData = async function() {
        console.log('📊 Loading teacher data');
        // Implementation would go here
    };
}

if (typeof loadTeacherClasses === 'undefined') {
    window.loadTeacherClasses = async function() {
        console.log('🏫 Loading teacher classes');
        // Implementation would go here
    };
}

if (typeof loadPendingSubmissions === 'undefined') {
    window.loadPendingSubmissions = async function() {
        console.log('📄 Loading pending submissions');
        // Implementation would go here
    };
}

if (typeof loadNotifications === 'undefined') {
    window.loadNotifications = async function() {
        console.log('🔔 Loading notifications');
        // Implementation would go here
    };
}

if (typeof loadCalendarEvents === 'undefined') {
    window.loadCalendarEvents = async function() {
        console.log('📅 Loading calendar events');
        // Implementation would go here
    };
}

console.log('✅ auth.js loaded with all auth functions');

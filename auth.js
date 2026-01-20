// auth.js - COMPLETE AUTHENTICATION FILE WITH REDIRECT FIX
console.log('🔐 auth.js loading...');

// =====================
// GLOBAL AUTH FUNCTIONS
// =====================

// Login function - COMPLETE WITH REDIRECT
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
        
        // CRITICAL: Handle the user immediately and redirect
        await handlePostLogin(data.user);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    }
};

// Register function
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
        
        // Return to login screen
        handlePostLogout();
        
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
// POST-LOGIN HANDLING (REDIRECT FIX)
// =====================

// Handle post-login actions
async function handlePostLogin(user) {
    console.log('🔄 Handling post-login for:', user.email);
    
    try {
        // Set global user state
        if (typeof AppState !== 'undefined') {
            AppState.currentUser = user;
            AppState.userRole = user.user_metadata?.role || 'student';
        }
        
        // Hide login section
        const loginSection = document.getElementById('login-section');
        if (loginSection) {
            loginSection.style.display = 'none';
        }
        
        // Show main app
        const mainApp = document.getElementById('main-app');
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        // Update user info
        updateUserInfoInUI(user);
        
        // Load dashboard content
        await loadDashboardContent();
        
        // Show dashboard section
        if (typeof showSection === 'function') {
            showSection('dashboard');
        } else {
            // Fallback: Direct DOM manipulation
            document.querySelectorAll('.section').forEach(section => {
                section.style.display = 'none';
            });
            const dashboard = document.getElementById('dashboard-section');
            if (dashboard) dashboard.style.display = 'block';
        }
        
        console.log('✅ Post-login handling complete');
        
    } catch (error) {
        console.error('❌ Error in post-login handling:', error);
    }
}

// Handle post-logout actions
function handlePostLogout() {
    console.log('🔄 Handling post-logout');
    
    // Clear user state
    if (typeof AppState !== 'undefined') {
        AppState.currentUser = null;
        AppState.userRole = null;
    }
    
    // Show login section
    const loginSection = document.getElementById('login-section');
    if (loginSection) {
        loginSection.style.display = 'block';
    }
    
    // Hide main app
    const mainApp = document.getElementById('main-app');
    if (mainApp) {
        mainApp.style.display = 'none';
    }
    
    // Clear forms
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    // Switch to login tab
    showAuthTab('login');
}

// Update user info in UI
function updateUserInfoInUI(user) {
    console.log('👤 Updating UI for user:', user.email);
    
    // Update welcome message
    const welcomeElement = document.querySelector('.welcome-message, .user-name, .profile-name');
    if (welcomeElement) {
        welcomeElement.textContent = user.user_metadata?.full_name || user.email;
    }
    
    // Update role badge if exists
    const roleBadge = document.querySelector('.role-badge, .user-role');
    if (roleBadge) {
        roleBadge.textContent = user.user_metadata?.role || 'student';
    }
}

// Load dashboard content
async function loadDashboardContent() {
    console.log('📊 Loading dashboard content');
    
    try {
        // Load based on user role
        const user = AppState?.currentUser;
        const role = user?.user_metadata?.role || 'student';
        
        if (role === 'teacher') {
            await loadTeacherDashboard();
        } else {
            await loadStudentDashboard();
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard content:', error);
    }
}

// Load teacher dashboard
async function loadTeacherDashboard() {
    console.log('🏫 Loading teacher dashboard');
    
    // Call any teacher-specific functions
    if (typeof loadTeacherNotifications === 'function') {
        await loadTeacherNotifications();
    }
    
    if (typeof loadTeacherClasses === 'function') {
        await loadTeacherClasses();
    }
    
    if (typeof loadPendingSubmissions === 'function') {
        await loadPendingSubmissions();
    }
}

// Load student dashboard
async function loadStudentDashboard() {
    console.log('🎓 Loading student dashboard');
    
    // Call any student-specific functions
    if (typeof loadAnnouncements === 'function') {
        await loadAnnouncements();
    }
    
    if (typeof loadNotifications === 'function') {
        await loadNotifications();
    }
    
    if (typeof loadCalendarEvents === 'function') {
        await loadCalendarEvents();
    }
}

// =====================
// AUTH STATE LISTENER
// =====================

// Initialize auth listeners
window.initializeAuth = function() {
    console.log('🚀 Initializing auth system');
    
    // Set up auth state change listener
    if (window.supabase?.auth) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);
            
            switch(event) {
                case 'SIGNED_IN':
                    console.log('✅ User signed in');
                    if (session?.user) {
                        handlePostLogin(session.user);
                    }
                    break;
                    
                case 'SIGNED_OUT':
                    console.log('👋 User signed out');
                    handlePostLogout();
                    break;
                    
                case 'USER_UPDATED':
                    console.log('👤 User updated');
                    if (session?.user) {
                        updateUserInfoInUI(session.user);
                    }
                    break;
                    
                case 'INITIAL_SESSION':
                    console.log('📋 Initial session');
                    if (session?.user) {
                        handlePostLogin(session.user);
                    }
                    break;
            }
        });
    }
    
    // Auto-check auth state on page load
    setTimeout(checkAuthState, 100);
}

// Check auth state on load
async function checkAuthState() {
    console.log('🔍 Checking auth state');
    
    try {
        if (!window.supabase?.auth) {
            console.warn('⚠️ Supabase auth not ready, retrying...');
            setTimeout(checkAuthState, 500);
            return;
        }
        
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Error checking auth:', error);
            return;
        }
        
        if (session?.user) {
            console.log('✅ User already logged in:', session.user.email);
            await handlePostLogin(session.user);
        } else {
            console.log('👤 No active session, showing login');
            handlePostLogout();
        }
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
    }
}

// =====================
// HELPER FUNCTIONS
// =====================

// Toast function
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`📣 ${type}: ${message}`);
        
        // Create simple toast if Toastify not available
        if (typeof Toastify === 'undefined') {
            alert(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
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
    };
}

// =====================
// INITIALIZATION
// =====================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM loaded, initializing auth');
        setTimeout(() => {
            if (typeof initializeAuth === 'function') {
                initializeAuth();
            }
        }, 500);
    });
} else {
    console.log('📄 DOM already loaded, initializing auth');
    setTimeout(() => {
        if (typeof initializeAuth === 'function') {
            initializeAuth();
        }
    }, 500);
}

console.log('✅ auth.js loaded with complete auth system');

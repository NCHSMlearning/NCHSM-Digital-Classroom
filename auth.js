// Authentication Functions
console.log('auth.js loading...');

// Wait for Supabase to be ready
let supabaseReady = false;

function waitForSupabase() {
    return new Promise((resolve) => {
        const check = () => {
            if (typeof window.supabase !== 'undefined' && window.supabase.auth) {
                console.log('Supabase is ready');
                supabaseReady = true;
                resolve(window.supabase);
            } else {
                console.log('Waiting for Supabase...');
                setTimeout(check, 100);
            }
        };
        check();
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('auth.js DOM ready');
    
    // Wait for Supabase
    const supabase = await waitForSupabase();
    console.log('Supabase ready, setting up auth listener');
    
    // Setup auth listener
    setupAuthListener(supabase);
    
    // Check current session
    await checkCurrentSession(supabase);
});

// Setup auth state listener
function setupAuthListener(supabaseClient) {
    if (!supabaseClient || !supabaseClient.auth) {
        console.error('Cannot setup auth listener: supabaseClient is invalid');
        return;
    }
    
    console.log('Setting up auth state change listener');
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
            console.log('User signed in:', session?.user?.email);
            showMainApp();
            loadUserData(session.user);
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            showLoginScreen();
        } else if (event === 'INITIAL_SESSION') {
            console.log('Initial session loaded');
            if (session) {
                showMainApp();
                loadUserData(session.user);
            } else {
                showLoginScreen();
            }
        }
    });
}

// Check current session
async function checkCurrentSession(supabaseClient) {
    try {
        if (!supabaseClient || !supabaseClient.auth) {
            console.log('Supabase auth not available');
            showLoginScreen();
            return;
        }
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            showLoginScreen();
            return;
        }
        
        if (session) {
            console.log('Found existing session for:', session.user.email);
            showMainApp();
            loadUserData(session.user);
        } else {
            console.log('No existing session');
            showLoginScreen();
        }
    } catch (error) {
        console.error('Error checking session:', error);
        showLoginScreen();
    }
}

// Login function
async function login() {
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    try {
        // Get supabase client
        const supabase = window.supabase;
        if (!supabase) {
            showToast('System not ready. Please refresh page.', 'error');
            return;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        showToast('Login successful!', 'success');
        
        // User will be redirected via auth state change listener
        console.log('Login successful for:', data.user.email);
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
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
        const supabase = window.supabase;
        if (!supabase) {
            showToast('System not ready. Please refresh page.', 'error');
            return;
        }
        
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
        
        showToast('Registration successful! Please check your email to verify your account.', 'success');
        
        // Switch to login tab
        showAuthTab('login');
        
        // Clear form
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message, 'error');
    }
}

async function logout() {
    try {
        const supabase = window.supabase;
        if (!supabase) {
            showToast('System not ready', 'error');
            return;
        }
        
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        showToast('Logged out successfully', 'success');
        
        // Clear any session data
        sessionStorage.clear();
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast(error.message, 'error');
    }
}

async function forgotPassword() {
    const email = prompt('Enter your email to reset password:');
    
    if (!email) return;
    
    try {
        const supabase = window.supabase;
        if (!supabase) {
            showToast('System not ready', 'error');
            return;
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });
        
        if (error) throw error;
        
        showToast('Password reset email sent! Check your inbox.', 'success');
        
    } catch (error) {
        console.error('Password reset error:', error);
        showToast(error.message, 'error');
    }
}

function showAuthTab(tab) {
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
    if (form) {
        form.classList.add('active');
    }
    
    // Activate selected tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        }
    });
}

// Check if user has specific role
async function checkUserRole(requiredRole) {
    try {
        const supabase = window.supabase;
        if (!supabase) return false;
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return false;
        
        const userRole = user.user_metadata?.role || 'student';
        return userRole === requiredRole;
    } catch (error) {
        console.error('Error checking role:', error);
        return false;
    }
}

// Get current user info
async function getCurrentUser() {
    try {
        const supabase = window.supabase;
        if (!supabase) return null;
        
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Update user profile
async function updateUserProfile(updates) {
    try {
        const supabase = window.supabase;
        if (!supabase) {
            showToast('System not ready', 'error');
            return null;
        }
        
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });
        
        if (error) throw error;
        
        showToast('Profile updated successfully', 'success');
        return data.user;
        
    } catch (error) {
        console.error('Profile update error:', error);
        showToast(error.message, 'error');
        return null;
    }
}

// Change password
async function changePassword(newPassword) {
    try {
        const supabase = window.supabase;
        if (!supabase) {
            showToast('System not ready', 'error');
            return false;
        }
        
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        showToast('Password changed successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Password change error:', error);
        showToast(error.message, 'error');
        return false;
    }
}

// Check if user is authenticated
async function isAuthenticated() {
    try {
        const supabase = window.supabase;
        if (!supabase) return false;
        
        const { data: { user } } = await supabase.auth.getUser();
        return !!user;
    } catch (error) {
        console.error('Error checking auth:', error);
        return false;
    }
}

// Get user metadata
async function getUserMetadata() {
    try {
        const supabase = window.supabase;
        if (!supabase) return {};
        
        const { data: { user } } = await supabase.auth.getUser();
        return user?.user_metadata || {};
    } catch (error) {
        console.error('Error getting metadata:', error);
        return {};
    }
}

// Helper functions (should be in script.js, but added here for safety)
function showToast(message, type = 'info') {
    if (typeof Toastify === 'function') {
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
    } else {
        console.log(`${type}: ${message}`);
    }
}

function showLoginScreen() {
    const loading = document.getElementById('loading-screen');
    const auth = document.getElementById('auth-screens');
    const main = document.getElementById('main-app');
    
    if (loading) loading.classList.add('hidden');
    if (auth) auth.classList.remove('hidden');
    if (main) main.classList.add('hidden');
}

function showMainApp() {
    const loading = document.getElementById('loading-screen');
    const auth = document.getElementById('auth-screens');
    const main = document.getElementById('main-app');
    
    if (loading) loading.classList.add('hidden');
    if (auth) auth.classList.add('hidden');
    if (main) main.classList.remove('hidden');
}

console.log('auth.js loaded successfully');

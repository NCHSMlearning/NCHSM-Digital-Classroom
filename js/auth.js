// auth.js - Authentication Module
console.log('🔐 auth.js loading...');

// =====================
// GLOBAL AUTH FUNCTIONS
// =====================

window.login = async function() {
    console.log('🔑 Login function called');
    
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    try {
        showLoading();
        console.log('Attempting login for:', email);
        
        if (!window.supabase?.auth) {
            throw new Error('Authentication service not available');
        }
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            showToast('Invalid email or password', 'error');
            hideLoading();
            return;
        }
        
        console.log('✅ Login successful:', data.user.email);
        showToast('Login successful! Redirecting...', 'success');
        
        // The auth state listener will handle the redirect
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Login failed. Please try again.', 'error');
        hideLoading();
    }
};

window.register = async function() {
    console.log('📝 Register function called');
    
    const name = document.getElementById('register-name')?.value.trim();
    const email = document.getElementById('register-email')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const role = document.getElementById('register-role')?.value;
    
    if (!name || !email || !password || !role) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
        showLoading();
        console.log('Attempting registration for:', email);
        
        if (!window.supabase?.auth) {
            throw new Error('Registration service not available');
        }
        
        // 1. Create auth user
        const { data: authData, error: authError } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: role
                }
            }
        });
        
        if (authError) {
            console.error('Registration auth error:', authError);
            let message = authError.message;
            if (authError.message.includes('already registered')) {
                message = 'Email already registered. Try logging in.';
            }
            showToast(message, 'error');
            hideLoading();
            return;
        }
        
        console.log('✅ Auth registration successful');
        
        // 2. Create user profile in database
        if (authData.user) {
            try {
                console.log('👤 Creating user profile for:', authData.user.id);
                
                const { data: profileData, error: profileError } = await window.supabase
                    .from('user_profiles')
                    .insert([
                        {
                            id: authData.user.id,
                            email: email,
                            full_name: name,
                            role: role,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    ])
                    .select()
                    .single();
                
                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    
                    // If profile insert fails, we might need to handle it
                    // But auth user is already created, so we can still show success
                    console.warn('⚠️ User auth created but profile insert failed');
                    console.warn('This might be due to RLS policies. Check SQL below.');
                    
                    // Show SQL to fix the issue
                    console.info('💡 Run this SQL in Supabase SQL Editor:');
                    console.info(`
CREATE POLICY "Enable insert for authenticated users" 
ON user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);
                    `);
                } else {
                    console.log('✅ User profile created:', profileData);
                }
            } catch (profileError) {
                console.error('Error in profile creation:', profileError);
            }
        }
        
        console.log('✅ Registration process complete');
        showToast('Registration successful! Please check your email for verification.', 'success');
        
        // Switch to login tab
        showAuthTab('login');
        
        // Clear form
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        
        hideLoading();
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
        hideLoading();
    }
};

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
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('Logout failed', 'error');
    }
};

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

function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function showLoginScreen() {
    console.log('🔐 Showing login screen');
    
    const loadingScreen = document.getElementById('loading-screen');
    const authScreens = document.getElementById('auth-screens');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreens) authScreens.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    
    // Clear login form
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

function showMainApp() {
    console.log('🚀 Showing main app');
    
    const loadingScreen = document.getElementById('loading-screen');
    const authScreens = document.getElementById('auth-screens');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreens) authScreens.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
}

// Toast function
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
console.log('✅ auth.js loaded with complete registration fix');

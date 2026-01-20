// Authentication Functions
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        showToast('Login successful!', 'success');
        
        // Redirect to main app
        setTimeout(() => {
            showMainApp();
            loadUserData(data.user);
            loadDashboardData();
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    }
}

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    
    if (!name || !email || !password || !role) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
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
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        showToast('Logged out successfully', 'success');
        
        // Clear any session data
        sessionStorage.clear();
        
        // Show login screen
        setTimeout(() => {
            showLoginScreen();
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast(error.message, 'error');
    }
}

async function forgotPassword() {
    const email = prompt('Enter your email to reset password:');
    
    if (!email) return;
    
    try {
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
    document.getElementById(`${tab}-form`).classList.add('active');
    
    // Activate selected tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        }
    });
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user);
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
    }
});

// Check if user has specific role
async function checkUserRole(requiredRole) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const userRole = user.user_metadata?.role || 'student';
    return userRole === requiredRole;
}

// Get current user info
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Update user profile
async function updateUserProfile(updates) {
    try {
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
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
}

// Get user metadata
async function getUserMetadata() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata || {};
}

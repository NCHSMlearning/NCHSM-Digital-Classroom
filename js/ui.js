// js/ui.js - UI utility functions
console.log('🎨 Loading UI utilities...');

export function initUI() {
    console.log('🎨 Initializing UI components');
    // Initialize any UI components here
}

export function setupEventListeners() {
    console.log('🔧 Setting up event listeners');
    
    // Navigation
    document.addEventListener('click', function(e) {
        // Handle nav items
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            e.preventDefault();
            const section = navItem.dataset.section;
            if (section) {
                showSection(section);
            }
        }
        
        // Handle logout
        if (e.target.closest('#logout-btn')) {
            e.preventDefault();
            window.logout();
        }
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.textContent.toLowerCase().includes('login') ? 'login' : 'register';
            showAuthTab(tab);
        });
    });
}

// UI functions
export function showLoginScreen() {
    const mainApp = document.getElementById('main-app');
    const loginSection = document.getElementById('login-section');
    
    if (mainApp) mainApp.style.display = 'none';
    if (loginSection) loginSection.style.display = 'flex';
    
    showAuthTab('login');
}

export function showMainApp() {
    const mainApp = document.getElementById('main-app');
    const loginSection = document.getElementById('login-section');
    
    if (loginSection) loginSection.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
}

export function showAuthTab(tab) {
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
}

export function showSection(sectionId) {
    console.log(`📁 Showing section: ${sectionId}`);
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update state
    AppState.currentSection = sectionId;
    
    // Trigger section load event
    document.dispatchEvent(new CustomEvent('sectionChanged', {
        detail: { section: sectionId }
    }));
}

export function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo || !AppState.currentUser) return;
    
    const userName = AppState.currentUser.user_metadata?.full_name || 
                    AppState.currentUser.email || 
                    'User';
    
    userInfo.innerHTML = `
        <span class="user-name">${userName}</span>
        <span class="user-role">${AppState.userRole?.charAt(0).toUpperCase() + AppState.userRole?.slice(1)}</span>
    `;
}

export function updateNavigation() {
    // Update navigation based on user role
    if (!AppState.userRole) return;
    
    // Hide/show nav items based on role
    document.querySelectorAll('[data-role]').forEach(item => {
        const roles = item.dataset.role.split(' ');
        if (roles.includes(AppState.userRole)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Make functions globally available
window.showAuthTab = showAuthTab;
window.showSection = showSection;

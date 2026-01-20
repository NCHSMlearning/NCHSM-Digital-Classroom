// js/ui.js - UI Utility Module
console.log('🎨 Loading UI utilities...');

// =====================
// UI STATE
// =====================
const UIState = {
    currentSection: 'dashboard',
    notificationsVisible: false,
    sidebarCollapsed: false,
    theme: 'light'
};

// =====================
// MODULE INITIALIZATION
// =====================

// Initialize UI
export function initUI() {
    console.log('🎨 Initializing UI components');
    
    // Set initial states
    setInitialUIState();
    
    // Setup mobile responsiveness
    setupResponsiveUI();
    
    // Initialize theme
    initTheme();
    
    console.log('✅ UI initialized');
}

// Setup event listeners
export function setupEventListeners() {
    console.log('🔧 Setting up event listeners');
    
    // Navigation
    document.addEventListener('click', function(e) {
        // Handle nav items
        const navItem = e.target.closest('.nav-item');
        if (navItem && navItem.hasAttribute('data-section')) {
            e.preventDefault();
            const section = navItem.dataset.section;
            if (section) {
                showSection(section);
            }
        }
        
        // Handle logout button
        const logoutBtn = e.target.closest('#logout-btn');
        if (logoutBtn) {
            e.preventDefault();
            if (typeof window.logout === 'function') {
                window.logout();
            }
        }
        
        // Handle notification toggle
        const notificationBtn = e.target.closest('.btn-icon');
        if (notificationBtn && notificationBtn.querySelector('.fa-bell')) {
            toggleNotifications();
        }
        
        // Handle settings button
        const settingsBtn = e.target.closest('.btn-icon');
        if (settingsBtn && settingsBtn.querySelector('.fa-cog')) {
            openSettings();
        }
    });
    
    // Tab switching for auth
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.textContent.toLowerCase().includes('login') ? 'login' : 'register';
            showAuthTab(tab);
        });
    });
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    console.log('✅ Event listeners setup complete');
}

// =====================
// SCREEN MANAGEMENT
// =====================

// Show login screen
export function showLoginScreen() {
    console.log('🔐 Showing login screen');
    
    const loadingScreen = document.getElementById('loading-screen');
    const authScreens = document.getElementById('auth-screens');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreens) authScreens.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    
    // Clear login form
    clearLoginForms();
    
    // Show login tab
    showAuthTab('login');
}

// Show main application
export function showMainApp() {
    console.log('🚀 Showing main application');
    
    const loadingScreen = document.getElementById('loading-screen');
    const authScreens = document.getElementById('auth-screens');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (authScreens) authScreens.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    // Update UI after showing main app
    updateUIAfterLogin();
}

// Clear login forms
function clearLoginForms() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

// =====================
// AUTH UI
// =====================

// Show auth tab
export function showAuthTab(tab) {
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
    if (form) {
        form.classList.add('active');
        
        // Focus first input
        const firstInput = form.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
    
    // Activate selected tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tab)) {
            btn.classList.add('active');
        }
    });
    
    UIState.currentTab = tab;
}

// =====================
// NAVIGATION
// =====================

// Show section
export function showSection(sectionId) {
    console.log(`📁 Showing section: ${sectionId} for ${AppState.userRole}`);
    
    // Validate section exists
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (!targetSection) {
        console.error(`❌ Section ${sectionId} not found`);
        return;
    }
    
    // Update navigation state
    updateNavigationState(sectionId);
    
    // Show/hide sections
    showSectionContent(sectionId);
    
    // Update application state
    if (window.AppState) {
        AppState.currentSection = sectionId;
    }
    
    // Update UI state
    UIState.currentSection = sectionId;
    
    // Trigger section load event
    document.dispatchEvent(new CustomEvent('sectionChanged', {
        detail: { 
            section: sectionId,
            userRole: AppState?.userRole || 'guest'
        }
    }));
    
    // Update URL hash (optional)
    window.location.hash = sectionId;
    
    // Close mobile sidebar if open
    if (window.innerWidth < 768) {
        closeMobileSidebar();
    }
}

// Update navigation state
function updateNavigationState(sectionId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        
        // Check both data-section and onclick
        const itemSection = item.dataset.section || 
                           item.getAttribute('onclick')?.match(/showSection\('(.+?)'\)/)?.[1];
        
        if (itemSection === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Update mobile header title if exists
    updateMobileHeader(sectionId);
}

// Show section content
function showSectionContent(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
        
        // Add fade-in animation
        targetSection.style.opacity = '0';
        targetSection.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            targetSection.style.opacity = '1';
        }, 10);
    }
}

// =====================
// USER INFO & UI UPDATES
// =====================

// Update user info
export function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo || !AppState.currentUser) return;
    
    const userName = AppState.currentUser.user_metadata?.full_name || 
                    AppState.currentUser.email?.split('@')[0] || 
                    'User';
    
    const userRole = AppState.userRole?.charAt(0).toUpperCase() + AppState.userRole?.slice(1) || 'User';
    
    userInfo.innerHTML = `
        <div class="user-avatar">
            ${userName.charAt(0).toUpperCase()}
        </div>
        <div class="user-details">
            <span class="user-name">${userName}</span>
            <span class="user-role">${userRole}</span>
        </div>
    `;
    
    // Update welcome message if exists
    updateWelcomeMessage(userName);
}

// Update welcome message
function updateWelcomeMessage(userName) {
    const welcomeElement = document.querySelector('.welcome-message, .user-greeting');
    if (welcomeElement) {
        const hour = new Date().getHours();
        let greeting = 'Hello';
        
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
        
        welcomeElement.textContent = `${greeting}, ${userName}!`;
    }
}

// Update navigation based on role
export function updateNavigation() {
    if (!AppState.userRole) return;
    
    console.log('🧭 Updating navigation for role:', AppState.userRole);
    
    // Update nav items visibility based on role
    document.querySelectorAll('[data-role]').forEach(item => {
        const allowedRoles = item.dataset.role.split(' ');
        if (allowedRoles.includes(AppState.userRole) || allowedRoles.includes('all')) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update role-specific UI elements
    updateRoleSpecificUI();
}

// Update UI after login
function updateUIAfterLogin() {
    updateUserInfo();
    updateNavigation();
    updateQuickActions();
    updateWelcomeMessage(AppState.currentUser?.user_metadata?.full_name || 'User');
}

// Update role-specific UI
function updateRoleSpecificUI() {
    if (!AppState.userRole) return;
    
    // Update header color based on role
    const header = document.querySelector('.header');
    if (header) {
        const colors = {
            teacher: '#4f46e5',
            student: '#10b981',
            admin: '#ef4444'
        };
        header.style.borderBottomColor = colors[AppState.userRole] || '#e5e7eb';
    }
    
    // Update role badge in sidebar
    const roleBadges = document.querySelectorAll('.role-badge');
    roleBadges.forEach(badge => {
        badge.textContent = AppState.userRole;
        badge.className = `role-badge role-${AppState.userRole}`;
    });
}

// =====================
// NOTIFICATIONS & SETTINGS
// =====================

// Toggle notifications panel
export function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        UIState.notificationsVisible = !panel.classList.contains('hidden');
        
        // Close other panels
        if (UIState.notificationsVisible) {
            closeSettingsPanel();
        }
    }
}

// Open settings
export function openSettings() {
    showSection('settings');
    showToast('Settings page coming soon', 'info');
}

// Close settings panel
function closeSettingsPanel() {
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
        settingsPanel.classList.add('hidden');
    }
}

// =====================
// QUICK ACTIONS
// =====================

// Update quick actions based on role
function updateQuickActions() {
    const quickActions = document.querySelector('.quick-actions');
    if (!quickActions || !AppState.userRole) return;
    
    if (AppState.userRole === 'teacher') {
        quickActions.innerHTML = `
            <button class="quick-action-btn" onclick="createClass()">
                <i class="fas fa-plus-circle"></i>
                <span>New Class</span>
            </button>
            <button class="quick-action-btn" onclick="createAssignment()">
                <i class="fas fa-tasks"></i>
                <span>New Assignment</span>
            </button>
            <button class="quick-action-btn" onclick="gradeSubmissions()">
                <i class="fas fa-check-circle"></i>
                <span>Grade Work</span>
            </button>
            <button class="quick-action-btn" onclick="sendAnnouncement()">
                <i class="fas fa-bullhorn"></i>
                <span>Announcement</span>
            </button>
        `;
    } else {
        quickActions.innerHTML = `
            <button class="quick-action-btn" onclick="joinNextClass()">
                <i class="fas fa-video"></i>
                <span>Join Class</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('assignments')">
                <i class="fas fa-tasks"></i>
                <span>Assignments</span>
            </button>
            <button class="quick-action-btn" onclick="submitWork()">
                <i class="fas fa-paper-plane"></i>
                <span>Submit Work</span>
            </button>
            <button class="quick-action-btn" onclick="showSection('grades')">
                <i class="fas fa-chart-line"></i>
                <span>View Grades</span>
            </button>
        `;
    }
}

// =====================
// RESPONSIVE UI
// =====================

// Setup responsive UI
function setupResponsiveUI() {
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Initial responsive setup
    handleResize();
    
    // Mobile menu toggle (if exists)
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }
}

// Handle window resize
function handleResize() {
    const width = window.innerWidth;
    
    if (width < 768) {
        // Mobile view
        document.body.classList.add('mobile-view');
        closeMobileSidebar();
    } else {
        // Desktop view
        document.body.classList.remove('mobile-view');
        document.querySelector('.sidebar')?.classList.remove('hidden');
    }
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
    }
}

// Close mobile sidebar
function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth < 768) {
        sidebar.classList.add('hidden');
    }
}

// Update mobile header
function updateMobileHeader(sectionId) {
    const mobileHeader = document.querySelector('.mobile-header');
    if (!mobileHeader) return;
    
    const sectionNames = {
        dashboard: 'Dashboard',
        classroom: 'Classroom',
        assignments: 'Assignments',
        grades: 'Grades',
        calendar: 'Calendar',
        resources: 'Resources',
        discussions: 'Discussions'
    };
    
    const title = sectionNames[sectionId] || 'EduMeet';
    mobileHeader.querySelector('h1').textContent = title;
}

// =====================
// THEME MANAGEMENT
// =====================

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('edumeet-theme') || 'light';
    setTheme(savedTheme);
}

// Set theme
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    UIState.theme = theme;
    localStorage.setItem('edumeet-theme', theme);
}

// Toggle theme
function toggleTheme() {
    const newTheme = UIState.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    showToast(`Switched to ${newTheme} theme`, 'info');
}

// =====================
// KEYBOARD SHORTCUTS
// =====================

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            focusSearch();
        }
        
        // Escape to close modals/panels
        if (e.key === 'Escape') {
            closeAllPanels();
        }
        
        // Number shortcuts for navigation (1-7)
        if (e.key >= '1' && e.key <= '7' && !e.ctrlKey && !e.metaKey) {
            navigateWithNumber(parseInt(e.key));
        }
    });
}

// Focus search
function focusSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.focus();
    }
}

// Close all panels
function closeAllPanels() {
    document.querySelectorAll('.modal, .notifications-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
}

// Navigate with number
function navigateWithNumber(num) {
    const sections = ['dashboard', 'classroom', 'assignments', 'grades', 'calendar', 'resources', 'discussions'];
    if (sections[num - 1]) {
        showSection(sections[num - 1]);
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

// Set initial UI state
function setInitialUIState() {
    // Set default section
    UIState.currentSection = 'dashboard';
    
    // Initialize tooltips if any
    initTooltips();
}

// Initialize tooltips
function initTooltips() {
    // Add tooltips to elements with data-tooltip attribute
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.addEventListener('mouseenter', function() {
            const tooltip = this.getAttribute('data-tooltip');
            showTooltip(this, tooltip);
        });
        
        el.addEventListener('mouseleave', function() {
            hideTooltip(this);
        });
    });
}

// Show tooltip
function showTooltip(element, text) {
    // Implementation depends on your tooltip library
}

// Hide tooltip
function hideTooltip(element) {
    // Implementation depends on your tooltip library
}

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
        } else {
            // Fallback
            alert(`${type.toUpperCase()}: ${message}`);
        }
    };
}

// =====================
// GLOBAL EXPORTS
// =====================

// Make functions globally available
window.showAuthTab = showAuthTab;
window.showSection = showSection;
window.toggleNotifications = toggleNotifications;
window.openSettings = openSettings;
window.updateUserInfo = updateUserInfo;
window.updateNavigation = updateNavigation;

console.log('✅ ui.js loaded - UI utilities ready');

// js/main.js - Main application entry point
console.log('🎓 EduMeet - Main Application');

// Import modules
import { initSupabase } from './supabase-config.js';
import { initAuth, checkAuth, handleAuthState } from './auth.js';
import { initUI, setupEventListeners } from './ui.js';
import { initDashboard } from './dashboard.js';
import { initAssignments } from './assignments.js';
import { initClassroom } from './classroom.js';

// Application State (Global)
window.AppState = {
    currentUser: null,
    userRole: null,
    currentSection: 'dashboard',
    isInClass: false,
    notifications: [],
    teacherClasses: [],
    enrolledClasses: [],
    pendingSubmissions: [],
    pendingAssignments: []
};

// Initialize application
async function initializeApp() {
    console.log('🚀 Initializing EduMeet...');
    
    try {
        // 1. Initialize Supabase
        await initSupabase();
        
        // 2. Initialize UI
        initUI();
        setupEventListeners();
        
        // 3. Initialize auth
        await initAuth();
        
        // 4. Check authentication
        await checkAuth();
        
        // 5. Initialize modules
        initDashboard();
        initAssignments();
        initClassroom();
        
        console.log('✅ EduMeet initialized successfully');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showError('Failed to initialize application');
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Global utility function (fallback)
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
            backgroundColor: colors[type],
            stopOnFocus: true,
        }).showToast();
    }
};

window.showError = function(message) {
    showToast(message, 'error');
};

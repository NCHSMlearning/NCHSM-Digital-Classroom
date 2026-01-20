// script.js - FIXED VERSION (no duplicate declarations)

// Use IIFE to avoid global scope pollution
(function() {
    'use strict';
    
    console.log('=== script.js loading ===');
    
    // Global variables - only declare if they don't exist
    if (typeof window.currentUser === 'undefined') {
        window.currentUser = null;
    }
    
    if (typeof window.currentSection === 'undefined') {
        window.currentSection = 'dashboard';
    }
    
    if (typeof window.isInClass === 'undefined') {
        window.isInClass = false;
    }
    
    // Initialize application
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('EduMeet Online Classroom Initializing...');
        
        // First, make sure loading screen is hidden
        setTimeout(() => {
            console.log('Initial timeout - checking if we should show auth');
            const loadingScreen = document.getElementById('loading-screen');
            const authScreens = document.getElementById('auth-screens');
            
            if (loadingScreen && authScreens) {
                // If no user is logged in, show auth screen
                if (!window.currentUser) {
                    loadingScreen.classList.add('hidden');
                    authScreens.classList.remove('hidden');
                    console.log('Showing auth screens');
                }
            }
        }, 500);
        
        // Wait for Supabase to be ready
        await waitForSupabase();
        
        // Check authentication status
        await checkAuthStatus();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('Application initialized');
    });
    
    // Wait for Supabase to be ready
    async function waitForSupabase() {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof window.supabase !== 'undefined' && window.supabase.auth) {
                    console.log('✅ Supabase is ready');
                    resolve();
                } else {
                    console.log('⏳ Waiting for Supabase...');
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    // Check authentication status
    async function checkAuthStatus() {
        try {
            console.log('Checking auth status...');
            
            if (!window.supabase || !window.supabase.auth) {
                console.error('Supabase auth not available');
                showLoginScreen();
                return;
            }
            
            const { data: { user }, error } = await window.supabase.auth.getUser();
            
            if (error) {
                console.error('Auth check error:', error);
                showLoginScreen();
                return;
            }
            
            if (user) {
                console.log('User found:', user.email);
                window.currentUser = user;
                showMainApp();
                await loadUserData(user);
                await loadDashboardData();
            } else {
                console.log('No user found, showing login');
                showLoginScreen();
            }
        } catch (error) {
            console.error('Error in checkAuthStatus:', error);
            showLoginScreen();
        }
    }
    
    // Show login screen
    function showLoginScreen() {
        console.log('Showing login screen');
        const loadingScreen = document.getElementById('loading-screen');
        const authScreens = document.getElementById('auth-screens');
        const mainApp = document.getElementById('main-app');
        
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (authScreens) authScreens.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    }
    
    // Show main application
    function showMainApp() {
        console.log('Showing main app');
        const loadingScreen = document.getElementById('loading-screen');
        const authScreens = document.getElementById('auth-screens');
        const mainApp = document.getElementById('main-app');
        
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (authScreens) authScreens.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
    }
    
    // Load user data
    async function loadUserData(user) {
        try {
            console.log('Loading user data for:', user.email);
            
            // Update user info in header
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                const userName = user.user_metadata?.full_name || user.email || 'User';
                const userRole = user.user_metadata?.role || 'student';
                
                userInfo.innerHTML = `
                    <span class="user-name">${userName}</span>
                    <span class="user-role">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
                `;
            }
            
            // Load user-specific data
            await loadNotifications();
            await loadOnlineUsers();
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    // Load dashboard data
    async function loadDashboardData() {
        console.log('Loading dashboard data');
        // This would be implemented with actual data loading
    }
    
    // Load notifications
    async function loadNotifications() {
        console.log('Loading notifications');
        // This would be implemented with actual data loading
    }
    
    // Load online users
    async function loadOnlineUsers() {
        console.log('Loading online users');
        // This would be implemented with actual data loading
    }
    
    // Setup event listeners
    function setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Chat input enter key
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (typeof sendMessage === 'function') {
                        sendMessage();
                    }
                }
            });
        }
    }
    
    // Section navigation
    window.showSection = function(sectionId) {
        console.log('Showing section:', sectionId);
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(`${sectionId}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Activate nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.textContent.toLowerCase().includes(sectionId)) {
                item.classList.add('active');
            }
        });
        
        window.currentSection = sectionId;
    };
    
    // Toast notification
    window.showToast = function(message, type = 'info', duration = 3000) {
        if (typeof Toastify === 'function') {
            const backgroundColor = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            }[type] || '#3b82f6';
            
            Toastify({
                text: message,
                duration: duration,
                gravity: "top",
                position: "right",
                backgroundColor: backgroundColor,
                stopOnFocus: true,
            }).showToast();
        } else {
            console.log(`${type}: ${message}`);
        }
    };
    
    // Modal functions
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };
    
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    };
    
    // Quick action functions
    window.createClass = function() {
        window.openModal('create-class-modal');
    };
    
    window.joinClass = function(classId = null) {
        window.showToast('Joining classroom...', 'info');
    };
    
    window.createAssignment = function() {
        window.openModal('create-assignment-modal');
    };
    
    console.log('=== script.js loaded successfully ===');
})();

console.log('📜 EduMeet - Production Script');

// Application state manager
class AppState {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.isInClass = false;
        this.activeClass = null;
        this.videoStream = null;
        this.audioStream = null;
        this.peerConnections = new Map();
    }
    
    setUser(user) {
        this.currentUser = user;
        this.saveToStorage();
    }
    
    clearUser() {
        this.currentUser = null;
        this.clearStorage();
    }
    
    saveToStorage() {
        if (this.currentUser) {
            localStorage.setItem('edumeet_user', JSON.stringify({
                id: this.currentUser.id,
                email: this.currentUser.email,
                metadata: this.currentUser.user_metadata
            }));
        }
    }
    
    clearStorage() {
        localStorage.removeItem('edumeet_user');
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('edumeet_user');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                this.clearStorage();
            }
        }
        return null;
    }
}

// Initialize global state
window.appState = new AppState();

// =====================
// MAIN INITIALIZATION
// =====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 EduMeet Initializing...');
    
    try {
        // Initialize core systems
        initializeEventListeners();
        initializeUIComponents();
        
        // Check authentication
        await initializeAuthentication();
        
        console.log('✅ EduMeet Ready');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showErrorScreen('Application failed to initialize. Please refresh.');
    }
});

// =====================
// AUTHENTICATION SYSTEM
// =====================

async function initializeAuthentication() {
    // Show loading state
    showLoading(true);
    
    try {
        // Check if Supabase is available
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Authentication service unavailable');
        }
        
        // Setup auth state listener
        setupAuthStateListener();
        
        // Check existing session
        await checkExistingSession();
        
    } catch (error) {
        console.error('Auth initialization error:', error);
        showLoginScreen();
    } finally {
        showLoading(false);
    }
}

function setupAuthStateListener() {
    if (!window.supabase?.auth) return;
    
    window.supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth State:', event);
        
        switch(event) {
            case 'SIGNED_IN':
            case 'INITIAL_SESSION':
                if (session?.user) {
                    handleUserSignedIn(session.user);
                } else {
                    showLoginScreen();
                }
                break;
                
            case 'SIGNED_OUT':
                handleUserSignedOut();
                break;
                
            case 'TOKEN_REFRESHED':
                console.log('Token refreshed');
                break;
                
            case 'USER_UPDATED':
                if (session?.user) {
                    updateUserData(session.user);
                }
                break;
        }
    });
}

async function checkExistingSession() {
    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
            handleUserSignedIn(session.user);
        } else {
            showLoginScreen();
        }
        
    } catch (error) {
        console.error('Session check error:', error);
        showLoginScreen();
    }
}

function handleUserSignedIn(user) {
    window.appState.setUser(user);
    showMainApp();
    loadUserData(user);
    loadInitialData();
}

function handleUserSignedOut() {
    window.appState.clearUser();
    cleanupMediaStreams();
    showLoginScreen();
}

function updateUserData(user) {
    window.appState.setUser(user);
    updateUserInterface(user);
}

// =====================
// USER DATA MANAGEMENT
// =====================

async function loadUserData(user) {
    console.log('👤 Loading user data');
    
    try {
        // Update user interface
        updateUserInterface(user);
        
        // Load user preferences
        await loadUserPreferences();
        
        // Initialize user-specific components
        initializeUserComponents(user);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

function updateUserInterface(user) {
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
    
    // Update UI based on role
    updateRoleBasedUI(user.user_metadata?.role || 'student');
}

function updateRoleBasedUI(role) {
    // Show/hide teacher-specific features
    const teacherElements = document.querySelectorAll('.teacher-only');
    teacherElements.forEach(el => {
        el.style.display = role === 'teacher' ? 'block' : 'none';
    });
    
    // Show/hide student-specific features
    const studentElements = document.querySelectorAll('.student-only');
    studentElements.forEach(el => {
        el.style.display = role === 'student' ? 'block' : 'none';
    });
}

async function loadUserPreferences() {
    try {
        if (!window.supabase || !window.appState.currentUser) return;
        
        // Load user preferences from database
        const { data, error } = await window.supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', window.appState.currentUser.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        
        if (data) {
            applyUserPreferences(data);
        }
        
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

function applyUserPreferences(preferences) {
    // Apply theme
    if (preferences.theme) {
        document.documentElement.setAttribute('data-theme', preferences.theme);
    }
    
    // Apply other preferences
    // (would be expanded based on your preference schema)
}

// =====================
// INITIAL DATA LOADING
// =====================

async function loadInitialData() {
    console.log('📦 Loading initial data');
    
    try {
        // Load in order of importance
        await Promise.allSettled([
            loadNotifications(),
            loadDashboardData(),
            loadOnlineStatus()
        ]);
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

async function loadDashboardData() {
    if (window.appState.currentSection !== 'dashboard') return;
    
    try {
        // Load dashboard components
        await Promise.allSettled([
            loadUpcomingClasses(),
            loadRecentAnnouncements(),
            loadAssignmentSummary(),
            loadAttendanceStats()
        ]);
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        showEmptyState('dashboard-content', 'Unable to load dashboard data');
    }
}

// =====================
// REAL DATA FUNCTIONS
// =====================

async function loadUpcomingClasses() {
    try {
        if (!window.supabase || !window.appState.currentUser) return;
        
        const { data, error } = await window.supabase
            .from('classes')
            .select(`
                id,
                name,
                description,
                schedule,
                duration_minutes,
                teacher:user_profiles(full_name)
            `)
            .eq('is_active', true)
            .gte('schedule', new Date().toISOString())
            .order('schedule', { ascending: true })
            .limit(5);
            
        if (error) throw error;
        
        updateClassesUI(data || []);
        
    } catch (error) {
        console.error('Error loading classes:', error);
        showEmptyState('upcoming-classes', 'Unable to load classes');
    }
}

async function loadRecentAnnouncements() {
    try {
        if (!window.supabase) return;
        
        const { data, error } = await window.supabase
            .from('announcements')
            .select(`
                id,
                title,
                message,
                created_at,
                sender:user_profiles(full_name)
            `)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (error) throw error;
        
        updateAnnouncementsUI(data || []);
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        showEmptyState('announcements', 'Unable to load announcements');
    }
}

async function loadNotifications() {
    try {
        if (!window.supabase || !window.appState.currentUser) return;
        
        const { data, error } = await window.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', window.appState.currentUser.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        updateNotificationsUI(data || []);
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// =====================
// UI UPDATE FUNCTIONS
// =====================

function updateClassesUI(classes) {
    const container = document.getElementById('upcoming-classes');
    if (!container) return;
    
    if (classes.length === 0) {
        showEmptyState('upcoming-classes', 'No upcoming classes');
        return;
    }
    
    container.innerHTML = classes.map(cls => `
        <div class="class-item">
            <div class="class-time">
                <i class="far fa-clock"></i>
                ${formatDateTime(cls.schedule)}
            </div>
            <div class="class-name">${cls.name}</div>
            <div class="class-meta">
                <span class="class-teacher">
                    <i class="fas fa-chalkboard-teacher"></i>
                    ${cls.teacher?.full_name || 'Teacher'}
                </span>
                <span class="class-duration">
                    <i class="far fa-hourglass"></i>
                    ${cls.duration_minutes || 60} min
                </span>
            </div>
            <div class="class-actions">
                <button class="btn btn-primary btn-sm" onclick="joinClass('${cls.id}')">
                    <i class="fas fa-video"></i> Join Class
                </button>
                ${window.appState.currentUser?.user_metadata?.role === 'teacher' ? `
                    <button class="btn btn-secondary btn-sm" onclick="editClass('${cls.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function updateAnnouncementsUI(announcements) {
    const container = document.getElementById('announcements');
    if (!container) return;
    
    if (announcements.length === 0) {
        showEmptyState('announcements', 'No announcements');
        return;
    }
    
    container.innerHTML = announcements.map(ann => `
        <div class="announcement-item">
            <div class="announcement-header">
                <div class="announcement-sender">
                    <i class="fas fa-user-circle"></i>
                    ${ann.sender?.full_name || 'System'}
                </div>
                <div class="announcement-time">
                    ${formatTimeAgo(ann.created_at)}
                </div>
            </div>
            <div class="announcement-title">${ann.title}</div>
            <div class="announcement-content">${ann.message}</div>
            ${ann.attachments ? `
                <div class="announcement-attachments">
                    <i class="fas fa-paperclip"></i>
                    ${ann.attachments.length} attachment(s)
                </div>
            ` : ''}
        </div>
    `).join('');
}

function updateNotificationsUI(notifications) {
    const list = document.getElementById('notifications-list');
    const counter = document.getElementById('notification-count');
    
    if (!list || !counter) return;
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        counter.textContent = '0';
        counter.classList.add('hidden');
        return;
    }
    
    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? '' : 'unread'}" 
             onclick="handleNotificationClick('${notif.id}')">
            <div class="notification-icon">
                <i class="fas fa-${getNotificationIcon(notif.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-time">${formatTimeAgo(notif.created_at)}</div>
            </div>
            ${!notif.is_read ? '<div class="notification-unread-dot"></div>' : ''}
        </div>
    `).join('');
    
    counter.textContent = notifications.filter(n => !n.is_read).length.toString();
    counter.classList.toggle('hidden', notifications.filter(n => !n.is_read).length === 0);
}

// =====================
// BUTTON IMPLEMENTATIONS
// =====================

// Classroom functions
window.joinClass = async function(classId) {
    try {
        showLoading(true, 'Joining classroom...');
        
        // Get class details
        const { data: classData, error } = await window.supabase
            .from('classes')
            .select('*')
            .eq('id', classId)
            .single();
            
        if (error) throw error;
        
        // Create session
        const sessionId = `class-${classId}-${Date.now()}`;
        
        // Join the session
        await joinClassSession(sessionId, classData);
        
        // Update UI
        window.appState.activeClass = classData;
        window.appState.isInClass = true;
        showSection('classroom');
        
        // Initialize classroom
        initializeClassroom(sessionId);
        
    } catch (error) {
        console.error('Error joining class:', error);
        showToast('Failed to join classroom', 'error');
    } finally {
        showLoading(false);
    }
};

window.createClass = function() {
    // Show create class form
    showClassCreationForm();
};

window.toggleVideo = async function() {
    if (!window.appState.videoStream) {
        await initializeVideo();
    } else {
        const videoTrack = window.appState.videoStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            updateVideoButton(videoTrack.enabled);
        }
    }
};

window.toggleAudio = async function() {
    if (!window.appState.audioStream) {
        await initializeAudio();
    } else {
        const audioTrack = window.appState.audioStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            updateAudioButton(audioTrack.enabled);
        }
    }
};

// Assignment functions
window.createAssignment = function() {
    showAssignmentCreationForm();
};

window.filterAssignments = function(filterType) {
    updateAssignmentFilter(filterType);
    loadFilteredAssignments(filterType);
};

window.submitAssignment = async function(assignmentId) {
    try {
        const content = prompt('Enter your submission or paste a link:');
        if (!content) return;
        
        const { error } = await window.supabase
            .from('submissions')
            .insert({
                assignment_id: assignmentId,
                student_id: window.appState.currentUser.id,
                content: content,
                submitted_at: new Date().toISOString()
            });
            
        if (error) throw error;
        
        showToast('Assignment submitted successfully', 'success');
        
    } catch (error) {
        console.error('Submission error:', error);
        showToast('Failed to submit assignment', 'error');
    }
};

// Grade functions
window.exportGrades = async function() {
    try {
        const { data, error } = await window.supabase
            .from('grades')
            .select(`
                assignment:assignments(title, due_date),
                score,
                feedback,
                graded_at
            `)
            .eq('student_id', window.appState.currentUser.id)
            .order('graded_at', { ascending: false });
            
        if (error) throw error;
        
        exportToCSV(data, 'grades.csv');
        showToast('Grades exported successfully', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export grades', 'error');
    }
};

// =====================
// UTILITY FUNCTIONS
// =====================

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
}

function showEmptyState(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

function showLoading(show, message = 'Loading...') {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        if (show) {
            loader.querySelector('p').textContent = message;
            loader.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
        }
    }
}

function showErrorScreen(message) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-screen">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2>Application Error</h2>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Reload Application
                </button>
            </div>
        `;
    }
}

// =====================
// UI STATE MANAGEMENT
// =====================

window.showSection = function(sectionId) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });
    
    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === `${sectionId}-section`);
    });
    
    // Update state
    window.appState.currentSection = sectionId;
    
    // Load section data
    loadSectionData(sectionId);
};

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'assignments':
            loadAssignments();
            break;
        case 'grades':
            loadGrades();
            break;
        case 'classroom':
            if (window.appState.isInClass) {
                initializeClassroomUI();
            }
            break;
    }
}

// =====================
// EVENT LISTENERS
// =====================

function initializeEventListeners() {
    // Chat input
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                sendChatMessage(e.target.value.trim());
                e.target.value = '';
            }
        });
    }
    
    // Modal handling
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
            document.getElementById('notifications-panel')?.classList.add('hidden');
        }
    });
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
}

function handleBeforeUnload(e) {
    if (window.appState.isInClass) {
        e.preventDefault();
        e.returnValue = 'You are in an active class. Are you sure you want to leave?';
        return e.returnValue;
    }
}

function handleOnlineStatus() {
    const isOnline = navigator.onLine;
    showToast(
        isOnline ? 'Back online' : 'Connection lost',
        isOnline ? 'success' : 'warning'
    );
}

// =====================
// EXPORT FUNCTIONS
// =====================

window.closeModal = function(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
};

window.closeAllModals = function() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
};

window.showToast = function(message, type = 'info') {
    console.log(`📣 ${type}: ${message}`);
    
    if (window.Toastify) {
        window.Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            }[type],
            stopOnFocus: true,
        }).showToast();
    }
};

// Initialize
console.log('✅ script.js loaded - Production Ready');

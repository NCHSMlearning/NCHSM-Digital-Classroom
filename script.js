// Main Application Script for EduMeet Online Classroom

// Global variables
let currentUser = null;
let currentSection = 'dashboard';
let isInClass = false;

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('EduMeet Online Classroom Initializing...');
    
    // Initialize Toastify
    if (typeof Toastify === 'function') {
        console.log('Toastify loaded');
    }
    
    // Check authentication status
    await checkAuthStatus();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    if (currentUser) {
        await loadInitialData();
    }
    
    console.log('Application initialized');
});

// Check authentication status
async function checkAuthStatus() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
            currentUser = user;
            showMainApp();
            await loadUserData(user);
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screens').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

// Show main application
function showMainApp() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screens').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

// Load user data
async function loadUserData(user) {
    try {
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

// Load initial data
async function loadInitialData() {
    try {
        // Load dashboard data
        await loadDashboardData();
        
        // Show welcome message
        const userName = currentUser?.user_metadata?.full_name || currentUser?.email || 'User';
        showToast(`Welcome back, ${userName}!`, 'success');
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Chat input enter key
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Close modals on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Close notifications when clicking outside
    document.addEventListener('click', (e) => {
        const notificationsPanel = document.getElementById('notifications-panel');
        const notificationsButton = document.querySelector('[onclick="toggleNotifications()"]');
        
        if (notificationsPanel && notificationsPanel.classList.contains('active') &&
            !notificationsPanel.contains(e.target) &&
            !notificationsButton.contains(e.target)) {
            notificationsPanel.classList.remove('active');
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load upcoming classes
        await loadUpcomingClasses();
        
        // Load announcements
        await loadAnnouncements();
        
        // Load stats
        await loadDashboardStats();
        
        // Load assignments due soon
        await loadAssignmentsDueSoon();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// Load upcoming classes
async function loadUpcomingClasses() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: classes, error } = await supabase
            .from('classes')
            .select('*')
            .gte('schedule', today)
            .order('schedule', { ascending: true })
            .limit(5);
        
        if (error) throw error;
        
        const container = document.getElementById('upcoming-classes');
        if (!container) return;
        
        if (classes && classes.length > 0) {
            container.innerHTML = classes.map(cls => `
                <div class="class-item">
                    <div class="class-time">${formatDateTime(cls.schedule)}</div>
                    <div class="class-name">${cls.name}</div>
                    <div class="class-description">${cls.description || ''}</div>
                    <button class="btn btn-primary btn-sm" onclick="joinClass('${cls.id}')">
                        <i class="fas fa-video"></i> Join
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No upcoming classes</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading classes:', error);
        const container = document.getElementById('upcoming-classes');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load classes</p>
                </div>
            `;
        }
    }
}

// Load announcements
async function loadAnnouncements() {
    try {
        const { data: announcements, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const container = document.getElementById('announcements');
        if (!container) return;
        
        if (announcements && announcements.length > 0) {
            container.innerHTML = announcements.map(announcement => `
                <div class="announcement-item">
                    <div class="announcement-header">
                        <span class="announcement-sender">${announcement.sender_name || 'System'}</span>
                        <span class="announcement-time">${formatTimeAgo(announcement.created_at)}</span>
                    </div>
                    <div class="announcement-title">${announcement.title}</div>
                    <div class="announcement-message">${announcement.message}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullhorn"></i>
                    <p>No announcements</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        // These would be real queries in production
        // For now, we'll use mock data
        
        const stats = {
            attendance: '95%',
            assignmentsDue: 3,
            averageGrade: 'A-',
            nextClass: '30m'
        };
        
        // Update UI
        document.getElementById('attendance-rate').textContent = stats.attendance;
        document.getElementById('assignments-due').textContent = stats.assignmentsDue;
        document.getElementById('avg-grade').textContent = stats.averageGrade;
        document.getElementById('next-class').textContent = stats.nextClass;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load assignments due soon
async function loadAssignmentsDueSoon() {
    try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const { data: assignments, error } = await supabase
            .from('assignments')
            .select('*')
            .gte('due_date', today.toISOString())
            .lte('due_date', nextWeek.toISOString())
            .order('due_date', { ascending: true })
            .limit(5);
        
        if (error) throw error;
        
        // Update assignments due count
        const assignmentsDueElement = document.getElementById('assignments-due');
        if (assignmentsDueElement && assignments) {
            assignmentsDueElement.textContent = assignments.length;
        }
        
    } catch (error) {
        console.error('Error loading assignments due:', error);
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser?.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const notificationCount = document.getElementById('notification-count');
        const notificationsList = document.getElementById('notifications-list');
        
        if (notificationCount) {
            const count = notifications?.length || 0;
            notificationCount.textContent = count;
            notificationCount.style.display = count > 0 ? 'flex' : 'none';
        }
        
        if (notificationsList) {
            if (notifications && notifications.length > 0) {
                notificationsList.innerHTML = notifications.map(notification => `
                    <div class="notification-item" onclick="markNotificationAsRead('${notification.id}')">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
                    </div>
                `).join('');
            } else {
                notificationsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Load online users
async function loadOnlineUsers() {
    try {
        // This would typically come from a real-time subscription
        // For now, we'll mock some data
        
        const mockUsers = [
            { id: '1', name: 'Alex Johnson', role: 'teacher', isOnline: true },
            { id: '2', name: 'Sarah Miller', role: 'student', isOnline: true },
            { id: '3', name: 'Mike Wilson', role: 'student', isOnline: true },
            { id: '4', name: 'Emma Davis', role: 'student', isOnline: false }
        ];
        
        const userList = document.getElementById('user-list');
        if (userList) {
            const onlineUsers = mockUsers.filter(user => user.isOnline);
            
            if (onlineUsers.length > 0) {
                userList.innerHTML = onlineUsers.map(user => `
                    <div class="user-item ${user.isOnline ? 'online' : 'offline'}">
                        <div class="user-avatar">${user.name.charAt(0)}</div>
                        <div class="user-details">
                            <div class="user-name">${user.name}</div>
                            <div class="user-role">${user.role}</div>
                        </div>
                        <div class="user-status ${user.isOnline ? 'online' : 'offline'}"></div>
                    </div>
                `).join('');
            } else {
                userList.innerHTML = `
                    <div class="empty-state">
                        <p>No users online</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading online users:', error);
    }
}

// Section navigation
function showSection(sectionId) {
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
    
    currentSection = sectionId;
    
    // Load section-specific data
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'classroom':
            loadClassroomData();
            break;
        case 'assignments':
            loadAssignments();
            break;
        case 'grades':
            loadGrades();
            break;
        case 'calendar':
            loadCalendar();
            break;
        case 'resources':
            loadResources();
            break;
        case 'discussions':
            loadDiscussions();
            break;
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Notification functions
function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);
        
        if (error) throw error;
        
        // Reload notifications
        await loadNotifications();
        
        showToast('Notification marked as read', 'success');
        
    } catch (error) {
        console.error('Error marking notification:', error);
        showToast('Error marking notification', 'error');
    }
}

// Utility functions
function formatDateTime(dateTime) {
    if (!dateTime) return 'N/A';
    
    const date = new Date(dateTime);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
        return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

function showToast(message, type = 'info', duration = 3000) {
    if (typeof Toastify !== 'function') {
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
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
}

// Section-specific loaders (these would be implemented in respective files)
async function loadClassroomData() {
    console.log('Loading classroom data...');
    // Implemented in classroom.js
}

async function loadAssignments() {
    console.log('Loading assignments...');
    // Implemented in assignments.js
}

async function loadGrades() {
    console.log('Loading grades...');
    // Implemented in assignments.js
}

async function loadCalendar() {
    console.log('Loading calendar...');
    // This would load calendar events
    const calendarContainer = document.getElementById('calendar');
    if (calendarContainer) {
        calendarContainer.innerHTML = `
            <div class="calendar-placeholder">
                <i class="fas fa-calendar-alt"></i>
                <p>Calendar View</p>
                <small>Coming soon...</small>
            </div>
        `;
    }
}

async function loadResources() {
    console.log('Loading resources...');
    const resourcesGrid = document.getElementById('resources-grid');
    if (resourcesGrid) {
        resourcesGrid.innerHTML = `
            <div class="resources-placeholder">
                <i class="fas fa-folder-open"></i>
                <p>Course Resources</p>
                <small>Upload and manage course materials</small>
            </div>
        `;
    }
}

async function loadDiscussions() {
    console.log('Loading discussions...');
    const discussionsContainer = document.getElementById('discussions-container');
    if (discussionsContainer) {
        discussionsContainer.innerHTML = `
            <div class="discussions-placeholder">
                <i class="fas fa-comments"></i>
                <p>Class Discussions</p>
                <small>Participate in class discussions and forums</small>
            </div>
        `;
    }
}

// Quick action functions
function createClass() {
    openModal('create-class-modal');
}

function joinClass(classId = null) {
    // This would be implemented in classroom.js
    console.log('Joining class:', classId);
    showToast('Joining classroom...', 'info');
}

function createAssignment() {
    openModal('create-assignment-modal');
}

function sendAnnouncement() {
    showToast('Send announcement feature coming soon!', 'info');
}

function uploadResource() {
    showToast('Upload resource feature coming soon!', 'info');
}

function createDiscussion() {
    showToast('Create discussion feature coming soon!', 'info');
}

function addCalendarEvent() {
    showToast('Add calendar event feature coming soon!', 'info');
}

function exportGrades() {
    showToast('Export grades feature coming soon!', 'info');
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred', 'error');
});

// Export for use in console
window.EduMeet = {
    showSection,
    openModal,
    closeModal,
    showToast,
    formatDateTime,
    formatTimeAgo,
    getCurrentUser: () => currentUser
};

console.log('EduMeet script loaded successfully');

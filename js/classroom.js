// js/classroom.js - Classroom Module
console.log('🏫 Loading classroom module...');

// =====================
// CLASSROOM STATE
// =====================
const ClassroomState = {
    currentClass: null,
    localStream: null,
    peerConnections: {},
    isInClass: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
    handRaised: false,
    participants: [],
    messages: []
};

// =====================
// MODULE INITIALIZATION
// =====================

// Initialize classroom module
function initClassroom() {
    console.log('🏫 Initializing classroom module');
    
    // Listen for section changes
    document.addEventListener('sectionChanged', async function(event) {
        if (event.detail.section === 'classroom') {
            console.log('🏫 Loading classroom section');
            await loadClassroomSection();
        }
    });
    
    // Setup event listeners
    setupClassroomListeners();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupClassroom);
}

// Setup classroom event listeners
function setupClassroomListeners() {
    // Join class button
    const joinClassBtn = document.getElementById('join-class-btn');
    if (joinClassBtn) {
        joinClassBtn.addEventListener('click', joinClass);
    }
    
    // Create class button
    const createClassBtn = document.getElementById('create-class-btn');
    if (createClassBtn) {
        createClassBtn.addEventListener('click', createClassModal);
    }
    
    // Save class button in modal
    const saveClassBtn = document.querySelector('#create-class-modal .btn-primary');
    if (saveClassBtn) {
        saveClassBtn.addEventListener('click', saveClass);
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
}

// =====================
// CLASSROOM SECTION
// =====================

// Load classroom section
async function loadClassroomSection() {
    console.log('🏫 Loading classroom section for:', AppState.userRole);
    
    try {
        // Show/hide buttons based on role
        updateClassroomUI();
        
        // Load available classes
        await loadAvailableClasses();
        
        // If already in a class, show active class
        if (ClassroomState.isInClass) {
            showActiveClass();
        }
        
    } catch (error) {
        console.error('❌ Error loading classroom section:', error);
        showToast('Error loading classroom', 'error');
    }
}

// Update classroom UI based on user role
function updateClassroomUI() {
    const createClassBtn = document.getElementById('create-class-btn');
    const joinClassBtn = document.getElementById('join-class-btn');
    
    if (!AppState.userRole) return;
    
    // Show create class button only for teachers
    if (createClassBtn) {
        createClassBtn.style.display = AppState.userRole === 'teacher' ? 'block' : 'none';
    }
    
    // Update join class button text
    if (joinClassBtn) {
        if (ClassroomState.isInClass) {
            joinClassBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Leave Class';
            joinClassBtn.classList.remove('btn-primary');
            joinClassBtn.classList.add('btn-danger');
        } else {
            joinClassBtn.innerHTML = '<i class="fas fa-video"></i> Join Class';
            joinClassBtn.classList.remove('btn-danger');
            joinClassBtn.classList.add('btn-primary');
        }
    }
}

// =====================
// CLASS MANAGEMENT
// =====================

// Open create class modal
window.createClass = function() {
    if (AppState.userRole !== 'teacher') {
        showToast('Only teachers can create classes', 'error');
        return;
    }
    
    const modal = document.getElementById('create-class-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Set default schedule (next hour)
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1);
        nextHour.setMinutes(0);
        nextHour.setSeconds(0);
        
        const scheduleInput = document.getElementById('class-schedule');
        if (scheduleInput) {
            scheduleInput.value = nextHour.toISOString().slice(0, 16);
        }
    }
}

// Create new class
async function saveClass() {
    const className = document.getElementById('class-name')?.value.trim();
    const description = document.getElementById('class-description')?.value.trim();
    const schedule = document.getElementById('class-schedule')?.value;
    const duration = document.getElementById('class-duration')?.value;
    
    // Validation
    if (!className || !schedule) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const { data, error } = await window.supabase
            .from('courses')
            .insert([{
                name: className,
                description: description || null,
                teacher_id: AppState.currentUser.id,
                schedule: schedule,
                duration_minutes: parseInt(duration) || 60,
                is_active: true,
                meeting_url: generateMeetingUrl(),
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Class created successfully!', 'success');
        closeModal('create-class-modal');
        
        // Clear form
        document.getElementById('class-name').value = '';
        document.getElementById('class-description').value = '';
        document.getElementById('class-duration').value = '60';
        
        // Load updated classes
        await loadAvailableClasses();
        
    } catch (error) {
        console.error('Error creating class:', error);
        showToast('Error creating class: ' + error.message, 'error');
    }
}

// Generate meeting URL
function generateMeetingUrl() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let meetingId = '';
    for (let i = 0; i < 10; i++) {
        meetingId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `edumeet-${meetingId}`;
}

// Load available classes
async function loadAvailableClasses() {
    try {
        let query;
        
        if (AppState.userRole === 'teacher') {
            // Teachers see their own classes
            query = window.supabase
                .from('courses')
                .select('*')
                .eq('teacher_id', AppState.currentUser.id)
                .eq('is_active', true)
                .order('schedule', { ascending: true });
        } else {
            // Students see upcoming classes
            const now = new Date().toISOString();
            query = window.supabase
                .from('courses')
                .select('*')
                .gte('schedule', now)
                .eq('is_active', true)
                .order('schedule', { ascending: true });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        displayAvailableClasses(data || []);
        
    } catch (error) {
        console.error('Error loading available classes:', error);
    }
}

// Display available classes
function displayAvailableClasses(classes) {
    const classroomContainer = document.getElementById('classroom-container');
    if (!classroomContainer) return;
    
    if (!classes || classes.length === 0) {
        classroomContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chalkboard-teacher"></i>
                <p>No classes available</p>
                ${AppState.userRole === 'teacher' ? 
                    '<button class="btn btn-primary" onclick="createClassModal()">Create Your First Class</button>' : 
                    '<p class="small">Check back later for upcoming classes</p>'
                }
            </div>
        `;
        return;
    }
    
    classroomContainer.innerHTML = `
        <div class="classroom-grid">
            ${classes.map(cls => `
                <div class="class-card" data-id="${cls.id}">
                    <div class="class-header">
                        <h4>${cls.name}</h4>
                        <span class="class-status ${new Date(cls.schedule) > new Date() ? 'upcoming' : 'completed'}">
                            ${new Date(cls.schedule) > new Date() ? 'Upcoming' : 'Completed'}
                        </span>
                    </div>
                    <div class="class-details">
                        <p class="class-description">${cls.description || 'No description provided'}</p>
                        <div class="class-meta">
                            <span class="meta-item">
                                <i class="far fa-calendar"></i>
                                ${formatDateTime(cls.schedule)}
                            </span>
                            <span class="meta-item">
                                <i class="far fa-clock"></i>
                                ${cls.duration_minutes || 60} minutes
                            </span>
                        </div>
                    </div>
                    <div class="class-actions">
                        ${new Date(cls.schedule) > new Date() ? `
                            <button class="btn btn-primary btn-sm" onclick="joinClass('${cls.id}')">
                                <i class="fas fa-video"></i> Join
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm" onclick="viewClassDetails('${cls.id}')">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// =====================
// CLASS PARTICIPATION
// =====================

// Join class
async function joinClass(classId = null) {
    console.log('🎯 Attempting to join class:', classId);
    
    // If already in a class, leave first
    if (ClassroomState.isInClass) {
        await leaveClass();
        return;
    }
    
    try {
        let classData;
        
        if (classId) {
            // Join specific class
            const { data, error } = await window.supabase
                .from('courses')
                .select('*')
                .eq('id', classId)
                .single();
            
            if (error) throw error;
            classData = data;
        } else {
            // Join next available class
            const now = new Date().toISOString();
            const { data, error } = await window.supabase
                .from('courses')
                .select('*')
                .gte('schedule', now)
                .eq('is_active', true)
                .order('schedule', { ascending: true })
                .limit(1)
                .single();
            
            if (error) {
                showToast('No upcoming classes available', 'info');
                return;
            }
            
            classData = data;
        }
        
        // Set current class
        ClassroomState.currentClass = classData;
        ClassroomState.isInClass = true;
        
        // Update UI
        updateClassroomUI();
        showActiveClass();
        
        // Initialize media (if browser supports it)
        await initMedia();
        
        // Connect to class
        connectToClass();
        
        showToast(`Joined class: ${classData.name}`, 'success');
        
    } catch (error) {
        console.error('❌ Error joining class:', error);
        showToast('Error joining class', 'error');
    }
}

// Show active class interface
function showActiveClass() {
    const classroomContainer = document.getElementById('classroom-container');
    if (!classroomContainer || !ClassroomState.currentClass) return;
    
    classroomContainer.innerHTML = `
        <div class="active-class">
            <div class="class-header">
                <h3>${ClassroomState.currentClass.name}</h3>
                <div class="class-info">
                    <span class="class-time">
                        <i class="far fa-clock"></i>
                        ${formatDateTime(ClassroomState.currentClass.schedule)}
                    </span>
                    <span class="class-duration">
                        <i class="fas fa-hourglass-half"></i>
                        ${ClassroomState.currentClass.duration_minutes || 60} minutes
                    </span>
                </div>
            </div>
            
            <div class="video-container">
                <div class="video-grid" id="video-grid">
                    <div class="video-tile local-video">
                        <div class="video-placeholder" id="local-video-placeholder">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="video-info">
                            <span class="user-name">You</span>
                            <div class="video-controls">
                                <button class="control-btn ${ClassroomState.isVideoEnabled ? 'active' : ''}" 
                                        onclick="toggleVideo()" id="video-toggle">
                                    <i class="fas ${ClassroomState.isVideoEnabled ? 'fa-video' : 'fa-video-slash'}"></i>
                                </button>
                                <button class="control-btn ${ClassroomState.isAudioEnabled ? 'active' : ''}" 
                                        onclick="toggleAudio()" id="audio-toggle">
                                    <i class="fas ${ClassroomState.isAudioEnabled ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
                                </button>
                                <button class="control-btn" onclick="toggleScreenShare()" id="screen-share-btn">
                                    <i class="fas fa-desktop"></i>
                                </button>
                                <button class="control-btn ${ClassroomState.handRaised ? 'active' : ''}" 
                                        onclick="raiseHand()" id="hand-raise-btn">
                                    <i class="fas fa-hand-paper"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="class-sidebar">
                    <div class="sidebar-section participants-section">
                        <h4><i class="fas fa-users"></i> Participants</h4>
                        <div class="participants-list" id="participants-list">
                            <div class="participant-item">
                                <div class="participant-avatar">
                                    ${AppState.currentUser?.user_metadata?.full_name?.charAt(0) || 'Y'}
                                </div>
                                <div class="participant-info">
                                    <div class="participant-name">You</div>
                                    <div class="participant-role">${AppState.userRole}</div>
                                </div>
                                <div class="participant-status">
                                    <i class="fas fa-microphone ${ClassroomState.isAudioEnabled ? '' : 'muted'}"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sidebar-section chat-section">
                        <h4><i class="fas fa-comments"></i> Chat</h4>
                        <div class="chat-messages" id="chat-messages">
                            <div class="welcome-message">
                                Welcome to ${ClassroomState.currentClass.name}!
                            </div>
                        </div>
                        <div class="chat-input">
                            <input type="text" id="chat-input" placeholder="Type a message...">
                            <button class="btn btn-primary" onclick="sendChatMessage()">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="class-actions">
                <button class="btn btn-danger" onclick="leaveClass()">
                    <i class="fas fa-sign-out-alt"></i> Leave Class
                </button>
                <button class="btn btn-secondary" onclick="showClassResources()">
                    <i class="fas fa-folder-open"></i> Resources
                </button>
            </div>
        </div>
    `;
    
    // Setup chat input listener
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
}

// Initialize media (camera & microphone)
async function initMedia() {
    try {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('⚠️ Media devices not supported');
            return;
        }
        
        // Get user media
        ClassroomState.localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        // Update local video display
        const localVideoPlaceholder = document.getElementById('local-video-placeholder');
        if (localVideoPlaceholder) {
            localVideoPlaceholder.innerHTML = `
                <video autoplay muted playsinline></video>
            `;
            const videoElement = localVideoPlaceholder.querySelector('video');
            videoElement.srcObject = ClassroomState.localStream;
        }
        
        console.log('✅ Media initialized successfully');
        
    } catch (error) {
        console.error('❌ Error accessing media devices:', error);
        showToast('Unable to access camera/microphone. Please check permissions.', 'warning');
    }
}

// Connect to class (simulated)
function connectToClass() {
    console.log('🔗 Connecting to class...');
    
    // Simulate connection and adding participants
    setTimeout(() => {
        addParticipant('teacher-1', 'Teacher', true);
        addParticipant('student-1', 'Alex Johnson', false);
        addParticipant('student-2', 'Maria Garcia', false);
    }, 1500);
}

// Add participant to class
function addParticipant(id, name, isTeacher) {
    const participantsList = document.getElementById('participants-list');
    const videoGrid = document.getElementById('video-grid');
    
    if (!participantsList || !videoGrid) return;
    
    // Add to participants list
    const participantItem = document.createElement('div');
    participantItem.className = 'participant-item';
    participantItem.innerHTML = `
        <div class="participant-avatar">
            ${name.charAt(0)}
        </div>
        <div class="participant-info">
            <div class="participant-name">${name}</div>
            <div class="participant-role">${isTeacher ? 'Teacher' : 'Student'}</div>
        </div>
        <div class="participant-status">
            <i class="fas fa-microphone"></i>
        </div>
    `;
    participantsList.appendChild(participantItem);
    
    // Add to video grid (except for self)
    if (id !== 'self') {
        const videoTile = document.createElement('div');
        videoTile.className = 'video-tile remote-video';
        videoTile.innerHTML = `
            <div class="video-placeholder">
                <i class="fas fa-user"></i>
            </div>
            <div class="video-info">
                <span class="user-name">${name}</span>
                <span class="user-role">${isTeacher ? 'Teacher' : 'Student'}</span>
            </div>
        `;
        videoGrid.appendChild(videoTile);
    }
    
    // Store participant
    ClassroomState.participants.push({ id, name, isTeacher });
}

// =====================
// MEDIA CONTROLS
// =====================

// Toggle video
async function toggleVideo() {
    if (!ClassroomState.localStream) return;
    
    const videoTrack = ClassroomState.localStream.getVideoTracks()[0];
    if (videoTrack) {
        ClassroomState.isVideoEnabled = !videoTrack.enabled;
        videoTrack.enabled = ClassroomState.isVideoEnabled;
        
        const videoToggle = document.getElementById('video-toggle');
        if (videoToggle) {
            videoToggle.classList.toggle('active', ClassroomState.isVideoEnabled);
            videoToggle.querySelector('i').className = ClassroomState.isVideoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
        }
        
        showToast(ClassroomState.isVideoEnabled ? 'Video enabled' : 'Video disabled', 'info');
    }
}

// Toggle audio
async function toggleAudio() {
    if (!ClassroomState.localStream) return;
    
    const audioTrack = ClassroomState.localStream.getAudioTracks()[0];
    if (audioTrack) {
        ClassroomState.isAudioEnabled = !audioTrack.enabled;
        audioTrack.enabled = ClassroomState.isAudioEnabled;
        
        const audioToggle = document.getElementById('audio-toggle');
        if (audioToggle) {
            audioToggle.classList.toggle('active', ClassroomState.isAudioEnabled);
            audioToggle.querySelector('i').className = ClassroomState.isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        }
        
        // Update participant status
        updateParticipantAudioStatus();
        
        showToast(ClassroomState.isAudioEnabled ? 'Audio enabled' : 'Audio disabled', 'info');
    }
}

// Toggle screen sharing
async function toggleScreenShare() {
    if (!ClassroomState.isInClass) return;
    
    try {
        if (!ClassroomState.isScreenSharing) {
            // Start screen sharing
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            ClassroomState.isScreenSharing = true;
            
            const screenShareBtn = document.getElementById('screen-share-btn');
            if (screenShareBtn) {
                screenShareBtn.classList.add('active');
            }
            
            showToast('Screen sharing started', 'success');
            
            // Stop sharing when track ends
            screenStream.getVideoTracks()[0].onended = () => {
                ClassroomState.isScreenSharing = false;
                if (screenShareBtn) {
                    screenShareBtn.classList.remove('active');
                }
                showToast('Screen sharing stopped', 'info');
            };
            
        } else {
            ClassroomState.isScreenSharing = false;
            
            const screenShareBtn = document.getElementById('screen-share-btn');
            if (screenShareBtn) {
                screenShareBtn.classList.remove('active');
            }
            
            showToast('Screen sharing stopped', 'info');
        }
        
    } catch (error) {
        console.error('Screen sharing error:', error);
        if (error.name !== 'NotAllowedError') {
            showToast('Error sharing screen', 'error');
        }
    }
}

// Raise hand
function raiseHand() {
    ClassroomState.handRaised = !ClassroomState.handRaised;
    
    const handRaiseBtn = document.getElementById('hand-raise-btn');
    if (handRaiseBtn) {
        handRaiseBtn.classList.toggle('active', ClassroomState.handRaised);
    }
    
    if (ClassroomState.handRaised) {
        showToast('Hand raised!', 'success');
        
        // Simulate teacher acknowledgment
        setTimeout(() => {
            if (ClassroomState.handRaised) {
                addChatMessage('Teacher', 'Yes, go ahead!', false);
                ClassroomState.handRaised = false;
                if (handRaiseBtn) {
                    handRaiseBtn.classList.remove('active');
                }
            }
        }, 3000);
        
    } else {
        showToast('Hand lowered', 'info');
    }
}

// Update participant audio status
function updateParticipantAudioStatus() {
    const participantItems = document.querySelectorAll('.participant-item');
    if (participantItems.length > 0) {
        const firstParticipant = participantItems[0];
        const statusIcon = firstParticipant.querySelector('.participant-status i');
        if (statusIcon) {
            statusIcon.className = ClassroomState.isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash muted';
        }
    }
}

// =====================
// CHAT FUNCTIONALITY
// =====================

// Send chat message
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput?.value.trim();
    
    if (!message) return;
    
    const userName = AppState.currentUser?.user_metadata?.full_name || 
                    AppState.currentUser?.email?.split('@')[0] || 
                    'You';
    
    // Add message to chat
    addChatMessage(userName, message, true);
    
    // Clear input
    if (chatInput) {
        chatInput.value = '';
    }
    
    // Simulate responses
    simulateChatResponse();
}

// Add chat message
function addChatMessage(sender, message, isSent) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${sender}</span>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="message-content">${message}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Store message
    ClassroomState.messages.push({
        sender,
        message,
        time: new Date(),
        isSent
    });
}

// Simulate chat response
function simulateChatResponse() {
    const responses = [
        { sender: 'Teacher', message: 'Great question!' },
        { sender: 'Teacher', message: 'Can you explain that further?' },
        { sender: 'Teacher', message: 'I agree with that point.' },
        { sender: 'Teacher', message: 'Thanks for sharing!' },
        { sender: 'Alex Johnson', message: 'I have a similar question.' },
        { sender: 'Maria Garcia', message: 'That was very helpful, thanks!' }
    ];
    
    // Random delay between 1-3 seconds
    const delay = 1000 + Math.random() * 2000;
    
    setTimeout(() => {
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(randomResponse.sender, randomResponse.message, false);
    }, delay);
}

// =====================
// CLASSROOM CONTROLS
// =====================

// Leave class
async function leaveClass() {
    if (!ClassroomState.isInClass) return;
    
    console.log('👋 Leaving class');
    
    // Stop media streams
    if (ClassroomState.localStream) {
        ClassroomState.localStream.getTracks().forEach(track => {
            track.stop();
        });
        ClassroomState.localStream = null;
    }
    
    // Reset state
    ClassroomState.isInClass = false;
    ClassroomState.currentClass = null;
    ClassroomState.isVideoEnabled = true;
    ClassroomState.isAudioEnabled = true;
    ClassroomState.isScreenSharing = false;
    ClassroomState.handRaised = false;
    ClassroomState.participants = [];
    ClassroomState.messages = [];
    
    // Update UI
    updateClassroomUI();
    
    // Reload classroom section
    await loadClassroomSection();
    
    showToast('Left the class', 'info');
}

// View class details
function viewClassDetails(classId) {
    showToast('Class details will be shown here', 'info');
    // In a full implementation, this would open a modal with detailed info
}

// Show class resources
function showClassResources() {
    showToast('Class resources will be shown here', 'info');
    // In a full implementation, this would show resources for the current class
}

// Cleanup classroom on page unload
function cleanupClassroom() {
    if (ClassroomState.isInClass) {
        leaveClass();
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

// Format date time
function formatDateTime(dateString) {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
        return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// =====================
// MODULE EXPORTS
// =====================

window.initClassroom = initClassroom;
window.createClassModal = createClassModal;
window.joinClass = joinClass;
window.leaveClass = leaveClass;
window.toggleVideo = toggleVideo;
window.toggleAudio = toggleAudio;
window.toggleScreenShare = toggleScreenShare;
window.raiseHand = raiseHand;
window.sendChatMessage = sendChatMessage;
window.saveClass = saveClass; // Make sure this is included!
window.closeModal = closeModal; // Make sure this is included!

console.log('✅ classroom.js loaded - Classroom module ready');

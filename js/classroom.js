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
    
    // Setup event listeners (ONCE only)
    setupClassroomListeners();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupClassroom);
}

// Setup classroom event listeners - FIXED VERSION
function setupClassroomListeners() {
    console.log('🏫 Setting up classroom listeners');
    
    // Track if we've already set up listeners
    if (window._classroomListenersSetup) {
        console.log('🏫 Listeners already set up, skipping');
        return;
    }
    
    // Flag to prevent duplicate setup
    window._classroomListenersSetup = true;
    
    // Remove any inline onclick handlers from buttons
    const createClassBtns = document.querySelectorAll('[onclick*="createClassModal"], [onclick*="saveClass"]');
    createClassBtns.forEach(btn => {
        btn.removeAttribute('onclick');
    });
    
    // Use event delegation for ALL clicks
    document.addEventListener('click', handleClassroomClicks, true);
    
    console.log('✅ Classroom listeners setup complete');
}

// Global click handler for classroom
function handleClassroomClicks(e) {
    const target = e.target;
    
    // 1. CREATE CLASS BUTTONS (in dashboard or classroom)
    if (target.closest('#create-class-btn') || 
        target.closest('[id*="create-class"][class*="btn"]') ||
        target.closest('.teacher-only [onclick*="createClass"]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        console.log('📝 Create Class button clicked');
        createClassModal();
        return;
    }
    
    // 2. SAVE CLASS BUTTON in modal
    if (target.closest('#create-class-modal .btn-primary')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        console.log('💾 Save Class button clicked');
        saveClass();
        return;
    }
    
    // 3. MODAL CLOSE BUTTONS
    if (target.closest('.modal-close') || 
        target.closest('[onclick*="closeModal"]') ||
        target.closest('#create-class-modal .btn-secondary')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const modal = target.closest('.modal');
        if (modal) {
            modal.classList.add('hidden');
            console.log('❌ Modal closed:', modal.id);
        }
        return;
    }
    
    // 4. JOIN CLASS BUTTON
    if (target.closest('#join-class-btn')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        console.log('🎯 Join Class button clicked');
        joinClass();
        return;
    }
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
    
    if (!AppState.userRole) {
        console.warn('⚠️ No user role found in AppState');
        return;
    }
    
    console.log('🔄 Updating classroom UI for role:', AppState.userRole);
    
    // Show create class button only for teachers
    if (createClassBtn) {
        createClassBtn.style.display = AppState.userRole === 'teacher' ? 'block' : 'none';
        console.log('👨‍🏫 Create class button display:', createClassBtn.style.display);
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
window.createClassModal = function() {
    console.log('📋 Opening create class modal');
    
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
        
        // Focus on class name input
        const classNameInput = document.getElementById('class-name');
        if (classNameInput) {
            classNameInput.focus();
        }
        
        console.log('✅ Create class modal opened');
    } else {
        console.error('❌ Create class modal not found!');
    }
}

// Create new class
window.saveClass = async function() {
    console.log('💾 Starting saveClass function');
    
    const className = document.getElementById('class-name')?.value.trim();
    const description = document.getElementById('class-description')?.value.trim();
    const schedule = document.getElementById('class-schedule')?.value;
    const duration = document.getElementById('class-duration')?.value;
    
    console.log('📝 Form data:', { className, description, schedule, duration });
    
    // Validation
    if (!className) {
        showToast('Class name is required', 'error');
        return;
    }
    
    if (!schedule) {
        showToast('Schedule is required', 'error');
        return;
    }
    
    // Check if schedule is in the future
    const scheduleDate = new Date(schedule);
    const now = new Date();
    if (scheduleDate <= now) {
        showToast('Schedule must be in the future', 'error');
        return;
    }
    
    try {
        console.log('📊 Creating class in database...');
        
        const { data, error } = await window.supabase
            .from('courses')
            .insert([{
                name: className,
                description: description || null,
                teacher_id: AppState.currentUser?.id || AppState.currentUser?.user?.id,
                schedule: schedule,
                duration_minutes: parseInt(duration) || 60,
                is_active: true,
                meeting_url: generateMeetingUrl(),
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log('✅ Class created:', data);
        showToast('Class created successfully!', 'success');
        closeModal('create-class-modal');
        
        // Clear form
        document.getElementById('class-name').value = '';
        document.getElementById('class-description').value = '';
        document.getElementById('class-schedule').value = '';
        document.getElementById('class-duration').value = '60';
        
        // Load updated classes
        await loadAvailableClasses();
        
        return data;
        
    } catch (error) {
        console.error('❌ Error creating class:', error);
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
    console.log('📚 Loading available classes...');
    
    try {
        let query;
        
        if (AppState.userRole === 'teacher') {
            console.log('👨‍🏫 Loading teacher classes for:', AppState.currentUser?.id);
            // Teachers see their own classes
            query = window.supabase
                .from('courses')
                .select('*')
                .eq('teacher_id', AppState.currentUser?.id || AppState.currentUser?.user?.id)
                .eq('is_active', true)
                .order('schedule', { ascending: true });
        } else {
            console.log('👨‍🎓 Loading student classes');
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
        
        if (error) {
            console.error('❌ Database error loading classes:', error);
            throw error;
        }
        
        console.log('✅ Classes loaded:', data?.length || 0);
        displayAvailableClasses(data || []);
        
    } catch (error) {
        console.error('❌ Error loading available classes:', error);
        showToast('Error loading classes', 'error');
    }
}

// Display available classes
function displayAvailableClasses(classes) {
    const classroomContainer = document.getElementById('classroom-container');
    if (!classroomContainer) {
        console.error('❌ Classroom container not found!');
        return;
    }
    
    console.log('🎨 Displaying classes:', classes.length);
    
    if (!classes || classes.length === 0) {
        classroomContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chalkboard-teacher"></i>
                <p>No classes available</p>
                ${AppState.userRole === 'teacher' ? 
                    '<button class="btn btn-primary" id="empty-create-btn">Create Your First Class</button>' : 
                    '<p class="small">Check back later for upcoming classes</p>'
                }
            </div>
        `;
        
        // Add listener to the empty state button
        const emptyBtn = document.getElementById('empty-create-btn');
        if (emptyBtn) {
            emptyBtn.addEventListener('click', createClassModal);
        }
        
        return;
    }
    
    classroomContainer.innerHTML = `
        <div class="classroom-grid">
            ${classes.map(cls => {
                const isUpcoming = new Date(cls.schedule) > new Date();
                return `
                <div class="class-card" data-id="${cls.id}">
                    <div class="class-header">
                        <h4>${cls.name}</h4>
                        <span class="class-status ${isUpcoming ? 'upcoming' : 'completed'}">
                            ${isUpcoming ? 'Upcoming' : 'Completed'}
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
                        ${isUpcoming ? `
                            <button class="btn btn-primary btn-sm join-class-btn" data-id="${cls.id}">
                                <i class="fas fa-video"></i> Join
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm view-details-btn" data-id="${cls.id}">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Add event listeners to dynamically created buttons
    document.querySelectorAll('.join-class-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classId = this.getAttribute('data-id');
            joinClass(classId);
        });
    });
    
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classId = this.getAttribute('data-id');
            viewClassDetails(classId);
        });
    });
}

// =====================
// CLASS PARTICIPATION
// =====================

// Join class
window.joinClass = async function(classId = null) {
    console.log('🎯 Attempting to join class:', classId || 'next available');
    
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
        
        // Check if class is active
        if (!classData.is_active) {
            showToast('This class is no longer active', 'error');
            return;
        }
        
        // Set current class
        ClassroomState.currentClass = classData;
        ClassroomState.isInClass = true;
        
        console.log('✅ Joined class:', classData.name);
        
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
        showToast('Error joining class: ' + error.message, 'error');
    }
}

// Show active class interface
function showActiveClass() {
    const classroomContainer = document.getElementById('classroom-container');
    if (!classroomContainer || !ClassroomState.currentClass) {
        console.error('❌ Cannot show active class: container or class data missing');
        return;
    }
    
    console.log('🎬 Showing active class interface');
    
    const userName = AppState.currentUser?.user_metadata?.full_name || 
                    AppState.currentUser?.email?.split('@')[0] || 
                    'You';
    
    classroomContainer.innerHTML = `
        <div class="active-class">
            <div class="class-header">
                <h3><i class="fas fa-chalkboard-teacher"></i> ${ClassroomState.currentClass.name}</h3>
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
                            <div class="video-status">
                                <span class="status-indicator ${ClassroomState.isVideoEnabled ? 'active' : 'inactive'}"></span>
                                ${ClassroomState.isVideoEnabled ? 'Camera On' : 'Camera Off'}
                            </div>
                        </div>
                        <div class="video-info">
                            <span class="user-name">${userName} (You)</span>
                            <div class="video-controls">
                                <button class="control-btn ${ClassroomState.isVideoEnabled ? 'active' : ''}" 
                                        id="video-toggle" title="Toggle Video">
                                    <i class="fas ${ClassroomState.isVideoEnabled ? 'fa-video' : 'fa-video-slash'}"></i>
                                </button>
                                <button class="control-btn ${ClassroomState.isAudioEnabled ? 'active' : ''}" 
                                        id="audio-toggle" title="Toggle Audio">
                                    <i class="fas ${ClassroomState.isAudioEnabled ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
                                </button>
                                <button class="control-btn" id="screen-share-btn" title="Share Screen">
                                    <i class="fas fa-desktop"></i>
                                </button>
                                <button class="control-btn ${ClassroomState.handRaised ? 'active' : ''}" 
                                        id="hand-raise-btn" title="Raise Hand">
                                    <i class="fas fa-hand-paper"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="class-sidebar">
                    <div class="sidebar-section participants-section">
                        <h4><i class="fas fa-users"></i> Participants (<span id="participant-count">1</span>)</h4>
                        <div class="participants-list" id="participants-list">
                            <div class="participant-item host">
                                <div class="participant-avatar">
                                    ${userName.charAt(0)}
                                </div>
                                <div class="participant-info">
                                    <div class="participant-name">${userName} (You)</div>
                                    <div class="participant-role">${AppState.userRole}</div>
                                </div>
                                <div class="participant-status">
                                    <i class="fas fa-microphone ${ClassroomState.isAudioEnabled ? '' : 'muted'}"></i>
                                    ${ClassroomState.handRaised ? '<i class="fas fa-hand-paper hand-raised"></i>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sidebar-section chat-section">
                        <h4><i class="fas fa-comments"></i> Chat</h4>
                        <div class="chat-messages" id="chat-messages">
                            <div class="welcome-message system-message">
                                <i class="fas fa-bullhorn"></i>
                                Welcome to ${ClassroomState.currentClass.name}! Class started at ${new Date().toLocaleTimeString()}.
                            </div>
                        </div>
                        <div class="chat-input">
                            <input type="text" id="chat-input" placeholder="Type a message...">
                            <button class="btn btn-primary" id="send-chat-btn" title="Send Message">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="class-actions">
                <button class="btn btn-danger" id="leave-class-btn">
                    <i class="fas fa-sign-out-alt"></i> Leave Class
                </button>
                <button class="btn btn-secondary" id="resources-btn">
                    <i class="fas fa-folder-open"></i> Resources
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners to active class controls
    document.getElementById('video-toggle')?.addEventListener('click', toggleVideo);
    document.getElementById('audio-toggle')?.addEventListener('click', toggleAudio);
    document.getElementById('screen-share-btn')?.addEventListener('click', toggleScreenShare);
    document.getElementById('hand-raise-btn')?.addEventListener('click', raiseHand);
    document.getElementById('send-chat-btn')?.addEventListener('click', sendChatMessage);
    document.getElementById('leave-class-btn')?.addEventListener('click', leaveClass);
    document.getElementById('resources-btn')?.addEventListener('click', showClassResources);
    
    // Chat input enter key
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
            showToast('Your browser does not support video/audio. Please use Chrome, Firefox, or Edge.', 'warning');
            return;
        }
        
        // Get user media
        ClassroomState.localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
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
        
        if (error.name === 'NotAllowedError') {
            showToast('Camera/microphone access denied. Please allow permissions.', 'error');
        } else if (error.name === 'NotFoundError') {
            showToast('No camera/microphone found. Please connect a device.', 'error');
        } else {
            showToast('Unable to access camera/microphone. Please check permissions.', 'warning');
        }
    }
}

// Connect to class (simulated)
function connectToClass() {
    console.log('🔗 Connecting to class...');
    
    // Simulate connection and adding participants
    setTimeout(() => {
        addParticipant('teacher-1', 'Dr. Smith', true);
        addParticipant('student-1', 'Alex Johnson', false);
        addParticipant('student-2', 'Maria Garcia', false);
        addParticipant('student-3', 'David Chen', false);
        
        // Add welcome message
        addChatMessage('Dr. Smith', 'Welcome everyone! Let\'s get started.', false);
    }, 1500);
}

// Add participant to class
function addParticipant(id, name, isTeacher) {
    const participantsList = document.getElementById('participants-list');
    const videoGrid = document.getElementById('video-grid');
    
    if (!participantsList || !videoGrid) return;
    
    // Add to participants list
    const participantItem = document.createElement('div');
    participantItem.className = `participant-item ${isTeacher ? 'host' : ''}`;
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
                <div class="video-status">
                    <span class="status-indicator active"></span>
                    Online
                </div>
            </div>
            <div class="video-info">
                <span class="user-name">${name}</span>
                <span class="user-role">${isTeacher ? 'Teacher' : 'Student'}</span>
            </div>
        `;
        videoGrid.appendChild(videoTile);
    }
    
    // Update participant count
    const participantCount = document.getElementById('participant-count');
    if (participantCount) {
        participantCount.textContent = document.querySelectorAll('.participant-item').length;
    }
    
    // Store participant
    ClassroomState.participants.push({ id, name, isTeacher });
    
    // Show notification for new participant
    if (id !== 'self') {
        showToast(`${name} joined the class`, 'info');
    }
}

// =====================
// MEDIA CONTROLS
// =====================

// Toggle video
window.toggleVideo = async function() {
    if (!ClassroomState.localStream) {
        console.warn('⚠️ No local stream to toggle video');
        return;
    }
    
    const videoTrack = ClassroomState.localStream.getVideoTracks()[0];
    if (videoTrack) {
        ClassroomState.isVideoEnabled = !videoTrack.enabled;
        videoTrack.enabled = ClassroomState.isVideoEnabled;
        
        const videoToggle = document.getElementById('video-toggle');
        if (videoToggle) {
            videoToggle.classList.toggle('active', ClassroomState.isVideoEnabled);
            videoToggle.querySelector('i').className = ClassroomState.isVideoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
            videoToggle.title = ClassroomState.isVideoEnabled ? 'Turn off camera' : 'Turn on camera';
        }
        
        // Update video placeholder status
        const localVideoPlaceholder = document.getElementById('local-video-placeholder');
        if (localVideoPlaceholder) {
            const statusElement = localVideoPlaceholder.querySelector('.video-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    <span class="status-indicator ${ClassroomState.isVideoEnabled ? 'active' : 'inactive'}"></span>
                    ${ClassroomState.isVideoEnabled ? 'Camera On' : 'Camera Off'}
                `;
            }
        }
        
        showToast(ClassroomState.isVideoEnabled ? 'Video enabled' : 'Video disabled', 'info');
    }
}

// Toggle audio
window.toggleAudio = async function() {
    if (!ClassroomState.localStream) {
        console.warn('⚠️ No local stream to toggle audio');
        return;
    }
    
    const audioTrack = ClassroomState.localStream.getAudioTracks()[0];
    if (audioTrack) {
        ClassroomState.isAudioEnabled = !audioTrack.enabled;
        audioTrack.enabled = ClassroomState.isAudioEnabled;
        
        const audioToggle = document.getElementById('audio-toggle');
        if (audioToggle) {
            audioToggle.classList.toggle('active', ClassroomState.isAudioEnabled);
            audioToggle.querySelector('i').className = ClassroomState.isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
            audioToggle.title = ClassroomState.isAudioEnabled ? 'Mute microphone' : 'Unmute microphone';
        }
        
        // Update participant status
        updateParticipantAudioStatus();
        
        showToast(ClassroomState.isAudioEnabled ? 'Microphone enabled' : 'Microphone muted', 'info');
    }
}

// Toggle screen sharing
window.toggleScreenShare = async function() {
    if (!ClassroomState.isInClass) {
        showToast('You must be in a class to share screen', 'error');
        return;
    }
    
    try {
        if (!ClassroomState.isScreenSharing) {
            // Start screen sharing
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    displaySurface: "browser"
                },
                audio: true
            });
            
            ClassroomState.isScreenSharing = true;
            
            const screenShareBtn = document.getElementById('screen-share-btn');
            if (screenShareBtn) {
                screenShareBtn.classList.add('active');
                screenShareBtn.title = 'Stop sharing';
            }
            
            showToast('Screen sharing started', 'success');
            
            // Stop sharing when track ends
            screenStream.getVideoTracks()[0].onended = () => {
                ClassroomState.isScreenSharing = false;
                const btn = document.getElementById('screen-share-btn');
                if (btn) {
                    btn.classList.remove('active');
                    btn.title = 'Share screen';
                }
                showToast('Screen sharing stopped', 'info');
            };
            
        } else {
            ClassroomState.isScreenSharing = false;
            
            const screenShareBtn = document.getElementById('screen-share-btn');
            if (screenShareBtn) {
                screenShareBtn.classList.remove('active');
                screenShareBtn.title = 'Share screen';
            }
            
            showToast('Screen sharing stopped', 'info');
        }
        
    } catch (error) {
        console.error('Screen sharing error:', error);
        if (error.name !== 'NotAllowedError') {
            showToast('Error sharing screen: ' + error.message, 'error');
        }
    }
}

// Raise hand
window.raiseHand = function() {
    ClassroomState.handRaised = !ClassroomState.handRaised;
    
    const handRaiseBtn = document.getElementById('hand-raise-btn');
    if (handRaiseBtn) {
        handRaiseBtn.classList.toggle('active', ClassroomState.handRaised);
        handRaiseBtn.title = ClassroomState.handRaised ? 'Lower hand' : 'Raise hand';
    }
    
    // Update participant status
    updateParticipantHandStatus();
    
    if (ClassroomState.handRaised) {
        showToast('✋ Hand raised! Teacher will acknowledge you shortly.', 'success');
        
        // Simulate teacher acknowledgment
        setTimeout(() => {
            if (ClassroomState.handRaised) {
                addChatMessage('Dr. Smith', 'Yes, go ahead!', false);
                ClassroomState.handRaised = false;
                if (handRaiseBtn) {
                    handRaiseBtn.classList.remove('active');
                    handRaiseBtn.title = 'Raise hand';
                }
                updateParticipantHandStatus();
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
        const statusIcon = firstParticipant.querySelector('.participant-status i.fa-microphone');
        if (statusIcon) {
            statusIcon.className = ClassroomState.isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash muted';
        }
    }
}

// Update participant hand status
function updateParticipantHandStatus() {
    const participantItems = document.querySelectorAll('.participant-item');
    if (participantItems.length > 0) {
        const firstParticipant = participantItems[0];
        let handIcon = firstParticipant.querySelector('.participant-status i.fa-hand-paper');
        
        if (ClassroomState.handRaised) {
            if (!handIcon) {
                handIcon = document.createElement('i');
                handIcon.className = 'fas fa-hand-paper hand-raised';
                firstParticipant.querySelector('.participant-status').appendChild(handIcon);
            }
        } else {
            if (handIcon) {
                handIcon.remove();
            }
        }
    }
}

// =====================
// CHAT FUNCTIONALITY
// =====================

// Send chat message
window.sendChatMessage = function() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput?.value.trim();
    
    if (!message) {
        showToast('Please enter a message', 'warning');
        return;
    }
    
    const userName = AppState.currentUser?.user_metadata?.full_name || 
                    AppState.currentUser?.email?.split('@')[0] || 
                    'You';
    
    // Add message to chat
    addChatMessage(userName, message, true);
    
    // Clear input
    if (chatInput) {
        chatInput.value = '';
        chatInput.focus();
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
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${sender}${isSent ? ' (You)' : ''}</span>
            <span class="message-time">${timeString}</span>
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
    
    // Play notification sound for received messages
    if (!isSent) {
        playNotificationSound();
    }
}

// Play notification sound
function playNotificationSound() {
    // Create a simple notification sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio context not supported');
    }
}

// Simulate chat response
function simulateChatResponse() {
    const responses = [
        { sender: 'Dr. Smith', message: 'Great question! Let me explain...' },
        { sender: 'Dr. Smith', message: 'Can you elaborate on that?' },
        { sender: 'Dr. Smith', message: 'I agree with your point.' },
        { sender: 'Dr. Smith', message: 'Thanks for sharing that insight!' },
        { sender: 'Alex Johnson', message: 'I was wondering about that too.' },
        { sender: 'Maria Garcia', message: 'That was very helpful, thank you!' },
        { sender: 'David Chen', message: 'Could you repeat that last part?' }
    ];
    
    // Random delay between 2-5 seconds
    const delay = 2000 + Math.random() * 3000;
    
    setTimeout(() => {
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(randomResponse.sender, randomResponse.message, false);
    }, delay);
}

// =====================
// CLASSROOM CONTROLS
// =====================

// Leave class
window.leaveClass = async function() {
    if (!ClassroomState.isInClass) {
        showToast('Not in a class', 'info');
        return;
    }
    
    console.log('👋 Leaving class');
    
    // Show confirmation
    if (!confirm('Are you sure you want to leave the class?')) {
        return;
    }
    
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
window.viewClassDetails = function(classId) {
    showToast('Opening class details...', 'info');
    // In a full implementation, this would open a modal with detailed info
    console.log('Viewing details for class:', classId);
}

// Show class resources
window.showClassResources = function() {
    if (!ClassroomState.currentClass) {
        showToast('Not in a class', 'error');
        return;
    }
    
    showToast('Opening class resources...', 'info');
    // In a full implementation, this would show resources for the current class
    console.log('Showing resources for class:', ClassroomState.currentClass.name);
}

// Cleanup classroom on page unload
function cleanupClassroom() {
    if (ClassroomState.isInClass) {
        console.log('🧹 Cleaning up classroom before unload');
        leaveClass();
    }
}

// Close modal
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        console.log('✅ Modal closed:', modalId);
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
    } else if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
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

// =====================
// MODULE INITIALIZATION
// =====================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏫 DOM loaded, initializing classroom module');
    initClassroom();
});

console.log('✅ classroom.js loaded - Classroom module ready');

// Classroom Management Functions
let currentClass = null;
let localStream = null;
let peerConnections = {};
let socket = null;
let isInClass = false;
let isVideoEnabled = true;
let isAudioEnabled = true;
let isScreenSharing = false;
let handRaised = false;

// Initialize classroom
async function initClassroom() {
    // Check user role for classroom features
    const user = await getCurrentUser();
    const userRole = user?.user_metadata?.role || 'student';
    
    // Show/hide create class button based on role
    const createClassBtn = document.getElementById('create-class-btn');
    if (createClassBtn) {
        createClassBtn.style.display = userRole === 'teacher' ? 'block' : 'none';
    }
}

// Load classroom data
async function loadClassroomData() {
    try {
        const { data: classes, error } = await supabase
            .from('classes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        // Update classroom list if needed
        if (classes && classes.length > 0) {
            updateClassList(classes);
        }
        
    } catch (error) {
        console.error('Error loading classroom data:', error);
        showToast('Error loading classroom data', 'error');
    }
}

// Create a new class
async function createClass() {
    const user = await getCurrentUser();
    
    if (!user) {
        showToast('Please login first', 'error');
        return;
    }
    
    const userRole = user.user_metadata?.role || 'student';
    
    if (userRole !== 'teacher') {
        showToast('Only teachers can create classes', 'error');
        return;
    }
    
    // Open modal for class details
    openModal('create-class-modal');
}

// Save class to database
async function saveClass() {
    const className = document.getElementById('class-name').value;
    const description = document.getElementById('class-description').value;
    const schedule = document.getElementById('class-schedule').value;
    const duration = document.getElementById('class-duration').value;
    
    if (!className || !schedule) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        const { data, error } = await supabase
            .from('classes')
            .insert([
                {
                    name: className,
                    description: description,
                    teacher_id: user.id,
                    schedule: schedule,
                    duration_minutes: parseInt(duration),
                    meeting_url: generateMeetingUrl()
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Class created successfully!', 'success');
        closeModal('create-class-modal');
        
        // Clear form
        document.getElementById('class-name').value = '';
        document.getElementById('class-description').value = '';
        document.getElementById('class-schedule').value = '';
        document.getElementById('class-duration').value = '60';
        
        // Refresh class list
        loadClassroomData();
        
    } catch (error) {
        console.error('Error creating class:', error);
        showToast('Error creating class: ' + error.message, 'error');
    }
}

// Generate random meeting URL
function generateMeetingUrl() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let meetingId = '';
    for (let i = 0; i < 10; i++) {
        meetingId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `edumeet-${meetingId}`;
}

// Join a class
async function joinClass(classId = null) {
    if (isInClass) {
        showToast('You are already in a class', 'warning');
        return;
    }
    
    try {
        // If classId is provided, join that class
        if (classId) {
            const { data: classData, error } = await supabase
                .from('classes')
                .select('*')
                .eq('id', classId)
                .single();
            
            if (error) throw error;
            
            currentClass = classData;
        } else {
            // Get the next available class
            const now = new Date().toISOString();
            
            const { data: classData, error } = await supabase
                .from('classes')
                .select('*')
                .gte('schedule', now)
                .order('schedule', { ascending: true })
                .limit(1)
                .single();
            
            if (error) {
                // No upcoming classes
                showToast('No upcoming classes available', 'info');
                return;
            }
            
            currentClass = classData;
        }
        
        // Update current class display
        updateCurrentClassDisplay();
        
        // Initialize video/audio
        await initMedia();
        
        // Connect to signaling server (simulated)
        connectToSignalingServer();
        
        isInClass = true;
        showToast('Joined class: ' + currentClass.name, 'success');
        
    } catch (error) {
        console.error('Error joining class:', error);
        showToast('Error joining class', 'error');
    }
}

// Update current class display
function updateCurrentClassDisplay() {
    const currentClassElement = document.getElementById('current-class');
    if (currentClassElement && currentClass) {
        currentClassElement.innerHTML = `
            <i class="fas fa-chalkboard-teacher"></i>
            <span>${currentClass.name}</span>
            <span class="class-time">${formatDateTime(currentClass.schedule)}</span>
        `;
    }
}

// Initialize media (camera & microphone)
async function initMedia() {
    try {
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        // Create local video element
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            const localVideo = document.createElement('video');
            localVideo.id = 'local-video';
            localVideo.autoplay = true;
            localVideo.muted = true;
            localVideo.srcObject = localStream;
            
            const videoTile = document.createElement('div');
            videoTile.className = 'video-tile';
            videoTile.id = 'local-video-tile';
            
            videoTile.innerHTML = `
                <video class="video-element" autoplay muted playsinline></video>
                <div class="video-info">
                    <div class="user-name">You</div>
                    <div class="video-controls">
                        <div class="control-icon video-toggle" onclick="toggleVideo()">
                            <i class="fas fa-video"></i>
                        </div>
                        <div class="control-icon audio-toggle" onclick="toggleAudio()">
                            <i class="fas fa-microphone"></i>
                        </div>
                    </div>
                </div>
            `;
            
            videoTile.querySelector('video').srcObject = localStream;
            videoGrid.appendChild(videoTile);
        }
        
        // Add event listeners for media devices
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        showToast('Unable to access camera/microphone. Please check permissions.', 'error');
    }
}

// Connect to signaling server (simulated)
function connectToSignalingServer() {
    // In a real implementation, this would connect to WebSocket server
    console.log('Connecting to signaling server...');
    
    // Simulate receiving participants
    setTimeout(() => {
        addRemoteParticipant('teacher-123', 'Teacher', true);
        addRemoteParticipant('student-1', 'Student 1', false);
        addRemoteParticipant('student-2', 'Student 2', false);
    }, 1000);
}

// Add remote participant
function addRemoteParticipant(id, name, isTeacher) {
    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) return;
    
    const videoTile = document.createElement('div');
    videoTile.className = 'video-tile remote-participant';
    videoTile.id = `participant-${id}`;
    videoTile.dataset.participantId = id;
    
    videoTile.innerHTML = `
        <div class="video-placeholder">
            <i class="fas fa-user"></i>
        </div>
        <div class="video-info">
            <div class="user-name">${name} ${isTeacher ? '<i class="fas fa-crown"></i>' : ''}</div>
            <div class="participant-status">
                <i class="fas fa-microphone-slash"></i>
            </div>
        </div>
        ${isTeacher ? '<div class="teacher-badge">Teacher</div>' : ''}
    `;
    
    videoGrid.appendChild(videoTile);
    
    // Add to participants list
    addToParticipantsList(id, name, isTeacher);
}

// Add to participants sidebar
function addToParticipantsList(id, name, isTeacher) {
    const participantsList = document.getElementById('participants-list');
    if (!participantsList) return;
    
    const participantItem = document.createElement('div');
    participantItem.className = 'participant-item';
    participantItem.innerHTML = `
        <div class="participant-avatar">
            ${name.charAt(0).toUpperCase()}
        </div>
        <div class="participant-info">
            <div class="participant-name">${name}</div>
            <div class="participant-role">${isTeacher ? 'Teacher' : 'Student'}</div>
        </div>
        <div class="participant-actions">
            ${isTeacher ? '' : '<button class="btn-icon" onclick="muteParticipant(\'' + id + '\')"><i class="fas fa-microphone-slash"></i></button>'}
        </div>
    `;
    
    participantsList.appendChild(participantItem);
}

// Toggle video
async function toggleVideo() {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        isVideoEnabled = !videoTrack.enabled;
        videoTrack.enabled = isVideoEnabled;
        
        const videoToggle = document.querySelector('.video-toggle i');
        if (videoToggle) {
            videoToggle.className = isVideoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
        }
        
        showToast(isVideoEnabled ? 'Video enabled' : 'Video disabled', 'info');
    }
}

// Toggle audio
async function toggleAudio() {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        isAudioEnabled = !audioTrack.enabled;
        audioTrack.enabled = isAudioEnabled;
        
        const audioToggle = document.querySelector('.audio-toggle i');
        if (audioToggle) {
            audioToggle.className = isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        }
        
        showToast(isAudioEnabled ? 'Audio enabled' : 'Audio disabled', 'info');
    }
}

// Toggle screen share
async function toggleScreenShare() {
    if (!isInClass) return;
    
    try {
        if (!isScreenSharing) {
            // Start screen sharing
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            // Replace video track
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = peerConnections['local']?.getSenders().find(s => s.track.kind === 'video');
            
            if (sender) {
                sender.replaceTrack(videoTrack);
            }
            
            isScreenSharing = true;
            showToast('Screen sharing started', 'success');
            
            // Handle when user stops sharing
            videoTrack.onended = () => {
                toggleScreenShare();
            };
            
        } else {
            // Stop screen sharing
            const videoTrack = localStream.getVideoTracks()[0];
            const sender = peerConnections['local']?.getSenders().find(s => s.track.kind === 'video');
            
            if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
            }
            
            isScreenSharing = false;
            showToast('Screen sharing stopped', 'info');
        }
        
    } catch (error) {
        console.error('Screen sharing error:', error);
        showToast('Error sharing screen', 'error');
    }
}

// Raise hand
function raiseHand() {
    handRaised = !handRaised;
    
    const localVideoTile = document.getElementById('local-video-tile');
    if (localVideoTile) {
        if (handRaised) {
            localVideoTile.classList.add('hand-raised');
            showToast('Hand raised!', 'success');
            
            // Notify teacher (simulated)
            setTimeout(() => {
                showToast('Teacher acknowledged your hand raise', 'info');
                handRaised = false;
                localVideoTile.classList.remove('hand-raised');
            }, 3000);
            
        } else {
            localVideoTile.classList.remove('hand-raised');
            showToast('Hand lowered', 'info');
        }
    }
}

// Mute participant
function muteParticipant(participantId) {
    // In real implementation, this would send a signal to mute the participant
    const participantElement = document.getElementById(`participant-${participantId}`);
    if (participantElement) {
        const statusIcon = participantElement.querySelector('.participant-status i');
        if (statusIcon) {
            statusIcon.className = 'fas fa-microphone-slash';
            showToast('Participant muted', 'success');
        }
    }
}

// Send chat message
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    const user = await getCurrentUser();
    const userName = user?.user_metadata?.full_name || user?.email || 'Anonymous';
    
    // Add message to chat
    addChatMessage(userName, message, true);
    
    // Clear input
    chatInput.value = '';
    
    // Simulate receiving messages
    setTimeout(() => {
        const responses = [
            "Great question!",
            "Can you explain that again?",
            "I agree!",
            "Thanks for sharing!"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage('Teacher', randomResponse, false);
    }, 1000);
}

// Add chat message
function addChatMessage(sender, message, isSent) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    messageDiv.innerHTML = `
        <div class="message-sender">${sender}</div>
        <div class="message-content">${message}</div>
        <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Leave class
async function leaveClass() {
    if (!isInClass) return;
    
    // Stop all media tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clear video grid
    const videoGrid = document.getElementById('video-grid');
    if (videoGrid) {
        videoGrid.innerHTML = '';
    }
    
    // Clear participants list
    const participantsList = document.getElementById('participants-list');
    if (participantsList) {
        participantsList.innerHTML = '';
    }
    
    // Clear chat
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Reset state
    isInClass = false;
    currentClass = null;
    localStream = null;
    isVideoEnabled = true;
    isAudioEnabled = true;
    isScreenSharing = false;
    handRaised = false;
    
    // Update current class display
    const currentClassElement = document.getElementById('current-class');
    if (currentClassElement) {
        currentClassElement.innerHTML = `
            <i class="fas fa-chalkboard-teacher"></i>
            <span>No Active Class</span>
        `;
    }
    
    showToast('Left the class', 'info');
}

// Handle device change
function handleDeviceChange() {
    console.log('Media devices changed');
    // You can reinitialize media or update device list here
}

// Update class list
function updateClassList(classes) {
    // This would update a class list if you have one
    console.log('Classes loaded:', classes);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isInClass) {
        leaveClass();
    }
});

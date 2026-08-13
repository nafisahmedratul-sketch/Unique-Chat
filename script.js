// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDCtDU6cybNwYRunrwAVv5HEbU-mUmU9mw",
  authDomain: "chat-f582e.firebaseapp.com",
  databaseURL: "https://chat-f582e-default-rtdb.firebaseio.com",
  projectId: "chat-f582e",
  storageBucket: "chat-f582e.firebasestorage.app",
  messagingSenderId: "902054679057",
  appId: "1:902054679057:web:40515a2be0aa3ad38c57b0",
  measurementId: "G-4CVCPRCVJX"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let currentUser = null;
let activeTargetId = null;
let isGroupChat = false;
let isSignUpMode = false;
let tempAvatarBase64 = null;
let currentReplyTarget = null; 

let cacheUsers = {};
let cacheGroups = {};
let unreadCounts = {};
let activeChatUserIds = new Set();
let myBlockedList = {}; 
let whoBlockedMeList = {};

// DOM Elements
const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authBtn = document.getElementById('authBtn');
const nameGroup = document.getElementById('nameGroup');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');
const toggleText = document.getElementById('toggleText');
const appContainer = document.getElementById('appContainer');

const myAvatar = document.getElementById('myAvatar');
const myName = document.getElementById('myName');
const userList = document.getElementById('userList');
const searchInput = document.getElementById('searchInput');
const messagesBox = document.getElementById('messagesBox');

const activeAvatar = document.getElementById('activeAvatar');
const activeName = document.getElementById('activeName');
const activeStatus = document.getElementById('activeStatus');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

const attachBtn = document.getElementById('attachBtn');
const attachMenu = document.getElementById('attachMenu');
const imgUpload = document.getElementById('imgUpload');
const shareCodeBtn = document.getElementById('shareCodeBtn');

const profileModal = document.getElementById('profileModal');
const editProfileBtn = document.getElementById('editProfileBtn');
const closeModal = document.getElementById('closeModal');
const profileForm = document.getElementById('profileForm');
const modalAvatarPreview = document.getElementById('modalAvatarPreview');
const newAvatarInput = document.getElementById('newAvatarInput');
const editNameInput = document.getElementById('editNameInput');
const editPhoneInput = document.getElementById('editPhoneInput');

const codeModal = document.getElementById('codeModal');
const closeCodeModal = document.getElementById('closeCodeModal');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const codeLangSelect = document.getElementById('codeLangSelect');
const codeTextArea = document.getElementById('codeTextArea');

const groupModal = document.getElementById('groupModal');
const createGroupBtn = document.getElementById('createGroupBtn');
const closeGroupModal = document.getElementById('closeGroupModal');
const groupNameInput = document.getElementById('groupNameInput');
const groupMemberList = document.getElementById('groupMemberList');
const submitGroupBtn = document.getElementById('submitGroupBtn');

const logoutBtn = document.getElementById('logoutBtn');
const backBtn = document.getElementById('backBtn');

// Call & Block Elements
const callActions = document.getElementById('callActions');
const audioCallBtn = document.getElementById('audioCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const blockBtn = document.getElementById('blockBtn');
const blockNoticeBar = document.getElementById('blockNoticeBar');
const blockNoticeText = document.getElementById('blockNoticeText');

const callOverlay = document.getElementById('callOverlay');
const callStatusTitle = document.getElementById('callStatusTitle');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const audioCallAvatar = document.getElementById('audioCallAvatar');
const callUserImg = document.getElementById('callUserImg');
const callUserName = document.getElementById('callUserName');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const endCallBtn = document.getElementById('endCallBtn');

let peerConnection = null;
let localStream = null;
let currentCallRef = null;
let activeCallType = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Reply & Image Viewer
const replyPreviewBar = document.getElementById('replyPreviewBar');
const replyTitle = document.getElementById('replyTitle');
const replyText = document.getElementById('replyText');
const cancelReplyBtn = document.getElementById('cancelReplyBtn');

const imageModal = document.getElementById('imageModal');
const fullImagePreview = document.getElementById('fullImagePreview');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const closeImageModal = document.getElementById('closeImageModal');

// Cropper
const cropBox = document.getElementById('cropBox');
const zoomControls = document.getElementById('zoomControls');
const zoomSlider = document.getElementById('zoomSlider');
const cropHint = document.getElementById('cropHint');

let zoomLevel = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

// --- 1. AUTHENTICATION ---

toggleAuthBtn.onclick = (e) => {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  authTitle.innerText = isSignUpMode ? "> REGISTER_NODE" : "> SYSTEM_LOGIN";
  authBtn.innerText = isSignUpMode ? "EXECUTE_REGISTER" : "EXECUTE_LOGIN";
  nameGroup.style.display = isSignUpMode ? "block" : "none";
  toggleText.innerText = isSignUpMode ? "Node already registered?" : "New access node?";
  toggleAuthBtn.innerText = isSignUpMode ? "LOGIN_NODE" : "REGISTER_USER";
};

authForm.onsubmit = (e) => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value;

  if (isSignUpMode) {
    auth.createUserWithEmailAndPassword(email, password).then((cred) => {
      const defaultImg = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop";
      db.ref('users/' + cred.user.uid).set({
        uid: cred.user.uid,
        name: name,
        email: email,
        photoURL: defaultImg,
        status: "online"
      });
    }).catch(err => alert("AUTH_ERROR: " + err.message));
  } else {
    auth.signInWithEmailAndPassword(email, password).catch(err => alert("AUTH_ERROR: " + err.message));
  }
};

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    authOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');

    db.ref('users/' + user.uid).on('value', (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        myName.innerText = userData.name || "root@user";
        myAvatar.src = userData.photoURL || "https://via.placeholder.com/100";
      }
    });

    db.ref('users/' + user.uid).update({ status: 'online' });
    db.ref('users/' + user.uid).onDisconnect().update({ status: 'offline' });

    listenForBlocks();
    loadSidebarAndUnreadCounts();
    listenForIncomingCalls();
  } else {
    authOverlay.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

logoutBtn.onclick = () => {
  if (currentUser) {
    db.ref('users/' + currentUser.uid).update({ status: 'offline' }).then(() => {
      auth.signOut();
    });
  }
};

// --- BLOCK / UNBLOCK TRACKING ---

function listenForBlocks() {
  db.ref('blocks/' + currentUser.uid).on('value', (snap) => {
    myBlockedList = snap.val() || {};
    checkCurrentBlockStatus();
    renderSidebar();
  });

  db.ref('blocks').on('value', (snap) => {
    const allBlocks = snap.val() || {};
    whoBlockedMeList = {};
    Object.keys(allBlocks).forEach(blockerId => {
      if (allBlocks[blockerId] && allBlocks[blockerId][currentUser.uid]) {
        whoBlockedMeList[blockerId] = true;
      }
    });
    checkCurrentBlockStatus();
  });
}

// --- 2. FIXED SIDEBAR CHAT LIST & PRIVACY SEARCH ---

function loadSidebarAndUnreadCounts() {
  db.ref().on('value', (snapshot) => {
    const val = snapshot.val() || {};
    cacheUsers = val.users || {};
    cacheGroups = val.groups || {};
    const chats = val.chats || {};

    unreadCounts = {};
    activeChatUserIds.clear();

    Object.keys(chats).forEach(roomKey => {
      if (roomKey.includes(currentUser.uid)) {
        const otherUserId = roomKey.replace(currentUser.uid, '').replace('_', '');
        if (otherUserId) activeChatUserIds.add(otherUserId);

        let count = 0;
        const msgs = chats[roomKey];
        Object.keys(msgs).forEach(msgKey => {
          const m = msgs[msgKey];
          if (m.senderId !== currentUser.uid && !m.read) {
            count++;
          }
        });
        unreadCounts[otherUserId] = count;
      }
    });

    renderSidebar();
  });
}

function renderSidebar() {
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  userList.innerHTML = '';

  // Render Groups
  Object.keys(cacheGroups).forEach(gId => {
    const g = cacheGroups[gId];
    if (g.members && g.members[currentUser.uid]) {
      if (!query || g.name.toLowerCase().includes(query)) {
        const item = document.createElement('div');
        item.className = `user-item ${activeTargetId === gId ? 'active' : ''}`;
        item.innerHTML = `
          <img src="https://cdn-icons-png.flaticon.com/512/615/615075.png" class="avatar" />
          <div class="user-details">
            <div class="user-title-row">
              <h4>👥 ${g.name}</h4>
            </div>
            <span class="status-text">Group Cluster</span>
          </div>
        `;
        item.onclick = () => selectChatTarget(gId, g.name, "https://cdn-icons-png.flaticon.com/512/615/615075.png", true);
        userList.appendChild(item);
      }
    }
  });

  // Render Users (Privately: Fixed Chats OR Searched Users)
  Object.keys(cacheUsers).forEach(uId => {
    if (uId === currentUser.uid) return;
    const u = cacheUsers[uId];

    const isExistingChat = activeChatUserIds.has(uId);
    const matchQuery = query && (
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.uid && u.uid.toLowerCase().includes(query))
    );

    // PRIVACY FEATURE: Shows ONLY if user was previously interacted with OR matches active search query
    if (isExistingChat || matchQuery) {
      const unreadCount = unreadCounts[uId] || 0;
      const isBlockedByMe = !!myBlockedList[uId];
      const item = document.createElement('div');
      item.className = `user-item ${activeTargetId === uId ? 'active' : ''}`;
      
      item.innerHTML = `
        <img src="${u.photoURL}" class="avatar" />
        <div class="user-details">
          <div class="user-title-row">
            <h4>${u.name} ${isBlockedByMe ? '<span class="blocked-tag">[BLOCKED]</span>' : ''}</h4>
            ${unreadCount > 0 ? `<span class="unseen-badge">${unreadCount} unseen</span>` : ''}
          </div>
          <span class="status-text">${u.status || 'offline'}</span>
        </div>
      `;
      item.onclick = () => selectChatTarget(uId, u.name, u.photoURL, false);
      userList.appendChild(item);
    }
  });

  if (userList.children.length === 0) {
    userList.innerHTML = `<div class="empty-notice" style="padding: 15px;">> Search user ID or name to start chat</div>`;
  }
}

if (searchInput) {
  searchInput.addEventListener('input', renderSidebar);
}

function selectChatTarget(id, name, avatar, isGroup) {
  activeTargetId = id;
  isGroupChat = isGroup;
  activeName.innerText = "> " + name;
  activeAvatar.src = avatar;

  if (isGroup) {
    callActions.classList.add('hidden');
  } else {
    callActions.classList.remove('hidden');
  }

  cancelReply();
  appContainer.classList.add('mobile-active');

  if (!isGroup) {
    db.ref('users/' + id).on('value', (snap) => {
      const d = snap.val();
      activeStatus.innerText = d ? (d.status || 'OFFLINE').toUpperCase() : "OFFLINE";
    });
  } else {
    activeStatus.innerText = "CLUSTER_ACTIVE";
  }

  checkCurrentBlockStatus();
  listenMessages();
}

// --- BLOCK / UNBLOCK CHECK ---

function checkCurrentBlockStatus() {
  if (!activeTargetId || isGroupChat) {
    blockNoticeBar.classList.add('hidden');
    msgInput.disabled = false;
    sendBtn.disabled = false;
    attachBtn.disabled = false;
    audioCallBtn.disabled = false;
    videoCallBtn.disabled = false;
    return;
  }

  const isIBlocked = !!myBlockedList[activeTargetId];
  const isTheyBlocked = !!whoBlockedMeList[activeTargetId];

  if (isIBlocked) {
    blockBtn.innerHTML = `<i class="fa-solid fa-shield-cat" style="color:#ff0055;"></i>`;
    blockBtn.title = "Unblock User";
    blockNoticeText.innerText = "> YOU HAVE BLOCKED THIS USER";
    blockNoticeBar.classList.remove('hidden');
    disableChatControls(true);
  } else if (isTheyBlocked) {
    blockBtn.innerHTML = `<i class="fa-solid fa-shield-halved"></i>`;
    blockBtn.title = "Block User";
    blockNoticeText.innerText = "> ACCESS RESTRICTED BY NODE";
    blockNoticeBar.classList.remove('hidden');
    disableChatControls(true);
  } else {
    blockBtn.innerHTML = `<i class="fa-solid fa-shield-halved"></i>`;
    blockBtn.title = "Block User";
    blockNoticeBar.classList.add('hidden');
    disableChatControls(false);
  }
}

function disableChatControls(disabled) {
  msgInput.disabled = disabled;
  sendBtn.disabled = disabled;
  attachBtn.disabled = disabled;
  audioCallBtn.disabled = disabled;
  videoCallBtn.disabled = disabled;
}

blockBtn.onclick = () => {
  if (!activeTargetId || isGroupChat) return;

  const isIBlocked = !!myBlockedList[activeTargetId];
  if (isIBlocked) {
    db.ref(`blocks/${currentUser.uid}/${activeTargetId}`).remove().then(() => {
      alert("USER_UNBLOCKED");
    });
  } else {
    if (confirm("Block this user? They will not be able to send messages or call you.")) {
      db.ref(`blocks/${currentUser.uid}/${activeTargetId}`).set(true).then(() => {
        alert("USER_BLOCKED");
      });
    }
  }
};

// --- 3. MESSAGING & REPLIES ---

function getRoomPath() {
  if (isGroupChat) return `group_chats/${activeTargetId}`;
  return currentUser.uid < activeTargetId 
    ? `chats/${currentUser.uid}_${activeTargetId}` 
    : `chats/${activeTargetId}_${currentUser.uid}`;
}

function listenMessages() {
  const path = getRoomPath();
  const ref = db.ref(path);

  ref.on('value', (snapshot) => {
    messagesBox.innerHTML = '';
    snapshot.forEach((child) => {
      const msg = child.val();
      const msgKey = child.key;
      const isSent = msg.senderId === currentUser.uid;

      if (!isSent && !msg.read) {
        ref.child(msgKey).update({ read: true });
      }

      const div = document.createElement('div');
      div.className = `msg-wrapper ${isSent ? 'sent' : 'received'}`;

      let replyHTML = '';
      if (msg.replyTo) {
        replyHTML = `
          <div class="reply-ref">
            <span class="reply-ref-name">${escapeHTML(msg.replyTo.senderName)}</span>
            <div class="reply-ref-text">${escapeHTML(msg.replyTo.text)}</div>
          </div>`;
      }

      let content = `<p>${escapeHTML(msg.text || '')}</p>`;

      if (msg.type === 'image') {
        content = `
          <div class="img-container" onclick="openImageViewer('${msg.fileUrl}')">
            <img src="${msg.fileUrl}" class="msg-img"/>
            <a href="${msg.fileUrl}" download="payload_image.png" onclick="event.stopPropagation();" class="dl-btn"><i class="fa-solid fa-download"></i> SAVE</a>
          </div>`;
      } 
      else if (msg.type === 'code') {
        content = `
          <div class="vscode-block">
            <div class="vscode-header">
              <span>📄 ${(msg.lang || 'code').toUpperCase()}</span>
              <button class="copy-btn" onclick="copyCodeText(\`${escapeHTML(msg.code || '')}\`, this)">Copy Code</button>
            </div>
            <pre><code class="language-${msg.lang}">${escapeHTML(msg.code || '')}</code></pre>
          </div>`;
      }

      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let statusTicks = '';
      if (isSent && !isGroupChat) {
        statusTicks = msg.read 
          ? `<span class="read-status read" title="Read"><i class="fa-solid fa-check-double"></i></span>`
          : `<span class="read-status unread" title="Sent"><i class="fa-solid fa-check"></i></span>`;
      }

      const rawContentForCopy = msg.text || (msg.type === 'code' ? msg.code : 'Image Payload');

      div.innerHTML = `
        <div class="msg-bubble">
          ${isGroupChat && !isSent ? `<div class="msg-sender">${msg.senderName || 'User'}</div>` : ''}
          ${replyHTML}
          ${content}
          <div class="msg-meta">
            <span class="msg-time">${time}</span>
            ${statusTicks}
          </div>
          <div class="msg-actions">
            <button class="action-link" onclick="initiateReply('${msg.senderName || 'User'}', \`${escapeHTML(rawContentForCopy)}\`)"><i class="fa-solid fa-reply"></i> Reply</button>
            <button class="action-link" onclick="copyTextToClipboard(\`${escapeHTML(rawContentForCopy)}\`, this)"><i class="fa-solid fa-copy"></i> Copy</button>
          </div>
        </div>
      `;
      messagesBox.appendChild(div);
    });

    Prism.highlightAll();
    messagesBox.scrollTop = messagesBox.scrollHeight;
  });
}

function escapeHTML(str) {
  return String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function copyTextToClipboard(text, btn) {
  navigator.clipboard.writeText(text);
  const origText = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
  setTimeout(() => btn.innerHTML = origText, 1500);
}

function copyCodeText(text, btn) {
  navigator.clipboard.writeText(text);
  btn.innerText = "Copied!";
  setTimeout(() => btn.innerText = "Copy Code", 1500);
}

function initiateReply(senderName, text) {
  currentReplyTarget = { senderName, text };
  replyTitle.innerText = `Replying to ${senderName}`;
  replyText.innerText = text;
  replyPreviewBar.classList.remove('hidden');
  msgInput.focus();
}

cancelReplyBtn.onclick = cancelReply;

function cancelReply() {
  currentReplyTarget = null;
  replyPreviewBar.classList.add('hidden');
}

function openImageViewer(url) {
  fullImagePreview.src = url;
  downloadImageBtn.href = url;
  imageModal.classList.remove('hidden');
}

closeImageModal.onclick = () => imageModal.classList.add('hidden');

sendBtn.onclick = sendMsg;
msgInput.onkeypress = (e) => { if (e.key === 'Enter') sendMsg(); };

function sendMsg() {
  const txt = msgInput.value.trim();
  if (!txt || !activeTargetId) return;

  if (myBlockedList[activeTargetId] || whoBlockedMeList[activeTargetId]) {
    return alert("[RESTRICTED]: Cannot send message due to block.");
  }

  db.ref('users/' + currentUser.uid).once('value').then((snap) => {
    const uData = snap.val() || {};
    
    const payload = {
      senderId: currentUser.uid,
      senderName: uData.name || 'User',
      text: txt,
      timestamp: Date.now(),
      type: 'text',
      read: false
    };

    if (currentReplyTarget) {
      payload.replyTo = currentReplyTarget;
    }

    db.ref(getRoomPath()).push(payload);
    msgInput.value = '';
    cancelReply();

    // Automatically add to active chats list
    if (!isGroupChat) {
      activeChatUserIds.add(activeTargetId);
      renderSidebar();
    }
  });
}

// --- 4. CALLING SYSTEM ---

audioCallBtn.onclick = () => startCall('audio');
videoCallBtn.onclick = () => startCall('video');

async function startCall(type) {
  if (!activeTargetId || isGroupChat) return;

  if (myBlockedList[activeTargetId] || whoBlockedMeList[activeTargetId]) {
    return alert("[RESTRICTED]: Call blocked.");
  }

  activeCallType = type;
  const targetUser = cacheUsers[activeTargetId] || {};

  setupCallUI(type, targetUser.name || 'User', targetUser.photoURL, '> OUTGOING_CALL...');
  acceptCallBtn.classList.add('hidden');
  callOverlay.classList.remove('hidden');

  currentCallRef = db.ref('calls').push();

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });

    if (type === 'video') {
      localVideo.srcObject = localStream;
      localVideo.classList.remove('hidden');
    } else {
      localVideo.classList.add('hidden');
    }

    peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
      if (type === 'video') {
        audioCallAvatar.classList.add('hidden');
        remoteVideo.classList.remove('hidden');
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        currentCallRef.child('callerCandidates').push(event.candidate.toJSON());
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await currentCallRef.set({
      callerId: currentUser.uid,
      receiverId: activeTargetId,
      type: type,
      status: 'calling',
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    });

    currentCallRef.on('value', (snap) => {
      const callData = snap.val();
      if (!callData) {
        endCallCleanly();
        return;
      }

      if (callData.answer && !peerConnection.currentRemoteDescription) {
        const answer = new RTCSessionDescription(callData.answer);
        peerConnection.setRemoteDescription(answer);
        callStatusTitle.innerText = "> CALL_CONNECTED";
      }

      if (callData.status === 'ended') {
        endCallCleanly();
      }
    });

    currentCallRef.child('receiverCandidates').on('child_added', (snap) => {
      const candidate = new RTCIceCandidate(snap.val());
      peerConnection.addIceCandidate(candidate);
    });

  } catch (err) {
    alert("MEDIA_ERROR: Mic/Camera permission required! " + err.message);
    endCallCleanly();
  }
}

function listenForIncomingCalls() {
  db.ref('calls').on('child_added', (snap) => {
    const callData = snap.val();
    const callKey = snap.key;

    if (callData && callData.receiverId === currentUser.uid && callData.status === 'calling') {
      const callerId = callData.callerId;
      if (myBlockedList[callerId] || whoBlockedMeList[callerId]) {
        return; 
      }

      currentCallRef = db.ref('calls/' + callKey);
      activeCallType = callData.type;

      const callerUser = cacheUsers[callerId] || {};
      setupCallUI(callData.type, callerUser.name || 'User', callerUser.photoURL, '> INCOMING_CALL...');

      acceptCallBtn.classList.remove('hidden');
      callOverlay.classList.remove('hidden');

      currentCallRef.on('value', (s) => {
        const d = s.val();
        if (!d || d.status === 'ended') {
          endCallCleanly();
        }
      });
    }
  });
}

acceptCallBtn.onclick = async () => {
  if (!currentCallRef) return;

  acceptCallBtn.classList.add('hidden');
  callStatusTitle.innerText = "> CONNECTING...";

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: activeCallType === 'video'
    });

    if (activeCallType === 'video') {
      localVideo.srcObject = localStream;
      localVideo.classList.remove('hidden');
    } else {
      localVideo.classList.add('hidden');
    }

    peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
      if (activeCallType === 'video') {
        audioCallAvatar.classList.add('hidden');
        remoteVideo.classList.remove('hidden');
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        currentCallRef.child('receiverCandidates').push(event.candidate.toJSON());
      }
    };

    const snapshot = await currentCallRef.once('value');
    const callData = snapshot.val();

    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await currentCallRef.update({
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      status: 'connected'
    });

    callStatusTitle.innerText = "> CALL_CONNECTED";

    currentCallRef.child('callerCandidates').on('child_added', (snap) => {
      const candidate = new RTCIceCandidate(snap.val());
      peerConnection.addIceCandidate(candidate);
    });

  } catch (err) {
    alert("MEDIA_ERROR: Mic/Camera permission required! " + err.message);
    endCallCleanly();
  }
};

endCallBtn.onclick = () => {
  if (currentCallRef) {
    currentCallRef.update({ status: 'ended' }).then(() => {
      endCallCleanly();
    });
  } else {
    endCallCleanly();
  }
};

function endCallCleanly() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (currentCallRef) {
    currentCallRef.off();
    currentCallRef.remove();
    currentCallRef = null;
  }

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  callOverlay.classList.add('hidden');
}

function setupCallUI(type, name, photo, status) {
  callStatusTitle.innerText = status;
  callUserName.innerText = name;
  callUserImg.src = photo || "https://via.placeholder.com/100";

  if (type === 'audio') {
    audioCallAvatar.classList.remove('hidden');
    remoteVideo.classList.add('hidden');
  } else {
    audioCallAvatar.classList.add('hidden');
    remoteVideo.classList.remove('hidden');
  }
}

// --- 5. ATTACHMENTS, GROUPS & PROFILE ---

attachBtn.onclick = (e) => {
  e.stopPropagation();
  attachMenu.classList.toggle('hidden');
};
document.onclick = () => attachMenu.classList.add('hidden');

imgUpload.onchange = (e) => {
  const file = e.target.files[0];
  if (!file || !activeTargetId) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    db.ref(getRoomPath()).push({
      senderId: currentUser.uid,
      fileUrl: ev.target.result,
      timestamp: Date.now(),
      type: 'image',
      read: false
    });
  };
  reader.readAsDataURL(file);
};

shareCodeBtn.onclick = () => codeModal.classList.remove('hidden');
closeCodeModal.onclick = () => codeModal.classList.add('hidden');

sendCodeBtn.onclick = () => {
  const code = codeTextArea.value.trim();
  const lang = codeLangSelect.value;
  if (!code || !activeTargetId) return;

  db.ref(getRoomPath()).push({
    senderId: currentUser.uid,
    code: code,
    lang: lang,
    timestamp: Date.now(),
    type: 'code',
    read: false
  });

  codeTextArea.value = '';
  codeModal.classList.add('hidden');
};

createGroupBtn.onclick = () => {
  db.ref('users').once('value').then((snap) => {
    groupMemberList.innerHTML = '';
    snap.forEach((child) => {
      const u = child.val();
      if (u.uid !== currentUser.uid) {
        const div = document.createElement('div');
        div.className = 'member-item';
        div.innerHTML = `
          <input type="checkbox" value="${u.uid}" id="usr_${u.uid}" />
          <label for="usr_${u.uid}">${u.name}</label>
        `;
        groupMemberList.appendChild(div);
      }
    });
    groupModal.classList.remove('hidden');
  });
};

closeGroupModal.onclick = () => groupModal.classList.add('hidden');

submitGroupBtn.onclick = () => {
  const gName = groupNameInput.value.trim();
  if (!gName) return alert("Enter Group Name!");

  const checkboxes = groupMemberList.querySelectorAll('input[type="checkbox"]:checked');
  const members = {};
  members[currentUser.uid] = true;

  checkboxes.forEach(cb => members[cb.value] = true);

  const newGroupRef = db.ref('groups').push();
  newGroupRef.set({
    groupId: newGroupRef.key,
    name: gName,
    createdBy: currentUser.uid,
    members: members
  }).then(() => {
    groupModal.classList.add('hidden');
    groupNameInput.value = '';
    alert("Group Cluster Created Successfully!");
  });
};

editProfileBtn.onclick = () => {
  db.ref('users/' + currentUser.uid).once('value').then((snapshot) => {
    const userData = snapshot.val() || {};
    editNameInput.value = userData.name || '';
    modalAvatarPreview.src = userData.photoURL || 'https://via.placeholder.com/100';
    editPhoneInput.value = userData.phone || '';
    tempAvatarBase64 = null;
    
    resetTransform();
    zoomControls.classList.add('hidden');
    cropHint.classList.add('hidden');
    
    profileModal.classList.remove('hidden');
  });
};

closeModal.onclick = () => profileModal.classList.add('hidden');

newAvatarInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      modalAvatarPreview.src = ev.target.result;
      resetTransform();
      zoomControls.classList.remove('hidden');
      cropHint.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
};

function resetTransform() {
  zoomLevel = 1;
  translateX = 0;
  translateY = 0;
  if(zoomSlider) zoomSlider.value = 1;
  applyTransform();
}

function applyTransform() {
  modalAvatarPreview.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
}

if (zoomSlider) {
  zoomSlider.oninput = (e) => {
    zoomLevel = parseFloat(e.target.value);
    applyTransform();
  };
}

cropBox.addEventListener('mousedown', (e) => {
  if (zoomControls.classList.contains('hidden')) return;
  isDragging = true;
  startX = e.clientX - translateX;
  startY = e.clientY - translateY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  translateX = e.clientX - startX;
  translateY = e.clientY - startY;
  applyTransform();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

function getCroppedBase64() {
  const canvas = document.createElement('canvas');
  const size = 300;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  const scale = zoomLevel;
  const imgWidth = size * scale;
  const imgHeight = size * scale;
  
  const factor = size / 140; 
  const drawX = (size - imgWidth) / 2 + (translateX * factor);
  const drawY = (size - imgHeight) / 2 + (translateY * factor);

  ctx.drawImage(modalAvatarPreview, drawX, drawY, imgWidth, imgHeight);
  return canvas.toDataURL('image/jpeg', 0.9);
}

profileForm.onsubmit = async (e) => {
  e.preventDefault();
  const newName = editNameInput.value.trim() || myName.innerText;
  
  let imgUrl = modalAvatarPreview.src;
  if (!zoomControls.classList.contains('hidden')) {
    imgUrl = getCroppedBase64();
  }

  try {
    await db.ref('users/' + currentUser.uid).update({
      name: newName,
      photoURL: imgUrl,
      phone: editPhoneInput.value.trim() || ''
    });
    profileModal.classList.add('hidden');
    alert("[SYSTEM_NOTICE]: Config updated successfully!");
  } catch (error) {
    alert("[ERROR]: Failed to update profile - " + error.message);
  }
};

backBtn.onclick = () => appContainer.classList.remove('mobile-active');

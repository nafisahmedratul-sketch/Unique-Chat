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

let currentUser = null;
let activeTargetId = null; // Can be UserId or GroupId
let isGroupChat = false;
let isSignUpMode = false;
let tempAvatarBase64 = null;

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
const createPollBtn = document.getElementById('createPollBtn');

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

    loadSidebar();
  } else {
    authOverlay.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

logoutBtn.onclick = () => {
  if (currentUser) {
    db.ref('users/' + currentUser.uid).update({ status: 'offline' });
    auth.signOut();
  }
};

// --- 2. SIDEBAR (USERS & GROUPS) ---

function loadSidebar() {
  // Load Individual Users & Groups together
  db.ref().on('value', (snapshot) => {
    const val = snapshot.val() || {};
    const users = val.users || {};
    const groups = val.groups || {};

    userList.innerHTML = '';

    // Render Groups First
    Object.keys(groups).forEach(gId => {
      const g = groups[gId];
      if (g.members && g.members[currentUser.uid]) {
        const item = document.createElement('div');
        item.className = `user-item ${activeTargetId === gId ? 'active' : ''}`;
        item.innerHTML = `
          <img src="https://cdn-icons-png.flaticon.com/512/615/615075.png" class="avatar" />
          <div>
            <h4>👥 ${g.name}</h4>
            <span class="status-text">Group Cluster</span>
          </div>
        `;
        item.onclick = () => selectChatTarget(gId, g.name, "https://cdn-icons-png.flaticon.com/512/615/615075.png", true);
        userList.appendChild(item);
      }
    });

    // Render Users
    Object.keys(users).forEach(uId => {
      const u = users[uId];
      if (uId !== currentUser.uid) {
        const item = document.createElement('div');
        item.className = `user-item ${activeTargetId === uId ? 'active' : ''}`;
        item.innerHTML = `
          <img src="${u.photoURL}" class="avatar" />
          <div>
            <h4>${u.name}</h4>
            <span class="status-text">${u.status || 'offline'}</span>
          </div>
        `;
        item.onclick = () => selectChatTarget(uId, u.name, u.photoURL, false);
        userList.appendChild(item);
      }
    });
  });
}

function selectChatTarget(id, name, avatar, isGroup) {
  activeTargetId = id;
  isGroupChat = isGroup;
  activeName.innerText = "> " + name;
  activeAvatar.src = avatar;
  msgInput.disabled = false;
  sendBtn.disabled = false;

  appContainer.classList.add('mobile-active');

  if (!isGroup) {
    db.ref('users/' + id).on('value', (snap) => {
      const d = snap.val();
      activeStatus.innerText = d ? d.status.toUpperCase() : "OFFLINE";
    });
  } else {
    activeStatus.innerText = "CLUSTER_ACTIVE";
  }

  listenMessages();
}

// --- 3. MESSAGING & VS CODE SNIPPET ---

function getRoomPath() {
  if (isGroupChat) return `group_chats/${activeTargetId}`;
  return currentUser.uid < activeTargetId 
    ? `chats/${currentUser.uid}_${activeTargetId}` 
    : `chats/${activeTargetId}_${currentUser.uid}`;
}

function listenMessages() {
  const path = getRoomPath();
  db.ref(path).on('value', (snapshot) => {
    messagesBox.innerHTML = '';
    snapshot.forEach((child) => {
      const msg = child.val();
      const isSent = msg.senderId === currentUser.uid;

      const div = document.createElement('div');
      div.className = `msg-wrapper ${isSent ? 'sent' : 'received'}`;

      let content = `<p>${msg.text}</p>`;

      if (msg.type === 'image') {
        content = `
          <div class="img-container">
            <img src="${msg.fileUrl}" class="msg-img"/>
            <a href="${msg.fileUrl}" download="payload_image.png" class="dl-btn"><i class="fa-solid fa-download"></i> SAVE</a>
          </div>`;
      } 
      else if (msg.type === 'code') {
        content = `
          <div class="vscode-block">
            <div class="vscode-header">
              <span>📄 ${msg.lang.toUpperCase()}</span>
              <button class="copy-btn" onclick="copyCode(this)">Copy Code</button>
            </div>
            <pre><code class="language-${msg.lang}">${escapeHTML(msg.code)}</code></pre>
          </div>`;
      }
      else if (msg.type === 'poll') {
        content = `<b>📊 POLL: ${msg.text}</b>`;
      }

      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      div.innerHTML = `
        <div class="msg-bubble">
          ${isGroupChat && !isSent ? `<div class="msg-sender">${msg.senderName || 'User'}</div>` : ''}
          ${content}
          <span class="msg-time">${time}</span>
        </div>
      `;
      messagesBox.appendChild(div);
    });

    Prism.highlightAll(); // Apply VS Code syntax highlighting
    messagesBox.scrollTop = messagesBox.scrollHeight;
  });
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function copyCode(btn) {
  const code = btn.parentElement.nextElementSibling.innerText;
  navigator.clipboard.writeText(code);
  btn.innerText = "Copied!";
  setTimeout(() => btn.innerText = "Copy Code", 2000);
}

sendBtn.onclick = sendMsg;
msgInput.onkeypress = (e) => { if (e.key === 'Enter') sendMsg(); };

function sendMsg() {
  const txt = msgInput.value.trim();
  if (!txt || !activeTargetId) return;

  db.ref('users/' + currentUser.uid).once('value').then((snap) => {
    const uData = snap.val() || {};
    db.ref(getRoomPath()).push({
      senderId: currentUser.uid,
      senderName: uData.name || 'User',
      text: txt,
      timestamp: Date.now(),
      type: 'text'
    });
    msgInput.value = '';
  });
}

// --- 4. ATTACHMENT MENU (IMAGE / CODE / POLL) ---

attachBtn.onclick = (e) => {
  e.stopPropagation();
  attachMenu.classList.toggle('hidden');
};
document.onclick = () => attachMenu.classList.add('hidden');

// Share Image
imgUpload.onchange = (e) => {
  const file = e.target.files[0];
  if (!file || !activeTargetId) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    db.ref(getRoomPath()).push({
      senderId: currentUser.uid,
      fileUrl: ev.target.result,
      timestamp: Date.now(),
      type: 'image'
    });
  };
  reader.readAsDataURL(file);
};

// Share Code Modal
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
    type: 'code'
  });

  codeTextArea.value = '';
  codeModal.classList.add('hidden');
};

// --- 5. GROUP CREATION SYSTEM ---

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
  members[currentUser.uid] = true; // Include self

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
  });
};

// --- 6. PROFILE CONFIG (FIXED) ---

editProfileBtn.onclick = () => {
  db.ref('users/' + currentUser.uid).once('value').then((snapshot) => {
    const userData = snapshot.val() || {};
    editNameInput.value = userData.name || '';
    modalAvatarPreview.src = userData.photoURL || '';
    editPhoneInput.value = userData.phone || '';
    tempAvatarBase64 = null;
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
      tempAvatarBase64 = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
};

profileForm.onsubmit = async (e) => {
  e.preventDefault();
  const newName = editNameInput.value.trim() || myName.innerText;
  const imgUrl = tempAvatarBase64 || modalAvatarPreview.src;

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

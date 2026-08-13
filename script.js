// Firebase Configuration
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

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// App Variables
let currentUser = null;
let activeChatUserId = null;
let isSignUpMode = false;
let typingTimeout = null;
let tempAvatarBase64 = null;

// DOM Selectors
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
const createPollBtn = document.getElementById('createPollBtn');

const profileModal = document.getElementById('profileModal');
const editProfileBtn = document.getElementById('editProfileBtn');
const closeModal = document.getElementById('closeModal');
const profileForm = document.getElementById('profileForm');
const modalAvatarPreview = document.getElementById('modalAvatarPreview');
const newAvatarInput = document.getElementById('newAvatarInput');
const editNameInput = document.getElementById('editNameInput');
const editPhoneInput = document.getElementById('editPhoneInput');
const logoutBtn = document.getElementById('logoutBtn');
const backBtn = document.getElementById('backBtn');

// --- 1. AUTHENTICATION ---

toggleAuthBtn.addEventListener('click', (e) => {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  authTitle.innerText = isSignUpMode ? "Create Account" : "Sign In";
  authBtn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
  nameGroup.style.display = isSignUpMode ? "block" : "none";
  toggleText.innerText = isSignUpMode ? "Already have an account?" : "Don't have an account?";
  toggleAuthBtn.innerText = isSignUpMode ? "Sign In" : "Sign Up";
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value;

  if (isSignUpMode) {
    auth.createUserWithEmailAndPassword(email, password).then((cred) => {
      const defaultImg = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop";
      cred.user.updateProfile({ displayName: name, photoURL: defaultImg });
      
      db.ref('users/' + cred.user.uid).set({
        uid: cred.user.uid,
        name: name,
        email: email,
        photoURL: defaultImg,
        status: "online"
      });
    }).catch(err => alert(err.message));
  } else {
    auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
  }
});

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    authOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');

    myName.innerText = user.displayName || "User";
    myAvatar.src = user.photoURL || "https://via.placeholder.com/100";

    // Set online status
    db.ref('users/' + user.uid).update({ status: 'online' });
    db.ref('users/' + user.uid).onDisconnect().update({ status: 'offline' });

    loadUsers();
  } else {
    authOverlay.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

logoutBtn.addEventListener('click', () => {
  if (currentUser) {
    db.ref('users/' + currentUser.uid).update({ status: 'offline' });
    auth.signOut();
  }
});

// --- 2. USERS LIST & CHAT SELECTION ---

function loadUsers() {
  db.ref('users').on('value', (snapshot) => {
    userList.innerHTML = '';
    snapshot.forEach((child) => {
      const u = child.val();
      if (u.uid !== currentUser.uid) {
        const item = document.createElement('div');
        item.className = `user-item ${activeChatUserId === u.uid ? 'active' : ''}`;
        item.innerHTML = `
          <img src="${u.photoURL}" class="avatar" />
          <div>
            <h4>${u.name}</h4>
            <span class="status-text">${u.status || 'offline'}</span>
          </div>
        `;
        item.onclick = () => selectChatUser(u);
        userList.appendChild(item);
      }
    });
  });
}

function selectChatUser(user) {
  activeChatUserId = user.uid;
  activeName.innerText = user.name;
  activeAvatar.src = user.photoURL;
  msgInput.disabled = false;
  sendBtn.disabled = false;

  appContainer.classList.add('mobile-active');

  // Track status & typing indicator
  db.ref('users/' + user.uid).on('value', (snap) => {
    const d = snap.val();
    if (d.typingTo === currentUser.uid) {
      activeStatus.innerText = "typing...";
      activeStatus.classList.add('typing');
    } else {
      activeStatus.innerText = d.status || "offline";
      activeStatus.classList.remove('typing');
    }
  });

  listenMessages();
}

// --- 3. REALTIME MESSAGING & SEEN STATUS ---

function getRoomId() {
  return currentUser.uid < activeChatUserId 
    ? `${currentUser.uid}_${activeChatUserId}` 
    : `${activeChatUserId}_${currentUser.uid}`;
}

function listenMessages() {
  const roomId = getRoomId();
  db.ref('chats/' + roomId).on('value', (snapshot) => {
    messagesBox.innerHTML = '';
    snapshot.forEach((child) => {
      const msg = child.val();
      const isSent = msg.senderId === currentUser.uid;

      // Update seen status
      if (!isSent && !msg.seen) {
        db.ref(`chats/${roomId}/${child.key}`).update({ seen: true });
      }

      const div = document.createElement('div');
      div.className = `msg-wrapper ${isSent ? 'sent' : 'received'}`;

      let content = `<p>${msg.text}</p>`;
      if (msg.type === 'image') content = `<img src="${msg.fileUrl}" class="msg-img"/>`;
      if (msg.type === 'poll') content = `<b>📊 Poll: ${msg.text}</b>`;

      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      div.innerHTML = `
        <div class="msg-bubble">
          ${content}
          <span class="msg-time">
            ${time}
            ${isSent ? `<i class="fa-solid fa-check-double ${msg.seen ? 'seen-icon' : ''}"></i>` : ''}
          </span>
        </div>
      `;
      messagesBox.appendChild(div);
    });
    messagesBox.scrollTop = messagesBox.scrollHeight;
  });
}

// Send Message
sendBtn.addEventListener('click', sendMsg);
msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });

function sendMsg() {
  const txt = msgInput.value.trim();
  if (!txt || !activeChatUserId) return;

  const roomId = getRoomId();
  db.ref('chats/' + roomId).push({
    senderId: currentUser.uid,
    text: txt,
    timestamp: Date.now(),
    seen: false,
    type: 'text'
  });

  msgInput.value = '';
  db.ref('users/' + currentUser.uid).update({ typingTo: null });
}

// Typing status tracker
msgInput.addEventListener('input', () => {
  if (!activeChatUserId) return;
  db.ref('users/' + currentUser.uid).update({ typingTo: activeChatUserId });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    db.ref('users/' + currentUser.uid).update({ typingTo: null });
  }, 1500);
});

// --- 4. MEDIA UPLOAD (BASE64 DIRECT) & POLL ---

attachBtn.onclick = (e) => {
  e.stopPropagation();
  attachMenu.classList.toggle('hidden');
};
document.onclick = () => attachMenu.classList.add('hidden');

// Image Upload without Firebase Storage
imgUpload.onchange = (e) => {
  const file = e.target.files[0];
  if (!file || !activeChatUserId) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const base64Image = event.target.result;
    const roomId = getRoomId();

    db.ref('chats/' + roomId).push({
      senderId: currentUser.uid,
      fileUrl: base64Image,
      timestamp: Date.now(),
      seen: false,
      type: 'image'
    });
  };
  reader.readAsDataURL(file);
};

createPollBtn.onclick = () => {
  const pollText = prompt("Enter Poll Question:");
  if (pollText && activeChatUserId) {
    const roomId = getRoomId();
    db.ref('chats/' + roomId).push({
      senderId: currentUser.uid,
      text: pollText,
      timestamp: Date.now(),
      seen: false,
      type: 'poll'
    });
  }
};

// --- 5. EDIT PROFILE ---

editProfileBtn.onclick = () => {
  editNameInput.value = currentUser.displayName || '';
  modalAvatarPreview.src = currentUser.photoURL || '';
  tempAvatarBase64 = null;
  profileModal.classList.remove('hidden');
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
  const imgUrl = tempAvatarBase64 || currentUser.photoURL;
  const newName = editNameInput.value || currentUser.displayName;

  await currentUser.updateProfile({ displayName: newName, photoURL: imgUrl });
  await db.ref('users/' + currentUser.uid).update({
    name: newName,
    photoURL: imgUrl,
    phone: editPhoneInput.value || ''
  });

  myName.innerText = newName;
  myAvatar.src = imgUrl;
  profileModal.classList.add('hidden');
};

backBtn.onclick = () => appContainer.classList.remove('mobile-active');
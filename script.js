// --- 3. MESSAGING WITH HD LIGHTBOX & VS CODE ---

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
            <img src="${msg.fileUrl}" class="msg-img" onclick="openLightbox('${msg.fileUrl}')" />
            <a href="${msg.fileUrl}" download="payload_image.png" class="dl-btn" onclick="event.stopPropagation()"><i class="fa-solid fa-download"></i> SAVE</a>
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

    Prism.highlightAll();
    messagesBox.scrollTop = messagesBox.scrollHeight;
  });
}

// Lightbox Functions
function openLightbox(url) {
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');

  lightboxImg.src = url;
  lightboxDownloadBtn.href = url;
  lightboxModal.classList.remove('hidden');
}

document.getElementById('closeLightbox').onclick = () => {
  document.getElementById('lightboxModal').classList.add('hidden');
};

let currentConversationId = null;

// ─── ON PAGE LOAD ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
});

// ─── LOAD ALL CONVERSATIONS INTO SIDEBAR ────────────────────
async function loadConversations() {
    try {
        const res = await fetch('/api/chat/conversations', {
            credentials: 'include'
        });
        const data = await res.json();

        const list = document.getElementById('conversations-list');
        list.innerHTML = '';

        if (data.conversations.length === 0) {
            list.innerHTML = '<p style="color:#555; font-size:12px; padding:8px 12px;">No conversations yet</p>';
            return;
        }

        data.conversations.forEach(convo => {
            const div = document.createElement('div');
            div.className = 'convo-item';
            div.dataset.id = convo._id;

            // Title span
            const titleSpan = document.createElement('span');
            titleSpan.className = 'convo-title';
            titleSpan.textContent = convo.title;
            titleSpan.onclick = () => openConversation(convo._id, convo.title);

            // 3-dot button
            const dotsBtn = document.createElement('button');
            dotsBtn.className = 'dots-btn';
            dotsBtn.textContent = '⋮';
            dotsBtn.onclick = (e) => {
                e.stopPropagation();
                toggleDropdown(convo._id);
            };

            // Dropdown menu
            const dropdown = document.createElement('div');
            dropdown.className = 'convo-dropdown';
            dropdown.id = `dropdown-${convo._id}`;

            const renameBtn = document.createElement('div');
            renameBtn.className = 'dropdown-item';
            renameBtn.textContent = '✏️ Rename';
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                renameConversation(convo._id, convo.title);
            };

            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'dropdown-item delete';
            deleteBtn.textContent = '🗑️ Delete';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteConversation(convo._id);
            };

            dropdown.appendChild(renameBtn);
            dropdown.appendChild(deleteBtn);

            div.appendChild(titleSpan);
            div.appendChild(dotsBtn);
            div.appendChild(dropdown);
            list.appendChild(div);
        });
    } catch (err) {
        console.error('Failed to load conversations:', err);
    }
}

// ─── DROPDOWN TOGGLE ──────────────────────────────────────────
function toggleDropdown(id) {
    document.querySelectorAll('.convo-dropdown').forEach(dd => {
        if (dd.id !== `dropdown-${id}`) dd.classList.remove('show');
    });

    const dropdown = document.getElementById(`dropdown-${id}`);
    const btn = dropdown.previousElementSibling; // the dots button

    if (!dropdown.classList.contains('show')) {
        const rect = btn.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.right - 140}px`;
    }

    dropdown.classList.toggle('show');
}

// Close dropdowns when clicking anywhere else
document.addEventListener('click', () => {
    document.querySelectorAll('.convo-dropdown').forEach(dd => dd.classList.remove('show'));
});

// ─── RENAME CONVERSATION ──────────────────────────────────────
async function renameConversation(id, currentTitle) {
    const newTitle = prompt('Rename conversation:', currentTitle);
    if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) return;

    try {
        const res = await fetch(`/api/chat/conversation/${id}/title`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: newTitle })
        });
        const data = await res.json();

        if (data.success) {
            await loadConversations();
            // Update topbar title if this is the currently open conversation
            if (currentConversationId === id) {
                document.getElementById('chat-title').textContent = data.conversation.title;
            }
        }
    } catch (err) {
        console.error('Rename failed:', err);
    }
}

// ─── DELETE CONVERSATION ──────────────────────────────────────
async function deleteConversation(id) {
    const confirmed = confirm('Delete this conversation? This cannot be undone.');
    if (!confirmed) return;

    try {
        const res = await fetch(`/api/chat/conversation/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success) {
            // If the deleted conversation was open, reset main area
            if (currentConversationId === id) {
                currentConversationId = null;
                document.getElementById('chat-title').textContent = 'Select a conversation';
                document.getElementById('upload-btn-label').style.display = 'none';
                document.getElementById('messages-area').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-hex">MK</div>
                        <h3>How can I help you today?</h3>
                        <p>Start a new chat or select an existing one</p>
                    </div>
                `;
            }
            await loadConversations();
        }
    } catch (err) {
        console.error('Delete failed:', err);
    }
}

// ─── CREATE NEW CONVERSATION ─────────────────────────────────
async function newChat() {
    // If current conversation is already a New Chat with no messages, just stay on it
    if (currentConversationId) {
        const res = await fetch(`/api/chat/conversation/${currentConversationId}/messages`, {
            credentials: 'include'
        });
        const data = await res.json();
        if (data.messages.length === 0) return; // already on an empty chat
    }

    try {
        const res = await fetch('/api/chat/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: 'New Chat' })
        });
        const data = await res.json();

        if (data.success) {
            await loadConversations();
            openConversation(data.conversation._id, data.conversation.title);
        }
    } catch (err) {
        console.error('Failed to create conversation:', err);
    }
}

// ─── OPEN A CONVERSATION ─────────────────────────────────────
async function openConversation(id, title) {
    currentConversationId = id;

    // Update topbar title
    document.getElementById('chat-title').textContent = title;

    // Show upload button
    document.getElementById('upload-btn-label').style.display = 'block';

    // Highlight active conversation in sidebar
    document.querySelectorAll('.convo-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
    });

    // Load messages
    try {
        const res = await fetch(`/api/chat/conversation/${id}/messages`, {
            credentials: 'include'
        });
        const data = await res.json();

        const area = document.getElementById('messages-area');
        area.innerHTML = '';

        if (data.messages.length === 0) {
            area.innerHTML = '<p style="color:#555; font-size:13px; text-align:center; margin-top:40px;">No messages yet. Say something!</p>';
            return;
        }

        data.messages.forEach(msg => renderMessage(msg.role, msg.content));
        scrollToBottom();
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

// ─── RENDER A MESSAGE BUBBLE ─────────────────────────────────
function renderMessage(role, content) {
    const area = document.getElementById('messages-area');

    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'You' : 'MK';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    area.appendChild(wrapper);

    return bubble; // return bubble so streaming can append to it
}

// ─── SEND MESSAGE WITH STREAMING ─────────────────────────────
async function sendMessage() {
    if (!currentConversationId) {
        alert('Please select or create a conversation first');
        return;
    }

    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content) return;

    // Clear input
    input.value = '';
    autoResize(input);

    // Disable send button while streaming
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;

    // Show user message immediately
    renderMessage('user', content);
    scrollToBottom();

    // Create empty assistant bubble with cursor
    const area = document.getElementById('messages-area');
    const wrapper = document.createElement('div');
    wrapper.className = 'message assistant';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'MK';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    bubble.appendChild(cursor);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    area.appendChild(wrapper);
    scrollToBottom();

    try {
        const response = await fetch(`/api/chat/conversation/${currentConversationId}/message/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ content })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(data);
                        fullText += parsed.text;
                        bubble.textContent = fullText;
                        bubble.appendChild(cursor);
                        scrollToBottom();
                    } catch (e) {
                        // incomplete chunk, skip
                    }
                }
            }
        }

        // Remove cursor when done
        cursor.remove();

    } catch (err) {
        bubble.textContent = 'Something went wrong. Please try again.';
        cursor.remove();
        console.error(err);
    }

    await loadConversations();
    document.querySelectorAll('.convo-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === currentConversationId);
    });

    sendBtn.disabled = false;
}

// ─── UPLOAD PDF ───────────────────────────────────────────────
async function uploadPDF() {
    const fileInput = document.getElementById('pdf-upload');
    const file = fileInput.files[0];
    if (!file || !currentConversationId) return;

    const label = document.getElementById('upload-btn-label');
    label.innerHTML = `<input type="file" id="pdf-upload" accept=".pdf" onchange="uploadPDF()" style="display:none"/> ⏳ Uploading...`;

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('conversationId', currentConversationId);

    try {
        const res = await fetch('/api/documents/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            label.innerHTML = `<input type="file" id="pdf-upload" accept=".pdf" onchange="uploadPDF()" style="display:none"/> 📄 ${data.filename}`;
            renderMessage('system', `📄 Document uploaded: ${data.filename} (${data.totalChunks} chunks)`);
            scrollToBottom();
        } else {
            label.innerHTML = `<input type="file" id="pdf-upload" accept=".pdf" onchange="uploadPDF()" style="display:none"/> 📄 Upload PDF`;
            alert('Upload failed: ' + data.message);
        }
    } catch (err) {
        label.innerHTML = `<input type="file" id="pdf-upload" accept=".pdf" onchange="uploadPDF()" style="display:none"/> 📄 Upload PDF`;
        console.error('Upload error:', err);
    }
}

// ─── LOGOUT ───────────────────────────────────────────────────
async function logout() {
    await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
    });
    window.location.href = '/login';
}

// ─── UTILITIES ────────────────────────────────────────────────
function scrollToBottom() {
    const area = document.getElementById('messages-area');
    area.scrollTop = area.scrollHeight;
}

function handleKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}
const chatViewport = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let chatHistory = [];

async function handleSendMessage() {
    const promptText = userInput.value.trim();
    if (!promptText) return;

    // 1. Show user message right away
    appendMessage('USER', promptText, 'user-msg');
    userInput.value = '';

    const auraId = appendMessage('AURA', 'Processing Engine...', 'aura-msg');

    // Build standard message arrays
    let contextPrompt = `SYSTEM MEMORY BLOCK:\nYou are AURA AI assistant.\n- Answer normally for general questions.\n- If user asks about PyCJ, respond ONLY in PyCJ syntax (e.g. variable declaration uses 'imagine').\n\n`;
    
    // Add history tracking to the message stream
    chatHistory.forEach(msg => {
        contextPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    contextPrompt += `User: ${promptText}\nAssistant:`;

    try {
        // Direct anonymous request to a completely free public inference point (No login or key needed!)
        const response = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: contextPrompt })
        });

        const data = await response.json();
        const auraPlaceholder = document.getElementById(auraId);

        if (data && data[0] && data[0].generated_text) {
            let fullText = data[0].generated_text;
            // Clean out the historical prompt context wrapper
            let reply = fullText.split("Assistant:").pop().trim();
            
            auraPlaceholder.querySelector('.body').innerHTML = formatResponse(reply);
            
            // Save to logs
            chatHistory.push({ role: 'user', content: promptText });
            chatHistory.push({ role: 'assistant', content: reply });
        } else {
            throw new Error("Public endpoint busy. Try resending your message in a few seconds.");
        }

    } catch (err) {
        const placeholder = document.getElementById(auraId);
        if (placeholder) {
            placeholder.querySelector('.body').innerHTML = `<span style="color: #ff5555;">Execution Error: ${err.message}</span>`;
        }
    }
}

function appendMessage(sender, text, className) {
    const id = 'msg-' + Math.random().toString(36).substring(2, 11);
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.id = id;
    div.innerHTML = `<div class="body"><strong>${sender}:</strong><br>${text}</div>`;
    chatViewport.appendChild(div);
    chatViewport.scrollTop = chatViewport.scrollHeight;
    return id;
}

function formatResponse(text) {
    let clean = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const codeBlockRegex = /\x60\x60\x60(.*?)\x60\x60\x60/gs;
    if (clean.includes("```")) {
        clean = clean.replace(codeBlockRegex, '<pre><code>$1</code></pre>');
    }
    return clean.replace(/\n/g, '<br>');
}

if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
if (userInput) {
    userInput.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            handleSendMessage(); 
        } 
    });
}

/**
 * Uprising Studio — AI Chat Widget
 * Embed with: <script src="YOUR_SERVER_URL/widget/uprising-chat.js"></script>
 *
 * Configure via window.UprisingChat before the script loads:
 * <script>
 *   window.UprisingChat = {
 *     apiUrl: 'https://your-server.com',  // Your backend URL
 *     primaryColor: '#6C63FF',             // Optional: override brand color
 *     position: 'right'                    // 'right' or 'left'
 *   };
 * </script>
 */
(function () {
    'use strict';

    const cfg = window.UprisingChat || {};
    const API_URL = (cfg.apiUrl || '').replace(/\/$/, '');
    const PRIMARY = cfg.primaryColor || '#6C63FF';
    const POSITION = cfg.position === 'left' ? 'left: 24px;' : 'right: 24px;';
    const WIDGET_ID = 'uprising-chat-widget';

    if (document.getElementById(WIDGET_ID)) return; // Already loaded

    // ─── STYLES ─────────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #uprising-chat-widget * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        
        #uprising-chat-bubble {
            position: fixed; bottom: 24px; ${POSITION} width: 56px; height: 56px;
            background: linear-gradient(135deg, ${PRIMARY}, #4F46E5);
            border-radius: 50%; cursor: pointer; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 24px rgba(108,99,255,0.45);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: none; outline: none;
        }
        #uprising-chat-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(108,99,255,0.6); }
        #uprising-chat-bubble svg { width: 26px; height: 26px; fill: white; transition: opacity 0.2s; }
        #uprising-chat-bubble .icon-close { display: none; }
        #uprising-chat-bubble.open .icon-chat { display: none; }
        #uprising-chat-bubble.open .icon-close { display: block; }

        #uprising-chat-window {
            position: fixed; bottom: 92px; ${POSITION}
            width: 360px; height: 520px; max-height: calc(100vh - 110px);
            background: #0f0f14; border-radius: 20px;
            box-shadow: 0 16px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07);
            z-index: 99998; display: flex; flex-direction: column; overflow: hidden;
            transform: scale(0.9) translateY(16px); opacity: 0;
            transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
            pointer-events: none;
        }
        #uprising-chat-window.open {
            transform: scale(1) translateY(0); opacity: 1; pointer-events: all;
        }

        #uprising-chat-header {
            background: linear-gradient(135deg, ${PRIMARY}22, transparent);
            border-bottom: 1px solid rgba(255,255,255,0.07);
            padding: 16px 18px; display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        #uprising-chat-header .avatar {
            width: 38px; height: 38px; border-radius: 50%;
            background: linear-gradient(135deg, ${PRIMARY}, #4F46E5);
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; flex-shrink: 0;
        }
        #uprising-chat-header .info .name { color: #fff; font-size: 14px; font-weight: 600; line-height: 1.2; }
        #uprising-chat-header .info .status {
            font-size: 11px; color: #22c55e; display: flex; align-items: center; gap: 4px; margin-top: 2px;
        }
        #uprising-chat-header .info .status::before {
            content: ''; width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
            animation: uprPulse 2s infinite;
        }
        @keyframes uprPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        #uprising-chat-header .powered {
            margin-left: auto; font-size: 10px; color: rgba(255,255,255,0.3);
            text-align: right; line-height: 1.4;
        }

        #uprising-chat-messages {
            flex: 1; overflow-y: auto; padding: 16px 14px; display: flex;
            flex-direction: column; gap: 12px; scroll-behavior: smooth;
        }
        #uprising-chat-messages::-webkit-scrollbar { width: 4px; }
        #uprising-chat-messages::-webkit-scrollbar-track { background: transparent; }
        #uprising-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .upr-msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; animation: uprFadeIn 0.25s ease; }
        @keyframes uprFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .upr-msg.user { flex-direction: row-reverse; }
        .upr-bubble {
            padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.5;
            max-width: 78%; word-wrap: break-word;
        }
        .upr-msg.bot .upr-bubble {
            background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9);
            border-bottom-left-radius: 4px;
        }
        .upr-msg.user .upr-bubble {
            background: linear-gradient(135deg, ${PRIMARY}, #4F46E5); color: white;
            border-bottom-right-radius: 4px;
        }
        .upr-msg.bot .upr-avatar {
            width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
            background: linear-gradient(135deg, ${PRIMARY}, #4F46E5);
            display: flex; align-items: center; justify-content: center; font-size: 13px;
        }

        .upr-typing { display: flex; gap: 4px; align-items: center; padding: 12px 14px; }
        .upr-typing span {
            width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4);
            animation: uprBounce 1.2s infinite;
        }
        .upr-typing span:nth-child(2) { animation-delay: 0.15s; }
        .upr-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes uprBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

        #uprising-chat-input-area {
            padding: 12px 14px 14px; border-top: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
        }
        #uprising-chat-form { display: flex; gap: 8px; align-items: flex-end; }
        #uprising-chat-input {
            flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px; color: #fff; font-size: 13.5px; padding: 10px 14px;
            resize: none; outline: none; min-height: 42px; max-height: 100px; line-height: 1.4;
            transition: border-color 0.2s;
            font-family: inherit;
        }
        #uprising-chat-input::placeholder { color: rgba(255,255,255,0.3); }
        #uprising-chat-input:focus { border-color: ${PRIMARY}88; }
        #uprising-chat-send {
            width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
            background: linear-gradient(135deg, ${PRIMARY}, #4F46E5);
            border: none; cursor: pointer; display: flex; align-items: center;
            justify-content: center; transition: transform 0.15s, opacity 0.15s;
        }
        #uprising-chat-send:hover { transform: scale(1.05); }
        #uprising-chat-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        #uprising-chat-send svg { width: 18px; height: 18px; fill: white; }
        .upr-footer { text-align: center; font-size: 10px; color: rgba(255,255,255,0.2); margin-top: 8px; }
        .upr-footer a { color: rgba(255,255,255,0.3); text-decoration: none; }

        @media (max-width: 420px) {
            #uprising-chat-window { width: calc(100vw - 32px); ${POSITION.includes('right') ? 'right: 16px;' : 'left: 16px;'} }
        }
    `;
    document.head.appendChild(style);

    // ─── HTML ────────────────────────────────────────────────────────────────────
    const container = document.createElement('div');
    container.id = WIDGET_ID;
    container.innerHTML = `
        <div id="uprising-chat-window" role="dialog" aria-label="Chat Uprising Studio" aria-hidden="true">
            <div id="uprising-chat-header">
                <div class="avatar">✨</div>
                <div class="info">
                    <div class="name">Sophie · Uprising Studio</div>
                    <div class="status">En ligne</div>
                </div>
                <div class="powered">Propulsé par<br>Uprising AI</div>
            </div>
            <div id="uprising-chat-messages" role="log" aria-live="polite"></div>
            <div id="uprising-chat-input-area">
                <form id="uprising-chat-form">
                    <textarea
                        id="uprising-chat-input"
                        placeholder="Décrivez votre projet..."
                        rows="1"
                        aria-label="Votre message"
                        maxlength="500"
                    ></textarea>
                    <button type="submit" id="uprising-chat-send" aria-label="Envoyer" disabled>
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </form>
                <div class="upr-footer">Uprising Studio · <a href="https://uprisingstudio-mtl.framer.website/contact" target="_blank">Démarrer un projet</a></div>
            </div>
        </div>
        <button id="uprising-chat-bubble" aria-label="Ouvrir le chat" aria-expanded="false">
            <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
            <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
    `;
    document.body.appendChild(container);

    // ─── STATE ───────────────────────────────────────────────────────────────────
    let isOpen = false;
    let isTyping = false;
    const messages = [];

    const win = document.getElementById('uprising-chat-window');
    const bubble = document.getElementById('uprising-chat-bubble');
    const msgsEl = document.getElementById('uprising-chat-messages');
    const input = document.getElementById('uprising-chat-input');
    const sendBtn = document.getElementById('uprising-chat-send');
    const form = document.getElementById('uprising-chat-form');

    // ─── HELPERS ─────────────────────────────────────────────────────────────────
    const scrollBottom = () => { msgsEl.scrollTop = msgsEl.scrollHeight; };

    const addMessage = (role, content) => {
        const div = document.createElement('div');
        div.className = `upr-msg ${role}`;
        const formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        div.innerHTML = role === 'bot'
            ? `<div class="upr-avatar">✨</div><div class="upr-bubble">${formatted}</div>`
            : `<div class="upr-bubble">${formatted}</div>`;
        msgsEl.appendChild(div);
        scrollBottom();
        return div;
    };

    const showTyping = () => {
        const div = document.createElement('div');
        div.className = 'upr-msg bot';
        div.id = 'upr-typing';
        div.innerHTML = '<div class="upr-avatar">✨</div><div class="upr-bubble upr-typing"><span></span><span></span><span></span></div>';
        msgsEl.appendChild(div);
        scrollBottom();
    };

    const hideTyping = () => {
        const t = document.getElementById('upr-typing');
        if (t) t.remove();
    };

    const setLoading = (loading) => {
        isTyping = loading;
        sendBtn.disabled = loading || !input.value.trim();
        input.disabled = loading;
    };

    // ─── OPEN / CLOSE ────────────────────────────────────────────────────────────
    const openWidget = () => {
        isOpen = true;
        win.classList.add('open');
        win.setAttribute('aria-hidden', 'false');
        bubble.classList.add('open');
        bubble.setAttribute('aria-expanded', 'true');
        input.focus();
        if (messages.length === 0) {
            setTimeout(() => {
                addMessage('bot', 'Bonjour ! 👋 Je suis Sophie, l\'assistante d\'**Uprising Studio**.\n\nComment puis-je vous aider ? Que ce soit pour votre site web, votre branding ou pour en savoir plus sur nos offres — je suis là !');
                messages.push({ role: 'assistant', content: 'Bonjour ! Je suis Sophie, l\'assistante d\'Uprising Studio. Comment puis-je vous aider ?' });
            }, 200);
        }
    };

    const closeWidget = () => {
        isOpen = false;
        win.classList.remove('open');
        win.setAttribute('aria-hidden', 'true');
        bubble.classList.remove('open');
        bubble.setAttribute('aria-expanded', 'false');
    };

    bubble.addEventListener('click', () => isOpen ? closeWidget() : openWidget());

    // ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text || isTyping) return;

        addMessage('user', text);
        messages.push({ role: 'user', content: text });
        input.value = '';
        input.style.height = 'auto';
        setLoading(true);
        showTyping();

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const reply = data.reply || 'Désolée, je n\'ai pas pu répondre. Contactez-nous directement !';

            hideTyping();
            addMessage('bot', reply);
            messages.push({ role: 'assistant', content: reply });
        } catch (err) {
            hideTyping();
            addMessage('bot', 'Désolée, une erreur est survenue. Vous pouvez nous contacter directement via [notre page contact](https://uprisingstudio-mtl.framer.website/contact).');
            console.error('[Uprising Chat]', err);
        } finally {
            setLoading(false);
        }
    };

    form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });

    // Allow Enter to send (Shift+Enter for newline)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Enable/disable send button & auto-resize textarea
    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim() || isTyping;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Show widget bubble with a subtle entrance animation after 1.5s
    setTimeout(() => { bubble.style.opacity = '1'; }, 1500);

})();

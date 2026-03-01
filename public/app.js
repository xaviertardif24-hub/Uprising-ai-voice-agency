document.addEventListener('DOMContentLoaded', () => {
    // ═══════ STATE ═══════
    let currentConfig = null;
    let activeEnvId = null;
    let selectedLead = null;

    // ═══════ DOM REFS ═══════
    const sidebar = document.getElementById('app-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const clientSelector = document.getElementById('top-client-selector');
    const toastContainer = document.getElementById('toast-container');
    const mainContent = document.getElementById('main-content');

    // Section containers
    const pages = document.querySelectorAll('.app-section');
    const navLinks = document.querySelectorAll('.nav-links li[onclick]');

    // Dashboard
    const callBtn = document.getElementById('call-btn');
    const phoneInput = document.getElementById('phone-number');
    const callFeedback = document.getElementById('call-feedback');

    // Agents
    const agentsGrid = document.getElementById('agents-grid');
    const agentConfigPanel = document.getElementById('agent-config-panel');
    const activeAgentName = document.getElementById('active-agent-name');
    const promptTextarea = document.getElementById('prompt-content');
    const ownerEmailInput = document.getElementById('owner-email');
    const ownerPhoneInput = document.getElementById('owner-phone');
    const availStartInput = document.getElementById('avail-start');
    const availEndInput = document.getElementById('avail-end');
    const webhookUrlDisplay = document.getElementById('webhook-url-display');

    // Leads
    const leadsBody = document.getElementById('leads-body');

    // Modal
    const leadModal = document.getElementById('lead-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalBookBtn = document.getElementById('modal-book-btn');

    // ═══════ NAVIGATION ═══════
    window.showSection = function (sectionId) {
        // Hide all sections
        pages.forEach(s => s.classList.remove('active'));
        // Show target
        const target = document.getElementById(`page-${sectionId}`);
        if (target) {
            target.classList.add('active');
            target.scrollTo(0, 0);
        }

        // Update nav state
        navLinks.forEach(li => li.classList.remove('active'));
        const activeNav = document.getElementById(`nav-${sectionId}`);
        if (activeNav) activeNav.classList.add('active');

        // Auto-close sidebar on mobile
        if (window.innerWidth <= 1024 && sidebar) {
            sidebar.classList.add('hidden');
        }

        // Section specific logic
        if (sectionId === 'dashboard') {
            fetchAnalytics();
            updateDashboardActivity();
        }
        if (sectionId === 'leads') fetchLeads();
        if (sectionId === 'appels') renderCallLogs();
        if (sectionId === 'changelog') renderChangelog();
        if (sectionId === 'agent-builder') resetWizard();
        if (sectionId === 'settings') fetchSystemStatus();
    };

    // ═══════ UI HELPERS ═══════
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function showFeedback(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = `feedback show ${type}`;
        setTimeout(() => { el.className = 'feedback'; }, 5000);
    }

    // ═══════ CORE DATA FETCHING ═══════
    async function fetchConfig() {
        try {
            const response = await fetch('/api/dashboard/config');
            currentConfig = await response.json();
            activeEnvId = currentConfig.active_environment;
            renderAgents();
            loadActivePrompt();
            updateCurrentAgentBadge();
            fetchLeads();
            fetchAnalytics();
        } catch (err) {
            console.error('Failed to fetch config', err);
            showToast('Erreur de chargement', 'error');
        }
    }

    window.fetchLeads = async function () {
        try {
            const response = await fetch('/api/dashboard/leads');
            const leads = await response.json();
            renderLeads(leads);
            updateDashboardActivity();
        } catch (err) {
            console.error('Failed to fetch leads', err);
        }
    };

    async function updateDashboardActivity() {
        const list = document.getElementById('dashboard-activity-list');
        if (!list) return;

        try {
            const res = await fetch('/api/dashboard/leads');
            const leads = await res.json();

            if (res.ok && leads.length > 0) {
                const recent = leads.slice(0, 5);
                list.innerHTML = recent.map(item => `
                    <div class="activity-item" style="display:flex; gap:1rem; padding:1rem 0; border-bottom:1px solid var(--border);">
                        <div class="activity-icon" style="width:40px;height:40px;background:var(--bg-secondary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);"><i class="fas fa-user-plus"></i></div>
                        <div class="activity-content" style="flex:1;">
                            <div class="activity-main" style="font-size:0.9rem; font-weight:600;">
                                ${item.name} <span class="text-muted" style="font-weight:400;">— ${item.project || 'Nouveau Lead'}</span>
                            </div>
                            <div class="activity-meta" style="display:flex; gap:1rem; font-size:0.75rem; margin-top:4px;">
                                <span><i class="far fa-clock"></i> ${item.timestamp || ''}</span>
                                <span style="font-weight:800; color:var(--accent);">${item.status || 'Nouveau'}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                list.innerHTML = '<p class="text-muted">Aucune activité récente</p>';
            }
        } catch (e) {
            console.error('Activity error:', e);
        }
    }

    async function fetchAnalytics() {
        try {
            const statsRes = await fetch('/api/dashboard/analytics');
            const result = await statsRes.json();
            if (statsRes.ok) {
                const stats = result.data;
                document.getElementById('stat-total-val').textContent = stats.totalLeads || 0;
                document.getElementById('stat-today-val').textContent = stats.todayLeads || 0;
                document.getElementById('stat-week-val').textContent = stats.thisWeek || 0;
                document.getElementById('stat-agents-val').textContent = stats.activeAgents || 0;
            }
        } catch (err) {
            console.error('Analytics error:', err);
        }
    }

    window.renderCallLogs = async function () {
        const list = document.getElementById('calls-list');
        if (!list) return;

        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem;"><i class="fas fa-spinner fa-spin"></i> Chargement...</td></tr>';

        try {
            const res = await fetch('/api/dashboard/calls');
            const calls = await res.json();

            if (!calls || calls.length === 0) {
                list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem;">Aucun appel trouvé</td></tr>';
                return;
            }

            list.innerHTML = calls.map(call => {
                const date = new Date(call.created_at).toLocaleString('fr-CA');
                const duration = formatDuration(call.call_length);
                const status = call.status || 'inconnu';

                return `
                    <tr>
                        <td><small>${date}</small></td>
                        <td><strong>${call.agent_id || 'Agent'}</strong></td>
                        <td><small>${call.to || call.phone_number}</small></td>
                        <td>${duration}</td>
                        <td><span style="font-weight:700; color:${status === 'completed' ? 'var(--success)' : 'var(--text-muted)'};">${status}</span></td>
                        <td>
                            <button class="btn ghost btn-small" onclick="showCallDetails('${call.call_id}')"><i class="fas fa-search"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--error);">Erreur de chargement</td></tr>';
        }
    };

    function formatDuration(seconds) {
        if (!seconds) return '0:00';
        const s = Math.floor(seconds);
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return `${m}:${rem.toString().padStart(2, '0')}`;
    }

    function updateCurrentAgentBadge() {
        const badge = document.getElementById('current-agent-badge');
        if (badge && currentConfig && activeEnvId) {
            const env = currentConfig.environments[activeEnvId];
            badge.textContent = `Agent: ${env?.name || activeEnvId}`;
        }
    }

    function renderAgents() {
        if (!agentsGrid || !currentConfig) return;
        agentsGrid.innerHTML = '';

        Object.keys(currentConfig.environments).forEach(key => {
            const env = currentConfig.environments[key];
            const isActive = key === activeEnvId;

            const card = document.createElement('div');
            card.className = `action-card ${isActive ? 'active' : ''}`;
            card.innerHTML = `
                <div class="action-icon"><i class="fas fa-robot"></i></div>
                <div class="action-info">
                    <h3>${env.name}</h3>
                    <p>${env.description || 'Agent actif'}</p>
                    <div style="font-size:0.7rem; margin-top:5px; font-weight:800; color:${isActive ? 'var(--accent)' : 'var(--text-muted)'};">
                        ${isActive ? '● ACTIF' : '○ INACTIF'}
                    </div>
                </div>
            `;
            card.onclick = () => selectAgent(key);
            agentsGrid.appendChild(card);
        });
    }

    async function selectAgent(id) {
        if (id !== activeEnvId) {
            try {
                const res = await fetch('/api/dashboard/active-environment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active_environment: id })
                });
                if (res.ok) {
                    activeEnvId = id;
                    renderAgents();
                    updateCurrentAgentBadge();
                    showToast(`Agent activé : ${id}`, 'success');
                }
            } catch (err) {
                showToast('Erreur lors du changement d\'agent', 'error');
                return;
            }
        }
        loadActivePrompt();
        if (agentConfigPanel) agentConfigPanel.style.display = 'block';
    }

    function loadActivePrompt() {
        if (!currentConfig || !activeEnvId) return;
        const env = currentConfig.environments[activeEnvId];
        if (!env) return;

        if (activeAgentName) activeAgentName.textContent = env.name;
        if (promptTextarea) promptTextarea.value = env.prompt_template || '';
        if (ownerEmailInput) ownerEmailInput.value = env.owner_email || '';
        if (ownerPhoneInput) ownerPhoneInput.value = env.owner_phone || '';
        if (availStartInput) availStartInput.value = env.availability?.start || '08:00';
        if (availEndInput) availEndInput.value = env.availability?.end || '18:00';

        const baseUrl = window.location.origin;
        if (webhookUrlDisplay) webhookUrlDisplay.value = `${baseUrl}/webhook/bland-ai/${activeEnvId}`;
    }

    async function savePrompt() {
        try {
            const res = await fetch('/api/dashboard/update-environment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: activeEnvId,
                    prompt_template: promptTextarea.value,
                    owner_email: ownerEmailInput.value,
                    owner_phone: ownerPhoneInput.value,
                    availability: { start: availStartInput.value, end: availEndInput.value }
                })
            });
            if (res.ok) {
                showToast('Configuration sauvegardée !', 'success');
            }
        } catch (err) {
            showToast('Erreur réseau', 'error');
        }
    }

    function renderLeads(leads) {
        if (!leadsBody) return;
        leadsBody.innerHTML = '';
        const emptyState = document.getElementById('leads-empty');

        if (!leads || leads.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            updatePipelineCounts([]);
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        updatePipelineCounts(leads);

        leads.forEach(lead => {
            const dateObj = new Date(lead.timestamp);
            const formattedDate = isNaN(dateObj.getTime()) ? (lead.timestamp || '—') : dateObj.toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');

            const tr = document.createElement('tr');
            const statusClass = lead.status === 'RDV' ? 'success' : (lead.status === 'Qualifié' ? 'accent' : 'muted');

            tr.innerHTML = `
                <td><small>${formattedDate}</small></td>
                <td><strong>${lead.name || '—'}</strong></td>
                <td><small>${lead.phone || ''}</small></td>
                <td><small>${lead.project || '—'}</small></td>
                <td>
                    <select class="status-select status-${statusClass}" onchange="updateLeadStatus('${lead.id}', this.value)">
                        <option value="Nouveau" ${lead.status === 'Nouveau' ? 'selected' : ''}>Nouveau</option>
                        <option value="Qualifié" ${lead.status === 'Qualifié' ? 'selected' : ''}>Qualifié</option>
                        <option value="RDV" ${lead.status === 'RDV' ? 'selected' : ''}>RDV Pris</option>
                    </select>
                </td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn ghost btn-small detail-btn" title="Voir détails"><i class="fas fa-eye"></i></button>
                        <button class="btn ghost btn-small copy-lead-btn" title="Copier infos"><i class="fas fa-copy"></i></button>
                        <button class="btn ghost btn-small delete-lead-btn" style="color:var(--error)" title="Supprimer"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tr.querySelector('.detail-btn').onclick = () => showLeadDetails(lead);
            tr.querySelector('.copy-lead-btn').onclick = () => {
                const text = `Lead: ${lead.name}\nTél: ${lead.phone}\nProjet: ${lead.project}\nNotes: ${lead.details}`;
                copyToClipboard(text, null);
            };
            tr.querySelector('.delete-lead-btn').onclick = (e) => {
                e.stopPropagation();
                deleteLead(lead.id || lead.timestamp);
            };
            leadsBody.appendChild(tr);
        });
    }

    function updatePipelineCounts(leads) {
        const counts = { Nouveau: 0, Qualifié: 0, RDV: 0 };
        leads.forEach(l => {
            const s = l.status || 'Nouveau';
            if (counts[s] !== undefined) counts[s]++;
        });
        if (document.getElementById('count-nouveau')) document.getElementById('count-nouveau').textContent = counts.Nouveau;
        if (document.getElementById('count-qualifie')) document.getElementById('count-qualifie').textContent = counts.Qualifié;
        if (document.getElementById('count-rdv')) document.getElementById('count-rdv').textContent = counts.RDV;
    }

    window.updateLeadStatus = async function (id, newStatus) {
        try {
            const res = await fetch(`/api/dashboard/leads/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                showToast(`Statut : ${newStatus}`, 'success');
                fetchLeads();
            }
        } catch (err) {
            showToast('Erreur réseau', 'error');
        }
    };

    window.showLeadDetails = function (lead) {
        selectedLead = lead;
        document.getElementById('detail-name').textContent = lead.name || '—';
        document.getElementById('detail-phone').textContent = lead.phone || '—';
        document.getElementById('detail-email').textContent = lead.email || 'Non fourni';
        document.getElementById('detail-project').textContent = lead.project || '—';
        document.getElementById('detail-notes').textContent = lead.details || '—';
        document.getElementById('detail-appt').textContent = `${lead.date || ''} ${lead.time || ''}` || 'Non spécifié';
        if (leadModal) leadModal.classList.add('show');
    };

    async function deleteLead(id) {
        if (!confirm('Supprimer ce lead ?')) return;
        try {
            const res = await fetch(`/api/dashboard/leads/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Lead supprimé', 'success');
                fetchLeads();
            }
        } catch (err) {
            showToast('Erreur réseau', 'error');
        }
    }

    async function initiateCall() {
        const number = phoneInput.value;
        if (!number) return showToast('Entrez un numéro', 'info');

        callBtn.disabled = true;
        callBtn.innerHTML = '<span class="spinner"></span> Appel...';
        showFeedback(callFeedback, 'Connexion Bland AI...', 'info');

        try {
            const res = await fetch('/api/dashboard/test-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: number })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Appel lancé !', 'success');
                showFeedback(callFeedback, `✅ Succès • ID: ${data.call_id.substring(0, 8)}`, 'success');
            } else {
                showFeedback(callFeedback, `❌ ${data.error}`, 'error');
            }
        } catch (err) {
            showToast('Erreur réseau', 'error');
        } finally {
            callBtn.disabled = false;
            callBtn.innerHTML = '<i class="fas fa-phone"></i> Lancer l\'appel test';
        }
    }

    function renderChangelog() {
        const list = document.getElementById('changelog-list');
        if (!list) return;

        const data = [
            { version: 'v9.0', date: 'Févr. 2026', title: 'Refonte Responsive Totale', items: ['Interface mobile-first', 'Séparation des pages stricte', 'Sidebar auto-rétractable', 'Optimisation des performances'] },
            { version: 'v8.5', date: 'Févr. 2026', title: 'Design Glassmorphism Premium', items: ['Nouvelle charte graphique', 'Effets de flou et transparence', 'Iconographie modernisée'] }
        ];

        list.innerHTML = data.map(v => `
            <div class="changelog-item" style="margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border);">
                <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
                    <span style="background:var(--accent); color:white; padding:4px 10px; border-radius:6px; font-weight:800; font-size:0.75rem;">${v.version}</span>
                    <span style="color:var(--text-muted); font-size:0.8rem;">${v.date}</span>
                </div>
                <h3 style="margin-bottom:0.75rem;">${v.title}</h3>
                <ul style="padding-left:1.5rem; color:var(--text-secondary); font-size:0.9rem;">
                    ${v.items.map(i => `<li style="margin-bottom:0.4rem;">${i}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }

    if (sidebarToggle) {
        sidebarToggle.onclick = (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('hidden');
        };
    }

    mainContent.onclick = () => {
        if (window.innerWidth <= 1024 && !sidebar.classList.contains('hidden')) {
            sidebar.classList.add('hidden');
        }
    };

    if (clientSelector) {
        clientSelector.onchange = (e) => {
            showToast(`Filtre : ${e.target.value}`, 'info');
            fetchLeads();
        };
    }

    if (callBtn) callBtn.onclick = initiateCall;
    const savePromptBtn = document.getElementById('save-prompt-btn');
    if (savePromptBtn) savePromptBtn.onclick = savePrompt;
    if (closeModalBtn) closeModalBtn.onclick = () => leadModal.classList.remove('show');
    if (modalBookBtn) modalBookBtn.onclick = bookModalLead;

    async function bookModalLead() {
        if (!selectedLead) return;
        try {
            const res = await fetch('/api/dashboard/book-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedLead)
            });
            if (res.ok) {
                showToast('RDV Réservé !', 'success');
                leadModal.classList.remove('show');
                fetchLeads();
            }
        } catch (e) { showToast('Erreur', 'error'); }
    }

    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) exportBtn.onclick = () => {
        window.location.href = '/api/dashboard/export-leads';
    };

    // ═══════ WIZARD LOGIC ═══════
    let wizardData = null;

    window.updateWizardStep = function (step) {
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.progress-step').forEach((s, idx) => {
            s.classList.remove('active');
            if (idx + 1 === step) s.classList.add('active');
            if (idx + 1 < step) s.classList.add('completed');
        });
        document.getElementById(`wizard-step-${step}`).classList.add('active');
    };

    async function startScrape() {
        const url = document.getElementById('scrape-url').value;
        if (!url) return showToast('Veuillez entrer une URL', 'warning');

        const btn = document.getElementById('start-scrape-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyse en cours...';

        try {
            const res = await fetch('/api/dashboard/scrape-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const result = await res.json();

            if (res.ok) {
                wizardData = result.data;
                populateWizardStep2(wizardData);
                updateWizardStep(2);
                showToast('Analyse réussie !', 'success');
            } else {
                showToast(result.error || 'Échec de l\'analyse', 'error');
            }
        } catch (err) {
            showToast('Erreur réseau', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Lancer l\'analyse';
        }
    }

    function populateWizardStep2(data) {
        document.getElementById('wizard-company-name').value = data.name || '';
        document.getElementById('wizard-company-desc').value = data.description || '';

        const servicesList = document.getElementById('wizard-services-list');
        servicesList.innerHTML = (data.services || []).map(s => `
            <div class="tag-item">
                <span>${s}</span>
                <i class="fas fa-times" onclick="this.parentElement.remove()"></i>
            </div>
        `).join('');

        const faqList = document.getElementById('wizard-faq-list');
        faqList.innerHTML = (data.faq || []).map(item => `
            <div class="faq-item-editable">
                <input type="text" value="${item.question}" class="faq-q">
                <textarea class="faq-a">${item.answer}</textarea>
                <button onclick="this.parentElement.remove()" class="btn-delete"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        // Pre-generate prompt for step 3
        generateWizardPrompt();
    }

    async function generateWizardPrompt() {
        // Collect current data from Step 2
        const companyData = {
            name: document.getElementById('wizard-company-name').value,
            description: document.getElementById('wizard-company-desc').value,
            services: Array.from(document.querySelectorAll('#wizard-services-list .tag-item span')).map(s => s.textContent),
            faq: Array.from(document.querySelectorAll('.faq-item-editable')).map(div => ({
                question: div.querySelector('.faq-q').value,
                answer: div.querySelector('.faq-a').value
            }))
        };

        // This is a simplified client-side prompt generator. 
        // For "perfection", we'd fetch this from the server or use the logic from webScraperService.js
        // For now, let's just make a decent template.
        const prompt = `Tu es l'assistante virtuelle de ${companyData.name}. Tu parles de façon naturelle et professionnelle.
        
À PROPOS : ${companyData.description}

SERVICES : ${companyData.services.join(', ')}

MISSIONS :
1. Accueille chaleureusement.
2. Identifie le besoin.
3. Récupère NOM et TÉLÉPHONE.
4. Propose un rendez-vous.`;

        document.getElementById('wizard-prompt-preview').value = prompt;
        document.getElementById('wizard-agent-id').value = companyData.name.toLowerCase().replace(/\s+/g, '-');
    }

    async function finishWizard() {
        const id = document.getElementById('wizard-agent-id').value;
        const prompt = document.getElementById('wizard-prompt-preview').value;
        const voice_id = document.getElementById('wizard-voice-select').value;

        if (!id) return showToast('L\'ID de l\'agent est requis', 'warning');

        const btn = document.getElementById('finish-wizard-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';

        try {
            const companyData = {
                name: document.getElementById('wizard-company-name').value,
                description: document.getElementById('wizard-company-desc').value,
                services: Array.from(document.querySelectorAll('#wizard-services-list .tag-item span')).map(s => s.textContent),
                faq: Array.from(document.querySelectorAll('.faq-item-editable')).map(div => ({
                    question: div.querySelector('.faq-q').value,
                    answer: div.querySelector('.faq-a').value
                }))
            };

            const res = await fetch('/api/dashboard/create-smart-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id, companyData, voice_id, prompt_template: prompt
                })
            });

            if (res.ok) {
                showToast('Agent créé avec succès !', 'success');
                await fetchConfig();
                showSection('agents');
            } else {
                const err = await res.json();
                showToast(err.error || 'Erreur lors de la création', 'error');
            }
        } catch (err) {
            showToast('Erreur réseau', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function resetWizard() {
        updateWizardStep(1);
        document.getElementById('scrape-url').value = '';
    }

    // ═══════ UTILS ═══════
    window.copyToClipboard = function (text, btnId) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copié dans le presse-papier !', 'success');
            const btn = document.getElementById(btnId);
            if (btn) {
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => btn.innerHTML = originalContent, 2000);
            }
        });
    };

    // Event Listeners for Wizard
    document.getElementById('start-scrape-btn').onclick = startScrape;
    document.getElementById('finish-wizard-btn').onclick = finishWizard;
    document.getElementById('copy-webhook-btn').onclick = () => {
        const url = document.getElementById('webhook-url-display').value;
        copyToClipboard(url, 'copy-webhook-btn');
    };

    async function fetchSystemStatus() {
        try {
            const res = await fetch('/api/dashboard/system-status');
            const data = await res.json();

            // Populate Connections
            updateConnStatus('bland', data.bland.configured, data.bland.key_preview);
            updateConnStatus('google', data.google.configured, data.google.calendar_id);
            updateConnStatus('twenty', data.twenty.configured, data.twenty.url);

            // Populate Meta
            document.getElementById('sys-node').textContent = data.server.node_version;
            document.getElementById('sys-uptime').textContent = formatUptime(data.server.uptime);
        } catch (err) {
            console.error('Error fetching system status:', err);
        }
    }

    function updateConnStatus(id, isConfigured, text) {
        const statusEl = document.getElementById(`status-${id}`);
        const dotEl = document.getElementById(`dot-${id}`);
        if (statusEl) statusEl.textContent = isConfigured ? (text || 'Actif') : 'Non configuré';
        if (dotEl) {
            dotEl.className = 'conn-dot';
            if (isConfigured) dotEl.classList.add('active');
        }
    }

    function formatUptime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }

    // Theme Selector Logic
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            showToast(`Thème ${opt.querySelector('span').textContent} activé !`, 'success');
        };
    });

    window.fetchSystemStatus = fetchSystemStatus;
    fetchConfig();
});

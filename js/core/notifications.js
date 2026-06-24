/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Core: Toast & Notification System
   ============================================================ */

window.Toast = (() => {
  function show(type, title, message, duration = 8000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
      error:   '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>',
      warning: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>',
      info:    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
    if (duration > 0) setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, duration);
    return toast;
  }

  return {
    success: (title, msg, d) => show('success', title, msg, d),
    error:   (title, msg, d) => show('error', title, msg, d),
    warning: (title, msg, d) => show('warning', title, msg, d),
    info:    (title, msg, d) => show('info', title, msg, d),
  };
})();

// ---- UI Confirm Modal ----
window.uiConfirm = function(msg, callback) {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);backdrop-filter:blur(2px);z-index:999999;display:flex;justify-content:center;align-items:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-card, #fff);padding:24px;border-radius:12px;width:90%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.5);text-align:center;border:1px solid var(--border-default, #ccc);';
    box.innerHTML = `
      <h3 style="margin-top:0;margin-bottom:12px;font-size:18px;color:var(--text-primary, #111);">Confirmação</h3>
      <p style="margin-bottom:24px;font-size:14px;color:var(--text-secondary, #555);">${msg}</p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-secondary" id="ui-confirm-cancel" style="flex:1;">Cancelar</button>
        <button class="btn btn-primary" id="ui-confirm-ok" style="flex:1;">Confirmar</button>
      </div>
    `;
    d.appendChild(box);
    document.body.appendChild(d);

    const finish = (result) => {
      d.remove();
      if (callback) callback(result);
      resolve(result);
    };

    box.querySelector('#ui-confirm-cancel').onclick = () => finish(false);
    box.querySelector('#ui-confirm-ok').onclick = () => finish(true);
  });
};

window.uiPromptAsync = function(title, msg, placeholder = '') {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);backdrop-filter:blur(2px);z-index:999999;display:flex;justify-content:center;align-items:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-card, #fff);padding:24px;border-radius:12px;width:90%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.5);text-align:left;border:1px solid var(--border-default, #ccc);';
    box.innerHTML = `
      <h3 style="margin-top:0;margin-bottom:12px;font-size:18px;color:var(--text-primary, #111);">${title}</h3>
      <p style="margin-bottom:16px;font-size:14px;color:var(--text-secondary, #555);">${msg}</p>
      <input type="text" id="ui-prompt-input" placeholder="${placeholder}" style="width:100%;padding:10px;margin-bottom:24px;border:1px solid var(--border-default);border-radius:6px;font-size:14px;box-sizing:border-box;" />
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button class="btn btn-secondary" id="ui-prompt-cancel">Cancelar</button>
        <button class="btn btn-primary" id="ui-prompt-ok">Confirmar</button>
      </div>
    `;
    d.appendChild(box);
    document.body.appendChild(d);

    const input = box.querySelector('#ui-prompt-input');
    input.focus();

    const finish = (result) => {
      d.remove();
      resolve(result);
    };

    box.querySelector('#ui-prompt-cancel').onclick = () => finish(null);
    box.querySelector('#ui-prompt-ok').onclick = () => finish(input.value);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(input.value);
      if (e.key === 'Escape') finish(null);
    });
  });
};

window.confirmAsync = function(title, msg, isDestructive = false) {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);backdrop-filter:blur(2px);z-index:999999;display:flex;justify-content:center;align-items:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-card, #fff);padding:24px;border-radius:12px;width:90%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.5);text-align:center;border:1px solid var(--border-default, #ccc);';
    box.innerHTML = `
      <h3 style="margin-top:0;margin-bottom:12px;font-size:18px;color:var(--text-primary, #111);">${title}</h3>
      <p style="margin-bottom:24px;font-size:14px;color:var(--text-secondary, #555);">${msg}</p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-secondary" id="ui-confirm-cancel" style="flex:1;">Cancelar</button>
        <button class="btn ${isDestructive ? 'btn-danger' : 'btn-primary'}" id="ui-confirm-ok" style="flex:1;">Confirmar</button>
      </div>
    `;
    d.appendChild(box);
    document.body.appendChild(d);

    const finish = (result) => {
      d.remove();
      resolve(result);
    };

    box.querySelector('#ui-confirm-cancel').onclick = () => finish(false);
    box.querySelector('#ui-confirm-ok').onclick = () => finish(true);
  });
};

// ---- Notification Panel ----
const NotifPanel = (() => {
  let open = false;

  function updateBadge() {
    const count = DB.notifications.unreadCount();
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = count > 0 ? 'flex' : 'none'; }
  }

  function renderPanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const items = DB.notifications.list().slice(0, 50);

    const typeIcon = t => ({
      warning: '⚠️', danger: '🔴', success: '✅', info: 'ℹ️'
    })[t] || 'ℹ️';

    const typeClass = t => ({
      warning: 'warning', danger: 'danger', success: 'success', info: 'info'
    })[t] || 'info';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--border-card);">
        <span style="font-weight:var(--font-bold);font-size:var(--text-sm);color:var(--text-primary)">Notificações</span>
        <button onclick="NotifPanel.markAll()" class="btn btn-ghost btn-sm">Marcar todas como lidas</button>
      </div>
      <div style="overflow-y:auto;max-height:420px;">
        ${items.length === 0 ? `<div class="empty-state" style="padding:var(--space-8)"><p>Nenhuma notificação</p></div>` :
        items.map(n => `
          <div onclick="NotifPanel.markRead('${n.id}')" style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-card);cursor:pointer;background:${n.read ? 'transparent' : 'var(--bg-card-hover)'};transition:background 0.15s;">
            <span style="font-size:18px;flex-shrink:0;">${typeIcon(n.type)}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--text-primary)">${n.title}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">${n.message || ''}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px;font-family:var(--font-mono)">${formatDateTime(n.createdAt)}</div>
            </div>
            ${!n.read ? `<span class="ping-dot"><span></span><span></span></span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function toggle() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    open = !open;
    panel.classList.toggle('open', open);
    if (open) renderPanel();
    if (open) { setTimeout(() => { document.addEventListener('click', closeOnOutside); }, 50); }
    else { document.removeEventListener('click', closeOnOutside); }
  }

  function closeOnOutside(e) {
    const panel = document.getElementById('notif-panel');
    const btn   = document.getElementById('notif-btn');
    if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) { open = false; panel.classList.remove('open'); document.removeEventListener('click', closeOnOutside); }
  }

  function markRead(id) { DB.notifications.markRead(id); updateBadge(); renderPanel(); }
  function markAll() { DB.notifications.markAllRead(); updateBadge(); renderPanel(); }

  events.on('notification:new', () => { updateBadge(); if (open) renderPanel(); });
  events.on('notification:allRead', () => { updateBadge(); });

  return { toggle, updateBadge, renderPanel, markRead, markAll };
})();

// ---- Confirm Dialog ----
function confirmDialog(title, message, onConfirm, danger = true) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-body" style="text-align:center;padding:var(--space-8)">
        <div style="width:64px;height:64px;border-radius:50%;background:${danger ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)'};display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="${danger ? 'var(--color-danger)' : 'var(--color-warning)'}" style="width:28px;height:28px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>
        <h3 style="margin-bottom:var(--space-2)">${title}</h3>
        <p style="font-size:var(--text-sm)">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="dlg-cancel">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="dlg-confirm">${danger ? 'Excluir' : 'Confirmar'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { requestAnimationFrame(() => overlay.classList.add('open')); });
  overlay.querySelector('#dlg-cancel').onclick = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300); };
  overlay.querySelector('#dlg-confirm').onclick = () => { onConfirm(); overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300); };
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300); } });
}

// ---- Modal helpers ----
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  el.addEventListener('click', function handler(e) {
    if (e.target === el) closeModal(id);
  });
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

// ---- Date formatting helpers ----
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('pt-BR');
}
function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}
function toDateInput(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}
function daysBetween(a, b) {
  if (!a || !b) return 0;
  const diff = new Date(b) - new Date(a);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
function addDays(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function avatarInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}
function statusBadge(status) {
  if (!status) return '';
  const map = {
    'Não Iniciada':        'badge-ghost',
    'Em Andamento':        'badge-primary',
    'Aguardando Peça':     'badge-warning',
    'Aguardando Recurso':  'badge-warning',
    'Aguardando Aprovação':'badge-warning',
    'Bloqueada':           'badge-danger',
    'Concluída':           'badge-success',
    'Em Manutenção':       'badge-primary',
    'Aguardando Manutenção': 'badge-warning',
    'Liberado':            'badge-success',
    'Bloqueado':           'badge-danger',
    'Cancelado':           'badge-ghost',
    'Paralisado':          'badge-danger',
    'Falta de Peças':      'badge-warning',
    'Solicitada':          'badge-ghost',
    'Comprada':            'badge-info',
    'Em Transporte':       'badge-warning',
    'Recebida':            'badge-success',
    'Instalada':           'badge-success',
    'Aberta':              'badge-danger',
    'Fechada':             'badge-success',
    'Ativo':               'badge-success',
    'Inativo':             'badge-ghost',
  };
  const cls = map[status] || 'badge-ghost';
  return `<span class="badge ${cls}">${status}</span>`;
}
function priorityBadge(priority) {
  const map = { 'Alta': 'badge-danger', 'Média': 'badge-warning', 'Baixa': 'badge-ghost', 'Crítica': 'badge-danger' };
  return `<span class="badge ${map[priority] || 'badge-ghost'}">${priority}</span>`;
}

// ---- Audio Notifications ----
window.AudioNotification = (() => {
  function playBeep(type) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'new_service') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'done') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.0);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.0);
      }
    } catch(e) { console.error('Audio api error', e); }
  }

  function showModal(title, msg, type) {
    playBeep(type);
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:9999999;display:flex;justify-content:center;align-items:center;animation:fadeIn 0.3s ease;';
    
    const icon = type === 'new_service' 
      ? '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:64px;height:64px;color:var(--brand-primary);margin-bottom:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>'
      : '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:64px;height:64px;color:var(--color-success);margin-bottom:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-card, #fff);padding:40px;border-radius:16px;width:90%;max-width:500px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);text-align:center;border:1px solid var(--border-default, #ccc);transform:scale(0.9);animation:popIn 0.3s ease forwards;';
    
    box.innerHTML = `
      ${icon}
      <h2 style="margin-top:0;margin-bottom:16px;font-size:24px;font-weight:800;color:var(--text-primary, #111);">${title}</h2>
      <p style="margin-bottom:32px;font-size:16px;color:var(--text-secondary, #555);line-height:1.5;">${msg}</p>
      <button class="btn btn-primary" id="audio-modal-close" style="width:100%;height:48px;font-size:16px;font-weight:700;">Fechar Aviso</button>
    `;
    d.appendChild(box);
    document.body.appendChild(d);

    box.querySelector('#audio-modal-close').onclick = () => d.remove();
  }

  return {
    notifyNewService: (title, msg) => showModal(title, msg, 'new_service'),
    notifyDone: (title, msg) => showModal(title, msg, 'done')
  };
})();

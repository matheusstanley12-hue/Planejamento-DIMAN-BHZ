/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Core: Toast & Notification System
   ============================================================ */

window.Toast = (() => {
  function show(type, title, message, duration = 4000) {
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

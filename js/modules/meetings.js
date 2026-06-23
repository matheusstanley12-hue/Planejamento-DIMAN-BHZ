/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Ata de Reunião
   ============================================================ */

window.MeetingsModule = (() => {
  let selectedMeetingDate = '';

  function getMeetingDates() {
    const startDate = new Date(2026, 5, 9); // 09/06/2026
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Up to ~4 weeks ahead
    const dates = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 7);
    }
    // ensure we add the current week's tuesday if not present? The loop should cover it.
    return dates.sort((a, b) => b - a); // descending
  }

  function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatDisplayDate(dStr) {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function getInitialMeetingDate() {
    const dates = getMeetingDates();
    const todayStr = formatDate(new Date());
    // Find the closest tuesday that is <= today
    const pastDates = dates.filter(d => formatDate(d) <= todayStr);
    if (pastDates.length > 0) return formatDate(pastDates[0]);
    return formatDate(dates[dates.length - 1]); // fallback to the oldest if all are in future
  }

  function render() {
    if (!selectedMeetingDate) selectedMeetingDate = getInitialMeetingDate();
    const dates = getMeetingDates();
    
    // Workforce for dropdown
    const wf = DB.workforce.list().sort((a,b) => a.nome.localeCompare(b.nome));

    return `
      <div class="page-container">
        <header class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div class="page-title">
            <h2>Ata de Reunião</h2>
            <p>Gerenciamento de Tarefas e Deliberações</p>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <select id="meeting-date-select" class="form-control" style="width:auto; font-weight:bold;" onchange="MeetingsModule.onDateChange()">
              ${dates.map(d => {
                const f = formatDate(d);
                return `<option value="${f}" ${f === selectedMeetingDate ? 'selected' : ''}>Reunião: ${formatDisplayDate(f)}</option>`;
              }).join('')}
            </select>
            <button class="btn btn-secondary" onclick="MeetingsModule.downloadPDF()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px; height:16px; margin-right:6px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Baixar PDF
            </button>
            <button class="btn btn-primary" onclick="MeetingsModule.openNewTaskModal()">+ Nova Tarefa</button>
          </div>
        </header>

        <div class="content-panel" style="margin-top:20px;">
          <div id="meetings-tbody">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>

      <!-- Nova Tarefa Modal -->
      <div id="meeting-task-modal" class="modal-overlay">
        <div class="modal" style="max-width: 600px; box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Nova Tarefa de Reunião</div>
            <button class="modal-close" onclick="MeetingsModule.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Descrição da Tarefa *</label>
              <textarea id="mt-desc" class="form-control" rows="3" required></textarea>
            </div>
            <div style="display:flex; gap:15px;">
              <div class="form-group" style="flex:1;">
                <label>Responsável</label>
                <input type="text" id="mt-resp" class="form-control" placeholder="Ex: Engenharia" />
              </div>
              <div class="form-group" style="flex:1;">
                <label>Data para Concluir</label>
                <input type="date" id="mt-due" class="form-control" />
              </div>
            </div>
            <div style="display:flex; gap:15px;">
              <div class="form-group" style="flex:1;">
                <label>Prioridade</label>
                <select id="mt-prio" class="form-control">
                  <option value="Urgente">Urgente</option>
                  <option value="Alta">Alta</option>
                  <option value="Média" selected>Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Comentários</label>
              <textarea id="mt-comments" class="form-control" rows="2"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="MeetingsModule.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="MeetingsModule.saveTask()">Salvar Tarefa</button>
          </div>
        </div>
      </div>
    `;
  }

  function getPriorityColor(p) {
    if (p === 'Urgente') return 'var(--danger)';
    if (p === 'Alta') return 'var(--warning)';
    if (p === 'Média') return 'var(--info)';
    if (p === 'Baixa') return 'var(--text-muted)';
    return 'var(--text-primary)';
  }

  function renderTable() {
    const tbody = document.getElementById('meetings-tbody');
    if (!tbody) return;

    let tasks = DB.meetingTasks.list().filter(t => t.meetingDate === selectedMeetingDate);
    // Sort: Pending first, then by urgency
    const prioWeight = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
    tasks.sort((a,b) => {
      if (a.status !== b.status) return a.status === 'Pendente' ? -1 : 1;
      return prioWeight[b.priority] - prioWeight[a.priority];
    });

    if (tasks.length === 0) {
      tbody.innerHTML = `
        <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-xl);">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;margin:0 auto var(--space-4);color:var(--text-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"/></svg>
          <h3 style="font-weight:600;color:var(--text-primary);margin-bottom:var(--space-2);">Nenhuma tarefa registrada</h3>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);">Clique em "Nova Tarefa" para adicionar deliberações desta reunião.</p>
        </div>
      `;
      return;
    }

    tbody.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--space-4);">
        ${tasks.map(t => {
          const isDone = t.status === 'Concluída';
          const completedStr = t.completedAt ? formatDisplayDate(t.completedAt.split('T')[0]) : '';
          return `
            <div class="card" style="padding:var(--space-4);display:flex;flex-direction:column;background:var(--bg-base);border:1px solid var(--border-card);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);${isDone ? 'opacity:0.7;' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-3);">
                <div style="display:flex;gap:var(--space-2);">
                  <span class="badge ${isDone ? 'badge-success' : 'badge-warning'}">${t.status}</span>
                  <span class="badge" style="background:transparent;border:1px solid ${getPriorityColor(t.priority)};color:${getPriorityColor(t.priority)};">${t.priority}</span>
                </div>
                ${isDone ? `<span style="font-size:var(--text-xs);color:var(--success);font-weight:600;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;display:inline;vertical-align:text-bottom;"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" /></svg> ${completedStr}</span>` : ''}
              </div>
              
              <h3 style="font-weight:600;color:var(--text-primary);font-size:var(--text-base);margin-bottom:var(--space-3);line-height:1.4;${isDone ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${t.description}</h3>
              
              <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary);">
                <div style="display:flex;align-items:center;gap:var(--space-2);">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  <span><strong>Responsável:</strong> ${t.responsible}</span>
                </div>
                <div style="display:flex;align-items:center;gap:var(--space-2);">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
                  <span style="${!isDone && window.daysBetween(new Date().toISOString().slice(0,10), t.dueDate) < 0 ? 'color:var(--color-danger);font-weight:bold;' : ''}"><strong>Prazo:</strong> ${formatDisplayDate(t.dueDate)}</span>
                </div>
                ${t.comments ? `
                <div style="display:flex;align-items:flex-start;gap:var(--space-2);background:rgba(0,0,0,0.03);padding:var(--space-2);border-radius:var(--radius-sm);margin-top:var(--space-1);">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px;flex-shrink:0;margin-top:2px;"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                  <span style="font-style:italic;">${t.comments}</span>
                </div>
                ` : ''}
              </div>
              
              <div style="margin-top:auto;display:flex;gap:var(--space-2);">
                ${!isDone ? `<button class="btn btn-primary" style="flex:1;display:flex;justify-content:center;gap:6px;" onclick="MeetingsModule.completeTask('${t.id}')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> Concluir</button>` : `<div style="flex:1;"></div>`}
                <button class="btn btn-ghost" style="color:var(--color-danger);padding:0 var(--space-3);" onclick="MeetingsModule.deleteTask('${t.id}')" title="Excluir Tarefa">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function init() {
    renderTable();
  }

  function onDateChange() {
    selectedMeetingDate = document.getElementById('meeting-date-select').value;
    renderTable();
  }

  function openNewTaskModal() {
    document.getElementById('mt-desc').value = '';
    document.getElementById('mt-resp').value = '';
    document.getElementById('mt-due').value = '';
    document.getElementById('mt-prio').value = 'Média';
    document.getElementById('mt-comments').value = '';
    document.getElementById('meeting-task-modal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('meeting-task-modal').classList.remove('open');
  }

  function saveTask() {
    const desc = document.getElementById('mt-desc').value.trim();
    const resp = document.getElementById('mt-resp').value;
    const due = document.getElementById('mt-due').value;
    const prio = document.getElementById('mt-prio').value;
    const comments = document.getElementById('mt-comments').value.trim();

    if (!desc) {
      if (window.Toast) window.Toast.error('Atenção', 'A Descrição da tarefa é obrigatória.');
      else alert('A Descrição da tarefa é obrigatória.');
      return;
    }

    const session = Auth.getSession();
    DB.meetingTasks.add({
      id: 'mt-' + Date.now(),
      meetingDate: selectedMeetingDate,
      description: desc,
      responsible: resp,
      dueDate: due,
      priority: prio,
      comments: comments,
      status: 'Pendente',
      createdBy: session ? session.nome : 'Desconhecido',
      createdAt: DB.now()
    });

    closeModal();
    renderTable();
  }

  function completeTask(id) {
    window.uiConfirm('Marcar esta tarefa como concluída?', (res) => {
      if (!res) return;
      DB.meetingTasks.update(id, { status: 'Concluída', completedAt: DB.now() });
      renderTable();
    });
  }

  function deleteTask(id) {
    window.uiConfirm('Tem certeza que deseja excluir esta tarefa?', (res) => {
      if (!res) return;
      DB.meetingTasks.delete(id);
      renderTable();
    });
  }

  function downloadPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('Biblioteca de PDF não carregada. Verifique sua conexão.');
      return;
    }
    const doc = new window.jspdf.jsPDF();
    const meetingDisplay = formatDisplayDate(selectedMeetingDate);
    
    doc.setFontSize(16);
    doc.text(`Ata de Reunião - ${meetingDisplay}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${formatDisplayDate(formatDate(new Date()))}`, 14, 28);
    
    const tasks = DB.meetingTasks.list().filter(t => t.meetingDate === selectedMeetingDate);
    const prioWeight = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
    tasks.sort((a,b) => {
      if (a.status !== b.status) return a.status === 'Pendente' ? -1 : 1;
      return prioWeight[b.priority] - prioWeight[a.priority];
    });

    const rows = tasks.map(t => [
      t.status,
      t.priority,
      t.description,
      t.responsible,
      formatDisplayDate(t.dueDate),
      t.comments || ''
    ]);

    doc.autoTable({
      startY: 35,
      head: [['Status', 'Prioridade', 'Descrição', 'Responsável', 'Prazo', 'Comentários']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 30, 60] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 0) {
          if (data.cell.raw === 'Concluída') data.cell.styles.textColor = [0, 128, 0];
          else data.cell.styles.textColor = [200, 100, 0];
        }
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'Urgente') data.cell.styles.textColor = [220, 53, 69];
          else if (data.cell.raw === 'Alta') data.cell.styles.textColor = [253, 126, 20];
          else if (data.cell.raw === 'Média') data.cell.styles.textColor = [13, 110, 253];
        }
      }
    });

    doc.save(`Ata_Reuniao_${selectedMeetingDate}.pdf`);
  }

  // To be called after Router renders the html
  const originalRender = render;
  function renderWithInit() {
    const html = originalRender();
    setTimeout(init, 50);
    return html;
  }

  return { render: renderWithInit, onDateChange, openNewTaskModal, closeModal, saveTask, completeTask, deleteTask, downloadPDF };
})();

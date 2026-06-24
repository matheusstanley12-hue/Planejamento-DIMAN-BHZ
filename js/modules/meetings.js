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
            ${(Auth.getSession() && ['Planejador', 'Administrador'].includes(Auth.getSession().perfil)) ? `<button class="btn btn-primary" onclick="MeetingsModule.openNewTaskModal()">+ Nova Tarefa</button>` : ''}
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

    const session = Auth.getSession();
    const isManager = session && ['Planejador', 'Administrador'].includes(session.perfil);

    tbody.innerHTML = `
      <div class="table-responsive" style="background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-lg);overflow-x:auto;">
        <table class="table" style="width:100%; border-collapse:collapse; text-align:left; min-width:800px;">
          <thead style="background:var(--bg-base); border-bottom:1px solid var(--border-card);">
            <tr>
              <th style="padding:var(--space-3); color:var(--text-secondary); font-weight:600; font-size:var(--text-sm); width:15%;">Status / Prioridade</th>
              <th style="padding:var(--space-3); color:var(--text-secondary); font-weight:600; font-size:var(--text-sm); width:40%;">Descrição / Comentários</th>
              <th style="padding:var(--space-3); color:var(--text-secondary); font-weight:600; font-size:var(--text-sm); width:15%;">Responsável</th>
              <th style="padding:var(--space-3); color:var(--text-secondary); font-weight:600; font-size:var(--text-sm); width:15%;">Prazo / Conclusão</th>
              <th style="padding:var(--space-3); color:var(--text-secondary); font-weight:600; font-size:var(--text-sm); width:15%; text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map(t => {
              const isDone = t.status === 'Concluída';
              const completedStr = t.completedAt ? formatDisplayDate(t.completedAt.split('T')[0]) : '';
              const overdue = !isDone && window.daysBetween(new Date().toISOString().slice(0,10), t.dueDate) < 0;
              
              let actionsHtml = '';
              if (isManager) {
                actionsHtml += `<button class="btn btn-ghost" style="padding:4px 8px;" onclick="MeetingsModule.openNewTaskModal('${t.id}')" title="Editar">Editar</button>`;
                actionsHtml += `<button class="btn btn-ghost" style="color:var(--color-danger); padding:4px 8px;" onclick="MeetingsModule.deleteTask('${t.id}')" title="Excluir">Excluir</button>`;
              }
              if (!isDone) {
                if (t.status === 'Pendente') {
                  actionsHtml += `<button class="btn btn-info" style="padding:4px 8px; font-size:12px;" onclick="MeetingsModule.acceptTask('${t.id}')">Aceitar</button>`;
                }
                actionsHtml += `<button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="MeetingsModule.changeDateTask('${t.id}')">Data</button>`;
                actionsHtml += `<button class="btn btn-success" style="padding:4px 8px; font-size:12px;" onclick="MeetingsModule.completeTask('${t.id}')">Concluir</button>`;
              }

              return `
                <tr style="border-bottom:1px solid var(--border-card); ${isDone ? 'opacity:0.7; background:rgba(0,0,0,0.02);' : ''}">
                  <td style="padding:var(--space-3); vertical-align:top;">
                    <div style="display:flex; flex-direction:column; gap:var(--space-2); align-items:flex-start;">
                      <span class="badge ${isDone ? 'badge-success' : (t.status === 'Aceita' ? 'badge-primary' : 'badge-warning')}">${t.status}</span>
                      <span class="badge" style="background:transparent;border:1px solid ${getPriorityColor(t.priority)};color:${getPriorityColor(t.priority)};">${t.priority}</span>
                    </div>
                  </td>
                  <td style="padding:var(--space-3); vertical-align:top;">
                    <div style="font-weight:600;color:var(--text-primary);font-size:var(--text-base);line-height:1.4;${isDone ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${t.description}</div>
                    ${t.comments ? `
                      <div style="display:flex;align-items:flex-start;gap:var(--space-2);background:rgba(0,0,0,0.03);padding:var(--space-2);border-radius:var(--radius-sm);margin-top:var(--space-2); font-size:var(--text-sm); color:var(--text-secondary);">
                        <span style="font-style:italic;">${t.comments}</span>
                      </div>
                    ` : ''}
                  </td>
                  <td style="padding:var(--space-3); vertical-align:top; font-size:var(--text-sm); color:var(--text-secondary);">
                    <strong>${t.responsible}</strong>
                  </td>
                  <td style="padding:var(--space-3); vertical-align:top; font-size:var(--text-sm); color:var(--text-secondary);">
                    <div style="${overdue ? 'color:var(--color-danger);font-weight:bold;' : ''}">Prazo: ${formatDisplayDate(t.dueDate)}</div>
                    ${isDone ? `<div style="color:var(--success); font-weight:600; margin-top:4px;">Concluída: ${completedStr}</div>` : ''}
                  </td>
                  <td style="padding:var(--space-3); vertical-align:top; text-align:center;">
                    <div style="display:flex; justify-content:center; gap:var(--space-2); flex-wrap:wrap;">
                      ${actionsHtml}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
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

  let editingTaskId = null;

  function openNewTaskModal(id = null) {
    if (typeof id === 'string') {
      editingTaskId = id;
      const t = DB.meetingTasks.list().find(x => x.id === id);
      if (t) {
        document.getElementById('mt-desc').value = t.description || '';
        document.getElementById('mt-resp').value = t.responsible || '';
        document.getElementById('mt-due').value = t.dueDate || '';
        document.getElementById('mt-prio').value = t.priority || 'Média';
        document.getElementById('mt-comments').value = t.comments || '';
        document.querySelector('#meeting-task-modal .modal-title').innerText = 'Editar Tarefa de Reunião';
      }
    } else {
      editingTaskId = null;
      document.getElementById('mt-desc').value = '';
      document.getElementById('mt-resp').value = '';
      document.getElementById('mt-due').value = '';
      document.getElementById('mt-prio').value = 'Média';
      document.getElementById('mt-comments').value = '';
      document.querySelector('#meeting-task-modal .modal-title').innerText = 'Nova Tarefa de Reunião';
    }
    document.getElementById('meeting-task-modal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('meeting-task-modal').classList.remove('open');
    editingTaskId = null;
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
    if (editingTaskId) {
      DB.meetingTasks.update(editingTaskId, {
        description: desc,
        responsible: resp,
        dueDate: due,
        priority: prio,
        comments: comments
      });
      if (window.Toast) window.Toast.success('Salvo', 'Tarefa editada com sucesso.');
    } else {
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
      if (window.Toast) window.Toast.success('Criado', 'Tarefa criada com sucesso.');
    }

    closeModal();
    renderTable();
  }

  function acceptTask(id) {
    DB.meetingTasks.update(id, { status: 'Aceita' });
    if (window.Toast) window.Toast.success('Aceita', 'Tarefa aceita com sucesso.');
    renderTable();
  }

  function changeDateTask(id) {
    const newDate = prompt('Digite a nova data para conclusão (AAAA-MM-DD):');
    if (!newDate) return;
    DB.meetingTasks.update(id, { dueDate: newDate });
    if (window.Toast) window.Toast.success('Data Alterada', 'Nova data salva com sucesso.');
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

  return { render: renderWithInit,
    onDateChange,
    openNewTaskModal,
    closeModal,
    saveTask,
    completeTask,
    deleteTask,
    acceptTask,
    changeDateTask,
    downloadPDF
  };
})();

/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Ata de Reunião
   ============================================================ */

window.MeetingsModule = (() => {
  let selectedMeetingDate = '';

  function getMeetingDates() {
    const startDate = new Date(2026, 5, 16); // 16/06/2026
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
          <div class="table-responsive">
            <table class="data-table" id="meetings-table">
              <thead>
                <tr>
                  <th style="width:80px">Status</th>
                  <th style="width:100px">Prioridade</th>
                  <th>Descrição da Tarefa</th>
                  <th style="width:180px">Responsável</th>
                  <th style="width:120px">Prazo</th>
                  <th>Comentários</th>
                  <th style="width:120px">Ações</th>
                </tr>
              </thead>
              <tbody id="meetings-tbody">
                <!-- Rendered by JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Nova Tarefa Modal -->
      <div id="meeting-task-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3>Nova Tarefa de Reunião</h3>
            <button class="close-btn" onclick="MeetingsModule.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Descrição da Tarefa *</label>
              <textarea id="mt-desc" class="form-control" rows="3" required></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Responsável *</label>
                <select id="mt-resp" class="form-control" required>
                  <option value="">Selecione...</option>
                  ${wf.map(w => `<option value="${w.nome}">${w.nome}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Data para Concluir *</label>
                <input type="date" id="mt-due" class="form-control" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Prioridade *</label>
                <select id="mt-prio" class="form-control" required>
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
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhuma tarefa registrada para a ata desta reunião.</td></tr>`;
      return;
    }

    tbody.innerHTML = tasks.map(t => {
      const isDone = t.status === 'Concluída';
      // Fallback for optional chaining missing in older Androids:
      const completedStr = t.completedAt ? formatDisplayDate(t.completedAt.split('T')[0]) : '';
      return `
        <tr style="${isDone ? 'opacity:0.6;' : ''}">
          <td>
            <span class="badge ${isDone ? 'badge-success' : 'badge-warning'}">${t.status}</span>
          </td>
          <td>
            <span style="color:${getPriorityColor(t.priority)}; font-weight:bold;">${t.priority}</span>
          </td>
          <td style="${isDone ? 'text-decoration:line-through;' : ''}">${t.description}</td>
          <td>${t.responsible}</td>
          <td>${formatDisplayDate(t.dueDate)}</td>
          <td style="font-size:12px; color:var(--text-muted);">${t.comments || '-'}</td>
          <td>
            ${!isDone ? `<button class="btn btn-sm btn-primary" onclick="MeetingsModule.completeTask('${t.id}')">Concluir</button>` : `<span style="font-size:12px;color:var(--success);">${completedStr}</span>`}
            <button class="btn btn-sm btn-danger" style="margin-left:4px; padding:4px 8px;" onclick="MeetingsModule.deleteTask('${t.id}')" title="Excluir">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px; height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
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
    document.getElementById('meeting-task-modal').classList.add('visible');
  }

  function closeModal() {
    document.getElementById('meeting-task-modal').classList.remove('visible');
  }

  function saveTask() {
    const desc = document.getElementById('mt-desc').value.trim();
    const resp = document.getElementById('mt-resp').value;
    const due = document.getElementById('mt-due').value;
    const prio = document.getElementById('mt-prio').value;
    const comments = document.getElementById('mt-comments').value.trim();

    if (!desc || !resp || !due || !prio) {
      alert('Preencha os campos obrigatórios (Descrição, Responsável, Prazo, Prioridade).');
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
    if (confirm('Marcar esta tarefa como concluída?')) {
      DB.meetingTasks.update(id, { status: 'Concluída', completedAt: DB.now() });
      renderTable();
    }
  }

  function deleteTask(id) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      DB.meetingTasks.delete(id);
      renderTable();
    }
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

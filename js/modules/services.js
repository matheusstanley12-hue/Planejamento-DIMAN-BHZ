/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Services (Solicitações de Serviço)
   ============================================================ */

window.ServicesModule = (() => {
  let activeTab = 'pendentes';

  function render() {
    const session = Auth.getSession();
    const isPCM = ['Desenvolvedor', 'Administrador', 'Planejador', 'Gerente'].includes(session.perfil);
    const isEncarregado = ['Supervisor', 'Encarregado'].includes(session.perfil);
    
    if (!isPCM && !isEncarregado) {
      return `<div class="empty-state"><h3>Acesso Restrito</h3><p>Apenas PCM e Encarregados podem gerenciar solicitações.</p></div>`;
    }

    const solicitacoes = window.DB.solicitacoes ? window.DB.solicitacoes.list() : [];
    
    // Filter logic
    let mySols = [];
    if (isPCM) {
      // PCM sees Usinagem needing approval, plus everything else for oversight
      mySols = solicitacoes.filter(s => s.destino === 'Usinagem');
    } else if (isEncarregado) {
      // Encarregado sees their sector
      mySols = solicitacoes.filter(s => s.destino === session.disciplina);
    }

    const pendentes = mySols.filter(s => s.status === 'Aguardando Aprovação PCM' || s.status === 'Aguardando Encarregado');
    const andamento = mySols.filter(s => s.status === 'Em Execução' || s.status === 'Em Andamento');
    const concluidas = mySols.filter(s => s.status === 'Concluída' || s.status === 'Rejeitada');

    let currentList = activeTab === 'pendentes' ? pendentes : activeTab === 'andamento' ? andamento : concluidas;

    const pageTitle = isPCM ? 'Serviços de Usinagem' : 'Serviços / Mão de Obra';
    const pageSubtitle = isPCM ? 'Aprovações de OS de Usinagem' : 'Destinação de Mão de Obra';

    const html = `
      <div class="page-container">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
          <div>
            <h1 class="page-title">${pageTitle}</h1>
            <p class="page-subtitle">${pageSubtitle}</p>
          </div>
        </div>

        <div class="tabs" style="margin-bottom:var(--space-4);">
          <button class="tab ${activeTab === 'pendentes' ? 'active' : ''}" onclick="window.ServicesModule.setTab('pendentes')">
            Pendentes (${pendentes.length})
          </button>
          <button class="tab ${activeTab === 'andamento' ? 'active' : ''}" onclick="window.ServicesModule.setTab('andamento')">
            Em Andamento (${andamento.length})
          </button>
          <button class="tab ${activeTab === 'concluidas' ? 'active' : ''}" onclick="window.ServicesModule.setTab('concluidas')">
            Histórico (${concluidas.length})
          </button>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Equipamento</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Descrição</th>
                <th>Status</th>
                <th style="text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${currentList.length === 0 ? `<tr><td colspan="7" class="text-center" style="padding:var(--space-6);color:var(--text-muted);">Nenhuma solicitação encontrada nesta aba.</td></tr>` : ''}
              ${currentList.map(s => {
                const eq = DB.equipment.get(s.equipmentId);
                
                let actions = '';
                if (s.status === 'Aguardando Aprovação PCM' && isPCM) {
                  actions = `
                    <button class="btn btn-success btn-xs" onclick="window.ServicesModule.approvePCM('${s.id}')">Aprovar OS</button>
                    <button class="btn btn-danger btn-xs" onclick="window.ServicesModule.reject('${s.id}')">Rejeitar</button>
                  `;
                } else if (s.status === 'Aguardando Encarregado' && isEncarregado) {
                  actions = `
                    <button class="btn btn-primary btn-xs" onclick="window.ServicesModule.assignWorker('${s.id}')">Destinar Mão de Obra</button>
                  `;
                } else if ((s.status === 'Em Execução' || s.status === 'Em Andamento') && isEncarregado) {
                   actions = `
                    <button class="btn btn-outline btn-xs" onclick="window.ServicesModule.assignWorker('${s.id}')">Alterar Recurso</button>
                  `;
                }

                return `
                  <tr>
                    <td>${new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td><strong>${eq ? eq.codigo : '—'}</strong></td>
                    <td>${s.origem || '—'}</td>
                    <td><span class="badge badge-ghost">${s.destino || '—'}</span></td>
                    <td>
                      ${s.descricao}
                    </td>
                    <td>
                      <span class="badge ${s.status.includes('PCM') ? 'badge-warning' : s.status.includes('Aguardando') ? 'badge-primary' : s.status.includes('Execução') || s.status.includes('Andamento') ? 'badge-info' : s.status === 'Concluída' ? 'badge-success' : 'badge-danger'}">
                        ${s.status}
                      </span>
                    </td>
                    <td style="text-align:right;display:flex;gap:4px;justify-content:flex-end;">
                      ${actions}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div id="services-modals"></div>
    `;
    return html;
  }

  function setTab(tab) {
    activeTab = tab;
    Router.navigate('services', { force: true });
  }

  function approvePCM(id) {
    const osNumber = prompt('Digite o número da Ordem de Serviço (OS) para aprovar esta solicitação:');
    if (osNumber === null) return; // Cancelled
    if (osNumber.trim() === '') {
      Toast.error('Erro', 'O número da OS é obrigatório.');
      return;
    }
    
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;

    // Create task
    const taskData = {
      equipmentId: s.equipmentId,
      codigo: 'OS ' + osNumber.trim(),
      descricao: `[SOLICITAÇÃO] ${s.descricao}`,
      disciplina: s.destino,
      responsavel: '', // Empty until encarregado assigns
      prioridade: 'Alta',
      status: 'Aguardando Recurso',
      dataPlanejadaInicio: new Date().toISOString().slice(0, 10),
      dataPlanejadaTermino: new Date().toISOString().slice(0, 10),
      horasPlanejadas: 0,
      horasRealizadas: 0,
      pctExecutado: 0,
      critico: false,
      observacoes: '',
      predecessoras: [],
      solicitacaoId: s.id,
      createdAt: window.DB.now()
    };
    
    window.DB.tasks.create(taskData);
    
    const tasks = window.DB.tasks.getAll();
    const newTask = tasks[tasks.length - 1];

    window.DB.solicitacoes.update(id, { 
      status: 'Aguardando Encarregado', 
      pcmApprovadoAt: window.DB.now(),
      osId: newTask.id 
    });
    
    Toast.success('Aprovada', 'Ordem de Serviço gerada e enviada para o Encarregado.');
    Router.navigate('services', { force: true });
  }

  function reject(id) {
    const motivo = prompt('Motivo da rejeição:');
    if (motivo === null) return;
    
    window.DB.solicitacoes.update(id, { status: 'Rejeitada', observacoes: motivo });
    Toast.info('Rejeitada', 'Solicitação foi rejeitada.');
    Router.navigate('services', { force: true });
  }

  function assignWorker(id) {
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;

    // If task does not exist (non-usinagem direct flow)
    let taskId = s.osId;
    if (!taskId) {
      const taskData = {
        equipmentId: s.equipmentId,
        codigo: s.destino.substring(0,3).toUpperCase() + '-' + Math.random().toString().slice(2, 6),
        descricao: `[SOLICITAÇÃO] ${s.descricao}`,
        disciplina: s.destino,
        responsavel: '',
        prioridade: 'Alta',
        status: 'Aguardando Recurso',
        dataPlanejadaInicio: new Date().toISOString().slice(0, 10),
        dataPlanejadaTermino: new Date().toISOString().slice(0, 10),
        horasPlanejadas: 0,
        horasRealizadas: 0,
        pctExecutado: 0,
        critico: false,
        observacoes: '',
        predecessoras: [],
        solicitacaoId: s.id,
        createdAt: window.DB.now()
      };
      window.DB.tasks.create(taskData);
      const tasks = window.DB.tasks.getAll();
      taskId = tasks[tasks.length - 1].id;
      window.DB.solicitacoes.update(id, { osId: taskId });
    }

    const workers = window.DB.workforce.list().filter(w => w.disciplina === s.destino);
    
    const modalHtml = `
      <div class="modal-overlay" id="modal-assign">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">Destinar Mão de Obra</div>
            <button class="modal-close" onclick="closeModal('modal-assign')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom:12px;color:var(--text-secondary);font-size:13px;">Selecione o executante para a atividade: <strong>${s.descricao}</strong></p>
            <div class="form-group">
              <label>Executante (${s.destino})</label>
              <select id="sv-assign-worker">
                <option value="">-- Selecione --</option>
                ${workers.map(w => `<option value="${w.nome}">${w.nome}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-assign')">Cancelar</button>
            <button class="btn btn-primary" onclick="window.ServicesModule.saveAssign('${s.id}', '${taskId}')">Confirmar</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('services-modals').innerHTML = modalHtml;
    openModal('modal-assign');
  }

  function saveAssign(solId, taskId) {
    const workerName = document.getElementById('sv-assign-worker').value;
    if (!workerName) {
      Toast.error('Erro', 'Selecione um executante.');
      return;
    }

    // Update Task
    const task = window.DB.tasks.get(taskId);
    if (task) {
      window.DB.tasks.update(taskId, { responsavel: workerName, status: 'Em Andamento' });
    }

    // Update Solicitacao
    window.DB.solicitacoes.update(solId, { status: 'Em Execução' });

    Toast.success('Mão de Obra Destinada!', workerName + ' agora é o responsável pelo serviço.');
    closeModal('modal-assign');
    Router.navigate('services', { force: true });
  }

  return { render, setTab, approvePCM, reject, assignWorker, saveAssign };
})();

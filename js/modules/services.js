/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Services (Solicitações de Serviço)
   ============================================================ */

window.ServicesModule = (() => {
  let activeTab = 'pendentes';

  function render() {
    const session = Auth.getSession();
    const isPCM = session && ['Desenvolvedor', 'Administrador', 'Planejador', 'Gerente'].includes(session.perfil);
    const isEncarregado = session && ['Supervisor', 'Encarregado'].includes(session.perfil);
    
    if (!isPCM && !isEncarregado) {
      return `<div class="empty-state"><h3>Acesso Restrito</h3><p>Apenas PCM e Encarregados podem gerenciar solicitações.</p></div>`;
    }

    const solicitacoes = window.DB.solicitacoes ? window.DB.solicitacoes.list() : [];
    
    let mySols = solicitacoes;
    
    if (!isPCM && isEncarregado) {
      mySols = mySols.filter(s => {
        const dest = s.destino || s.setorDestino;
        if (dest !== session.disciplina) return false;
        if (session.disciplina === 'Usinagem' && s.status === 'Aguardando Aprovação PCM') return false;
        if (s.status === 'Rejeitada (Retorno PCM)') return false;
        return true;
      });
    }

    const pendentes = mySols.filter(s => s.status === 'Aguardando Aprovação PCM' || s.status === 'Aguardando Encarregado' || s.status === 'Rejeitada (Retorno PCM)');
    const andamento = mySols.filter(s => s.status === 'Em Execução' || s.status === 'Em Andamento');
    const concluidas = mySols.filter(s => s.status === 'Concluída' || s.status === 'Rejeitada');

    let currentList = activeTab === 'pendentes' ? pendentes : activeTab === 'andamento' ? andamento : concluidas;

    const pageTitle = 'Solicitação de Serviço';
    const pageSubtitle = isPCM ? 'Aprovações de OS de Usinagem' : 'Destinação de Mão de Obra';

    const html = `
      <div class="page-container">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
          <div>
            <h1 class="page-title">${pageTitle}</h1>
            <p class="page-subtitle">${pageSubtitle}</p>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-5);background:linear-gradient(135deg,rgba(21,101,192,0.08) 0%,var(--bg-card) 100%);border-color:var(--border-hover);">
          <div class="card-header"><div class="card-title">📊 Visão Geral: ${pageSubtitle}</div></div>
          <div style="display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap;padding-bottom:var(--space-2)">
            
            <div onclick="window.ServicesModule.setTab('pendentes')" class="hover-lift" style="cursor:pointer;flex:1;min-width:150px;text-align:center;padding:var(--space-4) var(--space-6);background:var(--bg-base);border-radius:var(--radius-lg);border:2px solid ${activeTab === 'pendentes' ? 'var(--brand-primary-light)' : 'transparent'};box-shadow:${activeTab === 'pendentes' ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none'};transition:all 0.2s;">
              <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-1)">Pendentes</div>
              <div style="font-size:3rem;font-weight:800;color:var(--color-warning);line-height:1">${pendentes.length}</div>
            </div>

            <div onclick="window.ServicesModule.setTab('andamento')" class="hover-lift" style="cursor:pointer;flex:1;min-width:150px;text-align:center;padding:var(--space-4) var(--space-6);background:var(--bg-base);border-radius:var(--radius-lg);border:2px solid ${activeTab === 'andamento' ? 'var(--brand-primary-light)' : 'transparent'};box-shadow:${activeTab === 'andamento' ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none'};transition:all 0.2s;">
              <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-1)">Em Andamento</div>
              <div style="font-size:3rem;font-weight:800;color:var(--brand-primary-light);line-height:1">${andamento.length}</div>
            </div>

            <div onclick="window.ServicesModule.setTab('concluidas')" class="hover-lift" style="cursor:pointer;flex:1;min-width:150px;text-align:center;padding:var(--space-4) var(--space-6);background:var(--bg-base);border-radius:var(--radius-lg);border:2px solid ${activeTab === 'concluidas' ? 'var(--brand-primary-light)' : 'transparent'};box-shadow:${activeTab === 'concluidas' ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none'};transition:all 0.2s;">
              <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-1)">Histórico</div>
              <div style="font-size:3rem;font-weight:800;color:var(--color-success);line-height:1">${concluidas.length}</div>
            </div>

          </div>
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
                const isMySector = isEncarregado && session && (s.destino || s.setorDestino) === session.disciplina;
                const isDeleteAllowed = session && ['Planejador', 'Administrador', 'Gerente'].includes(session.perfil);

                actions += `<button class="btn btn-ghost btn-xs" onclick="window.ServicesModule.viewDetails('${s.id}')" title="Ver Detalhes e OS">🔍 Detalhes</button>`;

                if (s.status === 'Aguardando Aprovação PCM' && isPCM) {
                  actions += `
                    <button class="btn btn-success btn-xs" onclick="window.ServicesModule.approvePCM('${s.id}')">Aprovar OS</button>
                    <button class="btn btn-danger btn-xs" onclick="window.ServicesModule.reject('${s.id}')">Rejeitar</button>
                  `;
                } else if (s.status === 'Aguardando Encarregado' && isMySector) {
                  actions += `
                    <button class="btn btn-primary btn-xs" onclick="window.ServicesModule.acceptService('${s.id}')">Aceitar Serviço</button>
                    <button class="btn btn-danger btn-xs" onclick="window.ServicesModule.rejectByEncarregado('${s.id}')">Rejeitar</button>
                  `;
                } else if ((s.status === 'Em Execução' || s.status === 'Em Andamento') && isMySector) {
                   if ((s.destino || s.setorDestino) === 'Usinagem') {
                     actions += `<button class="btn btn-outline btn-xs" onclick="window.ServicesModule.assignWorker('${s.id}')">Destinar / Alterar Recurso</button>`;
                   } else {
                     actions += `
                       <button class="btn btn-info btn-xs" onclick="window.ServicesModule.updateProgress('${s.id}')">Atualizar Avanço</button>
                       <button class="btn btn-success btn-xs" onclick="window.ServicesModule.finishService('${s.id}')">Finalizar</button>
                     `;
                   }
                }
                
                if (isDeleteAllowed) {
                  actions += `<button class="btn btn-ghost btn-xs" style="color:var(--color-danger);" onclick="window.ServicesModule.deleteRequest('${s.id}')" title="Excluir">Excluir</button>`;
                }

                return `
                  <tr>
                    <td>${new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td><strong>${eq ? eq.codigo : '—'}</strong></td>
                    <td>${s.origem || s.solicitanteNome || '—'}</td>
                    <td><span class="badge badge-ghost">${s.destino || s.setorDestino || '—'}</span></td>
                    <td>
                      ${s.descricao}
                      ${s.pctAvanço !== undefined ? `<div style="margin-top:4px;font-size:10px;color:var(--text-secondary);">Avanço: <strong>${s.pctAvanço}%</strong></div>` : ''}
                      ${s.prazoExecucao ? `<div style="font-size:10px;color:var(--text-secondary);">Prazo: <strong>${s.prazoExecucao}</strong></div>` : ''}
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
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;

    const modalHtml = `
      <div class="modal-overlay" id="modal-approve">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <div class="modal-title">Aprovar Solicitação de OS</div>
            <button class="modal-close" onclick="closeModal('modal-approve')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            ${s.fotoPeca ? `
              <div style="margin-bottom:15px;text-align:center;">
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;text-align:left;"><strong>Foto da Peça / Serviço:</strong></p>
                <img src="${s.fotoPeca}" onclick="window.ServicesModule.openImage(this.src)" style="cursor:zoom-in;max-width:100%;max-height:250px;border-radius:var(--radius-md);box-shadow:var(--shadow-sm);border:1px solid var(--border-card);" />
              </div>
            ` : `<p style="font-size:12px;color:#ef4444;margin-bottom:15px;">⚠️ Foto não anexada (Solicitação Antiga).</p>`}
            
            <p style="margin-bottom:12px;color:var(--text-secondary);font-size:13px;"><strong>Descrição:</strong> ${s.descricao}</p>
            
            <div class="form-group">
              <label>Número da Ordem de Serviço (OS) *</label>
              <input type="text" id="sv-approve-os" placeholder="Ex: OS-12345" class="form-control" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-approve')">Cancelar</button>
            <button class="btn btn-success" onclick="window.ServicesModule.saveApprovePCM('${s.id}')">Confirmar Aprovação</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('services-modals').innerHTML = modalHtml;
    openModal('modal-approve');
  }

  function saveApprovePCM(id) {
    const osNumber = document.getElementById('sv-approve-os').value.trim();
    if (!osNumber) {
      Toast.error('Erro', 'O número da OS é obrigatório.');
      return;
    }
    
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;

    // Create task
    const taskData = {
      equipmentId: s.equipmentId,
      codigo: 'OS ' + osNumber,
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
      fotoPeca: s.fotoPeca || '', // Pass photo to the task
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
    
    closeModal('modal-approve');
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

  function rejectByEncarregado(id) {
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;
    const modalHtml = `
      <div class="modal-overlay" id="modal-reject-encarregado">
        <div class="modal" style="max-width:400px;">
          <div class="modal-header">
            <div class="modal-title">Rejeitar Serviço</div>
            <button class="modal-close" onclick="closeModal('modal-reject-encarregado')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            <div class="form-group">
              <label>Motivo da Rejeição (Será enviado ao PCM) *</label>
              <textarea id="rej-motivo" class="form-control" rows="3" placeholder="Descreva por que o serviço não pode ser aceito"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-reject-encarregado')">Cancelar</button>
            <button class="btn btn-danger" onclick="window.ServicesModule.saveRejectByEncarregado('${s.id}')">Confirmar Rejeição</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('services-modals').innerHTML = modalHtml;
    openModal('modal-reject-encarregado');
  }

  function saveRejectByEncarregado(id) {
    const motivo = document.getElementById('rej-motivo').value;
    if (!motivo || motivo.trim() === '') {
      Toast.error('Erro', 'O motivo é obrigatório.');
      return;
    }
    
    window.DB.solicitacoes.update(id, { status: 'Rejeitada (Retorno PCM)', observacoes: motivo });
    
    if (window.DB.notifications) {
      window.DB.notifications.add({
        titulo: 'Serviço Rejeitado',
        mensagem: `O Encarregado rejeitou um serviço com o motivo: ${motivo}`,
        tipo: 'warning',
        data: new Date().toISOString()
      });
    }
    
    closeModal('modal-reject-encarregado');
    Toast.info('Rejeitada', 'Solicitação devolvida ao PCM.');
    Router.navigate('services', { force: true });
  }

  function assignWorker(id) {
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;

    // If task does not exist (should only happen if Usinagem flow broke)
    let taskId = s.osId;
    if (!taskId) {
      Toast.error('Erro', 'Ordem de serviço não encontrada.');
      return;
    }

    const workers = window.DB.workforce.list().filter(w => w.disciplina === s.destino);
    
    const modalHtml = `
      <div class="modal-overlay" id="modal-assign">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <div class="modal-title">Destinar Mão de Obra</div>
            <button class="modal-close" onclick="closeModal('modal-assign')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            ${s.fotoPeca ? `
              <div style="margin-bottom:15px;text-align:center;">
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;text-align:left;"><strong>Foto da Peça / Serviço:</strong></p>
                <img src="${s.fotoPeca}" onclick="window.ServicesModule.openImage(this.src)" style="cursor:zoom-in;max-width:100%;max-height:250px;border-radius:var(--radius-md);box-shadow:var(--shadow-sm);border:1px solid var(--border-card);" />
              </div>
            ` : ''}
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

    const s = window.DB.solicitacoes.list().find(x => x.id === solId);
    
    // Pass photo to task if it didn't pass before
    if (s && s.fotoPeca) {
      window.DB.tasks.update(taskId, { responsavel: workerName, status: 'Aguardando Recurso', fotoPeca: s.fotoPeca });
    } else {
      window.DB.tasks.update(taskId, { responsavel: workerName, status: 'Aguardando Recurso' });
    }
    
    // Update Solicitacao
    window.DB.solicitacoes.update(solId, { status: 'Em Execução' });

    Toast.success('Destinado', 'O serviço foi repassado para o executante.');
    closeModal('modal-assign');
    Router.navigate('services', { force: true });
  }

  function acceptService(id) {
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;
    const dest = s.destino || s.setorDestino;
    const nowStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);
    const workers = window.DB.workforce ? window.DB.workforce.list().filter(w => w.disciplina === dest) : [];

    const modalHtml = `
      <div class="modal-overlay" id="modal-accept">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <div class="modal-title">Aceitar e Destinar Serviço</div>
            <button class="modal-close" onclick="closeModal('modal-accept')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            <p style="margin-bottom:12px;color:var(--text-secondary);font-size:13px;">Serviço: <strong>${s.descricao}</strong></p>
            
            <div class="form-group">
              <label>Executante (${dest}) *</label>
              <select id="sv-acc-worker" class="form-control" onchange="window.ServicesModule.onWorkerChange(this.value, '${dest}')">
                <option value="">-- Selecione --</option>
                ${workers.map(w => `<option value="${w.id}">${w.nome}</option>`).join('')}
              </select>
            </div>
            
            <div class="form-group" id="sv-acc-just-container" style="display:none;">
              <label style="color:var(--color-warning);">Motivo da Troca de Alocação ${dest !== 'Usinagem' ? '*' : '(Opcional)'}</label>
              <textarea id="sv-acc-justificativa" class="form-control" placeholder="Descreva o motivo de tirar o executante da atividade atual..."></textarea>
            </div>

            <div class="form-group">
              <label>Data/Hora de Início *</label>
              <input type="datetime-local" id="sv-acc-inicio" class="form-control" value="${nowStr}" />
            </div>
            <div class="form-group">
              <label>Prazo de Execução (Dias/Horas) *</label>
              <input type="text" id="sv-acc-prazo" class="form-control" placeholder="Ex: 2 dias, ou 4 horas" />
            </div>
            <div class="form-group" style="display:none;">
              <label>Avanço Atual (%) *</label>
              <input type="number" id="sv-acc-avanco" class="form-control" value="0" min="0" max="100" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-accept')">Cancelar</button>
            <button class="btn btn-primary" onclick="window.ServicesModule.saveAccept('${s.id}')">Confirmar e Destinar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('services-modals').innerHTML = modalHtml;
    openModal('modal-accept');
  }

  function onWorkerChange(workerId, dest) {
    const w = window.DB.workforce.list().find(x => x.id === workerId);
    const justContainer = document.getElementById('sv-acc-just-container');
    if (!w) {
      justContainer.style.display = 'none';
      return;
    }
    const eqIds = w.equipmentIds || (w.equipmentId ? [w.equipmentId] : []);
    const eqsAllocated = eqIds.map(id => window.DB.equipment.get(id)).filter(e => e && e.status !== 'Liberado');
    if (eqsAllocated.length > 0) {
      justContainer.style.display = 'block';
    } else {
      justContainer.style.display = 'none';
    }
  }

  function saveAccept(id) {
    const inicio = document.getElementById('sv-acc-inicio').value;
    const prazo = document.getElementById('sv-acc-prazo').value.trim();
    const avanco = document.getElementById('sv-acc-avanco').value;
    const workerId = document.getElementById('sv-acc-worker').value;
    
    if(!inicio || !prazo || !workerId) { Toast.error('Erro','Preencha todos os campos obrigatórios.'); return; }
    
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    const dest = s.destino || s.setorDestino;
    const w = window.DB.workforce.list().find(x => x.id === workerId);
    
    const justContainer = document.getElementById('sv-acc-just-container');
    const justificativa = document.getElementById('sv-acc-justificativa').value.trim();
    if (justContainer.style.display === 'block' && dest !== 'Usinagem' && !justificativa) {
      Toast.error('Erro', 'Por favor, informe a justificativa da troca de alocação.');
      return;
    }

    window.DB.solicitacoes.update(id, {
      status: 'Em Execução',
      dataInicioExecucao: inicio,
      prazoExecucao: prazo,
      pctAvanço: avanco
    });
    
    if (s.osId) {
      window.DB.tasks.update(s.osId, { responsavel: w.nome, status: 'Em Execução' });
    }

    // Update worker allocation
    let eqIds = w.equipmentIds || (w.equipmentId ? [w.equipmentId] : []);
    if (s.equipmentId && !eqIds.includes(s.equipmentId)) {
      eqIds.push(s.equipmentId);
    }
    window.DB.workforce.update(w.id, { 
      equipmentIds: eqIds, 
      justificativa: justificativa || w.justificativa 
    });

    // Send notification
    if (window.DB.notifications) {
      const eq = window.DB.equipment.get(s.equipmentId);
      window.DB.notifications.add({
        titulo: 'Nova OS Destinada',
        mensagem: `Você foi alocado no equipamento ${eq ? eq.codigo : s.equipmentId} para a atividade: ${s.descricao}`,
        tipo: 'info',
        data: new Date().toISOString()
      });
    }

    Toast.success('Destinado', 'O serviço foi repassado e aceito com sucesso.');
    closeModal('modal-accept');
    Router.navigate('services', { force: true });
  }

  function updateProgress(id) {
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;
    const avancoAtual = s.pctAvanço || 0;
    const modalHtml = `
      <div class="modal-overlay" id="modal-progress">
        <div class="modal" style="max-width:400px;">
          <div class="modal-header">
            <div class="modal-title">Atualizar Avanço</div>
            <button class="modal-close" onclick="closeModal('modal-progress')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            <div class="form-group">
              <label>Avanço Atual (%) *</label>
              <input type="number" id="sv-prog-avanco" class="form-control" value="${avancoAtual}" min="0" max="100" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-progress')">Cancelar</button>
            <button class="btn btn-info" onclick="window.ServicesModule.saveProgress('${s.id}')">Atualizar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('services-modals').innerHTML = modalHtml;
    openModal('modal-progress');
  }

  function saveProgress(id) {
    const avanco = document.getElementById('sv-prog-avanco').value;
    window.DB.solicitacoes.update(id, { pctAvanço: avanco });
    closeModal('modal-progress');
    Toast.success('Sucesso', 'Avanço atualizado.');
    Router.navigate('services', { force: true });
  }

  function viewDetails(id) {
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;
    const task = s.osId ? window.DB.tasks.get(s.osId) : null;
    const osNumber = task ? task.codigo : (s.osNumber || 'Não informada (ou via PCM)');
    
    let qtd = "Não informada";
    let descFinal = s.descricao || '';
    if (descFinal.startsWith('(Qtd: ')) {
      const match = descFinal.match(/^\(Qtd:\s*(\d+)\)\s*-\s*(.*)/s);
      if (match) {
        qtd = match[1];
        descFinal = match[2];
      }
    }

    const modalHtml = `
      <div class="modal-overlay" id="modal-details">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <div class="modal-title">Detalhes da Solicitação</div>
            <button class="modal-close" onclick="closeModal('modal-details')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            ${s.fotoPeca ? `
              <div style="margin-bottom:15px;text-align:center;">
                <img src="${s.fotoPeca}" onclick="window.ServicesModule.openImage(this.src)" style="cursor:zoom-in;max-width:100%;max-height:250px;border-radius:var(--radius-md);box-shadow:var(--shadow-sm);border:1px solid var(--border-card);" />
              </div>
            ` : `<p style="font-size:12px;color:#ef4444;margin-bottom:15px;">⚠️ Sem foto anexada.</p>`}
            <p style="margin-bottom:8px;font-size:13px;"><strong>Solicitante:</strong> ${s.origem || 'Não informado'}</p>
            <p style="margin-bottom:8px;font-size:13px;"><strong>Quantidade:</strong> <span style="background:var(--bg-hover);padding:2px 6px;border-radius:4px;font-weight:bold;">${qtd}</span></p>
            <p style="margin-bottom:8px;font-size:13px;"><strong>Descrição:</strong> ${descFinal}</p>
            <p style="margin-bottom:8px;font-size:13px;"><strong>Status:</strong> ${s.status}</p>
            <p style="margin-bottom:8px;font-size:13px;"><strong>Ordem de Serviço (OS):</strong> ${osNumber}</p>
            <p style="margin-bottom:8px;font-size:13px;"><strong>Avanço:</strong> ${s.pctAvanço || 0}%</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-details')">Fechar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('services-modals').innerHTML = modalHtml;
    openModal('modal-details');
  }

  function deleteRequest(id) {
    window.uiConfirm('Tem certeza que deseja EXCLUIR esta solicitação de serviço permanentemente?', (res) => {
      if (!res) return;
      window.DB.solicitacoes.delete(id);
      Toast.success('Excluída', 'Solicitação foi excluída com sucesso.');
      Router.navigate('services', { force: true });
    });
  }

  function finishService(id) {
    const s = window.DB.solicitacoes.list().find(x => x.id === id);
    if (!s) return;
    const nowStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);
    const modalHtml = `
      <div class="modal-overlay" id="modal-finish">
        <div class="modal" style="max-width:400px;">
          <div class="modal-header">
            <div class="modal-title">Finalizar Serviço</div>
            <button class="modal-close" onclick="closeModal('modal-finish')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            <div class="form-group">
              <label>Data/Hora de Conclusão *</label>
              <input type="datetime-local" id="sv-fin-data" class="form-control" value="${nowStr}" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-finish')">Cancelar</button>
            <button class="btn btn-success" onclick="window.ServicesModule.saveFinish('${s.id}')">Finalizar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('services-modals').innerHTML = modalHtml;
    openModal('modal-finish');
  }

  function saveFinish(id) {
    const fim = document.getElementById('sv-fin-data').value;
    if(!fim) { Toast.error('Erro','Informe a data/hora.'); return; }
    window.DB.solicitacoes.update(id, {
      status: 'Concluída',
      dataConclusao: fim,
      pctAvanço: 100
    });
    closeModal('modal-finish');
    Toast.success('Concluído', 'Serviço finalizado.');
    Router.navigate('services', { force: true });
  }

  function openImage(src) {
    const lightboxHtml = `
      <div class="modal-overlay" id="modal-lightbox" style="display:flex;align-items:center;justify-content:center;z-index:99999;background:rgba(0,0,0,0.8);" onclick="this.remove()">
        <div style="position:relative; max-width:90vw; max-height:90vh;" onclick="event.stopPropagation()">
          <button style="position:absolute; top:-40px; right:0; background:transparent; border:none; color:white; font-size:36px; cursor:pointer;" onclick="document.getElementById('modal-lightbox').remove()">&times;</button>
          <img src="${src}" style="max-width:90vw; max-height:85vh; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); object-fit:contain;" />
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = lightboxHtml.trim();
    document.body.appendChild(div.firstElementChild);
  }

  return {
    render,
    setTab,
    approvePCM,
    saveApprovePCM,
    reject,
    rejectByEncarregado,
    saveRejectByEncarregado,
    assignWorker,
    saveAssign,
    viewDetails,
    deleteRequest,
    acceptService,
    saveAccept,
    onWorkerChange,
    updateProgress,
    saveProgress,
    finishService,
    saveFinish,
    openImage
  };
})();

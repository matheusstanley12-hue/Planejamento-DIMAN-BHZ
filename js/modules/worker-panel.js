/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Worker Panel (Executante)
   ============================================================ */

window.WorkerPanel = (() => {
  let activeTab = 'hoje'; // 'atrasadas' | 'hoje' | 'futuras' | 'concluidas'
  let eqFilter = '';

  function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  function getMyWorker(session) {
    const workers = window.DB.workforce.list();
    return workers.find(w => (w.matricula && session.matricula && w.matricula === session.matricula) || w.nome === session.nome);
  }

  function getMyEquipments(session) {
    const eqs = window.DB.equipment.list();
    const allTasks = window.DB.tasks.getAll();
    const myWorker = getMyWorker(session);
    const myDirectEqId = myWorker ? myWorker.equipmentId : null;
    const myWorkerName = myWorker ? myWorker.nome : session.nome;
    
    return eqs.filter(e => {
      const map = e.workforceMap || {};
      if (Object.values(map).includes(myWorkerName) || Object.values(map).includes(session.nome) || e.id === myDirectEqId) return true;
      
      const eqTasks = allTasks.filter(t => t.equipmentId === e.id && t.status !== 'Concluída');
      return eqTasks.some(t => t.responsavel && (t.responsavel === myWorkerName || t.responsavel === session.nome));
    });
  }

  function canExecuteTask(session, task) {
    if (!session || session.perfil !== 'Executante') return true;
    if (!task.disciplina) return true;

    const disc = task.disciplina.toLowerCase();
    
    // Check both session and workforce DB
    let sDisc = (session.disciplina || '').toLowerCase();
    let sCargo = (session.cargo || '').toLowerCase();
    
    const myWorker = getMyWorker(session);
    if (myWorker) {
       sDisc = sDisc || (myWorker.disciplina || '').toLowerCase();
       sCargo = sCargo || (myWorker.funcao || '').toLowerCase();
    }

    if (sDisc && sDisc === disc) return true;

    if (sCargo) {
      if (disc.includes('mecânic') || disc.includes('mecanic')) {
        if ((sCargo.includes('mecânic') || sCargo.includes('mecanic')) && !sCargo.includes('torneiro')) return true;
      } else if (disc.includes('usinagem')) {
        if (sCargo.includes('usinagem') || sCargo.includes('torneiro')) return true;
      } else if (disc.includes('elétric') || disc.includes('eletric')) {
        if (sCargo.includes('elétric') || sCargo.includes('eletric')) return true;
      } else if (disc.includes('caldeir') || disc.includes('solda')) {
        if (sCargo.includes('caldeir') || sCargo.includes('soldad')) return true;
      } else if (disc.includes('pintor') || disc.includes('pintura')) {
        if (sCargo.includes('pintor')) return true;
      } else if (disc.includes('lavador') || disc.includes('lavação') || disc.includes('lavacao')) {
        if (sCargo.includes('lavador')) return true;
      } else if (disc.includes('montag') || disc.includes('montador')) {
        if (sCargo.includes('montag') || sCargo.includes('montador')) return true;
      } else if (disc.includes('lubrific')) {
        if (sCargo.includes('lubrific')) return true;
      } else if (disc.includes('ferramentaria')) {
        if (sCargo.includes('ferrament')) return true;
      }
    }
    
    return false;
  }

  function checkPredecessors(task, allTasks) {
    const preds = task.predecessoras || [];
    const blockedBy = [];
    preds.forEach(pid => {
      const pTask = allTasks.find(t => t.id === pid);
      if (pTask && pTask.status !== 'Concluída') {
        const pDesc = pTask.descricao || 'Tarefa sem descrição';
        const pDisc = pTask.disciplina ? `[${pTask.disciplina}] ` : '';
        const pCod = pTask.codigo ? ` (${pTask.codigo})` : '';
        blockedBy.push(`${pDisc}${pDesc}${pCod}`);
      }
    });
    return blockedBy;
  }

  function startPromptTask(taskId) {
    const session = Auth.getSession();
    const myWorker = getMyWorker(session);
    
    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-start-task">
        <div class="modal" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Iniciar Tarefa</div>
            <button class="modal-close" onclick="closeModal('modal-worker-start-task')">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px;">Quem vai executar essa tarefa?</p>
            
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:15px;cursor:pointer;background:var(--bg-base);padding:10px;border-radius:6px;border:1px solid var(--border-card);">
                 <input type="checkbox" id="include-myself" checked style="width:18px;height:18px;accent-color:var(--brand-primary);flex-shrink:0;" />
                 <span style="font-size:14px;font-weight:600;color:var(--text-primary);">Incluir a mim mesmo nesta tarefa</span>
            </label>
            
            <div id="start-task-executors-list"></div>
            
            <button class="btn btn-ghost" style="width:100%;margin-bottom:15px;border:1px dashed var(--border-card);color:var(--brand-primary);" onclick="WorkerPanel.addExecutorInput()">+ Adicionar outro executante</button>
            <button class="btn btn-primary" style="width:100%;height:45px;" onclick="WorkerPanel.startTask('${taskId}')">Iniciar Tarefa</button>
          </div>
        </div>
      </div>
    `;
    const container = document.getElementById('worker-panel-modals') || document.createElement('div');
    if (!container.id) { container.id = 'worker-panel-modals'; document.body.appendChild(container); }
    container.innerHTML = modalHtml;
    openModal('modal-worker-start-task');
  }

  function addExecutorInput() {
    const list = document.getElementById('start-task-executors-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'form-group executor-item';
    div.style.marginBottom = '15px';
    div.innerHTML = `
      <label style="text-transform:uppercase;font-size:10px;font-weight:700;color:var(--text-muted);">Matrícula do Ajudante:</label>
      <div style="display:flex;gap:8px;margin-top:5px;">
        <input type="number" inputmode="numeric" class="start-task-matricula-input" placeholder="Matrícula..." style="flex:1;border-radius:6px;border:1px solid var(--border-card);padding:10px;color:var(--text-primary);background:var(--bg-base);font-size:16px;"/>
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);font-weight:bold;padding:0 12px;border:1px solid var(--border-card);background:var(--bg-elevated);" onclick="this.parentElement.parentElement.remove()">X</button>
      </div>
    `;
    list.appendChild(div);
  }

  function confirmStartTaskWithJustification(taskId, matriculasStr) {
    const just = document.getElementById('start-task-justification').value.trim();
    if (!just) return Toast.error('Erro', 'A justificativa é obrigatória.');
    
    const session = Auth.getSession();
    const t = DB.tasks.get(taskId);
    if (!t) return;

    const obsObj = {
      id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: `Justificativa de alocação (Executantes de outra sonda/equipamento): ${just}`,
      user: session.nome,
      userId: session.userId,
      createdAt: new Date().toISOString()
    };
    const obsArray = t.observacoes ? JSON.parse(t.observacoes) : [];
    obsArray.push(obsObj);
    DB.tasks.update(taskId, { observacoes: JSON.stringify(obsArray) });

    closeModal('modal-worker-justification');
    
    let matriculas = matriculasStr.split(',');
    let targetWorkers = matriculas.map(m => DB.workforce.list().find(wk => String(wk.matricula) === String(m))).filter(Boolean);
    
    startTaskForWorkers(taskId, targetWorkers);
  }

  function startTaskForWorkers(taskId, targetWorkers) {
    const t = DB.tasks.get(taskId);
    if (!t) return;
    
    targetWorkers.forEach(w => {
      DB.workforce.update(w.id, {
        currentState: 'Trabalhando',
        currentTaskId: taskId,
        currentActionStartTime: new Date().toISOString(),
        currentPauseReason: ''
      });
    });

    if (t.status !== 'Em Andamento') {
      DB.tasks.update(taskId, { status: 'Em Andamento' });
    }

    Toast.success('Iniciado!', `A tarefa "${t.descricao}" foi iniciada para os executantes selecionados.`);
    if (document.getElementById('modal-worker-start-task')) closeModal('modal-worker-start-task');
    Router.navigate('worker-panel', { force: true });
  }

  function startTask(taskId) {
    const inputs = document.querySelectorAll('.start-task-matricula-input');
    let matriculas = [];
    if (inputs.length > 0) {
      inputs.forEach(inp => {
        const val = inp.value.trim();
        if (val && !matriculas.includes(val)) matriculas.push(val);
      });
    }

    const session = Auth.getSession();
    const myWorker = getMyWorker(session);
    
    const includeMyself = document.getElementById('include-myself');
    if (includeMyself && includeMyself.checked && myWorker) {
      if (!matriculas.includes(myWorker.matricula)) {
        matriculas.push(myWorker.matricula);
      }
    }
    
    if (matriculas.length === 0) {
      if (myWorker) matriculas.push(String(myWorker.matricula));
      else return Toast.error('Erro', 'Nenhum executante informado.');
    }

    const t = DB.tasks.get(taskId);
    if (!t) return;

    let targetWorkers = [];
    for (let mat of matriculas) {
      let w = DB.workforce.list().find(wk => String(wk.matricula) === String(mat));
      if (!w) return Toast.error('Erro', `Matrícula ${mat} não encontrada no sistema.`);
      targetWorkers.push(w);
    }

    // Check busy status and auto-fix stuck workers
    for (let w of targetWorkers) {
      if (w.currentState === 'Trabalhando' || w.currentState === 'Em Pausa') {
        const activeT = DB.tasks.get(w.currentTaskId);
        if (!activeT || (activeT.status !== 'Em Andamento' && activeT.status !== 'Paralisada')) {
          // Auto-fix stuck state
          w.currentState = 'Ocioso';
          w.currentTaskId = null;
          w.currentActionStartTime = null;
          w.currentPauseReason = '';
          DB.workforce.update(w.id, w);
        } else {
          return Toast.error('Atenção', `${w.nome} já tem uma atividade ou pausa em andamento. Finalize a tarefa atual primeiro.`);
        }
      }
    }

    // Check allocation blocking
    let divergingWorkers = targetWorkers.filter(w => w.equipmentId && w.equipmentId !== t.equipmentId);
    if (divergingWorkers.length > 0) {
      const names = divergingWorkers.map(w => w.nome).join(', ');
      const matriculasStr = matriculas.join(',');
      const jModalHtml = `
        <div class="modal-overlay" id="modal-worker-justification" style="z-index:9999;">
          <div class="modal" style="box-shadow:var(--shadow-lg);">
            <div class="modal-header">
              <div class="modal-title">Atenção: Desvio de Alocação</div>
              <button class="modal-close" onclick="closeModal('modal-worker-justification')">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body" style="padding-top:10px;">
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px;">
                Os executantes a seguir estão alocados em outros equipamentos:<br><strong style="color:var(--color-danger);font-size:14px;">${names}</strong>
              </p>
              <div class="form-group" style="margin-bottom:15px;">
                <label>Justificativa do Desvio *</label>
                <textarea id="start-task-justification" rows="3" style="width:100%;border-radius:6px;border:1px solid var(--border-card);padding:10px;background:var(--bg-base);" placeholder="Informe o motivo para alocá-los nesta tarefa..."></textarea>
              </div>
              <button class="btn btn-primary" style="width:100%;height:45px;" onclick="WorkerPanel.confirmStartTaskWithJustification('${taskId}', '${matriculasStr}')">Confirmar e Iniciar</button>
            </div>
          </div>
        </div>
      `;
      const container = document.getElementById('worker-panel-modals');
      container.insertAdjacentHTML('beforeend', jModalHtml);
      document.getElementById('modal-worker-start-task').style.display = 'none';
      document.querySelector('#modal-worker-justification .modal-close').onclick = function() {
        closeModal('modal-worker-justification');
        document.getElementById('modal-worker-start-task').style.display = 'flex';
      };
      openModal('modal-worker-justification');
      return;
    }

    startTaskForWorkers(taskId, targetWorkers);
  }

  function promptPause(workerId) {
    const wIdParam = workerId ? `'${workerId}'` : 'null';
    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-pause">
        <div class="modal" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Motivo da Pausa</div>
            <button class="modal-close" onclick="closeModal('modal-worker-pause')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px;">Selecione abaixo por que a tarefa está sendo pausada:</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <button class="btn btn-outline" style="height:60px;flex-direction:column;gap:5px;border-color:var(--border-card);" onclick="WorkerPanel.pauseWork('Almoço', ${wIdParam})">🍽️ Almoço</button>
              <button class="btn btn-outline" style="height:60px;flex-direction:column;gap:5px;border-color:var(--border-card);" onclick="WorkerPanel.pauseWork('Banheiro', ${wIdParam})">🚻 Banheiro</button>
              <button class="btn btn-outline" style="height:60px;flex-direction:column;gap:5px;border-color:var(--border-card);" onclick="WorkerPanel.promptMissingParts(${wIdParam})">⚙️ Falta de Peças</button>
              <button class="btn btn-outline" style="height:60px;flex-direction:column;gap:5px;border-color:var(--border-card);" onclick="WorkerPanel.pauseWork('DSS', ${wIdParam})">🛡️ DSS</button>
              <button class="btn btn-outline" style="height:60px;flex-direction:column;gap:5px;border-color:var(--border-card);" onclick="WorkerPanel.pauseWork('Fim Expediente', ${wIdParam})">🏠 Fim Expediente</button>
              <button class="btn btn-outline" style="height:60px;flex-direction:column;gap:5px;border-color:var(--border-card);" onclick="WorkerPanel.promptOtherReason(${wIdParam})">Outros</button>
            </div>
          </div>
        </div>
      </div>
    `;
    const container = document.getElementById('worker-panel-modals') || document.createElement('div');
    if (!container.id) { container.id = 'worker-panel-modals'; document.body.appendChild(container); }
    container.innerHTML = modalHtml;
    openModal('modal-worker-pause');
  }

  function promptMissingParts(workerId) {
    const wIdParam = workerId ? `'${workerId}'` : 'null';
    closeModal('modal-worker-pause');
    setTimeout(() => {
      const modalHtml = `
        <div class="modal-overlay" id="modal-worker-missing-parts">
          <div class="modal" style="box-shadow:var(--shadow-lg);">
            <div class="modal-header">
              <div class="modal-title">Falta de Peças</div>
              <button class="modal-close" onclick="closeModal('modal-worker-missing-parts')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body" style="padding-top:10px;">
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px;">Especifique qual peça ou componente está faltando:</p>
              <textarea id="missing-parts-desc" class="form-input" rows="3" placeholder="Ex: Correia do motor, parafusos M8..." style="margin-bottom:15px;"></textarea>
              <button class="btn btn-primary" style="width:100%;height:45px;" onclick="WorkerPanel.submitMissingParts(${wIdParam})">Pausar por Falta de Peças</button>
            </div>
          </div>
        </div>
      `;
      const container = document.getElementById('worker-panel-modals') || document.createElement('div');
      if (!container.id) { container.id = 'worker-panel-modals'; document.body.appendChild(container); }
      container.innerHTML = modalHtml;
      openModal('modal-worker-missing-parts');
    }, 100);
  }

  function submitMissingParts(workerId) {
    const desc = document.getElementById('missing-parts-desc').value.trim();
    if (!desc) return Toast.error('Erro', 'Por favor, descreva as peças faltantes.');
    closeModal('modal-worker-missing-parts');
    pauseWork(`Falta de Peças: ${desc}`, workerId);
  }

  function promptOtherReason(workerId) {
    const wIdParam = workerId ? `'${workerId}'` : 'null';
    closeModal('modal-worker-pause');
    setTimeout(() => {
      const modalHtml = `
        <div class="modal-overlay" id="modal-worker-other-reason">
          <div class="modal" style="box-shadow:var(--shadow-lg);">
            <div class="modal-header">
              <div class="modal-title">Outro Motivo</div>
              <button class="modal-close" onclick="closeModal('modal-worker-other-reason')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body" style="padding-top:10px;">
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px;">Descreva o motivo da pausa:</p>
              <textarea id="other-reason-desc" class="form-input" rows="3" placeholder="Ex: Aguardando liberação de área..." style="margin-bottom:15px;"></textarea>
              <button class="btn btn-primary" style="width:100%;height:45px;" onclick="WorkerPanel.submitOtherReason(${wIdParam})">Pausar Tarefa</button>
            </div>
          </div>
        </div>
      `;
      const container = document.getElementById('worker-panel-modals') || document.createElement('div');
      if (!container.id) { container.id = 'worker-panel-modals'; document.body.appendChild(container); }
      container.innerHTML = modalHtml;
      openModal('modal-worker-other-reason');
    }, 100);
  }

  function submitOtherReason(workerId) {
    const desc = document.getElementById('other-reason-desc').value.trim();
    if (!desc) return Toast.error('Erro', 'Por favor, descreva o motivo.');
    closeModal('modal-worker-other-reason');
    pauseWork(desc, workerId);
  }


  function pauseWork(reason, workerId) {
    const session = Auth.getSession();
    const myWorker = workerId ? DB.workforce.get(workerId) : getMyWorker(session);
    if (!myWorker || myWorker.currentState !== 'Trabalhando') return;

    const t = DB.tasks.get(myWorker.currentTaskId);
    const startTime = new Date(myWorker.currentActionStartTime);
    const now = new Date();
    const elapsedHrs = (now - startTime) / (1000 * 60 * 60);

    // Save Timesheet (Work)
    DB.timesheets.create({
      workerId: myWorker.id,
      workerNome: session.nome,
      equipmentId: t ? t.equipmentId : null,
      taskId: t ? t.id : null,
      data: now.toISOString().slice(0, 10),
      horaInicio: startTime.toISOString(),
      horaFim: now.toISOString(),
      horasTrabalhadas: Math.max(0.01, Math.round(elapsedHrs * 100) / 100),
      tipo: 'Trabalho',
      observacao: `Timer (Automático)`
    });

    if (t) {
      let updatePayload = { horasRealizadas: (t.horasRealizadas || 0) + Math.max(0, Math.round(elapsedHrs * 100) / 100) };
      if (reason.startsWith('Falta de Peças') || reason.startsWith('Falta de Peça') || reason.startsWith('Outros')) {
        updatePayload.status = reason.startsWith('Falta de Peças') || reason.startsWith('Falta de Peça') ? 'Aguardando Peça' : 'Pausada';
        updatePayload.pauseReason = reason;
        updatePayload.pauseStartTime = now.toISOString();
      }
      DB.tasks.update(t.id, updatePayload);
    }

    if (reason.startsWith('Falta de Peças') || reason.startsWith('Falta de Peça') || reason.startsWith('Outros')) {
      DB.workforce.update(myWorker.id, {
        currentState: 'Ocioso',
        currentTaskId: null,
        currentPauseReason: '',
        currentActionStartTime: null
      });
      Toast.info('Tarefa Pausada', `A tarefa foi pausada. Você está livre para iniciar outra atividade.`);
    } else {
      DB.workforce.update(myWorker.id, {
        currentState: 'Em Pausa',
        currentPauseReason: reason,
        currentActionStartTime: now.toISOString()
      });
      Toast.info('Pausado', `Motivo: ${reason}`);
    }

    Router.navigate('worker-panel', { force: true });
  }

  function promptResumeTask(taskId) {
    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-resume-task">
        <div class="modal" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Justificar Retomada</div>
            <button class="modal-close" onclick="closeModal('modal-worker-resume-task')">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding-top:10px;">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px;">Por favor, informe a justificativa para retomar essa tarefa (ex: "Peça solicitada chegou", "Área liberada", etc):</p>
            <div class="form-group" style="margin-bottom:15px;">
              <textarea id="resume-task-desc" rows="4" placeholder="Descreva a justificativa..." style="width:100%;resize:vertical;border-radius:6px;border:1px solid var(--border-card);padding:10px;color:var(--text-primary);background:var(--bg-base);"></textarea>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:10px;height:45px;" onclick="WorkerPanel.submitResumeTask('${taskId}')">Confirmar Retomada</button>
          </div>
        </div>
      </div>
    `;
    const container = document.getElementById('worker-panel-modals') || document.createElement('div');
    if (!container.id) { container.id = 'worker-panel-modals'; document.body.appendChild(container); }
    container.innerHTML = modalHtml;
    openModal('modal-worker-resume-task');
  }

  function submitResumeTask(taskId) {
    const desc = document.getElementById('resume-task-desc').value.trim();
    if (!desc) return Toast.error('Erro', 'Por favor, informe a justificativa.');
    closeModal('modal-worker-resume-task');
    
    const session = Auth.getSession();
    const myWorker = getMyWorker(session);
    if (!myWorker) return Toast.error('Erro', 'Cadastro não encontrado.');
    if (myWorker.currentState && myWorker.currentState !== 'Ocioso') {
      return Toast.error('Atenção', `${myWorker.nome}, você já tem uma atividade ou pausa em andamento. Por gentileza, finalize a sua tarefa primeiro.`);
    }

    const t = DB.tasks.get(taskId);
    if (!t) return;

    // Log the pause duration
    if (t.pauseStartTime) {
      const pauseStart = new Date(t.pauseStartTime);
      const now = new Date();
      const elapsedHrs = (now - pauseStart) / (1000 * 60 * 60);
      DB.timesheets.create({
        workerId: null, // Task-level delay
        workerNome: 'SISTEMA',
        equipmentId: t.equipmentId,
        taskId: t.id,
        data: now.toISOString().slice(0, 10),
        horaInicio: pauseStart.toISOString(),
        horaFim: now.toISOString(),
        horasTrabalhadas: Math.max(0.01, Math.round(elapsedHrs * 100) / 100),
        tipo: 'Atraso Tarefa',
        motivoPausa: t.pauseReason || 'Pausada',
        observacao: `Fim do atraso. Justificativa: ${desc}`
      });
    }

    // Reset task pause fields and set to Em Andamento
    DB.tasks.update(taskId, {
      status: 'Em Andamento',
      pauseStartTime: null,
      pauseReason: null
    });

    // Start mechanic's timer
    DB.workforce.update(myWorker.id, {
      currentState: 'Trabalhando',
      currentTaskId: taskId,
      currentActionStartTime: new Date().toISOString(),
      currentPauseReason: ''
    });

    Toast.success('Retomado!', `Você voltou a executar a tarefa: "${t.descricao}"`);
    Router.navigate('worker-panel', { force: true });
  }

  function resumeWork(workerId) {
    const session = Auth.getSession();
    const myWorker = workerId ? DB.workforce.get(workerId) : getMyWorker(session);
    if (!myWorker || myWorker.currentState !== 'Em Pausa') return;
      const t = DB.tasks.get(myWorker.currentTaskId);
      const startTime = new Date(myWorker.currentActionStartTime);
      const now = new Date();
      const elapsedHrs = (now - startTime) / (1000 * 60 * 60);

      DB.timesheets.create({
        workerId: myWorker.id,
        workerNome: session.nome,
        equipmentId: t ? t.equipmentId : null,
        taskId: t ? t.id : null,
        data: now.toISOString().slice(0, 10),
        horaInicio: startTime.toISOString(),
        horaFim: now.toISOString(),
        horasTrabalhadas: Math.max(0.01, Math.round(elapsedHrs * 100) / 100),
        tipo: 'Pausa',
        motivoPausa: myWorker.currentPauseReason,
        observacao: `Pausa (${myWorker.currentPauseReason})`
      });

      DB.workforce.update(myWorker.id, {
        currentState: 'Trabalhando',
        currentPauseReason: '',
        currentActionStartTime: now.toISOString()
      });

      if (t && t.status !== 'Em Andamento') {
        DB.tasks.update(t.id, { status: 'Em Andamento' });
      }

      Toast.success('Retomado!', 'O cronômetro de trabalho voltou a rodar.');
      Router.navigate('worker-panel', { force: true });
  }

  function cancelWork(workerId) {
    window.uiConfirm('Tem certeza que deseja cancelar este apontamento em andamento?', (res) => {
      if (!res) return;
      const session = Auth.getSession();
      const myWorker = workerId ? DB.workforce.get(workerId) : getMyWorker(session);
      if (!myWorker || (myWorker.currentState !== 'Trabalhando' && myWorker.currentState !== 'Em Pausa')) return;

      const t = DB.tasks.get(myWorker.currentTaskId);

      DB.workforce.update(myWorker.id, {
        currentState: 'Ocioso',
        currentTaskId: null,
        currentActionStartTime: null,
        currentPauseReason: ''
      });

      if (t) {
        // Check if there are other workers executing this task or past timesheets
        const workers = DB.workforce.list() || [];
        const otherActive = workers.some(w => w.id !== myWorker.id && (w.currentState === 'Trabalhando' || w.currentState === 'Em Pausa') && w.currentTaskId === t.id);
        const timesheets = DB.timesheets.list() || [];
        const hasTimesheets = timesheets.some(ts => ts.taskId === t.id);
        
        if (!otherActive && !hasTimesheets) {
          DB.tasks.update(t.id, { status: 'Não Iniciada' });
        }
      }

      Toast.success('Cancelado', 'Andamento cancelado com sucesso.');
      Router.navigate('worker-panel', { force: true });
    });
  }

  function promptComplete(workerId) {
    const session = Auth.getSession();
    const myWorker = workerId ? DB.workforce.get(workerId) : getMyWorker(session);
    if (!myWorker || !myWorker.currentTaskId) return;

    const t = DB.tasks.get(myWorker.currentTaskId);
    const wIdParam = workerId ? `'${workerId}'` : 'null';

    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-complete">
        <div class="modal" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Concluir Tarefa</div>
            <button class="modal-close" onclick="closeModal('modal-worker-complete')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p style="font-size:14px;color:var(--text-primary);font-weight:bold;margin-bottom:10px;">${t.descricao}</p>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:20px;">Tire uma foto para comprovar a execução do serviço e finalizar a tarefa.</p>
            
            <div style="text-align:center;margin-bottom:20px;">
              <label for="task-photo-upload" class="btn btn-outline" style="width:100%;height:100px;display:flex;flex-direction:column;justify-content:center;align-items:center;border:2px dashed var(--brand-primary);color:var(--brand-primary);cursor:pointer;background:var(--bg-base);">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:32px;height:32px;margin-bottom:8px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/></svg>
                Tirar Foto / Anexar
              </label>
              <input type="file" id="task-photo-upload" accept="image/*" capture="environment" style="display:none;" onchange="WorkerPanel.previewPhoto(event)" />
              <div id="photo-preview-container" style="display:none;margin-top:15px;position:relative;">
                <img id="photo-preview" src="" style="max-width:100%;border-radius:8px;max-height:200px;object-fit:cover;" />
                <button class="btn btn-danger btn-xs" style="position:absolute;top:5px;right:5px;border-radius:50%;width:24px;height:24px;padding:0;justify-content:center;" onclick="document.getElementById('task-photo-upload').value='';document.getElementById('photo-preview-container').style.display='none';">✕</button>
              </div>
            </div>

            <div class="form-group">
              <label>Observações (Opcional)</label>
              <textarea id="task-complete-obs" rows="2" placeholder="Algo a reportar?"></textarea>
            </div>
            
            <button class="btn btn-primary" style="width:100%;margin-top:10px;height:45px;" onclick="WorkerPanel.finalizeTask(${wIdParam})">Confirmar Conclusão</button>
          </div>
        </div>
      </div>
    `;
    const container = document.getElementById('worker-panel-modals') || document.createElement('div');
    if (!container.id) { container.id = 'worker-panel-modals'; document.body.appendChild(container); }
    container.innerHTML = modalHtml;
    openModal('modal-worker-complete');
  }

  function previewPhoto(event) {
    const file = event.target.files[0];
    if (file) {
      compressImage(file, function(base64) {
        document.getElementById('photo-preview').src = base64;
        document.getElementById('photo-preview-container').style.display = 'block';
      });
    }
  }

  function finalizeTask(workerId) {
    const session = Auth.getSession();
    const myWorker = workerId ? DB.workforce.get(workerId) : getMyWorker(session);
    if (!myWorker || !myWorker.currentTaskId) return;

    const fileInput = document.getElementById('task-photo-upload');
    const hasFile = fileInput.files && fileInput.files.length > 0;

    const obsText = document.getElementById('task-complete-obs').value.trim();
    const t = DB.tasks.get(myWorker.currentTaskId);
    
    const processSave = function(base64Img) {
      
      // If working, stop and save time
      if (myWorker.currentState === 'Trabalhando') {
        const startTime = new Date(myWorker.currentActionStartTime);
        const now = new Date();
        const elapsedHrs = (now - startTime) / (1000 * 60 * 60);

        DB.timesheets.create({
          workerId: myWorker.id,
          workerNome: session.nome,
          equipmentId: t ? t.equipmentId : null,
          taskId: t ? t.id : null,
          data: now.toISOString().slice(0, 10),
          horaInicio: startTime.toISOString(),
          horaFim: now.toISOString(),
          horasTrabalhadas: Math.max(0.01, Math.round(elapsedHrs * 100) / 100),
          tipo: 'Trabalho',
          observacao: 'Timer (Automático - Conclusão)'
        });

        if (t) {
          DB.tasks.update(t.id, { 
            horasRealizadas: (t.horasRealizadas || 0) + Math.max(0, Math.round(elapsedHrs * 100) / 100)
          });
        }
      } else if (myWorker.currentState === 'Em Pausa') {
         // Just close the pause
         const startTime = new Date(myWorker.currentActionStartTime);
         const now = new Date();
         const elapsedHrs = (now - startTime) / (1000 * 60 * 60);
         DB.timesheets.create({
          workerId: myWorker.id,
          workerNome: session.nome,
          equipmentId: t ? t.equipmentId : null,
          taskId: t ? t.id : null,
          data: now.toISOString().slice(0, 10),
          horaInicio: startTime.toISOString(),
          horaFim: now.toISOString(),
          horasTrabalhadas: Math.max(0.01, Math.round(elapsedHrs * 100) / 100),
          tipo: 'Pausa',
          motivoPausa: myWorker.currentPauseReason,
          observacao: 'Pausa'
        });
      }

      if (t) {
        // Add attachment and observation
        let comments = [];
        if (t.observacoes) {
          try {
            const parsed = JSON.parse(t.observacoes);
            if (Array.isArray(parsed)) comments = parsed;
            else comments = [{ id: 'legacy', text: t.observacoes, user: 'Sistema', createdAt: new Date().toISOString() }];
          } catch(e) {
            comments = [{ id: 'legacy', text: t.observacoes, user: 'Sistema', createdAt: new Date().toISOString() }];
          }
        }
        
        if (obsText) {
          comments.push({
            id: 'c-end-' + Date.now(),
            text: obsText,
            user: session.nome,
            userId: session.userId,
            createdAt: new Date().toISOString()
          });
        }
        const newObs = comments.length > 0 ? JSON.stringify(comments) : '';

        const attachments = t.anexos ? [...t.anexos] : [];
        if (base64Img) {
          attachments.push({
            url: base64Img,
            nome: `Foto_${Date.now()}.jpg`,
            tipo: 'image/jpeg',
            enviadoPor: session.nome,
            dataEnvio: new Date().toISOString()
          });
        }

        DB.tasks.update(t.id, {
          status: 'Concluída',
          pctExecutado: 100,
          dataRealTermino: new Date().toISOString().slice(0,10),
          observacoes: newObs,
          anexos: attachments,
          fotoComprovacao: base64Img || t.fotoComprovacao
        });
      }

      // Set to Ocioso
      DB.workforce.update(myWorker.id, {
        currentState: 'Ocioso',
        currentTaskId: null,
        currentActionStartTime: null,
        currentPauseReason: ''
      });

      closeModal('modal-worker-complete');
      Toast.success('Sucesso', 'Tarefa concluída com sucesso!');
      Router.navigate('worker-panel', { force: true });
    };

    if (hasFile) {
      compressImage(fileInput.files[0], processSave);
    } else {
      processSave(null);
    }
  }

  function formatTimeDiff(isoStart) {
    if (!isoStart) return '00:00:00';
    const s = new Date(isoStart);
    const n = new Date();
    const diff = Math.floor((n - s) / 1000); // seconds
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  }

  function formatTimeDiff(isoStart) {
    if (!isoStart) return '00:00:00';
    const s = new Date(isoStart);
    const n = new Date();
    const diff = Math.floor((n - s) / 1000); // seconds
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  }

  function render() {
    const session = Auth.getSession();
    if (!session || session.perfil !== 'Executante') return `<div class="page-container">Acesso Restrito</div>`;

    window.GlobalEqFilter = '';
    const myWorker = getMyWorker(session);
    if (!myWorker) return `<div class="page-container"><h3>Erro</h3><p>Seu cadastro não foi encontrado na base de mão de obra. Avise o PCM.</p></div>`;

    const eqs = DB.equipment.list();
    const tasks = DB.tasks.getAll();
    const myEqs = getMyEquipments(session);
    const myEqIds = myEqs.map(e => e.id);
    let myTasks = tasks.filter(t => myEqIds.includes(t.equipmentId));
    
    // Add tasks without equipment that the worker can execute
    const unassignedTasks = tasks.filter(t => !t.equipmentId && t.status !== 'Concluída' && canExecuteTask(session, t));
    unassignedTasks.forEach(t => {
      if (!myTasks.find(x => x.id === t.id)) myTasks.push(t);
    });

    if (eqFilter) myTasks = myTasks.filter(t => t.equipmentId === eqFilter);

    // Live Status Panel
    let statusPanelHtml = '';
    const state = myWorker.currentState || 'Ocioso';
    
    const allWorkers = window.DB.workforce.list();
    const activeWorkers = allWorkers.filter(w => 
      (w.currentState === 'Trabalhando' || w.currentState === 'Em Pausa') && 
      w.currentTaskId && 
      myTasks.find(t => t.id === w.currentTaskId)
    );

    // Auto-update timer display
    if (!window.workerTimerInterval) {
      window.workerTimerInterval = setInterval(() => {
        const workers = window.DB.workforce.list();
        
        document.querySelectorAll('.live-timer-wp').forEach(el => {
          const wId = el.getAttribute('data-worker-id');
          const w = workers.find(wk => wk.id === wId);
          if (w && w.currentActionStartTime) {
            el.innerText = formatTimeDiff(w.currentActionStartTime);
          }
        });

        document.querySelectorAll('.live-pause-timer').forEach(span => {
          const start = span.getAttribute('data-start');
          if (start) {
            span.innerText = ` - ${formatTimeDiff(start)}`;
          }
        });
      }, 1000);
    }

    if (activeWorkers.length > 0) {
      statusPanelHtml = activeWorkers.map(w => {
        const state = w.currentState;
        const currentT = tasks.find(t => t.id === w.currentTaskId);
        const eq = eqs.find(e => e.id === (currentT ? currentT.equipmentId : null));
        
        if (state === 'Trabalhando') {
          return `
            <div class="active-task-card working" style="margin-bottom: 15px;">
              <div class="pulse-indicator"></div>
              <div class="task-state">EM EXECUÇÃO - ${w.nome}</div>
              <div class="task-timer live-timer-wp" data-worker-id="${w.id}">${formatTimeDiff(w.currentActionStartTime)}</div>
              <div class="task-desc">${currentT ? currentT.descricao : 'Tarefa desconhecida'}</div>
              <div class="task-meta">${eq ? eq.codigo : ''} &bull; ${currentT ? currentT.disciplina : ''}</div>
              ${currentT && currentT.fotoPeca ? `
                <div style="margin-bottom:15px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
                  <img src="${currentT.fotoPeca}" style="width:100%;height:120px;object-fit:cover;display:block;" />
                </div>
              ` : ''}
              
              ${currentT && !canExecuteTask(session, currentT) && w.matricula === session.matricula ? `
                <div class="action-buttons">
                  <div style="color:var(--color-danger);font-size:14px;font-weight:600;display:flex;align-items:center;gap:4px;">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                    Acesso Restrito ao Cargo
                  </div>
                </div>
              ` : `
              <div class="action-buttons">
                <button class="btn-action cancel" onclick="WorkerPanel.cancelWork('${w.id}')" style="background-color: var(--color-danger); color: white;">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  CANCELAR
                </button>
                <button class="btn-action pause" onclick="WorkerPanel.promptPause('${w.id}')">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  PAUSAR
                </button>
                <button class="btn-action complete" onclick="WorkerPanel.promptComplete('${w.id}')">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  CONCLUIR
                </button>
              </div>
              `}
            </div>
          `;
        } else if (state === 'Em Pausa') {
          return `
            <div class="active-task-card paused" style="margin-bottom: 15px;">
              <div class="task-state">EM PAUSA: ${w.currentPauseReason} - ${w.nome}</div>
              <div class="task-timer live-timer-wp" data-worker-id="${w.id}">${formatTimeDiff(w.currentActionStartTime)}</div>
              <div class="task-desc">${currentT ? currentT.descricao : ''}</div>
              <div class="task-meta">${eq ? eq.codigo : ''} &bull; Aguardando retomada</div>
              ${currentT && currentT.fotoPeca ? `
                <div style="margin-bottom:15px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
                  <img src="${currentT.fotoPeca}" style="width:100%;height:120px;object-fit:cover;display:block;" />
                </div>
              ` : ''}
              
              ${currentT && !canExecuteTask(session, currentT) && w.matricula === session.matricula ? `
                <div class="action-buttons">
                  <div style="color:var(--color-danger);font-size:14px;font-weight:600;display:flex;align-items:center;gap:4px;">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                    Acesso Restrito ao Cargo
                  </div>
                </div>
              ` : `
              <div class="action-buttons">
                <button class="btn-action cancel" onclick="WorkerPanel.cancelWork('${w.id}')" style="background-color: var(--color-danger); color: white;">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  CANCELAR
                </button>
                <button class="btn-action resume" onclick="WorkerPanel.resumeWork('${w.id}')">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  RETOMAR
                </button>
                <button class="btn-action complete" onclick="WorkerPanel.promptComplete('${w.id}')">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  CONCLUIR
                </button>
              </div>
              `}
            </div>
          `;
        }
        return '';
      }).join('');
    } else {
      statusPanelHtml = `
        <div class="active-task-card idle" style="margin-bottom: 15px;">
          <div class="task-state" style="color:var(--text-muted);font-weight:700;">OCIOSO</div>
          <p style="color:var(--text-secondary);font-size:14px;margin-top:10px;">Nenhuma tarefa em execução no momento. Escolha uma atividade na fila abaixo para iniciar seu trabalho.</p>
        </div>
      `;
    }

    // Horizontal Machines List
    const machinesHtml = `
      <div class="machines-scroll">
        ${myEqs.map(e => `
          <div class="machine-chip ${eqFilter === e.id ? 'active' : ''}" onclick="WorkerPanel.setEqFilter('${e.id}')">
            <strong>${e.codigo}</strong>
            <span>${e.pctAvanco || 0}%</span>
          </div>
        `).join('')}
        <div class="machine-chip ${!eqFilter ? 'active' : ''}" onclick="WorkerPanel.setEqFilter('')">
          <strong>TODAS AS MÁQUINAS</strong>
        </div>
      </div>
    `;

    // Tasks List
    let listTasks = myTasks.filter(t => t.status !== 'Concluída' && t.id !== myWorker.currentTaskId);
    
    listTasks.sort((a, b) => {
      const aCanExec = canExecuteTask(session, a) ? 1 : 0;
      const bCanExec = canExecuteTask(session, b) ? 1 : 0;
      return bCanExec - aCanExec;
    });

    const tasksHtml = listTasks.map(t => {
      const eq = eqs.find(e => e.id === t.equipmentId);
      const blockedBy = checkPredecessors(t, tasks);
      const isBlocked = blockedBy.length > 0;
      
      let actionBtn = '';
      if (t.status === 'Aguardando Peça' || t.status === 'Pausada') {
        const pauseReason = t.pauseReason || t.status;
        let timeStr = '';
        if (t.pauseStartTime) {
          timeStr = `<span class="live-pause-timer" data-start="${t.pauseStartTime}"> - ${formatTimeDiff(t.pauseStartTime)}</span>`;
        }
        actionBtn = `
          <div style="width:100%; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:12px;color:#ef4444;font-weight:600;display:flex;align-items:center;gap:4px;">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ${pauseReason}${timeStr}
            </div>
            <button class="btn btn-outline" style="width:100%;height:32px;border-color:var(--brand-primary);color:var(--brand-primary);" onclick="WorkerPanel.promptResumeTask('${t.id}')">RETOMAR TAREFA</button>
          </div>
        `;
      } else if (state === 'Ocioso' || (state === 'Trabalhando' && myWorker.currentTaskId !== t.id) || (state === 'Em Pausa' && myWorker.currentTaskId !== t.id)) {
        if (!canExecuteTask(session, t)) {
          actionBtn = `<div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px;"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>Apenas ${t.disciplina}</div>`;
        } else if (isBlocked) {
          actionBtn = `<div class="task-card-blocked">Bloqueada por: ${blockedBy.join(', ')}</div>`;
        } else {
          actionBtn = `<button class="btn-start-task" onclick="WorkerPanel.startPromptTask('${t.id}')">INICIAR AGORA</button>`;
        }
      }

      const priorityClass = t.prioridade === 'Crítica' ? 'prio-crit' : (t.prioridade === 'Alta' ? 'prio-high' : 'prio-med');

      return `
        <div class="task-card-v4">
          <div class="task-card-header">
            <span class="task-discipline">${t.disciplina || 'Geral'}</span>
            <span class="task-prio ${priorityClass}">${t.prioridade || 'Média'}</span>
          </div>
          ${t.fotoPeca ? `
          <div style="margin-top:10px;margin-bottom:10px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-card);">
            <img src="${t.fotoPeca}" style="width:100%;height:140px;object-fit:cover;display:block;" />
          </div>
          ` : ''}
          <div class="task-card-title">${t.descricao}</div>
          <div class="task-card-eq">${eq ? eq.codigo + ' - ' + eq.nome : 'Sem equipamento'}</div>
          <div class="task-card-footer">
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');

    return `
      <style>
        .wp-container { padding-bottom: 100px; animation: fadeIn 0.3s ease; }
        
        .active-task-card {
          margin-bottom: 24px; border-radius: 20px; padding: 24px; position: relative; overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05); color: #fff;
        }
        .active-task-card.working {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        .active-task-card.paused {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .active-task-card.idle {
          background: var(--bg-card); color: var(--text-primary); border: 2px dashed var(--border-card);
          box-shadow: none; text-align: center; padding: 30px 20px;
        }
        
        .pulse-indicator {
          position: absolute; top: 24px; right: 24px; width: 12px; height: 12px; border-radius: 50%;
          background: #10b981; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); animation: pulseGreen 2s infinite;
        }
        @keyframes pulseGreen {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        
        .task-state { font-size: 13px; font-weight: 800; letter-spacing: 1px; opacity: 0.9; margin-bottom: 8px; }
        .active-task-card.working .task-state { color: #38bdf8; }
        .active-task-card.paused .task-state { color: #fff; }
        
        .task-timer { font-size: 48px; font-weight: 900; font-family: 'Inter', sans-serif; letter-spacing: -1px; margin-bottom: 12px; line-height: 1; }
        .active-task-card.working .task-timer { color: #10b981; }
        .active-task-card.paused .task-timer { color: #fff; }
        
        .task-desc { font-size: 18px; font-weight: 600; line-height: 1.3; margin-bottom: 6px; }
        .task-meta { font-size: 14px; opacity: 0.7; margin-bottom: 24px; }
        
        .action-buttons { display: flex; gap: 12px; }
        .btn-action {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 16px; border-radius: 12px; font-size: 15px; font-weight: 800; border: none; cursor: pointer;
          transition: transform 0.1s, filter 0.1s;
        }
        .btn-action:active { transform: scale(0.96); }
        .btn-action svg { width: 20px; height: 20px; }
        
        .btn-action.pause { background: #f59e0b; color: #fff; }
        .btn-action.complete { background: #10b981; color: #fff; }
        .btn-action.resume { background: #0f172a; color: #fff; }
        
        .machines-scroll {
          display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; margin-bottom: 8px; scrollbar-width: none;
        }
        .machines-scroll::-webkit-scrollbar { display: none; }
        .machine-chip {
          flex-shrink: 0; padding: 12px 20px; background: var(--bg-card); border: 1px solid var(--border-card);
          border-radius: 100px; display: flex; gap: 12px; align-items: center; cursor: pointer; transition: all 0.2s;
        }
        .machine-chip strong { color: var(--text-primary); font-size: 14px; }
        .machine-chip span { background: var(--brand-primary-light); color: var(--brand-primary); padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
        .machine-chip.active { background: var(--brand-primary); border-color: var(--brand-primary); }
        .machine-chip.active strong, .machine-chip.active span { color: #fff; }
        .machine-chip.active span { background: rgba(255,255,255,0.2); }
        
        .task-card-v4 {
          background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 16px; padding: 20px;
          margin-bottom: 16px; transition: transform 0.2s;
        }
        .task-card-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .task-discipline { font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; }
        .task-prio { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
        .task-prio.prio-crit { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
        .task-prio.prio-high { background: rgba(245, 158, 11, 0.1); color: #d97706; }
        .task-prio.prio-med  { background: rgba(148, 163, 184, 0.1); color: #64748b; }
        
        .task-card-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.4; }
        .task-card-eq { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; display: flex; align-items: center; gap: 6px; }
        .task-card-eq::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--brand-primary); }
        
        .task-card-footer { display: flex; justify-content: flex-end; }
        .btn-start-task {
          background: transparent; color: var(--brand-primary); border: 2px solid var(--brand-primary);
          padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 800; cursor: pointer; width: 100%; transition: 0.2s;
        }
        .btn-start-task:active { background: var(--brand-primary); color: #fff; }
        
        .task-card-blocked {
          background: rgba(220, 38, 38, 0.05); color: #dc2626; padding: 10px 16px; border-radius: 8px;
          font-size: 12px; font-weight: 700; width: 100%; text-align: center; border: 1px dashed rgba(220, 38, 38, 0.3);
        }
      </style>

      <div class="wp-container">
        ${statusPanelHtml}

        <h3 style="font-size:14px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;margin-top:8px;">Suas Máquinas</h3>
        ${machinesHtml}

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;margin-top:24px;">
          <h3 style="font-size:14px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:0;">Fila de Tarefas Pendentes</h3>
          <button class="btn btn-primary btn-sm" onclick="WorkerPanel.openCreateTask()" style="font-weight:700;">+ Nova Tarefa</button>
        </div>
        
        ${listTasks.length > 0 ? tasksHtml : `
          <div style="text-align:center;padding:40px 20px;background:var(--bg-card);border:1px dashed var(--border-card);border-radius:16px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:48px;height:48px;margin:0 auto 16px;color:#cbd5e1;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            <div style="color:var(--text-primary);font-weight:700;font-size:16px;margin-bottom:4px;">Tudo limpo!</div>
            <div style="color:var(--text-secondary);font-size:14px;">Você não tem mais tarefas pendentes para hoje.</div>
          </div>
        `}
      </div>
      <div id="worker-panel-modals"></div>
    `;
  }

  function setEqFilter(id) {
    eqFilter = id;
    render();
    Router.navigate('worker-panel', { force: true });
  }

  // --- TASK MODALS (CREATE & EDIT) ---


  function openCreateTask(equipmentId) {
    const eqs = DB.equipment.list();
    const session = Auth.getSession();
    
    // Get only allocated machines
    const myEqs = getMyEquipments(session);

    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-new-task">
        <div class="modal" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Nova Tarefa</div>
            <button class="modal-close" onclick="closeModal('modal-worker-new-task')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              
              <div class="form-group">
                <label>Equipamento *</label>
                <select id="w-new-eq">
                  ${myEqs.map(e => `<option value="${e.id}" ${e.id === equipmentId ? 'selected' : ''}>${e.codigo} - ${e.nome}</option>`).join('')}
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Código da Tarefa</label>
                  <input id="w-new-cod" placeholder="Opcional" />
                </div>
              </div>

              <div class="form-group">
                <label>Descrição *</label>
                <input id="w-new-desc" placeholder="Descreva a atividade..." required />
              </div>

              <div class="form-row">
                <div class="form-group" style="display:none;">
                  <label>Disciplina</label>
                  <input value="${session.disciplina}" disabled style="opacity:0.6;cursor:not-allowed;background:var(--bg-base);" />
                </div>
                <div class="form-group">
                  <label>Responsável</label>
                  <input value="${session.nome}" disabled style="opacity:0.6;cursor:not-allowed;background:var(--bg-base);" />
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Prioridade</label>
                  <select id="w-new-prio">
                    <option>Média</option>
                    <option>Alta</option>
                    <option>Crítica</option>
                    <option>Baixa</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Status Inicial</label>
                  <select id="w-new-status">
                    <option>Não Iniciada</option>
                    <option>Em Andamento</option>
                    <option>Aguardando Peça</option>
                    <option>Bloqueada</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Início Planejado</label>
                  <input type="date" id="w-new-ip" value="${new Date().toISOString().slice(0,10)}" />
                </div>
                <div class="form-group">
                  <label>Término Planejado</label>
                  <input type="date" id="w-new-tp" value="${new Date().toISOString().slice(0,10)}" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Horas Planejadas</label>
                  <input type="number" id="w-new-hp" value="0" min="0" />
                </div>
                <div class="form-group" style="display:none;">
                  <label>Horas Realizadas</label>
                  <input type="number" id="w-new-hr" value="0" min="0" />
                </div>
              </div>

              <div class="checkbox-wrap" style="margin-top:var(--space-2)">
                <input type="checkbox" id="w-new-critico" />
                <label for="w-new-critico" style="cursor:pointer;color:var(--color-danger);font-weight:600;">Atividade no Caminho Crítico</label>
              </div>

              <div class="form-group" style="margin-top:var(--space-2)">
                <label>Observações Adicionais</label>
                <textarea id="w-new-obs" rows="2" placeholder="Detalhes da execução..."></textarea>
              </div>

            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-worker-new-task')">Cancelar</button>
            <button class="btn btn-primary" onclick="WorkerPanel.saveNewTask()">Criar Tarefa</button>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('worker-panel-modals');
    if (container) {
      container.innerHTML = modalHtml;
      openModal('modal-worker-new-task');
    }
  }

  function saveNewTask() {
    const session = Auth.getSession();
    const myWorker = getMyWorker(session);
    const desc = document.getElementById('w-new-desc').value.trim();
    if (!desc) {
      Toast.error('Erro', 'Descrição da atividade é obrigatória.');
      return;
    }

    const eqId = document.getElementById('w-new-eq').value;
    if (!eqId) {
      Toast.error('Erro', 'Selecione um equipamento.');
      return;
    }

    const status = document.getElementById('w-new-status').value;
    const data = {
      equipmentId: eqId,
      codigo: document.getElementById('w-new-cod').value.trim(),
      descricao: desc,
      disciplina: myWorker ? myWorker.disciplina : (session.disciplina || 'Geral'),
      responsavel: session.nome,
      prioridade: document.getElementById('w-new-prio').value,
      status,
      dataPlanejadaInicio: document.getElementById('w-new-ip').value,
      dataPlanejadaTermino: document.getElementById('w-new-tp').value,
      horasPlanejadas: parseFloat(document.getElementById('w-new-hp').value) || 0,
      horasRealizadas: document.getElementById('w-new-hr') ? (parseFloat(document.getElementById('w-new-hr').value) || 0) : 0,
      pctExecutado: document.getElementById('w-new-pct') ? (parseInt(document.getElementById('w-new-pct').value) || 0) : 0,
      critico: document.getElementById('w-new-critico').checked,
      observacoes: document.getElementById('w-new-obs').value.trim() ? JSON.stringify([{
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        text: document.getElementById('w-new-obs').value.trim(),
        user: session.nome,
        userId: session.userId,
        createdAt: new Date().toISOString()
      }]) : '[]',
      predecessoras: [],
      createdAt: DB.now()
    };

    if (status === 'Concluída') {
      data.pctExecutado = 100;
      data.dataRealTermino = new Date().toISOString().slice(0, 10);
    }

    DB.tasks.create(data);
    
    // Novo Fluxo: Teste gera Retrabalho
    if (data.disciplina === 'Teste') {
      const retrabalhoData = {
        ...data,
        id: undefined, // ensure new ID
        disciplina: 'Retrabalho',
        descricao: '[RETRABALHO] ' + data.descricao,
        status: 'Pendente',
        pctExecutado: 0,
        horasRealizadas: 0,
        responsavel: ''
      };
      DB.tasks.create(retrabalhoData);
    }

    Toast.success('Sucesso', 'Nova tarefa criada.');
    closeModal('modal-worker-new-task');
    Router.navigate('worker-panel', { force: true });
  }

  function openEditTask(id) {
    const t = DB.tasks.get(id);
    if (!t) return;

    let obsHistoryHtml = '';
    let obsTextValue = '';
    if (t.observacoes) {
      let isJson = false;
      try {
        const comments = JSON.parse(t.observacoes);
        if (Array.isArray(comments)) {
          isJson = true;
          obsHistoryHtml = `<div style="max-height: 80px; overflow-y: auto; font-size: 11px; margin-bottom: 8px; border: 1px solid var(--border-default); padding: 4px; border-radius: 4px; background: var(--bg-base);">
            ${comments.map(c => `
              <div style="margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.02);">
                <span style="font-weight:bold;color:var(--brand-primary-light);">${c.user}:</span> ${c.text}
                <span style="font-size:9px;color:var(--text-muted);display:block;">${new Date(c.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            `).join('')}
          </div>`;
        }
      } catch (e) {}
      
      if (!isJson) {
        obsTextValue = t.observacoes;
      }
    }

    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-task">
        <div class="modal modal-lg" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Apontar Atividade</div>
            <button class="modal-close" onclick="closeModal('modal-worker-task')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div class="form-group">
                <label>Atividade (Descrição)</label>
                <input value="${t.descricao}" disabled style="opacity:0.6;background:var(--bg-base);cursor:not-allowed;" />
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Status</label>
                  <select id="w-tk-status" onchange="const p=document.getElementById('w-tk-photo-group'); if(this.value==='Concluída'){p.style.display='block';}else{p.style.display='none';}">
                    ${['Não Iniciada','Em Andamento','Aguardando Peça','Aguardando Recurso','Aguardando Aprovação','Bloqueada','Concluída'].map(s => 
                      `<option ${t.status === s ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                  </select>
                </div>
                <div class="form-group" style="display:none;">
                  <label>Horas Realizadas</label>
                  <input type="number" id="w-tk-hr" value="${t.horasRealizadas||0}" min="0" step="0.5" />
                </div>
              </div>

              <div class="form-group">
                <label>% Executado: <span id="w-tk-pct-val">${t.pctExecutado||0}</span>%</label>
                <input type="range" id="w-tk-pct" min="0" max="100" value="${t.pctExecutado||0}" oninput="document.getElementById('w-tk-pct-val').textContent=this.value" />
              </div>

              <div style="border-top:1px solid var(--border-card);padding-top:var(--space-3);margin-top:var(--space-1);">
                <div style="font-size:var(--text-xs);color:var(--color-warning);margin-bottom:var(--space-2);font-weight:700;">
                  ⚠️ Alteração de datas planejadas exige justificativa de reprogramação obrigatória.
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Início Planejado</label>
                    <input type="date" id="w-tk-ip" value="${toDateInput(t.dataPlanejadaInicio)}" />
                  </div>
                  <div class="form-group">
                    <label>Término Planejado</label>
                    <input type="date" id="w-tk-tp" value="${toDateInput(t.dataPlanejadaTermino)}" />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Observações</label>
                ${obsHistoryHtml}
                <textarea id="w-tk-obs" rows="2" placeholder="${obsHistoryHtml ? 'Adicionar nova observação...' : 'Observações...'}">${obsTextValue}</textarea>
              </div>

              <div class="form-group" id="w-tk-photo-group" style="display:${t.status === 'Concluída' ? 'block' : 'none'}; background:rgba(59,130,246,0.05); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid rgba(59,130,246,0.2);">
                <label style="color:var(--brand-primary-light);font-weight:700;">📸 Foto de Comprovação (Obrigatória)</label>
                <input type="file" id="w-tk-photo" accept="image/*" capture="environment" class="form-control" style="margin-top:4px;" />
                <input type="hidden" id="w-tk-photo-b64" value="${t.fotoComprovacao || ''}" />
                <div id="w-tk-photo-preview" style="margin-top:8px; width:100%; border-radius:8px; overflow:hidden; display:${t.fotoComprovacao ? 'block' : 'none'};">
                  <img id="w-tk-photo-img" src="${t.fotoComprovacao || ''}" style="width:100%; max-height:250px; object-fit:contain; background:#000;" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-worker-task')">Cancelar</button>
            <button class="btn btn-primary" onclick="WorkerPanel.saveEditedTask('${t.id}')">Salvar</button>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('worker-panel-modals');
    if (container) {
      container.innerHTML = modalHtml;
      openModal('modal-worker-task');

      // Add listener for file input to convert to base64
      const fileInput = document.getElementById('w-tk-photo');
      fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        compressImage(file, function(b64) {
          document.getElementById('w-tk-photo-b64').value = b64;
          document.getElementById('w-tk-photo-img').src = b64;
          document.getElementById('w-tk-photo-preview').style.display = 'block';
        });
      });
    }
  }

  function saveEditedTask(id) {
    const t = DB.tasks.get(id);
    if (!t) return;
    
    if (t.status === 'Concluída') {
      const session = window.Auth.getSession();
      if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
        Toast.error('Acesso Negado', 'Somente o Administrador do Sistema pode editar tarefas já concluídas.');
        return;
      }
    }

    const status = document.getElementById('w-tk-status').value;
    const pct = parseInt(document.getElementById('w-tk-pct').value) || 0;
    const hr = parseFloat(document.getElementById('w-tk-hr').value) || 0;
    const ip = document.getElementById('w-tk-ip').value;
    const tp = document.getElementById('w-tk-tp').value;
    const obs = document.getElementById('w-tk-obs').value.trim();
    const photoB64 = document.getElementById('w-tk-photo-b64').value;

    if (status === 'Concluída' && !photoB64) {
      window.Toast.error('Foto Obrigatória', 'Para concluir a atividade, é obrigatório tirar uma foto para comprovação.');
      return;
    }

    const dateChanged = (t.dataPlanejadaInicio !== ip || t.dataPlanejadaTermino !== tp);
    const statusChanged = (t.status !== status);
    const pctChanged = (t.pctExecutado !== pct);
    const hrChanged = (t.horasRealizadas !== hr);
    let justification = '';

    if (dateChanged) {
      const promptJust = prompt(
        `Justificativa de Reprogramação Obrigatória:\nModificando data de início/término da atividade:\nAnterior: ${formatDate(t.dataPlanejadaInicio)} a ${formatDate(t.dataPlanejadaTermino)}\nNova: ${formatDate(ip)} a ${formatDate(tp)}\n\nPor favor, digite o motivo:`
      );
      if (promptJust === null) return; // user cancelled saving task

      justification = promptJust.trim();
      if (!justification) {
        Toast.error('Erro', 'A justificativa de reprogramação é obrigatória para salvar as novas datas.');
        return;
      }
    }

    const session = Auth.getSession();
    const today = new Date().toISOString().slice(0, 10);
    const dateStr = new Date().toLocaleString('pt-BR');

    // Build changes log
    let changesLog = [];
    if (statusChanged) changesLog.push(`Status: "${t.status}" -> "${status}"`);
    if (pctChanged) changesLog.push(`Progresso: ${t.pctExecutado}% -> ${pct}%`);
    if (hrChanged) changesLog.push(`Horas Trab: ${t.horasRealizadas}h -> ${hr}h`);
    if (dateChanged) changesLog.push(`Reprogramado para: ${formatDate(ip)} a ${formatDate(tp)}`);

    let finalObs = '';
    let comments = [];
    let isJson = false;
    if (t.observacoes) {
      try {
        comments = JSON.parse(t.observacoes);
        if (Array.isArray(comments)) isJson = true;
      } catch (e) {}
    }

    if (isJson) {
      if (obs) {
        comments.push({
          id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          text: obs,
          user: session.nome,
          userId: session.userId,
          createdAt: new Date().toISOString()
        });
      }
      if (changesLog.length > 0) {
        let logMsg = `[Mapeamento Atualizado]: ${changesLog.join(' | ')}`;
        if (dateChanged && justification) {
          logMsg += ` (Motivo: ${justification})`;
        }
        comments.push({
          id: 'c-sys-' + Date.now(),
          text: logMsg,
          user: 'Sistema',
          userId: 'system',
          createdAt: new Date().toISOString()
        });
      }
      finalObs = JSON.stringify(comments);
    } else {
      let logText = '';
      if (changesLog.length > 0) {
        logText = `\n[Atualizado em ${dateStr} por ${session.nome}]: ${changesLog.join(' | ')}`;
        if (dateChanged && justification) {
          logText += ` (Motivo: ${justification})`;
        }
      }
      finalObs = (obs || t.observacoes || '') + logText;
    }

    const data = {
      status,
      pctExecutado: (status === 'Concluída') ? 100 : pct,
      horasRealizadas: hr,
      dataPlanejadaInicio: ip,
      dataPlanejadaTermino: tp,
      observacoes: finalObs,
      fotoComprovacao: photoB64 || t.fotoComprovacao
    };

    if (status === 'Concluída') {
      data.pctExecutado = 100;
      data.dataRealTermino = t.dataRealTermino || today;
      if (activeTimer && activeTimer.taskId === id) {
        saveTimer(null);
      }
      if (t.solicitacaoId && DB.solicitacoes) {
        DB.solicitacoes.update(t.solicitacaoId, { status: 'Concluída', finalizadoAt: DB.now() });
        const sol = DB.solicitacoes.list().find(s => s.id === t.solicitacaoId);
        if (sol && DB.notifications) {
          DB.notifications.add({
            userId: sol.solicitanteId,
            title: 'Serviço Concluído',
            message: `O serviço '${sol.descricao}' foi finalizado pelo setor ${sol.setorDestino}.`,
            type: 'info',
            read: false,
            createdAt: DB.now()
          });
        }
      }
    }

    DB.tasks.update(id, data);
    Toast.success('Tarefa Atualizada!', 'As alterações foram registradas com sucesso.');
    closeModal('modal-worker-task');
    Router.navigate('worker-panel', { force: true });
  }

  // --- PARTS REQUESTS ---

  function openRequestPart(equipmentId) {
    const eqs = DB.equipment.list();
    const session = Auth.getSession();
    
    // Get only alocated machines
    const myEqs = getMyEquipments(session);

    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-part">
        <div class="modal" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Solicitar Peça</div>
            <button class="modal-close" onclick="closeModal('modal-worker-part')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div class="form-group">
                <label>Equipamento *</label>
                <select id="w-pt-eq">
                  ${myEqs.map(e => `<option value="${e.id}" ${e.id === equipmentId ? 'selected' : ''}>${e.codigo} - ${e.nome}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Descrição da Peça *</label>
                <input id="w-pt-desc" placeholder="Ex: Filtro de ar primário" required />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Part Number / Código</label>
                  <input id="w-pt-pn" placeholder="Ex: PN-98765" />
                </div>
                <div class="form-group">
                  <label>Quantidade *</label>
                  <input type="number" id="w-pt-qty" value="1" min="1" required />
                </div>
              </div>
              
              <div class="checkbox-wrap">
                <input type="checkbox" id="w-pt-critica" />
                <label for="w-pt-critica" style="cursor:pointer;">Peça Crítica (Bloqueia o equipamento)</label>
              </div>

              <div class="form-group">
                <label>Observações / Justificativa</label>
                <textarea id="w-pt-obs" rows="3" placeholder="Informações adicionais para o PCM..."></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-worker-part')">Cancelar</button>
            <button class="btn btn-primary" onclick="WorkerPanel.savePartRequest()">Enviar Solicitação</button>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('worker-panel-modals');
    if (container) {
      container.innerHTML = modalHtml;
      openModal('modal-worker-part');
    }
  }

  function savePartRequest() {
    const desc = document.getElementById('w-pt-desc').value.trim();
    if (!desc) {
      Toast.error('Erro', 'Descrição da peça é obrigatória.');
      return;
    }

    const eqId = document.getElementById('w-pt-eq').value;
    const pn = document.getElementById('w-pt-pn').value.trim();
    const qty = parseInt(document.getElementById('w-pt-qty').value) || 1;
    const obs = document.getElementById('w-pt-obs').value.trim();

    const data = {
      equipmentId: eqId,
      descricao: `Qtd: ${qty}x — ${desc}`,
      codigo: pn,
      status: 'Solicitada',
      critica: document.getElementById('w-pt-critica').checked,
      fornecedor: 'Solicitado pelo Executante',
      fabricante: '',
      prazoEntrega: '',
      pedido: '',
      observacoes: obs,
      createdAt: DB.now()
    };

    DB.parts.create(data);
    Toast.success('Solicitação Enviada!', `Peça "${desc}" cadastrada com status Solicitada.`);
    closeModal('modal-worker-part');
    Router.navigate('worker-panel', { force: true });
  }

  // --- SERVICE REQUESTS ---

  function openRequestService(equipmentId) {
    const eqs = DB.equipment.list();
    const session = Auth.getSession();
    
    // Get only allocated machines
    const myEqs = getMyEquipments(session);

    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-service">
        <div class="modal" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Solicitar Serviço</div>
            <button class="modal-close" onclick="closeModal('modal-worker-service')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div class="form-group">
                <label>Equipamento *</label>
                <select id="w-sv-eq">
                  ${myEqs.map(e => `<option value="${e.id}" ${e.id === equipmentId ? 'selected' : ''}>${e.codigo} - ${e.nome}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Setor Destino *</label>
                <select id="w-sv-setor">
                  <option value="Usinagem">Usinagem</option>
                  <option value="Mecânica">Mecânica</option>
                  <option value="Teste">Teste</option>
                  <option value="Retrabalho">Retrabalho</option>
                  <option value="Caldeiraria">Caldeiraria</option>
                  <option value="Elétrica">Elétrica</option>
                </select>
              </div>
              <div class="form-group">
                <label>Descrição do Serviço / Peça *</label>
                <input id="w-sv-desc" placeholder="Descreva com detalhes o serviço..." required />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Prazo / Data Desejada *</label>
                  <input type="date" id="w-sv-prazo" required value="${new Date().toISOString().slice(0, 10)}" />
                </div>
              </div>
              <div class="checkbox-wrap">
                <input type="checkbox" id="w-sv-critica" />
                <label for="w-sv-critica" style="cursor:pointer;color:var(--color-danger);font-weight:600;">Serviço Crítico (Bloqueia o andamento)</label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-worker-service')">Cancelar</button>
            <button class="btn btn-primary" onclick="WorkerPanel.saveRequestService()">Enviar Solicitação</button>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('worker-panel-modals');
    if (container) {
      container.innerHTML = modalHtml;
      openModal('modal-worker-service');
    }
  }

  function saveRequestService() {
    const session = Auth.getSession();
    const desc = document.getElementById('w-sv-desc').value.trim();
    if (!desc) {
      Toast.error('Erro', 'Descrição do serviço é obrigatória.');
      return;
    }

    const eqId = document.getElementById('w-sv-eq').value;
    const setor = document.getElementById('w-sv-setor').value;
    const prazo = document.getElementById('w-sv-prazo').value;
    const critica = document.getElementById('w-sv-critica').checked;

    const data = {
      id: 'sol-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      equipmentId: eqId,
      solicitanteId: session.userId,
      solicitanteNome: session.nome,
      descricao: desc,
      setorDestino: setor,
      prazo: prazo,
      critico: critica,
      status: setor === 'Usinagem' ? 'Aguardando Aprovação PCM' : 'Aguardando Encarregado',
      createdAt: DB.now()
    };

    if (DB.solicitacoes) {
      DB.solicitacoes.add(data);
    }

    Toast.success('Serviço Solicitado!', 'A solicitação foi enviada com sucesso para o setor.');
    closeModal('modal-worker-service');
    Router.navigate('worker-panel', { force: true });
  }

  // --- IMPEDIMENT RESTRICTIONS ---

  function openReportRestriction(equipmentId) {
    const eqs = DB.equipment.list();
    const session = Auth.getSession();
    const myEqs = getMyEquipments(session);

    const activeEqId = equipmentId || (myEqs.length > 0 ? myEqs[0].id : '');
    const tasks = DB.tasks.getAll().filter(t => t.equipmentId === activeEqId);
    
    const tipos = ['Falta de Peça','Falta de Mão de Obra','Falta de Ferramenta','Aguardando Aprovação','Equipamento Não Liberado','Dependência Não Concluída','Outra'];

    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-restriction">
        <div class="modal modal-lg" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Registrar Impedimento (Restrição)</div>
            <button class="modal-close" onclick="closeModal('modal-worker-restriction')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div class="form-row">
                <div class="form-group">
                  <label>Equipamento *</label>
                  <select id="w-rs-eq" onchange="WorkerPanel.updateRestrictionTasks(this.value)">
                    ${myEqs.map(e => `<option value="${e.id}" ${e.id === activeEqId ? 'selected' : ''}>${e.codigo} - ${e.nome}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Tipo de Impedimento *</label>
                  <select id="w-rs-tipo">
                    ${tipos.map(t => `<option>${t}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Tarefa Bloqueada por este Impedimento</label>
                <select id="w-rs-task">
                  <option value="">Nenhuma tarefa específica</option>
                  ${tasks.map(t => `<option value="${t.id}">${t.codigo ? t.codigo + ' - ' : ''}${t.descricao}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label>Descrição do Impedimento / Detalhes *</label>
                <textarea id="w-rs-desc" rows="4" placeholder="Descreva o que está impedindo a execução do serviço (ex: aguardando junta de vedação, sem guindaste alocado)..." required></textarea>
              </div>

              <div class="checkbox-wrap">
                <input type="checkbox" id="w-rs-critico" />
                <label for="w-rs-critico" style="cursor:pointer;">Esta restrição impacta o caminho crítico (atrasa a liberação)</label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-worker-restriction')">Cancelar</button>
            <button class="btn btn-primary" onclick="WorkerPanel.saveRestriction()">Registrar</button>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('worker-panel-modals');
    if (container) {
      container.innerHTML = modalHtml;
      openModal('modal-worker-restriction');
    }
  }

  function updateRestrictionTasks(eqId) {
    const select = document.getElementById('w-rs-task');
    if (!select) return;
    const tasks = DB.tasks.getAll().filter(t => t.equipmentId === eqId);
    select.innerHTML = '<option value="">Nenhuma tarefa específica</option>' +
      tasks.map(t => `<option value="${t.id}">${t.codigo ? t.codigo + ' - ' : ''}${t.descricao}</option>`).join('');
  }

  function saveRestriction() {
    const desc = document.getElementById('w-rs-desc').value.trim();
    if (!desc) {
      Toast.error('Erro', 'Descrição do impedimento é obrigatória.');
      return;
    }

    const eqId = document.getElementById('w-rs-eq').value;
    const tipo = document.getElementById('w-rs-tipo').value;
    const taskId = document.getElementById('w-rs-task').value;
    const critico = document.getElementById('w-rs-critico').checked;
    const session = Auth.getSession();

    const task = DB.tasks.get(taskId);
    const taskDesc = task ? (task.codigo ? task.codigo + ' - ' : '') + task.descricao : '';

    const data = {
      tipo,
      descricao: desc,
      equipmentId: eqId,
      disciplina: session.disciplina,
      tarefaBloqueada: taskDesc,
      impactoCaminhosCriticos: critico,
      status: 'Aberta'
    };

    DB.restrictions.create(data);
    Toast.success('Impedimento Registrado!', 'O PCM e Supervisão foram alertados sobre a restrição.');
    closeModal('modal-worker-restriction');
    Router.navigate('worker-panel', { force: true });
  }

  return {
    render,
    setEqFilter,
    openCreateTask,
    saveNewTask,
    openEditTask,
    saveEditedTask,
    openRequestPart,
    savePartRequest,
    openRequestService,
    saveRequestService,
    openReportRestriction,
    updateRestrictionTasks,
    saveRestriction,
    startTask,
    startPromptTask,
    addExecutorInput,
    confirmStartTaskWithJustification,
    promptPause,
    pauseWork,
    resumeWork,
    cancelWork,
    promptResumeTask,
    submitResumeTask,
    promptMissingParts,
    submitMissingParts,
    promptOtherReason,
    submitOtherReason,
    promptComplete,
    previewPhoto,
    finalizeTask,
    getMyEquipments,
    compressImage
  };
})();
// ================================================================
// NEW MODULES FOR WORKER PARTS & SERVICES PAGES
// ================================================================

window.WorkerParts = (() => {
  function render() {
    const session = window.Auth.getSession();
    if (!session || session.perfil !== 'Executante') return `<div class="page-container">Acesso restrito.</div>`;

    const eqs = window.DB.equipment.list() || [];
    const myEqs = window.WorkerPanel.getMyEquipments(session);

    if (myEqs.length === 0) {
      return `
        <div class="page-container" style="animation:fadeIn 0.3s ease;">
          <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-6);">Solicitar Peças</h1>
          <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-xl);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;margin:0 auto var(--space-4);color:var(--text-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h3 style="color:var(--text-primary);font-weight:600;">Sem Equipamento Alocado</h3>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:8px;">Você precisa estar alocado em um equipamento para solicitar peças.</p>
          </div>
        </div>
      `;
    }

    setTimeout(() => {
      document.getElementById('btn-w-pt-save').addEventListener('click', () => {
        const desc = document.getElementById('w-pt-desc').value.trim();
        if (!desc) {
          window.Toast.error('Erro', 'Descrição da peça é obrigatória.');
          return;
        }

        const eqId = document.getElementById('w-pt-eq').value;
        const pn = document.getElementById('w-pt-pn').value.trim();
        const qty = parseInt(document.getElementById('w-pt-qty').value) || 1;
        const obs = document.getElementById('w-pt-obs').value.trim();

        const data = {
          equipmentId: eqId,
          descricao: `Qtd: ${qty}x — ${desc}`,
          codigo: pn,
          status: 'Solicitada',
          critica: document.getElementById('w-pt-critica').checked,
          fornecedor: 'Solicitado pelo Executante',
          fabricante: '',
          prazoEntrega: '',
          pedido: '',
          observacoes: obs,
          createdAt: window.DB.now()
        };

        window.DB.parts.create(data);
        window.Toast.success('Solicitação Enviada!', `Peça "${desc}" cadastrada com status Solicitada.`);
        document.getElementById('w-pt-desc').value = '';
        document.getElementById('w-pt-pn').value = '';
        document.getElementById('w-pt-qty').value = '1';
        document.getElementById('w-pt-obs').value = '';
      });
    }, 100);

    return `
      <div class="page-container" style="animation:fadeIn 0.3s ease;">
        <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-2);">Solicitar Falta de Peça</h1>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-6);">Informe as peças necessárias para o andamento do seu serviço.</p>
        
        <div class="card" style="max-width:600px;background:var(--bg-card);border:1px solid var(--border-card);">
          <div style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div class="form-group">
              <label>Equipamento *</label>
              <select id="w-pt-eq" class="form-control">
                ${myEqs.map(e => `<option value="${e.id}">${e.codigo} - ${e.nome}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Descrição da Peça *</label>
              <input id="w-pt-desc" class="form-control" placeholder="Ex: Filtro de ar primário" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Part Number / Código</label>
                <input id="w-pt-pn" class="form-control" placeholder="Ex: PN-98765" />
              </div>
              <div class="form-group">
                <label>Quantidade *</label>
                <input type="number" id="w-pt-qty" class="form-control" value="1" min="1" required />
              </div>
            </div>
            
            <div class="checkbox-wrap" style="background:rgba(255,179,0,0.1);border:1px solid rgba(255,179,0,0.3);padding:var(--space-3);border-radius:var(--radius-md);">
              <input type="checkbox" id="w-pt-critica" />
              <label for="w-pt-critica" style="cursor:pointer;color:var(--color-warning);font-weight:600;">Peça Crítica (Bloqueia o equipamento)</label>
            </div>

            <div class="form-group">
              <label>Observações / Justificativa</label>
              <textarea id="w-pt-obs" class="form-control" rows="3" placeholder="Informações adicionais para o PCM..."></textarea>
            </div>
            
            <div style="margin-top:var(--space-4);text-align:right;">
              <button class="btn btn-primary" id="btn-w-pt-save" style="width:100%;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;margin-right:8px;display:inline-block;vertical-align:middle;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
                Enviar Solicitação de Peça
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return { render };
})();

window.WorkerServices = (() => {
  function render() {
    const session = window.Auth.getSession();
    if (!session || session.perfil !== 'Executante') return `<div class="page-container">Acesso restrito.</div>`;

    const eqs = window.DB.equipment.list() || [];
    const myEqs = window.WorkerPanel.getMyEquipments(session);

    if (myEqs.length === 0) {
      return `
        <div class="page-container" style="animation:fadeIn 0.3s ease;">
          <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-6);">Solicitar Serviço de Terceiro</h1>
          <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-xl);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;margin:0 auto var(--space-4);color:var(--text-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h3 style="color:var(--text-primary);font-weight:600;">Sem Equipamento Alocado</h3>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:8px;">Você precisa estar alocado em um equipamento para solicitar serviços.</p>
          </div>
        </div>
      `;
    }

    const allSols = window.DB.solicitacoes ? window.DB.solicitacoes.list() : [];
    const myHistory = allSols.filter(s => s.origem.includes(session.nome)).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    let historyHtml = '';
    if (myHistory.length > 0) {
      historyHtml = `
        <div class="card" style="margin-top:var(--space-6);background:var(--bg-card);border:1px solid var(--border-card);max-width:800px;">
          <h2 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-4);">Histórico de Solicitações</h2>
          <div style="overflow-x:auto;">
            <table class="table" style="width:100%;text-align:left;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid var(--border-card);">
                  <th style="padding:10px;font-size:12px;color:var(--text-muted);">DATA</th>
                  <th style="padding:10px;font-size:12px;color:var(--text-muted);">SETOR</th>
                  <th style="padding:10px;font-size:12px;color:var(--text-muted);">DESCRIÇÃO</th>
                  <th style="padding:10px;font-size:12px;color:var(--text-muted);">STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${myHistory.map(s => {
                  let badge = 'badge-ghost';
                  if (s.status.includes('PCM')) badge = 'badge-warning';
                  else if (s.status.includes('Encarregado')) badge = 'badge-primary';
                  else if (s.status === 'Em Execução') badge = 'badge-info';
                  else if (s.status === 'Concluída') badge = 'badge-success';
                  
                  return `
                  <tr style="border-bottom:1px solid var(--border-card);">
                    <td style="padding:10px;white-space:nowrap;color:var(--text-secondary);font-size:13px;">${new Date(s.createdAt).toLocaleDateString()}</td>
                    <td style="padding:10px;font-weight:600;font-size:14px;">${s.destino}</td>
                    <td style="padding:10px;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;" title="${s.descricao}">${s.descricao}</td>
                    <td style="padding:10px;"><span class="badge ${badge}" style="font-size:11px;">${s.status}</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    setTimeout(() => {
      document.getElementById('w-sv-photo')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          window.WorkerPanel.compressImage(file, function(b64) {
            document.getElementById('w-sv-photo-preview').src = b64;
            document.getElementById('w-sv-photo-preview-container').style.display = 'block';
            window._tempSvPhoto = b64;
          });
        }
      });

      document.getElementById('btn-w-sv-save')?.addEventListener('click', () => {
        const desc = document.getElementById('w-sv-desc').value.trim();
        const dest = document.getElementById('w-sv-dest').value;

        if (!desc) {
          window.Toast.error('Erro', 'Descrição do serviço é obrigatória.');
          return;
        }
        if (!dest) {
          window.Toast.error('Erro', 'Setor de destino é obrigatório.');
          return;
        }
        if (!window._tempSvPhoto) {
          window.Toast.error('Erro', 'É obrigatório anexar a foto da peça.');
          return;
        }

        const eqId = document.getElementById('w-sv-eq').value;
        const statusReq = (dest === 'Usinagem') ? 'Aguardando Aprovação PCM' : 'Aguardando Encarregado';
        
        const payload = {
          id: window.DB.uid('sol'),
          origem: 'Executante (' + session.nome + ')',
          destino: dest,
          equipmentId: eqId,
          descricao: desc,
          fotoPeca: window._tempSvPhoto,
          status: statusReq,
          createdAt: window.DB.now(),
          updatedAt: window.DB.now()
        };

        window.DB.solicitacoes.add(payload);
        const msg = (dest === 'Usinagem') ? `Solicitação para Usinagem enviada ao PCM para aprovação.` : `Solicitação enviada direto para o encarregado de ${dest}.`;
        window.Toast.success('Enviado!', msg);
        window._tempSvPhoto = null; // Clear temp photo
        window.Router.navigate('worker-services', { force: true });
      });
    }, 100);

    return `
      <div class="page-container" style="animation:fadeIn 0.3s ease;">
        <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-2);">Solicitar Serviço Externo</h1>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-6);">Abra uma requisição para outros setores de manutenção (Usinagem, Elétrica, etc).</p>

        <div class="card" style="max-width:800px;background:var(--bg-card);border:1px solid var(--border-card);">
          <div style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div class="form-group">
              <label>Equipamento *</label>
              <select id="w-sv-eq" class="form-control">
                ${myEqs.map(e => `<option value="${e.id}">${e.codigo} - ${e.nome}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Setor de Destino *</label>
              <select id="w-sv-dest" class="form-control">
                <option value="">Selecione o setor...</option>
                <option value="Usinagem">Usinagem</option>
                <option value="Caldeiraria">Caldeiraria</option>
                <option value="Mecânica">Mecânica</option>
                <option value="Teste">Teste</option>
                <option value="Retrabalho">Retrabalho</option>
                <option value="Elétrica">Elétrica</option>
                <option value="Lubrificação">Lubrificação</option>
              </select>
            </div>
            <div class="form-group">
              <label>Descrição do que precisa ser feito *</label>
              <textarea id="w-sv-desc" class="form-control" rows="3" placeholder="Detalhe a necessidade..."></textarea>
            </div>
            
            <div class="form-group">
              <label>Foto da Peça / Serviço *</label>
              <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Obrigatório tirar foto para a aprovação e visualização do Torneiro/Encarregado.</p>
              <div class="file-upload-wrapper" style="position:relative;display:inline-block;width:100%;">
                <button type="button" class="btn btn-outline" style="width:100%;border-style:dashed;color:var(--text-secondary);" onclick="document.getElementById('w-sv-photo').click()">
                  📸 Tirar Foto ou Anexar
                </button>
                <input type="file" id="w-sv-photo" accept="image/*" capture="environment" style="display:none;" />
              </div>
              <div id="w-sv-photo-preview-container" style="display:none;margin-top:10px;text-align:center;">
                <img id="w-sv-photo-preview" style="max-width:100%;max-height:250px;border-radius:var(--radius-md);box-shadow:var(--shadow-sm);" />
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:10px;">
              <button id="btn-w-sv-save" class="btn btn-primary" style="width:100%;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
                Enviar Solicitação
              </button>
            </div>
          </div>
        </div>

        ${historyHtml}
      </div>
    `;
  }
  return { render };
})();

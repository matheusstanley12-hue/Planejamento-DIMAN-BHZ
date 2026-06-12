/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Worker Panel (Executante)
   ============================================================ */

window.WorkerPanel = (() => {
  let activeTab = 'hoje'; // 'atrasadas' | 'hoje' | 'futuras' | 'concluidas'
  let eqFilter = '';
  let activeTimer = null; // { taskId, startTime }

  // Load timer state from localStorage on startup
  try {
    const saved = localStorage.getItem('diman_worker_timer');
    if (saved) activeTimer = JSON.parse(saved);
  } catch (e) {
    console.error('Error loading worker timer:', e);
  }

  function saveTimer(timer) {
    activeTimer = timer;
    if (timer) {
      localStorage.setItem('diman_worker_timer', JSON.stringify(timer));
    } else {
      localStorage.removeItem('diman_worker_timer');
    }
  }

  function checkPredecessors(task, allTasks) {
    const preds = task.predecessoras || [];
    const blockedBy = [];
    preds.forEach(pid => {
      const pTask = allTasks.find(t => t.id === pid);
      if (pTask && pTask.status !== 'Concluída') {
        blockedBy.push(pTask.codigo || pTask.descricao);
      }
    });
    return blockedBy;
  }

  function render() {
    const session = Auth.getSession();
    if (!session || session.perfil !== 'Executante') {
      return `
        <div class="page-container">
          <div class="empty-state">
            <h3>Acesso Restrito</h3>
            <p>Este painel é exclusivo para Executantes cadastrados.</p>
          </div>
        </div>
      `;
    }

    // Clear global filter to avoid conflicts with worker-specific lists
    window.GlobalEqFilter = '';

    const eqs = DB.equipment.list();
    const tasks = DB.tasks.getAll();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Get the current worker object
    const workers = DB.workforce.list();
    const myWorker = workers.find(w => w.nome === session.nome);
    const myDirectEqId = myWorker ? myWorker.equipmentId : null;

    // Get equipments where the worker is listed in the workforceMap OR is directly assigned
    const myEqs = eqs.filter(e => {
      const map = e.workforceMap || {};
      return Object.values(map).includes(session.nome) || e.id === myDirectEqId;
    });

    const myEqIds = myEqs.map(e => e.id);

    // Get tasks for those equipments OR tasks assigned directly to this worker
    let myTasks = tasks.filter(t => myEqIds.includes(t.equipmentId) || t.responsavel === session.nome);

    // Calculate overall metrics BEFORE applying equipment filter
    const totalAtrasadas = myTasks.filter(t => t.status !== 'Concluída' && t.dataPlanejadaTermino && t.dataPlanejadaTermino < todayStr).length;
    const totalHoje = myTasks.filter(t => t.status !== 'Concluída' && 
      (!t.dataPlanejadaTermino || t.dataPlanejadaTermino >= todayStr) && 
      (!t.dataPlanejadaInicio || t.dataPlanejadaInicio <= todayStr)
    ).length;
    const totalConcluidas = myTasks.filter(t => t.status === 'Concluída').length;

    // Apply equipment filter if active
    if (eqFilter) {
      myTasks = myTasks.filter(t => t.equipmentId === eqFilter);
    }

    // Categorize filtered tasks
    const atrasadas = myTasks.filter(t => t.status !== 'Concluída' && t.dataPlanejadaTermino && t.dataPlanejadaTermino < todayStr);
    const concluidas = myTasks.filter(t => t.status === 'Concluída');
    const futuras = myTasks.filter(t => t.status !== 'Concluída' && t.dataPlanejadaInicio && t.dataPlanejadaInicio > todayStr);
    const hoje = myTasks.filter(t => t.status !== 'Concluída' && 
      (!t.dataPlanejadaTermino || t.dataPlanejadaTermino >= todayStr) && 
      (!t.dataPlanejadaInicio || t.dataPlanejadaInicio <= todayStr)
    );

    let activeTabTasks = [];
    if (activeTab === 'hoje') activeTabTasks = hoje;
    else if (activeTab === 'atrasadas') activeTabTasks = atrasadas;
    else if (activeTab === 'futuras') activeTabTasks = futuras;
    else if (activeTab === 'concluidas') activeTabTasks = concluidas;

    // Build sidebar machines markup
    const machinesHtml = myEqs.map(e => {
      const pct = e.pctAvanco || 0;
      const days = e.dataLiberacaoPlanejada ? daysBetween(todayStr, e.dataLiberacaoPlanejada) : null;
      let daysClass = 'success';
      if (days !== null && days < 0) daysClass = 'danger';
      else if (days !== null && days <= 2) daysClass = 'warning';

      return `
        <div class="card hover-lift" style="padding:var(--space-4);background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-md);margin-bottom:var(--space-3);position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2);">
            <div>
              <h4 style="margin:0;font-size:var(--text-md);font-weight:900;color:var(--text-primary);letter-spacing:-0.02em;">${e.codigo}</h4>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">${e.nome || 'Sem Nome'}</div>
            </div>
            ${statusBadge(e.status)}
          </div>
          
          <div style="margin-bottom:var(--space-3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:var(--text-xs);">
              <span style="color:var(--text-muted);">Progresso</span>
              <strong style="color:var(--text-primary);">${pct}%</strong>
            </div>
            <div class="progress-track" style="height:6px;"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          
          <div style="font-size:var(--text-xs);margin-bottom:var(--space-4);padding:var(--space-2) var(--space-3);background:var(--bg-base);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
            <span style="color:var(--text-muted);">Previsão Liberação:</span>
            <strong class="text-${daysClass}">${e.dataLiberacaoPlanejada ? formatDate(e.dataLiberacaoPlanejada) : '—'} ${days !== null ? `(${days < 0 ? Math.abs(days) + 'd atrasado' : days === 0 ? 'Hoje' : days + 'd'})` : ''}</strong>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
            <button class="btn btn-outline btn-xs" onclick="WorkerPanel.openCreateTask('${e.id}')" style="font-size:10px;justify-content:center;padding:4px 8px;border-radius:var(--radius-sm);">Nova Tarefa</button>
            <button class="btn btn-outline btn-xs" onclick="WorkerPanel.openRequestPart('${e.id}')" style="font-size:10px;justify-content:center;padding:4px 8px;border-radius:var(--radius-sm);">Solicitar Peça</button>
            <button class="btn btn-outline btn-xs" onclick="WorkerPanel.openRequestService('${e.id}')" style="font-size:10px;justify-content:center;padding:4px 8px;border-radius:var(--radius-sm);">Solicitar Serviço</button>
            <button class="btn btn-outline btn-xs" onclick="WorkerPanel.openReportRestriction('${e.id}')" style="font-size:10px;justify-content:center;padding:4px 8px;color:var(--color-danger);border-color:rgba(244,67,54,0.3);border-radius:var(--radius-sm);">Impedimento</button>
          </div>
        </div>
      `;
    }).join('');

    // Build tasks list markup
    const tasksHtml = activeTabTasks.map(t => {
      const eq = eqs.find(e => e.id === t.equipmentId);
      const isMyDiscipline = t.disciplina === session.disciplina;
      
      const blockedBy = checkPredecessors(t, tasks);
      const isBlocked = blockedBy.length > 0;
      
      const lateStr = t.dataPlanejadaTermino && t.dataPlanejadaTermino < todayStr && t.status !== 'Concluída' 
        ? `<span class="badge badge-danger" style="margin-left:var(--space-1)">Atrasada</span>` : '';

      const hasActiveTimer = activeTimer && activeTimer.taskId === t.id;
      const isAnyTimerRunning = activeTimer !== null;

      let actionControls = '';
      if (isMyDiscipline) {
        if (isBlocked) {
          actionControls = `
            <div style="font-size:var(--text-xs);color:var(--color-danger);display:flex;align-items:center;gap:6px;background:rgba(244,67,54,0.08);padding:6px 12px;border-radius:var(--radius-md);border:1px solid rgba(244,67,54,0.2);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
              Bloqueada por dependência: <strong>${blockedBy.join(', ')}</strong>
            </div>
          `;
        } else {
          const timerBtn = hasActiveTimer
            ? `<button class="btn btn-success btn-xs" onclick="WorkerPanel.stopTimer('${t.id}')" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;"><span class="play-pulse-active" style="width:8px;height:8px;background:white;border-radius:50%;display:inline-block;animation:pulse-timer 1.2s infinite;"></span>Pausar Timer</button>`
            : `<button class="btn btn-outline btn-xs" onclick="WorkerPanel.startTimer('${t.id}')" ${isAnyTimerRunning ? 'disabled title="Já existe outro timer rodando"' : ''} style="display:inline-flex;align-items:center;gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg>Iniciar</button>`;

          const completeBtn = t.status !== 'Concluída'
            ? `<button class="btn btn-success btn-xs" onclick="WorkerPanel.quickComplete('${t.id}')" style="font-weight:700;">Concluir (OK)</button>`
            : '';

          actionControls = `
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              ${timerBtn}
              ${completeBtn}
              <button class="btn btn-secondary btn-xs" onclick="WorkerPanel.openEditTask('${t.id}')">Editar</button>
            </div>
          `;
        }
      } else {
        actionControls = `
          <span class="badge badge-ghost" style="display:inline-flex;align-items:center;gap:4px;padding:var(--space-1) var(--space-2);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
            Leitura (${t.disciplina})
          </span>
        `;
      }

      let timerBadgeHtml = '';
      if (hasActiveTimer) {
        const elapsedMin = Math.round((Date.now() - activeTimer.startTime) / 60000);
        const elapsedHrs = (elapsedMin / 60).toFixed(1);
        timerBadgeHtml = `
          <span style="font-size:10px;color:var(--color-success);font-weight:700;display:inline-flex;align-items:center;gap:4px;background:rgba(76,175,80,0.12);padding:2px 8px;border-radius:var(--radius-full);border:1px solid rgba(76,175,80,0.2);margin-left:var(--space-2);">
            ⏱️ Timer Rodando: ${elapsedHrs}h
          </span>
        `;
      }

      return `
        <div style="padding:var(--space-4);background:var(--bg-card);border:1px solid ${t.critico ? 'rgba(244,67,54,0.3)' : 'var(--border-card)'};border-radius:var(--radius-md);margin-bottom:var(--space-2);display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);" class="hover-lift">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:4px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:var(--text-sm);color:var(--text-primary);">${t.descricao}</span>
              ${t.critico ? '<span style="font-size:.65rem;background:var(--color-danger);color:white;padding:1px 4px;border-radius:3px;font-weight:700;">CRÍTICO</span>' : ''}
              ${lateStr}
              ${timerBadgeHtml}
            </div>
            
            <div style="display:flex;align-items:center;gap:var(--space-3);font-size:var(--text-xs);color:var(--text-muted);flex-wrap:wrap;">
              <span><strong>MÁQUINA:</strong> ${eq ? eq.codigo : '—'}</span>
              <span class="badge badge-ghost" style="font-size:10px">${t.disciplina}</span>
              <span><strong>Prazo:</strong> ${t.dataPlanejadaInicio ? formatDate(t.dataPlanejadaInicio) : '—'} → ${t.dataPlanejadaTermino ? formatDate(t.dataPlanejadaTermino) : '—'}</span>
              <span><strong>Horas Realizadas:</strong> ${t.horasRealizadas||0}h / ${t.horasPlanejadas||0}h</span>
            </div>
            
            <div style="margin-top:var(--space-2);display:flex;align-items:center;gap:var(--space-3);max-width:300px;">
              <div class="progress-track" style="height:6px;flex:1;"><div class="progress-fill ${t.pctExecutado>=80?'success':t.pctExecutado>=50?'':'warning'}" style="width:${t.pctExecutado}%"></div></div>
              <span style="font-size:10px;color:var(--text-secondary);font-weight:700;flex-shrink:0;">${t.pctExecutado || 0}%</span>
            </div>
          </div>
          
          <div style="display:flex;align-items:center;gap:var(--space-3);flex-shrink:0;">
            ${statusBadge(t.status)}
            <div style="display:flex;align-items:center;">
              ${actionControls}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const navTabsHtml = `
      <div class="filter-tabs" style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);border-bottom:1px solid var(--border-card);padding-bottom:var(--space-3);overflow-x:auto;-webkit-overflow-scrolling:touch;">
        <button class="btn ${activeTab === 'hoje' ? 'btn-primary' : 'btn-ghost'}" onclick="WorkerPanel.setTab('hoje')" style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-full);white-space:nowrap;flex-shrink:0;">
          Hoje <span class="badge ${hoje.length > 0 ? 'badge-primary' : 'badge-ghost'}" style="margin-left:6px">${hoje.length}</span>
        </button>
        <button class="btn ${activeTab === 'atrasadas' ? 'btn-danger' : 'btn-ghost'}" onclick="WorkerPanel.setTab('atrasadas')" style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-full);white-space:nowrap;flex-shrink:0;">
          Atrasadas <span class="badge ${atrasadas.length > 0 ? 'badge-danger' : 'badge-ghost'}" style="margin-left:6px">${atrasadas.length}</span>
        </button>
        <button class="btn ${activeTab === 'futuras' ? 'btn-outline' : 'btn-ghost'}" onclick="WorkerPanel.setTab('futuras')" style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-full);white-space:nowrap;flex-shrink:0;">
          Futuras <span class="badge badge-ghost" style="margin-left:6px">${futuras.length}</span>
        </button>
        <button class="btn ${activeTab === 'concluidas' ? 'btn-success' : 'btn-ghost'}" onclick="WorkerPanel.setTab('concluidas')" style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-full);white-space:nowrap;flex-shrink:0;">
          Concluídas <span class="badge badge-success" style="margin-left:6px">${concluidas.length}</span>
        </button>
      </div>
    `;

    // Inject CSS for custom sub-animations (pulsing for timer button)
    if (!document.getElementById('worker-panel-styles')) {
      const style = document.createElement('style');
      style.id = 'worker-panel-styles';
      style.innerHTML = `
        @keyframes pulse-timer {
          0% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.7; }
        }
        .play-pulse {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #4caf50;
          border-radius: 50%;
        }
      `;
      document.head.appendChild(style);
    }

    return `
      <div class="page-container">
        <!-- Welcoming User Segment -->
        <div style="background:var(--bg-card);border:1px solid var(--border-card);padding:var(--space-5) var(--space-6);border-radius:var(--radius-lg);margin-bottom:var(--space-5);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-4);">
          <div>
            <h2 style="margin:0;font-size:1.8rem;font-weight:900;letter-spacing:-0.03em;color:var(--text-primary);">Painel de Execução</h2>
            <p style="margin:4px 0 0 0;font-size:var(--text-sm);color:var(--text-secondary);">
              Bem-vindo, <strong style="color:var(--text-primary);">${session.nome}</strong> · Setor: <strong style="color:var(--brand-primary-light);">${session.disciplina}</strong>
            </p>
          </div>
          
          <!-- Direct KPIs -->
          <div style="display:flex;gap:var(--space-4);flex-wrap:wrap;">
            <div style="background:var(--bg-base);border:1px solid var(--border-card);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);text-align:center;min-width:110px;box-shadow:var(--shadow-sm);">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Máquinas</div>
              <div style="font-size:1.4rem;font-weight:900;color:var(--text-primary);margin-top:2px;">${myEqs.length}</div>
            </div>
            <div style="background:var(--bg-base);border:1px solid var(--border-card);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);text-align:center;min-width:110px;box-shadow:var(--shadow-sm);">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Hoje</div>
              <div style="font-size:1.4rem;font-weight:900;color:var(--brand-primary-light);margin-top:2px;">${totalHoje}</div>
            </div>
            <div style="background:var(--bg-base);border:1px solid rgba(244,67,54,0.15);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);text-align:center;min-width:110px;box-shadow:var(--shadow-sm);">
              <div style="font-size:10px;color:var(--color-danger);text-transform:uppercase;font-weight:700;">Atrasadas</div>
              <div style="font-size:1.4rem;font-weight:900;color:var(--color-danger);margin-top:2px;">${totalAtrasadas}</div>
            </div>
            <div style="background:var(--bg-base);border:1px solid rgba(76,175,80,0.15);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);text-align:center;min-width:110px;box-shadow:var(--shadow-sm);">
              <div style="font-size:10px;color:var(--color-success);text-transform:uppercase;font-weight:700;">Concluídas</div>
              <div style="font-size:1.4rem;font-weight:900;color:var(--color-success);margin-top:2px;">${totalConcluidas}</div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:var(--space-5);flex-direction:row;align-items:flex-start;flex-wrap:wrap;">
          <!-- Left side: Machines allocated to Executante -->
          <div style="flex:0 0 320px;min-width:320px;max-width:100%;">
            <h3 style="margin-bottom:var(--space-3);font-size:var(--text-md);color:var(--text-primary);text-transform:uppercase;letter-spacing:0.05em;display:flex;align-items:center;gap:8px;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V18a2.25 2.25 0 012.25-2.25h1.5a.75.75 0 00.75-.75V11.25a.75.75 0 00-.75-.75h-.75m10.5 9a1.5 1.5 0 003 0m-3 0a1.5 1.5 0 013 0m-3 0H9m9 0h1.625a1.125 1.125 0 001.125-1.125V16.5a2.25 2.25 0 00-2.25-2.25h-1.5a.75.75 0 00-.75.75v3.75a.75.75 0 00.75.75h.75m-.375-6.125V10.5a.75.75 0 00-.75-.75h-.75a.75.75 0 00-.75.75v.75m0 3.75V12h-3.75m0 3.75V12m0 0V10.5a.75.75 0 00-.75-.75h-.75a.75.75 0 00-.75.75v.75m0 0V12m0 1.5H7.5" /></svg>
              Equipamentos Alocados
            </h3>
            <div style="max-height: calc(100vh - 270px); overflow-y: auto;">
              ${machinesHtml || `
                <div class="empty-state" style="padding:var(--space-6);background:var(--bg-card);border:1px dashed var(--border-card);">
                  <p>Você não possui nenhum equipamento alocado no momento.</p>
                </div>
              `}
            </div>
          </div>
          
          <!-- Right side: Tasks checklist divided by status -->
          <div style="flex:1;min-width:0;">
            <h3 style="margin-bottom:var(--space-3);font-size:var(--text-md);color:var(--text-primary);text-transform:uppercase;letter-spacing:0.05em;display:flex;align-items:center;gap:8px;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.3 8.359a9 9 0 110-18 9 9 0 010 18z" /></svg>
              Minhas Atividades
            </h3>
            <div style="background:var(--bg-card);border:1px solid var(--border-card);padding:var(--space-5);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);">
              ${navTabsHtml}
              ${controlsHtml}
              
              <div style="margin-top:var(--space-4);">
                ${tasksHtml || `
                  <div class="empty-state" style="padding:var(--space-8);">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;color:var(--text-muted);margin:0 auto var(--space-3);"><path stroke-linecap="round" stroke-linejoin="round" d="M11.35 11.69a2.62 2.62 0 113.73 3.73m-.73-7.13l3.66-3.66a2.25 2.25 0 113.18 3.18l-3.66 3.66M11.35 11.69a6.002 6.002 0 01-8.48 8.48 6 6 0 018.48-8.48zm0 0l-3.66 3.66a2.25 2.25 0 103.18 3.18l3.66-3.66" /></svg>
                    <p>Nenhuma atividade encontrada nesta aba.</p>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Modals Container -->
      <div id="worker-panel-modals"></div>
    `;
  }

  function setTab(tab) {
    activeTab = tab;
    Router.navigate('worker-panel', { force: true });
  }

  function setEqFilter(id) {
    eqFilter = id;
    Router.navigate('worker-panel', { force: true });
  }

  // --- PLAY/PAUSE TIME TRACKING ---

  function startTimer(taskId) {
    if (activeTimer) {
      Toast.error('Erro', 'Você já possui uma tarefa com cronômetro ativo. Termine-a primeiro.');
      return;
    }
    const t = DB.tasks.get(taskId);
    if (!t) return;

    saveTimer({
      taskId,
      startTime: Date.now()
    });

    if (t.status !== 'Em Andamento') {
      DB.tasks.update(taskId, { status: 'Em Andamento' });
    }

    Toast.success('Cronômetro Iniciado!', `Trabalhando em: "${t.descricao}"`);
    Router.navigate('worker-panel', { force: true });
  }

  function stopTimer(taskId) {
    if (!activeTimer || activeTimer.taskId !== taskId) {
      Toast.error('Erro', 'Timer não correspondente ativo.');
      return;
    }

    const t = DB.tasks.get(taskId);
    if (!t) {
      saveTimer(null);
      Router.navigate('worker-panel', { force: true });
      return;
    }

    const elapsedHrs = Math.max(0.1, Math.round(((Date.now() - activeTimer.startTime) / (1000 * 60 * 60)) * 10) / 10);

    const inputHrs = prompt(
      `Tarefa: "${t.descricao}"\n\nTempo trabalhado calculado: ${elapsedHrs} horas.\nConfirme ou ajuste a quantidade de horas a serem registradas:`,
      elapsedHrs.toString()
    );

    if (inputHrs === null) return; // cancel stopping timer

    const parsed = parseFloat(inputHrs) || 0;
    if (parsed > 0) {
      const currentHrs = t.horasRealizadas || 0;
      const totalHrs = Math.round((currentHrs + parsed) * 10) / 10;
      
      const session = Auth.getSession();
      const dateStr = new Date().toLocaleString('pt-BR');
      const logText = `\n[Atualizado em ${dateStr} por ${session.nome}]: Adicionado +${parsed}h de trabalho via timer.`;
      
      let newObs = '';
      let isJson = false;
      let comments = [];
      if (t.observacoes) {
        try {
          comments = JSON.parse(t.observacoes);
          if (Array.isArray(comments)) isJson = true;
        } catch(e) {}
      }
      
      if (isJson) {
        comments.push({
          id: 'c-sys-' + Date.now(),
          text: `[Timer]: Adicionado +${parsed}h de trabalho via timer.`,
          user: 'Sistema',
          userId: 'system',
          createdAt: new Date().toISOString()
        });
        newObs = JSON.stringify(comments);
      } else {
        newObs = (t.observacoes ? t.observacoes : '') + logText;
      }

      DB.tasks.update(taskId, { 
        horasRealizadas: totalHrs,
        observacoes: newObs
      });
      Toast.success('Horas Adicionadas!', `Lançados +${parsed}h. Carga total: ${totalHrs}h`);
    }

    saveTimer(null);
    Router.navigate('worker-panel', { force: true });
  }

  // --- QUICK TASK ACTIONS ---

  function quickComplete(taskId) {
    const t = DB.tasks.get(taskId);
    if (!t) return;

    const session = Auth.getSession();
    const today = new Date().toISOString().slice(0, 10);
    const dateStr = new Date().toLocaleString('pt-BR');
    
    const logMsg = `\n[Atualizado em ${dateStr} por ${session.nome}]: Concluído (OK).`;
    
    let newObs = '';
    let isJson = false;
    let comments = [];
    if (t.observacoes) {
      try {
        comments = JSON.parse(t.observacoes);
        if (Array.isArray(comments)) isJson = true;
      } catch(e) {}
    }
    
    if (isJson) {
      comments.push({
        id: 'c-sys-' + Date.now(),
        text: `[Status]: Concluído (OK).`,
        user: 'Sistema',
        userId: 'system',
        createdAt: new Date().toISOString()
      });
      newObs = JSON.stringify(comments);
    } else {
      newObs = (t.observacoes ? t.observacoes : '') + logMsg;
    }

    DB.tasks.update(taskId, {
      status: 'Concluída',
      pctExecutado: 100,
      dataRealTermino: today,
      observacoes: newObs
    });

    // Check if this taskId was active on timer
    if (activeTimer && activeTimer.taskId === taskId) {
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

    Toast.success('Sucesso', 'Tarefa concluída com sucesso!');
    Router.navigate('worker-panel', { force: true });
  }

  // --- TASK MODALS (CREATE & EDIT) ---

  function openCreateTask() {
    const session = Auth.getSession();
    const eqs = DB.equipment.list();
    const myEqs = eqs.filter(e => {
      const map = e.workforceMap || {};
      return Object.values(map).includes(session.nome);
    });

    const modalHtml = `
      <div class="modal-overlay" id="modal-worker-new-task">
        <div class="modal modal-lg" style="box-shadow:var(--shadow-lg);">
          <div class="modal-header">
            <div class="modal-title">Nova Atividade</div>
            <button class="modal-close" onclick="closeModal('modal-worker-new-task')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div class="form-row">
                <div class="form-group">
                  <label>Equipamento *</label>
                  <select id="w-new-eq" style="background:var(--bg-base);border:1px solid var(--border-card);color:var(--text-primary);">
                    ${myEqs.map(e => `<option value="${e.id}">${e.codigo} - ${e.nome}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Código (Opcional)</label>
                  <input id="w-new-cod" placeholder="Ex: MEC-01" />
                </div>
              </div>
              <div class="form-group">
                <label>Descrição da Atividade *</label>
                <input id="w-new-desc" placeholder="Descreva a tarefa..." required />
              </div>
              
              <div class="form-row">
                <div class="form-group">
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
                <div class="form-group">
                  <label>Horas Realizadas</label>
                  <input type="number" id="w-new-hr" value="0" min="0" />
                </div>
              </div>

              <div class="form-group">
                <label>% Executado: <span id="w-new-pct-val">0</span>%</label>
                <input type="range" id="w-new-pct" min="0" max="100" value="0" oninput="document.getElementById('w-new-pct-val').textContent=this.value" />
              </div>

              <div class="checkbox-wrap">
                <input type="checkbox" id="w-new-critico" />
                <label for="w-new-critico" style="cursor:pointer;">Marcar como Atividade Crítica</label>
              </div>

              <div class="form-group">
                <label>Observações</label>
                <textarea id="w-new-obs" rows="3" placeholder="Insira observações relevantes..."></textarea>
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

  function openCreateTask(equipmentId) {
    const eqs = DB.equipment.list();
    const session = Auth.getSession();
    
    // Get only allocated machines
    const myEqs = eqs.filter(e => {
      const map = e.workforceMap || {};
      return Object.values(map).includes(session.nome);
    });

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
                <div class="form-group">
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
                <div class="form-group">
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
      disciplina: session.disciplina,
      responsavel: session.nome,
      prioridade: document.getElementById('w-new-prio').value,
      status,
      dataPlanejadaInicio: document.getElementById('w-new-ip').value,
      dataPlanejadaTermino: document.getElementById('w-new-tp').value,
      horasPlanejadas: parseFloat(document.getElementById('w-new-hp').value) || 0,
      horasRealizadas: parseFloat(document.getElementById('w-new-hr').value) || 0,
      pctExecutado: parseInt(document.getElementById('w-new-pct').value) || 0,
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
    Toast.success('Sucesso', 'Nova tarefa criada e vinculada a você.');
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
                  <select id="w-tk-status">
                    ${['Não Iniciada','Em Andamento','Aguardando Peça','Aguardando Recurso','Aguardando Aprovação','Bloqueada','Concluída'].map(s => 
                      `<option ${t.status === s ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                  </select>
                </div>
                <div class="form-group">
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
    }
  }

  function saveEditedTask(id) {
    const t = DB.tasks.get(id);
    if (!t) return;

    const status = document.getElementById('w-tk-status').value;
    const pct = parseInt(document.getElementById('w-tk-pct').value) || 0;
    const hr = parseFloat(document.getElementById('w-tk-hr').value) || 0;
    const ip = document.getElementById('w-tk-ip').value;
    const tp = document.getElementById('w-tk-tp').value;
    const obs = document.getElementById('w-tk-obs').value.trim();

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
      pctExecutado: pct,
      horasRealizadas: hr,
      dataReprogramadaInicio: ip,
      dataReprogramadaTermino: tp,
      observacoes: finalObs
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
    const myEqs = eqs.filter(e => {
      const map = e.workforceMap || {};
      return Object.values(map).includes(session.nome);
    });

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
    const myEqs = eqs.filter(e => {
      const map = e.workforceMap || {};
      return Object.values(map).includes(session.nome);
    });

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
    const myEqs = eqs.filter(e => {
      const map = e.workforceMap || {};
      return Object.values(map).includes(session.nome);
    });

    const activeEqId = equipmentId || (myEqs[0]?.id || '');
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
    setTab,
    setEqFilter,
    startTimer,
    stopTimer,
    quickComplete,
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
    saveRestriction
  };
})();

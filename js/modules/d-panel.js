/* ================================================================
   PLANEJAMENTO DIMAN-BHZ
   D-1 | D | D+1 — Painel Operacional Diário (MÓDULO PRINCIPAL)
   ================================================================ */

window.DPanel = (() => {
  let refreshInterval = null;

  function today() { return new Date().toISOString().slice(0, 10); }
  function dateOf(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  function getTasksForDate(date) {
    return DB.tasks.getAll().filter(t => {
      const start = t.dataPlanejadaInicio;
      const end   = t.dataPlanejadaTermino;
      if (!start || !end) return false;
      return start <= date && end >= date;
    });
  }

  function calcAdherence(planned, done) {
    if (!planned) return 0;
    return Math.round((done / planned) * 100);
  }

  function semaphoreClass(pct) {
    if (pct >= 90) return 'success';
    if (pct >= 70) return 'warning';
    return 'danger';
  }

  function semaphoreEmoji(pct) {
    if (pct >= 90) return '🟢';
    if (pct >= 70) return '🟡';
    return '🔴';
  }

  function getPendingReasons(tasks) {
    const reasons = { 'Falta de Peça': 0, 'Falta de Mão de Obra': 0, 'Falta de Ferramenta': 0,
      'Chuva': 0, 'Prioridade Alterada': 0, 'Falha Operacional': 0, 'Outros': 0 };
    const restrictions = DB.restrictions.getAll().filter(r => r.status === 'Aberta');
    tasks.forEach(t => {
      if (t.status === 'Aguardando Peça') reasons['Falta de Peça']++;
      else if (t.status === 'Aguardando Recurso') reasons['Falta de Mão de Obra']++;
      else if (t.status === 'Bloqueada') {
        const r = restrictions.find(r => r.tarefaBloqueada === t.descricao || r.equipmentId === t.equipmentId);
        if (r?.tipo === 'Falta de Ferramenta') reasons['Falta de Ferramenta']++;
        else if (r?.tipo === 'Aguardando Aprovação') reasons['Prioridade Alterada']++;
        else reasons['Outros']++;
      } else if (t.status === 'Não Iniciada' && t.dataPlanejadaTermino < today()) {
        reasons['Falha Operacional']++;
      }
    });
    return reasons;
  }

  function getTomorrowAlerts(tomorrowTasks) {
    const alerts = [];
    const parts = DB.parts.getAll();
    const restrictions = DB.restrictions.getAll().filter(r => r.status === 'Aberta');
    const workforce = DB.workforce.list();

    tomorrowTasks.forEach(t => {
      // Check parts
      const taskParts = parts.filter(p => p.equipmentId === t.equipmentId && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
      if (taskParts.length > 0) {
        alerts.push({ type: 'danger', msg: `ATENÇÃO: A atividade "${t.descricao}" está programada para amanhã, porém ${taskParts.map(p => `a peça "${p.descricao}"`).join(' e ')} ainda não ${taskParts.length > 1 ? 'foram recebidas' : 'foi recebida'}.` });
      }
      // Check restrictions
      const blocked = restrictions.filter(r => r.equipmentId === t.equipmentId && (r.tarefaBloqueada === t.descricao || r.tipo === 'Falta de Mão de Obra'));
      if (blocked.length > 0) {
        blocked.forEach(r => {
          if (r.tipo === 'Falta de Mão de Obra') {
            const disc = r.disciplina;
            alerts.push({ type: 'warning', msg: `ATENÇÃO: A equipe de ${disc.toLowerCase()} está com sobrecarga para amanhã.` });
          }
        });
      }
    });

    // Check critical tasks
    const criticalTomorrow = tomorrowTasks.filter(t => (window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t) : t.critico) && t.status !== 'Concluída');
    if (criticalTomorrow.length > 0) {
      alerts.push({ type: 'danger', msg: `ATENÇÃO: ${criticalTomorrow.length} atividade${criticalTomorrow.length > 1 ? 's' : ''} do caminho crítico ${criticalTomorrow.length > 1 ? 'estão programadas' : 'está programada'} para amanhã. Verificar disponibilidade de recursos.` });
    }

    return [...new Map(alerts.map(a => [a.msg, a])).values()]; // deduplicate
  }

  function getAIAlerts() {
    const allTasks = DB.tasks.getAll();
    const todayTasks = getTasksForDate(today());
    const tomorrowTasks = getTasksForDate(dateOf(1));
    const parts = DB.parts.getAll();
    const restrictions = DB.restrictions.getAll().filter(r => r.status === 'Aberta');

    const alerts = [];

    // Tasks not likely to finish today
    const inProgress = todayTasks.filter(t => t.status === 'Em Andamento' && t.pctExecutado < 80);
    if (inProgress.length > 0) {
      alerts.push(`Existem ${inProgress.length} atividade${inProgress.length>1?'s':''} em andamento hoje com menos de 80% de conclusão — risco de não finalização no dia.`);
    }

    // Critical pending from yesterday
    const yesterdayPending = getTasksForDate(dateOf(-1)).filter(t => t.status !== 'Concluída' && (window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t) : t.critico));
    if (yesterdayPending.length > 0) {
      alerts.push(`Se as ${yesterdayPending.length} atividade${yesterdayPending.length>1?'s':''} pendente${yesterdayPending.length>1?'s':''} de ontem não forem concluídas hoje, a liberação da sonda será impactada.`);
    }

    // Critical parts blocking tomorrow
    const critParts = parts.filter(p => p.critica && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
    if (critParts.length > 0) {
      alerts.push(`Existem ${critParts.length} peça${critParts.length>1?'s':''} crítica${critParts.length>1?'s':''} pendente${critParts.length>1?'s':''} que podem impactar atividades de amanhã.`);
    }

    // Overloaded disciplines
    const disciplines = {};
    tomorrowTasks.forEach(t => { disciplines[t.disciplina] = (disciplines[t.disciplina] || 0) + 1; });
    Object.entries(disciplines).forEach(([d, count]) => {
      if (count >= 4) alerts.push(`Possível sobrecarga na disciplina de ${d} amanhã: ${count} atividades programadas para a mesma equipe.`);
    });

    return alerts.slice(0, 4);
  }

  function getTopPerformers() {
    const today = new Date();
    const currentMonthPrefix = today.toISOString().slice(0, 7); // "YYYY-MM"
    const ts = window.DB.timesheets ? window.DB.timesheets.list().filter(t => t.data && t.data.startsWith(currentMonthPrefix) && t.tipo === 'Trabalho') : [];
    
    const workerCounts = {};
    ts.forEach(t => {
      if (t.workerId) {
        workerCounts[t.workerId] = (workerCounts[t.workerId] || 0) + 1;
      }
    });

    const ranking = [];
    Object.keys(workerCounts).forEach(wId => {
      const w = window.DB.workforce ? window.DB.workforce.get(wId) : null;
      if (w) {
        ranking.push({
          id: wId,
          nome: w.nome,
          count: workerCounts[wId]
        });
      }
    });

    ranking.sort((a, b) => b.count - a.count);
    return ranking.slice(0, 5); // Top 5
  }

  function renderTopPerformersTicker() {
    const top = getTopPerformers();
    if (top.length === 0) return '';
    
    const emojis = ['🏆 1º', '🥈 2º', '🥉 3º', '🏅 4º', '🏅 5º'];
    const items = top.map((t, idx) => `<span style="margin: 0 40px;">${emojis[idx] || '🏅'} <strong>${t.nome}</strong> (${t.count} tarefas executadas)</span>`).join('');

    return `
      <style>
        .ticker-wrap {
          width: 100%;
          overflow: hidden;
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(16, 185, 129, 0.1) 100%);
          border-top: 2px solid var(--brand-primary-light);
          border-bottom: 2px solid var(--brand-primary-light);
          padding: 8px 0;
          position: sticky;
          bottom: 0;
          z-index: 50;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
          margin-top: var(--space-6);
          margin-left: calc(var(--space-6) * -1);
          margin-right: calc(var(--space-6) * -1);
          margin-bottom: calc(var(--space-6) * -1);
          width: calc(100% + var(--space-6) * 2);
        }
        .ticker-move {
          display: inline-block;
          white-space: nowrap;
          padding-right: 100%;
          box-sizing: content-box;
          animation: ticker 50s linear infinite;
        }
        .ticker-move:hover {
          animation-play-state: paused;
        }
        @keyframes ticker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
      </style>
      <div class="ticker-wrap">
        <div class="ticker-move" style="font-size: 1.1rem; color: var(--text-primary);">
          <span style="font-weight: 800; color: var(--brand-primary-light); margin-right: 40px; text-transform: uppercase;">🚀 TOP EXECUTANTES DO MÊS:</span>
          ${items}
          <span style="font-weight: 800; color: var(--brand-primary-light); margin-left: 40px; margin-right: 40px; text-transform: uppercase;">🚀 PARABÉNS PELO EMPENHO!</span>
        </div>
      </div>
    `;
  }

  function renderD1Section(tasks) {
    const d1 = dateOf(-1);
    const planned = tasks.length;
    const done = tasks.filter(t => t.status === 'Concluída').length;
    const notDone = tasks.filter(t => t.status !== 'Concluída');
    const adherence = calcAdherence(planned, done);
    const hPlanned = tasks.reduce((s, t) => s + (parseFloat(t.horasPlanejadas) || 0), 0);
    const hDone = tasks.reduce((s, t) => s + (parseFloat(t.horasRealizadas) || 0), 0);
    const reasons = getPendingReasons(notDone);
    const semClass = semaphoreClass(adherence);

    return `
      <div class="card" style="border-top:3px solid var(--color-${semClass});height:100%;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
          <div>
            <div style="font-size:var(--text-xs);font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)">D-1</div>
            <div style="font-size:var(--text-lg);font-weight:700;color:var(--text-primary)">Ontem · ${formatDate(d1)}</div>
          </div>
          <div style="font-size:2rem;">${semaphoreEmoji(adherence)}</div>
        </div>

        <!-- KPI row -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);margin-bottom:var(--space-4);">
          <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary)">${planned}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Planejadas</div>
          </div>
          <div style="background:var(--color-success-bg);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-success)">${done}</div>
            <div style="font-size:var(--text-xs);color:var(--color-success)">Executadas</div>
          </div>
          <div style="background:var(--color-danger-bg);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-danger)">${notDone.length}</div>
            <div style="font-size:var(--text-xs);color:var(--color-danger)">Pendentes</div>
          </div>
          <div style="background:var(--color-${semClass}-bg);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-${semClass})">${adherence}%</div>
            <div style="font-size:var(--text-xs);color:var(--color-${semClass})">Aderência</div>
          </div>
        </div>

        <!-- Horas -->
        <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);">
          <div style="flex:1;background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Horas Planejadas</div>
            <div style="font-size:var(--text-xl);font-weight:700;color:var(--text-primary);font-family:var(--font-mono)">${hPlanned.toFixed(0)}h</div>
          </div>
          <div style="flex:1;background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Horas Realizadas</div>
            <div style="font-size:var(--text-xl);font-weight:700;color:var(--brand-primary-light);font-family:var(--font-mono)">${hDone.toFixed(0)}h</div>
          </div>
        </div>

        <!-- Adherence bar -->
        <div class="progress-bar-wrap" style="margin-bottom:var(--space-4);">
          <div class="progress-bar-header"><span class="progress-bar-label">Aderência ao Planejamento</span><span class="progress-bar-value">${adherence}%</span></div>
          <div class="progress-track lg"><div class="progress-fill ${semClass}" style="width:${adherence}%"></div></div>
        </div>

        <!-- Motivos de não execução -->
        ${notDone.length > 0 ? `
        <div>
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2);">Motivos de Não Execução</div>
          <div style="display:flex;flex-direction:column;gap:var(--space-1);">
            ${Object.entries(reasons).filter(([,v])=>v>0).map(([k,v]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);background:var(--bg-base);border-radius:var(--radius-sm);">
                <span style="font-size:var(--text-xs);color:var(--text-secondary)">${k}</span>
                <span class="badge badge-warning">${v}</span>
              </div>
            `).join('')}
          </div>
        </div>` : `<div class="alert alert-success"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg><div class="alert-content"><div class="alert-title">Todas as atividades de ontem foram concluídas!</div></div></div>`}
      </div>
    `;
  }

  function renderDSection(tasks) {
    const todayStr = today();
    const total = tasks.length;
    const iniciadas = tasks.filter(t => t.status !== 'Não Iniciada').length;
    const emAndamento = tasks.filter(t => t.status === 'Em Andamento').length;
    const concluidas = tasks.filter(t => t.status === 'Concluída').length;
    const criticas = tasks.filter(t => window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t) : t.critico).length;
    const equipMap = {};
    DB.equipment.list().forEach(e => { equipMap[e.id] = e; });

    return `
      <div class="card" style="border-top:3px solid var(--brand-primary-light);height:100%;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
          <div>
            <div style="font-size:var(--text-xs);font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-primary-light)">D — HOJE</div>
            <div style="font-size:var(--text-lg);font-weight:700;color:var(--text-primary)">${formatDate(todayStr)}</div>
          </div>
          <div id="live-clock" style="font-size:var(--text-xl);font-weight:800;color:var(--brand-primary-light);font-family:var(--font-mono)"></div>
        </div>

        <!-- KPI row -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);margin-bottom:var(--space-4);">
          <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary)">${total}</div>
            <div style="font-size:10px;color:var(--text-muted)">Total</div>
          </div>
          <div style="background:var(--color-info-bg);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--text-xl);font-weight:800;color:var(--color-info)">${emAndamento}</div>
            <div style="font-size:10px;color:var(--color-info)">Em Andamento</div>
          </div>
          <div style="background:var(--color-success-bg);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--text-xl);font-weight:800;color:var(--color-success)">${concluidas}</div>
            <div style="font-size:10px;color:var(--color-success)">Concluídas</div>
          </div>
        </div>

        <!-- Semáforos por equipamento -->
        ${tasks.length === 0 ? `<div class="empty-state" style="padding:var(--space-6)"><p>Nenhuma atividade programada para hoje</p></div>` : `
        <div style="display:flex;flex-direction:column;gap:var(--space-2);max-height:320px;overflow-y:auto;">
          ${tasks.map(t => {
            const eq = equipMap[t.equipmentId];
            const daysLeft = daysBetween(todayStr, t.dataPlanejadaTermino);
            let sem = 'success', semIcon = '🟢';
            if (t.status === 'Bloqueada' || t.status === 'Aguardando Peça') { sem='danger'; semIcon='🔴'; }
            else if (t.status === 'Não Iniciada' && daysLeft <= 1) { sem='danger'; semIcon='🔴'; }
            else if (t.pctExecutado < 50 && daysLeft <= 1) { sem='warning'; semIcon='🟡'; }
            return `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md);border-left:3px solid var(--color-${sem});">
                <span style="font-size:1.1rem;flex-shrink:0">${semIcon}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.descricao}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${eq ? eq.codigo : '—'} · ${t.disciplina}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-size:var(--text-xs);font-weight:700;color:var(--brand-primary-light);font-family:var(--font-mono)">${t.pctExecutado}%</div>
                  <div style="font-size:10px;color:var(--text-muted)">${t.responsavel?.split(' ')[0] || '—'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        `}
        ${criticas > 0 ? `<div style="margin-top:var(--space-3);padding:var(--space-2) var(--space-3);background:var(--color-danger-bg);border-radius:var(--radius-md);font-size:var(--text-xs);color:var(--color-danger);font-weight:600;">⚠️ ${criticas} atividade${criticas>1?'s':''} crítica${criticas>1?'s':''} hoje — monitorar de perto</div>` : ''}
      </div>
    `;
  }

  function renderD1Section_Tomorrow(tasks) {
    const d1 = dateOf(1);
    const alerts = getTomorrowAlerts(tasks);
    const restrictions = DB.restrictions.getAll().filter(r => r.status === 'Aberta');
    const equipNames = {};
    DB.equipment.list().forEach(e => { equipNames[e.id] = e.codigo; });

    const partsOk = tasks.filter(t => {
      const taskParts = DB.parts.getAll().filter(p => p.equipmentId === t.equipmentId && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
      return taskParts.length === 0;
    }).length;
    const partsNotOk = tasks.length - partsOk;
    const restricted = tasks.filter(t => restrictions.some(r => r.equipmentId === t.equipmentId)).length;

    return `
      <div class="card" style="border-top:3px solid var(--color-purple);height:100%;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
          <div>
            <div style="font-size:var(--text-xs);font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--color-purple)">D+1</div>
            <div style="font-size:var(--text-lg);font-weight:700;color:var(--text-primary)">Amanhã · ${formatDate(d1)}</div>
          </div>
          <div style="font-size:2rem;">📋</div>
        </div>

        <!-- Validation summary -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-2);margin-bottom:var(--space-4);">
          <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Programadas</div>
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary)">${tasks.length}</div>
          </div>
          <div style="background:${partsNotOk > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)'};border-radius:var(--radius-md);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:${partsNotOk > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">Peças OK</div>
            <div style="font-size:var(--text-2xl);font-weight:800;color:${partsNotOk > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${partsOk}/${tasks.length}</div>
          </div>
          <div style="background:${restricted > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)'};border-radius:var(--radius-md);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:${restricted > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">Restrições</div>
            <div style="font-size:var(--text-2xl);font-weight:800;color:${restricted > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">${restricted}</div>
          </div>
          <div style="background:var(--color-info-bg);border-radius:var(--radius-md);padding:var(--space-3);">
            <div style="font-size:var(--text-xs);color:var(--color-info)">Críticas</div>
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-info)">${tasks.filter(t=>window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t) : t.critico).length}</div>
          </div>
        </div>

        <!-- Alerts -->
        ${alerts.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-3);">
          ${alerts.map(a => `
            <div style="display:flex;gap:var(--space-2);padding:var(--space-3);background:var(--color-${a.type === 'danger' ? 'danger' : 'warning'}-bg);border-radius:var(--radius-md);border-left:3px solid var(--color-${a.type === 'danger' ? 'danger' : 'warning'});">
              <span style="flex-shrink:0;font-size:1rem;">${a.type === 'danger' ? '🔴' : '🟡'}</span>
              <span style="font-size:var(--text-xs);color:var(--text-secondary);line-height:1.5">${a.msg}</span>
            </div>
          `).join('')}
        </div>` : `<div class="alert alert-success" style="margin-bottom:var(--space-3);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg><div class="alert-content"><div class="alert-title">Programação de amanhã sem restrições identificadas!</div></div></div>`}

        <!-- Task list -->
        ${tasks.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:var(--space-1);max-height:200px;overflow-y:auto;">
          ${tasks.map(t => {
            const hasIssue = DB.parts.getAll().some(p => p.equipmentId === t.equipmentId && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
            return `
              <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2);background:var(--bg-base);border-radius:var(--radius-sm);">
                <span style="font-size:.9rem">${hasIssue ? '🔴' : '✅'}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.descricao}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${equipNames[t.equipmentId] || ''} · ${t.disciplina}</div>
                </div>
              </div>`;
          }).join('')}
        </div>` : `<div style="text-align:center;color:var(--text-muted);font-size:var(--text-sm);">Nenhuma atividade programada para amanhã</div>`}
      </div>
    `;
  }

  function renderIndicators() {
    const allTasks = DB.tasks.getAll();
    const t7 = [], t30 = [];
    for (let i = 7; i >= 0; i--) {
      const dt = dateOf(-i);
      const dayTasks = allTasks.filter(t => t.dataPlanejadaTermino === dt);
      t7.push({ date: dt, planned: dayTasks.length, done: dayTasks.filter(t => t.status === 'Concluída').length });
    }
    for (let i = 30; i >= 0; i--) {
      const dt = dateOf(-i);
      const dayTasks = allTasks.filter(t => t.dataPlanejadaTermino === dt);
      t30.push({ date: dt, planned: dayTasks.length, done: dayTasks.filter(t => t.status === 'Concluída').length });
    }
    const daily = t7[t7.length - 1];
    const dailyAdh = calcAdherence(daily.planned, daily.done);

    const weekly7planned = t7.reduce((s,d) => s + d.planned, 0);
    const weekly7done = t7.reduce((s,d) => s + d.done, 0);
    const weeklyAdh = calcAdherence(weekly7planned, weekly7done);

    const monthly30planned = t30.reduce((s,d) => s + d.planned, 0);
    const monthly30done = t30.reduce((s,d) => s + d.done, 0);
    const monthlyAdh = calcAdherence(monthly30planned, monthly30done);

    const openRestr = DB.restrictions.getAll().filter(r => r.status === 'Aberta').length;
    const allTs = DB.timesheets.list();
    const todayTs = allTs.filter(t => t.data === today());
    const hProd = todayTs.reduce((s,t) => s + (parseFloat(t.horasTrabalhadas) || 0), 0);

    return `
      <div class="card" style="margin-top:var(--space-5);">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
            Indicadores Automáticos
          </div>
          <span style="font-size:var(--text-xs);color:var(--text-muted)">Calculados em tempo real</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-4);">
          ${[
            { label: 'Aderência Diária', value: `${dailyAdh}%`, cls: semaphoreClass(dailyAdh), icon: '📅' },
            { label: 'Aderência Semanal (7d)', value: `${weeklyAdh}%`, cls: semaphoreClass(weeklyAdh), icon: '📊' },
            { label: 'Aderência Mensal (30d)', value: `${monthlyAdh}%`, cls: semaphoreClass(monthlyAdh), icon: '📈' },
            { label: 'Índice de Restrições', value: openRestr, cls: openRestr > 5 ? 'danger' : openRestr > 2 ? 'warning' : 'success', icon: '🚧' },
            { label: 'Horas Produtivas Hoje', value: `${hProd.toFixed(0)}h`, cls: 'info', icon: '⏱️' },
            { label: 'Tarefas Críticas Abertas', value: DB.tasks.getAll().filter(t=>(window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t) : t.critico)&&t.status!=='Concluída').length, cls: 'danger', icon: '⚠️' },
          ].map(item => `
            <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-4);border-left:3px solid var(--color-${item.cls});">
              <div style="font-size:1.3rem;margin-bottom:var(--space-2)">${item.icon}</div>
              <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-${item.cls})">${item.value}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">${item.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderAIAlerts() {
    const alerts = getAIAlerts();
    if (!alerts.length) return '';
    return `
      <div class="card" style="margin-top:var(--space-5);border:1px solid rgba(206,147,216,0.3);background:linear-gradient(135deg,rgba(206,147,216,0.05) 0%,transparent 100%);">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="color:var(--color-purple)"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
            <span style="color:var(--color-purple)">Alertas Inteligentes — IA</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          ${alerts.map((a, i) => `
            <div style="display:flex;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--bg-base);border-radius:var(--radius-md);border-left:3px solid var(--color-purple);">
              <span style="font-size:1.2rem;flex-shrink:0;">🤖</span>
              <div>
                <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-purple);margin-bottom:2px;">Alerta ${i+1}</div>
                <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.5">${a}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function render() {
    const d1Tasks = getTasksForDate(dateOf(-1));
    const dTasks  = getTasksForDate(today());
    const d1pTasks = getTasksForDate(dateOf(1));

    const html = `
      <div class="page-container">
        <!-- Header -->
        <div class="section-header" style="margin-bottom:var(--space-6);">
          <div>
            <div class="section-title">
              <div class="section-title-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
              </div>
              Painel Operacional D-1 | D | D+1
            </div>
            <div class="section-subtitle">Acompanhamento diário da execução · Atualização automática a cada 60 segundos</div>
          </div>
          <div style="display:flex;gap:var(--space-3);align-items:center;">
            <select id="dpanel-eq-select" onchange="window.setGlobalEqFilter(this.value)" class="form-control" style="width:200px;height:32px;font-size:var(--text-xs);padding:0 var(--space-2);background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-md);color:var(--text-primary);">
              <option value="">Todos Equipamentos</option>
              ${DB.equipment.list().filter(e => e.status !== 'Liberado').map(e => `<option value="${e.id}" ${window.GlobalEqFilter === e.id ? 'selected' : ''}>${e.codigo}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" onclick="DPanel.refresh()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              Atualizar
            </button>
            <button class="btn btn-primary btn-sm" onclick="MeetingMode.activate()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h1.5m-7.5-5.625c0-.621.504-1.125 1.125-1.125h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m0-5.625c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125"/></svg>
              Modo Reunião
            </button>
          </div>
        </div>

        <!-- Three columns -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-5);align-items:start;">
          ${renderD1Section(d1Tasks)}
          ${renderDSection(dTasks)}
          ${renderD1Section_Tomorrow(d1pTasks)}
        </div>

        <!-- Indicators -->
        ${renderIndicators()}

        <!-- AI Alerts -->
        ${renderAIAlerts()}

        <!-- Top Performers Ticker -->
        ${window.Router && window.Router.current === 'presentation' ? renderTopPerformersTicker() : renderTopPerformersTicker()}
      </div>

      <!-- Meeting mode overlay (rendered separately by MeetingMode module) -->
    `;

    // Start live clock after render
    setTimeout(() => {
      const clockEl = document.getElementById('live-clock');
      if (clockEl) {
        const tick = () => {
          const now = new Date();
          clockEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        tick();
        if (!window._dpClockInterval) window._dpClockInterval = setInterval(tick, 1000);
      }
    }, 50);

    return html;
  }

  function refresh() {
    Router.navigate('d-panel', { force: true });
  }

  function destroy() {
    if (window._dpClockInterval) { clearInterval(window._dpClockInterval); window._dpClockInterval = null; }
    if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
  }

  return { render, refresh, destroy };
})();

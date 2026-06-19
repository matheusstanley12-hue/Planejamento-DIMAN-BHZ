/* ================================================================
   PLANEJAMENTO DIMAN-BHZ — Modules Batch 2
   Gantt, CriticalPath, Parts, Workforce, Restrictions
   ================================================================ */

// ================================================================
// GANTT MODULE
// ================================================================
window.GanttModule = (() => {
  let viewMode = 'week'; // 'day'|'week'|'month'

  const colWidths = { day: 36, week: 80, month: 150 };

  function render() {
    const eqFilter = window.GlobalEqFilter;
    const eqs = DB.equipment.list();
    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/></svg></div>Cronograma Gantt</div>
        <div style="display:flex;gap:var(--space-3);align-items:center;">
          <select onchange="GanttModule.setEq(this.value)" style="width:180px;">
            <option value="">Todos</option>
            ${eqs.map(e=>`<option value="${e.id}" ${eqFilter===e.id?'selected':''}>${e.codigo}</option>`).join('')}
          </select>
          <div style="display:flex;gap:var(--space-1);">
            ${['day','week','month'].map(m=>`<button class="btn btn-sm ${viewMode===m?'btn-primary':'btn-secondary'}" onclick="GanttModule.setView('${m}')">${{day:'Dia',week:'Semana',month:'Mês'}[m]}</button>`).join('')}
          </div>
        </div>
      </div>
      <div id="gantt-render">${buildGantt()}</div>
    </div>`;
  }

  function buildGantt() {
    const eqFilter = window.GlobalEqFilter;
    const tasks = DB.tasks.getAll().filter(t => !eqFilter || t.equipmentId === eqFilter);
    if (!tasks.length) return '<div class="empty-state"><p>Nenhuma tarefa para exibir</p></div>';

    const eqs = DB.equipment.list();
    const equipMap = {};
    eqs.forEach(e => { equipMap[e.id] = e.codigo; });

    // Determine date range
    const allDates = tasks.flatMap(t => [t.dataPlanejadaInicio, t.dataPlanejadaTermino].filter(Boolean));
    if (!allDates.length) return '<div class="empty-state"><p>Tarefas sem datas definidas</p></div>';
    const minDate = new Date(allDates.reduce((a,b)=>a<b?a:b));
    const maxDate = new Date(allDates.reduce((a,b)=>a>b?a:b));
    minDate.setDate(minDate.getDate() - 5);
    maxDate.setDate(maxDate.getDate() + 10);

    const today = new Date();
    today.setHours(0,0,0,0);

    // Build columns
    const cols = [];
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
      cols.push(new Date(cursor));
      if (viewMode === 'day') cursor.setDate(cursor.getDate() + 1);
      else if (viewMode === 'week') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
    const cw = colWidths[viewMode];
    const totalW = cols.length * cw;

    function dateToX(d) {
      if (!d) return 0;
      const date = new Date(d+'T00:00:00');
      const diffMs = date - minDate;
      const diffUnit = viewMode === 'day' ? 1000*60*60*24 : viewMode === 'week' ? 1000*60*60*24*7 : 1000*60*60*24*30.5;
      return Math.max(0, (diffMs / diffUnit) * cw);
    }

    function durationToW(start, end) {
      if (!start || !end) return cw;
      const s = new Date(start+'T00:00:00');
      const e = new Date(end+'T00:00:00');
      const diffMs = e - s;
      const diffUnit = viewMode === 'day' ? 1000*60*60*24 : viewMode === 'week' ? 1000*60*60*24*7 : 1000*60*60*24*30.5;
      return Math.max(cw * 0.4, (diffMs / diffUnit) * cw);
    }

    const todayX = dateToX(today.toISOString().slice(0,10));

    const statusColors = {
      'Concluída':        '#00C853',
      'Em Andamento':     '#1E88E5',
      'Não Iniciada':     '#546E7A',
      'Aguardando Peça':  '#FF9800',
      'Aguardando Recurso':'#FF9800',
      'Aguardando Aprovação':'#FF9800',
      'Bloqueada':        '#9C27B0',
    };

    // Group by equipment
    const byEq = {};
    tasks.forEach(t => {
      if (!byEq[t.equipmentId]) byEq[t.equipmentId] = [];
      byEq[t.equipmentId].push(t);
    });

    let taskRows = '';
    let taskListRows = '';
    Object.entries(byEq).forEach(([eqId, eqTasks]) => {
      const eqCode = equipMap[eqId] || eqId;
      // Group header
      taskListRows += `<div style="padding:var(--space-2) var(--space-3);background:rgba(21,101,192,0.15);font-weight:700;font-size:var(--text-xs);color:var(--brand-primary-light);border-bottom:1px solid var(--border-card);">${eqCode}</div>`;
      taskRows += `<div style="height:36px;background:rgba(21,101,192,0.08);border-bottom:1px solid rgba(255,255,255,0.04);position:relative;">
        <div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;">
          ${cols.map(c=>`<div style="width:${cw}px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.04);"></div>`).join('')}
        </div>
      </div>`;
      eqTasks.forEach(t => {
        const x = dateToX(t.dataPlanejadaInicio);
        const w = durationToW(t.dataPlanejadaInicio, t.dataPlanejadaTermino);
        const today2 = new Date().toISOString().slice(0,10);
        const isLate = t.dataPlanejadaTermino && t.dataPlanejadaTermino < today2 && t.status !== 'Concluída';
        const barColor = isLate ? '#F44336' : (statusColors[t.status] || '#546E7A');
        const fillPct = t.pctExecutado || 0;
        taskListRows += `<div style="display:flex;align-items:center;padding:0 var(--space-3);height:40px;border-bottom:1px solid var(--border-card);gap:var(--space-2);">
          <span style="width:8px;height:8px;border-radius:50%;background:${barColor};flex-shrink:0;"></span>
          <span style="font-size:11px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.descricao}">${t.descricao}</span>
          <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${t.pctExecutado}%</span>
        </div>`;
        taskRows += `<div style="height:40px;border-bottom:1px solid var(--border-card);position:relative;">
          <div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;">
            ${cols.map(c=>`<div style="width:${cw}px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.04);"></div>`).join('')}
          </div>
          <div title="${t.descricao} — ${t.status} — ${fillPct}%" style="position:absolute;left:${x}px;width:${w}px;top:8px;height:24px;border-radius:4px;background:${barColor};opacity:.85;overflow:hidden;cursor:pointer;" onclick="void(0)">
            <div style="height:100%;width:${fillPct}%;background:rgba(255,255,255,0.25);border-radius:4px;"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 6px;font-size:10px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;">${t.descricao}</div>
          </div>
          ${t.critico ? `<div style="position:absolute;left:${x-2}px;width:${w+4}px;top:6px;height:28px;border-radius:5px;border:2px solid rgba(244,67,54,.7);pointer-events:none;"></div>` : ''}
        </div>`;
      });
    });

    const colHeaders = cols.map(c => {
      let label = '';
      if (viewMode === 'day') label = `${c.getDate()}/${c.getMonth()+1}`;
      else if (viewMode === 'week') label = `${c.getDate()}/${c.getMonth()+1}`;
      else label = c.toLocaleDateString('pt-BR', {month:'short', year:'2-digit'});
      const isWeekend = viewMode==='day' && (c.getDay()===0||c.getDay()===6);
      return `<div style="width:${cw}px;flex-shrink:0;font-size:10px;color:${isWeekend?'rgba(244,67,54,.7)':'var(--text-muted)'};text-align:center;border-right:1px solid var(--border-card);padding:4px 0;">${label}</div>`;
    }).join('');

    return `
      <div style="display:flex;border:1px solid var(--border-card);border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-card);">
        <!-- Task list panel (fixed left) -->
        <div style="width:260px;flex-shrink:0;border-right:2px solid var(--border-hover);">
          <div style="height:36px;background:var(--bg-base);display:flex;align-items:center;padding:0 var(--space-3);font-size:var(--text-xs);font-weight:700;color:var(--text-muted);border-bottom:1px solid var(--border-card);">TAREFA</div>
          ${taskListRows}
        </div>
        <!-- Scrollable timeline -->
        <div style="flex:1;overflow-x:auto;overflow-y:hidden;">
          <div style="min-width:${totalW}px;position:relative;">
            <!-- Column headers -->
            <div style="display:flex;height:36px;background:var(--bg-base);border-bottom:1px solid var(--border-card);position:sticky;top:0;z-index:2;">${colHeaders}
              <!-- Today marker header -->
              <div style="position:absolute;left:${todayX}px;top:0;bottom:0;width:2px;background:rgba(244,67,54,.5);pointer-events:none;"></div>
            </div>
            <!-- Rows -->
            <div style="position:relative;">${taskRows}
              <!-- Today line -->
              <div style="position:absolute;left:${todayX}px;top:0;bottom:0;width:2px;background:rgba(244,67,54,.8);pointer-events:none;z-index:1;">
                <div style="position:absolute;top:4px;left:-16px;background:var(--color-danger);color:white;font-size:9px;padding:1px 4px;border-radius:2px;white-space:nowrap;">HOJE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Legend -->
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-top:var(--space-4);padding:var(--space-3) var(--space-4);background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-card);">
        ${Object.entries(statusColors).map(([s,c])=>`<div style="display:flex;align-items:center;gap:var(--space-2);"><div style="width:12px;height:12px;border-radius:3px;background:${c};"></div><span style="font-size:var(--text-xs);color:var(--text-muted)">${s}</span></div>`).join('')}
        <div style="display:flex;align-items:center;gap:var(--space-2);"><div style="width:12px;height:12px;border-radius:3px;background:#F44336;"></div><span style="font-size:var(--text-xs);color:var(--text-muted)">Atrasada</span></div>
        <div style="display:flex;align-items:center;gap:var(--space-2);"><div style="width:12px;height:4px;border:2px solid rgba(244,67,54,.7);border-radius:2px;"></div><span style="font-size:var(--text-xs);color:var(--text-muted)">Crítica</span></div>
      </div>
    `;
  }

  function setEq(id) { window.setGlobalEqFilter(id); }
  function setView(m) { viewMode = m; Router.navigate('gantt', { force: true }); }
  return { render, setEq, setView };
})();

// ================================================================
// CRITICAL PATH MODULE
// ================================================================
window.CriticalPath = (() => {
  function calculate(tasks) {
    const taskMap = {};
    tasks.forEach(t => { taskMap[t.id] = { ...t, es: 0, ef: 0, ls: 0, lf: 0, float: 0 }; });

    function duration(t) {
      if (t.dataPlanejadaInicio && t.dataPlanejadaTermino) return Math.max(1, daysBetween(t.dataPlanejadaInicio, t.dataPlanejadaTermino));
      return (t.horasPlanejadas || 8) / 8;
    }

    // Topological sort
    const visited = new Set(), order = [];
    function visit(id) {
      if (visited.has(id)) return;
      visited.add(id);
      const t = taskMap[id];
      if (t) (t.predecessoras || []).forEach(pid => visit(pid));
      order.push(id);
    }
    Object.keys(taskMap).forEach(id => visit(id));

    // Forward pass
    order.forEach(id => {
      const t = taskMap[id];
      if (!t) return;
      const preds = (t.predecessoras || []).map(pid => taskMap[pid]).filter(Boolean);
      t.es = preds.length ? Math.max(...preds.map(p => p.ef)) : 0;
      t.ef = t.es + duration(t);
    });

    const projectDuration = Math.max(0, ...Object.values(taskMap).map(t => t.ef));

    // Backward pass
    [...order].reverse().forEach(id => {
      const t = taskMap[id];
      if (!t) return;
      const succs = Object.values(taskMap).filter(s => (s.predecessoras || []).includes(id));
      t.lf = succs.length ? Math.min(...succs.map(s => s.ls)) : projectDuration;
      t.ls = t.lf - duration(t);
      t.float = Math.round((t.ls - t.es) * 10) / 10;
    });

    const criticalTasks = Object.values(taskMap).filter(t => t.float <= 0);
    return { criticalTasks, allTasks: Object.values(taskMap), projectDuration };
  }

  function render() {
    const eqs = DB.equipment.list();
    const allTasks = DB.tasks.getAll();
    const result = calculate(allTasks);

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg></div>Caminho Crítico</div>
        <div class="badge badge-danger" style="font-size:var(--text-sm);padding:var(--space-2) var(--space-4);">${result.criticalTasks.length} tarefas críticas</div>
      </div>

      <!-- Critical path chain -->
      ${result.criticalTasks.length > 0 ? `
      <div class="card" style="margin-bottom:var(--space-5);border-color:rgba(244,67,54,.3);background:rgba(244,67,54,.03);">
        <div class="card-header"><div class="card-title" style="color:var(--color-danger)">⚡ Caminho Crítico</div><span style="font-size:var(--text-xs);color:var(--text-muted)">Duração total do projeto: ${result.projectDuration.toFixed(0)} dias</span></div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:var(--space-2);">
          ${result.criticalTasks.map((t,i) => `
            <div style="background:rgba(244,67,54,.12);border:1px solid rgba(244,67,54,.3);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);font-size:var(--text-xs);color:var(--color-danger);font-weight:600;">${t.descricao}</div>
            ${i < result.criticalTasks.length-1 ? '<span style="color:var(--color-danger);font-weight:700;">→</span>' : ''}
          `).join('')}
        </div>
      </div>` : ''}

      <!-- All tasks CPM table -->
      <div class="table-wrap">
        <table>
          <thead><tr><th>Tarefa</th><th>Equipamento</th><th>Disc.</th><th>Dur.</th><th>ES</th><th>EF</th><th>LS</th><th>LF</th><th>Folga</th><th>Status</th></tr></thead>
          <tbody>
            ${result.allTasks.map(t => {
              const eq = DB.equipment.get(t.equipmentId);
              const isCrit = t.float <= 0;
              const floatClass = t.float <= 0 ? 'danger' : t.float <= 3 ? 'warning' : 'success';
              return `<tr style="${isCrit?'background:rgba(244,67,54,.07);':''}">
                <td><div style="font-weight:${isCrit?'700':'400'};color:${isCrit?'var(--color-danger)':'var(--text-primary)'};">${t.descricao}${isCrit?' ⚡':''}</div></td>
                <td>${eq?.codigo||'—'}</td>
                <td><span class="badge badge-ghost" style="font-size:10px">${t.disciplina||'—'}</span></td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${((t.horasPlanejadas||8)/8).toFixed(0)}d</td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${t.es.toFixed(0)}</td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${t.ef.toFixed(0)}</td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${t.ls.toFixed(0)}</td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${t.lf.toFixed(0)}</td>
                <td><span class="badge badge-${floatClass}">${t.float.toFixed(0)}d</span></td>
                <td>${statusBadge(t.status)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Restrictions impact -->
      ${(() => {
        const openRestr = DB.restrictions.getAll().filter(r=>r.status==='Aberta'&&r.impactoCaminhosCriticos);
        return openRestr.length > 0 ? `<div class="card" style="margin-top:var(--space-5);">
          <div class="card-header"><div class="card-title" style="color:var(--color-danger)">🚫 Restrições Impactando o Caminho Crítico</div></div>
          ${openRestr.map(r=>`<div style="padding:var(--space-3);background:var(--color-danger-bg);border-radius:var(--radius-md);margin-bottom:var(--space-2);font-size:var(--text-sm)">${r.descricao}</div>`).join('')}
        </div>` : '';
      })()}
    </div>`;
  }

  function isTaskCritical(task, allEqTasks) {
    if (!task) return false;
    if (task.critico) return true;
    if (!allEqTasks && window.DB && window.DB.tasks) {
      allEqTasks = window.DB.tasks.getByEquipment(task.equipmentId);
    }
    if (!allEqTasks || !allEqTasks.length) return false;
    try {
      const result = calculate(allEqTasks);
      return result.criticalTasks.some(ct => ct.id === task.id);
    } catch (e) {}
    return false;
  }

  return { render, calculate, isTaskCritical };
})();

// ================================================================
// PARTS MODULE
// ================================================================
window.PartsModule = (() => {
  function render() {
    const parts = DB.parts.getAll();
    const eqs = DB.equipment.list();
    const equipMap = {};
    eqs.forEach(e => { equipMap[e.id] = e.codigo; });

    const stats = {
      total: parts.length,
      pendentes: parts.filter(p => ['Solicitada','Comprada','Em Transporte'].includes(p.status)).length,
      criticas: parts.filter(p => p.critica).length,
      transporte: parts.filter(p => p.status === 'Em Transporte').length,
      recebidas: parts.filter(p => ['Recebida','Instalada'].includes(p.status)).length,
    };

    const criticalBlocking = parts.filter(p => p.critica && ['Solicitada','Comprada','Em Transporte'].includes(p.status));

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg></div>Falta de Peças</div>
        <button class="btn btn-primary" onclick="PartsModule.openCreate()">+ Registrar Peça Faltante</button>
      </div>

      <!-- KPI row -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:var(--space-3);margin-bottom:var(--space-5);">
        ${[
          {label:'Total',value:stats.total,cls:'primary'},
          {label:'Pendentes',value:stats.pendentes,cls:'warning'},
          {label:'Críticas',value:stats.criticas,cls:'danger'},
          {label:'Em Transporte',value:stats.transporte,cls:'info'},
          {label:'Recebidas',value:stats.recebidas,cls:'success'},
        ].map(k=>`<div style="background:var(--bg-card);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;border:1px solid var(--border-card);">
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-${k.cls})">${k.value}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted)">${k.label}</div>
        </div>`).join('')}
      </div>

      <!-- Critical alert -->
      ${criticalBlocking.length > 0 ? `<div class="alert alert-danger" style="margin-bottom:var(--space-4);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374z"/></svg>
        <div class="alert-content"><div class="alert-title">${criticalBlocking.length} peça(s) crítica(s) bloqueando o Caminho Crítico!</div>
        <div class="alert-msg">${criticalBlocking.map(p=>p.descricao).join(', ')}</div></div>
      </div>` : ''}

      <!-- Table -->
      <div class="table-wrap">
        <table>
          <thead><tr><th>Equipamento</th><th>S.A.</th><th>Código / Peça</th><th>Qtd</th><th>Data Solicitação</th><th>Data Real</th><th>Entregue?</th><th>Status</th><th>Crítica</th><th>Ações</th></tr></thead>
          <tbody>
            ${parts.map(p => {
              const isEntregue = p.entregue || p.status === 'Recebida' || p.status === 'Instalada';
              return `<tr>
                <td><strong>${equipMap[p.equipmentId]||'—'}</strong></td>
                <td><code>${p.sa||'—'}</code></td>
                <td>
                  <strong>${p.descricao}</strong>
                  <br><small style="color:var(--text-muted)">${p.codigo||'—'}</small>
                </td>
                <td>${p.quantidade||1}</td>
                <td>${p.dataSolicitacao ? formatDate(p.dataSolicitacao) : '—'}</td>
                <td>${p.dataReal ? formatDate(p.dataReal) : '—'}</td>
                <td style="text-align:center;">
                  <input type="checkbox" ${isEntregue?'checked':''} onclick="PartsModule.toggleEntregue('${p.id}', this.checked)" style="cursor:pointer;" />
                </td>
                <td>${statusBadge(p.status)}</td>
                <td>${p.critica ? '<span class="badge badge-danger">Impacta Liberação</span>' : '<span class="badge badge-ghost">Não</span>'}</td>
                <td><div class="table-actions">
                  <select style="font-size:var(--text-xs);padding:var(--space-1) var(--space-2);background:var(--bg-base);border:1px solid var(--border-card);border-radius:var(--radius-sm);color:var(--text-primary);" onchange="PartsModule.updateStatus('${p.id}',this.value)">
                    ${['Solicitada','Comprada','Em Transporte','Recebida','Instalada'].map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}
                  </select>
                  <button class="btn btn-secondary btn-sm" onclick="PartsModule.openEdit('${p.id}')" title="Editar Peça Faltante">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="PartsModule.deletePart('${p.id}')" title="Excluir Peça Faltante">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397"/></svg>
                  </button>
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <!-- Modal -->
    <div class="modal-overlay" id="modal-part">
      <div class="modal"><div class="modal-header"><div class="modal-title" id="part-modal-title">Peça</div><button class="modal-close" onclick="closeModal('modal-part')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
      <div class="modal-body" id="part-modal-body"></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-part')">Cancelar</button><button class="btn btn-primary" onclick="PartsModule.save()">Salvar</button></div></div>
    </div>`;
  }

  function partForm(p) {
    const eqs = DB.equipment.list();
    const today = new Date().toISOString().slice(0, 10);
    const solDate = p?.dataSolicitacao || today;
    const prevDate = p?.dataPrevista || p?.prazoEntrega || today;
    const realDate = p?.dataReal || '';
    const isEntregue = p?.entregue || p?.status === 'Recebida' || p?.status === 'Instalada';

    return `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-row">
        <div class="form-group">
          <label>Equipamento *</label>
          <select id="pt-eq">${eqs.map(e=>`<option value="${e.id}" ${p?.equipmentId===e.id?'selected':''}>${e.codigo}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label>S.A. (Solicitação de Almoxarifado)</label>
          <input id="pt-sa" value="${p?.sa||''}" placeholder="Ex: SA-2026-1234" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Código da Peça</label>
          <input id="pt-cod" value="${p?.codigo||''}" placeholder="Ex: ROL-6308" />
        </div>
        <div class="form-group">
          <label>Descrição *</label>
          <input id="pt-desc" value="${p?.descricao||''}" required placeholder="Ex: Rolamento do Eixo" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Quantidade</label>
          <input type="number" id="pt-qtd" value="${p?.quantidade||1}" min="1" />
        </div>
        <div class="form-group">
          <label>Fornecedor</label>
          <input id="pt-forn" value="${p?.fornecedor||''}" placeholder="Ex: Rexroth" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Fabricante</label>
          <input id="pt-fab" value="${p?.fabricante||''}" placeholder="Ex: NSK" />
        </div>
        <div class="form-group">
          <label>N° do Pedido</label>
          <input id="pt-pedido" value="${p?.pedido||''}" placeholder="Ex: PO-45000" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data Solicitação</label>
          <input type="date" id="pt-sol" value="${toDateInput(solDate)}" />
        </div>
        <div class="form-group">
          <label>Entrega Real</label>
          <input type="date" id="pt-real" value="${toDateInput(realDate)}" />
        </div>
      </div>
      <div class="form-row" style="align-items:center;gap:var(--space-4);">
        <div class="form-group" style="flex:1;">
          <label>Status</label>
          <select id="pt-status" onchange="PartsModule.onStatusFormChange(this.value)">
            ${['Solicitada','Comprada','Em Transporte','Recebida','Instalada'].map(s=>`<option ${p?.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="checkbox-wrap" style="margin-top:18px;">
          <input type="checkbox" id="pt-entregue" ${isEntregue?'checked':''} onchange="PartsModule.onEntregueFormChange(this.checked)" />
          <label for="pt-entregue" style="font-weight:bold;">Entregue? (Sim/Não)</label>
        </div>
      </div>
      <div class="checkbox-wrap">
        <input type="checkbox" id="pt-critica" ${p?.critica?'checked':''} />
        <label for="pt-critica" style="font-weight:bold;color:var(--color-danger);">Peça Crítica (bloqueia caminho crítico)</label>
      </div>
      <input type="hidden" id="pt-editing-id" value="${p?.id||''}" />
    </div>`;
  }

  function openCreate() {
    document.getElementById('part-modal-title').textContent = 'Nova Peça Faltante';
    document.getElementById('part-modal-body').innerHTML = partForm(null);
    openModal('modal-part');
  }

  function openEdit(id) {
    const p = DB.parts.get(id);
    if (!p) return;
    document.getElementById('part-modal-title').textContent = 'Editar Peça Faltante';
    document.getElementById('part-modal-body').innerHTML = partForm(p);
    openModal('modal-part');
  }

  function save() {
    const id = document.getElementById('pt-editing-id').value;
    const desc = document.getElementById('pt-desc').value.trim();
    if (!desc) { Toast.error('Erro', 'Descrição é obrigatória.'); return; }

    const isEntregue = document.getElementById('pt-entregue').checked;
    let status = document.getElementById('pt-status').value;
    let dataReal = document.getElementById('pt-real').value;
    const today = new Date().toISOString().slice(0, 10);

    if (isEntregue) {
      if (status !== 'Recebida' && status !== 'Instalada') status = 'Recebida';
      if (!dataReal) dataReal = today;
    } else {
      if (status === 'Recebida' || status === 'Instalada') status = 'Solicitada';
      dataReal = '';
    }

    const data = {
      equipmentId: document.getElementById('pt-eq').value,
      codigo: document.getElementById('pt-cod').value.trim(),
      descricao: desc,
      sa: document.getElementById('pt-sa').value.trim(),
      quantidade: parseInt(document.getElementById('pt-qtd').value) || 1,
      fornecedor: document.getElementById('pt-forn').value.trim(),
      fabricante: document.getElementById('pt-fab').value.trim(),
      dataSolicitacao: document.getElementById('pt-sol').value,
      dataPrevista: '',
      dataReal: dataReal,
      status: status,
      pedido: document.getElementById('pt-pedido').value.trim(),
      critica: document.getElementById('pt-critica').checked,
      entregue: isEntregue
    };

    if (id) {
      DB.parts.update(id, data);
      Toast.success('Peça Faltante atualizada!');
    } else {
      DB.parts.create(data);
      Toast.success('Peça Faltante registrada!');
    }
    closeModal('modal-part');
    Router.navigate('parts', { force: true });
  }

  function updateStatus(id, status) {
    const today = new Date().toISOString().slice(0, 10);
    const isEntregue = ['Recebida', 'Instalada'].includes(status);
    const dataReal = isEntregue ? today : '';

    DB.parts.update(id, {
      status,
      entregue: isEntregue,
      dataReal: dataReal
    });

    if (status === 'Recebida') Toast.success('Peça recebida!', 'Verificar restrições relacionadas');
    Router.navigate('parts', { force: true });
  }

  function toggleEntregue(id, isChecked) {
    const today = new Date().toISOString().slice(0, 10);
    const status = isChecked ? 'Recebida' : 'Solicitada';
    const dataReal = isChecked ? today : '';

    DB.parts.update(id, {
      entregue: isChecked,
      status: status,
      dataReal: dataReal
    });

    if (isChecked) {
      Toast.success('Peça entregue!', 'Status atualizado para Recebida.');
    } else {
      Toast.success('Status da peça atualizado.');
    }
    Router.navigate('parts', { force: true });
  }

  function onStatusFormChange(status) {
    const entregueCheckbox = document.getElementById('pt-entregue');
    const realInput = document.getElementById('pt-real');
    const today = new Date().toISOString().slice(0, 10);
    if (entregueCheckbox && realInput) {
      if (['Recebida', 'Instalada'].includes(status)) {
        entregueCheckbox.checked = true;
        if (!realInput.value) {
          realInput.value = today;
        }
      } else {
        entregueCheckbox.checked = false;
        realInput.value = '';
      }
    }
  }

  function onEntregueFormChange(checked) {
    const statusSelect = document.getElementById('pt-status');
    const realInput = document.getElementById('pt-real');
    const today = new Date().toISOString().slice(0, 10);
    if (statusSelect && realInput) {
      if (checked) {
        if (statusSelect.value !== 'Recebida' && statusSelect.value !== 'Instalada') {
          statusSelect.value = 'Recebida';
        }
        if (!realInput.value) {
          realInput.value = today;
        }
      } else {
        if (statusSelect.value === 'Recebida' || statusSelect.value === 'Instalada') {
          statusSelect.value = 'Solicitada';
        }
        realInput.value = '';
      }
    }
  }

  function deletePart(id) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem excluir peças.');
      return;
    }
    confirmDialog('Excluir Peça', 'Tem certeza?', () => { DB.parts.delete(id); Router.navigate('parts', { force: true }); Toast.success('Peça excluída'); });
  }

  return {
    render, openCreate, openEdit, save, updateStatus, toggleEntregue,
    onStatusFormChange, onEntregueFormChange, deletePart
  };
})();

// ================================================================
// WORKFORCE MODULE
// ================================================================
window.WorkforceModule = (() => {
  let activeTab = 'team';
  let editingWorkerId = null;
  let activeSector = 'Todos';

  function setSector(s) {
    activeSector = s;
    Router.navigate('workforce', { force: true });
  }

  function render() {
    const workers = DB.workforce.list();
    const timesheets = DB.timesheets.list();
    const today = new Date().toISOString().slice(0,10);

    const monthTs = timesheets.filter(t => t.data && t.data.slice(0,7) === today.slice(0,7) && (!t.tipo || t.tipo === 'Trabalho'));
    const totalHours = monthTs.reduce((s,t)=>s+(parseFloat(t.horasTrabalhadas)||0),0);

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-4.5 0 2.625 2.625 0 014.5 0z"/></svg></div>Mão de Obra</div>
        ${activeTab === 'team' ? '<button class="btn btn-primary" onclick="WorkforceModule.openCreateWorker()">+ Novo Funcionário</button>' :
          activeTab === 'timesheets' ? '<button class="btn btn-primary" onclick="WorkforceModule.openCreateTimesheet()">+ Apontamento</button>' : ''}
      </div>
      <div class="tabs"><div class="tabs-nav">
        <button class="tab-btn ${activeTab==='team'?'active':''}" onclick="WorkforceModule.setTab('team')">Equipe (${workers.length})</button>
        <button class="tab-btn ${activeTab==='timesheets'?'active':''}" onclick="WorkforceModule.setTab('timesheets')">Apontamentos (${timesheets.length})</button>
        <button class="tab-btn ${activeTab==='productivity'?'active':''}" onclick="WorkforceModule.setTab('productivity')">Produtividade</button>
      </div>
      ${activeTab === 'team' ? `
        <div class="tab-panel active" style="padding:var(--space-4);">
          ${(() => {
            if (workers.length === 0) return '<div class="empty-state"><p>Nenhum funcionário na equipe.</p></div>';
            const allSectors = [...new Set(workers.map(w => w.disciplina || 'Sem Setor'))].sort();
            const filterHtml = `
              <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap;">
                <button class="btn btn-sm ${activeSector === 'Todos' ? 'btn-primary' : 'btn-ghost'}" style="border:1px solid var(--border-color);" onclick="WorkforceModule.setSector('Todos')">Todos</button>
                ${allSectors.map(s => `
                  <button class="btn btn-sm ${activeSector === s ? 'btn-primary' : 'btn-ghost'}" style="border:1px solid var(--border-color);" onclick="WorkforceModule.setSector('${s}')">${s}</button>
                `).join('')}
                <button class="btn btn-sm ${activeSector === '2º Turno' ? 'btn-primary' : 'btn-ghost'}" style="border:1px solid var(--border-color);" onclick="WorkforceModule.setSector('2º Turno')">2º Turno</button>
              </div>
            `;
            
            const sectorsToRender = activeSector === 'Todos' ? allSectors : 
                                    activeSector === '2º Turno' ? allSectors : [activeSector];
            
            return filterHtml + sectorsToRender.map(sector => {
              const sectorWorkers = workers.filter(w => {
                const wSector = w.disciplina || 'Sem Setor';
                if (activeSector === '2º Turno') return wSector === sector && w.turno === '2º Turno';
                return wSector === sector;
              });
              if (sectorWorkers.length === 0) return '';
              return `
                <h3 style="margin-top:var(--space-2);margin-bottom:var(--space-3);color:var(--text-primary);border-bottom:1px solid var(--border-color);padding-bottom:var(--space-2);font-size:16px;display:flex;align-items:center;gap:8px;">
                  ${sector} <span class="badge badge-ghost">${sectorWorkers.length}</span>
                </h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-4);margin-bottom:var(--space-6);">
                  ${sectorWorkers.map(w => {
                    if (!w) return '';
                    const wHours = monthTs.filter(t=>t.workerId===w.id).reduce((s,t)=>s+(parseFloat(t.horasTrabalhadas)||0),0);
                    
                    const eq = w.equipmentId ? DB.equipment.get(w.equipmentId) : null;
                    const isAllocated = eq && eq.status !== 'Liberado';
                    const allocationBadge = isAllocated
                      ? `<div style="margin:var(--space-1) 0"><span class="badge" style="background:rgba(255, 152, 0, 0.15);color:#ff9800;border:1px solid rgba(255,152,0,0.2);" title="${w.justificativa ? 'Justificativa: ' + w.justificativa : ''}">Alocado: ${eq.codigo}</span></div>
                         ${w.justificativa ? `<div style="font-size:10px;color:var(--text-muted);font-style:italic;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px auto 0;" title="${w.justificativa}">${w.justificativa}</div>` : ''}`
                      : `<div style="margin:var(--space-1) 0"><span class="badge badge-success">Disponível</span></div>`;

                    return `<div class="card" style="text-align:center;padding:var(--space-4);display:flex;flex-direction:column;justify-content:space-between;min-height:280px;">
                      <div>
                        <div class="avatar" style="width:48px;height:48px;font-size:var(--text-base);margin:0 auto var(--space-2);">${avatarInitials(w.nome)}</div>
                        <div style="font-weight:700;font-size:var(--text-sm);color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${w.nome}">${w.nome}</div>
                        <div style="font-size:var(--text-xs);color:var(--text-muted)">${w.funcao || 'Sem Função'} · ${w.matricula || 'Sem Matrícula'}</div>
                        <div class="badge badge-ghost" style="margin:var(--space-2) 0">${w.disciplina}</div>
                        <div style="font-size:var(--text-xs);color:var(--text-muted)">Horas este mês: <strong style="color:var(--brand-primary-light)">${wHours.toFixed(0)}h</strong></div>
                        <div style="margin-top:var(--space-2);">${typeof statusBadge === 'function' ? statusBadge(w.status) : ''}</div>
                        <div style="margin-top:var(--space-2);">
                          ${(function(){
                            const vList = window.DB && DB.vacations ? DB.vacations.list().filter(v => v.workerId === w.id) : [];
                            const tIso = new Date().toISOString().slice(0,10);
                            const activeV = vList.find(v => tIso >= v.startDate && tIso <= v.endDate);
                            if (activeV) return `<div style="margin:var(--space-1) 0"><span class="badge" style="background:rgba(33, 150, 243, 0.15);color:#2196F3;border:1px solid rgba(33, 150, 243, 0.2);">De Férias</span></div><div style="font-size:10px;color:var(--text-muted);font-style:italic;">Até ${activeV.endDate.split('-').reverse().join('/')}</div>`;
                            return allocationBadge;
                          })()}
                        </div>
                      </div>
                      <div style="display:flex;justify-content:center;gap:var(--space-2);margin-top:var(--space-3);border-top:1px solid var(--border-color);padding-top:var(--space-2);flex-wrap:wrap;">
                        <button class="btn btn-ghost btn-sm" onclick="WorkforceModule.openEditWorker('${w.id}')" title="Editar Funcionário" style="display:flex;align-items:center;gap:4px;">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                          Editar
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="WorkforceModule.openVacationModal('${w.id}')" title="Agendar Férias" style="display:flex;align-items:center;gap:4px;color:var(--color-info);">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                          Férias
                        </button>
                        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);display:flex;align-items:center;gap:4px;" onclick="WorkforceModule.deleteWorker('${w.id}', '${w.nome ? w.nome.replace(/'/g, "\\\\'") : ''}')" title="Excluir Funcionário">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397" /></svg>
                        </button>
                      </div>
                    </div>`
                  }).join('')}
                </div>
              `
            }).join('');
          })()}
        </div>
      ` : activeTab === 'timesheets' ? `
        <div class="tab-panel active">
          <div class="table-wrap"><table>
            <thead><tr><th>Data</th><th>Funcionário</th><th>Equipamento</th><th>Início</th><th>Fim</th><th>Horas</th><th>Observação</th></tr></thead>
            <tbody>
              ${timesheets.slice(-50).reverse().map(t => {
                const w = workers.find(w=>w.id===t.workerId);
                const eq = DB.equipment.get(t.equipmentId);
                return `<tr>
                  <td>${formatDate(t.data)}</td>
                  <td>${w?.nome||t.workerNome||'—'}</td>
                  <td>${eq?.codigo||'—'}</td>
                  <td style="font-family:var(--font-mono)">${t.horaInicio||'—'}</td>
                  <td style="font-family:var(--font-mono)">${t.horaFim||'—'}</td>
                  <td style="font-weight:700;color:var(--brand-primary-light)">${(t.horasTrabalhadas||0).toFixed(1)}h</td>
                  <td style="font-size:var(--text-xs);color:var(--text-muted)">${t.observacao||'—'}</td>
                </tr>`;
              }).join('')}
              <tr style="font-weight:700;background:var(--bg-base)"><td colspan="5" style="text-align:right">Total do mês:</td><td style="color:var(--brand-primary-light)">${totalHours.toFixed(0)}h</td><td></td></tr>
            </tbody>
          </table></div>
        </div>
      ` : `
        <div class="tab-panel active" style="padding:var(--space-4);">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-5);">
            <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--text-2xl);font-weight:800;color:var(--brand-primary-light)">${totalHours.toFixed(0)}h</div><div style="font-size:var(--text-xs);color:var(--text-muted)">Total Horas no Mês</div></div>
            <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-success)">${workers.filter(w=>w.status==='Ativo').length}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">Funcionários Ativos</div></div>
            <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-info)">${workers.length > 0 ? (totalHours / workers.length).toFixed(0) : 0}h</div><div style="font-size:var(--text-xs);color:var(--text-muted)">Média por Funcionário</div></div>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Funcionário</th><th>Disciplina</th><th>Horas no Mês</th><th>Apontamentos</th></tr></thead>
            <tbody>
              ${workers.map(w => {
                const wTs = monthTs.filter(t=>t.workerId===w.id);
                const wHours = wTs.reduce((s,t)=>s+(parseFloat(t.horasTrabalhadas)||0),0);
                return `<tr>
                  <td><div style="display:flex;align-items:center;gap:var(--space-2)"><div class="avatar avatar-sm">${avatarInitials(w.nome)}</div><span>${w.nome}</span></div></td>
                  <td>${w.disciplina}</td>
                  <td><strong style="color:var(--brand-primary-light)">${wHours.toFixed(0)}h</strong></td>
                  <td>${wTs.length}</td>
                </tr>`;
              }).sort((a,b)=>0).join('')}
            </tbody>
          </table></div>
        </div>
      `}
      </div>
    </div>

    <!-- Worker modal -->
    <div class="modal-overlay" id="modal-worker">
      <div class="modal"><div class="modal-header"><div class="modal-title">Funcionário</div><button class="modal-close" onclick="closeModal('modal-worker')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
      <div class="modal-body" id="worker-modal-body"></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-worker')">Cancelar</button><button class="btn btn-primary" onclick="WorkforceModule.saveWorker()">Salvar</button></div></div>
    </div>
    <!-- Timesheet modal -->
    <div class="modal-overlay" id="modal-timesheet">
      <div class="modal"><div class="modal-header"><div class="modal-title">Apontamento de Horas</div><button class="modal-close" onclick="closeModal('modal-timesheet')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
      <div class="modal-body" id="timesheet-modal-body"></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-timesheet')">Cancelar</button><button class="btn btn-primary" onclick="WorkforceModule.saveTimesheet()">Salvar</button></div></div>
    </div>
    <!-- Vacation modal -->
    <div class="modal-overlay" id="modal-vacation">
      <div class="modal"><div class="modal-header"><div class="modal-title">Agendar Férias</div><button class="modal-close" onclick="closeModal('modal-vacation')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
      <div class="modal-body">
        <input type="hidden" id="vacation-worker-id">
        <div class="form-group">
          <label>Funcionário</label>
          <input type="text" id="vacation-worker-name" class="form-control" disabled>
        </div>
        <div class="form-row" style="display:flex; gap:10px; margin-top:10px;">
          <div class="form-group" style="flex:1;">
            <label>Data de Início</label>
            <input type="date" id="vacation-start" class="form-control" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label>Data de Fim</label>
            <input type="date" id="vacation-end" class="form-control" required>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('modal-vacation')">Cancelar</button>
        <button class="btn btn-primary" onclick="WorkforceModule.saveVacation()">Agendar Férias</button>
      </div></div>
    </div>`;
  }

  function setTab(tab) { activeTab = tab; Router.navigate('workforce', { force: true }); }

  function openCreateWorker() {
    editingWorkerId = null;
    renderWorkerForm();
  }

  function openEditWorker(id) {
    editingWorkerId = id;
    renderWorkerForm(id);
  }

  function renderWorkerForm(id = null) {
    const worker = id ? DB.workforce.get(id) : null;
    const allEqs = DB.equipment.list();
    const currentEqId = worker?.equipmentId || '';
    const eqs = allEqs.filter(e => e.status !== 'Liberado' || e.id === currentEqId);
    
    const session = window.Auth ? window.Auth.getSession() : null;
    const canBypassLock = session && ['Administrador', 'Desenvolvedor', 'Gerente'].includes(session.perfil);
    const isLocked = worker && currentEqId && allEqs.find(e => e.id === currentEqId)?.status !== 'Liberado' && !canBypassLock;
    const discs = ['Mecânica','Caldeiraria','Elétrica','Usinagem','Pintor','Lavador','Montagem','Subconjunto','Teste','Retrabalho'];
    const funcs = ['Mecânico','Mecânico poços','Ajudante','Ajudante de poços','Eletrecista','Lavador','Soldador','Torneiro','Fresador','Ajustador'];
    
    const activeDiscs = [...discs];
    if (worker?.disciplina && !activeDiscs.includes(worker.disciplina)) {
      activeDiscs.push(worker.disciplina);
    }
    
    const activeFuncs = [...funcs];
    if (worker?.funcao && !activeFuncs.includes(worker.funcao)) {
      activeFuncs.push(worker.funcao);
    }
    
    document.getElementById('worker-modal-body').innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-row">
        <div class="form-group"><label>Nome *</label><input id="wk-nome" value="${worker?.nome || ''}" /></div>
        <div class="form-group"><label>Matrícula</label><input id="wk-mat" value="${worker?.matricula || ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Função</label>
          <select id="wk-func">
            <option value="">Selecione...</option>
            ${activeFuncs.map(f => `<option value="${f}" ${worker?.funcao === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Disciplina</label>
          <select id="wk-disc">
            ${activeDiscs.map(d => `<option value="${d}" ${worker?.disciplina === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Centro de Custo</label>
          <select id="wk-cc">
            <option value="05002101" ${(!worker?.centroCusto || worker?.centroCusto === '05002101') ? 'selected' : ''}>05002101</option>
          </select>
        </div>
        <div class="form-group"><label>Turno</label>
          <select id="wk-turno">
            <option value="1º Turno" ${worker?.turno === '1º Turno' || !worker?.turno ? 'selected' : ''}>1º Turno</option>
            <option value="2º Turno" ${worker?.turno === '2º Turno' ? 'selected' : ''}>2º Turno</option>
            <option value="3º Turno" ${worker?.turno === '3º Turno' ? 'selected' : ''}>3º Turno</option>
            <option value="Comercial" ${worker?.turno === 'Comercial' ? 'selected' : ''}>Comercial</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Status</label>
          <select id="wk-status">
            <option ${worker?.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
            <option ${worker?.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Equipamento Alocado</label>
        <select id="wk-eq" ${isLocked ? 'disabled style="background:var(--bg-base);cursor:not-allowed;"' : ''}>
          <option value="">Nenhum / Disponível</option>
          ${eqs.map(e => `<option value="${e.id}" ${e.id === currentEqId ? 'selected' : ''}>${e.codigo} - ${e.nome}</option>`).join('')}
        </select>
        ${isLocked ? `
          <div style="font-size:var(--text-xs);color:var(--color-warning);margin-top:4px;display:flex;align-items:center;gap:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" /></svg>
            Mão de obra travada no equipamento. Só poderá ser alterada quando o equipamento for liberado.
          </div>
        ` : ''}
      </div>
      <div class="form-group">
        <label>Justificativa de Alocação</label>
        <textarea id="wk-just" rows="2" placeholder="Descreva o motivo desta alocação...">${worker?.justificativa || ''}</textarea>
      </div>
    </div>`;
    
    document.querySelector('#modal-worker .modal-title').textContent = id ? 'Editar Funcionário' : 'Novo Funcionário';
    openModal('modal-worker');
  }

  function saveWorker() {
    const nome = document.getElementById('wk-nome').value.trim();
    if (!nome) { Toast.error('Erro', 'Nome é obrigatório'); return; }
    
    const eqEl = document.getElementById('wk-eq');
    const equipmentId = eqEl ? eqEl.value : '';
    const justificativa = document.getElementById('wk-just').value.trim();
    
    const data = {
      nome,
      matricula: document.getElementById('wk-mat').value.trim(),
      funcao: document.getElementById('wk-func').value.trim(),
      disciplina: document.getElementById('wk-disc').value,
      centroCusto: document.getElementById('wk-cc').value,
      status: document.getElementById('wk-status').value,
      turno: document.getElementById('wk-turno').value,
      equipmentId,
      justificativa
    };
    
    const oldWorker = editingWorkerId ? DB.workforce.get(editingWorkerId) : null;
    
    if (editingWorkerId) {
      DB.workforce.update(editingWorkerId, data);
      Toast.success('Funcionário atualizado!', nome);
    } else {
      DB.workforce.create(data);
      Toast.success('Funcionário cadastrado!', nome);
    }
    
    // Sync with Equipment workforceMap so it shows up in the Equipment Card
    if (oldWorker && oldWorker.equipmentId && oldWorker.equipmentId !== equipmentId) {
      const oldEq = DB.equipment.get(oldWorker.equipmentId);
      if (oldEq && oldEq.workforceMap && oldEq.workforceMap[oldWorker.disciplina] === oldWorker.nome) {
        oldEq.workforceMap[oldWorker.disciplina] = '';
        DB.equipment.update(oldEq.id, oldEq);
      }
    }
    
    if (equipmentId) {
      const newEq = DB.equipment.get(equipmentId);
      if (newEq) {
        if (!newEq.workforceMap) newEq.workforceMap = {};
        newEq.workforceMap[data.disciplina] = data.nome;
        DB.equipment.update(newEq.id, newEq);
      }
    }
    
    closeModal('modal-worker');
    Router.navigate('workforce', { force: true });
  }

  function deleteWorker(id, nome) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem excluir funcionários.');
      return;
    }
    confirmDialog('Excluir Funcionário', `Deseja realmente excluir ${nome}?`, () => {
      DB.workforce.delete(id);
      Router.navigate('workforce', { force: true });
      Toast.success('Funcionário excluído!', nome);
    });
  }

  function openCreateTimesheet() {
    const workers = DB.workforce.list();
    const eqs = DB.equipment.list();
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('timesheet-modal-body').innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group"><label>Funcionário *</label><select id="ts-worker">${workers.map(w=>`<option value="${w.id}" data-nome="${w.nome}">${w.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Equipamento</label><select id="ts-eq"><option value="">—</option>${eqs.map(e=>`<option value="${e.id}">${e.codigo}</option>`).join('')}</select></div>
      <div class="form-group"><label>Data</label><input type="date" id="ts-data" value="${today}" /></div>
      <div class="form-row"><div class="form-group"><label>Hora Início</label><input type="time" id="ts-inicio" value="07:00" /></div>
      <div class="form-group"><label>Hora Fim</label><input type="time" id="ts-fim" value="17:00" /></div></div>
      <div class="form-group"><label>Observação</label><textarea id="ts-obs" rows="2"></textarea></div>
    </div>`;
    openModal('modal-timesheet');
  }

  function saveTimesheet() {
    const wId = document.getElementById('ts-worker').value;
    const inicio = document.getElementById('ts-inicio').value;
    const fim = document.getElementById('ts-fim').value;
    const [h1,m1] = inicio.split(':').map(Number);
    const [h2,m2] = fim.split(':').map(Number);
    const hours = Math.max(0, (h2*60+m2 - h1*60-m1) / 60);
    const w = DB.workforce.get(wId);
    DB.timesheets.create({ workerId: wId, workerNome: w?.nome||'', equipmentId: document.getElementById('ts-eq').value, data: document.getElementById('ts-data').value, horaInicio: inicio, horaFim: fim, horasTrabalhadas: hours, observacao: document.getElementById('ts-obs').value });
    closeModal('modal-timesheet');
    Router.navigate('workforce', { force: true });
    Toast.success('Apontamento registrado!', `${hours.toFixed(1)} horas`);
  }

  function openVacationModal(wId) {
    const w = DB.workforce.get(wId);
    if (!w) return;
    document.getElementById('vacation-worker-id').value = wId;
    document.getElementById('vacation-worker-name').value = w.nome;
    const vList = window.DB && DB.vacations ? DB.vacations.list().filter(v => v.workerId === wId) : [];
    const tIso = new Date().toISOString().slice(0,10);
    const activeV = vList.find(v => tIso >= v.startDate && tIso <= v.endDate);
    if (activeV) {
      document.getElementById('vacation-start').value = activeV.startDate;
      document.getElementById('vacation-end').value = activeV.endDate;
    } else {
      document.getElementById('vacation-start').value = tIso;
      document.getElementById('vacation-end').value = tIso;
    }
    openModal('modal-vacation');
  }

  function saveVacation() {
    const wId = document.getElementById('vacation-worker-id').value;
    const start = document.getElementById('vacation-start').value;
    const end = document.getElementById('vacation-end').value;
    if (!start || !end) { Toast.error('Erro', 'Preencha as datas.'); return; }
    if (start > end) { Toast.error('Erro', 'A data de início não pode ser maior que o fim.'); return; }
    
    const vList = window.DB && DB.vacations ? DB.vacations.list().filter(v => v.workerId === wId) : [];
    const tIso = new Date().toISOString().slice(0,10);
    const activeV = vList.find(v => tIso >= v.startDate && tIso <= v.endDate);
    
    if (activeV) {
      DB.vacations.update(activeV.id, { startDate: start, endDate: end });
    } else {
      DB.vacations.add({ id: window.DB.uid('vac'), workerId: wId, startDate: start, endDate: end });
    }
    
    closeModal('modal-vacation');
    Router.navigate('workforce', { force: true });
    Toast.success('Férias agendadas com sucesso!');
  }

  return { render, setTab, setSector, openCreateWorker, openEditWorker, saveWorker, deleteWorker, openCreateTimesheet, saveTimesheet, openVacationModal, saveVacation };
})();

// ================================================================
// RESTRICTIONS MODULE
// ================================================================
window.RestrictionsModule = (() => {
  function render() {
    const restrictions = DB.restrictions.getAll();
    const open = restrictions.filter(r => r.status === 'Aberta');
    const eqs = DB.equipment.list();
    const equipMap = {};
    eqs.forEach(e => { equipMap[e.id] = e.codigo; });

    const byType = {};
    open.forEach(r => { byType[r.tipo] = (byType[r.tipo] || 0) + 1; });

    const typeColors = {
      'Falta de Peça': 'warning', 'Falta de Mão de Obra': 'info', 'Falta de Ferramenta': 'purple',
      'Aguardando Aprovação': 'ghost', 'Equipamento Não Liberado': 'ghost', 'Dependência Não Concluída': 'danger', 'Outra': 'ghost'
    };

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg></div>Restrições</div>
        <button class="btn btn-primary" onclick="RestrictionsModule.openCreate()">+ Nova Restrição</button>
      </div>

      <!-- KPI row -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3);margin-bottom:var(--space-5);">
        <div style="background:var(--color-danger-bg);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;border:1px solid rgba(244,67,54,.2);">
          <div style="font-size:3rem;font-weight:900;color:var(--color-danger);line-height:1">${open.length}</div>
          <div style="font-size:var(--text-xs);color:var(--color-danger);font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Restrições Abertas</div>
        </div>
        <div style="background:var(--color-success-bg);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-success)">${restrictions.filter(r=>r.status==='Fechada').length}</div>
          <div style="font-size:var(--text-xs);color:var(--color-success)">Fechadas</div>
        </div>
        <div style="background:var(--color-danger-bg);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">
          <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-danger)">${open.filter(r=>r.impactoCaminhosCriticos).length}</div>
          <div style="font-size:var(--text-xs);color:var(--color-danger)">No Caminho Crítico</div>
        </div>
        <div style="background:var(--bg-card);border-radius:var(--radius-md);padding:var(--space-4);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);font-weight:700">Por Tipo</div>
          ${Object.entries(byType).map(([t,c])=>`<div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--text-secondary)"><span>${t.replace('Falta de ','')}</span><strong>${c}</strong></div>`).join('')}
        </div>
      </div>

      <!-- List -->
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${restrictions.map(r => {
          const cls = r.status === 'Aberta' ? 'danger' : 'success';
          const typeCls = typeColors[r.tipo] || 'ghost';
          return `<div class="card hover-lift" style="border-left:3px solid var(--color-${r.status==='Aberta'?'danger':'success'});">
            <div style="display:flex;align-items:flex-start;gap:var(--space-4);">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap;">
                  <span class="badge badge-${typeCls}">${r.tipo}</span>
                  <span class="badge badge-ghost">${equipMap[r.equipmentId]||'—'}</span>
                  ${r.impactoCaminhosCriticos ? '<span class="badge badge-danger">Caminho Crítico</span>' : ''}
                  ${statusBadge(r.status)}
                </div>
                <div style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary);margin-bottom:var(--space-1)">${r.descricao}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted)">Disciplina: ${r.disciplina} · Tarefa: ${r.tarefaBloqueada||'—'} · Aberta: ${formatDate(r.createdAt)}</div>
                ${r.status === 'Fechada' ? `<div style="margin-top:var(--space-2);padding:var(--space-2) var(--space-3);background:var(--color-success-bg);border-radius:var(--radius-sm);font-size:var(--text-xs);color:var(--color-success)">✅ Resolução: ${r.resolution||'—'}</div>` : ''}
              </div>
              <div class="table-actions" style="flex-shrink:0;">
                ${r.status === 'Aberta' ? `<button class="btn btn-success btn-sm" onclick="RestrictionsModule.closeRestriction('${r.id}')">Fechar</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="RestrictionsModule.deleteRestriction('${r.id}')">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397"/></svg>
                </button>
              </div>
            </div>
          </div>`;
        }).join('')}
        ${restrictions.length===0?'<div class="empty-state"><p>Nenhuma restrição registrada</p></div>':''}
      </div>
    </div>
    <!-- Modal -->
    <div class="modal-overlay" id="modal-restriction">
      <div class="modal modal-lg"><div class="modal-header"><div class="modal-title">Nova Restrição</div><button class="modal-close" onclick="closeModal('modal-restriction')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
      <div class="modal-body" id="restriction-modal-body"></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-restriction')">Cancelar</button><button class="btn btn-primary" onclick="RestrictionsModule.save()">Salvar</button></div></div>
    </div>`;
  }

  function openCreate() {
    const eqs = DB.equipment.list();
    const tipos = ['Falta de Peça','Falta de Mão de Obra','Falta de Ferramenta','Aguardando Aprovação','Equipamento Não Liberado','Dependência Não Concluída','Outra'];
    const discs = ['Mecânica','Caldeiraria','Elétrica','Usinagem','Pintor','Lavador','Montagem','Subconjunto','Teste','Retrabalho'];
    document.getElementById('restriction-modal-body').innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-row"><div class="form-group"><label>Tipo *</label><select id="rs-tipo">${tipos.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label>Equipamento</label><select id="rs-eq"><option value="">—</option>${eqs.map(e=>`<option value="${e.id}">${e.codigo}</option>`).join('')}</select></div></div>
      <div class="form-group"><label>Descrição *</label><textarea id="rs-desc" rows="3"></textarea></div>
      <div class="form-row"><div class="form-group"><label>Disciplina</label><select id="rs-disc">${discs.map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>
      <div class="form-group"><label>Tarefa Bloqueada</label><input id="rs-tarefa" /></div></div>
      <div class="checkbox-wrap"><input type="checkbox" id="rs-critico" /><label for="rs-critico">Impacta o Caminho Crítico</label></div>
      <input type="hidden" id="rs-editing-id" value="" />
    </div>`;
    openModal('modal-restriction');
  }

  function save() {
    const desc = document.getElementById('rs-desc').value.trim();
    if (!desc) { Toast.error('Erro', 'Descrição é obrigatória'); return; }
    const data = {
      tipo: document.getElementById('rs-tipo').value,
      descricao: desc,
      equipmentId: document.getElementById('rs-eq').value,
      disciplina: document.getElementById('rs-disc').value,
      tarefaBloqueada: document.getElementById('rs-tarefa').value,
      impactoCaminhosCriticos: document.getElementById('rs-critico').checked,
      status: 'Aberta',
    };
    DB.restrictions.create(data);
    closeModal('modal-restriction');
    Router.navigate('restrictions', { force: true });
    Toast.success('Restrição registrada!');
  }

  function closeRestriction(id) {
    const r = DB.restrictions.get(id);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Fechar Restrição</div><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
    <div class="modal-body">
      <div style="margin-bottom:var(--space-3);"><strong>${r?.descricao||''}</strong></div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">Dias aberta: ${daysBetween(r?.createdAt?.slice(0,10)||new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10))}</div>
      <div class="form-group"><label>Resolução Aplicada *</label><textarea id="rs-resolution" rows="3" placeholder="Descreva como a restrição foi resolvida..."></textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
    <button class="btn btn-success" onclick="RestrictionsModule.confirmClose('${id}',this)">Confirmar Fechamento</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>requestAnimationFrame(()=>overlay.classList.add('open')));
  }

  function confirmClose(id, btn) {
    const res = document.getElementById('rs-resolution').value.trim();
    if (!res) { Toast.error('Erro', 'Informe a resolução aplicada.'); return; }
    DB.restrictions.update(id, { status: 'Fechada', resolution: res, closedAt: new Date().toISOString().slice(0,10) });
    btn.closest('.modal-overlay').remove();
    Router.navigate('restrictions', { force: true });
    Toast.success('Restrição fechada!', res.slice(0,50));
  }

  function deleteRestriction(id) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem excluir restrições.');
      return;
    }
    confirmDialog('Excluir Restrição', 'Tem certeza?', () => { DB.restrictions.delete(id); Router.navigate('restrictions', { force: true }); Toast.success('Restrição excluída'); });
  }

  return { render, openCreate, save, closeRestriction, confirmClose, deleteRestriction };
})();

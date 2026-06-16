/* ================================================================
   PLANEJAMENTO DIMAN-BHZ — All Remaining Modules (Compact)
   dashboard, workshop, equipment, tasks, gantt, critical-path,
   parts, workforce, planning, restrictions, costs, kpi, timeline,
   impacts, simulator, ai-assistant, lessons, reports, audit,
   users, meeting-mode
   ================================================================ */

// ================================================================
// DASHBOARD MODULE
// ================================================================
window.Dashboard = (() => {
  let charts = {};

  function destroyCharts() { Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} }); charts = {}; }

  function chartDefaults() {
    return {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 10, bottom: 10, left: 0, right: 0 } },
      interaction: { mode: 'index', intersect: false },
      plugins: { 
        legend: { 
          position: 'top', align: 'end',
          labels: { color: '#64748B', font: { family: 'Inter', size: 11, weight: '600' }, usePointStyle: true, pointStyle: 'circle', padding: 20 } 
        },
        datalabels: {
          color: '#334155', font: { weight: '800', size: 10, family: 'Inter' },
          anchor: 'end', align: 'top', offset: 2,
          formatter: (v) => (v && v > 0) ? Math.round(v*10)/10 : ''
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { family: 'Inter', size: 13, weight: '700' },
          bodyFont: { family: 'Inter', size: 12, weight: '500' }, padding: 12, cornerRadius: 8, displayColors: true,
          borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1
        }
      },
      scales: {
        x: { ticks: { color: '#94A3B8', font: { size: 11, family: 'Inter' } }, grid: { display: false }, border: { display: false } },
        y: { grace: '20%', ticks: { color: '#CBD5E1', font: { size: 11, family: 'Inter' } }, grid: { color: 'rgba(0,0,0,0.03)' }, border: { display: false }, beginAtZero: true }
      }
    };
  }

  function render() {
    destroyCharts();
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const todayStr = new Date().toISOString().slice(0, 10);
    const stats = DB.kpi.getEquipmentStats(currentMonthPrefix);
    
    const eqs = DB.equipment.list();
    const parts = DB.parts.getAll();
    const restrictions = DB.restrictions.getAll();
    const tasks = DB.tasks.getAll();
    const timesheets = window.DB && DB.timesheets ? DB.timesheets.list() : [];
    const wf = window.DB && DB.workforce ? DB.workforce.list() : [];

    // 1. Calculations for micro-cards
    const allWorkers = wf;
    const faltasHj = timesheets.filter(t => (t.tipo === 'Falta' || t.tipo === 'Atestado') && t.data === todayStr).length;
    const trabalhando = allWorkers.length - faltasHj;
    
    // Mão de obra disponível (Não alocada hoje em equipamentos)
    const alocadosHj = [...new Set(timesheets.filter(t => t.data === todayStr && t.equipmentId && t.tipo !== 'Falta' && t.tipo !== 'Atestado').map(t => t.workerId))].length;
    const disponiveis = trabalhando - alocadosHj;

    const tarefasTotal = tasks.length;
    const tarefasConcluidas = tasks.filter(t => t.pctExecutado >= 100).length;
    const avancoGeral = Math.round(stats.pctAvancoGeral || 0);

    setTimeout(() => {
      try {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
        const titleColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e2e8f0';
        Chart.defaults.color = textColor;
        Chart.defaults.font.family = 'Inter';
        
        // 1. Status Geral (Doughnut)
        const ctxStatus = document.getElementById('mega-ch-status');
        if (ctxStatus) {
           const sts = ['Operando', 'Liberado', 'Em Manutenção', 'Aguardando Peça', 'Paralisado'];
           const counts = sts.map(s => eqs.filter(e => e.status === s).length);
           charts.status = new Chart(ctxStatus, {
             type: 'bar',
             data: { labels: sts, datasets: [{ data: counts, backgroundColor: ['#10b981', '#eab308', '#f97316', '#ef4444', '#a855f7'], borderRadius: 4, barThickness: 24 }] },
             options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, layout: { padding: 10 }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { size: 10 } } }, y: { display: false } } }
           });
        }
        
        // 2. Anual - Planejado x Realizado de entrega (Column)
        const ctxAno = document.getElementById('mega-ch-ano');
        if (ctxAno) {
          const mStr = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          const mP = Array(12).fill(0), mR = Array(12).fill(0);
          eqs.forEach(e => {
            if(e.dataLiberacaoPlanejada) { const m = parseInt(e.dataLiberacaoPlanejada.split('-')[1],10); if(m>=1&&m<=12) mP[m-1]++; }
            if(e.status==='Liberado' && (e.dataLiberacaoAtual || e.dataFim)) { const m = parseInt((e.dataLiberacaoAtual||e.dataFim).split('-')[1],10); if(m>=1&&m<=12) mR[m-1]++; }
          });
          const aderenciaArr = mStr.map((_, i) => mP[i] ? Math.round((mR[i]/mP[i])*100) : 0);

          charts.ano = new Chart(ctxAno, {
            type: 'bar',
            data: { labels: mStr, datasets: [
              { type: 'line', label: 'Aderência (%)', data: aderenciaArr, borderColor: '#eab308', backgroundColor: '#eab308', borderWidth: 2, tension: 0.3, yAxisID: 'y1' },
              { type: 'bar', label: 'Liberações Realizadas', data: mR, backgroundColor: '#ef4444', borderRadius: 4, barThickness: 16, yAxisID: 'y' },
              { type: 'bar', label: 'Liberações Planejadas', data: mP, backgroundColor: '#3b82f6', borderRadius: 4, barThickness: 16, yAxisID: 'y' }
            ]},
            options: { layout: { padding: { top: 20 } }, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10, color: titleColor, font: { weight: '600' } } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: textColor } }, y: { display: false, position: 'left' }, y1: { display: false, position: 'right', min: 0, max: 100 } } }
          });
        }

        // 3. Tarefas por Equipamento Plan x Real (Horizontal Bar)
        const ctxTasks = document.getElementById('mega-ch-tasks');
        if (ctxTasks) {
          const eqNames = eqs.slice(0, 8).map(e => e.codigo);
          const tP = eqs.slice(0, 8).map(e => Math.round(tasks.filter(t => t.equipmentId === e.id).reduce((s,t) => s+(t.horasPlanejadas||0),0)));
          const tR = eqs.slice(0, 8).map(e => Math.round(tasks.filter(t => t.equipmentId === e.id).reduce((s,t) => s+(t.horasRealizadas||0),0)));
          charts.tasksChart = new Chart(ctxTasks, {
            type: 'bar',
            data: { labels: eqNames, datasets: [
              { label: 'Realizado (h)', data: tR, backgroundColor: '#ef4444', borderRadius: 4, barThickness: 8 },
              { label: 'Planejado (h)', data: tP, backgroundColor: '#3b82f6', borderRadius: 4, barThickness: 8 }
            ]},
            options: { indexAxis: 'y', layout: { padding: { right: 30 } }, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10, color: titleColor } } }, scales: { x: { display: false }, y: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { size: 10 } } } } }
          });
        }

        // 4. Avanço por Equipamento (Horizontal Bar)
        const ctxAvanco = document.getElementById('mega-ch-avanco');
        if (ctxAvanco) {
          const eqSort = [...eqs].sort((a,b) => (b.pctAvanco||0) - (a.pctAvanco||0)).slice(0, 8);
          const eqAvNames = eqSort.map(e => e.codigo);
          const eqAvVals = eqSort.map(e => e.pctAvanco||0);
          charts.avanco = new Chart(ctxAvanco, {
            type: 'bar',
            data: { labels: eqAvNames, datasets: [{ label: 'Avanço (%)', data: eqAvVals, backgroundColor: '#a855f7', borderRadius: 4, barThickness: 10 }] },
            options: { indexAxis: 'y', layout: { padding: { right: 30 } }, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { size: 10 } } } } }
          });
        }

        // 5. Gráficos Setores Plan x Real (Column Bar)
        const ctxCat = document.getElementById('mega-ch-cat');
        if (ctxCat) {
          const catsFull = ['Sondas de Pesquisas', 'Bomba de pesquisa', 'Sondas Poços', 'Bombas de poços', 'Subconjuntos', 'Programação de almoxarifado'];
          const catsLabels = ['Sondas Pesq', 'Bombas Pesq', 'Sondas Poço', 'Bombas Poço', 'Subconjuntos', 'Almoxarifado'];
          const cP = catsFull.map(c => eqs.filter(e => (e.tipo||'') === c && e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada.startsWith(currentMonthPrefix)).length);
          const cR = catsFull.map(c => eqs.filter(e => (e.tipo||'') === c && e.status === 'Liberado' && (e.dataLiberacaoAtual||'').startsWith(currentMonthPrefix)).length);
          charts.cat = new Chart(ctxCat, {
            type: 'bar',
            data: { labels: catsLabels, datasets: [
              { label: 'Realizado', data: cR, backgroundColor: '#10b981', borderRadius: 4, barThickness: 12 },
              { label: 'Planejado', data: cP, backgroundColor: '#a855f7', borderRadius: 4, barThickness: 12 }
            ]},
            options: { layout: { padding: { top: 20 } }, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10, color: titleColor } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { size: 10 } } }, y: { display: false } } }
          });
        }

      } catch(e) { console.warn('Mega Chart Error', e); }
    }, 100);

    const microCard = (title, val, subtitle = '') => `
      <div style="flex: 1; background: var(--bg-surface); border: 1px solid var(--border-card); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; text-align: center;">${title}</div>
        <div style="font-size: 38px; font-weight: 700; color: var(--text-primary); line-height: 1.1;">${val}</div>
        ${subtitle ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${subtitle}</div>` : ''}
      </div>
    `;
    
    const chartCard = (title, id) => `
      <div style="background:var(--bg-surface); border:1px solid var(--border-card); border-radius:8px; padding:16px; display:flex; flex-direction:column; min-height: 280px; height: 100%; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:12px; flex-shrink: 0;">${title}</div>
        <div style="flex:1; position:relative; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center;">
           <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;">
             <canvas id="${id}"></canvas>
           </div>
        </div>
      </div>
    `;

    const html = `
    <div style="width:100%; max-width:100%; min-height:100vh; padding:var(--space-6); display:flex; flex-direction:column; gap:20px; background: var(--bg-base);">
      
      <!-- HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap: 16px;">
          <div>
            <h1 style="font-size:24px; font-weight:800; color:var(--text-primary); margin:0; letter-spacing: 1px; text-transform: uppercase;">DASHBOARD MANUTENÇÃO</h1>
            <p style="font-size:12px; color:var(--text-secondary); margin:4px 0 0 0; font-weight:600;">Visão geral em tempo real · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</p>
          </div>
        </div>
        <button class="btn" style="display:flex; align-items:center; gap:8px; border-radius: 8px; padding: 10px 20px; font-weight: 700; background: transparent; border: 1px solid var(--border-card); color: var(--text-primary);" onclick="Router.navigate('dashboard',{force:true})">
          <svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Atualizar Dados
        </button>
      </div>

      <!-- SECTION 1: 5 KPIs Topo (Grid) -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
        ${microCard('Total Equipamentos', eqs.length)}
        ${microCard('Mão de Obra Total', allWorkers.length, 'Ativos na base')}
        ${microCard('Mão de Obra Hoje', trabalhando, `Faltaram: ${faltasHj}`)}
        ${microCard('Disponíveis p/ Alocar', disponiveis, 'Sem equipamento')}
        ${microCard('Avanço Geral', avancoGeral + '%')}
      </div>

      <!-- SECTION 2: 5 Charts in Grid -->
      <style>
        .mega-charts-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
        @media (max-width: 1200px) {
          .mega-charts-grid > div { grid-column: span 6 !important; }
        }
        @media (max-width: 768px) {
          .mega-charts-grid > div { grid-column: span 12 !important; }
        }
      </style>
      <div class="mega-charts-grid">
        
        <!-- Row 1 -->
        <div style="grid-column: span 8;">${chartCard('Qtd de Liberações por Mês', 'mega-ch-ano')}</div>
        <div style="grid-column: span 4;">${chartCard('Qtd de Equipamentos por Status', 'mega-ch-status')}</div>

        <!-- Row 2 -->
        <div style="grid-column: span 4;">${chartCard('Tarefas por Equipamento', 'mega-ch-tasks')}</div>
        <div style="grid-column: span 4;">${chartCard('Avanço por Equipamento', 'mega-ch-avanco')}</div>
        <div style="grid-column: span 4;">${chartCard('Planejado x Realizado por Setores', 'mega-ch-cat')}</div>

      </div>

    </div>
    `;

    return html;
  }

  function destroy() { destroyCharts(); }
  return { render, destroy };
})();

// ================================================================
// WORKSHOP MODULE (Controle de Oficina)
// ================================================================
window.WorkshopModule = (() => {
  function render() {
    const eqs = DB.equipment.list().filter(e => e.status !== 'Liberado');
    const parts = DB.parts.getAll();
    const today = new Date().toISOString().slice(0,10);

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title">
          <div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15"/></svg></div>
          Controle de Oficina
        </div>
        <div style="font-size:var(--text-sm);color:var(--text-muted);">${eqs.length} equipamentos em oficina</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Equipamento</th><th>Cliente</th><th>Status</th><th>Avanço</th>
            <th>Data Planejada</th><th>Dias</th><th>Peças Pendentes</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${eqs.length === 0 ? `<tr><td colspan="8" style="text-align:center;padding:var(--space-8);color:var(--text-muted)">Nenhum equipamento em oficina</td></tr>` :
            eqs.map(e => {
              const pct = e.pctAvanco || 0;
              const pctClass = pct >= 80 ? 'success' : pct >= 50 ? '' : 'warning';
              const days = e.dataLiberacaoPlanejada ? daysBetween(today, e.dataLiberacaoPlanejada) : null;
              const daysClass = days === null ? '' : days < 0 ? 'danger' : days <= 3 ? 'warning' : 'success';
              const pendParts = parts.filter(p => p.equipmentId === e.id && ['Solicitada','Comprada','Em Transporte'].includes(p.status)).length;
              return `<tr>
                <td><div style="font-weight:700">${e.codigo}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${e.nome.slice(0,30)}</div></td>
                <td>${e.cliente}</td>
                <td>${statusBadge(e.status)}</td>
                <td style="min-width:120px;">
                  <div class="workshop-status-bar"><div class="workshop-status-fill ${pctClass}" style="width:${pct}%;background:var(--color-${pctClass === 'success' ? 'success' : pctClass === 'warning' ? 'warning' : 'info'})"></div></div>
                  <div style="font-size:10px;color:var(--text-muted);text-align:right;margin-top:2px">${pct}%</div>
                </td>
                <td>${e.dataLiberacaoPlanejada ? formatDate(e.dataLiberacaoPlanejada) : '—'}</td>
                <td><span class="badge badge-${daysClass}">${days === null ? '—' : days < 0 ? Math.abs(days)+' atrasado' : days === 0 ? 'Hoje' : days+'d'}</span></td>
                <td>${pendParts > 0 ? `<span class="badge badge-danger">${pendParts} pendente${pendParts>1?'s':''}</span>` : `<span class="badge badge-success">OK</span>`}</td>
                <td><div class="table-actions">
                  <button class="btn btn-secondary btn-sm" onclick="window.Router.navigate('equipment-panel', { id: '${e.id}' })">Ver</button>
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }
  return { render };
})();

// ================================================================
// EQUIPMENT MODULE
// ================================================================
window.EquipmentModule = (() => {
  let showLiberados = false;
  function render() {
    let eqs = DB.equipment.list();
    if (!showLiberados) {
      eqs = eqs.filter(e => e.status !== 'Liberado');
    }
    const parts = DB.parts.getAll();
    const restrictions = DB.restrictions.getAll();
    const today = new Date().toISOString().slice(0,10);

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title">
          <div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75"/></svg></div>
          Gestão de Equipamentos
        </div>
        <div style="display:flex;gap:var(--space-3);">
          <button class="btn btn-outline" style="border-color:var(--border-hover);color:var(--text-secondary);" onclick="EquipmentModule.toggleLiberados()">
            ${showLiberados ? 'Esconder Liberados' : 'Mostrar Liberados'}
          </button>
          <button class="btn btn-primary" onclick="EquipmentModule.openCreate()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Novo Equipamento
          </button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--space-4);" class="stagger">
        ${eqs.map(e => {
          const pct = e.pctAvanco || 0;
          const refDate = (e.status === 'Liberado' && e.dataLiberacaoAtual) ? e.dataLiberacaoAtual : today;
          const days = e.dataLiberacaoPlanejada ? daysBetween(refDate, e.dataLiberacaoPlanejada) : null;
          const isLiberated = e.status === 'Liberado';
          const daysClass = isLiberated ? 'success' : (days === null ? 'ghost' : days < 0 ? 'danger' : days <= 3 ? 'warning' : 'success');
          const pendParts = parts.filter(p=>p.equipmentId===e.id&&['Solicitada','Comprada','Em Transporte'].includes(p.status)).length;
          const openRestr = restrictions.filter(r=>r.equipmentId===e.id&&r.status==='Aberta').length;
          const repls = e.replanning || [];
          const prioridade = e.prioridade || 'Normal';
          let prioBadge = '';
          if (prioridade === 'Urgente') {
            prioBadge = `<span class="badge badge-danger">Urgente</span>`;
          } else if (prioridade === 'Alta') {
            prioBadge = `<span class="badge badge-orange">Alta</span>`;
          }

          return `<div class="card card-clickable hover-lift" onclick="EquipmentModule.openDetail('${e.id}')">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-3);">
              <div>
                <div style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);letter-spacing:-.02em">${e.codigo}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted)">${e.nome}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:var(--space-1);align-items:flex-end;">
                ${statusBadge(e.status)}
                ${prioBadge}
                <span class="badge badge-ghost">${e.cliente}</span>
              </div>
            </div>
            <div class="progress-bar-wrap" style="margin-bottom:var(--space-3);">
              <div class="progress-bar-header">
                <span class="progress-bar-label">Avanço Físico</span>
                <span class="progress-bar-value">${pct}%</span>
              </div>
              <div class="progress-track lg"><div class="progress-fill ${pct>=80?'success':pct>=50?'':'warning'}" style="width:${pct}%"></div></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-2);">
              <div>
                ${e.dataLiberacaoPlanejada ? `<div style="font-size:var(--text-xs);color:var(--text-muted)">Liberação prevista</div>
                <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-${daysClass})">${formatDate(e.dataLiberacaoPlanejada)} ${isLiberated ? '<span style="color:var(--color-success)">(Concluído)</span>' : (days!==null?`(${days<0?Math.abs(days)+' atrasado':days===0?'Hoje':days+'d'})`:'')}</div>` : ''}
              </div>
              <div style="display:flex;gap:var(--space-2);">
                ${pendParts > 0 ? `<span class="badge badge-warning">${pendParts} peça${pendParts>1?'s':''}</span>` : ''}
                ${openRestr > 0 ? `<span class="badge badge-danger">${openRestr} restr.</span>` : ''}
                ${repls.length > 0 ? `<span class="badge badge-orange">R${repls.length}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);border-top:1px solid var(--border-card);padding-top:var(--space-3);">
              <button class="btn btn-secondary btn-sm" style="flex:1" onclick="event.stopPropagation();EquipmentModule.openEdit('${e.id}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();EquipmentModule.confirmDelete('${e.id}','${e.nome}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:13px;height:13px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
              </button>
            </div>
          </div>`;
        }).join('')}
        ${eqs.length === 0 ? `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877"/></svg></div><h3>Nenhum equipamento cadastrado</h3><p>Clique em "Novo Equipamento" para começar</p></div>` : ''}
      </div>
    </div>
    <!-- Modal create/edit -->
    <div class="modal-overlay" id="modal-equipment">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div class="modal-title" id="eq-modal-title">Equipamento</div>
          <button class="modal-close" onclick="closeModal('modal-equipment')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="modal-body" id="eq-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('modal-equipment')">Cancelar</button>
          <button class="btn btn-primary" onclick="EquipmentModule.save()">Salvar</button>
        </div>
      </div>
    </div>
    <!-- Detail modal -->
    <div class="modal-overlay" id="modal-eq-detail">
      <div class="modal modal-xl">
        <div class="modal-header">
          <div class="modal-title" id="eq-detail-title">Detalhes</div>
          <button class="modal-close" onclick="closeModal('modal-eq-detail')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="modal-body" id="eq-detail-body"></div>
      </div>
    </div>`;
  }

  function ensureModalExists() {
    if (!document.getElementById('modal-equipment')) {
      const modalHtml = `
      <div class="modal-overlay" id="modal-equipment">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div class="modal-title" id="eq-modal-title">Equipamento</div>
            <button class="modal-close" onclick="closeModal('modal-equipment')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="modal-body" id="eq-modal-body"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('modal-equipment')">Cancelar</button>
            <button class="btn btn-primary" onclick="EquipmentModule.save()">Salvar</button>
          </div>
        </div>
      </div>`;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = modalHtml;
      document.body.appendChild(wrapper.firstElementChild);
    }
  }

  function toggleLiberados() {
    showLiberados = !showLiberados;
    Router.navigate('equipment', {force:true});
  }

  function openCreate() {
    ensureModalExists();
    document.getElementById('eq-modal-title').textContent = 'Novo Equipamento';
    document.getElementById('eq-modal-body').innerHTML = equipmentForm(null);
    openModal('modal-equipment');
  }

  function openEdit(id) {
    ensureModalExists();
    const eq = DB.equipment.get(id);
    document.getElementById('eq-modal-title').textContent = `Editar — ${eq.codigo}`;
    document.getElementById('eq-modal-body').innerHTML = equipmentForm(eq);
    openModal('modal-equipment');
  }

  function openDetail(id) {
    const eq = DB.equipment.get(id);
    if (!eq) return;
    const tasks = DB.tasks.getByEquipment(id);
    const parts = DB.parts.list(id);
    const costs = DB.costs.list(id);
    document.getElementById('eq-detail-title').innerHTML = `${eq.codigo} — ${eq.nome}`;
    document.getElementById('eq-detail-body').innerHTML = `
      <div class="tabs">
        <div class="tabs-nav">
          <button class="tab-btn active" onclick="switchTab(this,'et-general')">Visão Geral</button>
          <button class="tab-btn" onclick="switchTab(this,'et-tasks')">Tarefas (${tasks.length})</button>
          <button class="tab-btn" onclick="switchTab(this,'et-parts')">Peças (${parts.length})</button>
          <button class="tab-btn" onclick="switchTab(this,'et-costs')">Custos</button>
          <button class="tab-btn" onclick="switchTab(this,'et-timeline')">Timeline</button>
          <button class="tab-btn" onclick="switchTab(this,'et-replanning')">Replanejamentos (${(eq.replanning||[]).length})</button>
        </div>
        <div class="tab-panel active" id="et-general">
          <div class="form-row cols-3" style="margin-bottom:var(--space-4);">
            <div><label>Código</label><div style="padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md);font-weight:700">${eq.codigo}</div></div>
            <div><label>Status</label><div style="padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md)">${statusBadge(eq.status)}</div></div>
            <div><label>Avanço</label><div style="padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md);font-weight:800;font-size:var(--text-xl);color:var(--brand-primary-light)">${eq.pctAvanco||0}%</div></div>
            <div><label>Cliente</label><div style="padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md)">${eq.cliente||'—'}</div></div>
            <div><label>Entrada</label><div style="padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md)">${formatDate(eq.dataEntrada)}</div></div>
            <div><label>🔒 Data Planejada</label><div style="padding:var(--space-3);background:rgba(244,67,54,0.08);border-radius:var(--radius-md);border:1px solid rgba(244,67,54,0.2);font-weight:700;color:var(--color-danger)">${formatDate(eq.dataLiberacaoPlanejada)} — BLOQUEADA</div></div>
            <div style="grid-column:1/-1;"><label>Observações</label><div style="padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md)">${eq.observacoes||'—'}</div></div>
          </div>
        </div>
        <div class="tab-panel" id="et-tasks">
          <div style="display:flex;flex-direction:column;gap:var(--space-2);">
            ${tasks.map(t=>`<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md);">
              <div style="flex:1;min-width:0;"><div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary)">${t.descricao}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${t.disciplina} · ${t.responsavel||'—'}</div></div>
              <div>${statusBadge(t.status)}</div>
              <div style="font-size:var(--text-sm);font-weight:700;color:var(--brand-primary-light);font-family:var(--font-mono);width:40px;text-align:right">${t.pctExecutado}%</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="tab-panel" id="et-parts">
          <div style="display:flex;flex-direction:column;gap:var(--space-2);">
            ${parts.map(p=>`<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md);">
              <div style="flex:1;min-width:0;"><div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary)">${p.descricao}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${p.codigo} · ${p.fornecedor}</div></div>
              ${statusBadge(p.status)}
              ${p.critica ? '<span class="badge badge-danger">Crítica</span>' : ''}
            </div>`).join('')}
          </div>
        </div>
        <div class="tab-panel" id="et-costs">
          ${(() => {
            const pl = costs.reduce((s,c)=>s+(c.valorPlanejado||0),0);
            const rl = costs.reduce((s,c)=>s+(c.valorRealizado||0),0);
            const dev = pl ? Math.round((rl-pl)/pl*100) : 0;
            return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-4);">
              <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--text-xs);color:var(--text-muted)">Planejado</div><div style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary)">${formatCurrency(pl)}</div></div>
              <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--text-xs);color:var(--text-muted)">Realizado</div><div style="font-size:var(--text-xl);font-weight:800;color:${rl>pl?'var(--color-danger)':'var(--color-success)'}">${formatCurrency(rl)}</div></div>
              <div style="background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--text-xs);color:var(--text-muted)">Desvio</div><div style="font-size:var(--text-xl);font-weight:800;color:${dev>10?'var(--color-danger)':dev>0?'var(--color-warning)':'var(--color-success)'}">${dev>0?'+':''}${dev}%</div></div>
            </div>`;
          })()}
        </div>
        <div class="tab-panel" id="et-timeline">
          <div class="timeline" style="padding:var(--space-4);">
            ${(eq.timeline||[]).map(tl=>`<div class="timeline-item">
              <div class="timeline-icon ${tl.tipo==='LIBERACAO'?'success':tl.tipo==='REPLANEJAMENTO'?'warning':tl.tipo==='DEFEITO'?'danger':'primary'}">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div class="timeline-content">
                <div class="timeline-title">${tl.titulo}</div>
                <div class="timeline-desc">${tl.descricao}</div>
                <div class="timeline-time">${formatDateTime(tl.timestamp)}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>
        <div class="tab-panel" id="et-replanning">
          ${(eq.replanning||[]).length === 0 ? '<div class="empty-state" style="padding:var(--space-8)"><p>Nenhum replanejamento registrado</p></div>' :
          `<div style="margin-bottom:var(--space-4);" class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
            <div class="alert-content"><div class="alert-title">Data Planejada Original: ${formatDate(eq.dataLiberacaoPlanejada)} — JAMAIS ALTERADA</div></div>
          </div>` +
          `<div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${(eq.replanning||[]).map(r=>`<div style="padding:var(--space-4);background:var(--bg-base);border-radius:var(--radius-md);border-left:3px solid var(--color-warning);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
                <span class="badge badge-orange">${r.label}</span>
                <span style="font-size:var(--text-xs);color:var(--text-muted)">${formatDate(r.createdAt)}</span>
              </div>
              <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-2)">${r.motivo}</div>
              <div style="display:flex;gap:var(--space-4);font-size:var(--text-xs);color:var(--text-muted);">
                <span>De: <strong>${formatDate(r.dataAnterior)}</strong></span>
                <span>Para: <strong>${formatDate(r.novaData)}</strong></span>
                <span>+${daysBetween(r.dataAnterior,r.novaData)} dias</span>
              </div>
            </div>`).join('')}
          </div>`}
          <div style="margin-top:var(--space-4);">
            <button class="btn btn-secondary" onclick="EquipmentModule.addReplanning('${id}')">Criar Replanejamento</button>
          </div>
        </div>
      </div>
    `;
    openModal('modal-eq-detail');
  }

  function equipmentForm(eq) {
    const wf = DB.workforce.list();
    const map = eq?.workforceMap || {};
    const getOptions = (disc) => {
      const workers = wf.filter(w => w.disciplina === disc);
      const list = workers.length ? workers : wf;
      const allEqs = DB.equipment.list();
      
      return `<option value="">—</option>` + list.map(w => {
        const allocatedEq = w.equipmentId ? allEqs.find(e => e.id === w.equipmentId) : null;
        const isAllocatedToOther = w.equipmentId && w.equipmentId !== eq?.id && allocatedEq && allocatedEq.status !== 'Liberado';
        
        if (isAllocatedToOther) {
          return `<option value="${w.nome}" disabled style="color:var(--color-danger);" title="Alocado no equipamento ${allocatedEq.codigo}">🔒 ${w.nome} (Alocado no equipamento ${allocatedEq.codigo})</option>`;
        } else {
          return `<option value="${w.nome}" ${map[disc] === w.nome ? 'selected' : ''}>${w.nome}</option>`;
        }
      }).join('');
    };

    return `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-row">
        <div class="form-group"><label>Código *</label><input id="eq-codigo" value="${eq?.codigo||''}" placeholder="Ex: SSM-288" required /></div>
        <div class="form-group"><label>O.S. *</label><input id="eq-os" value="${eq?.os||''}" placeholder="Ordem de Serviço" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><input id="eq-cliente" value="${eq?.cliente||''}" /></div>
        <div class="form-group"><label>Tipo</label><select id="eq-tipo" class="form-control" style="width:100%;height:38px;background:var(--bg-base);color:var(--text-primary);border:1px solid var(--border-card);border-radius:var(--radius-md);padding:0 var(--space-3);">
          ${['Sondas de Pesquisas', 'Bomba de pesquisa', 'Sondas Poços', 'Bombas de poços', 'Subconjuntos', 'Programação de almoxarifado', 'Outros Equipamentos'].map(t => `<option value="${t}" ${eq?.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group"><label>Modelo</label><input id="eq-modelo" value="${eq?.modelo||''}" /></div>
        <div class="form-group"><label>Data de Entrada</label><input type="date" id="eq-entrada" value="${toDateInput(eq?.dataEntrada)}" /></div>
        <div class="form-group">
          <label>Prioridade / Urgência</label>
          <select id="eq-prioridade" class="form-control" style="width:100%;height:38px;background:var(--bg-base);color:var(--text-primary);border:1px solid var(--border-card);border-radius:var(--radius-md);padding:0 var(--space-3);">
            ${['Normal','Alta','Urgente'].map(p=>`<option value="${p}" ${eq?.prioridade===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4);">
        <div class="form-group"><label>🔒 Data Planejada ${eq ? '(BLOQUEADA)' : ''}</label><input type="date" id="eq-data-plan" value="${toDateInput(eq?.dataLiberacaoPlanejada)}" ${eq?'readonly style="opacity:.6;cursor:not-allowed;"':''} /></div>
        <div class="form-group"><label>Data Real Liberação</label><input type="date" id="eq-data-real" value="${toDateInput(eq?.dataLiberacaoAtual)}" /></div>
        <div class="form-group">
          <label>Status</label>
          <select id="eq-status" class="form-control">
            ${['Em Manutenção','Liberado','Paralisado','Falta de Peças', 'Backlog', 'Falta de Mão de Obra'].map(s=>`<option ${eq?.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Etapa Atual</label>
          <select id="eq-etapa-atual" class="form-control">
            ${['Nenhuma','Lavador','Mecânica','Caldeiraria','Elétrica','Usinagem','Pintor','Montagem','Subconjunto','Teste','Retrabalho'].map(s=>`<option ${eq?.etapaAtual===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div style="border-top:1px solid var(--border-card);padding-top:var(--space-4);margin-top:var(--space-2);">
        <div style="font-weight:700;font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3);">Mão de Obra por Disciplina (Auto-preenchimento)</div>
        <div class="form-row">
          <div class="form-group">
            <label>Mecânica</label>
            <select id="eq-wf-mecanica">${getOptions('Mecânica')}</select>
          </div>
          <div class="form-group">
            <label>Elétrica</label>
            <select id="eq-wf-eletrica">${getOptions('Elétrica')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Caldeiraria</label>
            <select id="eq-wf-caldeiraria">${getOptions('Caldeiraria')}</select>
          </div>
          <div class="form-group">
            <label>Usinagem</label>
            <select id="eq-wf-usinagem">${getOptions('Usinagem')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Pintor</label>
            <select id="eq-wf-pintor">${getOptions('Pintor')}</select>
          </div>
          <div class="form-group">
            <label>Lavador</label>
            <select id="eq-wf-lavador">${getOptions('Lavador')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Montagem</label>
            <select id="eq-wf-montagem">${getOptions('Montagem')}</select>
          </div>
          <div class="form-group">
            <label>Subconjunto</label>
            <select id="eq-wf-subconjunto">${getOptions('Subconjunto')}</select>
          </div>
        </div>
      </div>

      <div class="form-group"><label>Observações</label><textarea id="eq-obs">${eq?.observacoes||''}</textarea></div>
      <input type="hidden" id="eq-editing-id" value="${eq?.id||''}" />
    </div>`;
  }

  function save() {
    const id = document.getElementById('eq-editing-id').value;
    const data = {
      codigo: document.getElementById('eq-codigo').value.trim().toUpperCase(),
      nome: document.getElementById('eq-codigo').value.trim().toUpperCase(),
      os: document.getElementById('eq-os').value.trim(),
      cliente: document.getElementById('eq-cliente').value.trim(),
      contrato: '',
      tipo: document.getElementById('eq-tipo').value.trim(),
      localizacao: '',
      fabricante: '',
      modelo: document.getElementById('eq-modelo').value.trim(),
      numeroSerie: '',
      responsavel: '',
      dataEntrada: document.getElementById('eq-entrada').value,
      dataLiberacaoAtual: document.getElementById('eq-data-real') ? document.getElementById('eq-data-real').value : '',
      status: document.getElementById('eq-status').value,
      etapaAtual: document.getElementById('eq-etapa-atual').value,
      pctAvanco: id ? (DB.equipment.get(id)?.pctAvanco || 0) : 0,
      prioridade: document.getElementById('eq-prioridade').value,
      urgencia: document.getElementById('eq-prioridade').value,
      observacoes: document.getElementById('eq-obs').value.trim(),
      workforceMap: {
        'Mecânica': document.getElementById('eq-wf-mecanica').value,
        'Elétrica': document.getElementById('eq-wf-eletrica').value,
        'Caldeiraria': document.getElementById('eq-wf-caldeiraria').value,
        'Usinagem': document.getElementById('eq-wf-usinagem').value,
        'Pintor': document.getElementById('eq-wf-pintor').value,
        'Lavador': document.getElementById('eq-wf-lavador').value,
        'Montagem': document.getElementById('eq-wf-montagem').value,
        'Subconjunto': document.getElementById('eq-wf-subconjunto').value,
      }
    };
    if (!data.codigo || !data.os) { Toast.error('Erro', 'Código e O.S. são obrigatórios.'); return; }

    const activeEqs = DB.equipment.list().filter(e => e.id !== id && e.status !== 'Liberado');
    const newWorkers = Object.values(data.workforceMap).filter(w => w !== '');
    for (const eq of activeEqs) {
      if (eq.workforceMap) {
        for (const [disc, worker] of Object.entries(eq.workforceMap)) {
           if (worker && newWorkers.includes(worker)) {
               Toast.error('Erro', `O funcionário ${worker} já está alocado no equipamento ${eq.codigo} (${eq.status}).`);
               return;
           }
        }
      }
    }
    
    // Check if status is Liberado and validate pending tasks
    if (data.status === 'Liberado') {
      const eqTasks = id ? DB.tasks.getByEquipment(id) : [];
      const pendingTasks = eqTasks.filter(t => t.status !== 'Concluída');
      if (pendingTasks.length > 0) {
        Toast.error('Erro', `Existem ${pendingTasks.length} tarefa(s) pendente(s). Não é possível liberar o equipamento.`);
        return;
      }
      
      const existingEq = id ? DB.equipment.get(id) : null;
      if (!existingEq || existingEq.status !== 'Liberado') {
        data.dataLiberacaoAtual = data.dataLiberacaoAtual || new Date().toISOString().slice(0, 10);
        if (window.DB && window.DB.timeline) {
          window.DB.timeline.create({
            equipmentId: id || data.codigo,
            tipo: 'LIBERAÇÃO',
            titulo: 'Equipamento Liberado',
            descricao: 'Equipamento foi liberado para operação.',
            timestamp: new Date().toISOString(),
            responsavel: window.Auth && window.Auth.getSession() ? window.Auth.getSession().nome : 'Sistema'
          });
        }
      }
    }

    if (id) { DB.equipment.update(id, data); Toast.success('Equipamento atualizado!', data.codigo); }
    else { data.dataLiberacaoPlanejada = document.getElementById('eq-data-plan').value; DB.equipment.create(data); Toast.success('Equipamento criado!', data.codigo); }
    closeModal('modal-equipment');
    const currentRoute = Router.getCurrent();
    if (currentRoute === 'home') {
      Router.navigate('home', { force: true });
    } else {
      Router.navigate('equipment', { force: true });
    }
  }

  function addReplanning(eqId) {
    const eq = DB.equipment.get(eqId);
    closeModal('modal-eq-detail');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><div class="modal-title">Criar Replanejamento</div><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
    <div class="modal-body">
      <div class="alert alert-warning" style="margin-bottom:var(--space-4);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
      <div class="alert-content"><div class="alert-title">A Data Planejada Original (${formatDate(eq.dataLiberacaoPlanejada)}) não pode ser alterada.</div></div></div>
      <div class="form-group"><label>Motivo do Atraso *</label><textarea id="rp-motivo" rows="3" placeholder="Descreva o motivo do replanejamento..."></textarea></div>
      <div class="form-group"><label>Nova Data Prevista *</label><input type="date" id="rp-nova-data" /></div>
      <div class="form-group"><label>Responsável</label><input id="rp-resp" value="${Auth.getSession()?.nome||''}" /></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="EquipmentModule.saveReplanning('${eqId}',this)">Confirmar Replanejamento</button>
    </div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  function saveReplanning(eqId, btn) {
    const motivo = document.getElementById('rp-motivo').value.trim();
    const novaData = document.getElementById('rp-nova-data').value;
    const resp = document.getElementById('rp-resp').value.trim();
    if (!motivo || !novaData) { Toast.error('Erro', 'Preencha todos os campos obrigatórios.'); return; }
    const eq = DB.equipment.get(eqId);
    const lastDate = eq.replanning?.length ? eq.replanning[eq.replanning.length-1].novaData : eq.dataLiberacaoPlanejada;
    DB.equipment.addReplanning(eqId, { dataAnterior: lastDate, novaData, motivo, responsavel: resp });
    DB.equipment.update(eqId, { dataLiberacaoAtual: novaData });
    btn.closest('.modal-overlay').remove();
    Toast.success('Replanejamento criado!', `Nova data: ${formatDate(novaData)}`);
    DB.notifications.add({ type:'warning', title:`Replanejamento — ${eq.codigo}`, message: motivo.slice(0,100) });
    Router.navigate('equipment', { force: true });
  }

  function confirmDelete(id, nome) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem excluir equipamentos.');
      return;
    }
    confirmDialog('Excluir Equipamento', `Tem certeza que deseja excluir "${nome}"? Todas as tarefas e dados associados serão removidos.`, () => {
      try {
        window.DB.equipment.delete(id);
        window.Router.navigate('equipment', { force: true });
        window.Toast.success('Equipamento excluído', nome);
      } catch(e) {
        alert('Erro ao excluir: ' + e.message);
      }
    });
  }

  function renderLaborComparison(containerId = 'labor-comparison-container') {
    setTimeout(() => {
      try {
        const allTs = DB.timesheets.list().filter(t => t.tipo === 'Trabalho');
        const allEqTasks = DB.tasks.getAll();
        const taskDict = {}; 
        allEqTasks.forEach(t => taskDict[t.id] = t);
        
        const laborMap = {}; 
        allTs.forEach(ts => {
          const t = taskDict[ts.taskId];
          if (!t || !t.descricao) return;
          const key = (t.descricao.toLowerCase().trim() + '|' + (t.disciplina||'Geral')).trim();
          if (!laborMap[key]) {
            laborMap[key] = { desc: t.descricao, disc: t.disciplina||'Geral', workers: {} };
          }
          const wName = ts.workerNome || 'Desconhecido';
          if (!laborMap[key].workers[wName]) {
            laborMap[key].workers[wName] = { hours: 0, eqs: new Set() };
          }
          laborMap[key].workers[wName].hours += (ts.horasTrabalhadas || 0);
          
          const eq = DB.equipment.get(t.equipmentId);
          if (eq) laborMap[key].workers[wName].eqs.add(eq.codigo);
        });

        const comparisons = Object.values(laborMap).filter(item => Object.keys(item.workers).length > 1);
        
        const container = document.getElementById(containerId);
        if (container) {
          if (comparisons.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1;">Não há dados suficientes para gerar comparativos (é necessário que dois ou mais mecânicos realizem atividades com o mesmo nome).</div>';
          } else {
            comparisons.sort((a,b) => {
              const sumA = Object.values(a.workers).reduce((s,w)=>s+w.hours,0);
              const sumB = Object.values(b.workers).reduce((s,w)=>s+w.hours,0);
              return sumB - sumA;
            });

            container.innerHTML = comparisons.map(item => {
              const workerList = Object.entries(item.workers).map(([name, data]) => ({name, hours: data.hours, eqs: Array.from(data.eqs)}));
              workerList.sort((a,b) => a.hours - b.hours);
              
              return `
                <div style="border:1px solid var(--border-card);border-radius:var(--radius-md);padding:var(--space-4);background:var(--bg-base);">
                  <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;">${item.disc}</div>
                  <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px;line-height:1.3;">${item.desc}</div>
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    ${workerList.map((w, idx) => `
                      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:4px;border-bottom:1px solid var(--border-light);">
                        <div>
                          <div style="font-size:13px;color:var(--text-secondary);font-weight:${idx===0?'700':'400'};">
                            ${idx===0?'🏆 ':''}${w.name}
                          </div>
                          <div style="font-size:10px;color:var(--text-muted);">${w.eqs.join(', ')}</div>
                        </div>
                        <div style="font-size:14px;font-weight:700;color:${idx===0?'var(--color-success)':'var(--text-primary)'};">
                          ${w.hours.toFixed(1)}h
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('');
          }
        }
      } catch (e) {
        console.error('Error rendering labor comparison:', e);
      }
      
      try {
        if (window.EquipmentModule && window.EquipmentModule.renderLaborComparison) {
          window.EquipmentModule.renderLaborComparison();
        }
      } catch(e) { console.error(e); }
    }, 100);
  }

  return { render, openCreate, openEdit, openDetail, save, addReplanning, saveReplanning, confirmDelete, renderLaborComparison, toggleLiberados };
})();

// ================================================================
// TASKS MODULE
// ================================================================
window.TasksModule = (() => {

  function render() {
    const eqFilter = window.GlobalEqFilter;
    const eqs = DB.equipment.list();
    const tasks = DB.tasks.getAll();
    const equipMap = {};
    eqs.forEach(e => { equipMap[e.id] = e; });

    if (!eqFilter) {
      const cardsHtml = eqs.map(e => {
        const pct = e.pctAvanco || 0;
        const eqTasks = tasks.filter(t => t.equipmentId === e.id);
        const concludedCount = eqTasks.filter(t => t.status === 'Concluída').length;
        
        return `
          <div class="card hover-lift" onclick="TasksModule.setEq('${e.id}')" style="cursor:pointer;display:flex;flex-direction:column;padding:var(--space-5);border-top:4px solid ${pct>=100?'var(--color-success)':pct>0?'var(--brand-primary-light)':'var(--text-muted)'};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-3);">
              <div>
                <div style="font-size:1.4rem;font-weight:900;color:var(--text-primary);letter-spacing:-0.02em;">${e.codigo}</div>
                <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-top:2px;">Cliente: ${e.cliente || '—'} &middot; O.S.: ${e.os || '—'}</div>
              </div>
              <div>
                ${statusBadge(e.status)}
              </div>
            </div>
            
            <div style="margin-bottom:var(--space-4);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Avanço Físico</span>
                <span style="font-size:1rem;font-weight:800;color:var(--text-primary);">${pct}%</span>
              </div>
              <div class="progress-track" style="height:8px;"><div class="progress-fill ${pct>=80?'success':pct>=50?'':'warning'}" style="width:${pct}%"></div></div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4);background:var(--bg-base);padding:var(--space-3);border-radius:var(--radius-md);">
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Total Tarefas</div>
                <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);">${eqTasks.length}</div>
              </div>
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Concluídas</div>
                <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-success);">${concludedCount}</div>
              </div>
            </div>
            
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;margin-top:auto;padding-top:var(--space-2);border-top:1px solid var(--border-card);">
              Clique para gerenciar tarefas
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="page-container">
          <div class="section-header">
            <div class="section-title">
              <div class="section-title-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
              Gestão de Tarefas
            </div>
            <button class="btn btn-primary" onclick="TasksModule.openCreate()">+ Nova Tarefa</button>
          </div>
          
          <div style="margin-bottom:var(--space-5);font-size:var(--text-sm);color:var(--text-muted);">
            Selecione um equipamento abaixo para visualizar e gerenciar suas tarefas:
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-5);">
            ${cardsHtml || '<div class="empty-state" style="grid-column:1/-1;"><p>Nenhum equipamento encontrado</p></div>'}
          </div>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" id="modal-task">
          <div class="modal modal-lg">
            <div class="modal-header"><div class="modal-title" id="task-modal-title">Tarefa</div><button class="modal-close" onclick="closeModal('modal-task')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
            <div class="modal-body" id="task-modal-body"></div>
            <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-task')">Cancelar</button><button class="btn btn-primary" onclick="TasksModule.save()">Salvar</button></div>
          </div>
        </div>
      `;
    }

    const selectedEq = equipMap[eqFilter];
    const filteredTasks = tasks.filter(t => t.equipmentId === eqFilter);
    const concluded = filteredTasks.filter(t => t.status === 'Concluída').length;
    const emAndamento = filteredTasks.filter(t => t.status === 'Em Andamento').length;
    const bloqueadas = filteredTasks.filter(t => t.status === 'Bloqueada').length;
    const criticas = filteredTasks.filter(t => t.critico).length;
    
    return `
      <div class="page-container">
        <!-- Breadcrumb / Back Button -->
        <div style="margin-bottom:var(--space-4);">
          <button class="btn btn-ghost" onclick="TasksModule.setEq('')" style="padding:var(--space-2);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
            Voltar para Equipamentos
          </button>
        </div>

        <div class="section-header">
          <div class="section-title">
            <div class="section-title-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            Tarefas de ${selectedEq ? selectedEq.codigo : 'Equipamento'}
          </div>
          <button class="btn btn-primary" onclick="TasksModule.openCreate('${eqFilter}')">+ Nova Tarefa</button>
        </div>

        <div class="filter-row" style="margin-bottom:var(--space-5);display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
          <span style="color:var(--text-muted);font-size:var(--text-sm)">${filteredTasks.length} tarefas</span>
          <span class="badge badge-success">${concluded} concluídas</span>
          <span class="badge badge-primary">${emAndamento} em andamento</span>
          <span class="badge badge-danger">${bloqueadas} bloqueadas</span>
          <span class="badge badge-danger">${criticas} críticas</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-2);" class="stagger">
          ${filteredTasks.length === 0 ? '<div class="empty-state"><p>Nenhuma tarefa cadastrada para este equipamento.</p></div>' : ''}
          ${filteredTasks.map(t => renderTaskRow(t, equipMap)).join('')}
        </div>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" id="modal-task">
        <div class="modal modal-lg">
          <div class="modal-header"><div class="modal-title" id="task-modal-title">Tarefa</div><button class="modal-close" onclick="closeModal('modal-task')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
          <div class="modal-body" id="task-modal-body"></div>
          <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-task')">Cancelar</button><button class="btn btn-primary" onclick="TasksModule.save()">Salvar</button></div>
        </div>
      </div>
    `;
  }

  function renderTaskRow(t, equipMap) {
    const today = new Date().toISOString().slice(0,10);
    const isLate = t.dataPlanejadaTermino && t.dataPlanejadaTermino < today && t.status !== 'Concluída';
    
    // Resolve dependências
    const allEqTasks = DB.tasks.getByEquipment(t.equipmentId);
    const preds = (t.predecessoras || []).map(pid => allEqTasks.find(x => x.id === pid)).filter(Boolean);
    const predsHtml = preds.map(p => `
      <span class="badge" style="font-size:9px;padding:2px 6px;background:rgba(255,179,0,0.15);color:var(--color-warning);border:1px solid rgba(255,179,0,0.25);display:inline-flex;align-items:center;gap:3px;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:9px;height:9px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
        Depende: ${p.descricao} (${p.disciplina})
      </span>
    `).join(' ');

    return `<div onclick="window.TasksModule.openEdit('${t.id}')" style="cursor:pointer;display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);background:var(--bg-card);border:1px solid ${t.critico ? 'rgba(244,67,54,0.3)' : isLate ? 'rgba(255,179,0,0.2)' : 'var(--border-card)'};border-radius:var(--radius-md);transition:all .2s;" class="hover-lift">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1);flex-wrap:wrap;">
          ${t.critico ? '<span style="font-size:.7rem;background:var(--color-danger);color:white;padding:2px 6px;border-radius:3px;font-weight:700;">CRÍTICO</span>' : ''}
          <span style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary)">${t.descricao}</span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:600;">${equipMap[t.equipmentId]?.codigo||'—'}</span>
          <span class="badge badge-ghost" style="font-size:10px">${t.disciplina}</span>
          <span style="font-size:var(--text-xs);color:var(--text-muted)">👤 ${t.responsavel||'—'}</span>
          ${t.dataPlanejadaInicio ? `<span style="font-size:var(--text-xs);color:var(--text-muted)">📅 Plan: ${formatDate(t.dataPlanejadaInicio)} → ${formatDate(t.dataPlanejadaTermino)}</span>` : ''}
          ${t.dataReplanejada ? `<span style="font-size:var(--text-xs);color:var(--brand-primary-light);font-weight:600;">🔄 Replan: ${formatDate(t.dataReplanejada)}</span>` : ''}
        </div>
        ${preds.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${predsHtml}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-3);flex-shrink:0;">
        <div style="width:80px;">
          <div class="progress-track"><div class="progress-fill ${t.pctExecutado>=80?'success':t.pctExecutado>=50?'':'warning'}" style="width:${t.pctExecutado}%"></div></div>
          <div style="font-size:10px;text-align:right;color:var(--text-muted)">${t.pctExecutado}%</div>
        </div>
        ${statusBadge(t.status)}
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.TasksModule.openEdit('${t.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.TasksModule.deleteTask('${t.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:13px;height:13px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function taskForm(t) {
    const eqs = DB.equipment.list();
    const wf = DB.workforce.list();
    
    const currentEqId = t?.equipmentId || (eqs.length ? eqs[0].id : '');
    const vList = window.DB && DB.vacations ? DB.vacations.list() : [];
    const tIso = new Date().toISOString().slice(0,10);
    const dateToCheck = t?.dataPlanejadaInicio || tIso;
    const filteredWf = wf.filter(w => {
      if (w.equipmentId !== currentEqId) return false;
      return !vList.some(v => v.workerId === w.id && dateToCheck >= v.startDate && dateToCheck <= v.endDate);
    });
    
    if (t?.responsavel && t.responsavel !== 'Não atribuído') {
      const respWorker = wf.find(w => w.nome === t.responsavel);
      if (respWorker && !filteredWf.some(w => w.id === respWorker.id)) {
        filteredWf.push(respWorker);
      }
    }

    const discs = ['Mecânica','Caldeiraria','Elétrica','Usinagem','Pintor','Lavador','Montagem','Subconjunto','Teste','Retrabalho'];
    const statuses = ['Não Iniciada','Em Andamento','Aguardando Peça','Aguardando Recurso','Aguardando Aprovação','Bloqueada','Concluída'];
    const prios = ['Crítica','Alta','Média','Baixa'];
    let obsHistoryHtml = '';
    let obsTextValue = '';
    if (t?.observacoes) {
      let isJson = false;
      try {
        const comments = JSON.parse(t.observacoes);
        if (Array.isArray(comments)) {
          isJson = true;
          obsHistoryHtml = `<div style="max-height: 120px; overflow-y: auto; font-size: 12px; margin-bottom: 12px; border: 1px solid var(--border-default); padding: 8px; border-radius: 6px; background: var(--bg-base);">
            ${comments.map(c => `
              <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.02);">
                <span style="font-weight:700;color:var(--brand-primary-light);">${c.user}:</span> ${c.text}
                <span style="font-size:10px;color:var(--text-muted);display:block;">${new Date(c.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            `).join('')}
          </div>`;
        }
      } catch (e) {}
      
      if (!isJson) {
        obsTextValue = t.observacoes;
      }
    }

    const selectedEq = eqs.find(e => e.id === currentEqId) || {codigo: 'N/A', nome: 'Desconhecido'};
    
    // Obter apontamentos desta tarefa
    const tTimesheets = (window.DB.timesheets ? window.DB.timesheets.list() : []).filter(ts => ts.taskId === t?.id && ts.tipo === 'Trabalho');
    let executores = '';
    if (tTimesheets.length > 0) {
      const summary = {};
      tTimesheets.forEach(ts => {
        if(!summary[ts.workerNome]) summary[ts.workerNome] = 0;
        summary[ts.workerNome] += Number(ts.horasTrabalhadas) || 0;
      });
      executores = `<div style="margin-top:12px; border:1px solid var(--border-default); border-radius:4px; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
          <thead>
            <tr style="background:var(--bg-base); border-bottom:1px solid var(--border-default);">
              <th style="padding:6px 10px; font-weight:700; color:var(--text-secondary);">Executante</th>
              <th style="padding:6px 10px; font-weight:700; color:var(--text-secondary); text-align:center;">Horas Dedicadas</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(summary).map(([nome, horas]) => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                <td style="padding:6px 10px;">${nome}</td>
                <td style="padding:6px 10px; text-align:center; font-weight:700;">${horas.toFixed(2)}h</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    } else {
      executores = `<p style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">Nenhum apontamento registrado.</p>`;
    }

    return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      
      <!-- Cabeçalho Principal -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:var(--space-3); border-bottom:1px solid var(--border-default);">
        <div>
          <h3 style="margin:0; font-size:1.2rem; font-weight:800; color:var(--text-primary);">
            ${t?.codigo ? t.codigo : 'Nova Tarefa'}
            ${t?.critico ? '<span class="badge" style="background:rgba(244,67,54,0.1);color:#f44336;margin-left:8px;">Crítica</span>' : ''}
          </h3>
          <p style="margin:4px 0 0; font-size:0.9rem; color:var(--text-secondary);">Equipamento: <strong>${selectedEq.codigo}</strong> - ${selectedEq.nome}</p>
        </div>
        <div style="text-align:right;">
          <select id="tk-status" style="font-weight:700; border:2px solid var(--border-default); border-radius:var(--radius-md); padding:4px 8px;">
            ${statuses.map(s => `<option ${t?.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Duas Colunas de Informação -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:var(--space-4);">
        
        <!-- Coluna Esquerda: Informações Gerais -->
        <div style="background:var(--bg-card); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid var(--border-default);">
          <h4 style="margin:0 0 12px; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Detalhes da Execução</h4>
          
          <div class="form-group" style="display:none;"><label>Equipamento (ID Oculto)</label><select id="tk-eq" onchange="TasksModule.onFormChange()">${eqs.map(e=>`<option value="${e.id}" ${t?.equipmentId===e.id?'selected':''}>${e.codigo}</option>`).join('')}</select></div>
          <div class="form-group" style="display:none;"><label>Código</label><input id="tk-cod" value="${t?.codigo||''}" /></div>
          
          <div class="form-group">
            <label style="font-size:0.85rem; color:var(--text-secondary);">Descrição da Atividade *</label>
            <input id="tk-desc" value="${t?.descricao||''}" required style="font-size:1rem; font-weight:600;" />
          </div>
          
          <div class="form-row" style="gap:12px;">
            <div class="form-group">
              <label style="font-size:0.85rem; color:var(--text-secondary);">Disciplina</label>
              <select id="tk-disc" onchange="TasksModule.onFormChange()">${discs.map(d=>`<option ${t?.disciplina===d?'selected':''}>${d}</option>`).join('')}</select>
            </div>
            <div class="form-group">
              <label style="font-size:0.85rem; color:var(--text-secondary);">Prioridade</label>
              <select id="tk-prio">${prios.map(p=>`<option ${t?.prioridade===p?'selected':''}>${p}</option>`).join('')}</select>
            </div>
          </div>
          
          <div class="form-group" style="margin-top:12px;">
            <label style="font-size:0.85rem; color:var(--text-secondary);">Responsável (Atribuído)</label>
            <select id="tk-resp">
              <option value="">— Sem responsável atribuído —</option>
              ${filteredWf.map(w=>`<option value="${w.nome}" ${t?.responsavel===w.nome?'selected':''}>${w.nome}</option>`).join('')}
            </select>
          </div>
          
          <div class="checkbox-wrap" style="margin-top:16px;">
            <input type="checkbox" id="tk-critico" ${t?.critico?'checked':''} />
            <label for="tk-critico" style="font-weight:600; color:var(--color-danger);">Caminho Crítico (Parada)</label>
          </div>
        </div>

        <!-- Coluna Direita: Planejamento e Horas -->
        <div style="background:var(--bg-card); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid var(--border-default);">
          <h4 style="margin:0 0 12px; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Planejamento x Realizado</h4>
          
          <div class="form-row" style="gap:12px; margin-bottom:8px;">
            <div class="form-group">
              <label style="font-size:0.8rem; color:var(--text-secondary);">Início Programado</label>
              <input type="date" id="tk-ip" value="${toDateInput(t?.dataPlanejadaInicio)}" />
            </div>
            <div class="form-group">
              <label style="font-size:0.8rem; color:var(--text-secondary);">Fim Programado</label>
              <input type="date" id="tk-tp" value="${toDateInput(t?.dataPlanejadaTermino)}" />
            </div>
          </div>
          
          <div class="form-row" style="gap:12px; background:rgba(0,0,0,0.05); padding:8px; border-radius:4px; border:1px dashed var(--border-default); margin-bottom:12px;">
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.8rem; color:var(--brand-primary-light);">Início Realizado</label>
              <input type="date" id="tk-ri" value="${toDateInput(t?.dataRealInicio)}" style="font-weight:700; color:var(--brand-primary-light);" />
            </div>
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.8rem; color:var(--brand-primary-light);">Fim Realizado</label>
              <input type="date" id="tk-rt" value="${toDateInput(t?.dataRealTermino)}" style="font-weight:700; color:var(--brand-primary-light);" />
            </div>
          </div>
          
          <div class="form-row" style="gap:12px;">
            <div class="form-group">
              <label style="font-size:0.8rem; color:var(--text-secondary);">Horas Programadas</label>
              <input type="number" id="tk-hp" value="${t?.horasPlanejadas||0}" min="0" style="text-align:center; font-weight:700;" />
            </div>
            <div class="form-group">
              <label style="font-size:0.8rem; color:var(--text-secondary);">Duração (Horas Totais)</label>
              <input type="number" id="tk-hr" value="${t?.horasRealizadas||0}" min="0" style="text-align:center; font-weight:700; color:var(--brand-primary-light);" />
            </div>
          </div>
          
          ${executores}

          <div class="form-group" style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <label style="font-size:0.85rem; color:var(--text-secondary);">Progresso Físico</label>
              <span style="font-weight:800; color:var(--brand-primary-light);"><span id="tk-pct-val">${t?.pctExecutado||0}</span>%</span>
            </div>
            <input type="range" id="tk-pct" min="0" max="100" value="${t?.pctExecutado||0}" oninput="document.getElementById('tk-pct-val').textContent=this.value" style="width:100%; accent-color:var(--brand-primary);" />
          </div>
        </div>

      </div> <!-- Fim Duas Colunas -->

      <!-- Seção de Evidências Fotográficas -->
      <div style="background:var(--bg-base); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid var(--border-default);">
        <h4 style="margin:0 0 12px; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Evidências (Fotos)</h4>
        
        ${(!t?.fotoPeca && !t?.fotoComprovacao) ? '<p style="font-size:0.8rem; color:var(--text-muted);">Nenhuma foto anexada a esta tarefa.</p>' : `
        <div style="display:flex; gap:20px; overflow-x:auto;">
          
          ${t?.fotoPeca ? `
          <div style="flex:0 0 auto; width:220px;">
            <p style="margin:0 0 6px; font-size:0.8rem; font-weight:700; color:var(--text-secondary);">Foto da Solicitação</p>
            <img src="${t.fotoPeca}" style="width:100%; height:160px; object-fit:cover; border-radius:8px; border:2px solid var(--border-hover); cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="window.open(this.src)" />
          </div>` : ''}

          ${t?.fotoComprovacao ? `
          <div style="flex:0 0 auto; width:220px;">
            <p style="margin:0 0 6px; font-size:0.8rem; font-weight:700; color:var(--brand-primary-light);">Foto da Conclusão</p>
            <img src="${t.fotoComprovacao}" style="width:100%; height:160px; object-fit:cover; border-radius:8px; border:2px solid var(--brand-primary); cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="window.open(this.src)" />
          </div>` : ''}

        </div>`}
      </div>

      <!-- Seção de Observações e Histórico -->
      <div style="background:var(--bg-card); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid var(--border-default);">
        <h4 style="margin:0 0 12px; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Histórico e Observações</h4>
        ${obsHistoryHtml}
        <textarea id="tk-obs" rows="2" placeholder="${obsHistoryHtml ? 'Adicionar nova observação ao histórico...' : 'Digite as observações da tarefa...'}" style="width:100%;"></textarea>
      </div>

      <input type="hidden" id="tk-editing-id" value="${t?.id||''}" />
    </div>`;
  }

  function openCreate(equipmentId = null) {
    if (!document.getElementById('modal-task')) {
      const div = document.createElement('div');
      div.innerHTML = `<div class="modal-overlay" id="modal-task">
        <div class="modal modal-lg">
          <div class="modal-header"><div class="modal-title" id="task-modal-title">Tarefa</div><button class="modal-close" onclick="closeModal('modal-task')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
          <div class="modal-body" id="task-modal-body"></div>
          <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-task')">Cancelar</button><button class="btn btn-primary" onclick="TasksModule.save()">Salvar</button></div>
        </div>
      </div>`;
      document.body.appendChild(div.firstElementChild);
    }
    document.getElementById('task-modal-title').textContent = 'Nova Tarefa';
    document.getElementById('task-modal-body').innerHTML = taskForm(null);
    if (equipmentId && typeof equipmentId === 'string') {
      const select = document.getElementById('tk-eq');
      if (select) select.value = equipmentId;
    }
    onFormChange();
    openModal('modal-task');
  }

  function openEdit(id) {
    if (!document.getElementById('modal-task')) {
      const div = document.createElement('div');
      div.innerHTML = `<div class="modal-overlay" id="modal-task">
        <div class="modal modal-lg">
          <div class="modal-header"><div class="modal-title" id="task-modal-title">Tarefa</div><button class="modal-close" onclick="closeModal('modal-task')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
          <div class="modal-body" id="task-modal-body"></div>
          <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-task')">Cancelar</button><button class="btn btn-primary" onclick="TasksModule.save()">Salvar</button></div>
        </div>
      </div>`;
      document.body.appendChild(div.firstElementChild);
    }
    const t = DB.tasks.get(id);
    if (!t) return;
    document.getElementById('task-modal-title').textContent = 'Detalhamento da Tarefa';
    document.getElementById('task-modal-body').innerHTML = taskForm(t);
    openModal('modal-task');
  }

  function save() {
    const id = document.getElementById('tk-editing-id').value;
    const desc = document.getElementById('tk-desc').value.trim();
    if (!desc) { Toast.error('Erro', 'Descrição é obrigatória.'); return; }
    const status = document.getElementById('tk-status').value;
    const today = new Date().toISOString().slice(0,10);
    
    const newObsText = document.getElementById('tk-obs').value.trim();
    let finalObservacoes = '';
    
    if (id) {
      const t = DB.tasks.get(id);
      if (t) {
        let comments = [];
        let isJson = false;
        if (t.observacoes) {
          try {
            comments = JSON.parse(t.observacoes);
            if (Array.isArray(comments)) isJson = true;
          } catch(e) {}
        }
        
        if (isJson) {
          if (newObsText) {
            const session = window.Auth.getSession();
            comments.push({
              id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
              text: newObsText,
              user: session ? session.nome : 'Usuário',
              userId: session ? session.userId : 'anonymous',
              createdAt: new Date().toISOString()
            });
          }
          finalObservacoes = JSON.stringify(comments);
        } else {
          finalObservacoes = newObsText || t.observacoes || '';
        }
      }
    } else {
      if (newObsText) {
        const session = window.Auth.getSession();
        finalObservacoes = JSON.stringify([{
          id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          text: newObsText,
          user: session ? session.nome : 'Usuário',
          userId: session ? session.userId : 'anonymous',
          createdAt: new Date().toISOString()
        }]);
      } else {
        finalObservacoes = '[]';
      }
    }

    const data = {
      equipmentId: document.getElementById('tk-eq').value,
      codigo: document.getElementById('tk-cod').value.trim(),
      descricao: desc,
      disciplina: document.getElementById('tk-disc').value,
      prioridade: document.getElementById('tk-prio').value,
      responsavel: document.getElementById('tk-resp').value,
      status,
      dataPlanejadaInicio: document.getElementById('tk-ip').value,
      dataPlanejadaTermino: document.getElementById('tk-tp').value,
      dataRealInicio: document.getElementById('tk-ri') ? document.getElementById('tk-ri').value : '',
      dataRealTermino: document.getElementById('tk-rt') ? document.getElementById('tk-rt').value : '',
      horasPlanejadas: parseFloat(document.getElementById('tk-hp').value) || 0,
      horasRealizadas: parseFloat(document.getElementById('tk-hr').value) || 0,
      pctExecutado: parseInt(document.getElementById('tk-pct').value) || 0,
      critico: document.getElementById('tk-critico').checked,
      observacoes: finalObservacoes,
    };
    if (status === 'Concluída') { 
      data.pctExecutado = 100; 
      data.dataRealTermino = data.dataRealTermino || today; 
    }

    if (data.responsavel && data.responsavel !== 'Não atribuído') {
      const activeEqs = DB.equipment.list().filter(e => e.id !== data.equipmentId && e.status !== 'Liberado');
      for (const eq of activeEqs) {
        if (eq.workforceMap && Object.values(eq.workforceMap).includes(data.responsavel)) {
          Toast.error('Erro', `O funcionário ${data.responsavel} já está alocado no equipamento ${eq.codigo} (${eq.status}).`);
          return;
        }
      }
    }

    const eq = DB.equipment.get(data.equipmentId);
    const defaultWorker = eq && eq.workforceMap ? eq.workforceMap[data.disciplina] : '';
    
    let previousWorker = null;
    if (id) {
      const t = DB.tasks.get(id);
      previousWorker = t ? t.responsavel : null;
    }
    
    const isWorkerChanged = id
      ? (data.responsavel !== previousWorker)
      : (defaultWorker && data.responsavel !== defaultWorker);

    if (isWorkerChanged) {
      const justification = prompt(`Justificativa para alteração de Mão de Obra (de "${previousWorker || defaultWorker || 'Ninguém'}" para "${data.responsavel || 'Ninguém'}"):`);
      if (justification === null) {
        return; // Abort saving!
      }
      const justTrimmed = justification.trim();
      if (!justTrimmed) {
        Toast.error('Erro', 'Justificativa é obrigatória para alterar a Mão de Obra.');
        return; // Abort saving!
      }
      
      data.justificativaMaoDeObra = justTrimmed;
      const dateStr = new Date().toLocaleString('pt-BR');
      
      let comments = [];
      let isJson = false;
      try {
        comments = JSON.parse(data.observacoes);
        if (Array.isArray(comments)) isJson = true;
      } catch(e) {}
      
      if (isJson) {
        const session = window.Auth.getSession();
        comments.push({
          id: 'c-sys-' + Date.now(),
          text: `[M.O. Alterada]: ${justTrimmed}`,
          user: session ? session.nome : 'Sistema',
          userId: session ? session.userId : 'system',
          createdAt: new Date().toISOString()
        });
        data.observacoes = JSON.stringify(comments);
      } else {
        data.observacoes = (data.observacoes ? data.observacoes : '') + `\n[M.O. Alterada em ${dateStr}]: ${justTrimmed}`;
      }
    }

    if (id) { DB.tasks.update(id, data); Toast.success('Tarefa atualizada!'); }
    else { DB.tasks.create(data); Toast.success('Tarefa criada!'); }
    closeModal('modal-task');
    Router.navigate('tasks', { force: true });
  }

  function deleteTask(id) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem excluir tarefas.');
      return;
    }
    const t = DB.tasks.get(id);
    confirmDialog('Excluir Tarefa', `Excluir "${t?.descricao}"?`, () => {
      DB.tasks.delete(id);
      Router.navigate('tasks', { force: true });
      Toast.success('Tarefa excluída');
    });
  }

  function setEq(eqId) {
    window.setGlobalEqFilter(eqId);
  }

  function onFormChange() {
    const eqSelect = document.getElementById('tk-eq');
    const discSelect = document.getElementById('tk-disc');
    const respSelect = document.getElementById('tk-resp');
    if (!eqSelect || !discSelect || !respSelect) return;
    
    const eqId = eqSelect.value;
    const disc = discSelect.value;
    const eq = DB.equipment.get(eqId);
    
    const wf = DB.workforce.list();
    const filteredWf = wf.filter(w => w.equipmentId === eqId);
    
    const currentVal = respSelect.value;
    if (currentVal && currentVal !== 'Não atribuído') {
      const respWorker = wf.find(w => w.nome === currentVal);
      if (respWorker && !filteredWf.some(w => w.id === respWorker.id)) {
        filteredWf.push(respWorker);
      }
    }
    
    let html = '<option value="">—</option>';
    filteredWf.forEach(w => {
      html += `<option value="${w.nome}" ${w.nome === currentVal ? 'selected' : ''}>${w.nome}</option>`;
    });
    respSelect.innerHTML = html;
    
    if (eq && eq.workforceMap && eq.workforceMap[disc]) {
      const defaultName = eq.workforceMap[disc];
      if (filteredWf.some(w => w.nome === defaultName)) {
        respSelect.value = defaultName;
      } else {
        const mappedWorker = wf.find(w => w.nome === defaultName);
        if (mappedWorker) {
          if (!filteredWf.some(w => w.id === mappedWorker.id)) {
            filteredWf.push(mappedWorker);
            respSelect.innerHTML += `<option value="${mappedWorker.nome}">${mappedWorker.nome}</option>`;
          }
          respSelect.value = defaultName;
        }
      }
    }
  }

  return { render, openCreate, openEdit, save, deleteTask, setEq, onFormChange };
})();

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
    const emManutencao = eqs.filter(e => e.status === 'Em Manutenção' || e.status === 'Backlog').length;
    const liberados = eqs.filter(e => e.status === 'Liberado' && (e.dataLiberacaoAtual || '').startsWith(currentMonthPrefix)).length;
    const atrasados = eqs.filter(e => e.status !== 'Liberado' && e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada < todayStr).length;
    const aguardandoPecas = eqs.filter(e => e.status === 'Falta de Peças').length;
    const paralisados = eqs.filter(e => e.status === 'Paralisado').length;
    
    const tarefasTotal = tasks.length;
    const tarefasConcluidas = tasks.filter(t => t.pctExecutado >= 100).length;
    const tarefasCriticas = tasks.filter(t => t.critico || (t.dataPlanejadaTermino && t.dataPlanejadaTermino < todayStr && t.pctExecutado < 100)).length;
    
    const restrAbertas = restrictions.filter(r => r.status === 'Aberta').length;
    
    const avancoGeral = Math.round(stats.pctAvancoGeral || 0);
    const horasRealizadas = Math.round(stats.horasRealizadas || 0);
    const aderencia = Math.round(stats.aderencia || 0);
    
    // Curva de avanço
    const desvio = aderencia - 100;
    const avancoPlan = 100;
    const avancoReal = avancoGeral;
    const statusColor = aderencia >= 90 ? '#10b981' : (aderencia >= 70 ? '#f59e0b' : '#ef4444');

    // Listas
    const proximasLibs = eqs.filter(e => e.status !== 'Liberado' && e.dataLiberacaoPlanejada).sort((a,b) => a.dataLiberacaoPlanejada.localeCompare(b.dataLiberacaoPlanejada)).slice(0, 5);
    const alertas = eqs.filter(e => e.status !== 'Liberado' && e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada < todayStr).sort((a,b) => a.dataLiberacaoPlanejada.localeCompare(b.dataLiberacaoPlanejada)).slice(0, 5);

    setTimeout(() => {
      try {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b';
        Chart.defaults.color = textColor;
        Chart.defaults.font.family = 'Inter';
        
        // 1. Saúde da Frota
        const ctxStatus = document.getElementById('mega-ch-status');
        if (ctxStatus) {
           const sts = ['Em Manutenção','Liberado','Paralisado','Falta de Peças', 'Backlog'];
           const counts = sts.map(s => eqs.filter(e => e.status === s).length);
           charts.status = new Chart(ctxStatus, {
             type: 'doughnut',
             data: { labels: sts, datasets: [{ data: counts, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0, hoverOffset: 4 }] },
             options: { cutout: '80%', maintainAspectRatio: false, plugins: { datalabels: { display: false }, legend: { position: 'bottom', align: 'center', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, padding: 15 } } } }
           });
        }
        
        // 2. Anual
        const ctxAno = document.getElementById('mega-ch-ano');
        if (ctxAno) {
          const mStr = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          const mP = Array(12).fill(0), mR = Array(12).fill(0);
          eqs.forEach(e => {
            if(e.dataLiberacaoPlanejada) { const m = parseInt(e.dataLiberacaoPlanejada.split('-')[1],10); if(m>=1&&m<=12) mP[m-1]++; }
            if(e.status==='Liberado' && (e.dataLiberacaoAtual || e.dataFim)) { const m = parseInt((e.dataLiberacaoAtual||e.dataFim).split('-')[1],10); if(m>=1&&m<=12) mR[m-1]++; }
          });
          
          let gradientR = ctxAno.getContext('2d').createLinearGradient(0, 0, 0, 400);
          gradientR.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
          gradientR.addColorStop(1, 'rgba(16, 185, 129, 0.1)');

          charts.ano = new Chart(ctxAno, {
            type: 'bar',
            data: { labels: mStr, datasets: [
              { type: 'line', label: 'Realizado', data: mR, borderColor: '#10b981', backgroundColor: gradientR, fill: true, tension: 0.4, borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#10b981', pointBorderWidth: 2, pointRadius: 4 },
              { type: 'bar', label: 'Planejado', data: mP, backgroundColor: '#E2E8F0', borderRadius: 6, borderSkipped: false, barPercentage: 0.6 }
            ]},
            options: { ...chartDefaults(), maintainAspectRatio: false }
          });
        }

        // 3. Categoria
        const catsFull = ['Sondas de Pesquisas', 'Bomba de pesquisa', 'Sondas Poços', 'Bombas de poços', 'Subconjuntos', 'Programação de almoxarifado'];
        const catsLabels = ['Sondas Pesq', 'Bombas Pesq', 'Sondas Poço', 'Bombas Poço', 'Subconjuntos', 'Almoxarifado'];
        const ctxCat = document.getElementById('mega-ch-cat');
        if (ctxCat) {
          const cP = catsFull.map(c => eqs.filter(e => (e.tipo||'') === c && e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada.startsWith(currentMonthPrefix)).length);
          const cR = catsFull.map(c => eqs.filter(e => (e.tipo||'') === c && e.status === 'Liberado' && (e.dataLiberacaoAtual||'').startsWith(currentMonthPrefix)).length);
          charts.cat = new Chart(ctxCat, {
            type: 'bar',
            data: { labels: catsLabels, datasets: [
              { label: 'Realizado', data: cR, backgroundColor: '#0ea5e9', borderRadius: 6, borderSkipped: false },
              { label: 'Planejado', data: cP, backgroundColor: '#E2E8F0', borderRadius: 6, borderSkipped: false }
            ]},
            options: { ...chartDefaults(), maintainAspectRatio: false }
          });
        }

        // 4. Tarefas
        const ctxTasks = document.getElementById('mega-ch-tasks');
        if (ctxTasks) {
          const tNao = tasks.filter(t => !t.pctExecutado).length;
          const tAnd = tasks.filter(t => t.pctExecutado > 0 && t.pctExecutado < 100).length;
          const tFim = tasks.filter(t => t.pctExecutado >= 100).length;
          charts.tasksChart = new Chart(ctxTasks, {
            type: 'doughnut',
            data: { labels: ['Não iniciada', 'Andamento', 'Concluída'], datasets: [{ data: [tNao, tAnd, tFim], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth:0, hoverOffset: 4 }] },
            options: { cutout: '80%', maintainAspectRatio: false, plugins: { datalabels: { display: false }, legend: { position: 'bottom', align: 'center', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, padding: 15 } } } }
          });
        }

        // 5. Insumos (Peças)
        const ctxParts = document.getElementById('mega-ch-parts');
        if (ctxParts) {
          const pSol = parts.filter(p => p.status === 'Solicitada').length;
          const pCom = parts.filter(p => p.status === 'Comprada').length;
          const pTra = parts.filter(p => p.status === 'Em Transporte').length;
          const pEnt = parts.filter(p => p.status === 'Entregue').length;
          charts.partsChart = new Chart(ctxParts, {
            type: 'doughnut',
            data: { labels: ['Solicitada', 'Comprada', 'Em Transporte', 'Entregue'], datasets: [{ data: [pSol, pCom, pTra, pEnt], backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'], borderWidth:0, hoverOffset: 4 }] },
            options: { cutout: '80%', maintainAspectRatio: false, plugins: { datalabels: { display: false }, legend: { position: 'bottom', align: 'center', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, padding: 15 } } } }
          });
        }

        // 6. Esforço HH
        const ctxEffort = document.getElementById('mega-ch-effort');
        if (ctxEffort) {
          const hhP = catsFull.map(c => tasks.filter(t => { const eq=DB.equipment.get(t.equipmentId); return eq && (eq.tipo||'') === c; }).reduce((s,t)=>s+(t.horasPlanejadas||0),0));
          const hhR = catsFull.map(c => tasks.filter(t => { const eq=DB.equipment.get(t.equipmentId); return eq && (eq.tipo||'') === c; }).reduce((s,t)=>s+(t.horasRealizadas||0),0));
          charts.effort = new Chart(ctxEffort, {
            type: 'bar',
            data: { labels: catsLabels, datasets: [
              { label: 'Real (hh)', data: hhR, backgroundColor: '#8b5cf6', borderRadius: 6, borderSkipped: false },
              { label: 'Plan (hh)', data: hhP, backgroundColor: '#E2E8F0', borderRadius: 6, borderSkipped: false }
            ]},
            options: { ...chartDefaults(), maintainAspectRatio: false }
          });
        }

        // 7. Mapa de Atrasos
        const ctxDelay = document.getElementById('mega-ch-delay');
        if (ctxDelay) {
          const del = [0,0,0,0];
          const delayedEqs = eqs.filter(e => e.status !== 'Liberado');
          delayedEqs.forEach(e => {
            if (!e.dataLiberacaoPlanejada) return;
            const dPlan = new Date(e.dataLiberacaoPlanejada);
            const dToday = new Date(todayStr);
            const diffDays = Math.ceil((dToday - dPlan) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) del[0]++; else if (diffDays <= 3) del[1]++; else if (diffDays <= 7) del[2]++; else del[3]++;
          });
          charts.delay = new Chart(ctxDelay, {
            type: 'bar',
            data: { labels: ['No Prazo', '1-3 Dias', '4-7 Dias', '> 7 Dias'], datasets: [{ label: 'Qtd. Máquinas', data: del, backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#7f1d1d'], borderRadius: 6, borderSkipped: false }] },
            options: { ...chartDefaults(), maintainAspectRatio: false, plugins: { legend:{display:false} } }
          });
        }

        // 8. Mão de Obra
        const ctxWorker = document.getElementById('mega-ch-worker');
        if (ctxWorker) {
          const roles = ['Mecânico', 'Eletricista', 'Soldador', 'Ajudante', 'Técnico'];
          const roleCount = roles.map(r => wf.filter(w => (w.cargo||'').includes(r)).length);
          charts.worker = new Chart(ctxWorker, {
            type: 'polarArea',
            data: { labels: roles, datasets: [{ data: roleCount, backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)', 'rgba(139,92,246,0.7)'], borderWidth:0 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } }, scales: { r: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } } } }
          });
        }
      } catch(e) { console.warn('Mega Chart Error', e); }
    }, 100);

    const microCard = (title, val, iconColor) => `
      <div style="flex: 1 1 150px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; min-width:140px;">
        <div style="position: absolute; top:0; right:0; width: 60px; height: 60px; background: radial-gradient(circle, ${iconColor}25 0%, transparent 70%); transform: translate(20%, -20%); border-radius: 50%;"></div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom: 12px; position:relative; z-index:2;">
          <div style="width: 32px; height: 32px; border-radius: 10px; background: ${iconColor}15; border: 1px solid ${iconColor}30; display:flex; align-items:center; justify-content:center;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${iconColor}; box-shadow: 0 0 10px ${iconColor};"></div>
          </div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${title}">${title}</div>
        </div>
        <div style="font-size: 32px; font-weight: 900; color: var(--text-primary); line-height: 1; letter-spacing: -0.03em; position:relative; z-index:2;">${val}</div>
      </div>
    `;
    
    const chartCard = (title, id) => `
      <div style="background:var(--bg-card); border:1px solid var(--border-card); border-radius:20px; padding:24px; box-shadow: 0 8px 30px rgba(0,0,0,0.03); display:flex; flex-direction:column; min-height: 340px; height: 100%; overflow:hidden;">
        <div style="font-size:15px; font-weight:800; color:var(--text-primary); margin-bottom:20px; flex-shrink: 0; letter-spacing: -0.02em;">${title}</div>
        <div style="flex:1; position:relative; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center;">
           <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;">
             <canvas id="${id}"></canvas>
           </div>
        </div>
      </div>
    `;

    const html = `
    <div style="width:100%; max-width:100%; padding:var(--space-6); display:flex; flex-direction:column; gap:var(--space-5);">
      
      <!-- HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap: 16px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--brand-primary), #0ea5e9); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
            <svg style="width:24px;height:24px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </div>
          <div>
            <h1 style="font-size:24px; font-weight:900; color:var(--text-primary); margin:0; letter-spacing: -0.03em;">Dashboard Executivo</h1>
            <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0; font-weight:500;">Visão geral em tempo real · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</p>
          </div>
        </div>
        <button class="btn btn-primary" style="display:flex; align-items:center; gap:8px; border-radius: 10px; padding: 10px 20px; font-weight: 700; background: #0f172a; border: none;" onclick="Router.navigate('dashboard',{force:true})">
          <svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Atualizar Dados
        </button>
      </div>

      <!-- SECTION 1: Micro Cards (Grid) -->
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px;">
        ${microCard('Em Manutenção', emManutencao, '#3b82f6')}
        ${microCard('Liberados', liberados, '#10b981')}
        ${microCard('Atrasados', atrasados, '#ef4444')}
        ${microCard('Paralisados / F. Peça', paralisados, '#ef4444')}
        ${microCard('Aguardando Peças', aguardandoPecas, '#f59e0b')}
        ${microCard('Restrições Abertas', restrAbertas, '#f59e0b')}
        ${microCard('Total de Tarefas', tarefasTotal, '#3b82f6')}
        ${microCard('Tarefas Concluídas', tarefasConcluidas, '#10b981')}
        ${microCard('Tarefas Críticas', tarefasCriticas, '#ef4444')}
        ${microCard('Avanço Geral', avancoGeral + '%', '#0ea5e9')}
        ${microCard('Horas Realizadas', horasRealizadas + 'h', '#8b5cf6')}
        ${microCard('Aderência', aderencia + '%', '#ef4444')}
      </div>

      <!-- SECTION 2: Curva de Avanço -->
      <div style="background:var(--bg-card); border:1px solid var(--border-card); border-radius:20px; padding:32px; display:flex; flex-direction:column; box-shadow: 0 8px 30px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 32px;">
          <div style="font-size:16px; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:12px;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(14,165,233,0.1);display:flex;align-items:center;justify-content:center;">
              <svg style="width:18px;color:#0ea5e9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            Curva de Avanço Real
          </div>
          <div style="background:${desvio > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color:${desvio > 0 ? '#10b981' : '#ef4444'}; font-weight:800; padding:6px 16px; border-radius:20px; font-size:12px; letter-spacing:0.5px;">${desvio > 0 ? '+' : ''}${desvio}% DE DESVIO</div>
        </div>

        <div style="display:flex; align-items:center; gap: 40px; width:100%; flex-wrap: wrap;">
          
          <div style="display:flex; gap: 16px; flex: 0 0 auto;">
            <div style="background: var(--bg-surface); padding: 16px 32px; border-radius: 16px; text-align:center;">
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Planejado</div>
              <div style="font-size:40px; font-weight:900; color:#0ea5e9; line-height:1; margin-top:8px;">${avancoPlan}%</div>
            </div>
            <div style="display:flex; align-items:center; font-weight:800; color:var(--text-muted); font-size:18px;">VS</div>
            <div style="background: var(--bg-surface); padding: 16px 32px; border-radius: 16px; text-align:center;">
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Realizado</div>
              <div style="font-size:40px; font-weight:900; color:${statusColor}; line-height:1; margin-top:8px;">${avancoReal}%</div>
            </div>
          </div>

          <div style="flex:1; display:flex; flex-direction:column; gap: 24px; min-width:300px;">
            <!-- Line 1: Plan -->
            <div style="display:flex; align-items:center; gap:20px;">
              <div style="width:70px; font-size:12px; color:var(--text-muted); font-weight:700;">Planejado</div>
              <div style="flex:1; height:8px; background:var(--bg-surface); border-radius:4px; position:relative;">
                <div style="position:absolute; top:0; left:0; height:100%; width:100%; background:linear-gradient(90deg, #38bdf8, #0ea5e9); border-radius:4px;"></div>
              </div>
              <div style="width:40px; font-size:12px; font-weight:800; text-align:right;">100%</div>
            </div>
            <!-- Line 2: Real -->
            <div style="display:flex; align-items:center; gap:20px;">
              <div style="width:70px; font-size:12px; color:var(--text-muted); font-weight:700;">Realizado</div>
              <div style="flex:1; height:8px; background:var(--bg-surface); border-radius:4px; position:relative;">
                <div style="position:absolute; top:0; left:0; height:100%; width:${avancoReal}%; background:${statusColor}; border-radius:4px; transition:width 1.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px ${statusColor}40;"></div>
              </div>
              <div style="width:40px; font-size:12px; font-weight:800; text-align:right;">${avancoReal}%</div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap: 12px; border-left:1px solid var(--border-card); padding-left: 32px; flex: 0 0 auto;">
            <div style="display:flex; align-items:center; gap:10px; font-size:12px; font-weight:600; color:var(--text-secondary);"><div style="width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,0.5);"></div> Crítico (< 70%)</div>
            <div style="display:flex; align-items:center; gap:10px; font-size:12px; font-weight:600; color:var(--text-secondary);"><div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;box-shadow:0 0 8px rgba(245,158,11,0.5);"></div> Atenção (70% - 89%)</div>
            <div style="display:flex; align-items:center; gap:10px; font-size:12px; font-weight:600; color:var(--text-secondary);"><div style="width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,0.5);"></div> OK (≥ 90%)</div>
          </div>
        </div>
      </div>

      <!-- SECTION 3: 8 Charts in Grid -->
      <style>
        .mega-charts-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
        @media (max-width: 1200px) {
          .mega-charts-grid > div { grid-column: span 6 !important; }
        }
        @media (max-width: 768px) {
          .mega-charts-grid > div { grid-column: span 12 !important; }
        }
      </style>
      <div class="mega-charts-grid">
        
        <!-- Row 1 -->
        <div style="grid-column: span 3;">${chartCard('Saúde da Frota', 'mega-ch-status')}</div>
        <div style="grid-column: span 3;">${chartCard('Status das Tarefas', 'mega-ch-tasks')}</div>
        <div style="grid-column: span 6;">${chartCard('Volume de Entregas por Categoria', 'mega-ch-cat')}</div>

        <!-- Row 2 -->
        <div style="grid-column: span 8;">${chartCard('Projeção vs Execução Anual', 'mega-ch-ano')}</div>
        <div style="grid-column: span 4;">${chartCard('Pipeline de Peças', 'mega-ch-parts')}</div>

        <!-- Row 3 -->
        <div style="grid-column: span 4;">${chartCard('Mapa de Atrasos', 'mega-ch-delay')}</div>
        <div style="grid-column: span 4;">${chartCard('Apropriação de Esforço (HH)', 'mega-ch-effort')}</div>
        <div style="grid-column: span 4;">${chartCard('Especialidades Alocadas', 'mega-ch-worker')}</div>

      </div>

      <!-- SECTION 4: Lists -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:24px;">
        
        <!-- Próximas Liberações -->
        <div style="background:var(--bg-card); border:1px solid var(--border-card); border-radius:20px; padding:24px; box-shadow:0 8px 30px rgba(0,0,0,0.03); min-height:250px; display:flex; flex-direction:column;">
          <div style="font-size:15px; font-weight:800; color:var(--text-primary); margin-bottom:20px; display:flex; align-items:center; gap:12px; letter-spacing:-0.02em;">
            <div style="width:28px;height:28px;border-radius:8px;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;font-size:14px;">🚀</div>
            Próximas Liberações
          </div>
          <div style="display:flex; flex-direction:column; gap:12px; flex:1; overflow-y:auto; padding-right:8px;">
            ${proximasLibs.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;margin-top:30px;font-weight:500;">Nenhum equipamento agendado.</div>' : ''}
            ${proximasLibs.map(e => {
              const d = window.daysBetween ? window.daysBetween(todayStr, e.dataLiberacaoPlanejada) : 0;
              return `
              <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-surface); border-radius:12px; padding:16px; transition:transform 0.2s; cursor:pointer;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                <div style="display:flex; align-items:center; gap:16px;">
                  <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg, #0ea5e9, #38bdf8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;">${(e.codigo||'').substring(0,2)}</div>
                  <div>
                    <div style="font-size:14px;font-weight:800;color:var(--text-primary);">${e.codigo}</div>
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-top:2px;">${e.cliente || 'Sem cliente'}</div>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:12px;font-weight:800;color:#f59e0b;">${e.dataLiberacaoPlanejada ? e.dataLiberacaoPlanejada.split('-').reverse().join('/') : ''}</div>
                  <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-top:2px;">${d} dias</div>
                </div>
              </div>
            `}).join('')}
          </div>
        </div>

        <!-- Alertas Críticos -->
        <div style="background:var(--bg-card); border:1px solid var(--border-card); border-radius:20px; padding:24px; box-shadow:0 8px 30px rgba(0,0,0,0.03); min-height:250px; display:flex; flex-direction:column;">
          <div style="font-size:15px; font-weight:800; color:var(--text-primary); margin-bottom:20px; display:flex; align-items:center; gap:12px; letter-spacing:-0.02em;">
            <div style="width:28px;height:28px;border-radius:8px;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;font-size:14px;">⚠️</div>
            Alertas Críticos
          </div>
          <div style="display:flex; flex-direction:column; gap:12px; flex:1; overflow-y:auto; padding-right:8px;">
            ${alertas.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;margin-top:30px;font-weight:500;">Nenhum equipamento crítico.</div>' : ''}
            ${alertas.map(e => {
              const d = window.daysBetween ? window.daysBetween(e.dataLiberacaoPlanejada, todayStr) : 0;
              return `
              <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-surface); border-radius:12px; padding:16px; border-left:4px solid #ef4444; transition:transform 0.2s; cursor:pointer;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                <div>
                  <div style="font-size:14px;font-weight:800;color:var(--text-primary);">${e.codigo}</div>
                  <div style="font-size:11px;color:#ef4444;text-transform:uppercase;font-weight:700;margin-top:2px;">Atrasado</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:18px;font-weight:900;color:#ef4444;line-height:1;">${d} dias</div>
                </div>
              </div>
            `}).join('')}
          </div>
        </div>

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

    return `<div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);background:var(--bg-card);border:1px solid ${t.critico ? 'rgba(244,67,54,0.3)' : isLate ? 'rgba(255,179,0,0.2)' : 'var(--border-card)'};border-radius:var(--radius-md);transition:all .2s;" class="hover-lift">
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
          <button class="btn btn-secondary btn-sm" onclick="TasksModule.openEdit('${t.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="TasksModule.deleteTask('${t.id}')">
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

    return `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-row"><div class="form-group"><label>Equipamento *</label><select id="tk-eq" onchange="TasksModule.onFormChange()">${eqs.map(e=>`<option value="${e.id}" ${t?.equipmentId===e.id?'selected':''}>${e.codigo}</option>`).join('')}</select></div>
      <div class="form-group"><label>Código</label><input id="tk-cod" value="${t?.codigo||''}" /></div></div>
      <div class="form-group"><label>Descrição *</label><input id="tk-desc" value="${t?.descricao||''}" required /></div>
      <div class="form-row"><div class="form-group"><label>Disciplina</label><select id="tk-disc" onchange="TasksModule.onFormChange()">${discs.map(d=>`<option ${t?.disciplina===d?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="form-group"><label>Prioridade</label><select id="tk-prio">${prios.map(p=>`<option ${t?.prioridade===p?'selected':''}>${p}</option>`).join('')}</select></div></div>
      <div class="form-row"><div class="form-group"><label>Responsável</label><select id="tk-resp"><option value="">—</option>${filteredWf.map(w=>`<option value="${w.nome}" ${t?.responsavel===w.nome?'selected':''}>${w.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Status</label><select id="tk-status">${statuses.map(s=>`<option ${t?.status===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
      <div class="form-row"><div class="form-group"><label>Início Planejado</label><input type="date" id="tk-ip" value="${toDateInput(t?.dataPlanejadaInicio)}" /></div>
      <div class="form-group"><label>Término Planejado</label><input type="date" id="tk-tp" value="${toDateInput(t?.dataPlanejadaTermino)}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Horas Planejadas</label><input type="number" id="tk-hp" value="${t?.horasPlanejadas||0}" min="0" /></div>
      <div class="form-group"><label>Horas Realizadas</label><input type="number" id="tk-hr" value="${t?.horasRealizadas||0}" min="0" /></div></div>
      <div class="form-group"><label>% Executado: <span id="tk-pct-val">${t?.pctExecutado||0}</span>%</label>
        <input type="range" id="tk-pct" min="0" max="100" value="${t?.pctExecutado||0}" oninput="document.getElementById('tk-pct-val').textContent=this.value" /></div>
      <div class="checkbox-wrap"><input type="checkbox" id="tk-critico" ${t?.critico?'checked':''} /><label for="tk-critico">Marcar como Tarefa Crítica (Caminho Crítico)</label></div>
      <div class="form-group" style="display:${(t?.fotoPeca || t?.fotoComprovacao) ? 'block' : 'none'}; background:var(--bg-base); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid var(--border-default);">
        <label style="margin-bottom:8px; display:block;">Fotos da Atividade</label>
        <div style="display:flex;gap:15px;overflow-x:auto;">
          ${t?.fotoPeca ? `<div style="flex:0 0 auto;width:200px;"><span style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-weight:700;">Foto da Solicitação</span><img src="${t.fotoPeca}" style="width:100%;height:150px;object-fit:cover;border-radius:4px;border:1px solid var(--border-hover);cursor:pointer;" onclick="window.open(this.src)" /></div>` : ''}
          ${t?.fotoComprovacao ? `<div style="flex:0 0 auto;width:200px;"><span style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-weight:700;">Foto da Conclusão</span><img src="${t.fotoComprovacao}" style="width:100%;height:150px;object-fit:cover;border-radius:4px;border:1px solid var(--border-hover);cursor:pointer;" onclick="window.open(this.src)" /></div>` : ''}
        </div>
      </div>
      <div class="form-group"><label>Observações</label>
        ${obsHistoryHtml}
        <textarea id="tk-obs" placeholder="${obsHistoryHtml ? 'Adicionar nova observação...' : 'Observações...'}">${obsTextValue}</textarea>
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
    document.getElementById('task-modal-title').textContent = 'Editar Tarefa';
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
      horasPlanejadas: parseFloat(document.getElementById('tk-hp').value) || 0,
      horasRealizadas: parseFloat(document.getElementById('tk-hr').value) || 0,
      pctExecutado: parseInt(document.getElementById('tk-pct').value) || 0,
      critico: document.getElementById('tk-critico').checked,
      observacoes: finalObservacoes,
    };
    if (status === 'Concluída') { data.pctExecutado = 100; data.dataRealTermino = data.dataRealTermino || today; }

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

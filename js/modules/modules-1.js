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
      layout: { padding: { top: 20, bottom: 10, left: 10, right: 10 } },
      interaction: { mode: 'index', intersect: false },
      plugins: { 
        legend: { 
          position: 'top',
          align: 'end',
          labels: { 
            color: '#64748B', 
            font: { family: 'Inter', size: 11, weight: '600' },
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 20
          } 
        },
        datalabels: {
          color: '#1E293B',
          font: { weight: '800', size: 11, family: 'Inter' },
          anchor: 'end',
          align: 'top',
          offset: 4,
          formatter: (value) => {
            if (!value || value <= 0) return '';
            const rounded = Math.round(value * 10) / 10;
            return rounded;
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Inter', size: 13 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true
        }
      },
      scales: {
        x: { 
          ticks: { color: '#64748B', font: { size: 10, family: 'Inter' }, maxRotation: 45, minRotation: 45 }, 
          grid: { display: false },
          border: { display: false }
        },
        y: { 
          grace: '30%',
          ticks: { color: '#94A3B8', font: { size: 10, family: 'Inter' }, padding: 10 }, 
          grid: { color: '#F1F5F9', drawBorder: false },
          border: { display: false },
          beginAtZero: true
        }
      }
    };
  }

  function render() {
    destroyCharts();
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const stats = DB.kpi.getEquipmentStats(currentMonthPrefix);
    
    const eqs = DB.equipment.list().filter(e => 
      (e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada.startsWith(currentMonthPrefix)) || 
      (e.dataLiberacaoAtual && e.dataLiberacaoAtual.startsWith(currentMonthPrefix)) || 
      (e.dataFim && e.dataFim.startsWith(currentMonthPrefix)) ||
      (e.status === 'Em Manutenção')
    );
    
    const parts = DB.parts.getAll();
    const pendingParts = parts.filter(p => ['Solicitada','Comprada','Em Transporte'].includes(p.status)).length;
    const restrs = DB.restrictions.getAll().filter(r => r.status === 'Aberta').length;
    
    const atrasadosList = eqs.filter(e => e.status !== 'Liberado' && e.pctAvanco < 100 && e.dataLiberacaoPlanejada < new Date().toISOString().slice(0,10))
                             .sort((a,b) => (b.pctAvanco || 0) - (a.pctAvanco || 0))
                             .slice(0, 5);

    const devClass = stats.aderencia >= 90 ? 'success' : (stats.aderencia >= 70 ? 'warning' : 'danger');
    
    setTimeout(() => {
      try {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#64748b';
        const borderColor = getComputedStyle(document.body).getPropertyValue('--border-default').trim() || 'rgba(150,150,150,0.2)';
        Chart.defaults.color = textColor;
        Chart.defaults.font.family = 'Inter';
        
        // 1. Avanço Global (Gauge)
        const ctxGauge = document.getElementById('ch-global-gauge');
        if (ctxGauge) {
          charts.gauge = new Chart(ctxGauge, {
            type: 'doughnut',
            data: {
              labels: ['Realizado', 'Pendente'],
              datasets: [{
                data: [stats.pctAvancoGeral, Math.max(0, 100 - stats.pctAvancoGeral)],
                backgroundColor: ['#0ea5e9', borderColor],
                borderWidth: 0,
                borderRadius: 20,
              }]
            },
            options: {
              rotation: -90,
              circumference: 180,
              cutout: '80%',
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
          });
        }
        
        // 2. Status dos Equipamentos
        const allStatuses = ['Em Manutenção','Liberado','Paralisado','Falta de Peças', 'Backlog'];
        const eqCount = allStatuses.map(s => eqs.filter(e => e.status === s).length);
        const ctxStatus = document.getElementById('ch-status-pro');
        if (ctxStatus) {
           charts.status = new Chart(ctxStatus, {
             type: 'doughnut',
             data: {
               labels: allStatuses,
               datasets: [{
                 data: eqCount,
                 backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                 borderWidth: 2,
                 borderColor: 'var(--bg-card)',
                 hoverOffset: 4
               }]
             },
             options: {
               cutout: '70%',
               maintainAspectRatio: false,
               plugins: {
                 legend: { position: 'right', labels: { color: textColor, usePointStyle: true, padding: 15, font: { size: 11, family: 'Inter' } } }
               }
             }
           });
        }
        
        // 3. Timeline Anual
        const monthsStr = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const mPlan = Array(12).fill(0), mReal = Array(12).fill(0);
        eqs.forEach(e => {
          if(e.dataLiberacaoPlanejada) { const m = parseInt(e.dataLiberacaoPlanejada.split('-')[1],10); if(m>=1&&m<=12) mPlan[m-1]++; }
          if(e.status==='Liberado' && (e.dataLiberacaoAtual || e.dataFim)) {
            const m = parseInt((e.dataLiberacaoAtual || e.dataFim).split('-')[1],10); if(m>=1&&m<=12) mReal[m-1]++;
          }
        });
        const ctxAno = document.getElementById('ch-ano-pro');
        if (ctxAno) {
          charts.ano = new Chart(ctxAno, {
            type: 'bar',
            data: {
              labels: monthsStr,
              datasets: [
                { type: 'line', label: 'Realizado (Tendência)', data: mReal, borderColor: '#10b981', backgroundColor: '#10b981', fill: false, tension: 0.4, borderWidth: 3 },
                { type: 'bar', label: 'Planejado', data: mPlan, backgroundColor: borderColor, borderRadius: 4, barPercentage: 0.5 }
              ]
            },
            options: { ...chartDefaults(), maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: borderColor }, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
          });
        }

        // 4. Avanço por Categoria
        const categories = ['Sondas de Pesquisas', 'Bomba de pesquisa', 'Sondas Poços', 'Bombas de poços', 'Subconjuntos', 'Prog. almoxarifado', 'Outros'];
        const catPlan = categories.map(c => eqs.filter(e => (e.tipo || '').includes(c.split(' ')[0]) && e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada.startsWith(currentMonthPrefix)).length);
        const catReal = categories.map(c => eqs.filter(e => (e.tipo || '').includes(c.split(' ')[0]) && e.status === 'Liberado' && (e.dataLiberacaoAtual || e.dataFim || '').startsWith(currentMonthPrefix)).length);
        const ctxCat = document.getElementById('ch-cat-pro');
        if (ctxCat) {
          charts.cat = new Chart(ctxCat, {
            type: 'bar',
            data: {
              labels: categories,
              datasets: [
                { label: 'Realizado', data: catReal, backgroundColor: '#0ea5e9', borderRadius: 4 },
                { label: 'Planejado', data: catPlan, backgroundColor: borderColor, borderRadius: 4 }
              ]
            },
            options: { 
              ...chartDefaults(), 
              indexAxis: 'y', 
              maintainAspectRatio: false,
              scales: { x: { beginAtZero: true, grid: { color: borderColor }, ticks: { precision: 0 } }, y: { grid: { display: false } } }
            }
          });
        }

      } catch(e) { console.warn('Chart error:', e); }
    }, 100);

    const html = `
    <div style="width:100%; max-width:100%; padding:var(--space-6); display:flex; flex-direction:column; gap:var(--space-6);">
      
      <!-- HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 style="font-size:var(--text-3xl); font-weight:900; color:var(--text-primary); letter-spacing:-0.02em; margin:0;">CENTRAL DE CONTROLE</h1>
          <p style="font-size:var(--text-sm); color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.05em; margin:4px 0 0 0;">
            Operações Globais em Tempo Real · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}
          </p>
        </div>
        <div style="display:flex; gap: 16px; align-items:center;">
          <div style="display:flex; align-items:center; gap: 8px; padding: 6px 12px; background: rgba(239, 68, 68, 0.1); border-radius: 20px;">
            <div style="width:8px;height:8px;background:#ef4444;border-radius:50%;box-shadow: 0 0 10px #ef4444; animation: pulse 2s infinite;"></div>
            <span style="color:#ef4444; font-weight:700; font-size: 12px; text-transform:uppercase; letter-spacing:0.1em;">Ao Vivo</span>
          </div>
          <button class="btn btn-primary" style="display:flex; align-items:center; gap:8px;" onclick="Router.navigate('dashboard',{force:true})">
            <svg style="width:14px;height:14px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Atualizar
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(12, 1fr); gap:var(--space-6);">
        
        <!-- TOP KPI 1: Avanço Global -->
        <div style="grid-column: span 3; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:var(--shadow-sm);">
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-4);">
            <span style="font-size:var(--text-xs); font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Avanço do Projeto</span>
            <svg style="width:16px;color:var(--brand-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          </div>
          <div style="position:relative; width: 180px; height: 90px;">
            <canvas id="ch-global-gauge"></canvas>
            <div style="position:absolute; bottom: 0; left: 0; width: 100%; text-align: center;">
              <div style="font-size:36px; font-weight:900; color:var(--brand-primary); line-height:1;">${stats.pctAvancoGeral}%</div>
            </div>
          </div>
        </div>

        <!-- TOP KPI 2: Aderência -->
        <div style="grid-column: span 3; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-4);">
            <span style="font-size:var(--text-xs); font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Aderência</span>
            <span class="badge" style="background:var(--color-${devClass}); color:#fff">${stats.aderencia >= 90 ? 'Ótimo' : stats.aderencia >= 70 ? 'Atenção' : 'Crítico'}</span>
          </div>
          <div style="font-size:42px; font-weight:900; color:var(--color-${devClass}); line-height:1; margin-bottom:var(--space-2);">${stats.aderencia}%</div>
          <p style="color:var(--text-muted); font-size:12px; margin:0;">Planejado vs Realizado (Mês Atual)</p>
        </div>

        <!-- TOP KPI 3: Produtividade -->
        <div style="grid-column: span 3; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-4);">
            <span style="font-size:var(--text-xs); font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Horas Trabalhadas</span>
            <svg style="width:16px;color:var(--color-purple)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div style="font-size:42px; font-weight:900; color:var(--color-purple); line-height:1; margin-bottom:var(--space-2);">${stats.horasRealizadas.toFixed(0)}h</div>
          <div style="display:flex; gap: 12px;">
            <span style="color:var(--text-muted); font-size:12px;">Meta: ${stats.horasPlanejadas.toFixed(0)}h</span>
          </div>
        </div>

        <!-- TOP KPI 4: Alertas Gerais -->
        <div style="grid-column: span 3; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-4);">
            <span style="font-size:var(--text-xs); font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Alertas & Gargalos</span>
            <svg style="width:16px;color:var(--color-danger)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:13px; color:var(--text-secondary); font-weight:600;">Peças Pendentes</span>
              <span style="font-size:16px; font-weight:800; color:${pendingParts>0?'var(--color-danger)':'var(--text-primary)'};">${pendingParts}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:13px; color:var(--text-secondary); font-weight:600;">Restrições Abertas</span>
              <span style="font-size:16px; font-weight:800; color:${restrs>0?'var(--color-warning)':'var(--text-primary)'};">${restrs}</span>
            </div>
          </div>
        </div>

        <!-- CHART: Status dos Equipamentos -->
        <div style="grid-column: span 4; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); min-height: 380px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
          <div style="font-size:var(--text-sm); font-weight:800; color:var(--text-primary); margin-bottom:var(--space-4); text-transform:uppercase; letter-spacing:0.05em;">Saúde da Frota (Ao Vivo)</div>
          <div style="flex:1; position:relative; min-height:250px;">
            <canvas id="ch-status-pro"></canvas>
            <div style="position:absolute; top:50%; left:28%; transform:translate(-50%, -50%); text-align:center; pointer-events:none;">
              <div style="font-size:36px; font-weight:900; color:var(--text-primary); line-height:1;">${eqs.length}</div>
              <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em; margin-top:4px;">Total</div>
            </div>
          </div>
        </div>

        <!-- CHART: Timeline Anual -->
        <div style="grid-column: span 8; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); min-height: 380px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
          <div style="font-size:var(--text-sm); font-weight:800; color:var(--text-primary); margin-bottom:var(--space-4); text-transform:uppercase; letter-spacing:0.05em;">Projeção e Execução de Entregas (${new Date().getFullYear()})</div>
          <div style="flex:1; position:relative; min-height:250px;">
            <canvas id="ch-ano-pro"></canvas>
          </div>
        </div>

        <!-- CHART: Categoria -->
        <div style="grid-column: span 8; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); min-height: 360px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
          <div style="font-size:var(--text-sm); font-weight:800; color:var(--text-primary); margin-bottom:var(--space-4); text-transform:uppercase; letter-spacing:0.05em;">Entregas por Família de Equipamento</div>
          <div style="flex:1; position:relative; min-height:250px;">
            <canvas id="ch-cat-pro"></canvas>
          </div>
        </div>

        <!-- LIST: Top 5 Gargalos -->
        <div style="grid-column: span 4; background:var(--bg-card); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:var(--space-5); min-height: 360px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm);">
          <div style="font-size:var(--text-sm); font-weight:800; color:var(--color-danger); margin-bottom:var(--space-4); text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:8px;">
            <svg style="width:18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            Watchlist Crítica
          </div>
          <div style="overflow-y:auto; flex:1; padding-right:4px;">
            ${atrasadosList.length === 0 ? '<div style="text-align:center;color:var(--text-muted);margin-top:40px;font-style:italic;">Nenhum equipamento em atraso crítico.</div>' : ''}
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${atrasadosList.map(e => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg-base); border-radius:var(--radius-md); border-left:4px solid var(--color-danger);">
                  <div>
                    <div style="font-weight:800; color:var(--text-primary); font-size:14px;">${e.codigo}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${e.tipo || 'Equipamento'}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:800; color:var(--color-danger); font-size:16px;">${Math.round(e.pctAvanco || 0)}%</div>
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Avanço</div>
                  </div>
                </div>
              `).join('')}
            </div>
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
  function render() {
    const eqs = DB.equipment.list();
    const parts = DB.parts.getAll();
    const restrictions = DB.restrictions.getAll();
    const today = new Date().toISOString().slice(0,10);

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title">
          <div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75"/></svg></div>
          Gestão de Equipamentos
        </div>
        <button class="btn btn-primary" onclick="EquipmentModule.openCreate()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Novo Equipamento
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--space-4);" class="stagger">
        ${eqs.map(e => {
          const pct = e.pctAvanco || 0;
          const days = e.dataLiberacaoPlanejada ? daysBetween(today, e.dataLiberacaoPlanejada) : null;
          const daysClass = days === null ? 'ghost' : days < 0 ? 'danger' : days <= 3 ? 'warning' : 'success';
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
                <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-${daysClass})">${formatDate(e.dataLiberacaoPlanejada)} ${days!==null?`(${days<0?Math.abs(days)+' atrasado':days===0?'Hoje':days+'d'})`:''}</div>` : ''}
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
      <div class="form-row cols-3">
        <div class="form-group"><label>🔒 Data Planejada de Liberação ${eq ? '(BLOQUEADA)' : ''}</label><input type="date" id="eq-data-plan" value="${toDateInput(eq?.dataLiberacaoPlanejada)}" ${eq?'readonly style="opacity:.6;cursor:not-allowed;"':''} /></div>
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
        data.dataLiberacaoAtual = new Date().toISOString().slice(0, 10);
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

  return { render, openCreate, openEdit, openDetail, save, addReplanning, saveReplanning, confirmDelete, renderLaborComparison };
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

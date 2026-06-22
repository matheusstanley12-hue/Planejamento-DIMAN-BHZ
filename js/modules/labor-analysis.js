window.LaborAnalysisModule = (() => {
  let charts = {};
  
  function destroyCharts() { 
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} }); 
    charts = {}; 
  }

  function chartDefaults() {
    return {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 20, bottom: 10, left: 10, right: 10 } },
      interaction: { mode: 'index', intersect: false },
      plugins: { 
        legend: { position: 'top', align: 'end', labels: { color: '#64748B', font: { family: 'Inter', size: 11, weight: '600' }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 20 } },
        datalabels: {
          color: '#1E293B', font: { weight: '800', size: 11, family: 'Inter' }, anchor: 'end', align: 'top', offset: 4,
          formatter: (value) => (!value || value <= 0) ? '' : parseFloat(Number(value).toFixed(2))
        },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { family: 'Inter', size: 13 }, bodyFont: { family: 'Inter', size: 12 }, padding: 12, cornerRadius: 8, displayColors: true }
      },
      scales: {
        x: { ticks: { color: '#64748B', font: { size: 10, family: 'Inter' }, maxRotation: 45, minRotation: 45 }, grid: { display: false }, border: { display: false } },
        y: { grace: '30%', ticks: { color: '#94A3B8', font: { size: 10, family: 'Inter' }, padding: 10 }, grid: { color: '#F1F5F9', drawBorder: false }, border: { display: false }, beginAtZero: true }
      }
    };
  }

  function render() {
    destroyCharts();
    
    setTimeout(() => {
      try {
        const currentMonthPrefix = new Date().toISOString().slice(0, 7);
        const allTasks = DB.tasks.getAll();
        const disciplines = ['Mecânica','Caldeiraria','Elétrica','Usinagem','Pintor','Lavador','Montagem','Subconjunto','Teste','Retrabalho'];
        
        function discHours(disc, type) {
          const val = allTasks.filter(t=>t.disciplina===disc && ((t.createdAt && t.createdAt.startsWith(currentMonthPrefix)) || (t.dataFim && t.dataFim.startsWith(currentMonthPrefix)))).reduce((s,t)=>s+(parseFloat(t[type])||0),0);
          return Math.round(val * 10) / 10;
        }

        const c1 = document.getElementById('ch-disc-labor');
        if (c1) charts.disc = new Chart(c1, { type:'bar', data: {
          labels: disciplines,
          datasets: [
            { label:'Planejado', data: disciplines.map(d=>discHours(d,'horasPlanejadas')), backgroundColor:'rgba(148, 163, 184, 0.4)', hoverBackgroundColor:'rgba(148, 163, 184, 0.6)', borderRadius: 4, maxBarThickness: 24, borderSkipped: false },
            { label:'Realizado', data: disciplines.map(d=>discHours(d,'horasRealizadas')), backgroundColor:'rgba(16, 185, 129, 0.85)', hoverBackgroundColor:'rgba(16, 185, 129, 1)', borderRadius: 4, maxBarThickness: 24, borderSkipped: false }
          ]
        }, options: chartDefaults() });

        const ts = DB.timesheets.list().filter(t => t.data && t.data.startsWith(currentMonthPrefix) && (!t.tipo || t.tipo === 'Trabalho'));
        const moByDisc = {};
        ts.forEach(t => {
          const w = DB.workforce.get(t.workerId);
          if (w) moByDisc[w.disciplina] = (moByDisc[w.disciplina] || 0) + (t.horasTrabalhadas || 0);
        });
        const c4 = document.getElementById('ch-mo-labor');
        if (c4) charts.mo = new Chart(c4, { type:'bar', data: {
          labels: Object.keys(moByDisc),
          datasets: [{ label:'Horas', data: Object.values(moByDisc).map(v => parseFloat(Number(v).toFixed(2))), backgroundColor:'rgba(139, 92, 246, 0.85)', borderRadius: 4, maxBarThickness: 32, borderSkipped: false }]
        }, options: chartDefaults() });

      } catch(e) { console.warn('Chart.js error:', e); }

      try {
        if (window.EquipmentModule && window.EquipmentModule.renderLaborComparison) {
          window.EquipmentModule.renderLaborComparison('labor-comparison-container-tab');
        }
      } catch(e) { console.error('Labor comparison error:', e); }

    }, 100);

    return `
      <div class="page-container" style="animation: fadeIn 0.3s ease;">
        <div class="section-header">
          <div class="section-title">
            <div class="section-title-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
            </div>
            Análise por Mão de Obra
          </div>
          <div class="section-subtitle">Comparativo de Mão de Obra e Produtividade</div>
        </div>

        <div class="charts-grid" style="margin-bottom:var(--space-6);">
          <div class="chart-card">
            <div class="card-header"><div class="card-title">Planejado × Realizado por Disciplina</div></div>
            <canvas id="ch-disc-labor" height="320"></canvas>
          </div>
          <div class="chart-card">
            <div class="card-header"><div class="card-title">Consumo de Mão de Obra</div></div>
            <canvas id="ch-mo-labor" height="320"></canvas>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-6);">
          <div class="card-header">
            <div class="card-title">Análise de Produtividade (Ranking)</div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:normal;">Mecânicos que executaram a mesma tarefa</div>
          </div>
          <div id="labor-comparison-container-tab" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--space-4);">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>
    `;
  }

  return { render };
})();

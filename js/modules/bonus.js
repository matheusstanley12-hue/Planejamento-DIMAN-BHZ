/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Prêmio Produção
   ============================================================ */

window.BonusModule = (() => {
  let dateFilter = 'current_month';

  function getDates() {
    const now = new Date();
    let startDate = new Date('2000-01-01');
    let endDate = new Date('2100-01-01');
    if (dateFilter === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateFilter === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }
    return { startDate, endDate };
  }

  function getPeriodKey() {
    const { startDate } = getDates();
    return dateFilter === 'all' ? 'all' : startDate.toISOString().slice(0, 7);
  }

  function getMetrics() {
    try {
      return JSON.parse(localStorage.getItem('diman_bonus_metrics_v2') || '{}');
    } catch(e) { return {}; }
  }

  function saveMetrics(metrics) {
    localStorage.setItem('diman_bonus_metrics_v2', JSON.stringify(metrics));
    Router.navigate('bonus', { force: true });
  }

  window.updatePenalidade = function(workerId, field, val) {
    const period = getPeriodKey();
    const metrics = getMetrics();
    if (!metrics[period]) metrics[period] = { penalidades: {} };
    if (!metrics[period].penalidades[workerId]) metrics[period].penalidades[workerId] = { faltas: 0, atestados: 0, atrasos: 0 };
    
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 0) num = 0;
    metrics[period].penalidades[workerId][field] = num;
    saveMetrics(metrics);
  };

  function render() {
    const session = Auth.getSession();
    if (!session || !['Administrador', 'Gerente', 'Desenvolvedor', 'Encarregado', 'Supervisor'].includes(session.perfil)) {
      return `
        <div class="page-container" style="display:flex;justify-content:center;align-items:center;height:80vh;">
          <div class="card" style="padding:40px;text-align:center;max-width:400px;border-top:4px solid var(--color-danger);">
            <h2 style="color:var(--text-primary);margin-bottom:10px;">Acesso Negado</h2>
            <p style="color:var(--text-muted);">Apenas Administradores, Gerentes e Encarregados possuem permissão para visualizar o Prêmio de Produção.</p>
          </div>
        </div>
      `;
    }

    const { startDate, endDate } = getDates();
    const periodKey = getPeriodKey();
    const metrics = getMetrics();
    const periodMetrics = metrics[periodKey] || { penalidades: {} };

    // --- COLETIVO: Liberação de Equipamentos (50%) ---
    const allEqs = DB.equipment.list();
    const plannedEqs = allEqs.filter(e => {
       if (!e.liberacaoPlanejada) return false;
       const d = new Date(e.liberacaoPlanejada + 'T00:00:00');
       return d >= startDate && d <= endDate;
    });
    const releasedEqs = plannedEqs.filter(e => e.status === 'Liberado');
    let percLiberacao = 0;
    if (plannedEqs.length > 0) {
      percLiberacao = (releasedEqs.length / plannedEqs.length) * 50;
    } else {
      percLiberacao = 50;
    }

    // --- COLETIVO: Retrabalho (10%) ---
    const allTasks = DB.tasks.list();
    const tasksInPeriod = allTasks.filter(t => {
       const d = new Date(t.createdAt);
       return d >= startDate && d <= endDate;
    });
    const retrabalhoTasks = tasksInPeriod.filter(t => t.disciplina === 'Retrabalho').length;
    let percRetrabalho = Math.max(0, 10 - (retrabalhoTasks * 1));

    const coletivoBase = percLiberacao + percRetrabalho; // max 60%

    // Preparar Dados por Trabalhador
    const workerStats = {};
    const wfList = DB.workforce.list();
    const vList = window.DB && DB.vacations ? DB.vacations.list() : [];

    wfList.forEach(w => {
      let isFerias = false;
      if (w.feriasInicio && w.feriasFim) {
        if (new Date(w.feriasInicio + 'T00:00:00') <= endDate && new Date(w.feriasFim + 'T23:59:59') >= startDate) isFerias = true;
      }
      if (vList.some(v => v.workerId === w.id && new Date(v.startDate + 'T00:00:00') <= endDate && new Date(v.endDate + 'T23:59:59') >= startDate)) isFerias = true;
      if (w.status === 'Férias') isFerias = true;
      if (w.status !== 'Ativo' && !isFerias) return;

      workerStats[w.nome] = {
        id: w.id,
        nome: w.nome,
        isFerias: isFerias,
        tasksConcluidas: 0,
        tasksTotal: 0,
        horasPorDia: {}
      };
    });

    // O.S Finalizada & Atualização de Sistema
    const timesheets = DB.timesheets ? DB.timesheets.list() : [];
    
    tasksInPeriod.forEach(t => {
      if (t.responsavel && workerStats[t.responsavel]) {
        workerStats[t.responsavel].tasksTotal++;
        if (t.status === 'Concluída') workerStats[t.responsavel].tasksConcluidas++;
      }
    });

    timesheets.filter(t => new Date(t.data) >= startDate && new Date(t.data) <= endDate).forEach(t => {
      let w = wfList.find(x => x.id === t.workerId || x.nome === t.workerName);
      if (w && workerStats[w.nome] && (!t.tipo || t.tipo === 'Trabalho')) {
        if (!workerStats[w.nome].horasPorDia[t.data]) workerStats[w.nome].horasPorDia[t.data] = 0;
        workerStats[w.nome].horasPorDia[t.data] += parseFloat(t.horasTrabalhadas || 0);
      }
    });

    // Gerar Tabela HTML
    let tableHtml = '';
    const statsArray = Object.values(workerStats).sort((a,b) => a.nome.localeCompare(b.nome));

    statsArray.forEach(w => {
      if (w.isFerias) {
        tableHtml += `
          <tr style="border-bottom:1px solid var(--border-card); opacity:0.6;">
            <td style="padding:15px;font-weight:bold;">${w.nome}</td>
            <td colspan="5" style="text-align:center;padding:15px;color:var(--color-info);">Férias - Não contabilizado no Prêmio</td>
          </tr>`;
        return;
      }

      // --- INDIVIDUAL: Atualização no Sistema (30%) ---
      let diasPenalizados = 0;
      Object.keys(w.horasPorDia).forEach(data => {
        if (w.horasPorDia[data] < 8) {
          diasPenalizados++;
        }
      });
      let percAtualizacao = Math.max(0, 30 - (diasPenalizados * 2));

      // --- INDIVIDUAL: O.S Finalizada (10%) ---
      let percOS = 10;
      if (w.tasksTotal > 0) {
        percOS = (w.tasksConcluidas / w.tasksTotal) * 10;
      } else {
        percOS = 10; // default 10 se não teve tarefas
      }

      // --- PENALIDADES MANUAIS ---
      const pen = periodMetrics.penalidades[w.id] || { faltas: 0, atestados: 0, atrasos: 0 };
      
      const subtotal = coletivoBase + percAtualizacao + percOS; // Max 100
      
      let mult = 1.0;
      let penStatus = '';
      if (pen.faltas > 0) { mult = 0; penStatus = 'Falta (Zera)'; }
      else if (pen.atestados >= 2) { mult = 0; penStatus = '2+ Atestados (Zera)'; }
      else if (pen.atrasos >= 2) { mult = 0; penStatus = '2+ Atrasos (Zera)'; }
      else if (pen.atestados === 1 && pen.atrasos === 1) { mult = 0; penStatus = 'Atestado+Atraso (Zera)'; }
      else if (pen.atestados === 1) { mult = 0.5; penStatus = '1 Atestado (-50%)'; }
      else if (pen.atrasos === 1) { mult = 0.5; penStatus = '1 Atraso (-50%)'; }

      const totalPremio = subtotal * mult;
      let badgeColor = totalPremio >= 90 ? 'var(--color-success)' : (totalPremio >= 70 ? 'var(--brand-primary)' : 'var(--color-danger)');

      tableHtml += `
        <tr style="border-bottom:1px solid var(--border-card); transition:background 0.2s;">
          <td style="padding:15px;font-weight:bold;color:var(--text-primary);">${w.nome}</td>
          
          <td style="padding:15px;text-align:center;">
            <span style="display:block;font-size:16px;font-weight:bold;color:var(--text-primary);">${coletivoBase.toFixed(1)}%</span>
            <span style="font-size:10px;color:var(--text-muted);">de 60% Base</span>
          </td>
          
          <td style="padding:15px;text-align:center;">
            <span style="display:block;font-size:14px;color:${percAtualizacao===30?'var(--color-success)':'var(--color-warning)'}">${percAtualizacao.toFixed(1)}%</span>
            <span style="font-size:10px;color:var(--text-muted);">${diasPenalizados} dias com <8h lançadas</span>
          </td>
          
          <td style="padding:15px;text-align:center;">
            <span style="display:block;font-size:14px;color:${percOS===10?'var(--color-success)':'var(--color-warning)'}">${percOS.toFixed(1)}%</span>
            <span style="font-size:10px;color:var(--text-muted);">${w.tasksConcluidas}/${w.tasksTotal} Concluídas</span>
          </td>

          <td style="padding:15px;text-align:center;">
            <div style="display:flex;gap:4px;justify-content:center;">
               <div>
                 <span style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Faltas</span>
                 <input type="number" min="0" step="1" class="form-control" style="width:40px;text-align:center;padding:4px;font-size:12px;height:auto;" value="${pen.faltas}" onblur="window.updatePenalidade('${w.id}', 'faltas', this.value)">
               </div>
               <div>
                 <span style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Atestados</span>
                 <input type="number" min="0" step="1" class="form-control" style="width:40px;text-align:center;padding:4px;font-size:12px;height:auto;" value="${pen.atestados}" onblur="window.updatePenalidade('${w.id}', 'atestados', this.value)">
               </div>
               <div>
                 <span style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px;">Atrasos</span>
                 <input type="number" min="0" step="1" class="form-control" style="width:40px;text-align:center;padding:4px;font-size:12px;height:auto;" value="${pen.atrasos}" onblur="window.updatePenalidade('${w.id}', 'atrasos', this.value)">
               </div>
            </div>
          </td>

          <td style="padding:15px;text-align:center;">
            <div style="display:inline-block;padding:6px 12px;border-radius:20px;font-weight:900;font-size:14px;background:rgba(0,0,0,0.03);color:${badgeColor};border:1px solid ${badgeColor};">
              ${totalPremio.toFixed(1)}%
            </div>
            ${penStatus ? `<div style="font-size:10px;color:var(--color-danger);margin-top:4px;font-weight:bold;">${penStatus}</div>` : ''}
          </td>
        </tr>
      `;
    });

    if (statsArray.length === 0) {
      tableHtml = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">Nenhum funcionário ativo.</td></tr>`;
    }

    return `
      <div class="page-container" style="padding-bottom:100px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6);flex-wrap:wrap;gap:var(--space-4);">
          <div>
            <h2 style="margin:0;font-size:1.8rem;font-weight:900;color:var(--text-primary);">Prêmio Produção</h2>
            <p style="margin:0;font-size:var(--text-sm);color:var(--text-secondary);">Métricas Coletivas (60%) e Individuais (40%).</p>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <select class="form-control" style="width:200px;" onchange="BonusModule.setFilter(this.value)">
              <option value="current_month" ${dateFilter === 'current_month' ? 'selected' : ''}>Mês Atual</option>
              <option value="last_month" ${dateFilter === 'last_month' ? 'selected' : ''}>Mês Anterior</option>
              <option value="all" ${dateFilter === 'all' ? 'selected' : ''}>Todo o Período</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:var(--space-4);margin-bottom:var(--space-6);">
          <div class="card" style="padding:var(--space-4);text-align:center;">
            <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:bold;margin-bottom:4px;">Liberação de Equip. (50%)</div>
            <div style="font-size:24px;font-weight:900;color:var(--brand-primary);">${percLiberacao.toFixed(1)}%</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">${releasedEqs.length} de ${plannedEqs.length} liberados no prazo planejado.</div>
          </div>
          <div class="card" style="padding:var(--space-4);text-align:center;">
            <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:bold;margin-bottom:4px;">Índice de Retrabalho (10%)</div>
            <div style="font-size:24px;font-weight:900;color:${percRetrabalho<10?'var(--color-danger)':'var(--color-success)'};">${percRetrabalho.toFixed(1)}%</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">${retrabalhoTasks} tarefas de retrabalho registradas.</div>
          </div>
          <div class="card" style="padding:var(--space-4);text-align:center;">
            <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:bold;margin-bottom:4px;">Base Coletiva Adquirida</div>
            <div style="font-size:24px;font-weight:900;color:var(--text-primary);">${coletivoBase.toFixed(1)}%</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">De 60% possíveis.</div>
          </div>
        </div>

        <div class="card" style="overflow:hidden;">
          <div class="table-responsive">
            <table class="table" style="width:100%;border-collapse:collapse;">
              <thead style="background:var(--bg-base);border-bottom:2px solid var(--border-card);">
                <tr>
                  <th style="padding:15px;text-align:left;color:var(--text-muted);font-size:12px;text-transform:uppercase;">Executante</th>
                  <th style="padding:15px;text-align:center;color:var(--text-muted);font-size:12px;text-transform:uppercase;" title="Liberação + Retrabalho">Coletivo (60%)</th>
                  <th style="padding:15px;text-align:center;color:var(--text-muted);font-size:12px;text-transform:uppercase;" title="Dias com mínimo de 8h lançadas">Atualização (30%)</th>
                  <th style="padding:15px;text-align:center;color:var(--text-muted);font-size:12px;text-transform:uppercase;" title="Tarefas Concluídas">O.S Finalizada (10%)</th>
                  <th style="padding:15px;text-align:center;color:var(--text-muted);font-size:12px;text-transform:uppercase;">Penalidades</th>
                  <th style="padding:15px;text-align:center;color:var(--text-primary);font-size:12px;text-transform:uppercase;">Total Prêmio</th>
                </tr>
              </thead>
              <tbody>
                ${tableHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function setFilter(val) {
    dateFilter = val;
    Router.navigate('bonus', { force: true });
  }

  return { render, setFilter };
})();

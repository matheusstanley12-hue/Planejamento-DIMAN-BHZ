/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Module: Workforce Time Dashboard
   ============================================================ */

window.WorkforceTimeModule = (() => {
  let activeTab = 'aovivo'; // aovivo | historico

  function formatTimeDiff(isoStart) {
    if (!isoStart) return '00:00:00';
    const s = new Date(isoStart);
    const n = new Date();
    const diff = Math.floor((n - s) / 1000); // seconds
    if (diff < 0) return '00:00:00';
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function render() {
    const session = Auth.getSession();
    if (!session || !Auth.hasPermission('workforce')) {
      return `<div class="page-container"><div class="empty-state"><h3>Acesso Restrito</h3></div></div>`;
    }

    let workers = DB.workforce.list();
    if (typeof AttendanceModule !== 'undefined' && AttendanceModule.isEmFerias) {
      workers = workers.filter(w => !AttendanceModule.isEmFerias(w));
    } else {
      workers = workers.filter(w => w.status !== 'Férias');
    }
    const tasks = DB.tasks.getAll();
    const timesheets = DB.timesheets ? DB.timesheets.list() : [];

    let filteredTasks = tasks;

    // Calculate live metrics
    let trabalhandoCount = 0;
    let pausaCount = 0;
    let ociosoCount = 0;

    workers.forEach(w => {
      if (w.currentState === 'Trabalhando') {
        trabalhandoCount++;
      } else if (w.currentState === 'Em Pausa') {
        pausaCount++;
      } else {
        ociosoCount++;
      }
    });

    let faltaDePecaCount = filteredTasks.filter(t => t.status === 'Aguardando Peça').length;

    const totalWorkers = workers.length;

    // Build the Header
    const headerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-4);">
        <div>
          <h2 style="margin:0;font-size:1.5rem;font-weight:900;color:var(--text-primary);">Gestão de Horas Trabalhadas</h2>
          <p style="margin:0;font-size:var(--text-sm);color:var(--text-secondary);">Acompanhamento em tempo real dos executantes.</p>
        </div>
        
        <div style="display:flex;gap:var(--space-2);background:var(--bg-card);border:1px solid var(--border-card);padding:4px;border-radius:var(--radius-full);">
          <button class="btn ${activeTab === 'aovivo' ? 'btn-primary' : 'btn-ghost'}" onclick="WorkforceTimeModule.setTab('aovivo')" style="border-radius:var(--radius-full);font-size:12px;padding:6px 16px;">Ao Vivo</button>
          <button class="btn ${activeTab === 'historico' ? 'btn-primary' : 'btn-ghost'}" onclick="WorkforceTimeModule.setTab('historico')" style="border-radius:var(--radius-full);font-size:12px;padding:6px 16px;">Dashboard & Histórico</button>
        </div>
      </div>
    `;

    // Tab Content
    let contentHtml = '';

    if (activeTab === 'aovivo') {
      // Live Grid
      
      // We will group workers by Setor (disciplina)
      const grouped = {};
      workers.forEach(w => {
        const d = w.disciplina || 'Sem Setor';
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(w);
      });

      let gridHtml = '';
      Object.keys(grouped).sort().forEach(disc => {
        gridHtml += `
          <h3 style="margin-top:var(--space-5);margin-bottom:var(--space-3);color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border-card);padding-bottom:5px;">
            SETOR: ${disc}
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4);">
        `;

        grouped[disc].sort((a,b) => {
          const order = { 'Trabalhando':1, 'Em Pausa':2, 'Ocioso':3 };
          return (order[a.currentState||'Ocioso']) - (order[b.currentState||'Ocioso']);
        }).forEach(w => {
          let isFerias = false;
          if (typeof AttendanceModule !== 'undefined' && AttendanceModule.isEmFerias) {
            isFerias = AttendanceModule.isEmFerias(w);
          }
          
          let state = w.currentState || 'Ocioso';
          if (isFerias) state = 'Férias';
          
          let stateColor = 'var(--text-muted)';
          let stateBg = 'var(--bg-base)';
          let icon = '';
          let timerHtml = '';
          let detailsHtml = '';

          if (state === 'Trabalhando') {
            stateColor = 'var(--color-success)';
            stateBg = 'var(--color-success-bg)';
            icon = '▶';
            const t = tasks.find(x => x.id === w.currentTaskId);
            timerHtml = `<div class="live-timer-wft" data-start="${w.currentActionStartTime}" style="font-family:monospace;font-size:16px;font-weight:bold;margin-top:5px;color:${stateColor}">${formatTimeDiff(w.currentActionStartTime)}</div>`;
            detailsHtml = `<div style="font-size:12px;color:var(--text-secondary);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${t ? t.descricao : ''}">${t ? t.descricao : '—'}</div>`;
          } else if (state === 'Em Pausa') {
            stateColor = 'var(--color-warning)';
            stateBg = 'var(--color-warning-bg)';
            icon = '⏸';
            timerHtml = `<div class="live-timer-wft" data-start="${w.currentActionStartTime}" style="font-family:monospace;font-size:16px;font-weight:bold;margin-top:5px;color:${stateColor}">${formatTimeDiff(w.currentActionStartTime)}</div>`;
            detailsHtml = `<div style="font-size:12px;color:var(--text-secondary);margin-top:5px;">Motivo: <strong>${w.currentPauseReason}</strong></div>`;
          } else if (state === 'Férias') {
            stateColor = 'var(--color-info)';
            stateBg = 'var(--color-info-bg)';
            icon = '🌴';
            timerHtml = `<div style="font-family:monospace;font-size:16px;font-weight:bold;margin-top:5px;color:${stateColor}">--:--:--</div>`;
            detailsHtml = `<div style="font-size:12px;color:var(--text-muted);margin-top:5px;">Aproveitando o descanso</div>`;
          } else {
            icon = '⏹';
            timerHtml = `<div style="font-family:monospace;font-size:16px;font-weight:bold;margin-top:5px;color:var(--text-muted)">00:00:00</div>`;
            detailsHtml = `<div style="font-size:12px;color:var(--text-muted);margin-top:5px;">Aguardando atividade</div>`;
          }

          gridHtml += `
            <div class="card" style="padding:var(--space-4);background:var(--bg-card);border:1px solid ${stateColor};border-radius:var(--radius-lg);position:relative;overflow:hidden;">
              <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${stateColor};"></div>
              
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                  <div style="font-size:14px;font-weight:bold;color:var(--text-primary);">${w.nome.split(' ').slice(0,2).join(' ')}</div>
                  <div style="font-size:10px;color:var(--text-muted);">${w.matricula || ''}</div>
                </div>
                <div style="background:${stateBg};color:${stateColor};padding:4px 8px;border-radius:4px;font-size:10px;font-weight:bold;display:flex;align-items:center;gap:4px;">
                  ${icon} ${state.toUpperCase()}
                </div>
              </div>

              ${timerHtml}
              ${detailsHtml}
            </div>
          `;
        });

        gridHtml += `</div>`;
      });

      contentHtml = `
        <div style="display:flex;gap:var(--space-4);margin-top:var(--space-4);flex-wrap:wrap;">
          <div style="flex:1;min-width:180px;background:#fff;border:1px solid #f1f5f9;border-radius:16px;padding:var(--space-4);text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:11px;font-weight:800;color:var(--text-muted);letter-spacing:0.5px;">TOTAL EXECUTANTES</div>
            <div style="font-size:2rem;font-weight:900;color:var(--text-primary);margin-top:4px;">${totalWorkers}</div>
          </div>
          <div style="flex:1;min-width:180px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:var(--space-4);text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:11px;font-weight:800;color:#166534;letter-spacing:0.5px;">TRABALHANDO AGORA</div>
            <div style="font-size:2rem;font-weight:900;color:#15803d;margin-top:4px;">${trabalhandoCount}</div>
          </div>
          <div style="flex:1;min-width:180px;background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:var(--space-4);text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:11px;font-weight:800;color:#b45309;letter-spacing:0.5px;">EM PAUSA</div>
            <div style="font-size:2rem;font-weight:900;color:#d97706;margin-top:4px;">${pausaCount}</div>
          </div>
          <div style="flex:1;min-width:180px;background:#fef2f2;border:1px solid #fecaca;border-radius:16px;padding:var(--space-4);text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:11px;font-weight:800;color:#b91c1c;letter-spacing:0.5px;">FALTA DE PEÇA</div>
            <div style="font-size:2rem;font-weight:900;color:#ef4444;margin-top:4px;">${faltaDePecaCount}</div>
          </div>
          <div style="flex:1;min-width:180px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:var(--space-4);text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size:11px;font-weight:800;color:var(--text-secondary);letter-spacing:0.5px;">OCIOSOS</div>
            <div style="font-size:2rem;font-weight:900;color:var(--text-muted);margin-top:4px;">${ociosoCount}</div>
          </div>
        </div>

        ${gridHtml}
      `;

      // Start the interval if not running
      if (!window.wftTimerInterval) {
        window.wftTimerInterval = setInterval(() => {
          document.querySelectorAll('.live-timer-wft').forEach(el => {
            const start = el.getAttribute('data-start');
            if (start) el.innerText = formatTimeDiff(start);
          });
        }, 1000);
      }

    } else if (activeTab === 'historico') {
      if (window.wftTimerInterval) {
        clearInterval(window.wftTimerInterval);
        window.wftTimerInterval = null;
      }

      // Analyze timesheets
      const today = new Date().toISOString().slice(0, 10);
      const todayTimesheets = timesheets.filter(t => t.data === today);

      let hrsTrabalhadasHoje = 0;
      let hrsPausaHoje = 0;
      const pauseReasons = {};

      todayTimesheets.forEach(t => {
        if (t.tipo === 'Trabalho') {
          hrsTrabalhadasHoje += (t.horasTrabalhadas || 0);
        } else if (t.tipo === 'Pausa') {
          hrsPausaHoje += (t.horasTrabalhadas || 0);
          const m = t.motivoPausa || 'Outros';
          pauseReasons[m] = (pauseReasons[m] || 0) + (t.horasTrabalhadas || 0);
        }
      });

      let tbody = '';
      todayTimesheets.sort((a,b) => b.horaInicio.localeCompare(a.horaInicio)).forEach(t => {
        const eq = DB.equipment.get(t.equipmentId);
        const task = DB.tasks.get(t.taskId);
        
        tbody += `
          <tr>
            <td>${t.workerNome}</td>
            <td>
              <span class="badge ${t.tipo === 'Trabalho' ? 'badge-success' : 'badge-warning'}">
                ${t.tipo}
              </span>
            </td>
            <td>${new Date(t.horaInicio).toLocaleTimeString('pt-BR')} → ${new Date(t.horaFim).toLocaleTimeString('pt-BR')}</td>
            <td><strong>${(t.horasTrabalhadas || 0).toFixed(2)}h</strong></td>
            <td>${t.tipo === 'Pausa' ? t.motivoPausa : (task ? task.descricao : '')}</td>
          </tr>
        `;
      });

      contentHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-6);">
          <div class="card" style="padding:var(--space-5);">
            <h3 style="margin:0 0 15px 0;font-size:14px;color:var(--text-primary);">Resumo de Horas - Hoje</h3>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:36px;font-weight:900;color:var(--brand-primary);">${hrsTrabalhadasHoje.toFixed(1)}h</div>
                <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;">Horas Trabalhadas</div>
              </div>
              <div style="width:1px;height:50px;background:var(--border-card);"></div>
              <div>
                <div style="font-size:36px;font-weight:900;color:var(--color-warning);">${hrsPausaHoje.toFixed(1)}h</div>
                <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;">Horas em Pausa</div>
              </div>
            </div>
          </div>
          
          <div class="card" style="padding:var(--space-5);">
             <h3 style="margin:0 0 15px 0;font-size:14px;color:var(--text-primary);">Principais Motivos de Pausa</h3>
             ${Object.keys(pauseReasons).length > 0 ? 
               Object.keys(pauseReasons).map(r => `
                 <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px;">
                   <span>${r}</span>
                   <strong>${pauseReasons[r].toFixed(1)}h</strong>
                 </div>
                 <div class="progress-track" style="margin-bottom:10px;"><div class="progress-fill warning" style="width:${(pauseReasons[r]/hrsPausaHoje)*100}%"></div></div>
               `).join('') 
               : '<p style="color:var(--text-muted);font-size:12px;">Nenhuma pausa registrada hoje.</p>'
             }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Histórico de Lançamentos (Hoje)</h3>
          </div>
          <div class="table-responsive">
            <table class="table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Executante</th>
                  <th>Tipo</th>
                  <th>Período</th>
                  <th>Duração</th>
                  <th>Detalhe / Motivo</th>
                </tr>
              </thead>
              <tbody>
                ${tbody || '<tr><td colspan="5" style="text-align:center;">Nenhum registro encontrado.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return `
      <div class="page-container" style="padding-bottom:100px;">
        ${headerHtml}
        ${contentHtml}
      </div>
    `;
  }

  function setTab(tab) {
    activeTab = tab;
    render();
    Router.navigate('workforce-time', { force: true });
  }

  return {
    render,
    setTab
  };
})();

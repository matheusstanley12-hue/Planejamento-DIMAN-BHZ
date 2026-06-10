window.QrViewModule = (() => {
  function render(id) {
    const eq = DB.equipment.get(id);
    if (!eq) return `<div style="text-align:center;padding:50px;color:white;">Equipamento não encontrado.</div>`;

    const pct = eq.pctAvanco || 0;
    const progressColor = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
    
    // Status colors
    const statusColors = {
      'Em Manutenção': 'var(--brand-primary-light)',
      'Aguardando Manutenção': 'var(--color-warning)',
      'Liberado': 'var(--color-success)',
      'Bloqueado': 'var(--color-danger)',
    };
    const sColor = statusColors[eq.status] || 'var(--text-secondary)';

    // Gather data
    const allTasks = DB.tasks.getAll().filter(t => t.equipmentId === id);
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysTasks = allTasks.filter(t => {
      if(t.status === 'Concluída') return false;
      if(t.dataPlanejadaInicio <= todayStr && t.dataPlanejadaTermino >= todayStr) return true;
      if(t.dataRealInicio && !t.dataRealTermino) return true;
      return false;
    });

    const workforce = [];
    todaysTasks.forEach(t => {
       if (t.responsavel) {
          if (!workforce.find(w => w.nome === t.responsavel)) {
             workforce.push({ nome: t.responsavel, disciplina: t.disciplina || 'Geral' });
          }
       }
    });

    const checklists = JSON.parse(localStorage.getItem('diman_checklists')||'[]').filter(c => c.equipmentId === id);
    const recebimento = checklists.find(c => c.tipo === 'Recebimento');
    const devolucao = checklists.find(c => c.tipo === 'Devolução');

    const restrictions = DB.restrictions.getAll().filter(r => r.equipmentId === id && r.status === 'Aberta');

    return `
      <style>
        .qr-layout { min-height: 100vh; background: linear-gradient(145deg, #090e17 0%, #111827 100%); color: white; padding: 20px; font-family: var(--font-sans); }
        .qr-container { max-width: 800px; margin: 0 auto; animation: fadeIn 0.5s ease-out; }
        .qr-header { text-align: center; margin-bottom: 40px; position: relative; }
        .qr-header::after { content:''; position:absolute; bottom:-15px; left:50%; transform:translateX(-50%); width:60px; height:4px; background:var(--brand-primary); border-radius:2px; }
        .qr-logo { font-size: 0.8rem; letter-spacing: 2px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; font-weight: 700; }
        .qr-title { font-size: 3rem; font-weight: 900; margin: 0; letter-spacing: -0.05em; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .qr-subtitle { font-size: 1.2rem; color: var(--text-secondary); margin-top: 5px; font-weight: 300; }
        
        .qr-card { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        
        .qr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .qr-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        
        .qr-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px; font-weight: 600; }
        .qr-value { font-size: 1.1rem; font-weight: 700; color: white; }
        
        .qr-progress-wrap { margin-top: 20px; }
        .qr-progress-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
        .qr-progress-val { font-size: 3rem; font-weight: 900; line-height: 1; color: ${progressColor}; font-family: var(--font-mono); text-shadow: 0 0 20px ${progressColor}40; }
        .qr-track { height: 16px; background: rgba(0,0,0,0.3); border-radius: 8px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
        .qr-fill { height: 100%; background: linear-gradient(90deg, ${progressColor}80, ${progressColor}); border-radius: 8px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
        .qr-fill::after { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transform: translateX(-100%); animation: shimmer 2s infinite; }
        
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        
        .qr-badge { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; background: ${sColor}20; color: ${sColor}; border: 1px solid ${sColor}40; box-shadow: 0 0 15px ${sColor}20; }
        
        .qr-list { list-style: none; padding: 0; margin: 0; }
        .qr-list-item { padding: 15px; background: rgba(15, 23, 42, 0.4); border-radius: 12px; margin-bottom: 10px; border-left: 4px solid var(--border-card); transition: transform 0.2s; }
        .qr-list-item:hover { transform: translateX(5px); background: rgba(15, 23, 42, 0.8); }
        
        .qr-tag { font-size: 0.7rem; padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,0.1); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        
        .qr-check-status { display: flex; align-items: center; gap: 10px; font-weight: 600; }
        .qr-check-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .qr-check-ok { background: rgba(0, 200, 83, 0.2); color: var(--color-success); }
        .qr-check-pend { background: rgba(244, 67, 54, 0.2); color: var(--color-danger); }
        .qr-check-none { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); }
        
        @media(max-width: 600px) {
          .qr-grid-2 { grid-template-columns: 1fr; }
        }
      </style>

      <div class="qr-layout">
        <div class="qr-container">
          
          <div class="qr-header">
            <div class="qr-logo">Diman-BHZ • Tempo Real • ${formatDate(todayStr)}</div>
            <h1 class="qr-title">${eq.codigo}</h1>
            <div class="qr-subtitle">${eq.nome}</div>
            <div style="margin-top: 25px;">
              <span class="qr-badge">${eq.status}</span>
            </div>
          </div>

          <!-- SECTION: PROGRESS & MAIN INFO -->
          <div class="qr-card">
            <div class="qr-grid-2">
              <div>
                <div class="qr-label">Cliente</div>
                <div class="qr-value">${eq.cliente || '—'}</div>
              </div>
              <div style="text-align: left;">
                <div class="qr-label">Ordem de Serviço (O.S.)</div>
                <div class="qr-value" style="color: var(--brand-primary-light); font-family: var(--font-mono);">${eq.os || '—'}</div>
              </div>
            </div>
            
            <div class="qr-progress-wrap">
              <div class="qr-progress-header">
                <div class="qr-label" style="margin:0;">Avanço Físico Geral</div>
                <div class="qr-progress-val">${pct}%</div>
              </div>
              <div class="qr-track">
                <div class="qr-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          </div>

          <!-- SECTION: DATES & CHECKLISTS -->
          <div class="qr-grid-2" style="margin-bottom: 20px;">
            <div class="qr-card" style="margin-bottom: 0;">
              <div style="display:flex; flex-direction:column; gap:20px;">
                <div>
                  <div class="qr-label"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;display:inline;vertical-align:middle;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg> Chegada na Oficina</div>
                  <div class="qr-value">${eq.dataEntrada ? formatDate(eq.dataEntrada) : '—'}</div>
                </div>
                <div>
                  <div class="qr-label"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;display:inline;vertical-align:middle;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg> Data de Liberação Planejada</div>
                  <div class="qr-value" style="color:var(--brand-primary-light);">${eq.dataLiberacaoPlanejada ? formatDate(eq.dataLiberacaoPlanejada) : '—'}</div>
                </div>
              </div>
            </div>
            
            <div class="qr-card" style="margin-bottom: 0;">
              <div class="qr-label" style="margin-bottom: 15px;">Status dos Check-lists</div>
              <div style="display:flex; flex-direction:column; gap:15px;">
                <div class="qr-check-status">
                  <div class="qr-check-icon ${recebimento?.status === 'Concluído' ? 'qr-check-ok' : (recebimento ? 'qr-check-pend' : 'qr-check-none')}">
                    ${recebimento?.status === 'Concluído' ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'}
                  </div>
                  <div>
                    <div style="font-size:0.9rem;">Recebimento</div>
                    <div style="font-size:0.75rem; font-weight:400; color:var(--text-muted);">${recebimento ? recebimento.status : 'Não Iniciado / Não Cadastrado'}</div>
                  </div>
                </div>
                <div class="qr-check-status">
                  <div class="qr-check-icon ${devolucao?.status === 'Concluído' ? 'qr-check-ok' : (devolucao ? 'qr-check-pend' : 'qr-check-none')}">
                    ${devolucao?.status === 'Concluído' ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'}
                  </div>
                  <div>
                    <div style="font-size:0.9rem;">Devolução</div>
                    <div style="font-size:0.75rem; font-weight:400; color:var(--text-muted);">${devolucao ? devolucao.status : 'Não Iniciado / Não Cadastrado'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION: TASKS FOR TODAY -->
          <div class="qr-card">
            <div class="qr-label" style="margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
              Tarefas Planejadas para Hoje (${todaysTasks.length})
            </div>
            ${todaysTasks.length > 0 ? `
              <ul class="qr-list">
                ${todaysTasks.map(t => {
                  const bColor = t.critico ? 'var(--color-danger)' : 'var(--brand-primary)';
                  return `
                  <li class="qr-list-item" style="border-left-color: ${bColor};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <div style="font-weight:700; font-size:1rem;">${t.descricao}</div>
                      ${t.critico ? `<span class="qr-tag" style="background:rgba(244,67,54,0.2);color:var(--color-danger);">Crítica</span>` : ''}
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                      <span class="qr-tag">${t.disciplina || 'Mecânica'}</span>
                      <span style="font-size:0.8rem; color:var(--text-muted);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;display:inline;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>${t.responsavel || 'Não definido'}</span>
                    </div>
                  </li>
                  `;
                }).join('')}
              </ul>
            ` : `<div style="text-align:center; color:var(--text-muted); padding: 20px 0;">Nenhuma tarefa ativa planejada para hoje.</div>`}
          </div>

          <!-- SECTION: WORKFORCE ASSIGNED -->
          <div class="qr-card">
            <div class="qr-label" style="margin-bottom:15px;">Mão de Obra Alocada (Setores)</div>
            ${workforce.length > 0 ? `
              <div style="display:flex; flex-wrap:wrap; gap:10px;">
                ${workforce.map(w => `
                  <div style="background:rgba(255,255,255,0.05); padding:8px 15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; gap:8px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:var(--brand-primary);"></div>
                    <div>
                      <div style="font-size:0.9rem; font-weight:700;">${w.nome}</div>
                      <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">${w.disciplina}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<div style="text-align:center; color:var(--text-muted); padding: 10px 0;">Nenhum funcionário alocado nas tarefas de hoje.</div>`}
          </div>

          <!-- SECTION: OFFENDERS (RESTRICTIONS) -->
          ${restrictions.length > 0 ? `
            <div class="qr-card" style="border-left: 4px solid var(--color-danger); background: linear-gradient(90deg, rgba(244,67,54,0.1) 0%, rgba(30,41,59,0.6) 100%);">
              <div class="qr-label" style="color:var(--color-danger); margin-bottom:15px; display:flex; align-items:center; gap:5px;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Principais Ofensores (Restrições Ativas)
              </div>
              <ul class="qr-list">
                ${restrictions.map(r => `
                  <li class="qr-list-item" style="border-left:none; background:rgba(0,0,0,0.3); padding:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                      <div style="font-weight:700; font-size:0.95rem;">${r.tipo}</div>
                      <span class="qr-tag" style="background:rgba(255,255,255,0.05);">${formatDate(r.dataIdentificacao)}</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">${r.descricao}</div>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : `
            <div class="qr-card" style="text-align:center; border: 1px dashed rgba(0,200,83,0.3);">
              <div style="color:var(--color-success); font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Nenhum ofensor ativo (Equipamento liberado para trabalhar sem restrições)
              </div>
            </div>
          `}

          <div style="text-align:center; color:var(--text-muted); font-size:0.8rem; margin-top:30px; opacity: 0.5;">
            DIMAN-BHZ &copy; ${new Date().getFullYear()} • Powered by Planejamento Geosol
          </div>

        </div>
      </div>
    `;
  }
  return { render };
})();

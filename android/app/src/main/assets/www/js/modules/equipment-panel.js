window.EquipmentPanel = (() => {
  let currentEqId = null;
  let editingTaskId = null;
  let expandedTaskId = null; // store the ID of the expanded task
  let openAccordions = {
    'resumo': true
  };

  function formatCommentDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatCommentDateOnly(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  }

  function renderComments(observacoesText, taskId) {
    let comments = [];
    if (observacoesText) {
      try {
        comments = JSON.parse(observacoesText);
        if (!Array.isArray(comments)) {
          comments = [{ id: 'legacy', text: observacoesText, user: 'Observação Anterior', createdAt: new Date().toISOString() }];
        }
      } catch (e) {
        comments = [{ id: 'legacy', text: observacoesText, user: 'Observação Anterior', createdAt: new Date().toISOString() }];
      }
    }

    if (comments.length === 0) {
      return `<div style="color:var(--text-muted);font-style:italic;font-size:11px;padding:var(--space-2) 0;">Nenhum comentário.</div>`;
    }

    const session = window.Auth.getSession();
    const currentUserId = session ? session.userId : 'anonymous';

    return comments.map(c => {
      const isAuthor = c.userId === currentUserId || (c.id === 'legacy' && (session?.perfil === 'Administrador' || session?.perfil === 'Desenvolvedor'));
      const formattedDate = formatCommentDate(c.createdAt);
      const isEdited = !!c.updatedAt;
      const editedInfo = isEdited ? ` <span style="font-size:9px;color:var(--text-muted);font-style:italic;" title="Editado em ${formatCommentDate(c.updatedAt)}">(editado em ${formatCommentDateOnly(c.updatedAt)})</span>` : '';

      return `
        <div id="comment-item-${taskId}-${c.id}" style="margin-bottom:var(--space-2);padding-bottom:var(--space-2);border-bottom:1px solid rgba(255,255,255,0.03);font-size:11px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
            <span style="font-weight:700;color:var(--brand-primary-light);">${c.user}</span>
            <span style="font-size:9px;color:var(--text-muted);">${formattedDate}</span>
          </div>
          <div id="comment-text-container-${taskId}-${c.id}" style="color:var(--text-secondary);white-space:pre-wrap;word-break:break-word;">
            ${c.text}${editedInfo}
          </div>
          ${isAuthor ? `
            <div style="display:flex;gap:8px;margin-top:2px;font-size:10px;">
              <a href="javascript:void(0)" onclick="window.EquipmentPanel.editComment('${taskId}', '${c.id}')" style="color:var(--brand-primary-light);text-decoration:none;">Editar</a>
              <a href="javascript:void(0)" onclick="window.EquipmentPanel.deleteComment('${taskId}', '${c.id}', '${currentEqId}')" style="color:var(--color-danger);text-decoration:none;">Excluir</a>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
  const AppIcons = {
    'calendar-days': '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"/>',
    'squares-2x2': '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>',
    'wrench-screwdriver': '<path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>',
    'clipboard-list': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
    'chart-bar': '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>',
    'exclamation-triangle': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>',
    'calendar': '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>',
    'cube': '<path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>',
    'users': '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>',
    'clock': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    'document-report': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
  };

  function render(params) {
    if (!params || !params.id) {
      return `<div class="page-container"><div class="alert alert-danger"><div class="alert-content">Nenhum equipamento selecionado.</div></div></div>`;
    }
    
    if (currentEqId !== params.id) {
      openAccordions = {
        'resumo': true
      };
    }
    
    currentEqId = params.id;
    const eq = DB.equipment.get(currentEqId);
    if (!eq) {
      return `<div class="page-container"><div class="alert alert-danger"><div class="alert-content">Equipamento não encontrado.</div></div></div>`;
    }

    const tasks = DB.tasks.getByEquipment(eq.id);
    const parts = DB.parts.list(eq.id);
    const restrictions = DB.restrictions.getAll().filter(r => r.equipmentId === eq.id);
    const today = new Date().toISOString().slice(0,10);

    const dtPlan = eq.dataLiberacaoPlanejada;
    const dtPrev = eq.dataLiberacaoAtual || dtPlan;
    const desvio = dtPlan && dtPrev ? daysBetween(dtPlan, dtPrev) : 0;
    const replanCount = (eq.replanning || []).length;
    const pendingParts = parts.filter(p => ['Solicitada','Comprada','Em Transporte'].includes(p.status)).length;
    const openRestr = restrictions.filter(r => r.status === 'Aberta').length;

    // Calculando probabilidade de atraso baseada em desvio, restricoes e avanço
    let probAtraso = 'BAIXA';
    let probClass = 'success';
    if (desvio > 0 || openRestr > 2) { probAtraso = 'ALTA'; probClass = 'danger'; }
    else if (openRestr > 0 || pendingParts > 0 || (eq.pctAvanco < 50 && daysBetween(today, dtPrev) < 5)) { probAtraso = 'MÉDIA'; probClass = 'warning'; }

    // Helpers
    const hPlan = tasks.reduce((s,t) => s + (t.horasPlanejadas||0), 0);
    const hReal = tasks.reduce((s,t) => s + (t.horasRealizadas||0), 0);
    const adherencia = tasks.length > 0 ? Math.round((tasks.filter(t=>t.status==='Concluída').length / tasks.length) * 100) : 0;

    return `
      <div style="max-width:100%;padding:var(--space-6);">
        <!-- Breadcrumb & Back -->
        <div style="margin-bottom:var(--space-4);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);">
          <button class="btn btn-ghost" onclick="Router.navigate('home')" style="padding:var(--space-2);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
            Voltar para Oficina
          </button>
          <div style="display:flex;gap:var(--space-2);">
            ${window.Auth && Auth.getSession()?.perfil === 'Administrador' ? `
              <button class="btn btn-ghost btn-sm" onclick="try{window.EquipmentPanel.deleteEquipment()}catch(e){alert(e.message)}" style="color:var(--color-danger);border:1px solid transparent;" title="Excluir Equipamento permanentemente" onmouseover="this.style.borderColor='var(--color-danger)'" onmouseout="this.style.borderColor='transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                Excluir Equipamento
              </button>
            ` : ''}
            <button class="btn btn-primary btn-sm" onclick="TasksModule.openCreate()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Adicionar Atividade
            </button>
            <button class="btn btn-outline btn-sm" onclick="EquipmentPanel.exportTasksCSV()" style="border-color:var(--border-default);color:var(--text-secondary);background:var(--bg-card);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Baixar Todas as Tarefas
            </button>
          </div>
        </div>

        <!-- Super Cabeçalho -->
        <div class="card" style="margin-bottom:var(--space-6);padding:0;overflow:hidden;border:1px solid var(--border-hover);">
          <div style="background:linear-gradient(90deg, var(--bg-card) 0%, rgba(21,101,192,0.1) 100%);padding:var(--space-5);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="font-size:2rem;font-weight:900;letter-spacing:-0.03em;color:var(--text-primary);line-height:1;">${eq.codigo}</div>
                <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-1);">${eq.nome} · Cliente: <strong style="color:var(--text-secondary)">${eq.cliente || '—'}</strong> · O.S.: <strong style="color:var(--text-secondary)">${eq.os || '—'}</strong></div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:3rem;font-weight:900;color:var(--brand-primary-light);line-height:1;">${eq.pctAvanco||0}%</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;">Avanço Físico Geral</div>
              </div>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:var(--space-4);margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid rgba(255,255,255,0.05);">
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Data Planejada</div>
                <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${dtPlan ? formatDate(dtPlan) : '—'}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Prevista Atual</div>
                <div style="font-size:1.1rem;font-weight:700;color:var(--brand-primary-light);">${dtPrev ? formatDate(dtPrev) : '—'}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Desvio</div>
                <div style="font-size:1.1rem;font-weight:700;color:var(--color-${desvio>0?'danger':desvio<0?'success':'text-secondary'});">${desvio>0?'+':''}${desvio} dias</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Reprogramações</div>
                <div style="font-size:1.1rem;font-weight:700;color:${replanCount>0?'var(--color-warning)':'var(--text-primary)'};">${replanCount}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Restrições Abertas</div>
                <div style="font-size:1.1rem;font-weight:700;color:${openRestr>0?'var(--color-danger)':'var(--color-success)'};">${openRestr}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Peças Pendentes</div>
                <div style="font-size:1.1rem;font-weight:700;color:${pendingParts>0?'var(--color-warning)':'var(--color-success)'};">${pendingParts}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Risco de Atraso</div>
                <div style="font-size:1.1rem;font-weight:700;color:var(--color-${probClass});">${probAtraso}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Accordions -->
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          
          ${renderAccordion('resumo', 'RESUMO EXECUTIVO', 'chart-bar', renderResumo(eq, tasks, openRestr, pendingParts, adherencia, hPlan, hReal))}
          
          ${['Mecânica','Caldeiraria','Elétrica','Usinagem','Pintor','Lavador','Montagem','Subconjunto','Teste','Retrabalho'].map(disc => {
            const discTasks = tasks.filter(t => t.disciplina === disc);
            const discHPlan = discTasks.reduce((s,t) => s + (t.horasPlanejadas||0), 0);
            const discHReal = discTasks.reduce((s,t) => s + (t.horasRealizadas||0), 0);
            const discConcluidas = discTasks.filter(t => t.status === 'Concluída').length;
            const discAderencia = discTasks.length ? Math.round((discConcluidas / discTasks.length) * 100) : 0;
            
            let badgeColor = discAderencia === 100 ? 'success' : discAderencia >= 50 ? 'warning' : 'danger';
            if (discTasks.length === 0) badgeColor = 'ghost';

            return renderAccordion(
              disc.toLowerCase(),
              `${disc.toUpperCase()} 
               <span class="badge badge-ghost" style="margin-left:8px;">${discTasks.length} ativ.</span> 
               <span class="badge badge-${badgeColor}" style="margin-left:8px;font-size:10px;">Aderência: ${discAderencia}%</span>
               <span style="font-size:11px;color:var(--text-muted);margin-left:8px;font-weight:normal;">${discHPlan}h plan / ${discHReal}h real</span>`, 
              'wrench-screwdriver', 
              renderDisciplina(discTasks, eq, disc)
            );
          }).join('')}

          ${renderAccordion('pecas', `FALTA DE PEÇAS <span class="badge badge-${pendingParts>0?'danger':'success'}" style="margin-left:8px;">${pendingParts} pendentes</span>`, 'cube', renderPecas(parts))}
          
          ${renderAccordion('workforce', 'MÃO DE OBRA', 'users', renderMaoDeObra())}
          
          ${renderAccordion('followup', 'FOLLOW-UP (DIÁRIO DE BORDO)', 'clipboard-list', renderFollowUp(eq))}
          
          ${renderAccordion('restricoes', `RESTRIÇÕES <span class="badge badge-${openRestr>0?'danger':'success'}" style="margin-left:8px;">${openRestr} abertas</span>`, 'exclamation-triangle', renderRestricoes(restrictions))}
          
          ${renderAccordion('cronograma', 'CRONOGRAMA & CAMINHO CRÍTICO', 'calendar', renderCronograma(tasks, eq))}
          
          ${renderAccordion('historico', 'HISTÓRICO & REPLANEJAMENTOS', 'clock', renderHistorico(eq))}

        </div>
      </div>

      <!-- Create Task Modal -->
      <div id="eq-task-modal" class="modal-overlay">
          <div class="card" style="width:100%;max-width:600px;padding:var(--space-6);">
            <h3 style="margin-bottom:var(--space-4);font-size:1.5rem;font-weight:800;">Nova Atividade - <span id="new-task-disc-label" style="color:var(--brand-primary-light);"></span></h3>
            <input type="hidden" id="new-task-disc" />
            
            <div class="form-group" style="margin-bottom:var(--space-3);">
              <label>Descrição da Atividade</label>
              <input type="text" id="new-task-desc" placeholder="Ex: Montagem do rolamento principal" />
            </div>
            
            <div class="form-row" style="margin-bottom:var(--space-3);">
              <div class="form-group">
                <label>Responsável</label>
                <select id="new-task-resp"></select>
              </div>
              <div class="form-group">
                <label>Horas Planejadas</label>
                <input type="number" id="new-task-horas" value="0" />
              </div>
            </div>

            <div class="form-row cols-2" style="margin-bottom:var(--space-3);">
              <div class="form-group">
                <label>Status</label>
                <select id="new-task-status">
                  <option value="Não Iniciada">Não Iniciada</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Falta de Peça">Falta de Peça</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>
              <div class="form-group">
                <label>Avanço (%)</label>
                <input type="number" id="new-task-pct" min="0" max="100" value="0" />
              </div>
            </div>

            <div class="form-row cols-2" style="margin-bottom:var(--space-3);">
              <div class="form-group">
                <label>Planejado Início</label>
                <input type="date" id="new-task-ini" />
              </div>
              <div class="form-group">
                <label>Planejado Fim</label>
                <input type="date" id="new-task-fim" />
              </div>
            </div>

            <div class="form-row cols-2" style="margin-bottom:var(--space-3);">
              <div class="form-group">
                <label>Real Início</label>
                <input type="date" id="new-task-real-ini" />
              </div>
              <div class="form-group">
                <label>Real Fim</label>
                <input type="date" id="new-task-real-fim" />
              </div>
            </div>

            <div class="form-group" style="margin-bottom:var(--space-4);">
              <label>Data Replanejada</label>
              <input type="date" id="new-task-replan" style="width:100%;" />
            </div>

            <div class="checkbox-wrap" style="margin-bottom:var(--space-3);">
              <input type="checkbox" id="new-task-critico" />
              <label for="new-task-critico" style="font-weight:bold;color:var(--color-danger);">Marcar como atividade CRÍTICA no caminho</label>
            </div>

            <div class="form-group" style="margin-bottom:var(--space-3);">
              <label>Predecessoras (Tarefas das quais esta depende)</label>
              <select id="new-task-preds" class="form-select" multiple style="width:100%;height:90px;background:var(--bg-base);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);padding:var(--space-2);font-size:12px;">
              </select>
              <small style="color:var(--text-muted);font-size:10px;display:block;margin-top:2px;">Segure Ctrl (ou Cmd) para selecionar mais de uma tarefa.</small>
            </div>

            <div class="form-group" style="margin-bottom:var(--space-4);">
              <div id="new-task-photos" style="margin-bottom:var(--space-4); display:none; background:var(--bg-base); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid var(--border-default);">
                <label style="margin-bottom:8px; display:block;">Fotos da Atividade</label>
                <div style="display:flex;gap:15px;overflow-x:auto;">
                  <div id="new-task-photo-peca-container" style="display:none;flex:0 0 auto;width:200px;">
                    <span style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-weight:700;">Foto da Solicitação</span>
                    <img id="new-task-photo-peca" src="" style="width:100%;height:150px;object-fit:cover;border-radius:4px;border:1px solid var(--border-hover);cursor:pointer;" onclick="window.open(this.src)" />
                  </div>
                  <div id="new-task-photo-comp-container" style="display:none;flex:0 0 auto;width:200px;">
                    <span style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-weight:700;">Foto da Conclusão</span>
                    <img id="new-task-photo-comp" src="" style="width:100%;height:150px;object-fit:cover;border-radius:4px;border:1px solid var(--border-hover);cursor:pointer;" onclick="window.open(this.src)" />
                  </div>
                </div>
              </div>

              <label>Observações e Comentários</label>
              <div id="new-task-obs-history" style="max-height: 120px; overflow-y: auto; font-size: 11px; margin-bottom: var(--space-3); border: 1px solid var(--border-default); padding: var(--space-2); border-radius: var(--radius-sm); background: var(--bg-base); display: none;"></div>
              <div style="display: flex; gap: 6px;">
                <input type="text" id="new-task-obs" placeholder="Escreva uma observação ou comentário..." onkeydown="if(event.key==='Enter') window.EquipmentPanel.addCommentFromModal()" style="flex: 1; padding: var(--space-2); font-size: 11px; border: 1px solid var(--border-default); border-radius: 3px; background: var(--bg-base); color: var(--text-primary);" />
                <button class="btn btn-primary btn-sm" onclick="window.EquipmentPanel.addCommentFromModal()" style="padding: 4px 10px; font-size: 11px;">Enviar</button>
              </div>
            </div>

            <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
              <button id="new-task-delete-btn" class="btn btn-danger" onclick="window.EquipmentPanel.deleteTaskFromModal()" style="display:none;margin-right:auto;">Excluir Atividade</button>
              <button class="btn btn-ghost" onclick="closeModal('eq-task-modal')">Cancelar</button>
              <button class="btn btn-primary" onclick="window.EquipmentPanel.saveTask('${currentEqId}')">Salvar Atividade</button>
            </div>
          </div>
        </div>

        <!-- Create Part Modal -->
        <div id="eq-part-modal" class="modal-overlay">
          <div class="card" style="width:100%;max-width:500px;padding:var(--space-6);">
            <h3 id="eq-part-modal-title" style="margin-bottom:var(--space-4);font-size:1.5rem;font-weight:800;">Nova Peça Faltante</h3>
            
            <div class="form-group" style="margin-bottom:var(--space-3);">
              <label>S.A. (Solicitação Almoxarifado)</label>
              <input type="text" id="new-part-sa" placeholder="Ex: SA-2026-1234" />
            </div>

            <div class="form-row" style="margin-bottom:var(--space-3);display:flex;gap:var(--space-4);">
              <div class="form-group" style="flex:1;">
                <label>Código da Peça</label>
                <input type="text" id="new-part-cod" placeholder="Ex: ROL-6308" />
              </div>
              <div class="form-group" style="flex:2;">
                <label>Descrição *</label>
                <input type="text" id="new-part-desc" placeholder="Ex: Rolamento do Eixo" />
              </div>
            </div>
            
            <div class="form-row" style="margin-bottom:var(--space-3);display:flex;gap:var(--space-4);">
              <div class="form-group" style="flex:1;">
                <label>Quantidade</label>
                <input type="number" id="new-part-qtd" value="1" min="1" />
              </div>
              <div class="form-group" style="flex:1;">
                <label>Status</label>
                <select id="new-part-status" onchange="window.EquipmentPanel.onStatusFormChange(this.value)">
                  <option value="Solicitada">Solicitada</option>
                  <option value="Comprada">Comprada</option>
                  <option value="Em Transporte">Em Transporte</option>
                  <option value="Recebida">Recebida</option>
                  <option value="Instalada">Instalada</option>
                </select>
              </div>
            </div>

            <div class="form-row" style="margin-bottom:var(--space-3);display:flex;gap:var(--space-3);">
              <div class="form-group" style="flex:1;">
                <label>Data Solicitação</label>
                <input type="date" id="new-part-sol" />
              </div>
              <div class="form-group" style="flex:1;">
                <label>Entrega Real</label>
                <input type="date" id="new-part-real" />
              </div>
            </div>

            <div class="form-row" style="margin-bottom:var(--space-4);align-items:center;gap:var(--space-4);display:flex;">
              <div class="checkbox-wrap" style="flex:1;margin-bottom:0;">
                <input type="checkbox" id="new-part-entregue" onchange="window.EquipmentPanel.onEntregueFormChange(this.checked)" />
                <label for="new-part-entregue" style="font-weight:bold;">Entregue? (Sim/Não)</label>
              </div>
              <div class="checkbox-wrap" style="flex:1.2;margin-bottom:0;">
                <input type="checkbox" id="new-part-critico" />
                <label for="new-part-critico" style="font-weight:bold;color:var(--color-danger);">Peça CRÍTICA (Bloqueia)</label>
              </div>
            </div>

            <input type="hidden" id="new-part-id" value="" />

            <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
              <button class="btn btn-ghost" onclick="closeModal('eq-part-modal')">Cancelar</button>
              <button class="btn btn-primary" onclick="EquipmentPanel.savePart()">Salvar Peça</button>
            </div>
          </div>
        </div>
    `;
  }

  function renderAccordion(id, title, iconId, contentHtml) {
    const p = AppIcons[iconId] || '';
    const open = !!openAccordions[id];
    return `
      <div class="accordion" data-id="${id}" style="background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-md);overflow:hidden;">
        <div class="accordion-header" style="padding:var(--space-4) var(--space-5);background:var(--bg-base);cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-card);" onclick="EquipmentPanel.toggleAccordion(this)">
          <div style="display:flex;align-items:center;gap:var(--space-3);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;color:var(--text-muted);">${p}</svg>
            <div style="font-weight:800;font-size:1.1rem;letter-spacing:0.05em;color:var(--text-primary);">${title}</div>
          </div>
          <span class="expand-icon" style="transition:transform .2s;color:var(--text-muted);transform:${open?'rotate(180deg)':'rotate(0deg)'}">▼</span>
        </div>
        <div class="accordion-body" style="display:${open?'block':'none'};padding:var(--space-5);background:var(--bg-card);">
          ${contentHtml}
        </div>
      </div>
    `;
  }

  function toggleAccordion(headerEl) {
    const accordionEl = headerEl.parentElement;
    const id = accordionEl.dataset.id;
    const body = headerEl.nextElementSibling;
    const icon = headerEl.querySelector('.expand-icon');
    if (body.style.display === 'none') {
      body.style.display = 'block';
      icon.style.transform = 'rotate(180deg)';
      openAccordions[id] = true;
    } else {
      body.style.display = 'none';
      icon.style.transform = 'rotate(0deg)';
      openAccordions[id] = false;
    }
  }

  // --- Accordion Renderers ---

  function renderResumo(eq, tasks, openRestr, pendingParts, adherencia, hPlan, hReal) {
    return `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);">
        <div style="background:var(--bg-base);padding:var(--space-4);border-radius:var(--radius-md);border-left:3px solid var(--brand-primary-light);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Aderência da Execução</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary);">${adherencia}%</div>
        </div>
        <div style="background:var(--bg-base);padding:var(--space-4);border-radius:var(--radius-md);border-left:3px solid var(--color-info);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Horas Trabalhadas</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary);">${(Number(hReal)||0).toFixed(1)}<span style="font-size:1rem;color:var(--text-muted);">/${(Number(hPlan)||0).toFixed(1)}h</span></div>
        </div>
        <div style="background:var(--bg-base);padding:var(--space-4);border-radius:var(--radius-md);border-left:3px solid var(--color-warning);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Tarefas Concluídas</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary);">${tasks.filter(t=>t.status==='Concluída').length}<span style="font-size:1rem;color:var(--text-muted);">/${tasks.length}</span></div>
        </div>
        <div style="background:var(--bg-base);padding:var(--space-4);border-radius:var(--radius-md);border-left:3px solid var(--color-danger);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Tarefas Críticas Pendentes</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--color-danger);">${tasks.filter(t=>(window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t, tasks) : t.critico) && t.status!=='Concluída').length}</div>
        </div>
      </div>
    `;
  }

  function renderDisciplina(tasks, eq, disc) {
    const allEqTasks = DB.tasks.getByEquipment(eq.id);
    let html = '';
    if (tasks.length === 0) {
      html = `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhuma atividade desta disciplina.</p></div>`;
    } else {
      html = `
        <div class="table-wrap">
          <table style="width:100%;text-align:left;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="width:30px;"></th>
                <th>Descrição da Atividade</th>
                <th>Planejado</th>
                <th>Replanejado</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Avanço</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(t => {
                const isChecked = t.status === 'Concluída';
                const isTaskCritico = window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t, allEqTasks) : t.critico;
                
                const preds = (t.predecessoras || []).map(pid => allEqTasks.find(x => x.id === pid)).filter(Boolean);
                const predsHtml = preds.map(p => `
                  <span class="badge" style="font-size:9px;padding:2px 6px;background:rgba(255,179,0,0.15);color:var(--color-warning);border:1px solid rgba(255,179,0,0.25);display:inline-flex;align-items:center;gap:3px;margin-top:2px;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:9px;height:9px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                    Depende: ${p.descricao} (${p.disciplina})
                  </span>
                `).join(' ');

                return `
                <tr style="${isChecked?'opacity:0.7;':''} ${isTaskCritico?'background:rgba(244,67,54,0.03);':''} cursor:pointer;" onclick="window.EquipmentPanel.openTaskModal('${t.disciplina}', '${t.id}')" class="task-row-main" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">
                  <td><input type="checkbox" ${isChecked?'checked':''} onclick="event.stopPropagation(); window.EquipmentPanel.updateTaskStatus('${currentEqId}', '${t.id}', this.checked ? 'Concluída' : 'Não Iniciada')" style="cursor:pointer;" /></td>
                  <td>
                    <div style="font-weight:600;color:var(--text-primary);${isChecked?'text-decoration:line-through;':''}">${t.descricao}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px;">
                      ${isTaskCritico?'<span style="font-size:9px;background:var(--color-danger);color:white;padding:1px 4px;border-radius:2px;font-weight:bold;display:inline-block;">CRÍTICO</span>':''}
                      ${predsHtml}
                    </div>
                  </td>
                  <td style="font-size:var(--text-xs);color:var(--text-muted);">${t.dataPlanejadaInicio ? `${formatDate(t.dataPlanejadaInicio)} → ${formatDate(t.dataPlanejadaTermino)}` : '—'}</td>
                  <td style="font-size:var(--text-xs);color:var(--brand-primary-light);font-weight:600;">${t.dataReplanejada ? formatDate(t.dataReplanejada) : '—'}</td>
                  <td>${t.responsavel || '—'}</td>
                  <td>${statusBadge(t.status)}</td>
                  <td><span style="font-weight:700;color:var(--text-primary);">${t.pctExecutado||0}%</span></td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }
    return html + `
      <div style="margin-top:var(--space-3);display:flex;justify-content:flex-end;gap:var(--space-2);">
        <button class="btn btn-outline btn-sm" onclick="EquipmentPanel.exportTasksCSV('${disc}')" style="border-color:var(--border-default);color:var(--text-secondary);background:var(--bg-base);">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Baixar Tarefas (${disc})
        </button>
        <button class="btn btn-outline btn-sm" onclick="window.EquipmentPanel.openPartModal()" style="color:var(--color-orange);border-color:var(--color-orange);">+ Registrar Peça Faltante</button>
        <button class="btn btn-secondary btn-sm" onclick="EquipmentPanel.openTaskModal('${disc}')">+ Adicionar Atividade</button>
      </div>
    `;
  }

  function renderPecas(parts) {
    let html = '';
    if (parts.length === 0) {
      html = `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhuma peça faltante registrada.</p></div>`;
    } else {
      html = `
        <div class="table-wrap">
          <table style="width:100%;text-align:left;">
            <thead>
              <tr>
                <th>S.A.</th>
                <th>Código / Descrição</th>
                <th>Qtd</th>
                <th>Datas (Sol / Prev / Real)</th>
                <th>Fornecedor</th>
                <th>Entregue?</th>
                <th>Status</th>
                <th style="width:80px;text-align:center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${parts.map(p => {
                const isEntregue = p.entregue || p.status === 'Recebida' || p.status === 'Instalada';
                return `
                <tr style="${p.critica?'background:rgba(244,67,54,0.05);':''}">
                   <td><code>${p.sa || '—'}</code></td>
                   <td>
                     <div style="font-weight:600;">${p.descricao}</div>
                     <div style="font-size:10px;color:var(--text-muted);">${p.codigo || '—'}</div>
                     ${p.critica?'<span style="font-size:9px;background:var(--color-danger);color:white;padding:1px 4px;border-radius:2px;font-weight:bold;display:inline-block;margin-top:2px;">IMPACTA LIBERAÇÃO</span>':''}
                   </td>
                   <td>${p.quantidade || 1}</td>
                   <td>
                     <div style="font-size:10px;">Sol: <strong style="color:var(--text-primary)">${p.dataSolicitacao ? formatDate(p.dataSolicitacao) : '—'}</strong></div>
                     <div style="font-size:10px;">Real: <strong style="color:var(--color-success)">${p.dataReal ? formatDate(p.dataReal) : '—'}</strong></div>
                   </td>
                   <td>${p.fornecedor || '—'}</td>
                   <td style="text-align:center;">
                     <input type="checkbox" ${isEntregue?'checked':''} onclick="window.EquipmentPanel.togglePartEntregue('${p.id}', this.checked)" style="cursor:pointer;" />
                   </td>
                   <td>${statusBadge(p.status)}</td>
                   <td style="text-align:center;">
                     <div style="display:flex;gap:4px;justify-content:center;">
                       <button class="btn btn-ghost btn-sm" onclick="window.EquipmentPanel.openPartModal('${p.id}')" title="Editar Peça" style="color:var(--brand-primary-light);padding:4px;">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                       </button>
                       <button class="btn btn-ghost btn-sm" onclick="window.EquipmentPanel.deletePart('${p.id}')" title="Excluir Peça" style="color:var(--color-danger);padding:4px;">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397" /></svg>
                       </button>
                     </div>
                   </td>
                 </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    return html + `
      <div style="margin-top:var(--space-3);text-align:right;">
        <button class="btn btn-secondary btn-sm" onclick="window.EquipmentPanel.openPartModal()">+ Registrar Peça Faltante</button>
      </div>
    `;
  }

  function renderMaoDeObra() {
    return `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhum apontamento recente para este equipamento.</p><button class="btn btn-secondary btn-sm" style="margin-top:var(--space-2)">+ Novo Apontamento</button></div>`;
  }

  function renderFollowUp(eq) {
    const timelines = eq.timeline || [];
    // Sort timeline descending
    const events = [...timelines].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    
    return `
      <div style="display:flex;gap:var(--space-4);">
        <!-- Timeline list -->
        <div style="flex:1;">
          ${events.length === 0 ? '<div class="empty-state"><p>Nenhum registro de follow-up.</p></div>' : `
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${events.map(ev => `
              <div style="background:var(--bg-base);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);border-left:3px solid var(--color-${ev.impacto > 0 ? 'danger' : 'info'});">
                <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
                  <div style="font-size:11px;color:var(--text-muted);">
                    <strong style="color:var(--text-secondary);">${ev.responsavel || 'Sistema'}</strong> · ${formatDateTime(ev.timestamp)}
                  </div>
                  ${ev.impacto ? `<span class="badge badge-danger">Impacto: +${ev.impacto} dias</span>` : ''}
                </div>
                <div style="font-size:var(--text-sm);color:var(--text-primary);line-height:1.5;">
                  ${ev.descricao}
                </div>
              </div>
            `).join('')}
          </div>
          `}
        </div>
        <!-- Input Form -->
        <div style="width:350px;background:var(--bg-base);padding:var(--space-4);border-radius:var(--radius-md);border:1px solid var(--border-card);align-self:flex-start;">
          <h4 style="margin-bottom:var(--space-3);font-size:var(--text-sm);">Adicionar Novo Registro</h4>
          <textarea id="fu-text" rows="4" style="width:100%;margin-bottom:var(--space-3);" placeholder="Escreva a observação do dia..."></textarea>
          <div style="margin-bottom:var(--space-3);">
            <label style="font-size:11px;">Impacto na Data Prevista (Dias)</label>
            <input type="number" id="fu-impact" value="0" style="width:100%;" />
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="EquipmentPanel.addFollowUp()">Gravar Follow-up</button>
        </div>
      </div>
    `;
  }

  function addFollowUp() {
    const text = document.getElementById('fu-text').value.trim();
    const impact = parseInt(document.getElementById('fu-impact').value) || 0;
    if (!text) { Toast.error('Erro','Texto obrigatório.'); return; }
    
    const eq = DB.equipment.get(currentEqId);
    if (!eq.timeline) eq.timeline = [];
    eq.timeline.push({
      id: 'tl-' + Date.now(),
      titulo: 'Follow-up Operacional',
      descricao: text,
      timestamp: new Date().toISOString(),
      responsavel: Auth.getSession()?.nome || 'Usuário',
      impacto: impact,
      tipo: impact > 0 ? 'REPLANEJAMENTO' : 'COMENTARIO'
    });

    if (impact > 0) {
      // Ajusta a data atual prevista
      const curDt = eq.dataLiberacaoAtual || eq.dataLiberacaoPlanejada;
      if (curDt) {
        const d = new Date(curDt);
        d.setDate(d.getDate() + impact);
        eq.dataLiberacaoAtual = d.toISOString().slice(0,10);
      }
      
      // Grava no histórico de replanejamento tbm
      if (!eq.replanning) eq.replanning = [];
      eq.replanning.push({
        label: `R${eq.replanning.length+1}`,
        dataAnterior: curDt,
        novaData: eq.dataLiberacaoAtual,
        motivo: text,
        createdAt: new Date().toISOString()
      });
    }

    DB.equipment.update(currentEqId, eq);
    Toast.success('Follow-up registrado com sucesso!');
    Router.navigate('equipment-panel', {id: currentEqId, force:true});
  }

  function renderRestricoes(restrictions) {
    if (restrictions.length === 0) return `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhuma restrição registrada.</p></div>`;
    return `
      <div class="table-wrap">
        <table style="width:100%;text-align:left;">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Responsável</th>
              <th>Data</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${restrictions.map(r => `
              <tr style="${r.status==='Aberta'?'background:rgba(244,67,54,0.05);':''}">
                <td style="font-weight:600;">${r.status==='Aberta'?'🔴 ':''}${r.descricao}</td>
                <td>${r.tipo}</td>
                <td>${r.responsavel || '—'}</td>
                <td>${formatDate(r.createdAt)}</td>
                <td><span class="badge badge-${r.status==='Aberta'?'danger':'success'}">${r.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDDD1(tasks) {
    return `<div class="alert alert-info" style="margin-bottom:0;"><div class="alert-content">Módulo D-1 | D | D+1 filtrado para este equipamento (Em desenvolvimento).</div></div>`;
  }

  function renderCronograma(tasks, eq) {
    return renderFullGantt(tasks, eq);
  }

  function renderHistorico(eq) {
    const tSheets = DB.timesheets.list().filter(ts => ts.equipmentId === eq.id);
    let horasPecas = 0, horasMaoObra = 0, horasAtrasoOutros = 0, horasTrabalho = 0;
    
    const timelineItems = [];

    // Add replannings to timeline
    if (eq.replanning && eq.replanning.length > 0) {
      eq.replanning.forEach(r => {
        timelineItems.push({
          date: new Date(r.novaData),
          title: 'Replanejamento',
          desc: `De ${formatDate(r.dataAnterior)} para ${formatDate(r.novaData)}. Motivo: ${r.motivo} (Por: ${r.responsavel})`,
          type: 'replan'
        });
      });
    }

    tSheets.forEach(ts => {
      if (ts.tipo === 'Trabalho') horasTrabalho += ts.horasTrabalhadas || 0;
      else if (ts.tipo === 'Atraso Tarefa') {
        const pReason = ts.motivoPausa || '';
        if (pReason.includes('Falta de Peça')) horasPecas += ts.horasTrabalhadas || 0;
        else if (pReason.includes('Mão de Obra')) horasMaoObra += ts.horasTrabalhadas || 0;
        else horasAtrasoOutros += ts.horasTrabalhadas || 0;

        timelineItems.push({
          date: new Date(ts.horaFim),
          title: `Atraso: ${pReason}`,
          desc: `Tarefa ID: ${ts.taskId?.split('-')[0] || ''} | Duração: ${(ts.horasTrabalhadas||0).toFixed(1)}h | Obs: ${ts.observacao || ''}`,
          type: 'delay'
        });
      }
    });

    timelineItems.sort((a, b) => b.date - a.date);

    const timelineHtml = timelineItems.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">Nenhum evento registrado.</p>' :
      `<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
        ${timelineItems.map(item => `
          <div style="border-left:2px solid ${item.type==='replan'?'var(--brand-primary)': 'var(--color-danger)'}; padding-left:12px;">
            <div style="font-size:11px;color:var(--text-muted);">${item.date.toLocaleDateString('pt-BR')} ${item.date.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${item.title}</div>
            <div style="font-size:13px;color:var(--text-secondary);">${item.desc}</div>
          </div>
        `).join('')}
      </div>`;

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:var(--space-4);margin-bottom:var(--space-5);">
        <div class="card" style="padding:var(--space-4);background:rgba(239,68,68,0.05);border-color:rgba(239,68,68,0.2);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Horas Perdidas: Peças</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--color-danger);">${horasPecas.toFixed(1)}h</div>
        </div>
        <div class="card" style="padding:var(--space-4);background:rgba(245,158,11,0.05);border-color:rgba(245,158,11,0.2);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Horas Perdidas: Mão de Obra</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--color-warning);">${horasMaoObra.toFixed(1)}h</div>
        </div>
        <div class="card" style="padding:var(--space-4);background:rgba(107,114,128,0.05);border-color:rgba(107,114,128,0.2);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Horas Perdidas: Outros</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--text-secondary);">${horasAtrasoOutros.toFixed(1)}h</div>
        </div>
        <div class="card" style="padding:var(--space-4);background:rgba(16,185,129,0.05);border-color:rgba(16,185,129,0.2);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Total Horas Trabalhadas</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--color-success);">${horasTrabalho.toFixed(1)}h</div>
        </div>
      </div>
      
      <h4 style="font-size:14px;color:var(--text-primary);margin-bottom:8px;font-weight:600;">Linha do Tempo de Eventos</h4>
      ${timelineHtml}
    `;
  }

  function renderAnexos() {
    return `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhum anexo. Arraste arquivos aqui.</p></div>`;
  }

  function openTaskModal(disciplina, taskId = null) {
    editingTaskId = taskId;
    openModal('eq-task-modal');
    
    const discInput = document.getElementById('new-task-disc');
    if (discInput) discInput.value = disciplina;
    
    const labelEl = document.getElementById('new-task-disc-label');
    if (labelEl) {
      labelEl.textContent = disciplina.toUpperCase();
    } else {
      const h3 = document.querySelector('#eq-task-modal h3');
      if (h3) h3.innerHTML = `Nova Atividade - <span id="new-task-disc-label" style="color:var(--brand-primary-light);">${disciplina.toUpperCase()}</span>`;
    }
    
    // Fetch all other tasks of the current equipment (excluding the task being edited to avoid self-dependency)
    const allTasks = DB.tasks.getByEquipment(currentEqId);
    const otherTasks = taskId ? allTasks.filter(t => t.id !== taskId) : allTasks;
    
    // Render the predecessors selector options
    const predsSelect = document.getElementById('new-task-preds');
    predsSelect.innerHTML = otherTasks.map(ot => `<option value="${ot.id}">${ot.descricao} (${ot.disciplina})</option>`).join('');

    // Populate the Responsável dropdown based on workforce allocated to currentEqId
    const respSelect = document.getElementById('new-task-resp');
    let wf = DB.workforce.list();
    const vList = window.DB && DB.vacations ? DB.vacations.list() : [];
    const tIso = new Date().toISOString().slice(0,10);
    wf = wf.filter(w => !vList.some(v => v.workerId === w.id && tIso >= v.startDate && tIso <= v.endDate));
    const filteredWf = wf.filter(w => w.equipmentId === currentEqId);
    
    let selectedName = '';
    if (taskId) {
      const t = DB.tasks.get(taskId);
      selectedName = t.responsavel || '';
    } else {
      const eq = DB.equipment.get(currentEqId);
      selectedName = (eq && eq.workforceMap ? eq.workforceMap[disciplina] : '') || '';
    }
    
    if (selectedName && selectedName !== 'Não atribuído') {
      const respWorker = wf.find(w => w.nome === selectedName);
      if (respWorker && !filteredWf.some(w => w.id === respWorker.id)) {
        filteredWf.push(respWorker);
      }
    }
    
    let respHtml = '<option value="Não atribuído">—</option>';
    filteredWf.forEach(w => {
      respHtml += `<option value="${w.nome}" ${w.nome === selectedName ? 'selected' : ''}>${w.nome}</option>`;
    });
    respSelect.innerHTML = respHtml;

    const titleEl = document.querySelector('#eq-task-modal h3');
    const deleteBtn = document.getElementById('new-task-delete-btn');
    
    if (taskId) {
      const t = DB.tasks.get(taskId);
      titleEl.innerHTML = `Editar Atividade - <span style="color:var(--brand-primary-light);">${disciplina.toUpperCase()}</span>`;
      document.getElementById('new-task-desc').value = t.descricao || '';
      document.getElementById('new-task-resp').value = t.responsavel || 'Não atribuído';
      document.getElementById('new-task-horas').value = t.horasPlanejadas || 0;
      document.getElementById('new-task-status').value = t.status || 'Não Iniciada';
      document.getElementById('new-task-pct').value = t.pctExecutado || 0;
      document.getElementById('new-task-ini').value = t.dataPlanejadaInicio || '';
      document.getElementById('new-task-fim').value = t.dataPlanejadaTermino || '';
      document.getElementById('new-task-real-ini').value = t.dataRealInicio || '';
      document.getElementById('new-task-real-fim').value = t.dataRealTermino || '';
      document.getElementById('new-task-replan').value = t.dataReplanejada || '';
      document.getElementById('new-task-critico').checked = !!t.critico;
      if (deleteBtn) deleteBtn.style.display = 'block';
      
      // Populate observations history if any
      const obsHistoryEl = document.getElementById('new-task-obs-history');
      document.getElementById('new-task-obs').value = ''; // clean input for new comment
      if (t.observacoes) {
        let isJson = false;
        try {
          const comments = JSON.parse(t.observacoes);
          if (Array.isArray(comments)) {
            isJson = true;
            obsHistoryEl.style.display = 'block';
            obsHistoryEl.innerHTML = renderComments(t.observacoes, t.id);
          }
        } catch (e) {}
        
        if (!isJson) {
          obsHistoryEl.style.display = 'none';
          document.getElementById('new-task-obs').value = t.observacoes; // load legacy text directly
        }
      } else {
        obsHistoryEl.style.display = 'none';
      }
      
      // Populate photos if available
      const photoContainer = document.getElementById('new-task-photos');
      const photoPecaC = document.getElementById('new-task-photo-peca-container');
      const photoPecaImg = document.getElementById('new-task-photo-peca');
      const photoCompC = document.getElementById('new-task-photo-comp-container');
      const photoCompImg = document.getElementById('new-task-photo-comp');
      
      let hasPhotos = false;
      if (t.fotoPeca) {
        photoPecaImg.src = t.fotoPeca;
        photoPecaC.style.display = 'block';
        hasPhotos = true;
      } else {
        photoPecaC.style.display = 'none';
      }
      
      if (t.fotoComprovacao) {
        photoCompImg.src = t.fotoComprovacao;
        photoCompC.style.display = 'block';
        hasPhotos = true;
      } else {
        photoCompC.style.display = 'none';
      }
      
      photoContainer.style.display = hasPhotos ? 'block' : 'none';

      // Select the predecessor options
      const preds = t.predecessoras || [];
      Array.from(predsSelect.options).forEach(opt => {
        opt.selected = preds.includes(opt.value);
      });
    } else {
      document.getElementById('new-task-photos').style.display = 'none';
      titleEl.innerHTML = `Nova Atividade - <span style="color:var(--brand-primary-light);">${disciplina.toUpperCase()}</span>`;
      const today = new Date().toISOString().slice(0,10);
      document.getElementById('new-task-desc').value = '';
      const eq = DB.equipment.get(currentEqId);
      const defaultWorker = eq && eq.workforceMap ? eq.workforceMap[disciplina] : '';
      document.getElementById('new-task-resp').value = defaultWorker || 'Não atribuído';
      document.getElementById('new-task-horas').value = 0;
      document.getElementById('new-task-status').value = 'Não Iniciada';
      document.getElementById('new-task-pct').value = 0;
      document.getElementById('new-task-ini').value = today;
      document.getElementById('new-task-fim').value = today;
      document.getElementById('new-task-real-ini').value = '';
      document.getElementById('new-task-real-fim').value = '';
      document.getElementById('new-task-replan').value = '';
      document.getElementById('new-task-critico').checked = false;
      document.getElementById('new-task-obs-history').style.display = 'none';
      document.getElementById('new-task-obs').value = '';
      if (deleteBtn) deleteBtn.style.display = 'none';
      Array.from(predsSelect.options).forEach(opt => opt.selected = false);
    }
  }

  function saveTask(eqId) {
    const desc = document.getElementById('new-task-desc').value.trim();
    if (!desc) { Toast.error('Erro', 'Descrição é obrigatória.'); return; }

    const predsSelect = document.getElementById('new-task-preds');
    const selectedPreds = Array.from(predsSelect.selectedOptions).map(opt => opt.value);

    const selectedWorker = document.getElementById('new-task-resp').value.trim();
    const newObsText = document.getElementById('new-task-obs').value.trim();
    let finalObservacoes = '';
    
    if (editingTaskId) {
      const t = DB.tasks.get(editingTaskId);
      if (t) {
        let comments = [];
        let isJson = false;
        if (t.observacoes) {
          try {
            comments = JSON.parse(t.observacoes);
            if (Array.isArray(comments)) {
              isJson = true;
            }
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

    const inputStatus = document.getElementById('new-task-status').value;
    let inputPct = parseInt(document.getElementById('new-task-pct').value) || 0;
    if (inputPct < 0) inputPct = 0;
    if (inputPct > 100) inputPct = 100;

    let realFim = document.getElementById('new-task-real-fim').value || null;
    let realIni = document.getElementById('new-task-real-ini').value || null;
    let finalStatus = inputStatus;

    if (finalStatus === 'Concluída' || inputPct === 100) {
      finalStatus = 'Concluída';
      inputPct = 100;
      if (!realFim) {
        realFim = new Date().toISOString().slice(0,10);
      }
      if (!realIni) {
        realIni = new Date().toISOString().slice(0,10);
      }
    } else if (inputPct > 0 && finalStatus === 'Não Iniciada') {
      finalStatus = 'Em Andamento';
      if (!realIni) {
        realIni = new Date().toISOString().slice(0,10);
      }
    } else if (finalStatus === 'Em Andamento' && inputPct === 0) {
      inputPct = 10;
    }

    const taskData = {
      equipmentId: eqId || currentEqId,
      descricao: desc,
      disciplina: document.getElementById('new-task-disc').value,
      responsavel: selectedWorker || 'Não atribuído',
      horasPlanejadas: parseInt(document.getElementById('new-task-horas').value) || 0,
      dataPlanejadaInicio: document.getElementById('new-task-ini').value,
      dataPlanejadaTermino: document.getElementById('new-task-fim').value,
      dataRealInicio: realIni,
      dataRealTermino: realFim,
      dataReplanejada: document.getElementById('new-task-replan').value || null,
      prioridade: document.getElementById('new-task-critico').checked ? 'Crítica' : 'Média',
      critico: document.getElementById('new-task-critico').checked,
      observacoes: finalObservacoes,
      predecessoras: selectedPreds,
      status: finalStatus,
      pctExecutado: inputPct
    };

    const targetEqId = eqId || currentEqId;

    if (taskData.responsavel && taskData.responsavel !== 'Não atribuído') {
      const activeEqs = DB.equipment.list().filter(e => e.id !== targetEqId && e.status !== 'Liberado');
      for (const eq of activeEqs) {
        if (eq.workforceMap && Object.values(eq.workforceMap).includes(taskData.responsavel)) {
          Toast.error('Erro', `O funcionário ${taskData.responsavel} já está alocado no equipamento ${eq.codigo} (${eq.status}).`);
          return;
        }
      }
    }

    const eq = DB.equipment.get(targetEqId);
    const defaultWorker = eq && eq.workforceMap ? eq.workforceMap[taskData.disciplina] : '';
    
    let previousWorker = null;
    if (editingTaskId) {
      const t = DB.tasks.get(editingTaskId);
      previousWorker = t ? t.responsavel : null;
    }
    
    const isWorkerChanged = editingTaskId
      ? (selectedWorker !== previousWorker)
      : (defaultWorker && selectedWorker !== defaultWorker);

    if (isWorkerChanged) {
      const justification = prompt(`Justificativa para alteração de Mão de Obra (de "${previousWorker || defaultWorker || 'Ninguém'}" para "${selectedWorker || 'Ninguém'}"):`);
      if (justification === null) {
        return; // Abort saving!
      }
      const justTrimmed = justification.trim();
      if (!justTrimmed) {
        Toast.error('Erro', 'Justificativa é obrigatória para alterar a Mão de Obra.');
        return; // Abort saving!
      }
      
      taskData.justificativaMaoDeObra = justTrimmed;
      const dateStr = new Date().toLocaleString('pt-BR');
      
      let comments = [];
      let isJson = false;
      try {
        comments = JSON.parse(taskData.observacoes);
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
        taskData.observacoes = JSON.stringify(comments);
      } else {
        taskData.observacoes = (taskData.observacoes ? taskData.observacoes : '') + `\n[M.O. Alterada em ${dateStr}]: ${justTrimmed}`;
      }
    }

    if (editingTaskId) {
      const t = DB.tasks.get(editingTaskId);
      const updatedTask = { ...t, ...taskData };
      DB.tasks.update(editingTaskId, updatedTask);
      Toast.success('Atividade Atualizada', `A atividade "${desc}" foi atualizada com sucesso.`);
    } else {
      const newTask = {
        ...taskData,
        codigo: 'ATV-' + Math.floor(Math.random() * 10000),
        horasRealizadas: 0
      };
      DB.tasks.create(newTask);
      Toast.success('Atividade Adicionada', `A atividade "${desc}" foi criada com sucesso.`);
    }
    
    closeModal('eq-task-modal');
    Router.navigate('equipment-panel', { id: eqId || currentEqId, force: true });
  }

  function deleteTask(eqId, id) {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      DB.tasks.delete(id);
      Toast.success('Atividade removida.');
      Router.navigate('equipment-panel', { id: eqId || currentEqId, force: true });
    }
  }

  function openPartModal(partId = null) {
    openModal('eq-part-modal');
    const today = new Date().toISOString().slice(0,10);
    
    if (partId) {
      const p = DB.parts.get(partId);
      if (p) {
        document.getElementById('eq-part-modal-title').textContent = 'Editar Peça Faltante';
        document.getElementById('new-part-id').value = p.id;
        document.getElementById('new-part-cod').value = p.codigo || '';
        document.getElementById('new-part-desc').value = p.descricao || '';
        document.getElementById('new-part-sa').value = p.sa || '';
        document.getElementById('new-part-qtd').value = p.quantidade || 1;
        document.getElementById('new-part-status').value = p.status || 'Solicitada';
        document.getElementById('new-part-critico').checked = !!p.critica;
        document.getElementById('new-part-sol').value = toDateInput(p.dataSolicitacao || today);
        document.getElementById('new-part-real').value = toDateInput(p.dataReal || '');
        document.getElementById('new-part-entregue').checked = !!p.entregue || p.status === 'Recebida' || p.status === 'Instalada';
        return;
      }
    }
    
    document.getElementById('eq-part-modal-title').textContent = 'Nova Peça Faltante';
    document.getElementById('new-part-id').value = '';
    document.getElementById('new-part-cod').value = '';
    document.getElementById('new-part-desc').value = '';
    document.getElementById('new-part-sa').value = '';
    document.getElementById('new-part-qtd').value = 1;
    document.getElementById('new-part-status').value = 'Solicitada';
    document.getElementById('new-part-critico').checked = false;
    document.getElementById('new-part-sol').value = today;
    document.getElementById('new-part-real').value = '';
    document.getElementById('new-part-entregue').checked = false;
  }

  function savePart() {
    const id = document.getElementById('new-part-id').value;
    const cod = document.getElementById('new-part-cod').value.trim();
    const desc = document.getElementById('new-part-desc').value.trim();
    if (!desc) { Toast.error('Erro', 'Descrição é obrigatória.'); return; }

    const isEntregue = document.getElementById('new-part-entregue').checked;
    let status = document.getElementById('new-part-status').value;
    let dataReal = document.getElementById('new-part-real').value;
    const today = new Date().toISOString().slice(0, 10);
    
    if (isEntregue) {
      if (status !== 'Recebida' && status !== 'Instalada') status = 'Recebida';
      if (!dataReal) dataReal = today;
    } else {
      if (status === 'Recebida' || status === 'Instalada') status = 'Solicitada';
      dataReal = '';
    }

    const partData = {
      equipmentId: currentEqId,
      codigo: cod,
      descricao: desc,
      sa: document.getElementById('new-part-sa').value.trim(),
      quantidade: parseInt(document.getElementById('new-part-qtd').value) || 1,
      status: status,
      critica: document.getElementById('new-part-critico').checked,
      fornecedor: '',
      dataSolicitacao: document.getElementById('new-part-sol').value,
      dataPrevista: '',
      dataReal: dataReal,
      entregue: isEntregue
    };

    if (id) {
      DB.parts.update(id, partData);
      Toast.success('Peça Faltante Atualizada', `A peça faltante "${desc}" foi atualizada.`);
    } else {
      DB.parts.create(partData);
      Toast.success('Peça Faltante Registrada', `A peça faltante "${desc}" foi registrada.`);
    }
    closeModal('eq-part-modal');
    Router.navigate('equipment-panel', { id: currentEqId, force: true });
  }

  function deletePart(id) {
    if (confirm('Tem certeza que deseja excluir esta peça?')) {
      DB.parts.delete(id);
      Toast.success('Peça removida.');
      Router.navigate('equipment-panel', { id: currentEqId, force: true });
    }
  }

  function togglePartEntregue(id, isChecked) {
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
    Router.navigate('equipment-panel', { id: currentEqId, force: true });
  }

  function onStatusFormChange(status) {
    const entregueCheckbox = document.getElementById('new-part-entregue');
    const realInput = document.getElementById('new-part-real');
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
    const statusSelect = document.getElementById('new-part-status');
    const realInput = document.getElementById('new-part-real');
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

  function updateTaskStatus(eqId, id, newStatus) {
    const tasks = DB.tasks.getAll();
    const t = tasks.find(x => x.id === id);
    if(t) {
      t.status = newStatus;
      if (newStatus === 'Concluída') t.pctExecutado = 100;
      window.DB.tasks.update(id, t);
      window.Toast.success('Status da atividade atualizado!');
      window.Router.navigate('equipment-panel', { id: eqId || currentEqId, force: true });
    }
  }

  function updateTaskField(eqId, id, field, value) {
    const t = window.DB.tasks.get(id);
    if (!t) return;

    if (field === 'descricao' && !value.trim()) {
      window.Toast.error('Erro', 'Descrição da atividade não pode ser vazia.');
      window.Router.navigate('equipment-panel', { id: eqId || currentEqId, force: true });
      return;
    }

    const data = { updatedAt: new Date().toISOString() };
    
    if (field === 'pctExecutado') {
      data[field] = parseInt(value, 10) || 0;
      if (data[field] === 100) {
        data.status = 'Concluída';
        data.dataRealTermino = new Date().toISOString().slice(0,10);
      } else if (data[field] > 0 && t.status === 'Não Iniciada') {
        data.status = 'Em Andamento';
        if (!t.dataRealInicio) data.dataRealInicio = new Date().toISOString().slice(0,10);
      } else if (data[field] < 100 && t.status === 'Concluída') {
        data.status = 'Em Andamento';
      }
    } else {
      data[field] = value;
    }
    
    window.DB.tasks.update(id, data);
    window.Toast.success('Salvo', 'Atividade atualizada com sucesso.');
    if (field === 'pctExecutado' || field === 'descricao') {
      window.Router.navigate('equipment-panel', { id: eqId || currentEqId, force: true });
    }
  }

  // --- Full Gantt Timeline ---
  function renderFullGantt(tasks, eq) {
    if (tasks.length === 0) {
      return `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhuma atividade para montar o Gantt.</p></div>`;
    }

    let minT = Infinity;
    let maxT = -Infinity;
    const sortedTasks = [...tasks].sort((a,b) => new Date(a.dataPlanejadaInicio) - new Date(b.dataPlanejadaInicio));

    sortedTasks.forEach(t => {
      if (t.dataPlanejadaInicio) {
        const ts = new Date(t.dataPlanejadaInicio).getTime();
        if (ts < minT) minT = ts;
      }
      if (t.dataPlanejadaTermino) {
        const te = new Date(t.dataPlanejadaTermino).getTime();
        if (te > maxT) maxT = te;
      }
    });

    if (minT === Infinity) minT = new Date().getTime();
    if (maxT === -Infinity) maxT = minT + (7 * 86400000);
    if (maxT === minT) maxT = minT + 86400000;

    // Expand margin slightly
    minT -= 2 * 86400000; // 2 days before
    maxT += 2 * 86400000; // 2 days after
    const totalDuration = maxT - minT;
    const totalDays = Math.ceil(totalDuration / 86400000);

    // Generate grid vertical lines and headers
    let headerDates = '';
    let bodyLines = '';
    for (let i = 0; i <= totalDays; i++) {
       let leftPct = (i / totalDays) * 100;
       let d = new Date(minT + i * 86400000);
       headerDates += `<div style="position:absolute;left:${leftPct}%;bottom:4px;font-size:9px;color:var(--text-muted);transform:translateX(-50%);">${d.getDate()}/${d.getMonth()+1}</div>`;
       bodyLines += `<div style="position:absolute;left:${leftPct}%;top:0;bottom:0;border-left:1px dashed var(--border-hover);z-index:0;"></div>`;
    }

    let rows = sortedTasks.map(t => {
      const startTs = t.dataPlanejadaInicio ? new Date(t.dataPlanejadaInicio).getTime() : minT;
      let endTs = t.dataPlanejadaTermino ? new Date(t.dataPlanejadaTermino).getTime() : startTs;
      if (endTs < startTs) endTs = startTs;
      
      let leftPct = ((startTs - minT) / totalDuration) * 100;
      let widthPct = ((endTs - startTs) / totalDuration) * 100;
      
      if (leftPct < 0) leftPct = 0;
      if (widthPct < 0.5) widthPct = 0.5; // minimum visual width
      if (leftPct + widthPct > 100) widthPct = 100 - leftPct;

      const isDone = t.status === 'Concluída';
      const isCrit = window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t, tasks) : t.critico;
      
      let bg = 'linear-gradient(90deg, var(--brand-primary-light), var(--brand-primary))';
      if (isDone) bg = 'var(--text-muted)';
      else if (isCrit) bg = 'linear-gradient(90deg, #EF5350, #E53935)';

      return `
        <div style="display:flex;align-items:center;height:40px;border-bottom:1px solid var(--border-card);background:var(--bg-card);transition:background 0.2s;" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='var(--bg-card)'">
          <!-- Task List Label -->
          <div style="width:300px;flex-shrink:0;padding:0 var(--space-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;font-weight:600;color:var(--text-primary);border-right:1px solid var(--border-card);display:flex;align-items:center;gap:8px;">
             ${isDone ? '<svg style="width:14px;color:var(--color-success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
             ${isCrit ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--color-danger);flex-shrink:0;"></span>' : ''}
             <span title="${t.descricao}">${t.descricao}</span>
          </div>
          <!-- Timeline Area -->
          <div style="flex:1;position:relative;height:100%;display:flex;align-items:center;">
             <div style="position:absolute;left:${leftPct}%;width:${widthPct}%;height:20px;background:${bg};border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.1);z-index:1;display:flex;align-items:center;padding:0 8px;cursor:pointer;transition:transform 0.2s;" title="Atividade: ${t.descricao}\nInício: ${formatDate(t.dataPlanejadaInicio)}\nFim: ${formatDate(t.dataPlanejadaTermino)}\nResponsável: ${t.responsavel || '—'}">
                ${widthPct > 5 ? `<span style="color:#fff;font-size:9px;font-weight:bold;pointer-events:none;">${t.horasPlanejadas||0}h</span>` : ''}
             </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="background:var(--bg-base);border-radius:var(--radius-md);border:1px solid var(--border-card);overflow-x:auto;">
        <div style="min-width:900px;">
          <!-- Header -->
          <div style="display:flex;height:40px;background:var(--bg-card);border-bottom:1px solid var(--border-card);">
            <div style="width:300px;flex-shrink:0;padding:0 var(--space-3);font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;display:flex;align-items:center;border-right:1px solid var(--border-card);">Nome da Atividade</div>
            <div style="flex:1;position:relative;">
               ${headerDates}
            </div>
          </div>
          <!-- Body -->
          <div style="position:relative;">
             <!-- grid background -->
             <div style="position:absolute;top:0;bottom:0;left:300px;right:0;z-index:0;pointer-events:none;">
                ${bodyLines}
             </div>
             <!-- rows -->
             <div style="position:relative;z-index:1;">
               ${rows}
             </div>
          </div>
        </div>
      </div>
    `;
  }

  function exportTasksCSV(discipline = null) {
    if (!currentEqId) return;
    const eq = DB.equipment.get(currentEqId);
    let tasks = DB.tasks.getByEquipment(currentEqId);
    
    if (discipline) {
      tasks = tasks.filter(t => t.disciplina === discipline);
    }
    
    if (tasks.length === 0) {
      Toast.warning('Aviso', 'Não há tarefas para exportar.');
      return;
    }
    
    const headers = ['Disciplina', 'Descrição', 'Responsável', 'Data Planejada Início', 'Data Planejada Término', 'Horas Planejadas', 'Horas Realizadas', 'Status', 'Caminho Crítico'];
    const rows = tasks.map(t => [
      t.disciplina || '',
      t.descricao || '',
      t.responsavel || '',
      t.dataPlanejadaInicio ? formatDate(t.dataPlanejadaInicio) : '',
      t.dataPlanejadaTermino ? formatDate(t.dataPlanejadaTermino) : '',
      t.horasPlanejadas || 0,
      t.horasRealizadas || 0,
      t.status || '',
      (window.CriticalPath && window.CriticalPath.isTaskCritical ? window.CriticalPath.isTaskCritical(t) : t.critico) ? 'Sim' : 'Não'
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => {
        const str = String(cell).replace(/"/g, '""');
        return `"${str}"`;
      }).join(';'))
    ].join('\n');
    
    const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = discipline ? `Tarefas_${eq.codigo}_${discipline}.csv` : `Todas_Tarefas_${eq.codigo}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Toast.success('Exportação', 'Download do arquivo iniciado.');
  }

  function deleteEquipment() {
    if (!currentEqId) return;
    const eq = window.DB.equipment.get(currentEqId);
    if (!eq) return;
    
    const user = window.Auth.getSession();
    if (user?.perfil !== 'Administrador') {
      window.Toast.error('Acesso Negado', 'Você não tem permissão para excluir equipamentos.');
      return;
    }

    if (confirm(`ATENÇÃO! Tem certeza que deseja excluir completamente o equipamento ${eq.codigo} e TODAS as suas tarefas, peças e histórico? Esta ação não pode ser desfeita.`)) {
      // Remover todas as tarefas atreladas
      const eqTasks = window.DB.tasks.getByEquipment(currentEqId);
      eqTasks.forEach(t => window.DB.tasks.delete(t.id));
      
      // Remover todas as pecas atreladas
      const eqParts = window.DB.parts.list(currentEqId);
      eqParts.forEach(p => window.DB.parts.delete(p.id));
      
      // Finalmente remove o equipamento
      window.DB.equipment.delete(currentEqId);
      
      window.Toast.success('Equipamento Excluído', `O equipamento ${eq.codigo} foi removido com sucesso.`);
      window.Router.navigate('home', { force: true });
    }
  }

  function toggleTaskExpand(taskId) {
    if (expandedTaskId === taskId) {
      expandedTaskId = null;
    } else {
      expandedTaskId = taskId;
    }
    
    // Toggle in DOM
    document.querySelectorAll('.task-details-row').forEach(el => {
      if (el.id !== `task-details-${taskId}`) el.style.display = 'none';
    });
    document.querySelectorAll('[id^="chevron-"]').forEach(ch => {
      if (ch.id !== `chevron-${taskId}`) ch.style.transform = 'rotate(0deg)';
    });

    const el = document.getElementById(`task-details-${taskId}`);
    const chevron = document.getElementById(`chevron-${taskId}`);
    if (el) {
      if (el.style.display === 'none') {
        el.style.display = 'table-row';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
      } else {
        el.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      }
    }
  }

  function addComment(taskId, eqId) {
    const input = document.getElementById(`new-comment-input-${taskId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const task = DB.tasks.get(taskId);
    if (!task) return;

    let comments = [];
    if (task.observacoes) {
      try {
        comments = JSON.parse(task.observacoes);
        if (!Array.isArray(comments)) {
          comments = [{ id: 'legacy', text: task.observacoes, user: 'Observação Anterior', createdAt: new Date().toISOString() }];
        }
      } catch (e) {
        comments = [{ id: 'legacy', text: task.observacoes, user: 'Observação Anterior', createdAt: new Date().toISOString() }];
      }
    }

    const session = window.Auth.getSession();
    const newComment = {
      id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      text: text,
      user: session ? session.nome : 'Usuário',
      userId: session ? session.userId : 'anonymous',
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);
    const updatedObservations = JSON.stringify(comments);
    
    DB.tasks.update(taskId, { observacoes: updatedObservations });
    input.value = '';
    
    const listContainer = document.getElementById(`comments-list-${taskId}`);
    if (listContainer) {
      listContainer.innerHTML = renderComments(updatedObservations, taskId);
      listContainer.scrollTop = listContainer.scrollHeight;
    }
  }

  function editComment(taskId, commentId) {
    const textContainer = document.getElementById(`comment-text-container-${taskId}-${commentId}`);
    if (!textContainer) return;
    if (textContainer.querySelector('textarea')) return;

    const task = DB.tasks.get(taskId);
    let currentText = '';
    if (task && task.observacoes) {
      try {
        const comments = JSON.parse(task.observacoes);
        const comment = comments.find(c => c.id === commentId);
        if (comment) currentText = comment.text;
      } catch (e) {
        currentText = task.observacoes;
      }
    }
    
    textContainer.innerHTML = `
      <textarea id="edit-textarea-${taskId}-${commentId}" style="width:100%;height:45px;padding:4px;font-size:11px;background:var(--bg-base);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary);resize:vertical;margin-top:4px;margin-bottom:4px;">${currentText}</textarea>
      <div style="display:flex;gap:6px;justify-content:flex-end;">
        <button class="btn btn-ghost btn-sm" onclick="window.EquipmentPanel.cancelCommentEdit('${taskId}', '${commentId}')" style="padding:2px 6px;font-size:10px;">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="window.EquipmentPanel.saveCommentEdit('${taskId}', '${commentId}', '${currentEqId}')" style="padding:2px 8px;font-size:10px;">Salvar</button>
      </div>
    `;
  }

  function cancelCommentEdit(taskId, commentId) {
    const task = DB.tasks.get(taskId);
    if (!task) return;
    const listContainer = document.getElementById(`comments-list-${taskId}`) || document.getElementById('new-task-obs-history');
    if (listContainer) {
      listContainer.innerHTML = renderComments(task.observacoes, taskId);
    }
  }

  function saveCommentEdit(taskId, commentId, eqId) {
    const textarea = document.getElementById(`edit-textarea-${taskId}-${commentId}`);
    if (!textarea) return;
    const newText = textarea.value.trim();
    if (!newText) {
      Toast.error('Erro', 'O comentário não pode ser vazio.');
      return;
    }

    const task = DB.tasks.get(taskId);
    if (!task) return;

    let comments = [];
    try {
      comments = JSON.parse(task.observacoes);
    } catch (e) {
      return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const session = window.Auth.getSession();
    const currentUserId = session ? session.userId : 'anonymous';
    const isAuthor = comment.userId === currentUserId || (comment.id === 'legacy' && (session?.perfil === 'Administrador' || session?.perfil === 'Desenvolvedor'));

    if (!isAuthor) {
      Toast.error('Erro', 'Apenas o autor do comentário pode editá-lo.');
      return;
    }

    comment.text = newText;
    comment.updatedAt = new Date().toISOString();
    
    const updatedObservations = JSON.stringify(comments);
    DB.tasks.update(taskId, { observacoes: updatedObservations });
    
    const listContainer = document.getElementById(`comments-list-${taskId}`) || document.getElementById('new-task-obs-history');
    if (listContainer) {
      listContainer.innerHTML = renderComments(updatedObservations, taskId);
    }
  }

  function deleteComment(taskId, commentId, eqId) {
    const task = DB.tasks.get(taskId);
    if (!task) return;

    let comments = [];
    try {
      comments = JSON.parse(task.observacoes);
    } catch (e) {
      return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const session = window.Auth.getSession();
    const currentUserId = session ? session.userId : 'anonymous';
    const isAuthor = comment.userId === currentUserId || (comment.id === 'legacy' && (session?.perfil === 'Administrador' || session?.perfil === 'Desenvolvedor'));

    if (!isAuthor) {
      Toast.error('Erro', 'Apenas o autor do comentário pode excluí-lo.');
      return;
    }

    if (!confirm('Deseja realmente excluir este comentário?')) return;

    const updatedComments = comments.filter(c => c.id !== commentId);
    const updatedObservations = JSON.stringify(updatedComments);
    DB.tasks.update(taskId, { observacoes: updatedObservations });

    const listContainer = document.getElementById(`comments-list-${taskId}`) || document.getElementById('new-task-obs-history');
    if (listContainer) {
      listContainer.innerHTML = renderComments(updatedObservations, taskId);
    }
  }

  function addCommentFromModal() {
    const input = document.getElementById('new-task-obs');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (editingTaskId) {
      const task = DB.tasks.get(editingTaskId);
      if (!task) return;

      let comments = [];
      if (task.observacoes) {
        try {
          comments = JSON.parse(task.observacoes);
          if (!Array.isArray(comments)) {
            comments = [{ id: 'legacy', text: task.observacoes, user: 'Observação Anterior', createdAt: new Date().toISOString() }];
          }
        } catch (e) {
          comments = [{ id: 'legacy', text: task.observacoes, user: 'Observação Anterior', createdAt: new Date().toISOString() }];
        }
      }

      const session = window.Auth.getSession();
      const newComment = {
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        text: text,
        user: session ? session.nome : 'Usuário',
        userId: session ? session.userId : 'anonymous',
        createdAt: new Date().toISOString()
      };

      comments.push(newComment);
      const updatedObservations = JSON.stringify(comments);
      
      DB.tasks.update(editingTaskId, { observacoes: updatedObservations });
      input.value = '';
      
      const listContainer = document.getElementById('new-task-obs-history');
      if (listContainer) {
        listContainer.style.display = 'block';
        listContainer.innerHTML = renderComments(updatedObservations, editingTaskId);
        listContainer.scrollTop = listContainer.scrollHeight;
      }
    } else {
      Toast.warning('Atenção', 'A atividade ainda não foi criada. Salve a atividade primeiro.');
    }
  }

  function deleteTaskFromModal() {
    if (editingTaskId) {
      deleteTask(currentEqId, editingTaskId);
    }
  }

  return { 
    render, toggleAccordion, addFollowUp, openTaskModal, saveTask, deleteTask, deleteTaskFromModal,
    updateTaskStatus, updateTaskField, openPartModal, savePart, deletePart, 
    exportTasksCSV, deleteEquipment, toggleTaskExpand, addComment, editComment, 
    cancelCommentEdit, saveCommentEdit, deleteComment, renderComments,
    togglePartEntregue, onStatusFormChange, onEntregueFormChange,
    getEditingTaskId: () => editingTaskId,
    addCommentFromModal
  };
})();

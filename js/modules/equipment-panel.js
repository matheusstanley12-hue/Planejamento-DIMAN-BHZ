window.EquipmentPanel = (() => {
  let currentEqId = null;
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
      <div style="max-width:1200px;margin:0 auto;padding:var(--space-6);">
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
                <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-1);">${eq.nome} · Cliente: <strong style="color:var(--text-secondary)">${eq.cliente || '—'}</strong></div>
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
          
          ${renderAccordion('RESUMO EXECUTIVO', 'chart-bar', renderResumo(eq, tasks, openRestr, pendingParts, adherencia, hPlan, hReal), true)}
          
          ${['Mecânica','Elétrica','Caldeiraria','Usinagem'].map(disc => {
            const discTasks = tasks.filter(t => t.disciplina === disc);
            const discHPlan = discTasks.reduce((s,t) => s + (t.horasPlanejadas||0), 0);
            const discHReal = discTasks.reduce((s,t) => s + (t.horasRealizadas||0), 0);
            const discConcluidas = discTasks.filter(t => t.status === 'Concluída').length;
            const discAderencia = discTasks.length ? Math.round((discConcluidas / discTasks.length) * 100) : 0;
            
            let badgeColor = discAderencia === 100 ? 'success' : discAderencia >= 50 ? 'warning' : 'danger';
            if (discTasks.length === 0) badgeColor = 'ghost';

            return renderAccordion(
              `${disc.toUpperCase()} 
               <span class="badge badge-ghost" style="margin-left:8px;">${discTasks.length} ativ.</span> 
               <span class="badge badge-${badgeColor}" style="margin-left:8px;font-size:10px;">Aderência: ${discAderencia}%</span>
               <span style="font-size:11px;color:var(--text-muted);margin-left:8px;font-weight:normal;">${discHPlan}h plan / ${discHReal}h real</span>`, 
              'wrench-screwdriver', 
              renderDisciplina(discTasks, eq, disc)
            );
          }).join('')}

          ${renderAccordion(`ALMOXARIFADO (PEÇAS) <span class="badge badge-${pendingParts>0?'danger':'success'}" style="margin-left:8px;">${pendingParts} pendentes</span>`, 'cube', renderPecas(parts))}
          
          ${renderAccordion('MÃO DE OBRA', 'users', renderMaoDeObra())}
          
          ${renderAccordion('FOLLOW-UP (DIÁRIO DE BORDO)', 'clipboard-list', renderFollowUp(eq))}
          
          ${renderAccordion(`RESTRIÇÕES <span class="badge badge-${openRestr>0?'danger':'success'}" style="margin-left:8px;">${openRestr} abertas</span>`, 'exclamation-triangle', renderRestricoes(restrictions))}
          
          ${renderAccordion('D-1 | D | D+1', 'calendar-days', renderDDD1(tasks))}
          
          ${renderAccordion('CRONOGRAMA & CAMINHO CRÍTICO', 'calendar', renderCronograma(tasks, eq))}
          
          ${renderAccordion('HISTÓRICO & REPLANEJAMENTOS', 'clock', renderHistorico(eq))}
          
          ${renderAccordion('ANEXOS', 'document-report', renderAnexos())}

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
                <input type="text" id="new-task-resp" placeholder="Nome do responsável" />
              </div>
              <div class="form-group">
                <label>Horas Planejadas</label>
                <input type="number" id="new-task-horas" value="0" />
              </div>
            </div>

            <div class="form-row cols-2" style="margin-bottom:var(--space-4);">
              <div class="form-group">
                <label>Planejado Início</label>
                <input type="date" id="new-task-ini" />
              </div>
              <div class="form-group">
                <label>Planejado Fim</label>
                <input type="date" id="new-task-fim" />
              </div>
            </div>

            <div class="checkbox-wrap" style="margin-bottom:var(--space-5);">
              <input type="checkbox" id="new-task-critico" />
              <label for="new-task-critico" style="font-weight:bold;color:var(--color-danger);">Marcar como atividade CRÍTICA no caminho</label>
            </div>

            <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
              <button class="btn btn-ghost" onclick="closeModal('eq-task-modal')">Cancelar</button>
              <button class="btn btn-primary" onclick="EquipmentPanel.saveTask()">Salvar Atividade</button>
            </div>
          </div>
        </div>

        <!-- Create Part Modal -->
        <div id="eq-part-modal" class="modal-overlay">
          <div class="card" style="width:100%;max-width:500px;padding:var(--space-6);">
            <h3 style="margin-bottom:var(--space-4);font-size:1.5rem;font-weight:800;">Nova Peça</h3>
            
            <div class="form-group" style="margin-bottom:var(--space-3);">
              <label>Código da Peça</label>
              <input type="text" id="new-part-cod" placeholder="Ex: ROL-6308" />
            </div>
            <div class="form-group" style="margin-bottom:var(--space-3);">
              <label>Descrição</label>
              <input type="text" id="new-part-desc" placeholder="Ex: Rolamento do Eixo" />
            </div>
            
            <div class="form-row" style="margin-bottom:var(--space-3);display:flex;gap:var(--space-4);">
              <div class="form-group" style="flex:1;">
                <label>Quantidade</label>
                <input type="number" id="new-part-qtd" value="1" min="1" />
              </div>
              <div class="form-group" style="flex:1;">
                <label>Status</label>
                <select id="new-part-status">
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
                <label>Previsão Entrega</label>
                <input type="date" id="new-part-prev" />
              </div>
              <div class="form-group" style="flex:1;">
                <label>Entrega Real</label>
                <input type="date" id="new-part-real" />
              </div>
            </div>

            <div class="checkbox-wrap" style="margin-bottom:var(--space-5);">
              <input type="checkbox" id="new-part-critico" />
              <label for="new-part-critico" style="font-weight:bold;color:var(--color-danger);">Peça CRÍTICA (Bloqueia Liberação)</label>
            </div>

            <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
              <button class="btn btn-ghost" onclick="closeModal('eq-part-modal')">Cancelar</button>
              <button class="btn btn-primary" onclick="EquipmentPanel.savePart()">Salvar Peça</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAccordion(title, iconId, contentHtml, open = false) {
    const p = AppIcons[iconId] || '';
    return `
      <div class="accordion" style="background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-md);overflow:hidden;">
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
    const body = headerEl.nextElementSibling;
    const icon = headerEl.querySelector('.expand-icon');
    if (body.style.display === 'none') {
      body.style.display = 'block';
      icon.style.transform = 'rotate(180deg)';
    } else {
      body.style.display = 'none';
      icon.style.transform = 'rotate(0deg)';
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
          <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary);">${hReal}<span style="font-size:1rem;color:var(--text-muted);">/${hPlan}h</span></div>
        </div>
        <div style="background:var(--bg-base);padding:var(--space-4);border-radius:var(--radius-md);border-left:3px solid var(--color-warning);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Tarefas Concluídas</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary);">${tasks.filter(t=>t.status==='Concluída').length}<span style="font-size:1rem;color:var(--text-muted);">/${tasks.length}</span></div>
        </div>
        <div style="background:var(--bg-base);padding:var(--space-4);border-radius:var(--radius-md);border-left:3px solid var(--color-danger);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Tarefas Críticas Pendentes</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--color-danger);">${tasks.filter(t=>t.critico && t.status!=='Concluída').length}</div>
        </div>
      </div>
    `;
  }

  function renderDisciplina(tasks, eq, disc) {
    let html = '';
    if (tasks.length === 0) {
      html = `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhuma atividade desta disciplina.</p></div>`;
    } else {
      html = `
        <div class="table-wrap">
          <table style="width:100%;text-align:left;">
            <thead>
              <tr>
                <th style="width:30px;"></th>
                <th>Descrição da Atividade</th>
                <th>Responsável</th>
                <th>Datas (Planejado / Real / Replan)</th>
                <th>Horas</th>
                <th>Status / Avanço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(t => {
                const isChecked = t.status === 'Concluída';
                return `
                <tr style="${isChecked?'opacity:0.6;':''} ${t.critico?'background:rgba(244,67,54,0.05);':''}">
                  <td><input type="checkbox" ${isChecked?'checked':''} disabled /></td>
                  <td>
                    <div style="font-weight:600;${isChecked?'text-decoration:line-through;':''}">${t.descricao}</div>
                    ${t.critico?'<span style="font-size:9px;background:var(--color-danger);color:white;padding:1px 4px;border-radius:2px;font-weight:bold;">CRÍTICO</span>':''}
                  </td>
                  <td>${t.responsavel || '—'}</td>
                  <td>
                    <div style="font-size:10px;margin-bottom:2px"><strong>Plan:</strong> ${formatDate(t.dataPlanejadaInicio)} a ${formatDate(t.dataPlanejadaTermino)}</div>
                    <div style="font-size:10px;margin-bottom:2px"><strong>Real:</strong> ${formatDate(t.dataRealInicio)||'—'} a ${formatDate(t.dataRealTermino)||'—'}</div>
                    <div style="font-size:10px;display:flex;align-items:center;gap:4px;">
                      <strong>Replan:</strong> 
                      <input type="date" value="${t.dataReplanejada||''}" onchange="window.EquipmentPanel.updateTaskField('${t.id}', 'dataReplanejada', this.value)" style="padding:1px;font-size:10px;border:1px solid var(--border-default);border-radius:3px;background:var(--bg-base);color:var(--text-primary)" title="Data Replanejada" />
                    </div>
                  </td>
                  <td style="font-size:11px;">P: ${t.horasPlanejadas||0}h<br/>R: ${t.horasRealizadas||0}h</td>
                  <td>
                    <select class="form-select" style="font-size:11px;padding:2px 4px;height:auto;border-radius:4px;border:1px solid ${t.status==='Falta de Peça'?'var(--color-orange)':'var(--border-hover)'};color:${t.status==='Falta de Peça'?'var(--color-orange)':'inherit'};font-weight:${t.status==='Falta de Peça'?'bold':'normal'};margin-bottom:4px;width:105px;" onchange="window.EquipmentPanel.updateTaskStatus('${t.id}', this.value)">
                      <option value="Não Iniciada" ${t.status==='Não Iniciada'?'selected':''}>Não Iniciada</option>
                      <option value="Em Andamento" ${t.status==='Em Andamento'?'selected':''}>Em Andamento</option>
                      <option value="Falta de Peça" ${t.status==='Falta de Peça'?'selected':''}>Falta de Peça</option>
                      <option value="Concluída" ${t.status==='Concluída'?'selected':''}>Concluída</option>
                    </select>
                    <div style="display:flex;align-items:center;gap:4px;font-size:10px;">
                      Avanço: <input type="number" min="0" max="100" value="${t.pctExecutado||0}" onchange="window.EquipmentPanel.updateTaskField('${t.id}', 'pctExecutado', this.value)" style="width:40px;padding:1px;font-size:10px;text-align:center;border:1px solid var(--border-default);border-radius:3px;background:var(--bg-base);color:var(--text-primary)" title="% de Avanço" /> %
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="EquipmentPanel.deleteTask('${t.id}')" title="Excluir Atividade" style="color:var(--color-danger);padding:4px;">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </td>
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
        <button class="btn btn-outline btn-sm" onclick="EquipmentPanel.openPartModal()" style="color:var(--color-orange);border-color:var(--color-orange);">+ Solicitar Peça</button>
        <button class="btn btn-secondary btn-sm" onclick="EquipmentPanel.openTaskModal('${disc}')">+ Adicionar Atividade</button>
      </div>
    `;
  }

  function renderPecas(parts) {
    let html = '';
    if (parts.length === 0) {
      html = `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhuma peça associada.</p></div>`;
    } else {
      html = `
        <div class="table-wrap">
          <table style="width:100%;text-align:left;">
            <thead>
              <tr>
                <th>Código / Descrição</th>
                <th>Qtd</th>
                <th>Datas (Sol / Prev / Real)</th>
                <th>Fornecedor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${parts.map(p => `
                <tr style="${p.critica?'background:rgba(244,67,54,0.05);':''}">
                  <td>
                    <div style="font-weight:600;">${p.descricao}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${p.codigo}</div>
                    ${p.critica?'<span style="font-size:9px;background:var(--color-danger);color:white;padding:1px 4px;border-radius:2px;font-weight:bold;">IMPACTA LIBERAÇÃO</span>':''}
                  </td>
                  <td>${p.quantidade || 1}</td>
                  <td>
                    <div style="font-size:10px;">Sol: <strong style="color:var(--text-primary)">${p.dataSolicitacao ? formatDate(p.dataSolicitacao) : '—'}</strong></div>
                    <div style="font-size:10px;">Prev: <strong style="color:var(--color-warning)">${p.dataPrevista ? formatDate(p.dataPrevista) : '—'}</strong></div>
                    <div style="font-size:10px;">Real: <strong style="color:var(--color-success)">${p.dataReal ? formatDate(p.dataReal) : '—'}</strong></div>
                  </td>
                  <td>${p.fornecedor || '—'}</td>
                  <td>${statusBadge(p.status)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="EquipmentPanel.deletePart('${p.id}')" title="Excluir Peça" style="color:var(--color-danger);padding:4px;">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    return html + `
      <div style="margin-top:var(--space-3);text-align:right;">
        <button class="btn btn-secondary btn-sm" onclick="EquipmentPanel.openPartModal()">+ Adicionar Peça</button>
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
    return `<div class="alert alert-info" style="margin-bottom:0;"><div class="alert-content">Visualização da timeline e tabela de replanejamentos originais.</div></div>`;
  }

  function renderAnexos() {
    return `<div class="empty-state" style="padding:var(--space-4)"><p>Nenhum anexo. Arraste arquivos aqui.</p></div>`;
  }

  function openTaskModal(disciplina) {
    openModal('eq-task-modal');
    document.getElementById('new-task-disc').value = disciplina;
    document.getElementById('new-task-disc-label').textContent = disciplina.toUpperCase();
    
    document.getElementById('new-task-desc').value = '';
    document.getElementById('new-task-resp').value = '';
    document.getElementById('new-task-horas').value = 0;
    document.getElementById('new-task-ini').value = new Date().toISOString().slice(0,10);
    document.getElementById('new-task-fim').value = new Date().toISOString().slice(0,10);
    document.getElementById('new-task-critico').checked = false;
  }

  function saveTask() {
    const desc = document.getElementById('new-task-desc').value.trim();
    if (!desc) { Toast.error('Erro', 'Descrição é obrigatória.'); return; }

    const newTask = {
      equipmentId: currentEqId,
      codigo: 'ATV-' + Math.floor(Math.random() * 10000),
      descricao: desc,
      disciplina: document.getElementById('new-task-disc').value,
      responsavel: document.getElementById('new-task-resp').value.trim() || 'Não atribuído',
      horasPlanejadas: parseInt(document.getElementById('new-task-horas').value) || 0,
      horasRealizadas: 0,
      dataPlanejadaInicio: document.getElementById('new-task-ini').value,
      dataPlanejadaTermino: document.getElementById('new-task-fim').value,
      pctExecutado: 0,
      status: 'Não Iniciada',
      prioridade: document.getElementById('new-task-critico').checked ? 'Crítica' : 'Média',
      critico: document.getElementById('new-task-critico').checked
    };

    DB.tasks.create(newTask);
    closeModal('eq-task-modal');
    Toast.success('Atividade Adicionada', `A atividade "${desc}" foi criada com sucesso.`);
    Router.navigate('equipment-panel', { id: currentEqId, force: true });
  }

  function deleteTask(id) {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      DB.tasks.delete(id);
      Toast.success('Atividade removida.');
      Router.navigate('equipment-panel', { id: currentEqId, force: true });
    }
  }

  function openPartModal() {
    openModal('eq-part-modal');
    document.getElementById('new-part-cod').value = '';
    document.getElementById('new-part-desc').value = '';
    document.getElementById('new-part-qtd').value = 1;
    document.getElementById('new-part-status').value = 'Solicitada';
    document.getElementById('new-part-critico').checked = false;
    document.getElementById('new-part-sol').value = new Date().toISOString().slice(0,10);
    document.getElementById('new-part-prev').value = '';
    document.getElementById('new-part-real').value = '';
  }

  function savePart() {
    const cod = document.getElementById('new-part-cod').value.trim();
    const desc = document.getElementById('new-part-desc').value.trim();
    if (!cod || !desc) { Toast.error('Erro', 'Código e Descrição são obrigatórios.'); return; }

    const newPart = {
      equipmentId: currentEqId,
      codigo: cod,
      descricao: desc,
      quantidade: parseInt(document.getElementById('new-part-qtd').value) || 1,
      status: document.getElementById('new-part-status').value,
      critica: document.getElementById('new-part-critico').checked,
      fornecedor: '',
      dataSolicitacao: document.getElementById('new-part-sol').value,
      dataPrevista: document.getElementById('new-part-prev').value,
      dataReal: document.getElementById('new-part-real').value
    };

    DB.parts.create(newPart);
    closeModal('eq-part-modal');
    Toast.success('Peça Solicitada', `A solicitação da peça "${desc}" foi registrada.`);
    Router.navigate('equipment-panel', { id: currentEqId, force: true });
  }

  function deletePart(id) {
    if (confirm('Tem certeza que deseja excluir esta peça?')) {
      DB.parts.delete(id);
      Toast.success('Peça removida.');
      Router.navigate('equipment-panel', { id: currentEqId, force: true });
    }
  }

  function updateTaskStatus(id, newStatus) {
    const tasks = DB.tasks.getAll();
    const t = tasks.find(x => x.id === id);
    if(t) {
      t.status = newStatus;
      if (newStatus === 'Concluída') t.pctExecutado = 100;
      window.DB.tasks.update(id, t);
      window.Toast.success('Status da atividade atualizado!');
      window.Router.navigate('equipment-panel', { id: currentEqId, force: true });
    }
  }

  function updateTaskField(id, field, value) {
    const t = window.DB.tasks.get(id);
    if (!t) return;
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
    if (field === 'pctExecutado') {
      window.Router.navigate('equipment-panel', { id: currentEqId, force: true });
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
      const isCrit = t.critico;
      
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
      t.critico ? 'Sim' : 'Não'
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

  return { 
    render, exportTasksCSV, exportEquipmentReport, updateTaskStatus, updateTaskField, deleteTask,
    openPartModal, closePartModal, savePart,
    openTaskModal, closeTaskModal, saveTask,
    openRestrModal, closeRestrModal, saveRestr, closeRestr,
    deleteEquipment 
  };
})();

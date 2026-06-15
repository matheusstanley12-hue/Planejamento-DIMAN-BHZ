window.HomeModule = (() => {
  const BUCKETS = [
    { id: 'sondas-pesquisas', name: 'Sondas de Pesquisas', color: 'var(--brand-primary)' },
    { id: 'bomba-pesquisa', name: 'Bomba de pesquisa', color: 'var(--color-orange)' },
    { id: 'sondas-pocos', name: 'Sondas Poços', color: 'var(--color-success)' },
    { id: 'bombas-pocos', name: 'Bombas de poços', color: 'var(--brand-primary-light)' },
    { id: 'subconjuntos', name: 'Subconjuntos', color: 'var(--color-purple)' },
    { id: 'prog-almoxarifado', name: 'Programação de almoxarifado', color: 'var(--color-info)' },
    { id: 'outros', name: 'Outros Equipamentos', color: 'var(--text-muted)' }
  ];

  function getBucketId(tipo) {
    if (!tipo) return 'outros';
    const t = tipo.trim().toLowerCase();
    if (t.includes('sonda') && t.includes('pesquisa')) return 'sondas-pesquisas';
    if (t.includes('bomba') && t.includes('pesquisa')) return 'bomba-pesquisa';
    if (t.includes('sonda') && (t.includes('poço') || t.includes('poco') || t.includes('pocos') || t.includes('poços'))) return 'sondas-pocos';
    if (t.includes('bomba') && (t.includes('poço') || t.includes('poco') || t.includes('pocos') || t.includes('poços'))) return 'bombas-pocos';
    if (t.includes('subconjunto')) return 'subconjuntos';
    if (t.includes('almoxarifado') || t.includes('programação') || t.includes('programacao')) return 'prog-almoxarifado';
    return 'outros';
  }

  function render() {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const eqs = [...window.DB.equipment.list()].filter(e => {
      if (e.status === 'Liberado') return false; // always hide released
      if (!e.dataLiberacaoPlanejada) return true; // show if no date
      return e.dataLiberacaoPlanejada.startsWith(currentMonthStr);
    });
    // Sort equipment by estimated release date ascending (soonest to leave first)
    eqs.sort((a, b) => {
      const dateA = a.dataLiberacaoAtual || a.dataLiberacaoPlanejada || '9999-12-31';
      const dateB = b.dataLiberacaoAtual || b.dataLiberacaoPlanejada || '9999-12-31';
      return dateA.localeCompare(dateB);
    });

    const parts = window.DB.parts.getAll();
    const restrictions = window.DB.restrictions.getAll();
    const today = new Date().toISOString().slice(0,10);
    const session = window.Auth ? window.Auth.getSession() : null;
    const isAdmin = session && (session.perfil === 'Administrador' || session.perfil === 'Desenvolvedor');

    const emManutencao = eqs.filter(e => e.status !== 'Liberado').length;
    let atrasados = 0;
    eqs.forEach(e => {
      if (e.status !== 'Liberado' && e.dataLiberacaoAtual) {
        const days = daysBetween(today, e.dataLiberacaoAtual);
        if (days < 0) atrasados++;
      }
    });
    
    // Liberações da semana (next 7 days)
    const libsThisWeek = eqs.filter(e => e.status !== 'Liberado' && e.dataLiberacaoAtual && daysBetween(today, e.dataLiberacaoAtual) >= 0 && daysBetween(today, e.dataLiberacaoAtual) <= 7).length;
    const restrAbertas = restrictions.filter(r => r.status === 'Aberta').length;
    const partsPendentes = parts.filter(p => ['Solicitada','Comprada','Em Transporte'].includes(p.status)).length;

    // Initialize buckets
    let bucketsData = {
      'sondas-pesquisas': [],
      'bomba-pesquisa': [],
      'sondas-pocos': [],
      'bombas-pocos': [],
      'subconjuntos': [],
      'prog-almoxarifado': [],
      'outros': []
    };

    eqs.forEach(e => {
      const bucketId = getBucketId(e.tipo);
      const pct = e.pctAvanco || 0;
      const dtPlan = e.dataLiberacaoPlanejada || '';
      const dtPrev = e.dataLiberacaoAtual || dtPlan;
      let desvio = 0;
      if (dtPlan && dtPrev) {
        desvio = daysBetween(dtPlan, dtPrev);
      }
      
      const isManutencao = e.status !== 'Liberado' ? '1' : '0';
      const isAtrasado = (e.status !== 'Liberado' && e.dataLiberacaoAtual && daysBetween(today, e.dataLiberacaoAtual) < 0) ? '1' : '0';
      const isLib7 = (e.status !== 'Liberado' && e.dataLiberacaoAtual && daysBetween(today, e.dataLiberacaoAtual) >= 0 && daysBetween(today, e.dataLiberacaoAtual) <= 7) ? '1' : '0';
      const hasRestr = restrictions.some(r => r.equipmentId === e.id && r.status === 'Aberta') ? '1' : '0';
      const hasPecas = parts.some(p => p.equipmentId === e.id && ['Solicitada','Comprada','Em Transporte'].includes(p.status)) ? '1' : '0';
      
      const prioridade = e.prioridade || 'Normal';
      let prioBadge = '';
      if (prioridade === 'Urgente') {
        prioBadge = `<span class="badge badge-danger" style="margin-left: 6px;">Urgente</span>`;
      } else if (prioridade === 'Alta') {
        prioBadge = `<span class="badge badge-orange" style="margin-left: 6px;">Alta</span>`;
      }

      const cardHtml = `
      <div class="card hover-lift home-eq-card" 
           draggable="true"
           ondragstart="window.HomeModule.drag(event, '${e.id}')"
           ondragend="window.HomeModule.dragEnd(event)"
           data-search="${e.codigo.toLowerCase()} ${e.nome.toLowerCase()}" 
           data-manutencao="${isManutencao}" 
           data-atrasado="${isAtrasado}" 
           data-lib7="${isLib7}" 
           data-restr="${hasRestr}" 
           data-pecas="${hasPecas}" 
           onclick="window.Router.navigate('equipment-panel', {id: '${e.id}'})" 
           style="cursor:grab;display:flex;flex-direction:column;padding:var(--space-4);border-top:4px solid ${pct>=100?'var(--color-success)':pct>0?'var(--brand-primary-light)':'var(--text-muted)'}; margin-bottom: 2px; flex-shrink: 0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2);">
          <div>
            <div style="display:flex;align-items:center;">
              <div style="font-size:1.15rem;font-weight:900;color:var(--text-primary);letter-spacing:-0.02em;">${e.codigo}</div>
              ${prioBadge}
            </div>
            <div style="font-size:10px;font-weight:600;color:var(--text-secondary);margin-top:2px;">O.S.: ${e.os || '—'} &middot; Cliente: ${e.cliente || '—'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${isAdmin ? `
              <button class="btn btn-secondary btn-icon" 
                      style="padding: 2px; border-radius: 4px; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-card); cursor: pointer;" 
                      title="Editar Equipamento"
                      onclick="event.stopPropagation(); window.EquipmentModule.openEdit('${e.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 14px; height: 14px; color: var(--text-secondary);">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.04a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            ` : ''}
            ${isAdmin ? `
              <select onchange="event.stopPropagation(); window.HomeModule.updateEquipmentStatus('${e.id}', this.value)" 
                      onclick="event.stopPropagation();" 
                      class="badge ${e.status === 'Liberado' ? 'badge-success' : e.status === 'Em Manutenção' ? 'badge-primary' : e.status === 'Paralisado' ? 'badge-danger' : e.status === 'Falta de Peças' ? 'badge-warning' : e.status === 'Falta de Mão de Obra' ? 'badge-danger' : 'badge-ghost'}" 
                      style="border:none; cursor:pointer; font-weight:700; padding:2px 8px; outline:none; font-family:var(--font-sans); text-align:center; -webkit-appearance:none; -moz-appearance:none; appearance:none;">
                ${['Em Manutenção', 'Liberado', 'Paralisado', 'Falta de Peças', 'Backlog', 'Falta de Mão de Obra'].map(s => `
                  <option value="${s}" ${e.status === s ? 'selected' : ''} style="background:var(--bg-modal); color:var(--text-primary); font-weight:normal;">${s}</option>
                `).join('')}
              </select>
            ` : statusBadge(e.status)}
          </div>
        </div>
        
        <div style="margin-bottom:var(--space-3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Avanço</span>
            <span style="font-size:var(--text-xs);font-weight:800;color:var(--text-primary);">${pct}%</span>
          </div>
          <div class="progress-track" style="height:6px;"><div class="progress-fill ${pct>=80?'success':pct>=50?'':'warning'}" style="width:${pct}%"></div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-3);background:var(--bg-base);padding:var(--space-2);border-radius:var(--radius-md);">
          <div>
            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;">Plan.</div>
            <div style="font-size:11px;font-weight:600;color:var(--text-secondary);">${dtPlan ? formatDate(dtPlan) : '—'}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;">Prev.</div>
            <div style="font-size:11px;font-weight:700;color:var(--brand-primary-light);">${dtPrev ? formatDate(dtPrev) : '—'}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:var(--space-2);border-top:1px solid var(--border-card);">
          <div style="font-size:10px;color:var(--text-muted);">Desvio no Prazo:</div>
          <div style="font-size:var(--text-xs);font-weight:800;color:var(--color-${desvio>0?'danger':desvio<0?'success':'text-secondary'});">${desvio>0?'+':''}${desvio} dias</div>
        </div>
      </div>
      `;
      bucketsData[bucketId].push(cardHtml);
    });

    const boardHtml = BUCKETS.map(b => {
      const cardsHtml = bucketsData[b.id].join('');
      return `
        <div class="planner-column" 
             data-bucket="${b.id}" 
             ondragover="window.HomeModule.allowDrop(event)"
             ondragenter="window.HomeModule.dragEnter(event)"
             ondragleave="window.HomeModule.dragLeave(event)"
             ondrop="window.HomeModule.drop(event, '${b.id}')"
             style="flex: 0 0 310px; width: 310px; display: flex; flex-direction: column; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-card); padding: var(--space-4); max-height: calc(100vh - 280px); transition: all 0.2s;">
          <div class="planner-column-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); border-bottom: 2px solid ${b.color}; padding-bottom: var(--space-2);">
            <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.name}">${b.name}</h3>
            <span class="column-count badge" style="background: ${b.color}; color: var(--bg-surface); font-size: var(--text-xs); font-weight: 800; border-radius: 12px; padding: 2px 8px; margin-left: 6px;">0</span>
          </div>
          <div class="planner-cards-container" style="display: flex; flex-direction: column; gap: var(--space-3); overflow-y: auto; flex: 1; padding: 2px; min-height: 100px;">
            <div class="no-cards-placeholder" style="text-align: center; color: var(--text-muted); padding: var(--space-6); font-size: var(--text-xs); font-style: italic; border: 1px dashed var(--border-card); border-radius: var(--radius-md); display: none;">Nenhum equipamento</div>
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');

    // Wait a tick to re-apply filter if needed
    setTimeout(() => {
      if (activeCategory) {
        filterByCategory(activeCategory, true);
      } else {
        updateColumnCounts();
      }
    }, 50);

    return `
      <style>
        .planner-board::-webkit-scrollbar {
          height: 8px;
        }
        .planner-board::-webkit-scrollbar-track {
          background: transparent;
        }
        .planner-board::-webkit-scrollbar-thumb {
          background: var(--border-card);
          border-radius: 4px;
        }
        .planner-board::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        .planner-cards-container::-webkit-scrollbar {
          width: 6px;
        }
        .planner-cards-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .planner-cards-container::-webkit-scrollbar-thumb {
          background: var(--border-card);
          border-radius: 3px;
        }
        .planner-cards-container::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        .planner-column.drag-over {
          border: 1px dashed var(--brand-primary) !important;
          background: rgba(255, 255, 255, 0.05) !important;
          transform: scale(1.01);
        }
        .home-eq-card.dragging {
          opacity: 0.4;
        }
      </style>

      <div style="max-width:100%;padding:var(--space-6);">
        <!-- Top Indicators -->
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:var(--space-4);margin-bottom:var(--space-6);">
          <div id="summary-card-manutencao" class="card home-summary-card" style="padding:var(--space-4);text-align:center;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.HomeModule.filterByCategory('manutencao')" title="Clique para filtrar">
            <div style="font-size:var(--text-3xl);font-weight:800;color:var(--brand-primary-light);">${emManutencao}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Em Manutenção</div>
          </div>
          <div id="summary-card-atrasado" class="card home-summary-card" style="padding:var(--space-4);text-align:center;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.HomeModule.filterByCategory('atrasado')" title="Clique para filtrar">
            <div style="font-size:var(--text-3xl);font-weight:800;color:var(--color-danger);">${atrasados}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Atrasados</div>
          </div>
          <div id="summary-card-lib7" class="card home-summary-card" style="padding:var(--space-4);text-align:center;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.HomeModule.filterByCategory('lib7')" title="Clique para filtrar">
            <div style="font-size:var(--text-3xl);font-weight:800;color:var(--color-success);">${libsThisWeek}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Liberações (7 dias)</div>
          </div>
          <div id="summary-card-restr" class="card home-summary-card" style="padding:var(--space-4);text-align:center;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.HomeModule.filterByCategory('restr')" title="Clique para filtrar">
            <div style="font-size:var(--text-3xl);font-weight:800;color:var(--color-warning);">${restrAbertas}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Restrições Abertas</div>
          </div>
          <div id="summary-card-pecas" class="card home-summary-card" style="padding:var(--space-4);text-align:center;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.HomeModule.filterByCategory('pecas')" title="Clique para filtrar">
            <div style="font-size:var(--text-3xl);font-weight:800;color:var(--color-orange);">${partsPendentes}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">Peças Pendentes</div>
          </div>
        </div>

        <!-- Search Bar & Actions -->
        <div style="margin-bottom:var(--space-6); display:flex; gap:var(--space-4); align-items:center; max-width:100%; margin-left:auto; margin-right:auto;">
          <div class="input-group" style="flex:1;">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
            <input type="text" id="home-search" placeholder="Pesquisar equipamento (Ex: SSM-288)..." style="font-size:1.2rem;padding:var(--space-4) var(--space-4) var(--space-4) 40px;" oninput="window.HomeModule.filter(this.value)" />
          </div>
        </div>

        <!-- Kanban Board Horizontal Container -->
        <div class="planner-board" style="display:flex; gap:var(--space-5); overflow-x:auto; overflow-y:hidden; padding-bottom:var(--space-4); align-items:flex-start; width:100%; height:calc(100vh - 260px);">
          ${boardHtml}
        </div>
      </div>
    `;
  }

  function updateColumnCounts() {
    document.querySelectorAll('.planner-column').forEach(column => {
      const cards = column.querySelectorAll('.home-eq-card');
      let visibleCount = 0;
      cards.forEach(card => {
        if (card.style.display !== 'none') {
          visibleCount++;
        }
      });
      const countEl = column.querySelector('.column-count');
      if (countEl) {
        countEl.textContent = visibleCount;
      }
      
      // Toggle visibility of empty columns placeholder
      const placeholder = column.querySelector('.no-cards-placeholder');
      if (placeholder) {
        placeholder.style.display = (visibleCount === 0) ? 'block' : 'none';
      }
    });
  }

  function filter(term) {
    const termLower = term.toLowerCase();
    document.querySelectorAll('.home-eq-card').forEach(card => {
      const searchData = card.getAttribute('data-search');
      if (searchData.includes(termLower)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
    updateColumnCounts();
  }

  let activeCategory = null;

  function filterByCategory(category, force = false) {
    if (activeCategory === category && !force) {
      // Toggle off
      activeCategory = null;
      document.querySelectorAll('.home-eq-card').forEach(c => c.style.display = 'flex');
      document.querySelectorAll('.home-summary-card').forEach(c => c.style.border = 'none');
    } else {
      activeCategory = category;
      document.querySelectorAll('.home-eq-card').forEach(card => {
        if (card.getAttribute('data-' + category) === '1') {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      document.querySelectorAll('.home-summary-card').forEach(c => c.style.border = 'none');
      const activeCard = document.getElementById('summary-card-' + category);
      if (activeCard) activeCard.style.border = '2px solid var(--brand-primary)';
    }
    const searchInput = document.getElementById('home-search');
    if (searchInput) searchInput.value = '';
    updateColumnCounts();
  }

  // Drag and Drop implementation
  function drag(ev, eqId) {
    ev.dataTransfer.setData("text/plain", eqId);
    ev.currentTarget.classList.add('dragging');
    ev.dataTransfer.effectAllowed = "move";
  }

  function dragEnd(ev) {
    ev.currentTarget.classList.remove('dragging');
  }

  function allowDrop(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  }

  function dragEnter(ev) {
    ev.preventDefault();
    const col = ev.currentTarget.closest('.planner-column');
    if (col) col.classList.add('drag-over');
  }

  function dragLeave(ev) {
    const col = ev.currentTarget.closest('.planner-column');
    if (col && (!ev.relatedTarget || !col.contains(ev.relatedTarget))) {
      col.classList.remove('drag-over');
    }
  }

  function drop(ev, bucketId) {
    ev.preventDefault();
    
    const col = ev.currentTarget.closest('.planner-column');
    if (col) col.classList.remove('drag-over');

    const eqId = ev.dataTransfer.getData("text/plain");
    if (!eqId) return;

    const bucket = BUCKETS.find(b => b.id === bucketId);
    if (!bucket) return;

    let targetTipo = bucket.name;
    if (bucketId === 'outros') {
      targetTipo = 'Outros Equipamentos';
    }

    const eq = window.DB.equipment.get(eqId);
    if (eq) {
      if (eq.tipo === targetTipo) return;

      // Update Database
      window.DB.equipment.update(eqId, { tipo: targetTipo });

      // Move element in DOM
      const card = document.querySelector(`.home-eq-card[onclick*="'${eqId}'"]`);
      if (card) {
        const targetContainer = document.querySelector(`.planner-column[data-bucket="${bucketId}"] .planner-cards-container`);
        if (targetContainer) {
          targetContainer.appendChild(card);
        }
      }

      // Recalculate columns
      updateColumnCounts();

      if (window.Toast) {
        window.Toast.success('Equipamento movido', `${eq.codigo} movido para ${targetTipo}`);
      }
    }
  }

  function updateEquipmentStatus(id, newStatus) {
    const eq = window.DB.equipment.get(id);
    if (!eq) return;

    const oldStatus = eq.status;
    if (oldStatus === newStatus) return;

    const updatePayload = { status: newStatus };
    if (newStatus === 'Liberado' && !eq.dataLiberacaoReal) {
      updatePayload.dataLiberacaoReal = new Date().toISOString().slice(0, 10);
    } else if (newStatus !== 'Liberado') {
      updatePayload.dataLiberacaoReal = null;
    }

    window.DB.equipment.update(id, updatePayload);

    // Add timeline event
    window.DB.equipment.addTimeline(id, {
      tipo: newStatus === 'Liberado' ? 'LIBERACAO' : 'STATUS_ALTERADO',
      titulo: `Alteração de Status: ${newStatus}`,
      descricao: `Equipamento alterado de "${oldStatus}" para "${newStatus}"`,
      responsavel: (window.Auth && window.Auth.getSession()?.nome) || 'Sistema'
    });

    if (window.Toast) {
      window.Toast.success('Status Atualizado', `Equipamento ${eq.codigo} alterado para ${newStatus}`);
    }

    // Re-render
    const currentRoute = window.Router ? window.Router.current : 'home';
    window.Router.navigate(currentRoute, { force: true });
  }

  return { 
    render, 
    filter, 
    filterByCategory,
    drag,
    dragEnd,
    allowDrop,
    dragEnter,
    dragLeave,
    drop,
    updateEquipmentStatus
  };
})();

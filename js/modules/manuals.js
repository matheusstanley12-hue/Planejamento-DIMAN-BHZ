window.ManualsAdmin = (() => {
  function render() {
    const session = window.Auth.getSession();
    if (!session || (!window.Auth.hasPermission('equipment') && !window.Auth.hasPermission('admin'))) {
      return `<div class="page-container"><div class="empty-state">Acesso negado.</div></div>`;
    }

    const manuals = window.DB.manuals.list() || [];
    const equipments = window.DB.equipment.list() || [];


    let groupedHTML = '';
    
    if (manuals.length === 0) {
      groupedHTML = `
        <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-xl);">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;margin:0 auto var(--space-4);color:var(--text-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <h3 style="font-weight:600;color:var(--text-primary);margin-bottom:var(--space-2);">Nenhum manual encontrado</h3>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);">Clique em "Novo Manual" para começar a organizar.</p>
        </div>
      `;
    } else {
      const grouped = {};
      manuals.forEach(m => {
        if (!grouped[m.equipmentId]) grouped[m.equipmentId] = [];
        grouped[m.equipmentId].push(m);
      });

      groupedHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-6);">`;
      
      for (const eqId in grouped) {
        const eq = equipments.find(e => e.id === eqId);
        const eqName = eq ? eq.name : 'Equipamento Desconhecido';
        const eqManuals = grouped[eqId];
        
        groupedHTML += `
          <div style="background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
            <div style="background:rgba(59,130,246,0.05);padding:var(--space-4);border-bottom:1px solid var(--border-card);display:flex;align-items:center;gap:var(--space-3);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;color:var(--brand-primary);"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
              <h2 style="font-size:var(--text-lg);font-weight:700;color:var(--text-primary);margin:0;">Pasta: ${eqName}</h2>
              <span class="badge badge-primary" style="margin-left:auto;">${eqManuals.length} item(ns)</span>
            </div>
            <div style="padding:var(--space-4);display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:var(--space-4);">
              ${eqManuals.map(m => `
                <div class="card" style="padding:var(--space-4);display:flex;flex-direction:column;border:1px solid var(--border-hover);border-radius:var(--radius-md);background:var(--bg-base);">
                  <div style="flex:1;">
                    <h3 style="font-weight:700;color:var(--text-primary);font-size:var(--text-base);line-height:1.3;margin-bottom:var(--space-2);">${m.title}</h3>
                    ${m.description ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.4;">${m.description}</p>` : '<div style="margin-bottom:var(--space-4);"></div>'}
                  </div>
                  <div style="display:flex;gap:var(--space-2);">
                    <a href="${m.link}" target="_blank" class="btn btn-ghost" style="flex:1;display:flex;justify-content:center;gap:4px;font-size:var(--text-sm);background:rgba(59,130,246,0.1);color:var(--brand-primary);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg> Abrir</a>
                    <button onclick="ManualsAdmin.deleteManual('${m.id}')" class="btn btn-ghost" style="padding:0 var(--space-3);color:var(--color-danger);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.158 0c-.31-.08-.62-.15-.93-.21m-14.158 0c.31-.08.62-.15.93-.21m14.158 0c-1.3-.31-2.6-.61-3.9-.91M6.83 5.79c1.3-.31 2.6-.61 3.9-.91M9 3h6m-6 0c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1zm6 0c0-.55.45-1 1-1h1c.55 0 1 .45 1 1z"/></svg></button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      groupedHTML += `</div>`;
    }

    return `
      <div class="page-container" style="animation:fadeIn 0.3s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6);">
          <div>
            <h1 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);letter-spacing:-0.02em;">Gestão de Manuais</h1>
            <p style="color:var(--text-secondary);margin-top:var(--space-1);">Organize arquivos PDF, guias e esquemas em pastas por equipamento.</p>
          </div>
          <button onclick="ManualsAdmin.showAddManualModal()" class="btn btn-primary" style="display:flex;align-items:center;gap:var(--space-2);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Novo Manual
          </button>
        </div>
        ${groupedHTML}
      </div>
    `;
  }

  function showAddManualModal() {
    const equipments = window.DB.equipment.list() || [];
    const modalId = `modal-${Date.now()}`;
    const modalHTML = `
      <div id="${modalId}" class="modal-overlay" style="display:flex;animation:fadeIn 0.2s ease;">
        <div class="modal" style="width:100%;max-width:500px;animation:slideUp 0.3s ease;">
          <div class="modal-header" style="border-bottom:1px solid var(--border-hover);">
            <h3 style="font-weight:700;color:var(--text-primary);">Adicionar Manual</h3>
            <button class="modal-close" onclick="document.getElementById('${modalId}').remove()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div class="form-group">
              <label>Equipamento Vinculado</label>
              <select id="man-equipment" class="form-control" required>
                ${equipments.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Título do Manual</label>
              <input type="text" id="man-title" class="form-control" placeholder="Ex: Manual de Manutenção Hidráulica" required />
            </div>
            <div class="form-group">
              <label>Descrição (Opcional)</label>
              <textarea id="man-desc" class="form-control" rows="2" placeholder="Ex: Vista explodida e tabela de torques..."></textarea>
            </div>
            <div class="form-group">
              <label>Caminho do Arquivo ou Link (Drive / Computador)</label>
              <input type="text" id="man-link" class="form-control" placeholder="Ex: C:\\Manuais\\Sonda.pdf ou https://" required />
              <small style="color:var(--text-muted);display:block;margin-top:4px;">Cole o link da web ou o caminho da pasta no seu computador.</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-man">Salvar Manual</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btn-save-man').addEventListener('click', () => {
      const eqId = document.getElementById('man-equipment').value;
      const title = document.getElementById('man-title').value.trim();
      const desc = document.getElementById('man-desc').value.trim();
      const link = document.getElementById('man-link').value.trim();

      if (!title || !link) {
        if (window.Toast) window.Toast.error('Erro', 'Preencha o título e o link.');
        return;
      }

      window.DB.manuals.add({
        id: window.DB.uid('man'),
        equipmentId: eqId,
        title: title,
        description: desc,
        link: link
      });

      if (window.Toast) window.Toast.success('Sucesso', 'Manual cadastrado.');
      document.getElementById(modalId).remove();
      window.Router.navigate('manuals', { force: true });
    });
  }

  async function deleteManual(id) {
    if (!(await window.confirmAsync('Atenção', 'Tem certeza que deseja excluir este manual? Ele deixará de ser visível para os executantes.', true))) return;
    window.DB.manuals.delete(id);
    if (window.Toast) window.Toast.success('Excluído', 'Manual excluído com sucesso.');
    window.Router.navigate('manuals', { force: true });
  }

  return { render, deleteManual, showAddManualModal };
})();

window.WorkerManuals = (() => {
  function render() {
    const session = window.Auth.getSession();
    if (!session || session.perfil !== 'Executante') return `<div class="page-container">Acesso restrito.</div>`;

    const allEquipments = window.DB.equipment.list() || [];
    const allManuals = window.DB.manuals.list() || [];

    // Worker's allocated equipment
    const workerEquipments = [];
    allEquipments.forEach(eq => {
      if (eq.workers && eq.workers.includes(session.matricula)) {
        workerEquipments.push(eq);
      }
    });

    if (workerEquipments.length === 0) {
      return `
        <div class="page-container" style="animation:fadeIn 0.3s ease;">
          <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-6);">Meus Manuais</h1>
          <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-xl);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;margin:0 auto var(--space-4);color:var(--text-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h3 style="color:var(--text-primary);font-weight:600;">Sem Equipamento Alocado</h3>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:8px;">Você não possui equipamentos vinculados. Logo, não há manuais disponíveis.</p>
          </div>
        </div>
      `;
    }

    const eqIds = workerEquipments.map(e => e.id);
    const workerManuals = allManuals.filter(m => eqIds.includes(m.equipmentId));

    return `
      <div class="page-container" style="animation:fadeIn 0.3s ease;">
        <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-2);">Meus Manuais</h1>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-6);">Acesse a documentação técnica dos equipamentos em que você trabalha.</p>
        
        ${workerManuals.length === 0 ? `
          <div class="empty-state" style="padding:var(--space-6);text-align:center;background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-lg);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;margin:0 auto var(--space-4);color:var(--border-hover);"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            <h3 style="font-weight:600;color:var(--text-primary);margin-bottom:var(--space-2);">Nenhum manual encontrado</h3>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);">Não há manuais cadastrados para os seus equipamentos atuais.</p>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:var(--space-6);">
            ${Object.keys(grouped).map(eqId => {
              const eq = workerEquipments.find(e => e.id === eqId);
              const manuals = grouped[eqId];
              return `
                <div style="background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
                  <div style="background:rgba(59,130,246,0.05);padding:var(--space-4);border-bottom:1px solid var(--border-card);display:flex;align-items:center;gap:var(--space-3);">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;color:var(--brand-primary);"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
                    <h2 style="font-size:var(--text-lg);font-weight:700;color:var(--text-primary);margin:0;">Pasta: ${eq ? eq.name : 'Equipamento'}</h2>
                    <span class="badge badge-primary" style="margin-left:auto;">${manuals.length}</span>
                  </div>
                  <div style="padding:var(--space-4);display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:var(--space-4);">
                    ${manuals.map(m => `
                      <div class="card" style="padding:var(--space-4);display:flex;flex-direction:column;border:1px solid var(--border-hover);border-radius:var(--radius-md);background:var(--bg-base);">
                        <div style="flex:1;">
                          <h3 style="font-weight:700;color:var(--text-primary);font-size:var(--text-base);line-height:1.3;margin-bottom:var(--space-2);">${m.title}</h3>
                          ${m.description ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.4;">${m.description}</p>` : '<div style="margin-bottom:var(--space-4);"></div>'}
                        </div>
                        <a href="${m.link}" target="_blank" class="btn btn-primary" style="width:100%;display:flex;justify-content:center;gap:8px;">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                          Acessar Manual
                        </a>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  return { render };
})();

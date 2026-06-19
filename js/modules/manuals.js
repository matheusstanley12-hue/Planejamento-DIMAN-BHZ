window.ManualsAdmin = (() => {
  let currentFolderId = null;

  function navToFolder(id) {
    currentFolderId = id;
    window.Router.navigate('manuals', { force: true });
  }

  function render() {
    const session = window.Auth.getSession();
    if (!session || (!window.Auth.hasPermission('equipment') && !window.Auth.hasPermission('admin'))) {
      return `<div class="page-container"><div class="empty-state">Acesso negado.</div></div>`;
    }

    const allManuals = window.DB.manuals.list() || [];
    const allFolders = window.DB.manualFolders ? (window.DB.manualFolders.list() || []) : [];
    const equipments = window.DB.equipment.list() || [];

    let currentFolder = currentFolderId ? allFolders.find(f => f.id === currentFolderId) : null;
    if (currentFolderId && !currentFolder) currentFolderId = null;

    const childFolders = allFolders.filter(f => (f.parentId || null) === currentFolderId);
    const childManuals = allManuals.filter(m => (m.folderId || null) === currentFolderId);

    // Breadcrumbs
    let breadcrumbs = [];
    let f = currentFolder;
    while(f) {
      breadcrumbs.unshift(f);
      f = allFolders.find(x => x.id === f.parentId);
    }
    
    let breadcrumbHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-4);font-size:14px;background:var(--bg-card);padding:10px 15px;border-radius:8px;border:1px solid var(--border-card);">
       <a href="#" onclick="event.preventDefault(); ManualsAdmin.navToFolder(null)" style="color:${currentFolderId===null?'var(--text-primary)':'var(--brand-primary)'};font-weight:600;text-decoration:none;">Raiz</a>
    `;
    breadcrumbs.forEach((bc, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      breadcrumbHTML += ` <span style="color:var(--text-muted);">/</span> <a href="#" onclick="event.preventDefault(); ManualsAdmin.navToFolder('${bc.id}')" style="color:${isLast?'var(--text-primary)':'var(--brand-primary)'};font-weight:600;text-decoration:none;">${bc.name}</a>`;
    });
    breadcrumbHTML += `</div>`;

    let contentHTML = '';
    
    if (childFolders.length === 0 && childManuals.length === 0) {
      contentHTML = `
        <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px dashed var(--border-card);border-radius:var(--radius-xl);">
          <p style="color:var(--text-secondary);">Esta pasta está vazia.</p>
        </div>
      `;
    } else {
      contentHTML += `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:var(--space-4);">`;
      
      childFolders.forEach(folder => {
        let eqBadge = '';
        if (folder.equipmentId) {
           const eq = equipments.find(e => e.id === folder.equipmentId);
           if (eq) eqBadge = `<span class="badge badge-secondary" style="font-size:10px;margin-top:4px;">Eq: ${eq.codigo || eq.name}</span>`;
        }
        contentHTML += `
          <div class="card" style="padding:var(--space-4);border:1px solid var(--border-card);border-radius:var(--radius-md);background:var(--bg-card);display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.2s;" onclick="ManualsAdmin.navToFolder('${folder.id}')" onmouseover="this.style.borderColor='var(--brand-primary)'" onmouseout="this.style.borderColor='var(--border-card)'">
             <svg xmlns="http://www.w3.org/2000/svg" fill="var(--brand-primary)" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:40px;height:40px;opacity:0.8;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" /></svg>
             <div style="flex:1;">
               <h3 style="margin:0;font-size:15px;font-weight:600;color:var(--text-primary);">${folder.name}</h3>
               ${eqBadge}
             </div>
             <button onclick="event.stopPropagation(); ManualsAdmin.deleteFolder('${folder.id}')" class="btn btn-ghost" style="padding:4px;color:var(--color-danger);"><svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        `;
      });
      
      childManuals.forEach(m => {
        let eqBadge = '';
        if (!m.folderId && m.equipmentId) {
           const eq = equipments.find(e => e.id === m.equipmentId);
           if (eq) eqBadge = `<span class="badge badge-secondary" style="font-size:10px;">Eq: ${eq.codigo || eq.name}</span>`;
        }
        contentHTML += `
          <div class="card" style="padding:var(--space-4);display:flex;flex-direction:column;border:1px solid var(--border-hover);border-radius:var(--radius-md);background:var(--bg-base);">
            <div style="flex:1;">
              <h3 style="font-weight:700;color:var(--text-primary);font-size:var(--text-base);line-height:1.3;margin-bottom:var(--space-2);">${m.title}</h3>
              ${eqBadge}
              ${m.description ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:8px;line-height:1.4;">${m.description}</p>` : '<div style="margin-bottom:var(--space-4);"></div>'}
            </div>
            <div style="display:flex;gap:var(--space-2);margin-top:10px;">
              <a href="${m.link}" target="_blank" class="btn btn-ghost" style="flex:1;display:flex;justify-content:center;gap:4px;font-size:var(--text-sm);background:rgba(59,130,246,0.1);color:var(--brand-primary);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg> Abrir</a>
              <button onclick="ManualsAdmin.deleteManual('${m.id}')" class="btn btn-ghost" style="padding:0 var(--space-3);color:var(--color-danger);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.158 0c-.31-.08-.62-.15-.93-.21m-14.158 0c.31-.08.62-.15.93-.21m14.158 0c-1.3-.31-2.6-.61-3.9-.91M6.83 5.79c1.3-.31 2.6-.61 3.9-.91M9 3h6m-6 0c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1zm6 0c0-.55.45-1 1-1h1c.55 0 1 .45 1 1z"/></svg></button>
            </div>
          </div>
        `;
      });
      contentHTML += `</div>`;
    }

    return `
      <div class="page-container" style="animation:fadeIn 0.3s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6);">
          <div>
            <h1 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);letter-spacing:-0.02em;">Gestão de Arquivos</h1>
            <p style="color:var(--text-secondary);margin-top:var(--space-1);">Organize arquivos em pastas e subpastas.</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="ManualsAdmin.showAddFolderModal()" class="btn btn-secondary" style="display:flex;align-items:center;gap:var(--space-2);">
              + Nova Pasta
            </button>
            <button onclick="ManualsAdmin.showAddManualModal()" class="btn btn-primary" style="display:flex;align-items:center;gap:var(--space-2);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Anexar Arquivo
            </button>
          </div>
        </div>
        ${breadcrumbHTML}
        ${contentHTML}
      </div>
    `;
  }

  function showAddFolderModal() {
    const equipments = window.DB.equipment.list() || [];
    const modalId = `modal-${Date.now()}`;
    // Only allow equipment binding on root folders
    const eqFieldHTML = currentFolderId === null ? `
      <div class="form-group">
        <label>Restringir a Equipamento (Opcional)</label>
        <select id="fol-equipment" class="form-control">
          <option value="">-- Global (Todos visualizam) --</option>
          ${equipments.map(e => `<option value="${e.id}">${e.codigo || e.name}</option>`).join('')}
        </select>
        <small style="color:var(--text-muted);display:block;margin-top:4px;">Se selecionar um equipamento, apenas os mecânicos dele verão esta pasta.</small>
      </div>
    ` : '';

    const modalHTML = `
      <div id="${modalId}" class="modal-overlay open" style="display:flex;animation:fadeIn 0.2s ease;">
        <div class="modal" style="width:100%;max-width:500px;animation:slideUp 0.3s ease;">
          <div class="modal-header" style="border-bottom:1px solid var(--border-hover);">
            <h3 style="font-weight:700;color:var(--text-primary);">Nova Pasta</h3>
            <button class="modal-close" onclick="document.getElementById('${modalId}').remove()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div class="form-group">
              <label>Nome da Pasta *</label>
              <input type="text" id="fol-name" class="form-control" placeholder="Ex: Hidráulica" required />
            </div>
            ${eqFieldHTML}
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-fol">Criar Pasta</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btn-save-fol').addEventListener('click', () => {
      const name = document.getElementById('fol-name').value.trim();
      const eqSelect = document.getElementById('fol-equipment');
      const eqId = eqSelect ? eqSelect.value : null;

      if (!name) {
        if (window.Toast) window.Toast.error('Erro', 'Preencha o nome da pasta.');
        return;
      }

      window.DB.manualFolders.add({
        id: window.DB.uid('fol'),
        name: name,
        parentId: currentFolderId,
        equipmentId: eqId || null
      });

      if (window.Toast) window.Toast.success('Sucesso', 'Pasta criada.');
      document.getElementById(modalId).remove();
      window.Router.navigate('manuals', { force: true });
    });
  }

  function showAddManualModal() {
    const modalId = `modal-${Date.now()}`;
    const modalHTML = `
      <div id="${modalId}" class="modal-overlay open" style="display:flex;animation:fadeIn 0.2s ease;">
        <div class="modal" style="width:100%;max-width:500px;animation:slideUp 0.3s ease;">
          <div class="modal-header" style="border-bottom:1px solid var(--border-hover);">
            <h3 style="font-weight:700;color:var(--text-primary);">Anexar Arquivo</h3>
            <button class="modal-close" onclick="document.getElementById('${modalId}').remove()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div class="form-group">
              <label>Nome do Arquivo *</label>
              <input type="text" id="man-title" class="form-control" placeholder="Ex: Catálogo de Peças SSM" required />
            </div>
            <div class="form-group">
              <label>Tipo de Anexo</label>
              <select id="man-type" class="form-control" onchange="
                document.getElementById('man-link-wrap').style.display = this.value === 'link' ? 'block' : 'none';
                document.getElementById('man-file-wrap').style.display = this.value === 'file' ? 'block' : 'none';
              ">
                  <option value="link">Link da Web (Google Drive, etc)</option>
                  <option value="file">Arquivo do Computador</option>
              </select>
            </div>
            <div class="form-group" id="man-link-wrap">
              <label>Endereço do Link *</label>
              <input type="url" id="man-link" class="form-control" placeholder="Ex: https://drive.google.com/..." />
            </div>
            <div class="form-group" id="man-file-wrap" style="display:none;">
              <label>Selecione o Arquivo *</label>
              <input type="file" id="man-file" class="form-control" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" />
              <small style="color:#d9534f;display:block;margin-top:4px;">Aviso: Sem um servidor em nuvem (Bucket), os arquivos ficam no cachê. Limite máximo: 1MB.</small>
            </div>
            <div class="form-group">
              <label>Descrição (Opcional)</label>
              <textarea id="man-desc" class="form-control" rows="2" placeholder="Informações adicionais..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-man">Salvar Arquivo</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btn-save-man').addEventListener('click', () => {
      const title = document.getElementById('man-title').value.trim();
      const desc = document.getElementById('man-desc').value.trim();
      const type = document.getElementById('man-type').value;
      
      if (!title) {
        if (window.Toast) window.Toast.error('Erro', 'Preencha o nome do arquivo.');
        return;
      }

      const saveFile = (finalLink) => {
          window.DB.manuals.add({
            id: window.DB.uid('man'),
            folderId: currentFolderId,
            title: title,
            description: desc,
            link: finalLink,
            equipmentId: null
          });
          if(window.Toast) window.Toast.success('Sucesso', 'Arquivo anexado com sucesso!');
          document.getElementById(modalId).remove();
          window.Router.navigate('manuals', { force: true });
      };

      if (type === 'link') {
         const link = document.getElementById('man-link').value.trim();
         if(!link) return window.Toast && window.Toast.error('Erro', 'Preencha o link.');
         saveFile(link);
      } else {
         const fileInput = document.getElementById('man-file');
         if(!fileInput.files || fileInput.files.length === 0) return window.Toast && window.Toast.error('Erro', 'Selecione um arquivo.');
         const file = fileInput.files[0];
         
         if (file.size > 1536000) {
            return window.Toast && window.Toast.error('Erro', 'O arquivo excede o limite de 1.5MB. Use um link externo.');
         }
         
         const reader = new FileReader();
         reader.onload = function(e) {
             saveFile(e.target.result);
         };
         reader.readAsDataURL(file);
      }
    });
  }

  async function deleteFolder(id) {
    if (!(await window.confirmAsync('Atenção', 'Tem certeza que deseja excluir esta pasta e TUDO que houver dentro dela?', true))) return;
    
    // Recursive delete function to remove subfolders and their files
    const deleteRecursively = (folderId) => {
        const allFolders = window.DB.manualFolders.list() || [];
        const allManuals = window.DB.manuals.list() || [];
        
        // delete files inside
        const files = allManuals.filter(m => m.folderId === folderId);
        files.forEach(f => window.DB.manuals.delete(f.id));
        
        // delete subfolders
        const subfolders = allFolders.filter(f => f.parentId === folderId);
        subfolders.forEach(sf => deleteRecursively(sf.id));
        
        window.DB.manualFolders.delete(folderId);
    };

    deleteRecursively(id);

    if (window.Toast) window.Toast.success('Excluído', 'Pasta excluída com sucesso.');
    window.Router.navigate('manuals', { force: true });
  }

  async function deleteManual(id) {
    if (!(await window.confirmAsync('Atenção', 'Tem certeza que deseja excluir este arquivo?', true))) return;
    window.DB.manuals.delete(id);
    if (window.Toast) window.Toast.success('Excluído', 'Arquivo excluído.');
    window.Router.navigate('manuals', { force: true });
  }

  return { render, navToFolder, deleteFolder, deleteManual, showAddFolderModal, showAddManualModal };
})();

window.WorkerManuals = (() => {
  let currentFolderId = null;

  function navToFolder(id) {
    currentFolderId = id;
    window.Router.navigate('worker-manuals', { force: true });
  }

  function render() {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session) return `<div class="page-container">Sessão expirada.</div>`;

    const allEquipments = window.DB.equipment.list() || [];
    const allManuals = window.DB.manuals.list() || [];
    const allFolders = window.DB.manualFolders ? (window.DB.manualFolders.list() || []) : [];

    // Worker's allocated equipment
    const workerEquipments = [];
    allEquipments.forEach(eq => {
      if (eq.workers && eq.workers.includes(session.matricula)) {
        workerEquipments.push(eq);
      }
    });
    const eqIds = workerEquipments.map(e => e.id);

    let currentFolder = currentFolderId ? allFolders.find(f => f.id === currentFolderId) : null;
    if (currentFolderId && !currentFolder) currentFolderId = null;

    // Filter logic
    // Worker sees a folder if: it has no equipmentId (Global) OR its equipmentId is in eqIds (Allocated Eq)
    let childFolders = allFolders.filter(f => (f.parentId || null) === currentFolderId);
    if (currentFolderId === null) {
      childFolders = childFolders.filter(f => !f.equipmentId || eqIds.includes(f.equipmentId));
    }
    
    // For manual files without folderId (legacy), filter similarly
    let childManuals = allManuals.filter(m => (m.folderId || null) === currentFolderId);
    if (currentFolderId === null) {
      childManuals = childManuals.filter(m => !m.equipmentId || eqIds.includes(m.equipmentId));
    }

    if (currentFolderId === null && childFolders.length === 0 && childManuals.length === 0) {
      return `
        <div class="page-container" style="animation:fadeIn 0.3s ease;">
          <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-6);">Documentos</h1>
          <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-xl);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;margin:0 auto var(--space-4);color:var(--text-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h3 style="color:var(--text-primary);font-weight:600;">Sem Documentos</h3>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:8px;">Não há arquivos disponíveis para você no momento.</p>
          </div>
        </div>
      `;
    }

    // Breadcrumbs
    let breadcrumbs = [];
    let f = currentFolder;
    while(f) {
      breadcrumbs.unshift(f);
      f = allFolders.find(x => x.id === f.parentId);
    }
    
    let breadcrumbHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-4);font-size:14px;background:var(--bg-card);padding:10px 15px;border-radius:8px;border:1px solid var(--border-card);">
       <a href="#" onclick="event.preventDefault(); WorkerManuals.navToFolder(null)" style="color:${currentFolderId===null?'var(--text-primary)':'var(--brand-primary)'};font-weight:600;text-decoration:none;">Raiz</a>
    `;
    breadcrumbs.forEach((bc, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      breadcrumbHTML += ` <span style="color:var(--text-muted);">/</span> <a href="#" onclick="event.preventDefault(); WorkerManuals.navToFolder('${bc.id}')" style="color:${isLast?'var(--text-primary)':'var(--brand-primary)'};font-weight:600;text-decoration:none;">${bc.name}</a>`;
    });
    breadcrumbHTML += `</div>`;

    let contentHTML = '';
    
    if (childFolders.length === 0 && childManuals.length === 0) {
      contentHTML = `
        <div class="empty-state" style="padding:var(--space-8);text-align:center;background:var(--bg-card);border:1px dashed var(--border-card);border-radius:var(--radius-xl);">
          <p style="color:var(--text-secondary);">Esta pasta está vazia.</p>
        </div>
      `;
    } else {
      contentHTML += `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:var(--space-4);">`;
      
      childFolders.forEach(folder => {
        contentHTML += `
          <div class="card" style="padding:var(--space-4);border:1px solid var(--border-card);border-radius:var(--radius-md);background:var(--bg-card);display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.2s;" onclick="WorkerManuals.navToFolder('${folder.id}')" onmouseover="this.style.borderColor='var(--brand-primary)'" onmouseout="this.style.borderColor='var(--border-card)'">
             <svg xmlns="http://www.w3.org/2000/svg" fill="var(--brand-primary)" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:40px;height:40px;opacity:0.8;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" /></svg>
             <div style="flex:1;">
               <h3 style="margin:0;font-size:15px;font-weight:600;color:var(--text-primary);">${folder.name}</h3>
             </div>
          </div>
        `;
      });
      
      childManuals.forEach(m => {
        contentHTML += `
          <div class="card" style="padding:var(--space-4);display:flex;flex-direction:column;border:1px solid var(--border-hover);border-radius:var(--radius-md);background:var(--bg-base);">
            <div style="flex:1;">
              <h3 style="font-weight:700;color:var(--text-primary);font-size:var(--text-base);line-height:1.3;margin-bottom:var(--space-2);">${m.title}</h3>
              ${m.description ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4);line-height:1.4;">${m.description}</p>` : '<div style="margin-bottom:var(--space-4);"></div>'}
            </div>
            <a href="${m.link}" target="_blank" class="btn btn-primary" style="width:100%;display:flex;justify-content:center;gap:8px;margin-top:10px;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
              Acessar
            </a>
          </div>
        `;
      });
      contentHTML += `</div>`;
    }

    return `
      <div class="page-container" style="animation:fadeIn 0.3s ease;">
        <h1 style="font-size:var(--text-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-2);">Documentos</h1>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-6);">Navegue pelas pastas para acessar manuais e arquivos técnicos.</p>
        ${breadcrumbHTML}
        ${contentHTML}
      </div>
    `;
  }

  return { render, navToFolder };
})();

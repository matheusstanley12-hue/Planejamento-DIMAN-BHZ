window.WaitingModule = (() => {
  function render() {
    const eqs = DB.equipment.list().filter(e => e.status === 'Aguardando Manutenção' || e.status === 'Backlog');
    return `
      <div class="page-container" style="animation: fadeIn 0.3s ease;">
        <div class="section-header">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <div style="width:36px;height:36px;background:var(--brand-primary);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>Aguardando Manutenção / Backlog<div class="section-subtitle">Equipamentos programados, em backlog ou aguardando atividades</div></div>
          </div>
        </div>
        <div class="equipment-grid" style="display:grid;gap:var(--space-4);grid-template-columns:repeat(auto-fill,minmax(300px,1fr));">
          ${eqs.length > 0 ? eqs.map(eq => `
            <div class="card eq-card" onclick="Router.navigate('equipment-panel',{id:'${eq.id}'})" style="cursor:pointer;padding:var(--space-4);border-left:4px solid ${eq.status === 'Backlog' ? 'var(--color-info)' : 'var(--color-warning)'};">
              <div class="card-header" style="padding-bottom:var(--space-2); display: flex; justify-content: space-between; align-items: start;">
                <div class="card-title" style="font-size:1.4rem;font-weight:900;">${eq.codigo}</div>
                <span class="badge ${eq.status === 'Backlog' ? 'badge-info' : 'badge-warning'}">${eq.status}</span>
              </div>
              <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4)">${eq.nome || ''}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);">
                ${eq.cliente ? `<span>Cliente: ${eq.cliente} &middot; O.S.: ${eq.os || '—'}</span>` : ''}
              </div>
            </div>
          `).join('') : '<div style="grid-column:1/-1;padding:var(--space-6);color:var(--text-muted);text-align:center;">Nenhum equipamento aguardando manutenção ou em backlog.</div>'}
        </div>
      </div>
    `;
  }
  return { render };
})();

window.QrGeneratorModule = (() => {
  function render() {
    const user = Auth.getSession();
    if (user?.perfil !== 'Administrador' && user?.perfil !== 'Desenvolvedor') {
      return `<div class="page-container"><div class="alert alert-danger" style="margin-top:20px;"><div class="alert-content">Acesso Restrito: Apenas Administradores podem gerar QR Codes.</div></div></div>`;
    }

    const equipments = DB.equipment.list() || [];

    const cardsHtml = equipments.length > 0 ? equipments.map(eq => {
      const pct = eq.pctAvanco || 0;
      const statusColors = {
        'Em Manutenção': 'var(--brand-primary-light)',
        'Aguardando Manutenção': 'var(--color-warning)',
        'Liberado': 'var(--color-success)',
        'Bloqueado': 'var(--color-danger)',
        'Paralisado': 'var(--color-danger)',
        'Falta de Peças': 'var(--color-warning)',
      };
      const borderColor = statusColors[eq.status] || 'var(--border-card)';

      return `
        <div class="card" style="margin-bottom:var(--space-4);border-left:4px solid ${borderColor};padding:var(--space-5);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3);">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2);">
                <div style="font-size:1.3rem;font-weight:900;color:var(--text-primary);">${eq.codigo}</div>
                ${statusBadge ? statusBadge(eq.status) : ''}
              </div>
              <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3);">${eq.nome}</div>
              <div style="display:flex;align-items:center;gap:var(--space-4);font-size:var(--text-xs);color:var(--text-muted);">
                <span>Cliente: <strong style="color:var(--text-secondary);">${eq.cliente || '-'}</strong></span>
                <span>OS: <strong style="color:var(--text-secondary);">${eq.os || '-'}</strong></span>
                <span>Avanço: <strong style="color:var(--text-secondary);">${pct}%</strong></span>
              </div>
            </div>
            <div style="display:flex;gap:var(--space-2);">
              <button class="btn btn-secondary" onclick="window.open('#qrview?id=${eq.id}', '_blank')">Visualizar Prévia</button>
              <button class="btn btn-primary" onclick="QrGeneratorModule.generateQR('${eq.id}', '${eq.codigo}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                Gerar QR Code
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('') : '<div class="empty-state">Nenhum equipamento cadastrado.</div>';

    return `
      <div class="page-container" style="animation: fadeIn 0.3s ease;">
        <div class="section-header">
          <div class="section-title">
            <div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg></div>
            <div>Gerador de QR Code<div class="section-subtitle">Gere etiquetas QR Code para acesso rápido às informações do equipamento</div></div>
          </div>
        </div>
        <div class="alert alert-info" style="margin-bottom:var(--space-5);">
          <div class="alert-content">
            <strong>Acesso em Tempo Real:</strong> O QR Code gerado possui um link permanente. Qualquer pessoa que escanear o QR Code verá o status do equipamento em tempo real, atualizado automaticamente. Não é necessário gerar um novo QR Code quando as informações mudam.
          </div>
        </div>
        <div>${cardsHtml}</div>
      </div>
    `;
  }

  function generateQR(id, codigo) {
    const url = window.location.origin + window.location.pathname + '#qrview?id=' + id;
    
    const modalHtml = `
      <div class="modal-overlay" id="qr-modal" style="z-index:9999;">
        <div class="modal" style="max-width:400px;text-align:center;">
          <div class="modal-header">
            <div class="modal-title">QR Code - ${codigo}</div>
            <button class="modal-close" onclick="document.getElementById('qr-modal').remove()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="modal-body">
            <div style="background:white;padding:20px;border-radius:12px;display:inline-block;margin-bottom:20px;">
              <div id="qr-container"></div>
            </div>
            <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4);">Este QR Code aponta para o visualizador público em tempo real deste equipamento.</p>
          </div>
          <div class="modal-footer" style="display:flex;gap:var(--space-3);justify-content:center;">
            <button class="btn btn-ghost" onclick="document.getElementById('qr-modal').remove()">Fechar</button>
            <button class="btn btn-primary" onclick="QrGeneratorModule.downloadQR('${codigo}')">Baixar QR</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    if (typeof QRCode !== 'undefined') {
      new QRCode(document.getElementById("qr-container"), {
        text: url,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
    } else {
      document.getElementById("qr-container").innerHTML = '<p style="color:red">Erro: QRCode.js não carregado</p>';
    }
  }

  function downloadQR(codigo) {
    const container = document.getElementById("qr-container");
    if (!container || !container.querySelector('canvas')) {
      Toast && Toast.error('Erro', 'QR Code não gerado corretamente.');
      return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.style.padding = '40px';
    wrapper.style.background = '#ffffff';
    wrapper.style.textAlign = 'center';
    wrapper.innerHTML = `
      <h2 style="color:#0f172a;margin-bottom:20px;font-family:sans-serif;">Equipamento: ${codigo}</h2>
    `;
    const canvasClone = document.createElement('canvas');
    canvasClone.width = 200; canvasClone.height = 200;
    canvasClone.getContext('2d').drawImage(container.querySelector('canvas'), 0, 0);
    wrapper.appendChild(canvasClone);
    
    document.body.appendChild(wrapper);
    const opt = {
      margin:       1,
      filename:     `QR_${codigo}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(wrapper).save().then(() => {
      document.body.removeChild(wrapper);
    });
  }

  return { render, generateQR, downloadQR };
})();

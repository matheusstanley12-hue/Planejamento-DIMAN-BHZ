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
              <button class="btn btn-primary" onclick="QrGeneratorModule.downloadDirectPDF('${eq.id}', '${eq.codigo}', \`${eq.nome ? eq.nome.replace(/`/g, '') : ''}\`)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Baixar QR Code (PDF)
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

  function downloadDirectPDF(id, codigo, nome) {
    const url = window.location.origin + window.location.pathname + '#qrview?id=' + id;
    
    // Create a temporary hidden container for the QR Code
    const tempQrContainer = document.createElement('div');
    tempQrContainer.style.position = 'absolute';
    tempQrContainer.style.left = '-9999px';
    document.body.appendChild(tempQrContainer);

    if (typeof QRCode !== 'undefined') {
      new QRCode(tempQrContainer, {
        text: url,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      // Wait for canvas to render
      setTimeout(() => {
        const canvas = tempQrContainer.querySelector('canvas');
        if (!canvas) {
          document.body.removeChild(tempQrContainer);
          return alert('Falha ao gerar QR Code interno.');
        }
        
        const dataUrl = canvas.toDataURL("image/png");
        document.body.removeChild(tempQrContainer);
        
        const pdfHtml = `
          <div style="width: 600px; background: #ffffff; padding: 40px; box-sizing: border-box; font-family: Arial, sans-serif;">
            <div style="background: white; padding: 40px; border-radius: 16px; text-align: center; border: 2px solid #e2e8f0;">
              <div style="font-size: 32px; font-weight: 900; color: #0f172a; margin-bottom: 10px; text-transform: uppercase;">${nome || codigo}</div>
              <div style="font-size: 20px; font-weight: 600; color: #64748b; margin-bottom: 30px;">Ativo: ${codigo}</div>
              <div style="background: white; padding: 20px; display: inline-block; border-radius: 12px; border: 1px solid #cbd5e1;">
                <img src="${dataUrl}" style="width: 250px; height: 250px; display: block;" />
              </div>
              <div style="font-size: 16px; color: #64748b; margin-top: 20px;">Escaneie a etiqueta para acessar o histórico e solicitar serviços</div>
              <div style="margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">Gerado por Planejamento Geosol &bull; DIMAN-BHZ</div>
            </div>
          </div>
        `;
        
        const opt = {
          margin:       0.5,
          filename:     `QR_Code_${codigo}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        Toast && Toast.info('Gerando PDF...', 'Aguarde um instante...');
        
        if (window.html2pdf) {
          window.html2pdf().set(opt).from(pdfHtml).save().then(() => {
            Toast && Toast.success('PDF Gerado', 'O download foi iniciado!');
          }).catch(e => {
            console.error("html2pdf error:", e);
            Toast && Toast.error('Erro', 'Não foi possível gerar o PDF.');
          });
        } else {
          alert("A biblioteca html2pdf não está disponível.");
        }
      }, 150);
      
    } else {
      document.body.removeChild(tempQrContainer);
      alert("A biblioteca QRCode.js não está carregada.");
    }
  }

  return { render, downloadDirectPDF };
})();

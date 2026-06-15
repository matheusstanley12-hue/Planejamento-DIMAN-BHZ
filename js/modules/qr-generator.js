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
    
    // Create the visible overlay for html2canvas
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '999999';
    overlay.style.background = 'rgba(248, 250, 252, 0.95)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const loadingText = document.createElement('div');
    loadingText.innerText = 'Gerando PDF, aguarde...';
    loadingText.style.fontSize = '20px';
    loadingText.style.fontWeight = 'bold';
    loadingText.style.color = '#334155';
    loadingText.style.marginBottom = '20px';
    loadingText.style.fontFamily = 'Arial, sans-serif';
    overlay.appendChild(loadingText);

    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.style.background = '#ffffff';
    wrapper.style.padding = '40px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.fontFamily = 'Arial, sans-serif';
    wrapper.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    const contentBox = document.createElement('div');
    contentBox.style.background = 'white';
    contentBox.style.padding = '40px';
    contentBox.style.borderRadius = '16px';
    contentBox.style.textAlign = 'center';
    contentBox.style.border = '2px solid #e2e8f0';
    wrapper.appendChild(contentBox);

    const title = document.createElement('div');
    title.style.fontSize = '32px';
    title.style.fontWeight = '900';
    title.style.color = '#0f172a';
    title.style.marginBottom = '20px';
    title.style.textTransform = 'uppercase';
    title.innerText = nome || codigo;
    contentBox.appendChild(title);

    const qrBorder = document.createElement('div');
    qrBorder.style.background = 'white';
    qrBorder.style.padding = '20px';
    qrBorder.style.display = 'inline-block';
    qrBorder.style.borderRadius = '12px';
    qrBorder.style.border = '1px solid #cbd5e1';
    contentBox.appendChild(qrBorder);

    // This container is VISIBLE on screen, preventing the browser from deferring the canvas draw
    const qrContainer = document.createElement('div');
    qrContainer.style.width = '250px';
    qrContainer.style.height = '250px';
    qrContainer.style.display = 'flex';
    qrContainer.style.justifyContent = 'center';
    qrContainer.style.alignItems = 'center';
    qrBorder.appendChild(qrContainer);

    const footer1 = document.createElement('div');
    footer1.style.fontSize = '16px';
    footer1.style.color = '#64748b';
    footer1.style.marginTop = '20px';
    footer1.innerText = 'Aponte a câmera para consultar o status e o histórico do equipamento';
    contentBox.appendChild(footer1);

    const footer2 = document.createElement('div');
    footer2.style.marginTop = '30px';
    footer2.style.fontSize = '12px';
    footer2.style.color = '#94a3b8';
    footer2.style.borderTop = '1px solid #e2e8f0';
    footer2.style.paddingTop = '20px';
    footer2.innerHTML = 'Gerado por Planejamento Geosol &bull; DIMAN-BHZ';
    contentBox.appendChild(footer2);

    if (typeof QRCode !== 'undefined') {
      // Draw directly into the visible container
      new QRCode(qrContainer, {
        text: url,
        width: 250,
        height: 250,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      // Poll until QRCode.js finishes setting the base64 src on its generated <img> tag
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const generatedImg = qrContainer.querySelector('img');
        
        // Timeout after 5 seconds (50 attempts)
        if (attempts > 50) {
            clearInterval(checkInterval);
            document.body.removeChild(overlay);
            return alert('Tempo limite excedido ao gerar o código QR interno.');
        }

        // QRCode.js inserts an <img> tag and assigns it a data URI when finished rendering
        if (generatedImg && generatedImg.src && generatedImg.src.startsWith('data:image')) {
            clearInterval(checkInterval);
            
            // Give the browser 100ms to actually paint the generatedImg to the screen just in case
            setTimeout(() => {
              const opt = {
                margin:       0.5,
                filename:     `QR_Code_${codigo}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
              };
              
              if (window.html2pdf) {
                window.html2pdf().set(opt).from(wrapper).save().then(() => {
                  document.body.removeChild(overlay);
                  Toast && Toast.success('PDF Gerado', 'O download foi concluído!');
                }).catch(e => {
                  document.body.removeChild(overlay);
                  console.error("html2pdf error:", e);
                  Toast && Toast.error('Erro', 'Não foi possível gerar o PDF.');
                });
              } else {
                document.body.removeChild(overlay);
                alert("A biblioteca html2pdf não está disponível.");
              }
            }, 100);
        }
      }, 100);
      
    } else {
      document.body.removeChild(overlay);
      alert("A biblioteca QRCode.js não está carregada.");
    }
  }

  return { render, downloadDirectPDF };
})();

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
    const url = window.location.origin + window.location.pathname + '?qrview=' + id + '#qrview?id=' + id;
    
    // Fallback if QRCode is missing
    if (typeof QRCode === 'undefined') {
      return alert("A biblioteca QRCode.js não está carregada.");
    }

    Toast && Toast.info('Gerando PDF...', 'Aguarde um instante...');

    // Create a temporary container to generate the QR Code canvas
    const tempQrContainer = document.createElement('div');
    tempQrContainer.style.position = 'absolute';
    tempQrContainer.style.left = '-9999px';
    document.body.appendChild(tempQrContainer);

    new QRCode(tempQrContainer, {
      text: url,
      width: 250,
      height: 250,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
    
    // Wait for QRCode.js to draw
    setTimeout(() => {
      const canvas = tempQrContainer.querySelector('canvas');
      if (!canvas) {
        document.body.removeChild(tempQrContainer);
        return Toast && Toast.error('Erro', 'Falha ao gerar QR Code interno.');
      }

      // Extract the base64 image data from the canvas
      const dataUrl = canvas.toDataURL("image/png");
      document.body.removeChild(tempQrContainer);

      try {
        // Use jsPDF directly to avoid all html2canvas rendering bugs
        const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
        
        // Dimensions and math for centering
        const boxW = 160;
        const boxH = 175;
        const startX = (210 - boxW) / 2; // Centers horizontally (25)
        const startY = 35; // Top margin

        // 1. Draw Card Border
        doc.setDrawColor(226, 232, 240); // #e2e8f0
        doc.setLineWidth(0.5);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(startX, startY, boxW, boxH, 5, 5, 'FD');

        // 2. Title
        const titleStr = (nome || codigo).toUpperCase();
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42); // #0f172a
        doc.setFontSize(26);
        doc.text(titleStr, 105, startY + 22, { align: 'center' });

        // 3. QR Code Border Box
        const qrW = 75;
        const qrH = 75;
        const qrX = 105 - (qrW / 2);
        const qrY = startY + 40;
        
        doc.setDrawColor(203, 213, 225); // #cbd5e1
        doc.roundedRect(qrX - 5, qrY - 5, qrW + 10, qrH + 10, 3, 3, 'S');

        // 4. Inject QR Code Image Native
        doc.addImage(dataUrl, 'PNG', qrX, qrY, qrW, qrH);

        // 5. Instruction Text
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); // #64748b
        doc.setFontSize(12);
        doc.text("Aponte a câmera para consultar o status", 105, qrY + qrH + 20, { align: 'center' });
        doc.text("e o histórico do equipamento", 105, qrY + qrH + 26, { align: 'center' });

        // 6. Footer Divider Line
        doc.setDrawColor(226, 232, 240);
        doc.line(startX + 15, qrY + qrH + 40, startX + boxW - 15, qrY + qrH + 40);

        // 7. Footer Text
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // #94a3b8
        doc.text("Gerado por Planejamento Geosol • DIMAN-BHZ", 105, qrY + qrH + 50, { align: 'center' });

        // Save the PDF!
        doc.save(`QR_Code_${codigo}.pdf`);
        Toast && Toast.success('PDF Gerado', 'O download foi concluído!');

      } catch (e) {
        console.error("jsPDF error:", e);
        Toast && Toast.error('Erro', 'Não foi possível gerar o documento.');
      }
    }, 250);
  }

  return { render, downloadDirectPDF };
})();

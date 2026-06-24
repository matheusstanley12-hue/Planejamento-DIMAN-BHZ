/* ================================================================
   PLANEJAMENTO DIMAN-BHZ — Modules Batch 3
   Costs, Planning, KPI, Simulator, AI Assistant
   Meeting Mode, Timeline, Lessons, Reports, Audit, Users, Impacts
   ================================================================ */

// ================================================================
// COSTS MODULE
// ================================================================
window.CostsModule = (() => {
  function render() {
    const costs = DB.costs.list();
    const eqs = DB.equipment.list();
    const equipMap = {};
    eqs.forEach(e => { equipMap[e.id] = e.codigo; });

    const totalPl = costs.reduce((s,c)=>s+(c.valorPlanejado||0),0);
    const totalRl = costs.reduce((s,c)=>s+(c.valorRealizado||0),0);
    const devTotal = totalPl ? Math.round((totalRl-totalPl)/totalPl*100) : 0;

    // Per equipment
    const byEq = {};
    costs.forEach(c => {
      if (!byEq[c.equipmentId]) byEq[c.equipmentId] = { pl:0, rl:0 };
      byEq[c.equipmentId].pl += c.valorPlanejado||0;
      byEq[c.equipmentId].rl += c.valorRealizado||0;
    });

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>Centro de Custos</div>
        <button class="btn btn-primary" onclick="CostsModule.openCreate()">+ Novo Lançamento</button>
      </div>

      <!-- Top KPIs -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-5);margin-bottom:var(--space-5);">
        <div class="card" style="text-align:center;padding:var(--space-6);">
          <div style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:.06em;margin-bottom:var(--space-2)">Custo Total Planejado</div>
          <div style="font-size:var(--text-3xl);font-weight:800;color:var(--brand-primary-light)">${formatCurrency(totalPl)}</div>
        </div>
        <div class="card" style="text-align:center;padding:var(--space-6);">
          <div style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:.06em;margin-bottom:var(--space-2)">Custo Total Realizado</div>
          <div style="font-size:var(--text-3xl);font-weight:800;color:${totalRl>totalPl?'var(--color-danger)':'var(--color-success)'}">${formatCurrency(totalRl)}</div>
        </div>
        <div class="card" style="text-align:center;padding:var(--space-6);border-color:${devTotal>10?'rgba(244,67,54,.3)':devTotal>0?'rgba(255,179,0,.3)':'rgba(0,200,83,.3)'};">
          <div style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:.06em;margin-bottom:var(--space-2)">Desvio Total</div>
          <div style="font-size:var(--text-3xl);font-weight:800;color:${devTotal>10?'var(--color-danger)':devTotal>0?'var(--color-warning)':'var(--color-success)'}">${devTotal > 0 ? '+' : ''}${devTotal}%</div>
        </div>
      </div>

      <!-- Per Equipment Table -->
      <div class="card" style="margin-bottom:var(--space-5);">
        <div class="card-header"><div class="card-title">Custos por Equipamento</div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Equipamento</th><th>Planejado</th><th>Realizado</th><th>Desvio</th><th>Semáforo</th></tr></thead>
          <tbody>
            ${Object.entries(byEq).map(([eqId, v]) => {
              const dev = v.pl ? Math.round((v.rl-v.pl)/v.pl*100) : 0;
              const cls = dev > 10 ? 'danger' : dev > 0 ? 'warning' : 'success';
              const icon = dev > 10 ? '🔴' : dev > 0 ? '🟡' : '🟢';
              return `<tr>
                <td style="font-weight:700">${equipMap[eqId]||eqId}</td>
                <td>${formatCurrency(v.pl)}</td>
                <td style="color:${v.rl>v.pl?'var(--color-danger)':'var(--color-success)'};font-weight:700">${formatCurrency(v.rl)}</td>
                <td><span class="badge badge-${cls}">${dev>0?'+':''}${dev}%</span></td>
                <td style="font-size:1.2rem">${icon}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>

      <!-- Cost entries -->
      <div class="table-wrap"><table>
        <thead><tr><th>Equipamento</th><th>Categoria</th><th>Descrição</th><th>Planejado</th><th>Realizado</th><th>Data</th><th>Ações</th></tr></thead>
        <tbody>
          ${costs.map(c=>`<tr>
            <td>${equipMap[c.equipmentId]||'—'}</td>
            <td><span class="badge badge-ghost">${c.categoria}</span></td>
            <td style="font-size:var(--text-xs)">${c.descricao}</td>
            <td>${formatCurrency(c.valorPlanejado)}</td>
            <td style="color:${c.valorRealizado>c.valorPlanejado?'var(--color-danger)':'var(--color-success)'};font-weight:700">${formatCurrency(c.valorRealizado)}</td>
            <td>${formatDate(c.data)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="CostsModule.delete('${c.id}')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397"/></svg></button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="modal-cost"><div class="modal"><div class="modal-header"><div class="modal-title">Lançamento de Custo</div><button class="modal-close" onclick="closeModal('modal-cost')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
    <div class="modal-body" id="cost-modal-body"></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-cost')">Cancelar</button><button class="btn btn-primary" onclick="CostsModule.save()">Salvar</button></div></div></div>`;
  }

  function openCreate() {
    const eqs = DB.equipment.list();
    const cats = ['Mão de Obra','Peças','Serviços Terceiros','Frete','Custos Extras'];
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('cost-modal-body').innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-row"><div class="form-group"><label>Equipamento *</label><select id="cs-eq">${eqs.map(e=>`<option value="${e.id}">${e.codigo}</option>`).join('')}</select></div>
      <div class="form-group"><label>Categoria *</label><select id="cs-cat">${cats.map(c=>`<option>${c}</option>`).join('')}</select></div></div>
      <div class="form-group"><label>Descrição</label><input id="cs-desc" /></div>
      <div class="form-row"><div class="form-group"><label>Valor Planejado (R$)</label><input type="number" id="cs-pl" min="0" step="0.01" /></div>
      <div class="form-group"><label>Valor Realizado (R$)</label><input type="number" id="cs-rl" min="0" step="0.01" /></div></div>
      <div class="form-group"><label>Data</label><input type="date" id="cs-data" value="${today}" /></div>
    </div>`;
    openModal('modal-cost');
  }

  function save() {
    const data = {
      equipmentId: document.getElementById('cs-eq').value,
      categoria: document.getElementById('cs-cat').value,
      descricao: document.getElementById('cs-desc').value,
      valorPlanejado: parseFloat(document.getElementById('cs-pl').value)||0,
      valorRealizado: parseFloat(document.getElementById('cs-rl').value)||0,
      data: document.getElementById('cs-data').value,
    };
    DB.costs.create(data);
    closeModal('modal-cost');
    Router.navigate('costs', { force: true });
    Toast.success('Custo registrado!');
  }

  function _delete(id) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem excluir registros.');
      return;
    }
    confirmDialog('Excluir Lançamento', 'Tem certeza?', () => { DB.costs.delete(id); Router.navigate('costs', { force: true }); });
  }

  return { render, openCreate, save, delete: _delete };
})();

// ================================================================
// PLANNING MODULE (Curva de Avanço)
// ================================================================
window.PlanningModule = (() => {
  let planChart = null;

  function render() {
    const eqs = DB.equipment.list();
    const allTasks = DB.tasks.getAll();
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter(t=>t.status==='Concluída').length;
    const realizado = totalTasks ? Math.round(doneTasks/totalTasks*100) : 0;
    const planejado = 78;
    const desvio = realizado - planejado;
    const devCls = desvio >= 0 ? 'success' : desvio >= -10 ? 'warning' : 'danger';

    setTimeout(() => {
      if (planChart) { try { planChart.destroy(); } catch(e){} }
      const canvas = document.getElementById('plan-chart');
      if (!canvas || !window.Chart) return;
      const labels = [];
      const plData = [];
      const rlData = [];
      for (let i = 20; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(`${d.getDate()}/${d.getMonth()+1}`);
        plData.push(Math.min(100, Math.round((20-i)/20*planejado + Math.random()*3)));
        rlData.push(Math.min(100, Math.round((20-i)/20*realizado + Math.random()*2)));
      }
      planChart = new Chart(canvas, {
        type:'line', data: {
          labels,
          datasets: [
            { label:'Planejado', data:plData, borderColor:'rgba(30,136,229,1)', backgroundColor:'rgba(30,136,229,.1)', fill:true, tension:.4, borderWidth:2 },
            { label:'Realizado', data:rlData, borderColor: desvio >= 0 ? 'rgba(0,200,83,1)' : 'rgba(244,67,54,1)', backgroundColor: desvio >= 0 ? 'rgba(0,200,83,.1)' : 'rgba(244,67,54,.1)', fill:true, tension:.4, borderWidth:2 }
          ]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#8EACC8',font:{family:'Inter',size:11}}}}, scales:{x:{ticks:{color:'#8EACC8',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},y:{min:0,max:100,ticks:{color:'#8EACC8',callback:v=>v+'%'},grid:{color:'rgba(255,255,255,0.04)'}}} }
      });
    }, 100);

    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25"/></svg></div>Planejamento & Replanejamento</div></div>

      <!-- Curva de Avanço Real -->
      <div class="card" style="margin-bottom:var(--space-5);">
        <div class="card-header"><div class="card-title">📊 Curva de Avanço Real</div></div>
        <div style="display:flex;gap:var(--space-6);align-items:center;margin-bottom:var(--space-5);flex-wrap:wrap;">
          <div style="text-align:center;"><div style="font-size:2.5rem;font-weight:900;color:var(--brand-primary-light);line-height:1">${planejado}%</div><div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-top:4px;">PLANEJADO</div></div>
          <div style="text-align:center;"><div style="font-size:2.5rem;font-weight:900;color:var(--color-${devCls});line-height:1">${realizado}%</div><div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-top:4px;">REALIZADO</div></div>
          <div style="text-align:center;"><div style="font-size:2.5rem;font-weight:900;color:var(--color-${devCls});line-height:1">${desvio > 0 ? '+' : ''}${desvio}%</div><div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-top:4px;">DESVIO</div></div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-left:auto;">
            <div style="opacity:${desvio<-15?1:0.3};font-size:0.95rem;display:flex;align-items:center;gap:8px;">🔴 <span style="color:var(--text-primary);font-weight:600;">Crítico (&lt;-15%)</span></div>
            <div style="opacity:${desvio>=-15&&desvio<-5?1:0.3};font-size:0.95rem;display:flex;align-items:center;gap:8px;">🟡 <span style="color:var(--text-primary);font-weight:600;">Atenção (-5% a -15%)</span></div>
            <div style="opacity:${desvio>=-5?1:0.3};font-size:0.95rem;display:flex;align-items:center;gap:8px;">🟢 <span style="color:var(--text-primary);font-weight:600;">OK (&gt;-5%)</span></div>
          </div>
        </div>
        <div style="position:relative;height:260px;width:100%;margin-top:var(--space-4);">
          <canvas id="plan-chart"></canvas>
        </div>
      </div>

      <!-- Replanning by equipment -->
      <div class="card">
        <div class="card-header"><div class="card-title">Histórico de Replanejamentos</div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Equipamento</th><th>Cliente</th><th>Data Original 🔒</th><th>Replanejamentos</th><th>Dias Acumulados</th><th>Última Causa</th></tr></thead>
          <tbody>
            ${eqs.map(e => {
              const repls = e.replanning || [];
              const totalDays = repls.reduce((s,r) => s + daysBetween(r.dataAnterior, r.novaData), 0);
              return `<tr>
                <td><strong>${e.codigo}</strong></td>
                <td>${e.cliente}</td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${formatDate(e.dataLiberacaoPlanejada)} <span style="color:var(--color-warning)">🔒</span></td>
                <td>${repls.length > 0 ? `<span class="badge badge-warning">${repls.length}× replanejado</span>` : '<span class="badge badge-success">Sem reprogramação</span>'}</td>
                <td>${totalDays > 0 ? `<span style="color:var(--color-danger);font-weight:700">+${totalDays} dias</span>` : '—'}</td>
                <td style="font-size:var(--text-xs);color:var(--text-muted)">${repls.length>0?repls[repls.length-1].motivo?.slice(0,60)+'...':'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>
    </div>`;
  }

  function destroy() { if (planChart) { try { planChart.destroy(); } catch(e){} planChart = null; } }
  return { render, destroy };
})();

// ================================================================
// KPI MODULE
// ================================================================
window.KPIModule = (() => {
  function render() {
    const stats = DB.kpi.getEquipmentStats();
    const eqs = DB.equipment.list();
    const allTasks = DB.tasks.getAll();
    const ts = DB.timesheets.list();
    const hPlan = allTasks.reduce((s,t)=>s+(t.horasPlanejadas||0),0);
    const hReal = allTasks.reduce((s,t)=>s+(t.horasRealizadas||0),0);
    const eficiencia = hPlan > 0 ? Math.min(100, Math.round(hPlan/hReal*100)) : 100;

    const mtbf = DB.kpi.getMTBF();
    const mttr = DB.kpi.getMTTR();
    const disp = (mtbf && mttr) ? Math.round(parseFloat(mtbf)/(parseFloat(mtbf)+parseFloat(mttr))*100) : 0;

    const kpis = [
      {label:'Aderência ao Planejamento', value:`${stats.aderencia}%`, cls:stats.aderencia>=90?'success':stats.aderencia>=70?'warning':'danger'},
      {label:'MTBF (Médio)', value:mtbf ? `${mtbf}d` : 'N/D', cls:'info'},
      {label:'MTTR (Médio)', value:mttr ? `${mttr}d` : 'N/D', cls:'info'},
      {label:'Disponibilidade', value:`${disp}%`, cls:disp>=90?'success':'warning'},
      {label:'Produtividade', value:`${eficiencia}%`, cls:eficiencia>=80?'success':eficiencia>=60?'warning':'danger'},
      {label:'Eficiência', value:`${eficiencia}%`, cls:eficiencia>=80?'success':'warning'},
      {label:'Backlog de Tarefas', value:allTasks.filter(t=>t.status!=='Concluída').length, cls:'warning'},
      {label:'% Conclusão', value:`${stats.pctAvancoGeral}%`, cls:'primary'},
      {label:'Horas Planejadas', value:`${hPlan.toFixed(0)}h`, cls:'primary'},
      {label:'Horas Realizadas', value:`${hReal.toFixed(0)}h`, cls:'info'},
      {label:'Tarefas Críticas', value:stats.criticas, cls:'danger'},
      {label:'Equipamentos no Prazo', value:`${eqs.filter(e=>e.status==='Em Manutenção'&&e.dataLiberacaoPlanejada&&e.dataLiberacaoPlanejada>=new Date().toISOString().slice(0,10)).length}/${eqs.filter(e=>e.status==='Em Manutenção').length}`, cls:'success'},
    ];

    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"/></svg></div>Indicadores de Performance (KPI)</div></div>
      <div class="kpi-grid stagger">
        ${kpis.map(k=>`<div class="kpi-card ${k.cls}">
          <div class="kpi-value">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>`).join('')}
      </div>

      <!-- MTBF/MTTR per equipment -->
      <div class="card" style="margin-top:var(--space-5);">
        <div class="card-header"><div class="card-title">MTBF / MTTR por Equipamento</div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Equipamento</th><th>Cliente</th><th>MTBF</th><th>MTTR</th><th>Disponibilidade</th><th>Status</th></tr></thead>
          <tbody>
            ${eqs.map(e=>{
              const mtbf = DB.kpi.getMTBF(e.id);
              const mttr = DB.kpi.getMTTR(e.id);
              const disp = (mtbf && mttr) ? Math.round(parseFloat(mtbf)/(parseFloat(mtbf)+parseFloat(mttr))*100) : 0;
              return `<tr>
                <td><strong>${e.codigo}</strong></td>
                <td>${e.cliente}</td>
                <td><span class="badge badge-info">${mtbf}d</span></td>
                <td><span class="badge badge-warning">${mttr}d</span></td>
                <td><span class="badge badge-${disp>=90?'success':disp>=70?'warning':'danger'}">${disp}%</span></td>
                <td>${statusBadge(e.status)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>
    </div>`;
  }
  return { render };
})();

// ================================================================
// SIMULATOR MODULE
// ================================================================
window.SimulatorModule = (() => {
  let params = { mechanics: 3, electrics: 2, caldeiraria: 1, usinagem: 1, partsArrivalDays: 7, overtime: 0, weekends: false };

  function calcImpact() {
    const eqId = window.GlobalEqFilter;
    const eq = DB.equipment.get(eqId);
    if (!eq) return null;
    const workDaysRemaining = daysBetween(new Date().toISOString().slice(0,10), eq.dataLiberacaoPlanejada || new Date().toISOString().slice(0,10));

    let gainMechanics = parseFloat(((params.mechanics - 3) * 1.5).toFixed(1));
    let gainElectrics = parseFloat(((params.electrics - 2) * 1.2).toFixed(1));
    let gainCaldeiraria = parseFloat(((params.caldeiraria - 1) * 1.0).toFixed(1));
    let gainUsinagem = parseFloat(((params.usinagem - 1) * 1.0).toFixed(1));

    const critParts = DB.parts.getAll().filter(p => p.equipmentId === eqId && p.critica && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
    let gainParts = 0;
    if (critParts.length > 0) {
      const estimatedArrival = 7;
      const actualArrival = params.partsArrivalDays;
      gainParts = Math.max(0, estimatedArrival - actualArrival);
    }

    let gainOvertime = 0;
    if (params.overtime > 0 && workDaysRemaining > 0) {
      gainOvertime = Math.round(params.overtime / 8 * workDaysRemaining * 0.5);
    }

    let gainWeekends = 0;
    if (params.weekends && workDaysRemaining > 0) {
      gainWeekends = Math.round(workDaysRemaining / 5 * 2 * 0.3);
    }

    let totalGain = gainMechanics + gainElectrics + gainCaldeiraria + gainUsinagem + gainParts + gainOvertime + gainWeekends;
    totalGain = parseFloat(totalGain.toFixed(1));
    
    const today = new Date().toISOString().slice(0,10);
    const newDate = addDays(eq.dataLiberacaoPlanejada || today, -Math.round(totalGain));

    return { gainMechanics, gainElectrics, gainCaldeiraria, gainUsinagem, gainParts, gainOvertime, gainWeekends, totalGain, newDate, workDaysRemaining, eq };
  }

  function render() {
    const eqId = window.GlobalEqFilter;
    const eqs = DB.equipment.list().filter(e => e.status === 'Em Manutenção');
    const impact = eqId ? calcImpact() : null;

    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M4.745 3A23.933 23.933 0 003 12c0 3.183.62 6.22 1.745 9M19.255 3A23.933 23.933 0 0121 12c0 3.183-.62 6.22-1.745 9M8.25 8.885l1.444-.89a.75.75 0 011.105.402l2.402 7.214a.75.75 0 001.104.401l1.445-.889m-8.25.75l.213.09a1.687 1.687 0 002.062-.617l4.45-6.676a1.688 1.688 0 012.062-.618l.213.09"/></svg></div>Simulador de Liberação</div></div>
      <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-5)">Simule o impacto de alterações de recursos na data de liberação do equipamento</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);">
        <!-- Parameters panel -->
        <div class="card">
          <div class="card-header"><div class="card-title">⚙️ Parâmetros da Simulação</div></div>
          <div style="display:flex;flex-direction:column;gap:var(--space-5);">
            <div class="form-group"><label>Equipamento *</label>
              <select onchange="SimulatorModule.setEq(this.value)">
                <option value="">Selecione um equipamento...</option>
                ${eqs.map(e=>`<option value="${e.id}" ${eqId===e.id?'selected':''}>${e.codigo} — ${e.cliente}</option>`).join('')}
              </select>
            </div>
            ${eqId ? `
            <div>
              <label>Mecânicos: <strong id="sim-mech-val">${params.mechanics}</strong></label>
              <input type="range" min="0" max="12" value="${params.mechanics}" oninput="SimulatorModule.setParam('mechanics',+this.value);document.getElementById('sim-mech-val').textContent=this.value" style="width:100%;margin-top:var(--space-2);" />
            </div>
            <div>
              <label>Eletricistas: <strong id="sim-elec-val">${params.electrics}</strong></label>
              <input type="range" min="0" max="8" value="${params.electrics}" oninput="SimulatorModule.setParam('electrics',+this.value);document.getElementById('sim-elec-val').textContent=this.value" style="width:100%;margin-top:var(--space-2);" />
            </div>
            <div>
              <label>Caldeiraria: <strong id="sim-cald-val">${params.caldeiraria}</strong></label>
              <input type="range" min="0" max="8" value="${params.caldeiraria}" oninput="SimulatorModule.setParam('caldeiraria',+this.value);document.getElementById('sim-cald-val').textContent=this.value" style="width:100%;margin-top:var(--space-2);" />
            </div>
            <div>
              <label>Usinagem: <strong id="sim-usin-val">${params.usinagem}</strong></label>
              <input type="range" min="0" max="8" value="${params.usinagem}" oninput="SimulatorModule.setParam('usinagem',+this.value);document.getElementById('sim-usin-val').textContent=this.value" style="width:100%;margin-top:var(--space-2);" />
            </div>
            <div class="form-group"><label>Chegada das Peças Críticas (dias)</label>
              <input type="number" min="1" max="60" value="${params.partsArrivalDays}" onchange="SimulatorModule.setParam('partsArrivalDays',+this.value)" /></div>
            <div>
              <label>Horas Extras por Dia: <strong id="sim-ot-val">${params.overtime}h</strong></label>
              <input type="range" min="0" max="4" value="${params.overtime}" oninput="SimulatorModule.setParam('overtime',+this.value);document.getElementById('sim-ot-val').textContent=this.value+'h'" style="width:100%;margin-top:var(--space-2);" />
            </div>
            <div class="checkbox-wrap"><input type="checkbox" id="sim-wk" ${params.weekends?'checked':''} onchange="SimulatorModule.setParam('weekends',this.checked)" /><label for="sim-wk">Trabalhar nos Fins de Semana</label></div>
            ` : '<div class="empty-state" style="padding:var(--space-8)"><p>Selecione um equipamento para começar</p></div>'}
          </div>
        </div>

        <!-- Results panel -->
        <div id="sim-results-container">
          ${renderResultsPanel(impact)}
        </div>
      </div>
    </div>`;
  }

  function renderResultsPanel(impact) {
    if (!impact) {
      return '<div class="card"><div class="empty-state" style="padding:var(--space-8)"><p>Selecione um equipamento e ajuste os parâmetros para ver a simulação</p></div></div>';
    }
    
    return `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card-header"><div class="card-title">📋 Estado Atual</div></div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          <div style="display:flex;justify-content:space-between;"><span style="font-size:var(--text-sm);color:var(--text-muted)">Data Original 🔒</span><strong style="color:var(--color-danger)">${formatDate(impact.eq.dataLiberacaoPlanejada)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="font-size:var(--text-sm);color:var(--text-muted)">Dias Restantes</span><strong>${impact.workDaysRemaining} dias</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="font-size:var(--text-sm);color:var(--text-muted)">Avanço Atual</span><strong style="color:var(--brand-primary-light)">${impact.eq.pctAvanco||0}%</strong></div>
        </div>
      </div>

      <div class="card" style="border-color:${impact.totalGain>0?'rgba(0,200,83,.3)':'rgba(244,67,54,.3)'};background:${impact.totalGain>0?'rgba(0,200,83,.05)':'rgba(244,67,54,.05)'};">
        <div class="card-header"><div class="card-title">🎯 Resultado da Simulação</div></div>
        <div style="text-align:center;padding:var(--space-4);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">Nova Data de Liberação</div>
          <div style="font-size:2.5rem;font-weight:900;color:${impact.totalGain>0?'var(--color-success)':'var(--color-danger)'}">${formatDate(impact.newDate)}</div>
          <div style="font-size:var(--text-xl);font-weight:700;color:${impact.totalGain>0?'var(--color-success)':'var(--color-danger)'};margin-top:var(--space-2);">${impact.totalGain > 0 ? `⬆️ Antecipa ${impact.totalGain} dias` : impact.totalGain < 0 ? `⬇️ Atrasa ${Math.abs(impact.totalGain)} dias` : '= Sem alteração'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-3);">
          ${[
            {label:'Impacto dos Mecânicos', gain: impact.gainMechanics},
            {label:'Impacto dos Eletricistas', gain: impact.gainElectrics},
            {label:'Impacto da Caldeiraria', gain: impact.gainCaldeiraria},
            {label:'Impacto da Usinagem', gain: impact.gainUsinagem},
            {label:'Impacto das Peças', gain: impact.gainParts},
            {label:'Impacto das Horas Extras', gain: impact.gainOvertime},
            {label:'Impacto dos Fins de Semana', gain: impact.gainWeekends},
          ].map(item=>`<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);">
            <span style="color:var(--text-muted)">${item.label}</span>
            <strong style="color:${item.gain>0?'var(--color-success)':item.gain<0?'var(--color-danger)':'var(--text-muted)'}">${item.gain>0?'-'+item.gain+' dias':item.gain<0?'+'+Math.abs(item.gain)+' dias':'0'}</strong>
          </div>`).join('')}
        </div>
      </div>
      <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--bg-base);border-radius:var(--radius-md);font-size:var(--text-xs);color:var(--text-muted);">
        ⚠️ NOTA: A Data Planejada Original não pode ser alterada. A simulação mostra apenas uma estimativa.
      </div>
    `;
  }

  function setEq(id) { 
    window.setGlobalEqFilter(id); 
    if (window.Router) window.Router.navigate('simulator', { force: true });
  }

  function setParam(key, val) { 
    params[key] = val; 
    const eqId = window.GlobalEqFilter; 
    if (eqId) { 
      const impact = calcImpact(); 
      if (impact) { 
        const container = document.getElementById('sim-results-container');
        if (container) {
          container.innerHTML = renderResultsPanel(impact);
        }
      } 
    } 
  }
  return { render, setEq, setParam };
})();

// ================================================================
// AI ASSISTANT MODULE
// ================================================================
window.AIAssistant = (() => {
  const messages = [{ role:'ai', content:'Olá! Sou o Assistente de IA avançado do **PLANEJAMENTO DIMAN-BHZ**. Posso analisar dados em tempo real e responder perguntas detalhadas sobre equipamentos, tarefas, restrições, peças, produtividade, custos e riscos. **Importante:** Fui programado exclusivamente para tratar de dados operacionais deste sistema. Como posso ajudar na sua gestão hoje?' }];

  function normalize(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  }

  function extractEquipments(query) {
    const eqs = window.DB && DB.equipment ? DB.equipment.list() : [];
    const q = normalize(query);
    return eqs.filter(e => {
      const code = normalize(e.codigo);
      if (q.includes(code)) return true;
      const codeWithoutDash = code.replace(/[-\s]/g, '');
      if (q.includes(codeWithoutDash)) return true;
      
      const numMatch = code.match(/\d+/);
      if (numMatch && numMatch[0].length >= 2) {
        const num = numMatch[0];
        const regex = new RegExp(`\\b${num}\\b`);
        if (regex.test(q)) return true;
      }
      return false;
    });
  }

  let lastMentionedEqs = [];

  function detectIntents(q) {
    q = normalize(q);
    const intents = [];
    if (/atraso|atrazo|atrasad|demora|motivo|por.*que.*atras|replaneja/.test(q)) intents.push('delay');
    if (/libera|entrega|previsa|prazo|quando|termina|conclui/.test(q)) intents.push('liberation');
    if (/risco|perigo|alerta|critico|citico|caminho.*critico|caminho.*citico/.test(q)) intents.push('risk');
    if (/peca|pesa|material|componente|comprad|solicitad|almoxarifado|sensor|motor|bomba|cilindro/.test(q)) intents.push('parts');
    if (/restrica|bloqueio|pendencia|impede|impedimento/.test(q)) intents.push('restrictions');
    if (/produtiv|eficienc|mao.*obra|equipe|mecanic|soldador|ajudante|funcionar/.test(q)) intents.push('productivity');
    if (/feria|atestado|falta.*funcionar|falta.*mecanic|falta.*equipe|falta.*pessoal|ausencia|atraso.*funcionar/.test(q)) intents.push('attendance');
    if (/custo|gasto|financeiro|orcamento|valor|preco|comprar/.test(q)) intents.push('costs');
    if (/resumo|geral|status|panorama|visao.*geral|oficina|como.*esta|tudo/.test(q)) intents.push('summary');
    if (/quant|historico|liberad|mes|junho|julho|agosto/.test(q)) intents.push('history');
    if (/ola|oi|bom.*dia|boa.*tarde|boa.*noite|ola.*assistente/.test(q)) intents.push('greeting');
    if (/internet|web|site|anuncio|manual|esquema|circuito|eletrico|hidraulico|pdf|baixar|download|google|mercado.*livre|procure|pesquise|busque|ache|comprar/.test(q)) intents.push('web_search');
    return intents;
  }

  function processQuery(query) {
    const intents = detectIntents(query);
    let matchedEqs = extractEquipments(query);
    
    // AI Context Memory
    if (matchedEqs.length > 0) {
      lastMentionedEqs = matchedEqs;
    } else if (lastMentionedEqs.length > 0 && /ela|ele|esse|essa|desta|deste|esta|este|atrasad|status|peca|pesa|porque|motivo/.test(normalize(query))) {
      matchedEqs = lastMentionedEqs;
    }
    
    const allTasks = window.DB && DB.tasks ? DB.tasks.getAll() : [];
    const parts = window.DB && DB.parts ? DB.parts.getAll() : [];
    const restrictions = window.DB && DB.restrictions ? DB.restrictions.getAll().filter(r => r.status === 'Aberta') : [];
    const costs = window.DB && DB.costs ? DB.costs.getAll() : [];
    const eqsList = window.DB && DB.equipment ? DB.equipment.list() : [];

    // Fallback para simular IA hiper-mega-inteligente quando nenhum equipamento exato é pego, mas a query pede detalhe
    if (matchedEqs.length === 0 && !intents.some(i => ['summary','productivity','costs','attendance','restrictions','history'].includes(i))) {
      return `🤖 **Aviso do Sistema Neural**\n\nDesculpe, não consegui processar essa pergunta específica com os dados locais e a rede neural da nuvem está inacessível no momento.\n\nVocê pode tentar reformular a pergunta ou me consultar sobre o **resumo da oficina**, **peças críticas**, ou o **status de um equipamento** específico (ex: SSM-265).`;
    }

    let resp = '';

    if (matchedEqs.length === 0 && intents.includes('history')) {
      const liberados = eqsList.filter(e => e.status === 'Liberado');
      resp += `🤖 **Análise Histórica**\n\n`;
      resp += `Até o momento, temos um total de **${liberados.length} equipamento(s)** marcados como "Liberado" na base de dados ativa.\n`;
      if (liberados.length > 0) {
        resp += `\nAlguns dos últimos equipamentos liberados:\n`;
        liberados.slice(-5).forEach(e => {
          resp += `• **${e.codigo}** (${e.cliente || 'Sem cliente'})\n`;
        });
      }
      return resp;
    }

    // If specific equipment mentioned
    if (matchedEqs.length > 0) {
      matchedEqs.forEach(eq => {
        resp += `📊 **Análise do Equipamento: ${eq.codigo}** (${eq.cliente})\n`;
        resp += `• **Status atual:** ${eq.status} | **Avanço físico:** ${eq.pctAvanco || 0}%\n`;
        
        const eqRestr = restrictions.filter(r => r.equipmentId === eq.id);
        const eqParts = parts.filter(p => p.equipmentId === eq.id && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
        const eqCritParts = eqParts.filter(p => p.critica);
        const repls = eq.replanning || [];
        const eqCosts = costs.filter(c => c.equipmentId === eq.id);
        const totalRealizado = eqCosts.reduce((s,c) => s+c.valorRealizado, 0);

        const totalDelay = repls.reduce((s,r) => s+window.daysBetween(r.dataAnterior,r.novaData),0);
        if (totalDelay > 0) {
          resp += `• **Atraso Acumulado:** ${totalDelay} dias identificados ao longo de ${repls.length} replanejamento(s).\n`;
          resp += `• **Última Causa Registrada:** ${repls[repls.length-1].motivo}\n`;
        } else if (eq.dataLiberacaoAtual || eq.dataLiberacaoPlanejada) {
          const datePrev = eq.dataLiberacaoAtual || eq.dataLiberacaoPlanejada;
          const daysToLib = window.daysBetween(new Date().toISOString().slice(0,10), datePrev);
          if (daysToLib < 0) {
            resp += `• **Motivo do Atraso:** O equipamento encontra-se ATRASADO em ${Math.abs(daysToLib)} dias em relação à data planejada, porém **nenhum motivo formal de replanejamento foi registrado no sistema** pela equipe técnica.\n`;
          }
        }
        if (eq.dataLiberacaoAtual || eq.dataLiberacaoPlanejada) {
          const datePrev = eq.dataLiberacaoAtual || eq.dataLiberacaoPlanejada;
          const daysToLib = window.daysBetween(new Date().toISOString().slice(0,10), datePrev);
          if (daysToLib >= 0) {
            resp += `• **Previsão de Liberação:** ${window.formatDate(datePrev)} (em ${daysToLib} dias).\n`;
          }
        }

        if (eqRestr.length > 0) {
          resp += `\n🚫 **Restrições Impeditivas:**\n`;
          eqRestr.forEach(r => resp += `  - [${r.tipo}] ${r.descricao}\n`);
        } else if (intents.includes('restrictions')) {
          resp += `\n✅ Nenhuma restrição aberta no momento para este equipamento.\n`;
        }

        if (eqParts.length > 0) {
          resp += `\n📦 **Lista Detalhada de Peças Pendentes (${eqParts.length}):**\n`;
          eqParts.forEach(p => {
            const crit = p.critica ? '🚨 [CRÍTICA] ' : '';
            resp += `  - ${crit}${p.descricao} (Qtd: ${p.quantidade})\n    Status: ${p.status} | Previsão: ${window.formatDate(p.prazoEntrega)}\n`;
          });
        } else if (intents.includes('parts')) {
          resp += `\n✅ Nenhuma peça pendente aguardando entrega.\n`;
        }

        const eqTasks = allTasks.filter(t => t.equipmentId === eq.id);
        const tasksEmAndamento = eqTasks.filter(t => t.status === 'Em Andamento');
        if (tasksEmAndamento.length > 0) {
          resp += `\n⚙️ **Trabalho em Execução Neste Momento:**\n`;
          tasksEmAndamento.forEach(t => {
            const workers = window.DB && DB.workforce ? DB.workforce.list().filter(w => w.currentTaskId === t.id && (w.currentState === 'Trabalhando' || w.currentState === 'Em Pausa')) : [];
            const workerNames = workers.length > 0 ? workers.map(w => `${w.nome} (${w.currentState})`).join(', ') : (t.responsavel || 'Sem executante logado');
            resp += `  - **${t.descricao}** [${t.disciplina}]\n    Executante(s): ${workerNames}\n`;
          });
        } else {
          resp += `\n⚙️ **Nenhuma tarefa sendo executada ativamente neste momento.**\n`;
        }

        const tasksPausadas = eqTasks.filter(t => t.status === 'Pausada' || t.status === 'Aguardando Peça' || t.status === 'Aguardando Setor');
        if (tasksPausadas.length > 0) {
          resp += `\n⏸️ **Tarefas Pausadas/Aguardando (${tasksPausadas.length}):**\n`;
          tasksPausadas.slice(0, 5).forEach(t => {
            resp += `  - ${t.descricao} - Motivo: ${t.pauseReason || t.status}\n`;
          });
          if (tasksPausadas.length > 5) resp += `  - ... e mais ${tasksPausadas.length - 5} tarefa(s) pausada(s).\n`;
        }

        if (totalRealizado > 0) {
          resp += `\n💰 **Custo Realizado:** R$ ${totalRealizado.toFixed(2)}\n`;
        }

        resp += `\n💡 **Diagnóstico IA:** `;
        if (eq.status === 'Concluído') resp += `Equipamento finalizado sem pendências ativas.`;
        else if (eqRestr.length > 0 || eqCritParts.length > 0) resp += `O equipamento encontra-se em Risco Alto de atraso devido a ${eqRestr.length} restrições e ${eqCritParts.length} peças críticas. Recomenda-se acompanhamento diário com Suprimentos e priorização pela equipe técnica.`;
        else resp += `O andamento está dentro da normalidade operacional, sem bloqueios críticos mapeados.`;
        resp += `\n\n`;
      });
      return resp;
    }

    // General Summary Logic
    if (intents.includes('summary')) {
      const stats = DB.kpi.getEquipmentStats();
      const eqs = DB.equipment.list();
      resp += `🏢 **Panorama Operacional DIMAN-BHZ**\n\n`;
      resp += `**Operação:**\n`;
      resp += `• **${stats.emManutencao}** em manutenção ativa.\n`;
      resp += `• **${stats.liberados}** equipamentos liberados.\n`;
      resp += `• **${stats.bloqueados}** paralisados / aguardando peças.\n`;
      resp += `• Avanço Geral da Oficina: **${stats.pctAvancoGeral}%**\n\n`;
      
      const activeRestr = restrictions.length;
      const critParts = parts.filter(p => p.critica && ['Solicitada','Comprada','Em Transporte'].includes(p.status)).length;
      resp += `**Riscos & Bloqueios:**\n`;
      resp += `• **${activeRestr}** restrições ativas no momento.\n`;
      resp += `• **${critParts}** peças críticas atrasando cronogramas.\n\n`;

      const lateEqs = eqs.filter(e => e.status === 'Em Manutenção' && (e.dataLiberacaoAtual || e.dataLiberacaoPlanejada) && window.daysBetween(new Date().toISOString().slice(0,10), e.dataLiberacaoAtual || e.dataLiberacaoPlanejada) < 0);
      if (lateEqs.length > 0) {
        resp += `⚠️ **Equipamentos Atrasados:**\n`;
        lateEqs.forEach(e => resp += `  - ${e.codigo} (Avanço: ${e.pctAvanco||0}%)\n`);
      }
      return resp;
    }

    if (intents.includes('productivity') || intents.includes('attendance')) {
      const wf = window.DB && DB.workforce ? DB.workforce.list() : [];
      const vacs = window.DB && DB.vacations ? DB.vacations.list() : [];
      resp += `👥 **Análise de Mão de Obra e Produtividade**\n\n`;
      resp += `• **Efetivo Total:** ${wf.length} colaboradores cadastrados.\n`;
      
      const onVacation = vacs.filter(v => window.daysBetween(v.dataFim, new Date().toISOString().slice(0,10)) <= 0 && window.daysBetween(new Date().toISOString().slice(0,10), v.dataInicio) <= 0);
      if (onVacation.length > 0) {
        resp += `• **Colaboradores em Férias/Afastamento:** ${onVacation.length}\n`;
        onVacation.forEach(v => {
          const w = wf.find(wk => wk.id === v.workerId);
          if (w) resp += `  - ${w.nome} (Retorno em: ${window.formatDate(v.dataFim)})\n`;
        });
      }
      resp += `\nA alocação de mão de obra afeta diretamente o tempo de execução. Manter as metas do Prêmio Produção atreladas à presença é vital para a produtividade da equipe.`;
      return resp;
    }

    if (intents.includes('restrictions')) {
      if (!restrictions.length) return '✅ O sistema não acusa nenhuma restrição bloqueando as manutenções no momento. Cenário ideal!';
      resp += `🚫 **Mapeamento de Restrições Ativas (${restrictions.length})**\n\n`;
      const byType = {};
      restrictions.forEach(r => { byType[r.tipo] = (byType[r.tipo]||0)+1; });
      Object.entries(byType).forEach(([t,c]) => resp += `• **${t}:** ${c} ocorrência(s)\n`);
      
      resp += `\n**Impacto Crítico:** ${restrictions.filter(r=>r.impactoCaminhosCriticos).length} restrições estão no Caminho Crítico da oficina, atrasando as datas de entrega finais.\n`;
      return resp;
    }

    if (intents.includes('risk') || intents.includes('delay')) {
      const atRisk = DB.equipment.list().filter(e => {
        if (e.status !== 'Em Manutenção') return false;
        const openRestr = restrictions.filter(r => r.equipmentId === e.id);
        const critParts = parts.filter(p => p.equipmentId === e.id && p.critica && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
        return openRestr.length > 0 || critParts.length > 0;
      });
      if (!atRisk.length) return '✅ A IA não detectou equipamentos com alto risco de atraso baseado nas restrições e peças atuais.';
      resp += `⚠️ **Equipamentos com Alto Risco de Atraso (${atRisk.length})**\n\n`;
      atRisk.forEach(e => {
        resp += `🔴 **${e.codigo}**: `;
        const issues = [];
        const restrCount = restrictions.filter(r => r.equipmentId === e.id).length;
        const partCount = parts.filter(p => p.equipmentId === e.id && p.critica && ['Solicitada','Comprada','Em Transporte'].includes(p.status)).length;
        if (restrCount) issues.push(`${restrCount} restrição(ões)`);
        if (partCount) issues.push(`${partCount} peça(s) crítica(s)`);
        resp += issues.join(' e ') + '.\n';
      });
      return resp;
    }
    if (intents.includes('parts')) {
      const pendingParts = parts.filter(p => ['Solicitada','Comprada','Em Transporte'].includes(p.status));
      if (!pendingParts.length) return '✅ Nenhuma peça pendente de entrega no momento para a oficina.';
      
      let resp = `📦 **Panorama de Peças Pendentes (${pendingParts.length})**\n\n`;
      const critParts = pendingParts.filter(p => p.critica);
      
      if (critParts.length > 0) {
        resp += `⚠️ **ATENÇÃO - Peças Críticas (${critParts.length}):**\n`;
        critParts.forEach(p => {
          const eq = DB.equipment.list().find(e => e.id === p.equipmentId);
          resp += `• [${eq ? eq.codigo : '?'}] ${p.descricao} (${p.status}) - Chega em: ${window.formatDate(p.prazoEntrega)}\n`;
        });
        resp += `\n`;
      }
      
      const normalParts = pendingParts.filter(p => !p.critica);
      if (normalParts.length > 0) {
        resp += `**Outras Peças Aguardadas:** ${normalParts.length} item(ns).\n`;
      }
      return resp;
    }

    return `🤖 **Processamento Finalizado**\n\nNão consegui cruzar a sua pergunta exata com um de nossos relatórios de prateleira, porém afirmo o seguinte status atual:\nExistem **${DB.equipment.list().filter(e=>e.status==='Em Manutenção').length}** equipamentos em manutenção na oficina.\n\nPara perguntas complexas, experimente incluir o código do equipamento (ex: SSM-288) ou especificar claramente o que busca (Peças, Restrições, Produtividade, etc). Lembrando: atuo estritamente nos dados de Manutenção e Planejamento.`;
  }

  function addMessage(role, content) {
    messages.push({ role, content });
    const container = document.getElementById('ai-chat-messages');
    if (container) {
      const div = document.createElement('div');
      div.className = `ai-message ${role}`;
      div.innerHTML = `
        <div style="font-size:1.3rem;flex-shrink:0">${role === 'ai' ? '🤖' : '👤'}</div>
        <div style="background:${role === 'ai' ? 'var(--bg-base)' : 'rgba(21,101,192,0.2)'};border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);color:var(--text-secondary);line-height:1.6;max-width:80%;">${content.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/•/g,'&bull;')}</div>
      `;
      div.style.cssText = 'display:flex;gap:var(--space-3);align-items:flex-start;margin-bottom:var(--space-3);animation:fadeInUp .3s ease;';
      if (role === 'user') {
        div.style.flexDirection = 'row-reverse';
        div.children[1].style.background = 'var(--brand-primary)';
        div.children[1].style.color = 'white';
      }
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
  }

  function buildSystemContext(query) {
    const eqs = window.DB && DB.equipment ? DB.equipment.list() : [];
    const tasks = window.DB && DB.tasks ? DB.tasks.getAll() : [];
    const parts = window.DB && DB.parts ? DB.parts.getAll() : [];
    const restr = window.DB && DB.restrictions ? DB.restrictions.getAll() : [];
    
    let matchedEqs = extractEquipments(query);
    if (matchedEqs.length > 0) {
      lastMentionedEqs = matchedEqs;
    } else if (lastMentionedEqs.length > 0 && /ela|ele|esse|essa|desta|deste|esta|este|atrasad|status|peca|pesa|porque|motivo/.test(normalize(query))) {
      matchedEqs = lastMentionedEqs;
    }

    let eqData = eqs;
    let taskData = tasks;
    let partData = parts;
    let restrData = restr;

    if (matchedEqs.length > 0) {
      const eqIds = matchedEqs.map(e => e.id);
      eqData = matchedEqs;
      taskData = tasks.filter(t => eqIds.includes(t.equipmentId));
      partData = parts.filter(p => eqIds.includes(p.equipmentId));
      restrData = restr.filter(r => eqIds.includes(r.equipmentId));
    }

    // Minify context to save tokens and focus AI
    const minifiedEqs = eqData.map(e => ({
      codigo: e.codigo, status: e.status, pctAvanco: e.pctAvanco,
      liberacao: e.dataLiberacaoAtual || e.dataLiberacaoPlanejada || 'Sem previsão'
    }));
    
    const minifiedTasks = taskData.filter(t => t.status !== 'Concluída').map(t => ({
      eq: eqs.find(x => x.id === t.equipmentId)?.codigo || '',
      desc: t.descricao, status: t.status, 
      resp: window.DB && DB.workforce ? DB.workforce.list().filter(w => w.currentTaskId === t.id).map(w => `${w.nome} (${w.currentState})`).join(', ') : t.responsavel
    }));

    const minifiedParts = partData.filter(p => ['Solicitada','Comprada','Em Transporte'].includes(p.status)).map(p => ({
      eq: eqs.find(x => x.id === p.equipmentId)?.codigo || '',
      desc: p.descricao, status: p.status, critica: p.critica, prazo: window.formatDate(p.prazoEntrega)
    }));

    return JSON.stringify({ equipamentos: minifiedEqs, tarefas_abertas: minifiedTasks, pecas_pendentes: minifiedParts, restricoes_abertas: restrData.filter(r => r.status === 'Aberta').map(r => ({ eq: eqs.find(x => x.id === r.equipmentId)?.codigo || '', desc: r.descricao, status: r.status })) });
  }

  async function fetchPollinationsAI(query, contextData) {
    const prompt = `Você é o Assistente de IA avançado do DIMAN (Sistema Inteligente da Manutenção).
Seu objetivo é analisar os dados operacionais em JSON fornecidos e responder EXATAMENTE o que foi perguntado, agindo como um consultor sênior especialista em confiabilidade e planejamento.

Regras Absolutas de Comportamento:
1. Responda sempre em Português do Brasil usando Markdown avançado (tabelas, listas, negrito, emojis industriais como ⚙️, 🔧, 🚨, 🛑, 📊, 📦).
2. NUNCA invente ou assuma dados. Use APENAS as informações do JSON fornecido. Se a informação não estiver no JSON, diga que não há dados sobre isso.
3. Se o usuário pedir para listar, citar ou perguntar "quais", você DEVE varrer o JSON e listar os itens específicos (ex: se perguntar "quais equipamentos estão atrasados", liste o código de cada um deles). Não responda com um mero resumo numérico nesses casos.
4. Se o usuário perguntar o motivo de um atraso ou bloqueio de um equipamento, procure no JSON por peças críticas pendentes ou restrições ativas para aquele equipamento e aponte-as como a causa raiz provável.
5. NUNCA diga que você é ChatGPT, OpenAI, Pollinations ou qualquer IA pública. Aja 100% como o motor neural nativo do DIMAN.

Dados do Sistema (Tempo Real):
${contextData}`;

    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: query }
        ],
        model: 'gpt-4o',
        temperature: 0.1
      })
    });
    
    if (!res.ok) throw new Error("Servidor Neural Indisponível");
    return await res.text();
  }

  async function sendQuery(query) {
    if (!query?.trim()) return;
    const input = document.getElementById('ai-input');
    if (input) input.value = '';
    addMessage('user', query);

    const container = document.getElementById('ai-chat-messages');
    const typing = document.createElement('div');
    typing.id = 'ai-typing';
    typing.style.cssText = 'display:flex;gap:var(--space-2);align-items:center;padding:var(--space-3);animation:fadeInUp .3s ease;';
    typing.innerHTML = '🤖 <span style="color:var(--text-muted);font-size:var(--text-sm)">Processando rede neural...</span>';
    container?.appendChild(typing);
    container.scrollTop = container.scrollHeight;

    try {
      const dbContext = buildSystemContext(query);
      const responseText = await fetchPollinationsAI(query, dbContext);
      document.getElementById('ai-typing')?.remove();
      addMessage('ai', responseText);
    } catch(err) {
      console.error(err);
      document.getElementById('ai-typing')?.remove();
      // Fallback
      setTimeout(() => {
        const response = processQuery(query);
        addMessage('ai', response);
      }, 300);
    }
  }

  const suggestions = [
    'Por que a SSM-288 está atrasada?','Quais equipamentos têm risco de atraso?',
    'Que peças estão bloqueando a liberação?','Restrições abertas no momento?',
    'Quando a SSM-301 será liberada?','Como está o caminho crítico?',
    'Resumo geral da oficina','Quais tarefas são críticas?',
  ];

  function render() {
    setTimeout(() => {
      const container = document.getElementById('ai-chat-messages');
      if (!container) return;
      messages.forEach(m => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;gap:var(--space-3);align-items:flex-start;margin-bottom:var(--space-3);';
        div.innerHTML = `<div style="font-size:1.3rem;flex-shrink:0">${m.role==='ai'?'🤖':'👤'}</div>
          <div style="background:${m.role==='ai'?'var(--bg-base)':'rgba(21,101,192,0.2)'};border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);color:var(--text-secondary);line-height:1.6;max-width:80%;">${m.content.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`;
        container.appendChild(div);
      });
    }, 50);

    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg></div>Assistente IA — Análise Inteligente</div></div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-5);">
        <!-- Chat -->
        <div class="card" style="display:flex;flex-direction:column;height:70vh;">
          <div id="ai-chat-messages" style="flex:1;overflow-y:auto;padding:var(--space-4);"></div>
          <div style="border-top:1px solid var(--border-card);padding:var(--space-4);display:flex;gap:var(--space-3);">
            <input id="ai-input" placeholder="Digite sua pergunta..." style="flex:1;" onkeydown="if(event.key==='Enter')AIAssistant.sendFromInput()" />
            <button class="btn btn-primary" onclick="AIAssistant.sendFromInput()">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
            </button>
          </div>
        </div>
        <!-- Suggestions -->
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          <div class="card"><div class="card-header"><div class="card-title">💡 Perguntas Sugeridas</div></div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              ${suggestions.map(s=>`<button onclick="AIAssistant.sendQuery('${s}')" style="text-align:left;background:var(--bg-base);border:1px solid var(--border-card);border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-xs);color:var(--text-secondary);cursor:pointer;transition:all .15s;line-height:1.4;" onmouseover="this.style.borderColor='var(--brand-primary-light)'" onmouseout="this.style.borderColor='var(--border-card)'">${s}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function sendFromInput() {
    const input = document.getElementById('ai-input');
    if (input?.value?.trim()) sendQuery(input.value.trim());
  }

  return { render, sendQuery, sendFromInput };
})();

// ================================================================
// MEETING MODE MODULE
// ================================================================
window.MeetingMode = (() => {
  let interval = null;
  let countdown = 30;

  let selectedMeetingMonth = null;

  function activate(monthParam) {
    if (document.getElementById('meeting-overlay')) deactivate();

    const overlay = document.createElement('div');
    overlay.id = 'meeting-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#050D1A;z-index:10000;display:flex;flex-direction:column;overflow:hidden;font-family:var(--font-primary);';

    const eqs = DB.equipment.list();
    const tasks = DB.tasks.getAll();
    
    // Obter mês selecionado
    const df = document.getElementById('date-filter');
    const baseDate = df && df.value ? df.value : new Date().toISOString().slice(0,10);
    
    if (monthParam) selectedMeetingMonth = monthParam;
    else if (!selectedMeetingMonth) selectedMeetingMonth = baseDate.slice(0,7);
    
    const currentMonth = selectedMeetingMonth;
    
    const eqWaiting = eqs.filter(e => {
      if (e.status !== 'Aguardando Manutenção' && e.status !== 'Backlog') return false;
      if (e.tipo === 'Subconjuntos') return false;
      return true; // Aguardando/Backlog não precisa ser filtrado por mês
    });

    const eqMaintenance = eqs.filter(e => {
      if (['Liberado', 'Aguardando Manutenção', 'Backlog'].includes(e.status)) return false;
      if (e.tipo === 'Subconjuntos') return false;
      const dataPrazo = e.dataLiberacaoPlanejada || '';
      return dataPrazo.startsWith(currentMonth);
    });

    const eqReleased = eqs.filter(e => {
      if (e.status !== 'Liberado') return false;
      if (e.tipo === 'Subconjuntos') return false; // RETIRA SUBCONJUNTO
      const dataPrazo = e.dataLiberacaoPlanejada || '';
      return dataPrazo.startsWith(currentMonth);
    });

    // Helper para Top Executantes (Total geral, sem filtro de mês conforme pedido)
    const perfMap = {};
    
    function matchesMonth(dStr, yyyy_mm) {
      if (!dStr) return false;
      if (dStr.startsWith(yyyy_mm)) return true;
      // Trata DD/MM/YYYY
      if (dStr.includes('/')) {
        const parts = dStr.split('/');
        if (parts.length === 3) {
          const iso = parts[2] + '-' + parts[1];
          return iso === yyyy_mm;
        }
      }
      return false;
    }
    
    const timesheets = window.DB.timesheets ? window.DB.timesheets.list() : [];
    const completedTasks = tasks.filter(t => t.status === 'Concluída' && t.disciplina !== 'Subconjunto');

    completedTasks.forEach(t => {
      const taskWorkers = new Set();
      if (t.responsavel && t.responsavel !== 'Não atribuído' && t.responsavel !== 'Sistema') {
        taskWorkers.add(t.responsavel);
      }
      timesheets.forEach(ts => {
        if (ts.taskId === t.id && (!ts.tipo || ts.tipo === 'Trabalho') && ts.workerNome) {
          taskWorkers.add(ts.workerNome);
        }
      });
      taskWorkers.forEach(wName => {
        if (!perfMap[wName]) perfMap[wName] = new Set();
        perfMap[wName].add(t.id);
      });
    });

    const topPerformers = Object.entries(perfMap)
      .map(([nome, taskSet]) => ({nome, count: taskSet.size}))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);
      
    // Todos executantes para o Ticker
    const allPerformers = Object.entries(perfMap)
      .map(([nome, taskSet]) => ({nome, count: taskSet.size}))
      .sort((a,b) => b.count - a.count);

    overlay.innerHTML = `
      <!-- Header bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:#0A1929;border-bottom:1px solid rgba(30,136,229,.3);">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:36px;height:36px;background:rgba(21,101,192,.8);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">📺</div>
          <div>
            <div style="font-size:1.1rem;font-weight:900;color:white;letter-spacing:-.02em">Manutenção DIMAN-BHZ</div>
            <div style="font-size:.65rem;color:#8EACC8;text-transform:uppercase;letter-spacing:.1em;display:flex;align-items:center;gap:8px;">
              Acompanhamento Mensal de Equipamentos e Produtividade
              <input type="month" value="${currentMonth}" onchange="MeetingMode.activate(this.value)" style="background:rgba(30,136,229,.2); border:1px solid rgba(30,136,229,.4); color:white; border-radius:4px; padding:2px 6px; font-family:inherit; outline:none; font-weight:700; cursor:pointer; font-size:.7rem;">
            </div>
          </div>
        </div>
        <div id="meeting-datetime" style="font-size:1.4rem;font-weight:800;color:#1E88E5;font-family:monospace;"></div>
        <div style="display:flex; gap:12px; align-items:center;">
          <button onclick="MeetingMode.toggleFullscreen()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            Tela Cheia
          </button>
          <button onclick="MeetingMode.deactivate()" style="background:rgba(244,67,54,.2);border:1px solid rgba(244,67,54,.4);color:#F44336;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;">✕ Sair</button>
        </div>
      </div>

      <!-- 4-panel grid -->
      <div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:16px;overflow:hidden;">
        
        <!-- Column 1: Em Manutenção -->
        <div style="background:#0A1929;border:1px solid rgba(30,136,229,.3);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:14px;background:rgba(30,136,229,.1);border-bottom:1px solid rgba(30,136,229,.2);">
            <h2 style="margin:0;color:#64B5F6;font-size:1.1rem;font-weight:800;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
              ⚙️ Em Manutenção
            </h2>
          </div>
          <div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;">
            ${eqMaintenance.length > 0 ? eqMaintenance.sort((a,b) => (a.dataLiberacaoPlanejada||'').localeCompare(b.dataLiberacaoPlanejada||'')).map(e => {
              const dataStr = (e.dataLiberacaoPlanejada) ? formatDate(e.dataLiberacaoPlanejada) : '—';
              return `
                <div style="background:rgba(255,255,255,0.03);border-left:4px solid #1E88E5;padding:12px;border-radius:8px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-weight:800;color:white;font-size:1.1rem;">${e.codigo}</span>
                  </div>
                  <div style="color:#8EACC8;font-size:0.85rem;">Cliente: <strong style="color:#BBDEFB">${e.cliente || 'Não Informado'}</strong></div>
                </div>
              `;
            }).join('') : '<div style="color:#8EACC8;text-align:center;margin-top:20px;font-size:1rem;">Nenhum equipamento em manutenção</div>'}
          </div>
        </div>

        <!-- Column 2: Liberados -->
        <div style="background:#0A1929;border:1px solid rgba(76,175,80,.3);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:10px;background:rgba(76,175,80,.1);border-bottom:1px solid rgba(76,175,80,.2);">
            <h2 style="margin:0;color:#81C784;font-size:0.9rem;font-weight:800;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
              ✅ Liberados no Mês
            </h2>
          </div>
          <div style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;">
            ${eqReleased.length > 0 ? eqReleased.sort((a,b) => (b.dataLiberacaoPlanejada||'').localeCompare(a.dataLiberacaoPlanejada||'')).map(e => {
              const dataStr = (e.dataLiberacaoPlanejada) ? formatDate(e.dataLiberacaoPlanejada) : '—';
              return `
                <div style="background:rgba(255,255,255,0.03);border-left:4px solid #4CAF50;padding:10px;border-radius:6px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-weight:800;color:white;font-size:1rem;">${e.codigo}</span>
                  </div>
                  <div style="color:#8EACC8;font-size:0.75rem;">Cliente: <strong style="color:white">${e.cliente || 'Não Informado'}</strong></div>
                </div>
              `;
            }).join('') : '<div style="color:#8EACC8;text-align:center;margin-top:20px;font-size:0.9rem;">Nenhum equipamento liberado</div>'}
          </div>
        </div>

        <!-- Column 3: Top Executantes -->
        <div style="background:#0A1929;border:1px solid rgba(156,39,176,.3);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:10px;background:rgba(156,39,176,.1);border-bottom:1px solid rgba(156,39,176,.2);">
            <h2 style="margin:0;color:#BA68C8;font-size:0.9rem;font-weight:800;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
              🚀 Top Executantes
            </h2>
          </div>
          <div style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;">
            ${topPerformers.length > 0 ? topPerformers.map((t, idx) => {
              const emojis = ['🏆 1º', '🥈 2º', '🥉 3º', '🏅 4º', '🏅 5º'];
              return `
                <div style="background:rgba(255,255,255,0.03);border-left:4px solid #AB47BC;padding:10px;border-radius:6px;display:flex;align-items:center;gap:12px;">
                  <div style="font-size:1.5rem;">${emojis[idx] || '🏅'}</div>
                  <div style="flex:1;">
                    <div style="font-weight:800;color:white;font-size:1rem;margin-bottom:2px;">${t.nome}</div>
                    <div style="color:#CE93D8;font-weight:700;font-size:0.85rem;"><span style="color:white;font-weight:900;">${t.count}</span> tarefas executadas</div>
                  </div>
                </div>
              `;
            }).join('') : '<div style="color:#8EACC8;text-align:center;margin-top:20px;font-size:0.9rem;">Nenhum dado de execução</div>'}
          </div>
        </div>

        <!-- Column 4: Aguardando Manutenção -->
        <div style="background:#0A1929;border:1px solid rgba(255,152,0,.3);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:14px;background:rgba(255,152,0,.1);border-bottom:1px solid rgba(255,152,0,.2);">
            <h2 style="margin:0;color:#FFB74D;font-size:1.1rem;font-weight:800;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
              ⏳ Aguardando Manutenção
            </h2>
          </div>
          <div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;">
            ${eqWaiting.length > 0 ? eqWaiting.sort((a,b) => (a.dataLiberacaoPlanejada||'').localeCompare(b.dataLiberacaoPlanejada||'')).map(e => {
              const dataStr = (e.dataLiberacaoPlanejada) ? formatDate(e.dataLiberacaoPlanejada) : '—';
              return `
                <div style="background:rgba(255,255,255,0.03);border-left:4px solid #FF9800;padding:12px;border-radius:8px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-weight:800;color:white;font-size:1.1rem;">${e.codigo}</span>
                    <span style="font-weight:700;color:#FFB74D;font-size:0.95rem;">Prazo: <span style="color:white">${dataStr}</span></span>
                  </div>
                  <div style="color:#8EACC8;font-size:0.85rem;">Cliente: <strong style="color:#FFE0B2">${e.cliente || 'Não Informado'}</strong></div>
                </div>
              `;
            }).join('') : '<div style="color:#8EACC8;text-align:center;margin-top:20px;font-size:1rem;">Nenhum equipamento aguardando</div>'}
          </div>
        </div>
      </div>

      <!-- Ticker -->
      ${allPerformers.length > 0 ? `
      <div style="background:rgba(10,25,41,0.9);border-top:1px solid rgba(30,136,229,.3);padding:8px 0;overflow:hidden;display:flex;align-items:center;position:relative;">
        <div style="background:#1E88E5;color:white;font-weight:800;padding:4px 12px;font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;position:absolute;left:0;z-index:2;border-radius:0 20px 20px 0;box-shadow:2px 0 10px rgba(0,0,0,0.5);">
          RANKING DO MÊS
        </div>
        <div style="white-space:nowrap;animation: marqueeTV 30s linear infinite;padding-left:140px;display:flex;gap:30px;">
          ${allPerformers.map((t, idx) => `
            <div style="display:inline-flex;align-items:center;gap:6px;">
              <span style="color:#BA68C8;font-weight:900;font-size:0.9rem;">${idx+1}º</span>
              <span style="color:white;font-weight:700;font-size:0.9rem;">${t.nome}</span>
              <span style="background:rgba(186,104,200,.2);color:#E1BEE7;padding:1px 6px;border-radius:10px;font-weight:800;font-size:0.8rem;">${t.count}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <style>
        @keyframes marqueeTV {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      </style>
      ` : ''}

      <!-- Bottom bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 24px;background:#0A1929;border-top:1px solid rgba(30,136,229,.2);font-size:.65rem;color:#546E7A;">
        <span>PLANEJAMENTO DIMAN-BHZ — Gestão Industrial</span>
        <span id="meeting-update-info"></span>
        <span>F11 para tela cheia</span>
      </div>
    `;

    document.body.appendChild(overlay);

    // Tenta entrar em tela cheia (Fullscreen API)
    try {
      if (overlay.requestFullscreen) {
        overlay.requestFullscreen();
      } else if (overlay.webkitRequestFullscreen) { /* Safari */
        overlay.webkitRequestFullscreen();
      } else if (overlay.msRequestFullscreen) { /* IE11 */
        overlay.msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request falhou:", err);
    }

    // Clock
    interval = setInterval(() => {
      const dt = document.getElementById('meeting-datetime');
      if (dt) dt.textContent = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      const info = document.getElementById('meeting-update-info');
      if (info) { countdown--; if (countdown <= 0) { countdown = 30; } info.textContent = `Atualizado · Próxima atualização em ${countdown}s`; }
    }, 1000);
  }

  function deactivate() {
    if (interval) { clearInterval(interval); interval = null; }
    document.getElementById('meeting-overlay')?.remove();
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(()=>{});
    }
    if (window.Router) {
      const session = window.Auth ? window.Auth.getSession() : null;
      window.Router.navigate(session && session.perfil === 'Executante' ? 'worker-panel' : 'home', { force: true });
    } else {
      window.location.hash = '#home';
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  return { activate, deactivate, toggleFullscreen };
})();

// ================================================================
// TIMELINE MODULE
// ================================================================
window.TimelineModule = (() => {
  function render() {
    const eqs = DB.equipment.list();
    const allEvents = eqs.flatMap(e => (e.timeline||[]).map(tl => ({ ...tl, equipCode: e.codigo })));
    allEvents.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    const typeColor = { ENTRADA:'info', INICIO:'success', DEFEITO:'danger', PECA_SOLICITADA:'warning', REPLANEJAMENTO:'warning', LIBERACAO:'success' };

    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>Timeline de Eventos</div></div>
      <div class="timeline" style="padding:var(--space-4);">
        ${allEvents.map(tl=>`<div class="timeline-item">
          <div class="timeline-icon ${typeColor[tl.tipo]||'primary'}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
          <div class="timeline-content">
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1);">
              <div class="timeline-title">${tl.titulo}</div>
              <span class="badge badge-ghost" style="font-size:10px">${tl.equipCode}</span>
            </div>
            <div class="timeline-desc">${tl.descricao}</div>
            <div class="timeline-time">${formatDateTime(tl.timestamp)}</div>
          </div>
        </div>`).join('')}
        ${allEvents.length===0?'<div class="empty-state"><p>Nenhum evento registrado</p></div>':''}
      </div>
    </div>`;
  }
  return { render };
})();

// ================================================================
// LESSONS MODULE
// ================================================================
window.LessonsModule = (() => {
  function render() {
    const lessons = DB.lessons.list();
    const eqs = DB.equipment.list();
    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg></div>Lições Aprendidas</div>
        <button class="btn btn-primary" onclick="LessonsModule.openCreate()">+ Nova Lição</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:var(--space-4);">
        ${lessons.map(l=>`<div class="card hover-lift" style="border-left:3px solid var(--color-warning);">
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3);">
            <span style="font-size:1.5rem">💡</span>
            <div>
              <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-warning)">${l.disciplina}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">${l.equipmentTipo} · ${formatDate(l.createdAt)}</div>
            </div>
          </div>
          <div style="margin-bottom:var(--space-3);">
            <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-danger);margin-bottom:4px">🔴 Problema:</div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary)">${l.problema}</div>
          </div>
          <div style="margin-bottom:var(--space-3);">
            <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-success);margin-bottom:4px">✅ Solução:</div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary)">${l.solucao}</div>
          </div>
          <div style="padding:var(--space-2) var(--space-3);background:var(--color-warning-bg);border-radius:var(--radius-sm);font-size:var(--text-xs);color:var(--color-warning);">
            📝 ${l.recomendacao}
          </div>
          <div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-muted)">Tempo perdido: <strong>${l.tempoPerdido} dias</strong></div>
        </div>`).join('')}
        ${lessons.length===0?'<div class="empty-state" style="grid-column:1/-1"><p>Nenhuma lição aprendida registrada</p></div>':''}
      </div>
    </div>
    <div class="modal-overlay" id="modal-lesson">
      <div class="modal modal-lg"><div class="modal-header"><div class="modal-title">Nova Lição Aprendida</div><button class="modal-close" onclick="closeModal('modal-lesson')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
      <div class="modal-body" id="lesson-modal-body"></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-lesson')">Cancelar</button><button class="btn btn-primary" onclick="LessonsModule.save()">Salvar</button></div></div>
    </div>`;
  }

  function openCreate() {
    const discs = ['Mecânica','Caldeiraria','Elétrica','Usinagem','Pintor','Lavador','Montagem','Subconjunto','Teste','Retrabalho','Liderança'];
    document.getElementById('lesson-modal-body').innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-row"><div class="form-group"><label>Disciplina</label><select id="ll-disc">${discs.map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>
      <div class="form-group"><label>Tipo de Equipamento</label><input id="ll-tipo" placeholder="Sonda, Perfuratriz..." /></div></div>
      <div class="form-group"><label>Problema Encontrado *</label><textarea id="ll-prob" rows="3"></textarea></div>
      <div class="form-group"><label>Solução Aplicada *</label><textarea id="ll-sol" rows="3"></textarea></div>
      <div class="form-group"><label>Recomendação Futura *</label><textarea id="ll-rec" rows="3"></textarea></div>
      <div class="form-group"><label>Tempo Perdido (dias)</label><input type="number" id="ll-tempo" min="0" value="0" /></div>
    </div>`;
    openModal('modal-lesson');
  }

  function save() {
    const prob = document.getElementById('ll-prob').value.trim();
    const sol = document.getElementById('ll-sol').value.trim();
    if (!prob || !sol) { Toast.error('Erro', 'Preencha problema e solução'); return; }
    DB.lessons.create({ disciplina: document.getElementById('ll-disc').value, equipmentTipo: document.getElementById('ll-tipo').value, problema: prob, solucao: sol, recomendacao: document.getElementById('ll-rec').value, tempoPerdido: parseInt(document.getElementById('ll-tempo').value)||0 });
    closeModal('modal-lesson');
    Router.navigate('lessons', { force: true });
    Toast.success('Lição registrada!');
  }

  return { render, openCreate, save };
})();

// ================================================================
// STUB MODULES (Placeholders with basic UI)
// ================================================================

window.ImpactsModule = (() => {
  function render() {
    const allTasks = DB.tasks.getAll();
    const criticas = allTasks.filter(t => t.critico && t.status !== 'Concluída');
    const eqs = DB.equipment.list();
    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>Relatório de Impactos</div></div>
      <div class="alert alert-info" style="margin-bottom:var(--space-4);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg><div class="alert-content"><div class="alert-title">Análise de impacto de atrasos na data de liberação dos equipamentos</div></div></div>
      <div class="table-wrap"><table><thead><tr><th>Equipamento</th><th>Cliente</th><th>% Avanço</th><th>Data Liberação</th><th>Tarefas Críticas</th><th>Restrições</th><th>Impacto Estimado</th></tr></thead>
      <tbody>${eqs.map(e=>{const cr=allTasks.filter(t=>t.equipmentId===e.id&&t.critico&&t.status!=='Concluída').length;const rs=DB.restrictions.getAll().filter(r=>r.equipmentId===e.id&&r.status==='Aberta').length;const impact=cr*2+rs*3;return`<tr>
        <td><strong>${e.codigo}</strong></td><td>${e.cliente}</td><td>${e.pctAvanco||0}%</td>
        <td>${formatDate(e.dataLiberacaoPlanejada)}</td>
        <td><span class="badge badge-${cr>0?'danger':'success'}">${cr}</span></td>
        <td><span class="badge badge-${rs>0?'warning':'success'}">${rs}</span></td>
        <td><span class="badge badge-${impact>5?'danger':impact>0?'warning':'success'}">${impact > 0 ? `~${impact} dias de risco` : 'OK'}</span></td>
      </tr>`;}).join('')}</tbody></table></div>
    </div>`;
  }
  return { render };
})();

window.ReportsModule = (() => {
  function render() {
    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg></div>Relatórios</div>
        <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4);">
        ${[
          {id:'aderencia', title:'Relatório de Aderência',icon:'📊',desc:'Aderência ao planejamento por período'},
          {id:'equipamentos', title:'Relatório de Equipamentos',icon:'⚙️',desc:'Status e avanço de todos os equipamentos'},
          {id:'pecas', title:'Relatório de Peças',icon:'📦',desc:'Peças pendentes e criticidade'},
          {id:'custos', title:'Relatório de Custos',icon:'💰',desc:'Custos planejados vs realizados'},
          {id:'restricoes', title:'Relatório de Restrições',icon:'🚫',desc:'Restrições abertas e fechadas'},
          {id:'mo', title:'Relatório de MO',icon:'👥',desc:'Horas de mão de obra por período'},
        ].map(r=>`<div class="card card-clickable hover-lift" onclick="ReportsModule.generatePDF('${r.id}')">
          <div style="font-size:2rem;margin-bottom:var(--space-3)">${r.icon}</div>
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:var(--space-2)">${r.title}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted)">${r.desc}</div>
          <button class="btn btn-secondary btn-sm" style="margin-top:var(--space-4)">Gerar PDF</button>
        </div>`).join('')}
      </div>
    </div>`;
  }

  function generatePDF(type) {
    if (!window.jspdf) {
      Toast.error('Erro', 'Biblioteca jsPDF não encontrada.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Get current global filter if any
    const globalFilterEqId = window.GlobalEqFilter;
    const globalFilterEq = globalFilterEqId ? DB.equipment.get(globalFilterEqId) : null;
    const today = new Date().toISOString().slice(0, 10);

    // Common PDF styling helper
    const addHeader = (title) => {
      // Background band for header
      doc.setFillColor(13, 27, 42); // Navy
      doc.rect(0, 0, 210, 30, 'F');
      
      // Title text
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("DIMAN | SISTEMA INTELIGENTE DA MANUTENÇÃO", 15, 13);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(180, 200, 220);
      let filterText = globalFilterEq ? ` | Equipamento: ${globalFilterEq.codigo}` : "";
      doc.text(`${title}${filterText}`, 15, 22);

      // Date of generation
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, 145, 13);
    };

    const addFooter = (data) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, 15, doc.internal.pageSize.height - 10);
      doc.text("CONFIDENCIAL — APENAS PARA USO INTERNO", 120, doc.internal.pageSize.height - 10);
    };

    if (type === 'aderencia') {
      const allTasks = DB.tasks.getAll();
      const filteredTasks = globalFilterEqId ? allTasks.filter(t => t.equipmentId === globalFilterEqId) : allTasks;
      const eqs = DB.equipment.list();
      const equipMap = {};
      eqs.forEach(e => { equipMap[e.id] = e; });

      const total = filteredTasks.length;
      const concluded = filteredTasks.filter(t => t.status === 'Concluída').length;
      const inProgress = filteredTasks.filter(t => t.status === 'Em Andamento').length;
      const delayed = filteredTasks.filter(t => t.dataPlanejadaTermino && t.dataPlanejadaTermino < today && t.status !== 'Concluída').length;
      const adherenceRate = total > 0 ? Math.round((concluded / total) * 100) : 0;

      addHeader("Relatório de Aderência ao Planejamento");

      // Draw KPI boxes
      doc.setFillColor(240, 244, 249);
      doc.roundedRect(15, 35, 180, 25, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);
      doc.text("Total Atividades", 20, 43);
      doc.text("Concluídas", 55, 43);
      doc.text("Em Andamento", 90, 43);
      doc.text("Atrasadas", 125, 43);
      doc.text("Taxa de Aderência", 160, 43);

      doc.setFontSize(14);
      doc.setTextColor(13, 27, 42);
      doc.text(`${total}`, 20, 52);
      doc.setTextColor(40, 167, 69); // Green
      doc.text(`${concluded}`, 55, 52);
      doc.setTextColor(0, 123, 255); // Blue
      doc.text(`${inProgress}`, 90, 52);
      doc.setTextColor(220, 53, 69); // Red
      doc.text(`${delayed}`, 125, 52);
      doc.setTextColor(21, 101, 192); // Brand Blue
      doc.text(`${adherenceRate}%`, 160, 52);

      // Tasks Table
      const columns = ['Equipamento', 'Cód. Tarefa', 'Descrição', 'Disciplina', 'Início Plan.', 'Término Plan.', 'Avanço', 'Status'];
      const rows = filteredTasks.map(t => [
        equipMap[t.equipmentId]?.codigo || '—',
        t.codigo || '—',
        t.critico ? `[CRÍTICA] ${t.descricao}` : t.descricao,
        t.disciplina || '—',
        formatDate(t.dataPlanejadaInicio),
        formatDate(t.dataPlanejadaTermino),
        `${t.pctExecutado || 0}%`,
        t.status
      ]);

      doc.autoTable({
        startY: 68,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [13, 27, 42] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          2: { cellWidth: 50 }, // Description column wider
        },
        didDrawPage: addFooter
      });

      doc.save(`Relatorio_Aderencia_${today}.pdf`);
      Toast.success('PDF Gerado', 'Relatório de Aderência baixado com sucesso!');
    }
    else if (type === 'equipamentos') {
      const eqs = DB.equipment.list();
      const filteredEqs = globalFilterEqId ? eqs.filter(e => e.id === globalFilterEqId) : eqs;
      const allTasks = DB.tasks.getAll();
      const restrictions = DB.restrictions.getAll();
      
      const total = filteredEqs.length;
      const emManutencao = filteredEqs.filter(e => e.status === 'Em Manutenção').length;
      const liberados = filteredEqs.filter(e => e.status === 'Liberado').length;
      const bloqueados = filteredEqs.filter(e => e.status === 'Paralisado' || e.status === 'Falta de Peças' || e.status === 'Falta de Mão de Obra').length;
      const avgProgress = total > 0 ? Math.round(filteredEqs.reduce((s, e) => s + (e.pctAvanco || 0), 0) / total) : 0;

      addHeader("Relatório de Equipamentos em Manutenção");

      // Draw KPI boxes
      doc.setFillColor(240, 244, 249);
      doc.roundedRect(15, 35, 180, 25, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);
      doc.text("Total Equip.", 20, 43);
      doc.text("Em Manutenção", 55, 43);
      doc.text("Liberados", 90, 43);
      doc.text("Paral. / F. Peça", 125, 43);
      doc.text("Média Progresso", 160, 43);

      doc.setFontSize(14);
      doc.setTextColor(13, 27, 42);
      doc.text(`${total}`, 20, 52);
      doc.setTextColor(21, 101, 192); 
      doc.text(`${emManutencao}`, 55, 52);
      doc.setTextColor(40, 167, 69); 
      doc.text(`${liberados}`, 90, 52);
      doc.setTextColor(220, 53, 69); 
      doc.text(`${bloqueados}`, 125, 52);
      doc.setTextColor(13, 27, 42);
      doc.text(`${avgProgress}%`, 160, 52);

      // Equipments Table
      const columns = ['Código', 'Nome / Descrição', 'Cliente', 'Avanço', 'Status', 'Previsão Lib.', 'Atividades', 'Restr. Abertas'];
      const rows = filteredEqs.map(e => {
        const eqTasks = allTasks.filter(t => t.equipmentId === e.id);
        const eqRestr = restrictions.filter(r => r.equipmentId === e.id && r.status === 'Aberta').length;
        return [
          e.codigo,
          e.nome || '—',
          e.cliente || '—',
          `${e.pctAvanco || 0}%`,
          e.status,
          formatDate(e.dataLiberacaoAtual || e.dataLiberacaoPlanejada),
          `${eqTasks.filter(t=>t.status==='Concluída').length}/${eqTasks.length}`,
          `${eqRestr}`
        ];
      });

      doc.autoTable({
        startY: 68,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [13, 27, 42] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          1: { cellWidth: 50 }, // Name column wider
        },
        didDrawPage: addFooter
      });

      doc.save(`Relatorio_Equipamentos_${today}.pdf`);
      Toast.success('PDF Gerado', 'Relatório de Equipamentos baixado com sucesso!');
    }
    else if (type === 'pecas') {
      const parts = DB.parts.getAll();
      const filteredParts = globalFilterEqId ? parts.filter(p => p.equipmentId === globalFilterEqId) : parts;
      const eqs = DB.equipment.list();
      const equipMap = {};
      eqs.forEach(e => { equipMap[e.id] = e; });

      const total = filteredParts.length;
      const pendentes = filteredParts.filter(p => ['Solicitada', 'Comprada', 'Em Transporte'].includes(p.status)).length;
      const criticas = filteredParts.filter(p => p.critica).length;
      const recebidas = filteredParts.filter(p => ['Recebida', 'Instalada'].includes(p.status)).length;

      addHeader("Relatório de Peças e Criticidade");

      // Draw KPI boxes
      doc.setFillColor(240, 244, 249);
      doc.roundedRect(15, 35, 180, 25, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);
      doc.text("Total Peças", 25, 43);
      doc.text("Pendentes", 65, 43);
      doc.text("Críticas", 105, 43);
      doc.text("Recebidas / Instaladas", 145, 43);

      doc.setFontSize(14);
      doc.setTextColor(13, 27, 42);
      doc.text(`${total}`, 25, 52);
      doc.setTextColor(255, 107, 0); // Orange
      doc.text(`${pendentes}`, 65, 52);
      doc.setTextColor(220, 53, 69); // Red
      doc.text(`${criticas}`, 105, 52);
      doc.setTextColor(40, 167, 69); // Green
      doc.text(`${recebidas}`, 145, 52);

      // Parts Table
      const columns = ['Código', 'Descrição', 'Equipamento', 'Qtd', 'Status', 'Fornecedor', 'Prazo Entrega', 'Crítica'];
      const rows = filteredParts.map(p => [
        p.codigo || '—',
        p.descricao || '—',
        equipMap[p.equipmentId]?.codigo || '—',
        `${p.qtd || 1}`,
        p.status || '—',
        p.fornecedor || '—',
        formatDate(p.prazoEntrega),
        p.critica ? 'SIM' : 'Não'
      ]);

      doc.autoTable({
        startY: 68,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [13, 27, 42] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          1: { cellWidth: 50 }, 
        },
        didDrawPage: addFooter
      });

      doc.save(`Relatorio_Pecas_${today}.pdf`);
      Toast.success('PDF Gerado', 'Relatório de Peças baixado com sucesso!');
    }
    else if (type === 'custos') {
      const costs = DB.costs.getAll();
      const filteredCosts = globalFilterEqId ? costs.filter(c => c.equipmentId === globalFilterEqId) : costs;
      const eqs = DB.equipment.list();
      const equipMap = {};
      eqs.forEach(e => { equipMap[e.id] = e; });

      const totalPlanejado = filteredCosts.reduce((s, c) => s + (c.valorPlanejado || 0), 0);
      const totalRealizado = filteredCosts.reduce((s, c) => s + (c.valorRealizado || 0), 0);
      const desvioValor = totalRealizado - totalPlanejado;
      const desvioPct = totalPlanejado > 0 ? Math.round((desvioValor / totalPlanejado) * 100) : 0;

      addHeader("Relatório de Custos de Manutenção");

      // Draw KPI boxes
      doc.setFillColor(240, 244, 249);
      doc.roundedRect(15, 35, 180, 25, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);
      doc.text("Total Custos", 20, 43);
      doc.text("Total Planejado", 55, 43);
      doc.text("Total Realizado", 100, 43);
      doc.text("Desvio (BRL)", 145, 43);
      doc.text("Desvio %", 175, 43);

      doc.setFontSize(14);
      doc.setTextColor(13, 27, 42);
      doc.text(`${filteredCosts.length}`, 20, 52);
      doc.setTextColor(13, 27, 42);
      doc.text(formatCurrency(totalPlanejado), 55, 52);
      doc.text(formatCurrency(totalRealizado), 100, 52);
      doc.setTextColor(desvioValor > 0 ? 220 : 40, desvioValor > 0 ? 53 : 167, desvioValor > 0 ? 69 : 69);
      doc.text(`${desvioValor > 0 ? '+' : ''}${formatCurrency(desvioValor)}`, 145, 52);
      doc.text(`${desvioValor > 0 ? '+' : ''}${desvioPct}%`, 175, 52);

      // Costs Table
      const columns = ['Equipamento', 'Categoria', 'Descrição', 'Valor Planejado', 'Valor Realizado', 'Desvio BRL', 'Data'];
      const rows = filteredCosts.map(c => {
        const diff = (c.valorRealizado || 0) - (c.valorPlanejado || 0);
        return [
          equipMap[c.equipmentId]?.codigo || '—',
          c.categoria || '—',
          c.descricao || '—',
          formatCurrency(c.valorPlanejado),
          formatCurrency(c.valorRealizado),
          `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`,
          formatDate(c.data)
        ];
      });

      doc.autoTable({
        startY: 68,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [13, 27, 42] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          2: { cellWidth: 50 },
        },
        didDrawPage: addFooter
      });

      doc.save(`Relatorio_Custos_${today}.pdf`);
      Toast.success('PDF Gerado', 'Relatório de Custos baixado com sucesso!');
    }
    else if (type === 'restricoes') {
      const restrictions = DB.restrictions.getAll();
      const filteredRestr = globalFilterEqId ? restrictions.filter(r => r.equipmentId === globalFilterEqId) : restrictions;
      const eqs = DB.equipment.list();
      const equipMap = {};
      eqs.forEach(e => { equipMap[e.id] = e; });

      const total = filteredRestr.length;
      const abertas = filteredRestr.filter(r => r.status === 'Aberta').length;
      const fechadas = filteredRestr.filter(r => r.status === 'Fechada').length;

      addHeader("Relatório de Restrições Operacionais");

      // Draw KPI boxes
      doc.setFillColor(240, 244, 249);
      doc.roundedRect(15, 35, 180, 25, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);
      doc.text("Total Restrições", 30, 43);
      doc.text("Abertas", 85, 43);
      doc.text("Fechadas", 140, 43);

      doc.setFontSize(14);
      doc.setTextColor(13, 27, 42);
      doc.text(`${total}`, 30, 52);
      doc.setTextColor(220, 53, 69); // Red
      doc.text(`${abertas}`, 85, 52);
      doc.setTextColor(40, 167, 69); // Green
      doc.text(`${fechadas}`, 140, 52);

      // Restrictions Table
      const columns = ['Equipamento', 'Tipo de Restrição', 'Descrição', 'Status', 'Abertura', 'Fechamento / Resolução'];
      const rows = filteredRestr.map(r => [
        equipMap[r.equipmentId]?.codigo || '—',
        r.tipo || '—',
        r.descricao || '—',
        r.status || '—',
        formatDate(r.createdAt),
        r.status === 'Fechada' ? `FECHADA em ${formatDate(r.closedAt || r.updatedAt)}\nResolução: ${r.resolution || '—'}` : 'PENDENTE'
      ]);

      doc.autoTable({
        startY: 68,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [13, 27, 42] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          2: { cellWidth: 50 },
          5: { cellWidth: 50 }
        },
        didDrawPage: addFooter
      });

      doc.save(`Relatorio_Restricoes_${today}.pdf`);
      Toast.success('PDF Gerado', 'Relatório de Restrições baixado com sucesso!');
    }
    else if (type === 'mo') {
      const workers = DB.workforce.list();
      const timesheets = DB.timesheets.list();
      const filteredTimesheets = globalFilterEqId ? timesheets.filter(t => t.equipmentId === globalFilterEqId) : timesheets;

      const totalWorkers = workers.length;
      const activeWorkers = workers.filter(w => w.status === 'Ativo').length;
      const totalHours = filteredTimesheets.filter(t => !t.tipo || t.tipo === 'Trabalho').reduce((s, t) => s + (parseFloat(t.horasTrabalhadas) || 0), 0);

      addHeader("Relatório de Mão de Obra e Apontamentos");

      // Draw KPI boxes
      doc.setFillColor(240, 244, 249);
      doc.roundedRect(15, 35, 180, 25, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);
      doc.text("Total Colaboradores", 25, 43);
      doc.text("Profissionais Ativos", 85, 43);
      doc.text("Total Horas Apontadas", 145, 43);

      doc.setFontSize(14);
      doc.setTextColor(13, 27, 42);
      doc.text(`${totalWorkers}`, 25, 52);
      doc.setTextColor(40, 167, 69); 
      doc.text(`${activeWorkers}`, 85, 52);
      doc.setTextColor(21, 101, 192); 
      doc.text(`${totalHours.toFixed(1)}h`, 145, 52);

      // Section 1: Workforce summary
      doc.setFontSize(11);
      doc.setTextColor(13, 27, 42);
      doc.text("Quadro de Colaboradores", 15, 68);

      const columnsW = ['Matrícula', 'Colaborador', 'Função', 'Disciplina', 'Status', 'Horas Apontadas'];
      const rowsW = workers.map(w => {
        const wHours = timesheets.filter(t => t.workerId === w.id && (!t.tipo || t.tipo === 'Trabalho')).reduce((s, t) => s + (parseFloat(t.horasTrabalhadas) || 0), 0);
        return [
          w.matricula || '—',
          w.nome,
          w.funcao || '—',
          w.disciplina || '—',
          w.status || 'Ativo',
          `${wHours.toFixed(1)}h`
        ];
      });

      doc.autoTable({
        startY: 72,
        head: [columnsW],
        body: rowsW,
        theme: 'striped',
        headStyles: { fillColor: [13, 27, 42] },
        styles: { fontSize: 8, cellPadding: 2 },
        didDrawPage: addFooter
      });

      // Section 2: Recent Timesheets
      const startY2 = doc.lastAutoTable.finalY + 12;
      if (startY2 < doc.internal.pageSize.height - 40) {
        doc.setFontSize(11);
        doc.setTextColor(13, 27, 42);
        doc.text("Histórico Recente de Apontamentos de Horas", 15, startY2);

        const eqs = DB.equipment.list();
        const equipMap = {};
        eqs.forEach(e => { equipMap[e.id] = e; });

        const columnsT = ['Data', 'Colaborador', 'Equipamento', 'Início', 'Término', 'Horas', 'Observação'];
        const rowsT = filteredTimesheets.slice(-40).reverse().map(t => {
          const w = workers.find(w => w.id === t.workerId);
          return [
            formatDate(t.data),
            w?.nome || t.workerNome || '—',
            equipMap[t.equipmentId]?.codigo || '—',
            t.horaInicio || '—',
            t.horaFim || '—',
            `${(t.horasTrabalhadas || 0).toFixed(1)}h`,
            t.observacao || '—'
          ];
        });

        doc.autoTable({
          startY: startY2 + 4,
          head: [columnsT],
          body: rowsT,
          theme: 'striped',
          headStyles: { fillColor: [13, 27, 42] },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            6: { cellWidth: 50 }
          },
          didDrawPage: addFooter
        });
      }

      doc.save(`Relatorio_MaoDeObra_${today}.pdf`);
      Toast.success('PDF Gerado', 'Relatório de Mão de Obra baixado com sucesso!');
    }
  }

  return { render, generatePDF };
})();

window.AuditModule = (() => {
  function render() {
    const logs = Auth.getAuditLogs().slice(-100).reverse();
    return `<div class="page-container">
      <div class="section-header"><div class="section-title"><div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg></div>Log de Auditoria</div>
        <span style="font-size:var(--text-sm);color:var(--text-muted)">${logs.length} registros</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead>
        <tbody>
          ${logs.map(l=>`<tr>
            <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${formatDateTime(l.timestamp)}</td>
            <td>${l.userNome||l.userId||'Sistema'}</td>
            <td><span class="badge badge-${l.action==='DELETE'?'danger':l.action==='CREATE'?'success':'primary'}">${l.action}</span></td>
            <td><span class="badge badge-ghost">${l.entity}</span></td>
            <td style="font-size:var(--text-xs);color:var(--text-muted)">${JSON.stringify(l.changes||{}).slice(0,60)}...</td>
          </tr>`).join('')}
          ${logs.length===0?'<tr><td colspan="5" style="text-align:center;padding:var(--space-8);color:var(--text-muted)">Nenhum registro de auditoria</td></tr>':''}
        </tbody>
      </table></div>
    </div>`;
  }
  return { render };
})();

window.UsersModule = (() => {
  function render() {
    if (!Auth.hasPermission('users')) return '<div class="page-container"><div class="empty-state"><p>Sem permissão para acessar este módulo</p></div></div>';
    const users = JSON.parse(localStorage.getItem('diman_users')||'[]');
    
    setTimeout(() => {
      if(!document.getElementById('modal-user-form')) {
        const perfis = ['Desenvolvedor', 'Administrador', 'Gerente', 'Planejador', 'Coordenador', 'Supervisor', 'Encarregado', 'Executante', 'Cliente'];
        const modalHtml = `
          <div class="modal-overlay" id="modal-user-form">
            <div class="modal">
              <div class="modal-header">
                <div class="modal-title">Novo Usuário</div>
                <button class="modal-close" onclick="closeModal('modal-user-form')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <div class="modal-body">
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                  <div class="form-group"><label>Matrícula *</label><input type="text" id="nu-mat" placeholder="Ex: 012345" /></div>
                  <div class="form-group"><label>Nome *</label><input type="text" id="nu-nome" placeholder="Nome Completo" /></div>
                  <div class="form-group"><label>Email</label><input type="email" id="nu-email" placeholder="email@exemplo.com" /></div>
                  <div class="form-group"><label>Perfil de Acesso *</label><select id="nu-perfil">${perfis.map(p=>`<option>${p}</option>`).join('')}</select></div>
                  <div class="form-group"><label>Setor / Disciplina</label><select id="nu-disciplina"><option value="">Nenhum</option><option value="Usinagem">Usinagem</option><option value="Mecânica">Mecânica</option><option value="Caldeiraria">Caldeiraria</option><option value="Elétrica">Elétrica</option><option value="Retrabalho">Retrabalho</option><option value="Teste">Teste</option><option value="Subconjunto">Subconjunto</option><option value="Pintura">Pintura</option><option value="Lavador">Lavador</option></select></div>
                  <div class="form-group"><label>Senha Temporária</label><input type="text" id="nu-senha" value="Gerada automaticamente ao salvar" readonly style="background:var(--bg-base);color:var(--text-muted);font-style:italic;" /></div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">O sistema gerará uma senha aleatória que deverá ser informada ao funcionário.</div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('modal-user-form')">Cancelar</button>
                <button class="btn btn-primary" onclick="UsersModule.saveUser()">Salvar</button>
              </div>
            </div>
          </div>
          
          <div class="modal-overlay" id="modal-edit-user">
            <div class="modal">
              <div class="modal-header">
                <div class="modal-title">Editar Usuário</div>
                <button class="modal-close" onclick="closeModal('modal-edit-user')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <div class="modal-body">
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                  <input type="hidden" id="eu-id" />
                  <div class="form-group"><label>Nome do Usuário *</label><input type="text" id="eu-nome" /></div>
                  <div class="form-group"><label>Nível / Perfil de Acesso *</label><select id="eu-perfil">${perfis.map(p=>`<option>${p}</option>`).join('')}</select></div>
                  <div class="form-group"><label>Setor / Disciplina</label><select id="eu-disciplina"><option value="">Nenhum</option><option value="Usinagem">Usinagem</option><option value="Mecânica">Mecânica</option><option value="Caldeiraria">Caldeiraria</option><option value="Elétrica">Elétrica</option><option value="Retrabalho">Retrabalho</option><option value="Teste">Teste</option><option value="Subconjunto">Subconjunto</option><option value="Pintura">Pintura</option><option value="Lavador">Lavador</option></select></div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('modal-edit-user')">Cancelar</button>
                <button class="btn btn-primary" onclick="UsersModule.saveEditUser()">Salvar Alterações</button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
      }
    }, 100);

    return `<div class="page-container" style="animation: fadeIn 0.3s ease;">
      <div class="section-header">
        <div class="section-title">
          <div class="section-title-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg></div>
          <div>Gestão de Usuários</div>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" onclick="openModal('modal-user-form')">+ Novo Usuário</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Matrícula</th><th>Nome</th><th>Perfil</th><th>Setor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          ${users.map(u=>`<tr>
            <td style="font-family:var(--font-mono)">${u.matricula}</td>
            <td><div style="display:flex;align-items:center;gap:var(--space-2)"><div class="avatar avatar-sm">${avatarInitials(u.nome)}</div>${u.nome}</div></td>
            <td><span class="badge badge-primary">${u.perfil}</span></td>
            <td>${u.disciplina ? `<span class="badge badge-ghost" style="color:var(--text-secondary)">${u.disciplina}</span>` : '—'}</td>
            <td>${statusBadge(u.status||'Ativo')}</td>
            <td>
              <div class="table-actions">
                ${u.id !== 'u-superadmin' ? `
                  <button class="btn btn-secondary btn-sm" onclick="UsersModule.openEditUser('${u.id}')">Editar</button>
                  <button class="btn btn-secondary btn-sm" onclick="UsersModule.resetPassword('${u.id}')" title="Resetar senha para 123456">Resetar Senha</button>
                  <button class="btn btn-danger btn-sm" onclick="UsersModule.deleteUser('${u.id}')">Excluir</button>
                ` : ''}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  }
  
  async function saveUser() {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem criar usuários.');
      return;
    }

    const matricula = document.getElementById('nu-mat').value.trim();
    const nome = document.getElementById('nu-nome').value.trim();
    const email = document.getElementById('nu-email').value.trim();
    const perfil = document.getElementById('nu-perfil').value;
    const disciplina = document.getElementById('nu-disciplina').value;
    
    if(!matricula || !nome || !perfil) {
      Toast && Toast.error('Erro', 'Preencha os campos obrigatórios (*).');
      return;
    }
    
    const users = JSON.parse(localStorage.getItem('diman_users')||'[]');
    if(users.find(u => u.matricula === matricula)) {
      Toast && Toast.error('Erro', 'Matrícula já existe.');
      return;
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPassword = '123456';

    const senhaHash = await Auth.hashPassword(randomPassword);

    const newUser = {
      id: DB.uid('u'),
      matricula,
      nome,
      email,
      perfil,
      disciplina,
      senhaHash,
      senhaInicial: true,
      status: 'Ativo',
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('diman_users', JSON.stringify(users));
    if (window.DB && window.DB.syncToSupabase) window.DB.syncToSupabase('diman_users', users);
    
    closeModal('modal-user-form');
    Router.navigate('users', { force: true });

    // Exibir modal customizado com opção de copiar a senha
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-sm" style="max-width:380px;">
        <div class="modal-body" style="text-align:center;padding:var(--space-6)">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(99, 102, 241, 0.1);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);color:var(--brand-primary-light);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:24px;height:24px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h3 style="margin-bottom:var(--space-2);font-weight:700;">Usuário Criado!</h3>
          <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4)">Informe a senha temporária abaixo ao funcionário. Ele precisará trocá-la no primeiro acesso.</p>
          
          <div style="display:flex;gap:8px;background:var(--bg-base);padding:10px;border-radius:6px;border:1px solid var(--border-default);align-items:center;margin-bottom:var(--space-4);">
            <input type="text" readonly id="temp-pwd-input" value="${randomPassword}" style="flex:1;background:transparent;border:none;outline:none;color:var(--text-primary);font-family:var(--font-mono);font-size:16px;font-weight:bold;text-align:center;" />
            <button class="btn btn-secondary btn-sm" id="btn-copy-pwd" style="padding:6px 12px;font-size:11px;">Copiar</button>
          </div>
        </div>
        <div class="modal-footer" style="justify-content:center;border-top:none;padding-top:0;">
          <button class="btn btn-primary" id="btn-close-pwd" style="width:100%;">Fechar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => { requestAnimationFrame(() => overlay.classList.add('open')); });
    
    const copyBtn = overlay.querySelector('#btn-copy-pwd');
    const pwdInput = overlay.querySelector('#temp-pwd-input');
    
    // Tenta copiar automaticamente de início
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(randomPassword).then(() => {
        Toast && Toast.success('Copiado!', 'Senha temporária copiada para a área de transferência.');
      }).catch(() => {});
    }

    copyBtn.onclick = () => {
      pwdInput.select();
      pwdInput.setSelectionRange(0, 99999);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(randomPassword).then(() => {
          Toast && Toast.success('Copiado!', 'Senha copiada com sucesso.');
        }).catch(err => {
          console.error(err);
          Toast && Toast.error('Erro', 'Use copiar manualmente.');
        });
      } else {
        try {
          document.execCommand('copy');
          Toast && Toast.success('Copiado!', 'Senha copiada com sucesso.');
        } catch(e) {
          Toast && Toast.error('Erro', 'Selecione e copie a senha manualmente.');
        }
      }
    };
    
    overlay.querySelector('#btn-close-pwd').onclick = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };
  }

  function deleteUser(id) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem excluir usuários.');
      return;
    }
    window.uiConfirm('Tem certeza que deseja excluir este usuário?', (res) => {
      if (!res) return;
      let users = JSON.parse(localStorage.getItem('diman_users')||'[]');
      users = users.filter(u => u.id !== id);
      localStorage.setItem('diman_users', JSON.stringify(users));
      if (window.DB && DB.syncToSupabase) DB.syncToSupabase('diman_users', users);
      Toast && Toast.success('Sucesso', 'Usuário excluído.');
      Router.navigate('users', { force: true });
    });
  }

  function openEditUser(id) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem editar usuários.');
      return;
    }
    
    let users = JSON.parse(localStorage.getItem('diman_users')||'[]');
    const user = users.find(u => u.id === id);
    if(!user) return;
    
    document.getElementById('eu-id').value = user.id;
    document.getElementById('eu-nome').value = user.nome;
    document.getElementById('eu-perfil').value = user.perfil;
    document.getElementById('eu-disciplina').value = user.disciplina || '';
    
    openModal('modal-edit-user');
  }

  function saveEditUser() {
    const id = document.getElementById('eu-id').value;
    const newNome = document.getElementById('eu-nome').value.trim();
    const newPerfil = document.getElementById('eu-perfil').value;
    const newDisciplina = document.getElementById('eu-disciplina').value;
    
    if(!id || !newPerfil || !newNome) return;
    
    let users = JSON.parse(localStorage.getItem('diman_users')||'[]');
    const userIndex = users.findIndex(u => u.id === id);
    if(userIndex === -1) return;
    
    users[userIndex].nome = newNome;
    users[userIndex].perfil = newPerfil;
    users[userIndex].disciplina = newDisciplina;
    
    localStorage.setItem('diman_users', JSON.stringify(users));
    if (window.DB && DB.syncToSupabase) DB.syncToSupabase('diman_users', users);
    
    Toast && Toast.success('Sucesso', 'Usuário atualizado com sucesso.');
    closeModal('modal-edit-user');
    Router.navigate('users', { force: true });
  }

  function resetPassword(id) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast && Toast.error('Acesso Negado', 'Apenas administradores podem resetar senhas.');
      return;
    }
    window.uiConfirm('Tem certeza que deseja resetar a senha deste usuário para 123456?', (res) => {
      if (!res) return;
      let users = JSON.parse(localStorage.getItem('diman_users')||'[]');
      const userIndex = users.findIndex(u => u.id === id);
      if(userIndex === -1) return;
      
      Auth.hashPassword('123456').then(hash => {
        users[userIndex].senhaHash = hash;
        users[userIndex].senhaInicial = true;
        localStorage.setItem('diman_users', JSON.stringify(users));
        if (window.DB && DB.syncToSupabase) DB.syncToSupabase('diman_users', users);
        Toast && Toast.success('Sucesso', 'Senha resetada para 123456.');
      });
    });
  }

  return { render, saveUser, deleteUser, openEditUser, saveEditUser, resetPassword };
})();
// ================================================================
// ACTION PLAN MODULE — AI-generated action plans for release blockers
// ================================================================
window.ActionPlanModule = (() => {
  const STORAGE_KEY = 'diman_action_plans';

  function getPlans() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function savePlans(plans) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    if (window.DB && window.DB.syncToSupabase) window.DB.syncToSupabase(STORAGE_KEY, plans);
  }

  // ---- AI Analysis Engine ----
  function analyzeEquipment(eq) {
    const tasks = DB.tasks.getByEquipment(eq.id);
    const allRestrictions = DB.restrictions.getAll();
    const restrictions = allRestrictions.filter(r => r.equipmentId === eq.id && r.status === 'Aberta');
    const parts = DB.parts.getAll().filter(p => p.equipmentId === eq.id && ['Solicitada','Comprada','Em Transporte'].includes(p.status));
    const critParts = parts.filter(p => p.critica);
    const repls = eq.replanning || [];
    const today = new Date().toISOString().slice(0, 10);

    const openTasks = tasks.filter(t => t.status !== 'Concluída');
    const blockedTasks = openTasks.filter(t => ['Bloqueada','Aguardando Peça','Aguardando Recurso','Aguardando Aprovação'].includes(t.status));
    const delayedTasks = openTasks.filter(t => t.dataPlanejadaTermino && t.dataPlanejadaTermino < today);
    const criticalTasks = openTasks.filter(t => t.critico);
    const totalDelay = repls.reduce((s, r) => s + daysBetween(r.dataAnterior, r.novaData), 0);

    const totalHPlan = openTasks.reduce((s, t) => s + (t.horasPlanejadas || 0), 0);
    const totalHReal = openTasks.reduce((s, t) => s + (t.horasRealizadas || 0), 0);
    const pctAvancoTasks = tasks.length > 0 ? Math.round(tasks.filter(t => t.status === 'Concluída').length / tasks.length * 100) : 0;

    const items = [];

    // Delayed tasks
    delayedTasks.forEach(t => {
      const diasAtraso = daysBetween(t.dataPlanejadaTermino, today);
      items.push({
        tipo: 'Tarefa Atrasada',
        severidade: diasAtraso > 5 ? 'Crítica' : diasAtraso > 2 ? 'Alta' : 'Média',
        descricao: `Atividade "${t.descricao}" está ${diasAtraso} dia(s) atrasada. Disciplina: ${t.disciplina || '—'}. Responsável: ${t.responsavel || 'Não atribuído'}.`,
        acao: diasAtraso > 5
          ? `Mobilizar recurso adicional URGENTEMENTE para concluir. Avaliar hora extra ou realocação de equipe de outro equipamento. Prazo: IMEDIATO.`
          : `Priorizar esta atividade. Verificar se há bloqueio de peça ou recurso. Cobrar atualização do responsável.`,
        responsavel: t.responsavel || 'Supervisor de Manutenção',
        prazo: diasAtraso > 5 ? 'Imediato' : `${Math.min(diasAtraso, 3)} dia(s)`,
        disciplina: t.disciplina || '—',
        taskId: t.id,
      });
    });

    // Blocked tasks
    blockedTasks.filter(t => !delayedTasks.includes(t)).forEach(t => {
      const motivo = t.status === 'Aguardando Peça' ? 'Aguardando peça' :
                     t.status === 'Aguardando Recurso' ? 'Aguardando recurso/mão de obra' :
                     t.status === 'Aguardando Aprovação' ? 'Aguardando aprovação técnica' : 'Bloqueada';
      items.push({
        tipo: 'Tarefa Bloqueada',
        severidade: t.critico ? 'Crítica' : 'Alta',
        descricao: `Atividade "${t.descricao}" com status "${t.status}". Motivo: ${motivo}. Disciplina: ${t.disciplina || '—'}.`,
        acao: t.status === 'Aguardando Peça'
          ? `Verificar status da peça com suprimentos. Buscar alternativa de peça nacional ou canibalização de outro equipamento se o prazo for superior a 3 dias.`
          : t.status === 'Aguardando Recurso'
          ? `Solicitar ao planejamento a alocação de mão de obra qualificada. Avaliar remanejamento de outra frente com menor prioridade.`
          : t.status === 'Aguardando Aprovação'
          ? `Escalar para o coordenador/gerente para aprovação imediata. Identificar o responsável pela aprovação e cobrar resposta.`
          : `Investigar causa raiz do bloqueio e registrar restrição formal no sistema. Escalar para a supervisão.`,
        responsavel: t.responsavel || 'Planejamento',
        prazo: t.critico ? 'Imediato' : '2 dias',
        disciplina: t.disciplina || '—',
        taskId: t.id,
      });
    });

    // Open restrictions
    restrictions.forEach(r => {
      items.push({
        tipo: 'Restrição Aberta',
        severidade: r.impactoCaminhosCriticos ? 'Crítica' : 'Alta',
        descricao: `Restrição: "${r.tipo}" — ${r.descricao}. ${r.tarefaBloqueada ? 'Bloqueia tarefa: ' + r.tarefaBloqueada + '.' : ''}`,
        acao: r.tipo === 'Falta de Peça'
          ? `Acionar suprimentos para expeditar entrega. Verificar se há alternativa de peça ou possibilidade de canibalização de equipamento já liberado.`
          : r.tipo === 'Falta de Mão de Obra'
          ? `Solicitar contratação emergencial ou remanejamento de equipe de outra frente. Considerar subcontratação se prazo for apertado.`
          : r.tipo === 'Falta de Ferramenta'
          ? `Verificar disponibilidade de ferramenta no almoxarifado ou unidade vizinha. Avaliar compra/locação emergencial.`
          : `Reunir equipe de ação para tratamento imediato. Escalar à gerência se necessário.`,
        responsavel: 'Supervisão / Planejamento',
        prazo: r.impactoCaminhosCriticos ? 'Imediato' : '3 dias',
        disciplina: r.disciplina || '—',
      });
    });

    // Critical pending parts
    critParts.forEach(p => {
      items.push({
        tipo: 'Peça Crítica Pendente',
        severidade: 'Crítica',
        descricao: `Peça "${p.descricao}" (PN: ${p.pn || '—'}) está com status "${p.status}". Impacta diretamente o caminho crítico.`,
        acao: `Contatar fornecedor para confirmar prazo real. Avaliar frete aéreo se necessário. Verificar possibilidade de canibalização de peça de equipamento já liberado. Comunicar compras e supervisão.`,
        responsavel: 'Suprimentos / Compras',
        prazo: 'Imediato',
        disciplina: '—',
      });
    });

    // Replanning excessive
    if (totalDelay > 7) {
      items.push({
        tipo: 'Excesso de Replanejamentos',
        severidade: 'Alta',
        descricao: `Equipamento acumula ${totalDelay} dias de atraso com ${repls.length} replanejamento(s). Causas: ${repls.map(r => r.motivo).join('; ')}.`,
        acao: `Realizar reunião de análise de causa raiz com equipe multidisciplinar. Criar cronograma de recuperação com marcos intermediários. Considerar trabalho em finais de semana ou horas extras controladas para recuperar o atraso.`,
        responsavel: 'Coordenação / Planejamento',
        prazo: '2 dias',
        disciplina: '—',
      });
    }

    // Low progress warning
    if (pctAvancoTasks < 50 && openTasks.length > 3) {
      const daysToRelease = daysBetween(today, eq.dataLiberacaoPlanejada || today);
      if (daysToRelease < 15 && daysToRelease > 0) {
        items.push({
          tipo: 'Baixo Avanço Físico',
          severidade: 'Crítica',
          descricao: `Avanço de apenas ${pctAvancoTasks}% com ${daysToRelease} dias restantes até a data de liberação planejada. ${openTasks.length} atividades ainda em aberto.`,
          acao: `Priorizar atividades do caminho crítico. Considerar turno estendido ou mobilização de equipe adicional. Rever cronograma e comunicar ao cliente qualquer risco de atraso com plano de mitigação.`,
          responsavel: 'Coordenação / Gerência',
          prazo: 'Imediato',
          disciplina: '—',
        });
      }
    }

    // Sort by severity
    const sevOrder = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };
    items.sort((a, b) => (sevOrder[a.severidade] || 99) - (sevOrder[b.severidade] || 99));

    return {
      equipmentId: eq.id,
      equipmentCodigo: eq.codigo,
      equipmentCliente: eq.cliente,
      equipmentStatus: eq.status,
      pctAvanco: eq.pctAvanco || pctAvancoTasks,
      dataLiberacao: eq.dataLiberacaoPlanejada,
      totalDelay,
      totalOpenTasks: openTasks.length,
      totalCritical: criticalTasks.length,
      totalRestrictions: restrictions.length,
      totalPendingParts: parts.length,
      items,
    };
  }

  function generatePlan(eqId) {
    const eq = DB.equipment.get(eqId);
    if (!eq) { Toast.error('Erro', 'Equipamento não encontrado'); return; }

    const analysis = analyzeEquipment(eq);
    const session = window.Auth ? window.Auth.getSession() : null;

    const plan = {
      id: `ap-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      equipmentId: eqId,
      equipmentCodigo: eq.codigo,
      createdAt: new Date().toISOString(),
      createdBy: session?.nome || 'Sistema',
      status: 'Em Andamento',
      analysis,
      itemsStatus: analysis.items.map(() => 'Pendente'),
    };

    const plans = getPlans();
    plans.unshift(plan);
    savePlans(plans);

    Toast.success('Plano de Ação Gerado!', `${analysis.items.length} ação(ões) identificadas para ${eq.codigo}`);
    Router.navigate('action-plans', { force: true });
  }

  function toggleItemStatus(planId, itemIdx) {
    const plans = getPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    const current = plan.itemsStatus[itemIdx];
    plan.itemsStatus[itemIdx] = current === 'Pendente' ? 'Em Andamento' : current === 'Em Andamento' ? 'Concluído' : 'Pendente';

    // Auto-update plan status
    const allDone = plan.itemsStatus.every(s => s === 'Concluído');
    const anyStarted = plan.itemsStatus.some(s => s !== 'Pendente');
    plan.status = allDone ? 'Concluído' : anyStarted ? 'Em Andamento' : 'Pendente';

    savePlans(plans);
    Router.navigate('action-plans', { force: true });
  }

  function deletePlan(planId) {
    const session = window.Auth ? window.Auth.getSession() : null;
    if (!session || (session.perfil !== 'Administrador' && session.perfil !== 'Desenvolvedor')) {
      Toast.error('Acesso Negado', 'Apenas administradores podem excluir planos de ação.');
      return;
    }
    window.uiConfirm('Tem certeza que deseja excluir este plano de ação?', (res) => {
      if (!res) return;
      const plans = getPlans().filter(p => p.id !== planId);
      savePlans(plans);
      Toast.success('Plano excluído');
      Router.navigate('action-plans', { force: true });
    });
  }

  function render() {
    const eqs = DB.equipment.list().filter(e => e.status === 'Em Manutenção' || e.status === 'Paralisado');
    const plans = getPlans();

    const sevColors = {
      'Crítica': 'danger',
      'Alta': 'warning',
      'Média': 'info',
      'Baixa': 'ghost'
    };
    const statusColors = {
      'Pendente': 'ghost',
      'Em Andamento': 'warning',
      'Concluído': 'success'
    };
    const statusIcons = {
      'Pendente': '⬜',
      'Em Andamento': '🔄',
      'Concluído': '✅'
    };

    return `<div class="page-container">
      <div class="section-header">
        <div class="section-title">
          <div class="section-title-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>
            </svg>
          </div>
          Plano de Ação — IA
        </div>
      </div>

      <div class="alert alert-info" style="margin-bottom:var(--space-5);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
        <div class="alert-content">
          <div class="alert-title">Análise Inteligente de Impacto</div>
          <div class="alert-msg">A IA analisa automaticamente restrições, tarefas atrasadas, peças pendentes e replanejamentos para gerar planos de ação priorizados por severidade.</div>
        </div>
      </div>

      <!-- Generate new plan -->
      <div class="card" style="margin-bottom:var(--space-5);padding:var(--space-5);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4);">
          <div>
            <div style="font-weight:800;font-size:var(--text-base);color:var(--text-primary);margin-bottom:var(--space-1);">⚡ Gerar Novo Plano de Ação</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">Selecione um equipamento para a IA analisar e gerar ações corretivas automaticamente</div>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3);">
            <select id="ap-eq-select" style="min-width:200px;">
              <option value="">Selecione o equipamento...</option>
              ${eqs.map(e => `<option value="${e.id}">${e.codigo} — ${e.cliente || 'Sem cliente'} (${e.status})</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="ActionPlanModule.generateFromSelect()" style="white-space:nowrap;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px;margin-right:4px;vertical-align:middle;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
              Gerar Plano IA
            </button>
          </div>
        </div>
      </div>

      <!-- Existing plans -->
      ${plans.length === 0 ? `
        <div class="empty-state" style="padding:var(--space-10);">
          <div style="font-size:3rem;margin-bottom:var(--space-4);">📋</div>
          <h3>Nenhum Plano de Ação Gerado</h3>
          <p style="color:var(--text-muted);">Selecione um equipamento acima e clique em "Gerar Plano IA" para que a inteligência artificial identifique os itens que impactam a liberação do equipamento e crie ações corretivas.</p>
        </div>
      ` : plans.map(plan => {
        const totalItems = plan.analysis.items.length;
        const done = plan.itemsStatus.filter(s => s === 'Concluído').length;
        const progress = totalItems > 0 ? Math.round(done / totalItems * 100) : 0;
        const statusBg = plan.status === 'Concluído' ? 'success' : plan.status === 'Em Andamento' ? 'warning' : 'ghost';

        return `<div class="card" style="margin-bottom:var(--space-5);">
          <!-- Plan header -->
          <div style="padding:var(--space-5);border-bottom:1px solid var(--border-card);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-3);">
              <div>
                <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2);">
                  <span style="font-weight:800;font-size:var(--text-lg);color:var(--text-primary);">📋 ${plan.equipmentCodigo}</span>
                  <span class="badge badge-${statusBg}">${plan.status}</span>
                </div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">
                  Gerado em ${formatDateTime(plan.createdAt)} por <strong>${plan.createdBy}</strong>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:var(--space-3);">
                <div style="text-align:center;">
                  <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:.05em;">Progresso</div>
                  <div style="font-size:1.5rem;font-weight:800;color:var(--color-${progress === 100 ? 'success' : progress > 0 ? 'warning' : 'danger'});">${progress}%</div>
                </div>
                <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick="ActionPlanModule.deletePlan('${plan.id}')" title="Excluir Plano">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397" /></svg>
                </button>
              </div>
            </div>

            <!-- KPI cards -->
            <div style="display:flex;gap:var(--space-4);margin-top:var(--space-4);flex-wrap:wrap;">
              <div style="flex:1;min-width:100px;background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Ações</div>
                <div style="font-size:1.3rem;font-weight:800;color:var(--text-primary);">${totalItems}</div>
              </div>
              <div style="flex:1;min-width:100px;background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Concluídas</div>
                <div style="font-size:1.3rem;font-weight:800;color:var(--color-success);">${done}</div>
              </div>
              <div style="flex:1;min-width:100px;background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Atraso Acum.</div>
                <div style="font-size:1.3rem;font-weight:800;color:${plan.analysis.totalDelay > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${plan.analysis.totalDelay} dias</div>
              </div>
              <div style="flex:1;min-width:100px;background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Restrições</div>
                <div style="font-size:1.3rem;font-weight:800;color:${plan.analysis.totalRestrictions > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">${plan.analysis.totalRestrictions}</div>
              </div>
              <div style="flex:1;min-width:100px;background:var(--bg-base);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Liberação</div>
                <div style="font-size:1rem;font-weight:800;color:var(--text-primary);">${formatDate(plan.analysis.dataLiberacao)}</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div style="margin-top:var(--space-3);">
              <div class="progress-track"><div class="progress-fill ${progress === 100 ? 'success' : progress > 50 ? '' : 'danger'}" style="width:${progress}%"></div></div>
            </div>
          </div>

          <!-- Action items -->
          <div style="padding:var(--space-4);">
            ${plan.analysis.items.length === 0 ? `
              <div style="text-align:center;padding:var(--space-6);color:var(--text-muted);">
                <div style="font-size:2rem;margin-bottom:var(--space-2);">✅</div>
                <div style="font-weight:700;">Nenhum item de impacto identificado</div>
                <div style="font-size:var(--text-xs);">Este equipamento não possui itens bloqueando a liberação.</div>
              </div>
            ` : `
              <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                ${plan.analysis.items.map((item, idx) => {
                  const itemStatus = plan.itemsStatus[idx] || 'Pendente';
                  const isDone = itemStatus === 'Concluído';
                  return `<div style="display:flex;gap:var(--space-4);padding:var(--space-4);background:var(--bg-base);border-radius:var(--radius-lg);border-left:4px solid var(--color-${sevColors[item.severidade] || 'ghost'});${isDone ? 'opacity:0.6;' : ''}transition:all .2s;">
                    <!-- Toggle -->
                    <div style="flex-shrink:0;padding-top:2px;">
                      <button onclick="ActionPlanModule.toggleItemStatus('${plan.id}', ${idx})" style="background:none;border:none;cursor:pointer;font-size:1.3rem;line-height:1;" title="Alterar status">${statusIcons[itemStatus]}</button>
                    </div>
                    <!-- Content -->
                    <div style="flex:1;min-width:0;">
                      <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap;">
                        <span class="badge badge-${sevColors[item.severidade] || 'ghost'}" style="font-size:10px;">${item.severidade}</span>
                        <span class="badge badge-ghost" style="font-size:10px;">${item.tipo}</span>
                        <span class="badge badge-${statusColors[itemStatus]}" style="font-size:10px;">${itemStatus}</span>
                        ${item.disciplina !== '—' ? `<span class="badge badge-ghost" style="font-size:10px;">📐 ${item.disciplina}</span>` : ''}
                      </div>
                      <div style="font-size:var(--text-sm);color:var(--text-primary);margin-bottom:var(--space-2);${isDone ? 'text-decoration:line-through;' : ''}">${item.descricao}</div>
                      <div style="font-size:var(--text-xs);color:var(--brand-primary-light);background:rgba(21,101,192,0.08);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);margin-bottom:var(--space-2);line-height:1.5;">
                        💡 <strong>Ação Recomendada:</strong> ${item.acao}
                      </div>
                      <div style="display:flex;gap:var(--space-4);font-size:var(--text-xs);color:var(--text-muted);">
                        <span>👤 ${item.responsavel}</span>
                        <span>⏰ Prazo: <strong style="color:var(--color-${item.prazo === 'Imediato' ? 'danger' : 'warning'});">${item.prazo}</strong></span>
                      </div>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            `}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function generateFromSelect() {
    const select = document.getElementById('ap-eq-select');
    if (!select || !select.value) {
      Toast.error('Erro', 'Selecione um equipamento para gerar o plano.');
      return;
    }
    generatePlan(select.value);
  }

  return { render, generatePlan, generateFromSelect, toggleItemStatus, deletePlan };
})();


function switchTab(btn, panelId) {
  const container = btn.closest('.tabs');
  container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId)?.classList.add('active');
}

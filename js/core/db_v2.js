/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Core: Database Layer
   ============================================================ */

window.DB = (() => {
  try {
  const SUPABASE_URL = 'https://umsozbjpfmxvhwycjjkr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NGJvPtMUdiDGCnK5qRroYg_7_wPqZiH';
  let supabaseClient = null;
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  const KEYS = {
    equipment: 'diman_equipment',
    tasks: 'diman_tasks',
    parts: 'diman_parts',
    workforce: 'diman_workforce',
    timesheets: 'diman_timesheets',
    replannings: 'diman_replannings',
    restrictions: 'diman_restrictions',
    costs: 'diman_costs',
    lessons: 'diman_lessons',
    notifications: 'diman_notifications',
    meetingTasks: 'diman_meeting_tasks',
    kpiCache: 'diman_kpi_cache',
    settings: 'diman_settings',
    solicitacoes: 'diman_solicitacoes',
    users: 'diman_users',
    audit: 'diman_audit',
    manuals: 'diman_manuals',
    manualFolders: 'diman_manual_folders',
    vacations: 'diman_vacations'
  };

  window.GlobalEqFilter = '';
  function setGlobalEqFilter(id) {
    window.GlobalEqFilter = id;
    const selectEl = document.getElementById('global-eq-select');
    if (selectEl) {
      selectEl.value = id;
    }
    if (window.Router) {
      const current = window.Router.getCurrent();
      if (current) window.Router.navigate(current, { force: true });
    }
  }
  window.setGlobalEqFilter = setGlobalEqFilter;

  function now() { return new Date().toISOString(); }

  const INITIAL_DATA = {
    [KEYS.equipment]: [
      { id: 'eq-ssm-288', nome: 'SSM-288', codigo: 'SSM-288', tipo: 'Sondas de Pesquisas', status: 'Em Manutenção', os: 'OS-88220', cliente: 'COMISA', dataEntrada: now(), dataLiberacaoPlanejada: now(), dataLiberacaoAtual: now(), timeline: [], replanning: [], createdAt: now(), updatedAt: now() },
      { id: 'eq-bhz-001', nome: 'BHZ-001', codigo: 'BHZ-001', tipo: 'Sondas Poços', status: 'Em Manutenção', os: 'OS-99100', cliente: 'GEOSOL', dataEntrada: now(), dataLiberacaoPlanejada: now(), dataLiberacaoAtual: now(), timeline: [], replanning: [], createdAt: now(), updatedAt: now() },
      { id: 'eq-bms-101', nome: 'BMS-101', codigo: 'BMS-101', tipo: 'Bomba de pesquisa', status: 'Liberado', os: 'OS-77110', cliente: 'VALE', dataEntrada: now(), dataLiberacaoPlanejada: now(), dataLiberacaoAtual: now(), timeline: [], replanning: [], createdAt: now(), updatedAt: now() },
      { id: 'eq-bmp-202', nome: 'BMP-202', codigo: 'BMP-202', tipo: 'Bombas de poços', status: 'Em Manutenção', os: 'OS-66330', cliente: 'ANGLO', dataEntrada: now(), dataLiberacaoPlanejada: now(), dataLiberacaoAtual: now(), timeline: [], replanning: [], createdAt: now(), updatedAt: now() },
      { id: 'eq-sub-501', nome: 'SUB-501', codigo: 'SUB-501', tipo: 'Subconjuntos', status: 'Em Manutenção', os: 'OS-55440', cliente: 'GEOSOL', dataEntrada: now(), dataLiberacaoPlanejada: now(), dataLiberacaoAtual: now(), timeline: [], replanning: [], createdAt: now(), updatedAt: now() }
    ],
    [KEYS.tasks]: [
      { id: 'tk-test-1', equipmentId: 'eq-ssm-288', descricao: 'Troca de Óleo do Motor', disciplina: 'Mecânica', horasPlanejadas: 2, status: 'Concluída', pctExecutado: 100, critico: false, createdAt: now(), updatedAt: now() },
      { id: 'tk-test-2', equipmentId: 'eq-ssm-288', descricao: 'Revisão dos Freios', disciplina: 'Mecânica', horasPlanejadas: 4, status: 'Em Andamento', pctExecutado: 50, critico: true, createdAt: now(), updatedAt: now() },
      { id: 'tk-test-3', equipmentId: 'eq-bhz-001', descricao: 'Substituição de Mangueira Hidráulica', disciplina: 'Mecânica', horasPlanejadas: 1.5, status: 'Não Iniciada', pctExecutado: 0, critico: true, createdAt: now(), updatedAt: now() }
    ],
    [KEYS.restrictions]: [
      { id: 'rs-test-1', equipmentId: 'eq-ssm-288', descricao: 'Aguardando liberação de área', impacto: 'Alto', status: 'Aberta', createdAt: now(), updatedAt: now() }
    ],
    [KEYS.parts]: [
      { id: 'pt-test-1', equipmentId: 'eq-bhz-001', descricao: 'Mangueira de Alta Pressão 3/4', pn: 'PN-98765', qtd: 2, status: 'Solicitada', createdAt: now(), updatedAt: now() }
    ],
    [KEYS.kpiCache]: {},
    [KEYS.solicitacoes]: [],
    [KEYS.workforce]: [
      { id: 'wf-6934', matricula: '6934', nome: 'EDSON GOMES DE ALMEIDA', funcao: 'Mecânico', disciplina: 'Subconjunto', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-11275', matricula: '11275', nome: 'FABRICIO DE ASSIS MOREIRA DA S', funcao: 'Mecânico de poços', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-13794', matricula: '13794', nome: 'THIAGO HENRIQUE SANTOS MEDEIRO', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-14147', matricula: '14147', nome: 'IGOR FERREIRA DA SILVA', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-14408', matricula: '14408', nome: 'ERICK SOUZA SANTOS', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-15229', matricula: '15229', nome: 'IGOR CESAR MAGALHAES', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-16013', matricula: '16013', nome: 'FELIPE DANIEL MOREIRA DE OLIVE', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-16336', matricula: '16336', nome: 'AISES DE OLIVEIRA', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-16388', matricula: '16388', nome: 'PEDRO HENRIQUE ARAUJO RAICHARD', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-16505', matricula: '16505', nome: 'LEONARDO ALVES', funcao: 'Mecânico de poços', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-16538', matricula: '16538', nome: 'LUIZ FERNANDO FIGUEIREDO DE SO', funcao: 'Mecânico', disciplina: 'Subconjunto', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17265', matricula: '17265', nome: 'KAIO FERNANDO RODRIGUES BRAGA', funcao: 'Mecânico', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17634', matricula: '17634', nome: 'ARAMYS EVERTON COSTA', funcao: 'Mecânico de poços', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-5203', matricula: '5203', nome: 'SEBASTIAO VIEIRA DA SILVA', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-7330', matricula: '7330', nome: 'DECIRLEI DO CARMO JOSE', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-10262', matricula: '10262', nome: 'RAIMUNDO FELIX DE MORAIS', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-12216', matricula: '12216', nome: 'KAIO OLIVEIRA PRATES', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-12382', matricula: '12382', nome: 'SEBASTIAO FERNANDES DA PAIXAO', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-12732', matricula: '12732', nome: 'GILBERTO GONCALVES DE SOUZA', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-14587', matricula: '14587', nome: 'JUAREZ GONCALVES DE SOUZA JUNI', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-14856', matricula: '14856', nome: 'FLAVIO SANTOS CONSTANCIO', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-15681', matricula: '15681', nome: 'MARCELO FERREIRA MATOS', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-16210', matricula: '16210', nome: 'DANIEL NUNES DE OLIVEIRA', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17252', matricula: '17252', nome: 'PAULO ROBERTO CHAVES', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17485', matricula: '17485', nome: 'KAYKY RYCHARD VICENTE SANTOS', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17531', matricula: '17531', nome: 'LEONARDO SOARES CAMPOLINA', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17707', matricula: '17707', nome: 'ALLYSON SANTOS SILVA', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17726', matricula: '17726', nome: 'ANDERSON MARLEY MARQUES DE SAN', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-15032', matricula: '15032', nome: 'KEVIN OLIVEIRA PRATES', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-15688', matricula: '15688', nome: 'CARLIOFRANQUE NASCIMENTO MIRA', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-16832', matricula: '16832', nome: 'CRISTIANO MARTINS FELIPE', funcao: 'Soldador', disciplina: 'Caldeiraria', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17743', matricula: '17743', nome: 'LEOMARCIO NUNES', funcao: 'Torneiro', disciplina: 'Usinagem', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17573', matricula: '17573', nome: 'PEDRO HENRIQUE PEREIRA CRISPIM', funcao: 'Torneiro', disciplina: 'Usinagem', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-11502', matricula: '11502', nome: 'WEBER FIDELIX', funcao: 'Fresador', disciplina: 'Usinagem', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-15990', matricula: '15990', nome: 'NATAN AUGUSTO DE MORAIS', funcao: 'Fresador', disciplina: 'Usinagem', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-18129', matricula: '18129', nome: 'MARCOS ANTONIO PENA', funcao: 'Fresador', disciplina: 'Usinagem', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17216', matricula: '17216', nome: 'DANIEL HENRIQUE MALTA RAIMUNDO', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17360', matricula: '17360', nome: 'DANIEL HENRIQUE RODRIGUES DE D', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17406', matricula: '17406', nome: 'KEZIA VICTORIA DA SILVA', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17483', matricula: '17483', nome: 'GABRIEL BATISTA CARVALHAIS ROD', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17484', matricula: '17484', nome: 'LAYSSA LOURENCA DA SILVA SANTO', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17526', matricula: '17526', nome: 'GABRIEL HENRIQUE RODRIGUES DIA', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17528', matricula: '17528', nome: 'SAMUEL VITOR ALEIXO CARVALHO', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17572', matricula: '17572', nome: 'RICHARD AUGUSTO GONCALVES SILV', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17690', matricula: '17690', nome: 'KAIQUE SACRAMENTO DA SILVA OLI', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17720', matricula: '17720', nome: 'VICTOR HUGO CARVALHO DE MORAIS', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17752', matricula: '17752', nome: 'DANIEL ALONSO GOMES', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17895', matricula: '17895', nome: 'LUANA VANESSA SANTOS DO CARMO', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-17952', matricula: '17952', nome: 'GABRIEL FERNANDO REIS SILVA', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-18113', matricula: '18113', nome: 'HYURI CRISTOPHER DA SILVA OLIV', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-18130', matricula: '18130', nome: 'GABRIEL LIMA OLIVEIRA', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-18131', matricula: '18131', nome: 'KAIQUE MIRANDA SILVA', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() },
      { id: 'wf-18158', matricula: '18158', nome: 'OSEIAS DOS SANTOS ARAUJO', funcao: 'Ajudante', disciplina: 'Mecânica', centroCusto: '05002101', createdAt: now() }
    ],
    diman_meeting_tasks: [],
    [KEYS.vacations]: []
  };

  function get(key) {
    try { 
      const val = localStorage.getItem(key);
      if (val) return JSON.parse(val);
      return INITIAL_DATA[key] || [];
    }
    catch (e) { 
      console.error('Storage error for key: ' + key, e);
      const val = localStorage.getItem(key);
      if (val) {
        localStorage.setItem(key + '_corrupted_' + Date.now(), val);
      }
      return INITIAL_DATA[key] || []; 
    }
  }
  function getObj(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  }
  const syncTimeouts = {};
  async function syncToSupabase(collection, data) {
    // Marcar IMEDIATAMENTE como não sincronizado para evitar perda de dados se o usuário der F5 antes do debounce terminar
    localStorage.setItem('diman_unsynced', 'true');
    
    if (!supabaseClient) return;
    
    // Debounce sync requests to prevent data loss race conditions during batch updates
    if (syncTimeouts[collection]) clearTimeout(syncTimeouts[collection]);
    
    syncTimeouts[collection] = setTimeout(async () => {
      try {
        let upsertPayload = [];
        if (Array.isArray(data) && data.length > 0 && data[0] && data[0].id) {
           upsertPayload = data.filter(Boolean).map(item => ({ collection: collection, key: item.id, data: item, updated_at: new Date().toISOString() }));
        } else {
           upsertPayload = { collection: collection, key: 'all', data: data, updated_at: new Date().toISOString() };
        }

        const { error } = await supabaseClient.from('diman_store')
          .upsert(upsertPayload, { onConflict: 'collection,key' });
        
        if (error) {
          console.error('Supabase Sync Error:', error);
          localStorage.setItem('diman_unsynced', 'true');
        } else {
          // If no other pending syncs exist, we can mark as fully synced
          if (Object.values(syncTimeouts).length <= 1 || localStorage.getItem('diman_unsynced') !== 'true') {
             localStorage.setItem('diman_unsynced', 'false');
          }
        }
      } catch (err) {
        console.error('Supabase Sync Exception:', err);
        localStorage.setItem('diman_unsynced', 'true');
      }
      delete syncTimeouts[collection];
    }, 1000);
  }

  async function deleteFromSupabase(collection, key) {
     if (!supabaseClient) return;
     try {
        await supabaseClient.from('diman_store').delete().match({ collection: collection, key: key });
     } catch (err) {
        console.error('Supabase Delete Error:', err);
     }
  }
  function set(key, data) { 
    let oldData = [];
    try { oldData = JSON.parse(localStorage.getItem(key)) || []; } catch(e){}
    
    if (Array.isArray(oldData) && Array.isArray(data)) {
       const newIds = new Set(data.filter(Boolean).map(i => i.id).filter(Boolean));
       const deletedItems = oldData.filter(i => i && i.id && !newIds.has(i.id));
       deletedItems.forEach(item => {
           deleteFromSupabase(key, item.id);
       });
    }

    localStorage.setItem(key, JSON.stringify(data)); 
    syncToSupabase(key, data);
  }
  function uid(prefix = 'id') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

  async function forceSyncAll() {
    if (!supabaseClient) {
      if (window.Toast) window.Toast.error('Erro de Sincronização', 'Cliente do Supabase não conectado.');
      return;
    }
    const allKeys = Object.values(KEYS);
    for (const k of allKeys) {
      const data = get(k);
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
        try {
          let upsertPayload = [];
          if (Array.isArray(data) && data.length > 0 && data[0] && data[0].id) {
             upsertPayload = data.map(item => ({ collection: k, key: item.id, data: item, updated_at: new Date().toISOString() }));
          } else {
             upsertPayload = { collection: k, key: 'all', data: data, updated_at: new Date().toISOString() };
          }
          const { error } = await supabaseClient.from('diman_store')
            .upsert(upsertPayload, { onConflict: 'collection,key' });
          if (error) {
             console.error('Supabase Error:', error);
             if (window.Toast) window.Toast.error('Erro do Banco de Dados', error.message || JSON.stringify(error));
             return;
          }
        } catch (e) {
          console.error('Sync failed for collection:', k, e);
          if (window.Toast) window.Toast.error('Erro de Conexão', e.message);
          return;
        }
      }
    }
    localStorage.setItem('diman_unsynced', 'false');
    if (window.Toast) window.Toast.success('Sincronização Concluída', 'Todos os dados locais foram enviados para a nuvem.');
  }

  // Automatic sync when coming back online
  window.addEventListener('online', () => {
    if (localStorage.getItem('diman_unsynced') === 'true') {
      console.log('[DIMAN] Dispositivo conectado. Sincronizando dados offline...');
      if (window.Toast) window.Toast.info('Dispositivo Online', 'Sincronizando dados com a nuvem...');
      forceSyncAll();
    }
  });

  async function initSupabase() {
    if (!supabaseClient) return;
    try {
      // 1. Initial fetch (Excluding photos to avoid massive memory usage)
      const { data, error } = await supabaseClient.from('diman_store').select('*').not('collection', 'ilike', 'photo_%');
      if (error) { 
         console.error('Supabase fetch error:', error); 
         if (window.Toast) window.Toast.error('Falha de Conexão Nuvem', error.message || 'Erro ao conectar com o Supabase. Você está offline ou a chave é inválida.');
         return; 
      }
      if (data && data.length > 0) {
        const hasUnsynced = localStorage.getItem('diman_unsynced') === 'true';
        if (hasUnsynced) {
          console.log('[DIMAN] Existem alterações locais não sincronizadas. O pull inicial foi cancelado e faremos o push local agora.');
          await forceSyncAll();
        } else {
          const groupedData = {};
          const allData = {};
          
          data.forEach(row => {
            if (row.key === 'all') {
              allData[row.collection] = row.data;
            } else {
              if (!groupedData[row.collection]) groupedData[row.collection] = [];
              groupedData[row.collection].push(row.data);
            }
          });
          
          // First set the 'all' collections
          for (const [collection, arr] of Object.entries(allData)) {
            localStorage.setItem(collection, JSON.stringify(arr));
          }
          
          // Then merge the individual rows into them
          for (const [collection, arr] of Object.entries(groupedData)) {
            let baseArr = [];
            try { baseArr = JSON.parse(localStorage.getItem(collection)) || []; } catch(e){}
            if (!Array.isArray(baseArr)) baseArr = [];
            
            // Map by id to prevent duplicates and prefer individual rows
            const mergedMap = new Map();
            baseArr.forEach(item => { if (item.id) mergedMap.set(item.id, item); });
            arr.forEach(item => { if (item.id) mergedMap.set(item.id, item); });
            
            localStorage.setItem(collection, JSON.stringify(Array.from(mergedMap.values())));
          }
        }
      }

      // 2. Real-time subscription
      supabaseClient
        .channel('diman-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'diman_store' }, payload => {
          if (localStorage.getItem('diman_unsynced') === 'true') {
            console.log('[DIMAN] Ignorando atualização em tempo real (dados locais em sincronização pendente).');
            return;
          }

          if (payload.eventType === 'DELETE' && payload.old) {
            const row = payload.old;
            if (row.key === 'all') return;
            let localArr = [];
            try { localArr = JSON.parse(localStorage.getItem(row.collection)) || []; } catch(e){}
            if (Array.isArray(localArr)) {
               localArr = localArr.filter(i => i && i.id !== row.key);
               localStorage.setItem(row.collection, JSON.stringify(localArr));
            }
          } else if (payload.new) {
            const row = payload.new;
            if (row.collection && row.collection.startsWith('photo_')) return;
            
            if (row.key === 'all') {
              localStorage.setItem(row.collection, JSON.stringify(row.data));
            } else {
              // Individual row updated
              let localArr = [];
              try { localArr = JSON.parse(localStorage.getItem(row.collection)) || []; } catch(e){}
              if (!Array.isArray(localArr)) localArr = [];
              
              const idx = localArr.findIndex(i => i && i.id === row.key);
              if (idx !== -1) {
                 localArr[idx] = row.data;
              } else {
                 localArr.push(row.data);
              }
              localStorage.setItem(row.collection, JSON.stringify(localArr));
            }
          }

          if (window.Router) {
            const current = window.Router.getCurrent();
            const liveViews = ['dashboard', 'manager-dashboard', 'workforce-time', 'tasks-ongoing'];
            if (current && liveViews.includes(current)) {
              const hasOpenModal = document.querySelector('.modal-overlay.open, .modal.open');
              if (!hasOpenModal) {
                window.Router.navigate(current, { force: true });
              }
            }
          }
        })
        .subscribe();

    } catch(e) {
      console.error('Failed to init Supabase:', e);
    }
  }

  window.RescueCloudData = async function() {
    if (!supabaseClient) {
      alert("Erro: Sistema não está conectado à nuvem.");
      return;
    }
    try {
      const { data, error } = await supabaseClient.from('diman_store').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        data.forEach(row => {
          if (row.key === 'all') {
            localStorage.setItem(row.collection, JSON.stringify(row.data));
          }
        });
        localStorage.setItem('diman_unsynced', 'false');
        alert("Restruturação concluída com sucesso! Suas tarefas foram recuperadas da nuvem.");
        window.location.reload();
      } else {
        alert("Nenhum dado encontrado na nuvem.");
      }
    } catch (e) {
      alert("Erro ao recuperar: " + e.message);
    }
  };

  window.FactoryReset = async function() {
    if(!confirm("TEM CERTEZA? Isso vai apagar todas as tarefas, horas, restrições e custos. Manterá apenas equipamentos e lista de funcionários.")) return;
    
    const keepKeys = [KEYS.equipment, KEYS.workforce, KEYS.users, KEYS.settings];
    Object.values(KEYS).forEach(k => {
      if(!keepKeys.includes(k)) {
        localStorage.setItem(k, '[]');
      }
    });
    
    // Clear equipment timelines and progress
    let eqs = get(KEYS.equipment);
    eqs = eqs.map(e => ({ ...e, timeline: [], replanning: [], pctGeral: 0 }));
    localStorage.setItem(KEYS.equipment, JSON.stringify(eqs));

    localStorage.setItem('diman_unsynced', 'true');
    await forceSyncAll();
    alert("Sistema completamente limpo. Iniciando do zero!");
    window.location.href = window.location.pathname;
  };

  // ==================== EQUIPMENT ====================
  const equipment = {
    list: () => get(KEYS.equipment),
    get: id => get(KEYS.equipment).find(e => e.id === id),
    create(data) {
      const items = get(KEYS.equipment);
      const item = { id: uid('eq'), ...data, createdAt: now(), updatedAt: now(), timeline: [], replanning: [] };
      items.push(item);
      set(KEYS.equipment, items);
      if (window.Auth && window.Auth.addAuditLog) window.Auth.addAuditLog('CREATE_EQUIPMENT', `Equipamento ${data.nome} criado`, data);
      if (window.events && window.events.emit) window.events.emit('equipment:created', item);
      return item;
    },
    update(id, data) {
      const items = get(KEYS.equipment);
      const idx = items.findIndex(e => e.id === id);
      if (idx === -1) return null;
      const before = { ...items[idx] };
      items[idx] = { ...items[idx], ...data, updatedAt: now() };
      set(KEYS.equipment, items);

      if (data.status === 'Liberado') {
        const wItems = get(KEYS.workforce);
        let changed = false;
        wItems.forEach(w => {
          if (w.equipmentId === id) {
            w.equipmentId = '';
            w.justificativa = '';
            changed = true;
          }
        });
        if (changed) {
          set(KEYS.workforce, wItems);
        }
      }

      if (window.Auth && window.Auth.addAuditLog) window.Auth.addAuditLog('UPDATE_EQUIPMENT', `Equipamento ${items[idx].nome} atualizado`, { before, after: items[idx] });
      if (window.events && window.events.emit) window.events.emit('equipment:updated', items[idx]);
      return items[idx];
    },
    delete(id) {
      const items = get(KEYS.equipment);
      const eq = items.find(e => e.id === id);
      set(KEYS.equipment, items.filter(e => e.id !== id));
      if (eq) { 
        if (window.Auth && window.Auth.addAuditLog) window.Auth.addAuditLog('DELETE_EQUIPMENT', `Equipamento ${eq.nome} removido`, null); 
        if (window.events && window.events.emit) window.events.emit('equipment:deleted', id); 
      }
      return true;
    },
    addTimeline(id, event) {
      const items = get(KEYS.equipment);
      const idx = items.findIndex(e => e.id === id);
      if (idx === -1) return;
      if (!items[idx].timeline) items[idx].timeline = [];
      items[idx].timeline.push({ id: uid('tl'), ...event, timestamp: now() });
      items[idx].updatedAt = now();
      set(KEYS.equipment, items);
      if (window.events && window.events.emit) window.events.emit('timeline:updated', { equipmentId: id });
    },
    addReplanning(id, data) {
      const items = get(KEYS.equipment);
      const idx = items.findIndex(e => e.id === id);
      if (idx === -1) return;
      if (!items[idx].replanning) items[idx].replanning = [];
      const n = items[idx].replanning.length + 1;
      const entry = { id: uid('rp'), numero: n, label: `R${n}`, ...data, createdAt: now() };
      items[idx].replanning.push(entry);
      items[idx].updatedAt = now();
      set(KEYS.equipment, items);
      if (window.Auth && window.Auth.addAuditLog) window.Auth.addAuditLog('REPLANNING', `Replanejamento R${n} criado para ${items[idx].nome}`, data);
      if (window.events && window.events.emit) window.events.emit('replanning:created', { equipmentId: id, entry });
      return entry;
    }
  };

  // ==================== TASKS ====================
  const tasks = {
    list: (equipmentId) => {
      const eqFilter = equipmentId || window.GlobalEqFilter;
      return get(KEYS.tasks).filter(t => !eqFilter || t.equipmentId === eqFilter);
    },
    get: id => get(KEYS.tasks).find(t => t.id === id),
    create(data) {
      const items = get(KEYS.tasks);
      const item = { id: uid('tk'), ...data, status: data.status || 'Não Iniciada', pctExecutado: data.pctExecutado || 0, createdAt: now(), updatedAt: now() };
      items.push(item);
      set(KEYS.tasks, items);
      Auth.addAuditLog('CREATE_TASK', `Tarefa ${data.descricao} criada`, data);
      events.emit('task:created', item);
      recalculateEquipmentProgress(item.equipmentId);
      return item;
    },
    update(id, data) {
      const items = get(KEYS.tasks);
      const idx = items.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const before = { ...items[idx] };
      items[idx] = { ...items[idx], ...data, updatedAt: now() };
      set(KEYS.tasks, items);
      Auth.addAuditLog('UPDATE_TASK', `Tarefa ${items[idx].descricao} atualizada`, { before, after: items[idx] });
      events.emit('task:updated', items[idx]);
      recalculateEquipmentProgress(items[idx].equipmentId);
      if (before.equipmentId && before.equipmentId !== items[idx].equipmentId) {
        recalculateEquipmentProgress(before.equipmentId);
      }
      return items[idx];
    },
    delete(id) {
      const items = get(KEYS.tasks);
      const t = items.find(x => x.id === id);
      set(KEYS.tasks, items.filter(x => x.id !== id));
      if (t) { 
        Auth.addAuditLog('DELETE_TASK', `Tarefa ${t.descricao} removida`, null); 
        events.emit('task:deleted', id); 
        recalculateEquipmentProgress(t.equipmentId);
      }
    },
    getByEquipment: (eqId) => get(KEYS.tasks).filter(t => t.equipmentId === eqId),
    getAll: () => {
      const eqFilter = window.GlobalEqFilter;
      return get(KEYS.tasks).filter(t => !eqFilter || t.equipmentId === eqFilter);
    }
  };

  // ==================== PARTS ====================
  const parts = {
    list: (equipmentId) => {
      const eqFilter = equipmentId || window.GlobalEqFilter;
      return get(KEYS.parts).filter(p => !eqFilter || p.equipmentId === eqFilter);
    },
    get: id => get(KEYS.parts).find(p => p.id === id),
    create(data) {
      const items = get(KEYS.parts);
      const item = { id: uid('pt'), ...data, status: data.status || 'Solicitada', createdAt: now(), updatedAt: now() };
      items.push(item);
      set(KEYS.parts, items);
      Auth.addAuditLog('CREATE_PART', `Peça ${data.descricao} criada`, data);
      events.emit('part:created', item);
      return item;
    },
    update(id, data) {
      const items = get(KEYS.parts);
      const idx = items.findIndex(p => p.id === id);
      if (idx === -1) return null;
      const before = { ...items[idx] };
      items[idx] = { ...items[idx], ...data, updatedAt: now() };
      set(KEYS.parts, items);
      Auth.addAuditLog('UPDATE_PART', `Peça ${items[idx].descricao} atualizada`, { before, after: items[idx] });
      events.emit('part:updated', items[idx]);
      return items[idx];
    },
    delete(id) {
      const items = get(KEYS.parts);
      const p = items.find(x => x.id === id);
      set(KEYS.parts, items.filter(x => x.id !== id));
      if (p) Auth.addAuditLog('DELETE_PART', `Peça ${p.descricao} removida`, null);
    },
    getAll: () => {
      const eqFilter = window.GlobalEqFilter;
      return get(KEYS.parts).filter(p => !eqFilter || p.equipmentId === eqFilter);
    }
  };

  // ==================== WORKFORCE ====================
  const workforce = {
    list: () => get(KEYS.workforce),
    get: id => get(KEYS.workforce).find(w => w.id === id),
    create(data) {
      const items = get(KEYS.workforce);
      const item = { id: uid('wf'), ...data, createdAt: now() };
      items.push(item);
      set(KEYS.workforce, items);
      Auth.addAuditLog('CREATE_WORKER', `Trabalhador ${data.nome} criado`, data);
      return item;
    },
    update(id, data) {
      const items = get(KEYS.workforce);
      const idx = items.findIndex(w => w.id === id);
      if (idx === -1) return null;
      const before = { ...items[idx] };
      items[idx] = { ...items[idx], ...data };
      set(KEYS.workforce, items);
      Auth.addAuditLog('UPDATE_WORKER', `Trabalhador ${items[idx].nome} atualizado`, { before, after: items[idx] });
      return items[idx];
    },
    delete(id) {
      const items = get(KEYS.workforce);
      const w = items.find(x => x.id === id);
      set(KEYS.workforce, items.filter(x => x.id !== id));
      if (w) Auth.addAuditLog('DELETE_WORKER', `Trabalhador ${w.nome} removido`, null);
    }
  };

  // ==================== TIMESHEETS ====================
  const timesheets = {
    list: (filters = {}) => {
      let items = get(KEYS.timesheets);
      if (window.GlobalEqFilter) {
        const eqTasks = get(KEYS.tasks).filter(t => t.equipmentId === window.GlobalEqFilter).map(t => t.id);
        items = items.filter(ts => eqTasks.includes(ts.taskId));
      }
      if (filters.equipmentId) items = items.filter(t => t.equipmentId === filters.equipmentId);
      if (filters.workerId)    items = items.filter(t => t.workerId === filters.workerId);
      if (filters.taskId)      items = items.filter(t => t.taskId === filters.taskId);
      if (filters.date)        items = items.filter(t => t.data === filters.date);
      return items;
    },
    create(data) {
      const items = get(KEYS.timesheets);
      const item = { id: uid('ts'), ...data, createdAt: now() };
      items.push(item);
      set(KEYS.timesheets, items);
      Auth.addAuditLog('TIMESHEET', `Apontamento de horas criado`, data);
      events.emit('timesheet:created', item);
      return item;
    },
    delete(id) { set(KEYS.timesheets, get(KEYS.timesheets).filter(t => t.id !== id)); }
  };

  // ==================== REPLANNINGS ====================
  const replannings = {
    list: () => get(KEYS.replannings),
    create(data) {
      const items = get(KEYS.replannings);
      const item = { id: uid('rp'), ...data, createdAt: now() };
      items.push(item);
      set(KEYS.replannings, items);
      return item;
    },
    delete(id) { set(KEYS.replannings, get(KEYS.replannings).filter(r => r.id !== id)); }
  };

  // ==================== RESTRICTIONS ====================
  const restrictions = {
    list: (equipmentId) => {
      const eqFilter = equipmentId || window.GlobalEqFilter;
      return get(KEYS.restrictions).filter(r => !eqFilter || r.equipmentId === eqFilter);
    },
    getAll: () => {
      const eqFilter = window.GlobalEqFilter;
      return get(KEYS.restrictions).filter(r => !eqFilter || r.equipmentId === eqFilter);
    },
    create(data) {
      const items = get(KEYS.restrictions);
      const item = { id: uid('rs'), ...data, status: 'Aberta', createdAt: now(), updatedAt: now() };
      items.push(item);
      set(KEYS.restrictions, items);
      Auth.addAuditLog('CREATE_RESTRICTION', `Restrição criada: ${data.descricao}`, data);
      events.emit('restriction:created', item);
      notifications.add({ type: 'warning', title: 'Nova Restrição', message: `Restrição aberta: ${data.descricao}`, equipmentId: data.equipmentId });
      return item;
    },
    update(id, data) {
      const items = get(KEYS.restrictions);
      const idx = items.findIndex(r => r.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data, updatedAt: now() };
      set(KEYS.restrictions, items);
      events.emit('restriction:updated', items[idx]);
      return items[idx];
    },
    close(id, resolution) {
      return this.update(id, { status: 'Fechada', resolution, closedAt: now() });
    },
    delete(id) { set(KEYS.restrictions, get(KEYS.restrictions).filter(r => r.id !== id)); }
  };

  // ==================== COSTS ====================
  const costs = {
    list: (equipmentId) => {
      const eqFilter = equipmentId || window.GlobalEqFilter;
      return get(KEYS.costs).filter(c => !eqFilter || c.equipmentId === eqFilter);
    },
    getAll: () => {
      const eqFilter = window.GlobalEqFilter;
      return get(KEYS.costs).filter(c => !eqFilter || c.equipmentId === eqFilter);
    },
    create(data) {
      const items = get(KEYS.costs);
      const item = { id: uid('cs'), ...data, createdAt: now() };
      items.push(item);
      set(KEYS.costs, items);
      Auth.addAuditLog('CREATE_COST', `Custo registrado: ${data.descricao}`, data);
      events.emit('cost:created', item);
      return item;
    },
    update(id, data) {
      const items = get(KEYS.costs);
      const idx = items.findIndex(c => c.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      set(KEYS.costs, items);
      return items[idx];
    },
    delete(id) { set(KEYS.costs, get(KEYS.costs).filter(c => c.id !== id)); }
  };

  // ==================== LESSONS LEARNED ====================
  const lessons = {
    list: () => {
      const eqFilter = window.GlobalEqFilter;
      return get(KEYS.lessons).filter(l => !eqFilter || l.equipmentId === eqFilter);
    },
    get: id => get(KEYS.lessons).find(l => l.id === id),
    create(data) {
      const items = get(KEYS.lessons);
      const item = { id: uid('ll'), ...data, createdAt: now() };
      items.push(item);
      set(KEYS.lessons, items);
      Auth.addAuditLog('CREATE_LESSON', `Lição aprendida registrada`, data);
      return item;
    },
    update(id, data) {
      const items = get(KEYS.lessons);
      const idx = items.findIndex(l => l.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      set(KEYS.lessons, items);
      return items[idx];
    },
    delete(id) { set(KEYS.lessons, get(KEYS.lessons).filter(l => l.id !== id)); },
    search(query) {
      const q = query.toLowerCase();
      return get(KEYS.lessons).filter(l =>
        l.problema?.toLowerCase().includes(q) ||
        l.solucao?.toLowerCase().includes(q) ||
        l.equipmentTipo?.toLowerCase().includes(q) ||
        l.disciplina?.toLowerCase().includes(q)
      );
    }
  };

  // ==================== NOTIFICATIONS ====================
  const notifications = {
    list: () => get(KEYS.notifications),
    unreadCount: () => get(KEYS.notifications).filter(n => !n.read).length,
    add(data) {
      const items = get(KEYS.notifications);
      const item = { id: uid('nt'), ...data, read: false, createdAt: now() };
      items.unshift(item);
      if (items.length > 200) items.splice(200);
      set(KEYS.notifications, items);
      events.emit('notification:new', item);
      return item;
    },
    markRead(id) {
      const items = get(KEYS.notifications);
      const idx = items.findIndex(n => n.id === id);
      if (idx !== -1) { items[idx].read = true; set(KEYS.notifications, items); }
    },
    markAllRead() {
      const items = get(KEYS.notifications).map(n => ({ ...n, read: true }));
      set(KEYS.notifications, items);
      events.emit('notification:allRead', null);
    },
    delete(id) { set(KEYS.notifications, get(KEYS.notifications).filter(n => n.id !== id)); }
  };

  // ==================== SETTINGS ====================
  const settings = {
    get: () => getObj(KEYS.settings),
    set: (data) => set(KEYS.settings, { ...getObj(KEYS.settings), ...data }),
    getVal: (key, def) => { const s = getObj(KEYS.settings); return s[key] !== undefined ? s[key] : def; }
  };

  // ==================== KPI CALCULATIONS ====================
  const kpi = {
    getEquipmentStats(monthPrefix) {
      let eqs = equipment.list();
      let allTasks = tasks.getAll();
      let allParts = parts.getAll();
      let allRestrictions = restrictions.getAll();
      const today = new Date().toISOString().slice(0, 10);

      if (monthPrefix) {
        // Filter equipments to those with release planned for this month or released this month
        eqs = eqs.filter(e => (e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada.startsWith(monthPrefix)) || (e.dataLiberacaoAtual && e.dataLiberacaoAtual.startsWith(monthPrefix)) || (e.dataFim && e.dataFim.startsWith(monthPrefix)));
        
        // Filter tasks to those created or updated this month
        allTasks = allTasks.filter(t => (t.createdAt && t.createdAt.startsWith(monthPrefix)) || (t.dataFim && t.dataFim.startsWith(monthPrefix)));
      }

      return {
        total: eqs.length,
        emManutencao: eqs.filter(e => e.status === 'Em Manutenção').length,
        liberados: eqs.filter(e => e.status === 'Liberado').length,
        atrasados: eqs.filter(e => e.status === 'Em Manutenção' && e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada < today).length,
        aguardandoPecas: eqs.filter(e => allParts.some(p => p.equipmentId === e.id && ['Solicitada','Comprada','Em Transporte'].includes(p.status))).length,
        bloqueados: eqs.filter(e => e.status === 'Paralisado' || e.status === 'Falta de Peças' || e.status === 'Falta de Mão de Obra').length,
        totalTarefas: allTasks.length,
        concluidas: allTasks.filter(t => t.status === 'Concluída').length,
        pendentes: allTasks.filter(t => t.status !== 'Concluída').length,
        criticas: allTasks.filter(t => t.critico).length,
        restricoesAbertas: allRestrictions.filter(r => r.status === 'Aberta').length,
        horasPlanejadas: allTasks.reduce((s, t) => s + (parseFloat(t.horasPlanejadas) || 0), 0),
        horasRealizadas: allTasks.reduce((s, t) => s + (parseFloat(t.horasRealizadas) || 0), 0),
        pctAvancoGeral: (() => {
          const total = allTasks.length;
          if (!total) return 0;
          const sum = allTasks.reduce((s, t) => s + (t.pctExecutado || 0), 0);
          return Math.round(sum / total);
        })(),
        aderencia: (() => {
          const completed = allTasks.filter(t => t.status === 'Concluída');
          if (!completed.length) return 100;
          const onTime = completed.filter(t => !t.dataRealTermino || !t.dataPlanejadaTermino || t.dataRealTermino <= t.dataPlanejadaTermino);
          return Math.round((onTime.length / completed.length) * 100);
        })()
      };
    },

    getMTBF(equipmentId) {
      const timelines = equipmentId
        ? (equipment.get(equipmentId)?.timeline || [])
        : equipment.list().flatMap(e => e.timeline || []);
      const maintenances = timelines.filter(t => t.tipo === 'LIBERACAO');
      if (maintenances.length < 2) return null;
      const intervals = [];
      for (let i = 1; i < maintenances.length; i++) {
        const diff = new Date(maintenances[i].timestamp) - new Date(maintenances[i-1].timestamp);
        intervals.push(diff / (1000 * 60 * 60 * 24));
      }
      return (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1);
    },

    getMTTR(equipmentId) {
      const timelines = equipmentId
        ? (equipment.get(equipmentId)?.timeline || [])
        : equipment.list().flatMap(e => e.timeline || []);
      const starts = timelines.filter(t => t.tipo === 'ENTRADA');
      const ends   = timelines.filter(t => t.tipo === 'LIBERACAO');
      const pairs = Math.min(starts.length, ends.length);
      if (!pairs) return null;
      const times = [];
      for (let i = 0; i < pairs; i++) {
        const diff = new Date(ends[i].timestamp) - new Date(starts[i].timestamp);
        times.push(diff / (1000 * 60 * 60 * 24));
      }
      return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
    }
  };

  function recalculateEquipmentProgress(equipmentId) {
    if (!equipmentId) return;
    const allTasks = get(KEYS.tasks).filter(t => t.equipmentId === equipmentId);
    const total = allTasks.length;
    let pct = 0;
    
    // Calculate max task end date for automatic prediction
    const taskDates = allTasks.map(t => t.dataReplanejada || t.dataPlanejadaTermino).filter(Boolean).sort();
    const maxTaskDate = taskDates.length > 0 ? taskDates[taskDates.length - 1] : null;

    if (total > 0) {
      const sum = allTasks.reduce((s, t) => s + (t.pctExecutado || 0), 0);
      pct = Math.round(sum / total);
    }
    
    const items = get(KEYS.equipment);
    const idx = items.findIndex(e => e.id === equipmentId);
    if (idx !== -1) {
      let changed = false;
      if (items[idx].pctAvanco !== pct) {
        items[idx].pctAvanco = pct;
        changed = true;
      }
      if (maxTaskDate && items[idx].dataLiberacaoAtual !== maxTaskDate) {
        items[idx].dataLiberacaoAtual = maxTaskDate;
        changed = true;
      }
      
      if (changed) {
        items[idx].updatedAt = now();
        set(KEYS.equipment, items);
        if (window.events && window.events.emit) {
          window.events.emit('equipment:updated', items[idx]);
        }
      }
    }
  }

  // Run on startup to ensure existing data is consistent
  try {
    setTimeout(() => {
      // Seeding default lessons learned
      const lessonsList = get(KEYS.lessons);
      if (!lessonsList || lessonsList.length === 0) {
        const seedLessons = [
          {
            id: 'll-seed-1',
            disciplina: 'Mecânica',
            equipmentTipo: 'Sondas de Pesquisas',
            problema: 'Vazamento crônico no retentor da bomba de lama principal durante operação sob alta rotação.',
            solucao: 'Substituição do retentor original por um modelo de duplo lábio de viton, mais resistente a calor e atrito.',
            recomendacao: 'Adotar o retentor de viton como padrão em todas as preventivas de 250 horas da bomba de lama.',
            tempoPerdido: 2,
            createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
          },
          {
            id: 'll-seed-2',
            disciplina: 'Caldeiraria',
            equipmentTipo: 'Sondas Poços',
            problema: 'Desgaste prematuro e empenamento nos braços oscilantes devido a vibração excessiva no terreno rochoso.',
            solucao: 'Reforço estrutural dos braços com chapas de aço carbono 1045 de 1/2 polegada nas laterais.',
            recomendacao: 'Inspecionar trincas com ensaio de líquido penetrante a cada 500 horas de perfuração.',
            tempoPerdido: 3,
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
          }
        ];
        set(KEYS.lessons, seedLessons);
      }

      const eqs = get(KEYS.equipment);
      let changed = false;
      eqs.forEach(e => {
        // Seeding default timeline events
        if (!e.timeline || e.timeline.length === 0) {
          if (e.codigo === 'SSM-288') {
            e.timeline = [
              { id: 'tl-ssm-1', tipo: 'ENTRADA', titulo: 'Entrada em Manutenção', descricao: 'Equipamento deu entrada na oficina de BHZ para manutenção corretiva periódica.', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), responsavel: 'Sistema' },
              { id: 'tl-ssm-2', tipo: 'INICIO', titulo: 'Início dos Trabalhos', descricao: 'Abertura da OS-88220 e início da lavagem preliminar para diagnóstico estrutural.', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), responsavel: 'Sistema' },
              { id: 'tl-ssm-3', tipo: 'DEFEITO', titulo: 'Defeito Identificado', descricao: 'Trinca estrutural detectada na torre de içamento principal. Requer solda especial.', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), responsavel: 'Sistema' }
            ];
            changed = true;
          } else if (e.codigo === 'BHZ-001') {
            e.timeline = [
              { id: 'tl-bhz-1', tipo: 'ENTRADA', titulo: 'Entrada em Manutenção', descricao: 'Equipamento posicionado no box 3 para revisão do sistema hidráulico e troca de mangueiras.', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), responsavel: 'Sistema' },
              { id: 'tl-bhz-2', tipo: 'PECA_SOLICITADA', titulo: 'Falta de Peça Registrada', descricao: 'Solicitada mangueira de alta pressão 3/4 via S.A. 45290. Aguardando entrega do almoxarifado.', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), responsavel: 'Sistema' }
            ];
            changed = true;
          }
        }

        const eqTasks = get(KEYS.tasks).filter(t => t.equipmentId === e.id);
        const total = eqTasks.length;
        let pct = 0;
        if (total > 0) {
          const sum = eqTasks.reduce((s, t) => s + (t.pctExecutado || 0), 0);
          pct = Math.round(sum / total);
        }
        if (e.pctAvanco !== pct) {
          e.pctAvanco = pct;
          changed = true;
        }
      });
      if (changed) {
        set(KEYS.equipment, eqs);
      }
    }, 1000);
  } catch (e) {
    console.error("Migration error:", e);
  }

  // Seed workforce if missing (for existing clients)
  setTimeout(() => {
    try {
      let currentWf = workforce.list() || [];
      let updatedAny = false;
      
      // Ensure all existing workers have an ID to prevent Supabase sync crashes
      currentWf.forEach(w => {
         if (!w.id) {
            w.id = window.DB.uid ? window.DB.uid('wf') : `wf-${Date.now()}-${Math.random()}`;
            if (!w.currentState) {
               w.currentState = 'Ocioso';
               w.currentTaskId = null;
            }
            updatedAny = true;
         }
      });
      
      let seeded = false;
      if (INITIAL_DATA[KEYS.workforce]) {
        INITIAL_DATA[KEYS.workforce].forEach(seed => {
          if (!currentWf.find(w => w.matricula === seed.matricula)) {
             seed.id = seed.id || window.DB.uid('wf');
             currentWf.push({ ...seed, currentState: 'Ocioso', currentTaskId: null, currentPauseReason: '', currentActionStartTime: null });
             seeded = true;
          }
        });
        if (seeded || updatedAny) {
          localStorage.setItem(KEYS.workforce, JSON.stringify(currentWf));
          if (window.DB && DB.syncToSupabase) DB.syncToSupabase(KEYS.workforce, currentWf);
        }
      }
    } catch(e) {}
  }, 1000);

  const solicitacoes = {
    list: () => get(KEYS.solicitacoes),
    add: (data) => { const s = get(KEYS.solicitacoes); s.push(data); set(KEYS.solicitacoes, s); },
    update: (id, updates) => { let s = get(KEYS.solicitacoes); const i = s.findIndex(r => r.id === id); if (i !== -1) { s[i] = { ...s[i], ...updates, updatedAt: now() }; set(KEYS.solicitacoes, s); } },
    delete: (id) => { const s = get(KEYS.solicitacoes); set(KEYS.solicitacoes, s.filter(r => r.id !== id)); }
  };

  const manuals = {
    list: () => get(KEYS.manuals),
    add: (data) => { const m = get(KEYS.manuals); m.push({ ...data, createdAt: now() }); set(KEYS.manuals, m); },
    update: (id, updates) => { let m = get(KEYS.manuals); const i = m.findIndex(r => r.id === id); if (i !== -1) { m[i] = { ...m[i], ...updates, updatedAt: now() }; set(KEYS.manuals, m); } },
    delete: (id) => { const m = get(KEYS.manuals); set(KEYS.manuals, m.filter(r => r.id !== id)); }
  };

  const manualFolders = {
    list: () => get(KEYS.manualFolders),
    add: (data) => { const m = get(KEYS.manualFolders); m.push({ ...data, createdAt: now() }); set(KEYS.manualFolders, m); },
    update: (id, updates) => { let m = get(KEYS.manualFolders); const i = m.findIndex(r => r.id === id); if (i !== -1) { m[i] = { ...m[i], ...updates, updatedAt: now() }; set(KEYS.manualFolders, m); } },
    delete: (id) => { const m = get(KEYS.manualFolders); set(KEYS.manualFolders, m.filter(r => r.id !== id)); }
  };

  const meetingTasks = {
    list: () => get(KEYS.meetingTasks),
    add: (data) => { const m = get(KEYS.meetingTasks); m.push({ ...data, createdAt: now() }); set(KEYS.meetingTasks, m); },
    update: (id, updates) => { let m = get(KEYS.meetingTasks); const i = m.findIndex(r => r.id === id); if (i !== -1) { m[i] = { ...m[i], ...updates, updatedAt: now() }; set(KEYS.meetingTasks, m); } },
    delete: (id) => { const m = get(KEYS.meetingTasks); set(KEYS.meetingTasks, m.filter(r => r.id !== id)); }
  };

  const vacations = {
    list: () => get(KEYS.vacations),
    add: (data) => { const m = get(KEYS.vacations); m.push({ ...data, createdAt: now() }); set(KEYS.vacations, m); },
    update: (id, updates) => { let m = get(KEYS.vacations); const i = m.findIndex(r => r.id === id); if (i !== -1) { m[i] = { ...m[i], ...updates, updatedAt: now() }; set(KEYS.vacations, m); } },
    delete: (id) => { const m = get(KEYS.vacations); set(KEYS.vacations, m.filter(r => r.id !== id)); }
  };

  return {
    equipment, tasks, parts, workforce, timesheets, replannings, restrictions, costs, lessons, notifications, settings, kpi, solicitacoes, manuals, manualFolders, meetingTasks, vacations, uid, now,
    initSupabase, forceSyncAll, setGlobalEqFilter, syncToSupabase };
  } catch(err) {
    alert('Erro crítico ao inicializar o banco de dados (db.js): ' + err.message + '\n\n' + err.stack);
    return {};
  }
})();

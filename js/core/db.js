/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Core: Database Layer
   ============================================================ */

window.DB = (() => {
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
    kpiCache: 'diman_kpi_cache',
    settings: 'diman_settings',
  };

  window.GlobalEqFilter = '';
  window.setGlobalEqFilter = function(id) {
    window.GlobalEqFilter = id;
    if (window.Router) {
      const current = window.Router.getCurrent();
      if (current) window.Router.navigate(current, { force: true });
    }
  };

  function get(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }
  function getObj(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  }
  function syncToSupabase(collection, data) {
    if (supabaseClient) {
      supabaseClient.from('diman_store')
        .upsert({ collection: collection, key: 'all', data: data }, { onConflict: 'collection,key' })
        .catch(err => console.error('Supabase Sync Error:', err));
    }
  }
  function set(key, data) { 
    localStorage.setItem(key, JSON.stringify(data)); 
    syncToSupabase(key, data);
  }
  function uid(prefix = 'id') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
  function now() { return new Date().toISOString(); }

  async function forceSyncAll() {
    if (!supabaseClient) {
      if (window.Toast) Toast.error('Erro de Sincronização', 'Cliente do Supabase não conectado.');
      return;
    }
    const allKeys = Object.values(KEYS);
    for (const k of allKeys) {
      const data = get(k);
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
        try {
          await supabaseClient.from('diman_store')
            .upsert({ collection: k, key: 'all', data: data }, { onConflict: 'collection,key' });
        } catch(e) {
          console.error('Sync failed for collection:', k, e);
        }
      }
    }
    if (window.Toast) Toast.success('Sincronização Concluída', 'Todos os dados locais foram enviados para a nuvem do Supabase.');
  }

  async function initSupabase() {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from('diman_store').select('*');
      if (error) { console.error('Supabase fetch error:', error); return; }
      if (data && data.length > 0) {
        data.forEach(row => {
          if (row.key === 'all') {
            localStorage.setItem(row.collection, JSON.stringify(row.data));
          }
        });
      }
    } catch(e) {
      console.error('Failed to init Supabase:', e);
    }
  }

  // ==================== EQUIPMENT ====================
  const equipment = {
    list: () => get(KEYS.equipment),
    get: id => get(KEYS.equipment).find(e => e.id === id),
    create(data) {
      const items = get(KEYS.equipment);
      const item = { id: uid('eq'), ...data, createdAt: now(), updatedAt: now(), timeline: [], replanning: [] };
      items.push(item);
      set(KEYS.equipment, items);
      Auth.addAuditLog('CREATE_EQUIPMENT', `Equipamento ${data.nome} criado`, data);
      events.emit('equipment:created', item);
      return item;
    },
    update(id, data) {
      const items = get(KEYS.equipment);
      const idx = items.findIndex(e => e.id === id);
      if (idx === -1) return null;
      const before = { ...items[idx] };
      items[idx] = { ...items[idx], ...data, updatedAt: now() };
      set(KEYS.equipment, items);
      Auth.addAuditLog('UPDATE_EQUIPMENT', `Equipamento ${items[idx].nome} atualizado`, { before, after: items[idx] });
      events.emit('equipment:updated', items[idx]);
      return items[idx];
    },
    delete(id) {
      const items = get(KEYS.equipment);
      const eq = items.find(e => e.id === id);
      set(KEYS.equipment, items.filter(e => e.id !== id));
      if (eq) { Auth.addAuditLog('DELETE_EQUIPMENT', `Equipamento ${eq.nome} removido`, null); events.emit('equipment:deleted', id); }
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
      events.emit('timeline:updated', { equipmentId: id });
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
      Auth.addAuditLog('REPLANNING', `Replanejamento R${n} criado para ${items[idx].nome}`, data);
      events.emit('replanning:created', { equipmentId: id, entry });
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
      return items[idx];
    },
    delete(id) {
      const items = get(KEYS.tasks);
      const t = items.find(x => x.id === id);
      set(KEYS.tasks, items.filter(x => x.id !== id));
      if (t) { Auth.addAuditLog('DELETE_TASK', `Tarefa ${t.descricao} removida`, null); events.emit('task:deleted', id); }
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
      return item;
    },
    update(id, data) {
      const items = get(KEYS.workforce);
      const idx = items.findIndex(w => w.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      set(KEYS.workforce, items);
      return items[idx];
    },
    delete(id) { set(KEYS.workforce, get(KEYS.workforce).filter(w => w.id !== id)); }
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
    getEquipmentStats() {
      const eqs = equipment.list();
      const allTasks = tasks.getAll();
      const allParts = parts.getAll();
      const allRestrictions = restrictions.getAll();
      const today = new Date().toISOString().slice(0, 10);

      return {
        total: eqs.length,
        emManutencao: eqs.filter(e => e.status === 'Em Manutenção').length,
        liberados: eqs.filter(e => e.status === 'Liberado').length,
        atrasados: eqs.filter(e => e.status === 'Em Manutenção' && e.dataLiberacaoPlanejada && e.dataLiberacaoPlanejada < today).length,
        aguardandoPecas: eqs.filter(e => allParts.some(p => p.equipmentId === e.id && ['Solicitada','Comprada','Em Transporte'].includes(p.status))).length,
        bloqueados: eqs.filter(e => e.status === 'Bloqueado').length,
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

  return {
    equipment, tasks, parts, workforce, timesheets, replannings, restrictions, costs, lessons, notifications, settings, kpi, uid, now,
    initSupabase, forceSyncAll, setGlobalEqFilter, syncToSupabase };
})();

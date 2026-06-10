/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Core: Authentication
   ============================================================ */

window.Auth = (() => {
  const USERS_KEY = 'diman_users';
  const SESSION_KEY = 'diman_session';
  const AUDIT_KEY = 'diman_audit';

  // Hash password with SHA-256 via Web Crypto API
  async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (window.DB && DB.syncToSupabase) {
      DB.syncToSupabase(USERS_KEY, users);
    }
  }

  async function initSuperAdmin() {
    const users = getUsers();
    if (!users.find(u => u.matricula === '013429')) {
      const hashed = await hashPassword('35215415');
      users.push({
        id: 'u-superadmin',
        matricula: '013429',
        nome: 'Administrador do Sistema',
        email: 'admin@diman-bhz.com',
        telefone: '',
        cargo: 'Desenvolvedor do Sistema',
        disciplina: 'TI',
        perfil: 'Desenvolvedor',
        senhaHash: hashed,
        senhaInicial: true, // must change on first login
        status: 'Ativo',
        createdAt: new Date().toISOString(),
        permissions: getAllPermissions()
      });
      saveUsers(users);
    }
  }

  function getAllPermissions() {
    return {
      dashboard: true, equipment: true, tasks: true, gantt: true,
      criticalPath: true, parts: true, workforce: true, planning: true,
      timeline: true, impacts: true, kpi: true, ai: true,
      reports: true, audit: true, users: true, restrictions: true,
      workshop: true, lessons: true, costs: true, meetingMode: true,
      history: true, managerDashboard: true, simulator: true
    };
  }

  function getPermissionsForProfile(profile) {
    switch(profile) {
      case 'Desenvolvedor': return getAllPermissions();
      case 'Administrador': return getAllPermissions();
      case 'Gerente': return { ...getAllPermissions(), users: false };
      case 'Planejador': return { ...getAllPermissions(), users: false, audit: false };
      case 'Coordenador': return { dashboard: true, equipment: true, tasks: true, gantt: true, parts: true, workforce: true, workshop: true, restrictions: true, timeline: true, kpi: false, ai: true, reports: false, audit: false, users: false, planning: false, impacts: false, costs: false, lessons: true, criticalPath: true, meetingMode: false, history: true, managerDashboard: false, simulator: false };
      case 'Encarregado': return { dashboard: true, equipment: false, tasks: true, gantt: false, parts: false, workforce: true, workshop: true, restrictions: false, timeline: false, kpi: false, ai: false, reports: false, audit: false, users: false, planning: false, impacts: false, costs: false, lessons: true, criticalPath: false, meetingMode: false, history: false, managerDashboard: false, simulator: false };
      case 'Supervisor': return { dashboard: true, equipment: true, tasks: true, gantt: true, parts: true, workforce: true, workshop: true, restrictions: true, timeline: true, kpi: false, ai: true, reports: false, audit: false, users: false, planning: false, impacts: false, costs: false, lessons: true, criticalPath: true, meetingMode: false, history: true, managerDashboard: false, simulator: false };
      case 'Executante': return { dashboard: true, equipment: false, tasks: true, gantt: false, parts: false, workforce: true, workshop: true, restrictions: false, timeline: false, kpi: false, ai: false, reports: false, audit: false, users: false, planning: false, impacts: false, costs: false, lessons: true, criticalPath: false, meetingMode: false, history: false, managerDashboard: false, simulator: false };
      case 'Cliente': return { dashboard: true, equipment: true, tasks: false, gantt: true, parts: false, workforce: false, workshop: true, restrictions: false, timeline: true, kpi: true, ai: false, reports: true, audit: false, users: false, planning: false, impacts: true, costs: false, lessons: false, criticalPath: false, meetingMode: false, history: true, managerDashboard: false, simulator: false };
      default: return {};
    }
  }

  async function login(matricula, senha) {
    const users = getUsers();
    const user = users.find(u => u.matricula === matricula);
    if (!user) return { success: false, error: 'Matrícula não encontrada.' };
    if (user.status === 'Inativo') return { success: false, error: 'Usuário inativo. Contate o administrador.' };
    const hash = await hashPassword(senha);
    if (hash !== user.senhaHash) return { success: false, error: 'Senha incorreta.' };

    const session = {
      userId: user.id,
      matricula: user.matricula,
      nome: user.nome,
      perfil: user.perfil,
      disciplina: user.disciplina,
      permissions: user.permissions || getPermissionsForProfile(user.perfil),
      loginAt: new Date().toISOString(),
      mustChangePassword: user.senhaInicial === true
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    addAuditLog('LOGIN', `Usuário ${user.nome} fez login`, null);
    return { success: true, session, mustChangePassword: user.senhaInicial === true };
  }

  function logout() {
    const session = getSession();
    if (session) addAuditLog('LOGOUT', `Usuário ${session.nome} fez logout`, null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch { return null; }
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  function hasPermission(perm) {
    const s = getSession();
    if (!s) return false;
    if (s.perfil === 'Desenvolvedor' || s.perfil === 'Administrador') return true;
    return s.permissions?.[perm] === true;
  }

  async function changePassword(matricula, novaSenha, nome = null) {
    const users = getUsers();
    const idx = users.findIndex(u => u.matricula === matricula);
    if (idx === -1) return false;
    users[idx].senhaHash = await hashPassword(novaSenha);
    users[idx].senhaInicial = false;
    if (nome) users[idx].nome = nome;
    saveUsers(users);

    // Update session
    const session = getSession();
    if (session) {
      session.mustChangePassword = false;
      if (nome) session.nome = nome;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    addAuditLog('CHANGE_PASSWORD', `Usuário ${users[idx].nome} alterou a senha`, null);
    return true;
  }

  async function createUser(data) {
    const users = getUsers();
    if (users.find(u => u.matricula === data.matricula)) {
      return { success: false, error: 'Matrícula já cadastrada.' };
    }
    const hashed = await hashPassword(data.senhaInicial || '123456');
    const user = {
      id: 'u-' + Date.now(),
      matricula: data.matricula,
      nome: data.nome,
      email: data.email || '',
      telefone: data.telefone || '',
      cargo: data.cargo || '',
      disciplina: data.disciplina || '',
      perfil: data.perfil || 'Executante',
      senhaHash: hashed,
      senhaInicial: true,
      status: data.status || 'Ativo',
      createdAt: new Date().toISOString(),
      permissions: data.permissions || getPermissionsForProfile(data.perfil)
    };
    users.push(user);
    saveUsers(users);
    addAuditLog('CREATE_USER', `Usuário ${user.nome} (${user.matricula}) criado`, null);
    return { success: true, user };
  }

  function updateUser(id, data) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    const old = { ...users[idx] };
    Object.assign(users[idx], data);
    saveUsers(users);
    addAuditLog('UPDATE_USER', `Usuário ${users[idx].nome} atualizado`, { before: old, after: users[idx] });
    return true;
  }

  function deleteUser(id) {
    const users = getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return false;
    const filtered = users.filter(u => u.id !== id);
    saveUsers(filtered);
    addAuditLog('DELETE_USER', `Usuário ${user.nome} removido`, null);
    return true;
  }

  function listUsers() {
    return getUsers().filter(u => u.matricula !== '013429' || getSession()?.perfil === 'Desenvolvedor');
  }

  function addAuditLog(action, description, changes) {
    const session = getSession();
    const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    logs.unshift({
      id: 'al-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      action,
      description,
      changes,
      user: session ? { id: session.userId, nome: session.nome, matricula: session.matricula } : null,
      timestamp: new Date().toISOString()
    });
    // Keep last 5000 entries
    if (logs.length > 5000) logs.splice(5000);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
  }

  function getAuditLogs(filters = {}) {
    let logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    if (filters.user)   logs = logs.filter(l => l.user?.matricula === filters.user);
    if (filters.from)   logs = logs.filter(l => l.timestamp >= filters.from);
    if (filters.to)     logs = logs.filter(l => l.timestamp <= filters.to);
    return logs;
  }

  return {
    init: initSuperAdmin,
    login, logout, getSession, isLoggedIn, hasPermission,
    changePassword, createUser, updateUser, deleteUser, listUsers,
    addAuditLog, getAuditLogs,
    getPermissionsForProfile, getAllPermissions, hashPassword
  };
})();

/* ================================================================
   PLANEJAMENTO DIMAN-BHZ
   app.js — Bootstrap, Router & Shell
   ================================================================ */

// ---- Router ----
// Global aliases to ensure resolution
const DB = window.DB || {};
const Auth = window.Auth || {};
const events = window.events || {};
const Toast = window.Toast || {};

window.Router = (() => {
  const routes = {};
  let current = null;
  let currentParams = {};
  let destroyFn = null;

  function register(name, moduleFn) { routes[name] = moduleFn; }

  async function navigate(name, params = {}) {
    if (current === name && !params.force) return;

    // destroy previous
    if (destroyFn) { try { destroyFn(); } catch(e){} destroyFn = null; }

    if (current === name) {
      params = { ...currentParams, ...params };
    }
    currentParams = { ...params };
    current = name;
    
    const sidebar = document.getElementById('sidebar');
    const header = document.querySelector('header');
    if (name === 'qrview') {
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      document.body.style.background = '#0f172a'; // match dark premium theme
    } else {
      if (sidebar) sidebar.style.display = 'flex';
      if (header) header.style.display = 'flex';
      document.body.style.background = 'var(--bg-base)';
    }

    const container = document.getElementById('page-content');
    if (!container) return;

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-route="${name}"]`);
    if (activeNav) activeNav.classList.add('active');

    // loading state
    container.innerHTML = `<div class="page-loader" style="position:relative;height:200px;background:transparent">
      <div class="page-loader-logo"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
    </div>`;

    // slight delay for UX
    await new Promise(r => setTimeout(r, 120));

    const mod = routes[name];
    if (!mod) { container.innerHTML = `<div class="page-container"><div class="empty-state"><h3>Módulo não encontrado: ${name}</h3></div></div>`; return; }

    try {
      const result = await mod(params);
      if (typeof result === 'string') {
        container.innerHTML = result;
      }
      if (result && result.destroy) destroyFn = result.destroy;
      container.querySelector('.page-container, .gantt-container, .meeting-panel')?.classList.add('page-enter');
    } catch(e) {
      console.error('[Router] Error rendering', name, e);
      container.innerHTML = `<div class="page-container"><div class="alert alert-danger"><div class="alert-content"><div class="alert-title">Erro ao carregar módulo</div><div class="alert-msg">${e.message}</div></div></div></div>`;
    }
  }

  function getCurrent() { return current; }
  return { register, navigate, getCurrent, get currentRoute() { return current; } };
})();

// ================================================================
// APP BOOTSTRAP
// ================================================================

async function initApp() {
  if (window.DB && DB.initSupabase) {
    await DB.initSupabase();
  }

  // ---- PUBLIC QR VIEW (no login required) ----
  const hash = window.location.hash;
  if (hash.startsWith('#qrview')) {
    const params = {};
    hash.replace('#qrview', '').replace(/[?&]([^=&]+)=([^&]*)/g, (_, k, v) => { params[k] = decodeURIComponent(v); });
    if (params.id) {
      renderPublicQrView(params.id);
      return;
    }
  }

  // LocalStorage wipe removed to prevent erasing Supabase on new devices

  Auth.init();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const savedTheme = localStorage.getItem('diman_theme') || 'light';
    document.documentElement.dataset.theme = savedTheme;

    await initApp();

    // Check session
    if (!Auth.isLoggedIn()) {
      showLoginPage();
      return;
    }

    const session = Auth.getSession();
    // Render shell
    renderShell(session);

    // Navigate to home
    Router.navigate('home');
  } catch (e) {
    console.error('Fatal App Error:', e);
    alert('Erro fatal ao carregar o sistema: ' + e.message + '\n\n' + e.stack);
  }
});

// ================================================================
// LOGIN PAGE
// ================================================================

function showLoginPage() {
  document.body.innerHTML = '';
  document.body.style.overflow = 'hidden';
  const page = document.createElement('div');
  page.id = 'login-page';
  page.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg-base);z-index:9999;overflow:hidden;';

  page.innerHTML = `
    <!-- Animated background -->
    <div class="login-bg" style="position:absolute;inset:0;overflow:hidden;">
      <div style="position:absolute;width:600px;height:600px;background:radial-gradient(circle,rgba(21,101,192,0.12) 0%,transparent 70%);top:-100px;left:-100px;border-radius:50%;animation:float 8s ease-in-out infinite;"></div>
      <div style="position:absolute;width:400px;height:400px;background:radial-gradient(circle,rgba(2,136,209,0.1) 0%,transparent 70%);bottom:-80px;right:-80px;border-radius:50%;animation:float 6s ease-in-out infinite reverse;"></div>
      <div style="position:absolute;width:300px;height:300px;background:radial-gradient(circle,rgba(30,136,229,0.08) 0%,transparent 70%);bottom:30%;right:25%;border-radius:50%;animation:float 10s ease-in-out infinite;"></div>
    </div>

    <!-- Grid pattern -->
    <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(30,136,229,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(30,136,229,0.04) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>

    <!-- Login card -->
    <div style="position:relative;width:100%;max-width:420px;padding:var(--space-4);animation:fadeInUp 0.6s ease forwards;">
      <div class="card" style="padding:var(--space-8);border-color:var(--border-hover);box-shadow:var(--shadow-xl),0 0 60px rgba(21,101,192,0.15);">
        
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:var(--space-8)">
          <div style="width:72px;height:72px;background:var(--gradient-primary);border-radius:20px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--space-4);box-shadow:0 8px 30px rgba(21,101,192,0.4);animation:glow-pulse 3s ease-in-out infinite;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" style="width:38px;height:38px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.03em;margin-bottom:4px;">DIMAN-BHZ</h1>
          <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:var(--font-semibold);letter-spacing:0.12em;text-transform:uppercase;">Planejamento, Controle e Gestão Inteligente da Manutenção</div>
        </div>

        <!-- Form -->
        <form id="login-form" style="display:flex;flex-direction:column;gap:var(--space-5);">
          <div class="form-group">
            <label for="login-matricula">Matrícula</label>
            <div class="input-group">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
              <input type="text" id="login-matricula" placeholder="Digite sua matrícula" required autocomplete="username" maxlength="20" />
            </div>
          </div>
          <div class="form-group">
            <label for="login-senha">Senha</label>
            <div class="input-group">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
              <input type="password" id="login-senha" placeholder="Digite sua senha" required autocomplete="current-password" />
              <button type="button" class="input-action" id="toggle-senha" tabindex="-1" title="Mostrar/Ocultar senha">
                <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </button>
            </div>
          </div>

          <div id="login-error" style="display:none;" class="alert alert-danger">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
            <div class="alert-content"><span id="login-error-msg"></span></div>
          </div>

          <button type="submit" id="login-btn" class="btn btn-primary btn-xl" style="width:100%;margin-top:var(--space-2);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
            Entrar
          </button>

          <div style="text-align:center;">
            <button type="button" onclick="showForgotPassword()" style="background:none;border:none;color:var(--brand-primary-light);font-size:var(--text-sm);cursor:pointer;text-decoration:underline;">
              Esqueci minha senha
            </button>
          </div>
        </form>

        <!-- Theme toggle -->
        <div style="position:absolute;top:var(--space-4);right:var(--space-4);">
          <button class="theme-btn" onclick="toggleTheme()" title="Alternar tema">
            <svg id="theme-icon-login" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
          </button>
        </div>
      </div>

      <!-- Version info -->
      <p style="text-align:center;font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-4);">PLANEJAMENTO DIMAN-BHZ v1.0 &nbsp;|&nbsp; Desenvolvido para Gestão Industrial</p>
    </div>
  `;

  document.body.appendChild(page);

  // Form submit
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const matricula = document.getElementById('login-matricula').value.trim();
    const senha = document.getElementById('login-senha').value;
    const errDiv = document.getElementById('login-error');
    const errMsg = document.getElementById('login-error-msg');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner spinner-sm"></span> Verificando...`;
    errDiv.style.display = 'none';

    const result = await Auth.login(matricula, senha);
    if (result.success) {
      // (wipe logic removed here as well)

      setTimeout(() => { page.remove(); renderShell(result.session); Router.navigate('home'); }, 300);
    } else {
      errMsg.textContent = result.error;
      errDiv.style.display = 'flex';
      btn.disabled = false;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg> Entrar`;
    }
  });

  // Toggle password
  document.getElementById('toggle-senha').addEventListener('click', () => {
    const inp = document.getElementById('login-senha');
    const icon = document.getElementById('eye-icon');
    if (inp.type === 'password') {
      inp.type = 'text';
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>`;
    } else {
      inp.type = 'password';
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`;
    }
  });
}

function showForgotPassword() {
  Toast.info('Recuperação de Senha', 'Entre em contato com o Administrador do sistema para redefinir sua senha.', 6000);
}

// ================================================================
// CHANGE PASSWORD PAGE
// ================================================================

function showChangePasswordPage(session) {
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('topbar').style.display = 'none';
  const main = document.getElementById('main');
  main.style.background = '#0f172a';
  
  const container = document.getElementById('page-content');
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:var(--space-4);">
      <div class="card" style="width:100%;max-width:400px;background:#1e293b;border:1px solid #334155;animation:slideUp 0.4s ease forwards;">
        <div style="text-align:center;margin-bottom:var(--space-6);">
          <div style="width:64px;height:64px;background:var(--gradient-primary);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);box-shadow:0 10px 25px -5px rgba(37,99,235,0.5);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" style="width:32px;height:32px"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
          </div>
          <h2 style="color:white;font-weight:900;margin-bottom:var(--space-2);">Primeiro Acesso</h2>
          <p style="color:#94a3b8;font-size:var(--text-sm);">Por segurança, preencha seu nome e altere a senha provisória.</p>
        </div>
        
        <form id="change-pwd-form">
          <div class="form-group">
            <label style="color:#cbd5e1;">Nome Completo</label>
            <input type="text" id="new-nome" class="form-control" required placeholder="Digite seu nome real" style="background:#0f172a;border-color:#334155;color:white;" autofocus>
          </div>
          <div class="form-group">
            <label style="color:#cbd5e1;">Nova Senha</label>
            <input type="password" id="new-pwd" class="form-control" required placeholder="Digite a nova senha" style="background:#0f172a;border-color:#334155;color:white;">
          </div>
          <div class="form-group">
            <label style="color:#cbd5e1;">Confirme a Senha</label>
            <input type="password" id="confirm-pwd" class="form-control" required placeholder="Repita a nova senha" style="background:#0f172a;border-color:#334155;color:white;">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:var(--space-2);">Salvar e Entrar</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('change-pwd-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('new-nome').value.trim();
    const p1 = document.getElementById('new-pwd').value;
    const p2 = document.getElementById('confirm-pwd').value;
    if (!nome) { Toast.error('Erro', 'Informe seu nome completo.'); return; }
    if (p1 !== p2) { Toast.error('Erro', 'As senhas não conferem.'); return; }
    if (p1.length < 6) { Toast.error('Erro', 'A senha deve ter pelo menos 6 caracteres.'); return; }

    const success = await Auth.changePassword(session.matricula, p1, nome);
    if (success) {
      Toast.success('Sucesso', 'Configuração concluída!');
      setTimeout(() => location.reload(), 1000);
    }
  });
}

// ================================================================
// APP SHELL
// ================================================================
// Fix bad data from test
try {
  let eq = JSON.parse(localStorage.getItem('diman_equipment') || '[]');
  eq = eq.filter(e => e.codigo !== 'TESTE-API');
  localStorage.setItem('diman_equipment', JSON.stringify(eq));
} catch (e) {}

// Initial rendering function
function renderShell(session) {
  const perms = session.permissions || {};
  document.body.innerHTML = '';
  document.body.style.overflow = '';

  const navItems = [
    { route:'home',       label:'Início',                icon:'home',           perm:'dashboard',   section:'MENU PRINCIPAL' },
    { route:'d-panel',    label:'D-1 | D | D+1',       icon:'calendar-days',  perm:'dashboard',   section:'OPERACIONAL' },
    { route:'dashboard',  label:'Dashboard',             icon:'squares-2x2',    perm:'dashboard',   section:'' },
    { route:'workshop',   label:'Controle de Oficina',  icon:'building-office', perm:'workshop',   section:'' },
    { route:'waiting',    label:'Aguardando Manutenção', icon:'clock',          perm:'dashboard',   section:'' },
    { route:'equipment',  label:'Equipamentos',          icon:'wrench-screwdriver', perm:'equipment', section:'PLANEJAMENTO' },
    { route:'released',   label:'Equip. Liberados',      icon:'check-circle',   perm:'dashboard',   section:'' },
    { route:'tasks',      label:'Tarefas',               icon:'clipboard-list', perm:'tasks',       section:'' },
    { route:'gantt',      label:'Cronograma Gantt',      icon:'chart-bar',      perm:'gantt',       section:'' },
    { route:'critical',   label:'Caminho Crítico',       icon:'exclamation-triangle', perm:'criticalPath', section:'' },
    { route:'planning',   label:'Planejamento',          icon:'calendar',       perm:'planning',    section:'' },
    { route:'checklists', label:'Check-lists (Anexos)',  icon:'document-report',perm:'dashboard',   section:'DOCUMENTAÇÃO' },
    { route:'restrictions', label:'Restrições',          icon:'no-symbol',      perm:'restrictions', section:'RECURSOS' },
    { route:'parts',      label:'Peças',                 icon:'cube',           perm:'parts',       section:'' },
    { route:'workforce',  label:'Mão de Obra',           icon:'users',          perm:'workforce',   section:'' },
    { route:'costs',      label:'Centro de Custos',      icon:'currency-dollar', perm:'costs',      section:'' },
    { route:'kpi',        label:'Indicadores KPI',       icon:'chart-pie',      perm:'kpi',         section:'ANÁLISE' },
    { route:'timeline',   label:'Timeline',              icon:'clock',          perm:'timeline',    section:'' },
    { route:'impacts',    label:'Relatório de Impactos', icon:'document-report', perm:'impacts',    section:'' },
    { route:'simulator',  label:'Simulador',             icon:'variable',       perm:'simulator',   section:'' },
    { route:'qr-generator', label:'Gerador QR Code',     icon:'qr-code',        perm:'dashboard',   section:'ADMINISTRAÇÃO' },
    { route:'ai',         label:'Assistente IA',         icon:'sparkles',       perm:'ai',          section:'INTELIGÊNCIA' },
    { route:'lessons',    label:'Lições Aprendidas',     icon:'light-bulb',     perm:'lessons',     section:'' },
    { route:'reports',    label:'Relatórios',            icon:'document-chart-bar', perm:'reports', section:'GESTÃO' },
    { route:'audit',      label:'Auditoria',             icon:'shield-check',   perm:'audit',       section:'' },
    { route:'users',      label:'Usuários',              icon:'user-group',     perm:'users',       section:'' },
  ];

  const svgIcons = {
    'home': '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.592 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>',
    'check-circle': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
    'calendar-days': '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"/>',
    'squares-2x2': '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>',
    'building-office': '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>',
    'wrench-screwdriver': '<path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>',
    'clipboard-list': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
    'chart-bar': '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>',
    'exclamation-triangle': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>',
    'calendar': '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>',
    'no-symbol': '<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>',
    'cube': '<path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>',
    'users': '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>',
    'currency-dollar': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    'chart-pie': '<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"/>',
    'clock': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    'document-report': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
    'variable': '<path stroke-linecap="round" stroke-linejoin="round" d="M4.745 3A23.933 23.933 0 003 12c0 3.183.62 6.22 1.745 9M19.255 3A23.933 23.933 0 0121 12c0 3.183-.62 6.22-1.745 9M8.25 8.885l1.444-.89a.75.75 0 011.105.402l2.402 7.214a.75.75 0 001.104.401l1.445-.889m-8.25.75l.213.09a1.687 1.687 0 002.062-.617l4.45-6.676a1.688 1.688 0 012.062-.618l.213.09"/>',
    'sparkles': '<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>',
    'light-bulb': '<path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>',
    'document-chart-bar': '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>',
    'shield-check': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>',
    'user-group': '<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>',
  };

  function icon(name) {
    const p = svgIcons[name] || '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>';
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">${p}</svg>`;
  }

  function buildNav() {
    let html = '';
    let lastSection = '';
    navItems.forEach(item => {
      if (!Auth.hasPermission(item.perm)) return;
      if (item.section && item.section !== lastSection) {
        html += `<div class="sidebar-section-label">${item.section}</div>`;
        lastSection = item.section;
      }
      const badge = item.route === 'restrictions' ?
        `<span class="nav-badge" id="nav-badge-restrictions">${(DB && DB.restrictions ? DB.restrictions.getAll().filter(r=>r.status==='Aberta').length : 0) || ''}</span>` : '';
      html += `<div class="nav-item" data-route="${item.route}" onclick="window.Router.navigate('${item.route}')">
        <span class="nav-icon">${icon(item.icon)}</span>
        <span class="nav-label">${item.label}</span>
        ${badge}
      </div>`;
    });
    return html;
  }

  document.body.innerHTML = `
    <div id="app" style="display:flex;height:100vh;overflow:hidden;">
      
      <!-- Sidebar -->
      <aside id="sidebar" class="collapsed">
        <div class="sidebar-brand" style="justify-content:space-between;align-items:center;padding-right:var(--space-4);">
          <div style="display:flex;align-items:center;">
            <div class="sidebar-logo">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75"/></svg>
            </div>
            <div class="sidebar-brand-text" style="margin-left:12px;">
              <div class="sidebar-brand-name">DIMAN-BHZ</div>
              <div class="sidebar-brand-sub">Menu Principal</div>
            </div>
          </div>
          <div onclick="toggleSidebar()" style="cursor:pointer;color:rgba(255,255,255,0.4);display:flex;align-items:center;transition:color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.4)'" title="Recolher Menu Lateral">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </div>
        </div>
        <div class="sidebar-nav">${buildNav()}</div>
        <div class="sidebar-section-label" style="margin-top:auto;">DEV</div>
        <div class="nav-item" onclick="gerarDadosDeTeste()" style="color:var(--brand-primary-light);">
          <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
          <span class="nav-label">Gerar Testes</span>
        </div>
      </aside>

      <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
        <!-- Topbar -->
        <header id="topbar" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-6);background:var(--bg-card);border-bottom:1px solid var(--border-card);">
          <div style="display:flex;align-items:center;gap:var(--space-4);">
            <div style="width:40px;height:40px;background:var(--gradient-primary);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;cursor:pointer;box-shadow:var(--shadow-sm);transition:transform 0.2s;" onclick="toggleSidebar()" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Abrir/Fechar Menu Lateral">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75"/></svg>
            </div>
            <div>
              <div style="font-weight:900;font-size:1.2rem;letter-spacing:-0.03em;line-height:1;">DIMAN-BHZ</div>
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Planejamento Operacional</div>
            </div>
            
            <div style="width:1px;height:24px;background:var(--border-card);margin:0 var(--space-2);"></div>
            
            <button class="btn btn-primary btn-sm" onclick="window.Router.navigate('home')" title="Página Inicial" style="display:flex;align-items:center;gap:6px;padding:var(--space-2) var(--space-3);border-radius:var(--radius-full);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
              Início
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.DB.forceSyncAll()" title="Forçar envio de dados locais para a nuvem" style="display:flex;align-items:center;gap:6px;padding:var(--space-2) var(--space-3);border-radius:var(--radius-full);color:var(--brand-primary-light);border-color:var(--brand-primary-light);margin-left:var(--space-2);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              Sincronizar Nuvem
            </button>

            <!-- Global Equipment Filter -->
            <div style="margin-left:var(--space-4); display:flex; align-items:center;">
              <select id="global-eq-select" class="form-control" style="width:250px; border-radius:var(--radius-full); background:var(--bg-base); border:1px solid var(--border-card); font-size:var(--text-sm);" onchange="window.setGlobalEqFilter(this.value)">
                <option value="">Filtro Global: Todos Equipamentos</option>
                ${DB.equipment.list().filter(e => e.status !== 'Liberado').map(e => `<option value="${e.id}">${e.codigo} - ${(e.nome || 'Sem Nome').split(' ').slice(0,2).join(' ')}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div class="topbar-actions" style="display:flex;align-items:center;gap:var(--space-3);">
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-right:var(--space-4);padding-right:var(--space-4);border-right:1px solid var(--border-card);">
              <div class="avatar avatar-sm">${avatarInitials(session.nome)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-secondary);">${session.nome.split(' ')[0]}</div>
            </div>
            <button class="theme-btn" onclick="toggleTheme()" title="Alternar tema">
              <svg id="theme-icon-app" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="window.Auth.logout();location.reload();" title="Sair">
              Sair
            </button>
          </div>
        </header>

        <!-- Main Content -->
        <main id="main" style="flex:1;overflow-y:auto;background:var(--bg-base);margin:0;border:none;">
          <div id="page-content" style="min-height:100%;"></div>
        </main>
      </div>
    </div>

    <!-- Toast container -->
    <div id="toast-container"></div>
  `;

  // Register all routes
  Router.register('home', () => HomeModule.render());
  Router.register('released', () => ReleasedModule.render());
  if (typeof WaitingModule !== 'undefined') Router.register('waiting', () => WaitingModule.render());
  Router.register('equipment-panel', (p) => EquipmentPanel.render(p));
  Router.register('checklists', ChecklistsModule.render);
  
  if (typeof DPanel !== 'undefined') Router.register('d-panel', () => DPanel.render());
  if (typeof EquipmentModule !== 'undefined') Router.register('equipment', () => EquipmentModule.render());
  if (typeof Dashboard !== 'undefined') Router.register('dashboard', () => Dashboard.render());
  if (typeof WorkshopModule !== 'undefined') Router.register('workshop', () => WorkshopModule.render());
  if (typeof TasksModule !== 'undefined') Router.register('tasks', () => TasksModule.render());
  if (typeof GanttModule !== 'undefined') Router.register('gantt', () => GanttModule.render());
  if (typeof CriticalPath !== 'undefined') Router.register('critical', () => CriticalPath.render());
  if (typeof PlanningModule !== 'undefined') Router.register('planning', () => PlanningModule.render());
  if (typeof RestrictionsModule !== 'undefined') Router.register('restrictions', () => RestrictionsModule.render());
  if (typeof PartsModule !== 'undefined') Router.register('parts', () => PartsModule.render());
  if (typeof WorkforceModule !== 'undefined') Router.register('workforce', () => WorkforceModule.render());
  if (typeof CostsModule !== 'undefined') Router.register('costs', () => CostsModule.render());
  if (typeof KPIModule !== 'undefined') Router.register('kpi', () => KPIModule.render());
  if (typeof TimelineModule !== 'undefined') Router.register('timeline', () => TimelineModule.render());
  if (typeof ImpactsModule !== 'undefined') Router.register('impacts', () => ImpactsModule.render());
  if (typeof SimulatorModule !== 'undefined') Router.register('simulator', () => SimulatorModule.render());
  if (typeof QrGeneratorModule !== 'undefined') Router.register('qr-generator', () => QrGeneratorModule.render());
  if (typeof QrViewModule !== 'undefined') Router.register('qrview', () => QrViewModule.render());
  if (typeof AIAssistant !== 'undefined') Router.register('ai', () => AIAssistant.render());
  if (typeof LessonsModule !== 'undefined') Router.register('lessons', () => LessonsModule.render());
  if (typeof ReportsModule !== 'undefined') Router.register('reports', () => ReportsModule.render());
  if (typeof AuditModule !== 'undefined') Router.register('audit', () => AuditModule.render());
  if (typeof UsersModule !== 'undefined') Router.register('users', () => UsersModule.render());
}

// ================================================================
// GLOBAL HELPERS
// ================================================================

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
}
function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.getElementById('mobile-overlay')?.classList.add('visible');
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('mobile-overlay')?.classList.remove('visible');
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.dataset.theme !== 'light';
  html.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('diman_theme', html.dataset.theme);
  // update theme icon
  ['theme-icon-login','theme-icon-app'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = isDark
      ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>'
      : '<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>';
  });
}

function showUserMenu() {
  const session = Auth.getSession();
  if (!session) return;
  confirmDialog(
    `${session.nome}`,
    `Matrícula: ${session.matricula} | Perfil: ${session.perfil}<br><br>Deseja sair do sistema?`,
    () => { Auth.logout(); location.reload(); },
    false
  );
}

// ================================================================
// PUBLIC QR VIEW (no login)
// ================================================================
function renderPublicQrView(eqId) {
  document.body.innerHTML = '';
  document.body.style.background = '#0f172a';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.fontFamily = "'Inter', sans-serif";
  const container = document.createElement('div');
  container.id = 'page-content';
  document.body.appendChild(container);
  if (typeof QrViewModule !== 'undefined') {
    const html = QrViewModule.render({ id: eqId });
    container.innerHTML = html;
  } else {
    container.innerHTML = '<div style="color:red;padding:20px;text-align:center">Erro ao carregar módulo QR.</div>';
  }
}

// ================================================================
// INIT
// ================================================================

window.gerarDadosDeTeste = function() {
  if (!window.DB) return alert('DB não carregado');
  const eq1 = window.DB.equipment.create({ nome: 'Caminhão Fora de Estrada 01', codigo: 'CAM-001', familia: 'Caminhões', status: 'Em Manutenção', area: 'Mina 1' });
  const eq2 = window.DB.equipment.create({ nome: 'Escavadeira Hidráulica 02', codigo: 'ESC-002', familia: 'Escavadeiras', status: 'Em Manutenção', area: 'Mina 2' });
  
  window.DB.tasks.create({ equipmentId: eq1.id, descricao: 'Troca de Óleo do Motor', disciplina: 'Mecânica', horasPlanejadas: 2, status: 'Concluída', pctExecutado: 100, critico: false });
  window.DB.tasks.create({ equipmentId: eq1.id, descricao: 'Revisão dos Freios', disciplina: 'Mecânica', horasPlanejadas: 4, status: 'Em Andamento', pctExecutado: 50, critico: true });
  window.DB.tasks.create({ equipmentId: eq2.id, descricao: 'Substituição de Mangueira Hidráulica', disciplina: 'Mecânica', horasPlanejadas: 1.5, status: 'Não Iniciada', pctExecutado: 0, critico: true });
  
  window.DB.restrictions.create({ equipmentId: eq1.id, descricao: 'Aguardando liberação de área', impacto: 'Alto' });
  
  window.DB.parts.create({ equipmentId: eq2.id, descricao: 'Mangueira de Alta Pressão 3/4', pn: 'PN-98765', qtd: 2, status: 'Solicitada' });
  
  alert('Dados de teste gerados com sucesso! A página será recarregada.');
  location.reload();
};

document.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme
  const savedTheme = localStorage.getItem('diman_theme') || 'light';
  document.documentElement.dataset.theme = savedTheme;

  await initApp();
});

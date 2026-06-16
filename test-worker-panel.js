const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost" });

dom.window.onerror = function(msg, src, ln, col, err) {
  console.log("CAUGHT ERROR:", msg, err);
};

// Mock Auth and DB
dom.window.Auth = {
  getSession: () => ({ nome: 'Teste', disciplina: 'Geral', matricula: '123' })
};

dom.window.DB = {
  equipment: { list: () => [{id: 'eq1', codigo: 'EQ1', nome: 'Eq1'}], get: () => ({id: 'eq1', codigo: 'EQ1', nome: 'Eq1'}) },
  workforce: { list: () => [{matricula: '123', nome: 'Teste', equipmentId: 'eq1'}] },
  tasks: { create: () => {}, list: () => [], getAll: () => [] },
  now: () => new Date().toISOString()
};
dom.window.Toast = { success: console.log, error: console.log };
dom.window.closeModal = () => {};
dom.window.openModal = () => {};
dom.window.Router = { navigate: () => {} };

setTimeout(() => {
  try {
    const code = fs.readFileSync('js/modules/worker-panel.js', 'utf8');
    dom.window.eval(code);
    console.log("WorkerPanel loaded!");
    
    // Simulate openCreateTask
    dom.window.WorkerPanel.openCreateTask();
    console.log("openCreateTask ran successfully!");
    
    // Simulate form fill
    dom.window.document.body.innerHTML += `<div id="worker-panel-modals"><div id="modal-worker-new-task"></div></div>`;
    dom.window.WorkerPanel.openCreateTask();
    
    dom.window.document.getElementById('w-new-desc').value = "Test";
    dom.window.document.getElementById('w-new-eq').value = "eq1";
    dom.window.document.getElementById('w-new-prio').value = "Média";
    dom.window.document.getElementById('w-new-status').value = "Não Iniciada";
    dom.window.document.getElementById('w-new-ip').value = "2026-06-16";
    dom.window.document.getElementById('w-new-tp').value = "2026-06-16";
    dom.window.document.getElementById('w-new-hp').value = "0";
    dom.window.document.getElementById('w-new-critico').checked = false;
    dom.window.document.getElementById('w-new-obs').value = "Obs";
    
    // Simulate saveNewTask
    dom.window.WorkerPanel.saveNewTask();
    console.log("saveNewTask ran successfully!");
    
  } catch (e) {
    console.log("ERROR RUNNING TEST:", e);
  }
}, 1000);

const SUPABASE_URL = 'https://umsozbjpfmxvhwycjjkr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NGJvPtMUdiDGCnK5qRroYg_7_wPqZiH';

async function run() {
  // Fetch equipments
  const res = await fetch(`${SUPABASE_URL}/rest/v1/diman_store?collection=eq.diman_equipment`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  const data = await res.json();
  let equipment = null;
  
  // Since we migrated to row-based, data could be individual rows or 'all'
  for (const row of data) {
    if (row.key === 'all') {
      const eq = row.data.find(e => e.nome === 'SSH 567' || e.tag === 'SSH 567');
      if (eq) equipment = eq;
    } else {
      if (row.data.nome === 'SSH 567' || row.data.tag === 'SSH 567') equipment = row.data;
    }
  }

  if (!equipment) {
    console.error('Equipment SSH 567 not found!');
    process.exit(1);
  }
  
  console.log('Found equipment:', equipment.id, equipment.nome);

  const tasksList = [
    "Instalar guincho wireline",
    "Instalar radiador hidráulico",
    "Instalar motor diesel",
    "Montar mangueiras do reservatório de água do motor diesel",
    "Instalar tanque diesel",
    "Instalar radiador hidráulico",
    "Instalar estrutura dos comandos",
    "Instalar comandos",
    "Instalar estrutura dos manômetros",
    "Instalar manômetros",
    "Montar morsa",
    "Intalar morsa",
    "Furar torre para Instalar calha de inox",
    "Instalar cilindro de avanço",
    "Instalar mesa do mandril",
    "Instalar mandril",
    "Instalar motor de rotação",
    "Instalar calha do cilindro de avanço",
    "Instalar torre",
    "Fabricar todas mangueiras",
    "Instalar estrutura do tanque hidráulico",
    "Instalar tanque hidráulico",
    "Instalar bombas hidráulicas",
    "Montar bomba de lama",
    "Testar bomba de lama",
    "Instalar bomba de lama",
    "Instalar bloco da esteira",
    "Fabricar e instalar mangueiras da esteira",
    "Instalar patolas"
  ];

  const upsertPayload = tasksList.map(desc => {
    const id = `tk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const task = {
      id,
      equipmentId: equipment.id,
      disciplina: 'Mecânica',
      descricao: desc,
      status: 'Não Iniciada',
      pctExecutado: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { collection: 'diman_tasks', key: id, data: task, updated_at: new Date().toISOString() };
  });

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/diman_store`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(upsertPayload)
  });

  if (!insertRes.ok) {
    console.error('Failed to insert tasks:', await insertRes.text());
    process.exit(1);
  }

  console.log(`Successfully inserted ${tasksList.length} tasks!`);
}

run();

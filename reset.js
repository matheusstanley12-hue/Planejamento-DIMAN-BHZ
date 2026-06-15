const fs = require('fs');

const SUPABASE_URL = 'https://umsozbjpfmxvhwycjjkr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NGJvPtMUdiDGCnK5qRroYg_7_wPqZiH';

const https = require('https');

function req(urlStr, options) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const request = https.request(reqOptions, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (res.statusCode === 204) return resolve(null);
          try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        } else {
          reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
        }
      });
    });

    request.on('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

async function resetDB() {
  try {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    console.log("Fetching diman_workforce...");
    let wfRes = await req(`${SUPABASE_URL}/rest/v1/diman_store?collection=eq.diman_workforce`, { headers });
    if (wfRes && wfRes.length > 0) {
      let wfData = wfRes[0].data;
      wfData = wfData.map(w => ({
        ...w,
        currentState: 'Ocioso',
        currentTaskId: null,
        currentActionStartTime: null,
        currentPauseReason: null
      }));
      await req(`${SUPABASE_URL}/rest/v1/diman_store?collection=eq.diman_workforce&key=eq.all`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ data: wfData })
      });
      console.log("Workforce reset.");
    }

    console.log("Fetching diman_tasks...");
    let tkRes = await req(`${SUPABASE_URL}/rest/v1/diman_store?collection=eq.diman_tasks`, { headers });
    if (tkRes && tkRes.length > 0) {
      let tkData = tkRes[0].data;
      tkData = tkData.map(t => ({
        ...t,
        horasRealizadas: 0,
        pctExecutado: 0,
        status: (t.status === 'Em Andamento' || t.status === 'Concluída' || t.status === 'Em Execução') ? 'Aguardando Recurso' : t.status
      }));
      await req(`${SUPABASE_URL}/rest/v1/diman_store?collection=eq.diman_tasks&key=eq.all`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ data: tkData })
      });
      console.log("Tasks reset.");
    }

    console.log("Clearing diman_timesheets...");
    // Just overwrite it entirely
    await req(`${SUPABASE_URL}/rest/v1/diman_store?collection=eq.diman_timesheets&key=eq.all`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ data: [] })
    });
    console.log("Timesheets cleared.");

    console.log("DONE");
  } catch (e) {
    console.error("Error:", e.message);
  }
}

resetDB();

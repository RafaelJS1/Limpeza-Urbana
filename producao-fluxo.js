(()=>{
  const statusLabel=s=>s==='andamento'?'Em andamento':'Concluído';
  const statusBadge=s=>s==='andamento'?'<span class="badge unlinked">Em andamento</span>':'<span class="badge ok">Concluído</span>';
  const labelPeriodo=p=>({matutino:'Matutino',vespertino:'Vespertino',integral:'Integral'})[p]||'Integral';

  function ensureStyle(){
    if(document.getElementById('producao-fluxo-style')) return;
    const s=document.createElement('style');
    s.id='producao-fluxo-style';
    s.textContent=`
      .workflow-note{background:#eef8f3;border:1px solid #cce9d9;border-radius:9px;padding:11px 13px;font-size:12px;color:#315f4b;margin-bottom:12px}
      .btn-warning{background:#fff4df;color:#9a6500;border:1px solid #f3d59e}
      .prod-actions{display:flex;gap:6px;flex-wrap:wrap}
      .prod-status-cards{margin-bottom:14px}
    `;
    document.head.appendChild(s);
  }

  function formPayload(status){
    const viagens=status==='andamento'?0:Number(document.getElementById('rviagens')?.value||0);
    const capacidade=Number(document.getElementById('rcap')?.value||0);
    return {
      data:document.getElementById('rdata').value,
      equipe_id:document.getElementById('requipe').value,
      setor_id:document.getElementById('rsetor').value,
      periodo:document.getElementById('rperiodo')?.value||'integral',
      viagens,
      capacidade,
      material:status==='andamento'?null:(document.getElementById('rmaterial')?.value||null),
      observacoes:document.getElementById('robs')?.value||null,
      status,
      finalizado_em:status==='concluido'?new Date().toISOString():null
    };
  }

  async function saveFromDaily(status){
    const msg=document.getElementById('regmsg');
    const data=document.getElementById('rdata')?.value;
    const equipe=document.getElementById('requipe')?.value;
    const setor=document.getElementById('rsetor')?.value;
    if(!data||!equipe||!setor){msg.className='msg err full';msg.textContent='Informe data, equipe e setor.';return}
    if(status==='concluido' && Number(document.getElementById('rviagens')?.value||0)<0){msg.className='msg err full';msg.textContent='Informe a quantidade de viagens.';return}
    msg.className='msg full';msg.textContent=status==='andamento'?'Salvando pré-registro...':'Salvando registro concluído...';
    try{
      const existing=DB.registros.find(r=>r.data===data&&r.equipe_id===equipe&&(r.status||'concluido')==='andamento');
      const payload=formPayload(status);
      if(existing){
        await req('/rest/v1/registros?id=eq.'+existing.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
        msg.textContent=status==='andamento'?'Pré-registro atualizado.':'Registro finalizado com sucesso.';
      }else{
        await req('/rest/v1/registros',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
        msg.textContent=status==='andamento'?'Pré-registro salvo. A produção pode ser finalizada à tarde.':'Registro concluído salvo.';
      }
      msg.className='msg oktxt full';
      await (window.load||load)();
      renderProductionFlow();
    }catch(e){msg.className='msg err full';msg.textContent=e.message}
  }

  function setupDailyForm(){
    ensureStyle();
    const form=document.getElementById('regForm'); if(!form||document.getElementById('preRegistroBtn')) return;
    const viagens=document.getElementById('rviagens'); if(viagens) viagens.required=false;
    const actions=form.querySelector('.actions'); if(!actions) return;
    const oldSubmit=actions.querySelector('button[type="submit"],button:not([type])');
    if(oldSubmit) oldSubmit.style.display='none';
    const note=document.createElement('div'); note.className='workflow-note full'; note.innerHTML='<b>Fluxo diário:</b> pela manhã salve como pré-registro informando equipe e setor. À tarde, finalize pela aba Produção com a quantidade de viagens.';
    actions.before(note);
    const pre=document.createElement('button'); pre.type='button'; pre.id='preRegistroBtn'; pre.className='btn btn-warning'; pre.textContent='🕘 Salvar pré-registro'; pre.onclick=()=>saveFromDaily('andamento');
    const fin=document.createElement('button'); fin.type='button'; fin.className='btn primary'; fin.textContent='✓ Salvar como concluído'; fin.onclick=()=>saveFromDaily('concluido');
    actions.append(pre,fin);
  }

  function openFinalize(id){
    const r=DB.registros.find(x=>x.id===id); if(!r) return;
    modal('Finalizar produção',`
      <div class="modalfull hint"><b>${esc(eq(r.equipe_id)?.nome||'-')}</b> — ${esc(st(r.setor_id)?.nome||'-')}<br>${r.data} • ${labelPeriodo(r.periodo)}</div>
      <label>Nº de viagens<input name="viagens" type="number" min="0" required value="${Number(r.viagens||0)}"></label>
      <label>Capacidade por viagem (m³)<input name="capacidade" type="number" min="0" step=".1" required value="${Number(r.capacidade||13)}"></label>
      <label class="modalfull">Material<select name="material"><option ${r.material==='Entulho de construção'?'selected':''}>Entulho de construção</option><option ${r.material==='Madeira'?'selected':''}>Madeira</option><option ${r.material==='Móveis'?'selected':''}>Móveis</option><option ${r.material==='Pallets'?'selected':''}>Pallets</option><option ${r.material==='Resíduos diversos'?'selected':''}>Resíduos diversos</option><option ${r.material==='Outros'?'selected':''}>Outros</option></select></label>
      <label class="modalfull">Observações<input name="observacoes" value="${esc(r.observacoes||'')}"></label>`,
      async fd=>{
        await req('/rest/v1/registros?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({
          viagens:+fd.get('viagens'),capacidade:+fd.get('capacidade'),material:fd.get('material'),observacoes:fd.get('observacoes').trim()||null,status:'concluido',finalizado_em:new Date().toISOString()
        })});
      });
  }
  window.openFinalizeProducao=openFinalize;

  function openEdit(id){
    const r=DB.registros.find(x=>x.id===id); if(!r) return;
    modal('Editar produção',`
      <label>Data<input name="data" type="date" required value="${r.data}"></label>
      <label>Período<select name="periodo"><option value="matutino" ${r.periodo==='matutino'?'selected':''}>Matutino</option><option value="vespertino" ${r.periodo==='vespertino'?'selected':''}>Vespertino</option><option value="integral" ${(!r.periodo||r.periodo==='integral')?'selected':''}>Integral</option></select></label>
      <label class="modalfull">Setor<select name="setor_id">${DB.setores.filter(s=>s.equipe_id===r.equipe_id&&s.ativo).map(s=>`<option value="${s.id}" ${s.id===r.setor_id?'selected':''}>${esc(s.nome)}</option>`).join('')}</select></label>
      <label>Viagens<input name="viagens" type="number" min="0" value="${Number(r.viagens||0)}"></label>
      <label>Capacidade (m³)<input name="capacidade" type="number" min="0" step=".1" value="${Number(r.capacidade||13)}"></label>
      <label class="modalfull">Observações<input name="observacoes" value="${esc(r.observacoes||'')}"></label>`,
      async fd=>{
        await req('/rest/v1/registros?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({data:fd.get('data'),periodo:fd.get('periodo'),setor_id:fd.get('setor_id'),viagens:+fd.get('viagens'),capacidade:+fd.get('capacidade'),observacoes:fd.get('observacoes').trim()||null})});
      });
  }
  window.openEditProducao=openEdit;

  function renderProductionFlow(){
    if(typeof DB==='undefined'||!document.getElementById('allRegs')) return;
    const regs=DB.registros.slice().sort((a,b)=>(b.data||'').localeCompare(a.data||'') || String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const andamento=regs.filter(r=>(r.status||'concluido')==='andamento');
    const concluidos=regs.filter(r=>(r.status||'concluido')==='concluido');
    const totalV=concluidos.reduce((a,r)=>a+Number(r.viagens||0),0), totalM=concluidos.reduce((a,r)=>a+Number(r.volume||0),0);
    document.getElementById('productionCards').innerHTML=[['Em andamento',andamento.length],['Concluídos',concluidos.length],['Viagens concluídas',totalV],['Volume concluído',fmt(totalM)+' m³']].map((x,i)=>`<div class="card"><div class="label ${i===0?'orange':'green'}">${x[0]}</div><div class="num ${i===0?'orange':'green'}">${x[1]}</div></div>`).join('');
    const table=document.getElementById('allRegs').closest('table');
    table.querySelector('thead tr').innerHTML='<th>Data</th><th>Equipe</th><th>Período</th><th>Setor</th><th>Viagens</th><th>Volume</th><th>Status</th><th>Ações</th>';
    document.getElementById('allRegs').innerHTML=regs.map(r=>`<tr><td>${r.data}</td><td><b>${esc(eq(r.equipe_id)?.nome||'-')}</b></td><td>${labelPeriodo(r.periodo)}</td><td>${esc(st(r.setor_id)?.nome||'-')}</td><td>${Number(r.viagens||0)}</td><td>${fmt(r.volume||0)} m³</td><td>${statusBadge(r.status||'concluido')}</td><td><div class="prod-actions">${(r.status||'concluido')==='andamento'?`<button class="btn primary" style="padding:7px 9px" onclick="openFinalizeProducao('${r.id}')">✓ Finalizar</button>`:''}<button class="actionbtn" onclick="openEditProducao('${r.id}')">✏️ Editar</button>${window.openRegistroDetalhes?`<button class="actionbtn" onclick="openRegistroDetalhes('${r.id}')">👁 Detalhes</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="8">Nenhum registro.</td></tr>';
  }
  window.renderProductionFlow=renderProductionFlow;

  const originalLoad=window.load||load;
  const wrappedLoad=async()=>{const out=await originalLoad();renderProductionFlow();return out};
  try{load=wrappedLoad}catch{}
  window.load=wrappedLoad;

  window.addEventListener('DOMContentLoaded',()=>{setupDailyForm();setTimeout(renderProductionFlow,400)});
  document.querySelector('[data-page="producao"]')?.addEventListener('click',()=>setTimeout(renderProductionFlow,50));
})();
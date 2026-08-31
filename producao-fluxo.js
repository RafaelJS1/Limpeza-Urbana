(()=>{
  const statusLabel=s=>s==='andamento'?'Em andamento':s==='parada'?'Parada':'Concluído';
  const statusBadge=s=>s==='andamento'?'<span class="badge unlinked">Em andamento</span>':s==='parada'?'<span class="badge" style="background:#fff0e6;color:#b45309">Parada</span>':'<span class="badge ok">Concluído</span>';
  const labelPeriodo=p=>({matutino:'Matutino',vespertino:'Vespertino',integral:'Integral'})[p]||'Integral';
  const motivoLabel=m=>({manutencao_equipamento:'Manutenção de equipamento',falta_caminhao:'Falta de caminhão',falta_pa:'Falta de pá carregadeira',chuva:'Chuva',falta_pessoal:'Falta de pessoal',outro:'Outro motivo'})[m]||m||'-';

  function ensureStyle(){
    if(document.getElementById('producao-fluxo-style')) return;
    const s=document.createElement('style');
    s.id='producao-fluxo-style';
    s.textContent=`
      .workflow-note{background:#eef8f3;border:1px solid #cce9d9;border-radius:9px;padding:11px 13px;font-size:12px;color:#315f4b;margin-bottom:12px}
      .btn-warning{background:#fff4df;color:#9a6500;border:1px solid #f3d59e}
      .btn-stop{background:#fff0e6;color:#a94300;border:1px solid #f6c79f}
      .prod-actions{display:flex;gap:6px;flex-wrap:wrap}
      .prod-status-cards{margin-bottom:14px}
      .stop-box{border:1px solid #f5c79c;background:#fff8f1;border-radius:9px;padding:12px;display:none}
      .stop-box.show{display:grid}
    `;
    document.head.appendChild(s);
  }

  function formPayload(status){
    const parada=status==='parada';
    const viagens=status==='andamento'||parada?0:Number(document.getElementById('rviagens')?.value||0);
    const capacidade=parada?0:Number(document.getElementById('rcap')?.value||0);
    return {
      data:document.getElementById('rdata').value,
      equipe_id:document.getElementById('requipe').value,
      setor_id:document.getElementById('rsetor')?.value||null,
      periodo:document.getElementById('rperiodo')?.value||'integral',
      viagens,
      capacidade,
      material:status==='andamento'||parada?null:(document.getElementById('rmaterial')?.value||null),
      observacoes:document.getElementById('robs')?.value||null,
      status,
      veiculo_id:parada?(document.getElementById('rveiculoParada')?.value||null):null,
      motivo_parada:parada?(document.getElementById('rmotivoParada')?.value||null):null,
      finalizado_em:status==='concluido'||parada?new Date().toISOString():null
    };
  }

  async function saveFromDaily(status){
    const msg=document.getElementById('regmsg');
    const data=document.getElementById('rdata')?.value;
    const equipe=document.getElementById('requipe')?.value;
    const setor=document.getElementById('rsetor')?.value;
    const parada=status==='parada';
    if(!data||!equipe||(!parada&&!setor)){msg.className='msg err full';msg.textContent=parada?'Informe data e equipe.':'Informe data, equipe e setor.';return}
    if(parada&&!document.getElementById('rmotivoParada')?.value){msg.className='msg err full';msg.textContent='Informe o motivo da paralisação.';return}
    msg.className='msg full';msg.textContent=parada?'Registrando equipe parada...':status==='andamento'?'Salvando pré-registro...':'Salvando registro concluído...';
    try{
      const existing=DB.registros.find(r=>r.data===data&&r.equipe_id===equipe&&(r.status||'concluido')==='andamento');
      const payload=formPayload(status);
      if(existing){
        await req('/rest/v1/registros?id=eq.'+existing.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
        msg.textContent=parada?'Paralisação registrada com sucesso.':status==='andamento'?'Pré-registro atualizado.':'Registro finalizado com sucesso.';
      }else{
        await req('/rest/v1/registros',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
        msg.textContent=parada?'Equipe registrada como parada.':status==='andamento'?'Pré-registro salvo. A produção pode ser finalizada à tarde.':'Registro concluído salvo.';
      }
      msg.className='msg oktxt full';
      await (window.load||load)();
      renderProductionFlow();
    }catch(e){msg.className='msg err full';msg.textContent=e.message}
  }

  function updateStopEquipment(){
    const team=document.getElementById('requipe')?.value;
    const sel=document.getElementById('rveiculoParada');
    if(!sel)return;
    const list=(DB.veiculos||[]).filter(v=>!team||v.equipe_id===team);
    sel.innerHTML='<option value="">Nenhum / não informado</option>'+list.map(v=>`<option value="${v.id}">${esc(v.codigo)} — ${esc(v.tipo)}</option>`).join('');
  }

  function setupDailyForm(){
    ensureStyle();
    const form=document.getElementById('regForm'); if(!form||document.getElementById('preRegistroBtn')) return;
    const viagens=document.getElementById('rviagens'); if(viagens) viagens.required=false;
    const equipe=document.getElementById('requipe');
    const setorLabel=document.getElementById('rsetor')?.closest('label');
    if(equipe&&!document.getElementById('rsituacao')){
      const situ=document.createElement('label');
      situ.innerHTML='Situação da equipe<select id="rsituacao"><option value="operacao">Em operação</option><option value="parada">Equipe parada</option></select>';
      equipe.closest('label')?.after(situ);
      const stop=document.createElement('div'); stop.id='stopBox'; stop.className='stop-box full';
      stop.innerHTML='<label>Motivo da parada<select id="rmotivoParada"><option value="">Selecione...</option><option value="manutencao_equipamento">Manutenção de equipamento</option><option value="falta_caminhao">Falta de caminhão</option><option value="falta_pa">Falta de pá carregadeira</option><option value="chuva">Chuva</option><option value="falta_pessoal">Falta de pessoal</option><option value="outro">Outro motivo</option></select></label><label>Equipamento relacionado<select id="rveiculoParada"><option value="">Nenhum / não informado</option></select></label><div class="hint full">Ao registrar a equipe parada, viagens e volume ficam zerados. O setor passa a ser opcional.</div>';
      setorLabel?.before(stop);
      const situSel=stop.previousElementSibling?.querySelector?.('#rsituacao')||document.getElementById('rsituacao');
      const toggle=()=>{const parada=document.getElementById('rsituacao')?.value==='parada';stop.classList.toggle('show',parada);const set=document.getElementById('rsetor');if(set)set.required=!parada;document.getElementById('rviagens')?.toggleAttribute('disabled',parada);document.getElementById('rcap')?.toggleAttribute('disabled',parada);document.getElementById('rmaterial')?.toggleAttribute('disabled',parada)};
      document.getElementById('rsituacao').onchange=toggle;
      equipe.addEventListener('change',updateStopEquipment);
      toggle(); updateStopEquipment();
    }
    const actions=form.querySelector('.actions'); if(!actions) return;
    const oldSubmit=actions.querySelector('button[type="submit"],button:not([type])');
    if(oldSubmit) oldSubmit.style.display='none';
    const note=document.createElement('div'); note.className='workflow-note full'; note.innerHTML='<b>Fluxo diário:</b> pela manhã salve como pré-registro. Se a equipe não puder trabalhar, selecione <b>Equipe parada</b> e informe o motivo.';
    actions.before(note);
    const pre=document.createElement('button'); pre.type='button'; pre.id='preRegistroBtn'; pre.className='btn btn-warning'; pre.textContent='🕘 Salvar pré-registro'; pre.onclick=()=>document.getElementById('rsituacao')?.value==='parada'?saveFromDaily('parada'):saveFromDaily('andamento');
    const fin=document.createElement('button'); fin.type='button'; fin.className='btn primary'; fin.textContent='✓ Salvar como concluído'; fin.onclick=()=>document.getElementById('rsituacao')?.value==='parada'?saveFromDaily('parada'):saveFromDaily('concluido');
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
          viagens:+fd.get('viagens'),capacidade:+fd.get('capacidade'),material:fd.get('material'),observacoes:fd.get('observacoes').trim()||null,status:'concluido',motivo_parada:null,finalizado_em:new Date().toISOString()
        })});
      });
  }
  window.openFinalizeProducao=openFinalize;

  function openEdit(id){
    const r=DB.registros.find(x=>x.id===id); if(!r) return;
    const stopped=(r.status||'concluido')==='parada';
    modal(stopped?'Editar paralisação':'Editar produção',`
      <label>Data<input name="data" type="date" required value="${r.data}"></label>
      <label>Período<select name="periodo"><option value="matutino" ${r.periodo==='matutino'?'selected':''}>Matutino</option><option value="vespertino" ${r.periodo==='vespertino'?'selected':''}>Vespertino</option><option value="integral" ${(!r.periodo||r.periodo==='integral')?'selected':''}>Integral</option></select></label>
      <label class="modalfull">Setor ${stopped?'(opcional)':''}<select name="setor_id"><option value="">Sem setor</option>${DB.setores.filter(s=>s.equipe_id===r.equipe_id&&s.ativo).map(s=>`<option value="${s.id}" ${s.id===r.setor_id?'selected':''}>${esc(s.nome)}</option>`).join('')}</select></label>
      ${stopped?`<label class="modalfull">Motivo da parada<select name="motivo_parada"><option value="manutencao_equipamento" ${r.motivo_parada==='manutencao_equipamento'?'selected':''}>Manutenção de equipamento</option><option value="falta_caminhao" ${r.motivo_parada==='falta_caminhao'?'selected':''}>Falta de caminhão</option><option value="falta_pa" ${r.motivo_parada==='falta_pa'?'selected':''}>Falta de pá carregadeira</option><option value="chuva" ${r.motivo_parada==='chuva'?'selected':''}>Chuva</option><option value="falta_pessoal" ${r.motivo_parada==='falta_pessoal'?'selected':''}>Falta de pessoal</option><option value="outro" ${r.motivo_parada==='outro'?'selected':''}>Outro motivo</option></select></label>`:`<label>Viagens<input name="viagens" type="number" min="0" value="${Number(r.viagens||0)}"></label><label>Capacidade (m³)<input name="capacidade" type="number" min="0" step=".1" value="${Number(r.capacidade||13)}"></label>`}
      <label class="modalfull">Observações<input name="observacoes" value="${esc(r.observacoes||'')}"></label>`,
      async fd=>{
        const payload={data:fd.get('data'),periodo:fd.get('periodo'),setor_id:fd.get('setor_id')||null,observacoes:fd.get('observacoes').trim()||null};
        if(stopped){payload.motivo_parada=fd.get('motivo_parada');payload.viagens=0;payload.capacidade=0}else{payload.viagens=+fd.get('viagens');payload.capacidade=+fd.get('capacidade')}
        await req('/rest/v1/registros?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
      });
  }
  window.openEditProducao=openEdit;

  function renderProductionFlow(){
    if(typeof DB==='undefined'||!document.getElementById('allRegs')) return;
    const regs=DB.registros.slice().sort((a,b)=>(b.data||'').localeCompare(a.data||'') || String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const andamento=regs.filter(r=>(r.status||'concluido')==='andamento');
    const paradas=regs.filter(r=>(r.status||'concluido')==='parada');
    const concluidos=regs.filter(r=>(r.status||'concluido')==='concluido');
    const totalM=concluidos.reduce((a,r)=>a+Number(r.volume||0),0);
    document.getElementById('productionCards').innerHTML=[['Em andamento',andamento.length,'orange'],['Concluídos',concluidos.length,'green'],['Paradas',paradas.length,'orange'],['Volume concluído',fmt(totalM)+' m³','green']].map(x=>`<div class="card"><div class="label ${x[2]}">${x[0]}</div><div class="num ${x[2]}">${x[1]}</div></div>`).join('');
    const table=document.getElementById('allRegs').closest('table');
    table.querySelector('thead tr').innerHTML='<th>Data</th><th>Equipe</th><th>Período</th><th>Setor</th><th>Viagens</th><th>Volume</th><th>Status</th><th>Ações</th>';
    document.getElementById('allRegs').innerHTML=regs.map(r=>`<tr><td>${r.data}</td><td><b>${esc(eq(r.equipe_id)?.nome||'-')}</b>${(r.status||'concluido')==='parada'?`<br><small style="color:#b45309">${esc(motivoLabel(r.motivo_parada))}</small>`:''}</td><td>${labelPeriodo(r.periodo)}</td><td>${esc(st(r.setor_id)?.nome||'-')}</td><td>${Number(r.viagens||0)}</td><td>${fmt(r.volume||0)} m³</td><td>${statusBadge(r.status||'concluido')}</td><td><div class="prod-actions">${(r.status||'concluido')==='andamento'?`<button class="btn primary" style="padding:7px 9px" onclick="openFinalizeProducao('${r.id}')">✓ Finalizar</button>`:''}<button class="actionbtn" onclick="openEditProducao('${r.id}')">✏️ Editar</button>${window.openRegistroDetalhes?`<button class="actionbtn" onclick="openRegistroDetalhes('${r.id}')">👁 Ver detalhes</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="8">Nenhum registro.</td></tr>';
  }
  window.renderProductionFlow=renderProductionFlow;

  const originalLoad=window.load||load;
  const wrappedLoad=async()=>{const out=await originalLoad();renderProductionFlow();return out};
  try{load=wrappedLoad}catch{}
  window.load=wrappedLoad;

  window.addEventListener('DOMContentLoaded',()=>{setupDailyForm();setTimeout(renderProductionFlow,400)});
  document.querySelector('[data-page="producao"]')?.addEventListener('click',()=>setTimeout(renderProductionFlow,50));
})();
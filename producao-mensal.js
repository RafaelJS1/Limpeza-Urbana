(()=>{
  const mesNome=d=>d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
  let referencia=new Date(); referencia=new Date(referencia.getFullYear(),referencia.getMonth(),1);

  const periodoLabel=p=>({matutino:'Matutino',vespertino:'Vespertino',integral:'Integral'})[p]||'Integral';
  const motivoLabel=m=>({manutencao_equipamento:'Manutenção de equipamento',falta_caminhao:'Falta de caminhão',falta_pa:'Falta de pá carregadeira',chuva:'Chuva',falta_pessoal:'Falta de pessoal',outro:'Outro motivo'})[m]||m||'-';
  const badge=s=>s==='andamento'?'<span class="badge unlinked">Em andamento</span>':s==='parada'?'<span class="badge" style="background:#fff0e6;color:#b45309">Parada</span>':'<span class="badge ok">Concluído</span>';

  function noMes(r){
    if(!r?.data)return false;
    const [y,m]=String(r.data).split('-').map(Number);
    return y===referencia.getFullYear()&&m===referencia.getMonth()+1;
  }
  function resumo(lista){
    return {equipes:new Set(lista.map(r=>r.equipe_id).filter(Boolean)).size,setores:new Set(lista.map(r=>r.setor_id).filter(Boolean)).size};
  }
  function subResumo(x){return `${x.equipes} ${x.equipes===1?'equipe':'equipes'} • ${x.setores} ${x.setores===1?'setor':'setores'}`}

  function render(){
    if(typeof DB==='undefined'||!Array.isArray(DB.registros))return;
    const regs=DB.registros.filter(noMes).slice().sort((a,b)=>(b.data||'').localeCompare(a.data||'')||String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const andamento=regs.filter(r=>(r.status||'concluido')==='andamento');
    const concluidos=regs.filter(r=>(r.status||'concluido')==='concluido');
    const paradas=regs.filter(r=>(r.status||'concluido')==='parada');
    const totalM=concluidos.reduce((a,r)=>a+Number(r.volume||0),0);
    const cards=document.getElementById('productionCards');
    if(cards){
      const a=resumo(andamento),c=resumo(concluidos),p=resumo(paradas);
      cards.innerHTML=[
        ['Em andamento',andamento.length,'orange',subResumo(a)],
        ['Concluídos',concluidos.length,'green',subResumo(c)],
        ['Paradas',paradas.length,'orange',subResumo(p)],
        ['Volume concluído',fmt(totalM)+' m³','green',`Somente ${mesNome(referencia)}`]
      ].map(x=>`<div class="card"><div class="label ${x[2]}">${x[0]}</div><div class="num ${x[2]}">${x[1]}</div><div class="sub">${x[3]}</div></div>`).join('');
    }
    const body=document.getElementById('allRegs');
    if(body){
      const table=body.closest('table');
      table.querySelector('thead tr').innerHTML='<th>Data</th><th>Equipe</th><th>Período</th><th>Setor</th><th>Viagens</th><th>Volume</th><th>Status</th><th>Ações</th>';
      body.innerHTML=regs.map(r=>`<tr><td>${r.data}</td><td><b>${esc(eq(r.equipe_id)?.nome||'-')}</b>${(r.status||'concluido')==='parada'?`<br><small style="color:#b45309">${esc(motivoLabel(r.motivo_parada))}</small>`:''}</td><td>${periodoLabel(r.periodo)}</td><td>${esc(st(r.setor_id)?.nome||'-')}</td><td>${Number(r.viagens||0)}</td><td>${fmt(r.volume||0)} m³</td><td>${badge(r.status||'concluido')}</td><td><div class="prod-actions">${(r.status||'concluido')==='andamento'?`<button class="btn primary" style="padding:7px 9px" onclick="openFinalizeProducao('${r.id}')">✓ Finalizar</button>`:''}<button class="actionbtn" onclick="openEditProducao('${r.id}')">✏️ Editar</button>${window.openRegistroDetalhes?`<button class="actionbtn" onclick="openRegistroDetalhes('${r.id}')">👁 Ver detalhes</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="8">Nenhum registro neste mês.</td></tr>';
    }
    const label=document.getElementById('prodMesLabel'); if(label)label.textContent=mesNome(referencia);
  }

  function setup(){
    const page=document.getElementById('producao'); if(!page||document.getElementById('prodMesNav'))return;
    const toolbar=page.querySelector('.toolbar');
    const nav=document.createElement('div'); nav.id='prodMesNav'; nav.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';
    nav.innerHTML='<button type="button" class="btn secondary" id="prodPrevMes">‹</button><span id="prodMesLabel" class="datebox"></span><button type="button" class="btn secondary" id="prodNextMes">›</button><button type="button" class="btn secondary" id="prodMesAtual">Mês atual</button>';
    toolbar?.appendChild(nav);
    document.getElementById('prodPrevMes').onclick=()=>{referencia=new Date(referencia.getFullYear(),referencia.getMonth()-1,1);render()};
    document.getElementById('prodNextMes').onclick=()=>{referencia=new Date(referencia.getFullYear(),referencia.getMonth()+1,1);render()};
    document.getElementById('prodMesAtual').onclick=()=>{const n=new Date();referencia=new Date(n.getFullYear(),n.getMonth(),1);render()};
    document.querySelector('[data-page="producao"]')?.addEventListener('click',()=>setTimeout(render,100));
    const cards=document.getElementById('productionCards'); if(cards)new MutationObserver(()=>setTimeout(render,0)).observe(cards,{childList:true});
    setTimeout(render,600);
  }
  window.renderProducaoMensal=render;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
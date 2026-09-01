(()=>{
  function resumo(lista){
    const equipes=new Set(lista.map(r=>r.equipe_id).filter(Boolean)).size;
    const setores=new Set(lista.map(r=>r.setor_id).filter(Boolean)).size;
    return {equipes,setores};
  }

  function atualizarCards(){
    const box=document.getElementById('productionCards');
    if(!box||typeof DB==='undefined'||!Array.isArray(DB.registros)) return;
    const regs=DB.registros;
    const andamento=regs.filter(r=>(r.status||'concluido')==='andamento');
    const concluidos=regs.filter(r=>(r.status||'concluido')==='concluido');
    const paradas=regs.filter(r=>(r.status||'concluido')==='parada');
    const totalM=concluidos.reduce((a,r)=>a+Number(r.volume||0),0);
    const a=resumo(andamento),c=resumo(concluidos),p=resumo(paradas);
    const cards=[
      ['Em andamento',andamento.length,'orange',`${a.equipes} ${a.equipes===1?'equipe':'equipes'} • ${a.setores} ${a.setores===1?'setor':'setores'}`],
      ['Concluídos',concluidos.length,'green',`${c.equipes} ${c.equipes===1?'equipe':'equipes'} • ${c.setores} ${c.setores===1?'setor':'setores'}`],
      ['Paradas',paradas.length,'orange',`${p.equipes} ${p.equipes===1?'equipe':'equipes'} • ${p.setores} ${p.setores===1?'setor':'setores'}`],
      ['Volume concluído',fmt(totalM)+' m³','green','Somente registros concluídos']
    ];
    box.innerHTML=cards.map(x=>`<div class="card"><div class="label ${x[2]}">${x[0]}</div><div class="num ${x[2]}">${x[1]}</div><div class="sub">${x[3]}</div></div>`).join('');
  }

  const iniciar=()=>{
    const box=document.getElementById('productionCards');
    if(!box) return;
    let ocupado=false;
    new MutationObserver(()=>{
      if(ocupado)return;
      ocupado=true;
      requestAnimationFrame(()=>{atualizarCards();ocupado=false});
    }).observe(box,{childList:true});
    document.querySelector('[data-page="producao"]')?.addEventListener('click',()=>setTimeout(atualizarCards,80));
    setTimeout(atualizarCards,500);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
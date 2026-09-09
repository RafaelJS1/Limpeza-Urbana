(()=>{
  function ensureMutiraoOption(){
    const situ=document.getElementById('rsituacao');
    if(!situ||situ.querySelector('option[value="multirao"]')) return;
    const opt=document.createElement('option'); opt.value='multirao'; opt.textContent='Mutirão'; situ.appendChild(opt);
  }

  function isMultirao(){return document.getElementById('rsituacao')?.value==='multirao'}

  function updateMutiraoFields(){
    const mutirao=isMultirao();
    const parada=document.getElementById('rsituacao')?.value==='parada';
    const setor=document.getElementById('rsetor');
    const obs=document.getElementById('robs');
    if(setor) setor.required=!(mutirao||parada);
    if(obs){
      obs.required=mutirao;
      obs.placeholder=mutirao?'Informe a região/local do mutirão e outros detalhes...':'';
    }
  }

  async function saveMutirao(status){
    const msg=document.getElementById('regmsg');
    const data=document.getElementById('rdata')?.value;
    const equipe=document.getElementById('requipe')?.value;
    const setor=document.getElementById('rsetor')?.value||null;
    const observacoes=document.getElementById('robs')?.value?.trim()||'';
    if(!data||!equipe){msg.className='msg err full';msg.textContent='Informe data e equipe do mutirão.';return}
    if(!observacoes){msg.className='msg err full';msg.textContent='Informe na observação a região/local do mutirão.';document.getElementById('robs')?.focus();return}
    const concluido=status==='concluido';
    const payload={
      data,
      equipe_id:equipe,
      setor_id:setor,
      periodo:document.getElementById('rperiodo')?.value||'integral',
      viagens:concluido?Number(document.getElementById('rviagens')?.value||0):0,
      capacidade:Number(document.getElementById('rcap')?.value||0),
      material:concluido?(document.getElementById('rmaterial')?.value||null):null,
      observacoes,
      status:concluido?'concluido':'andamento',
      situacao:'multirao',
      veiculo_id:null,
      motivo_parada:null,
      finalizado_em:concluido?new Date().toISOString():null
    };
    msg.className='msg full';msg.textContent=concluido?'Salvando mutirão concluído...':'Salvando pré-registro de mutirão...';
    try{
      const existing=DB.registros.find(r=>r.data===data&&r.equipe_id===equipe&&(r.status||'concluido')==='andamento');
      if(existing){
        await req('/rest/v1/registros?id=eq.'+existing.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
      }else{
        await req('/rest/v1/registros',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
      }
      msg.className='msg oktxt full';msg.textContent=concluido?'Mutirão salvo como concluído.':'Mutirão salvo em andamento.';
      await (window.load||load)();
      window.renderProducaoMensal?.();
    }catch(e){msg.className='msg err full';msg.textContent=e.message}
  }

  function wireButtons(){
    ensureMutiraoOption();
    const situ=document.getElementById('rsituacao');
    if(situ&&!situ.dataset.mutiraoFields){
      situ.addEventListener('change',()=>setTimeout(updateMutiraoFields,0));
      situ.dataset.mutiraoFields='1';
    }
    updateMutiraoFields();
    const pre=document.getElementById('preRegistroBtn');
    const actions=document.getElementById('regForm')?.querySelector('.actions');
    const fin=actions?Array.from(actions.querySelectorAll('button')).find(b=>b.textContent.includes('Salvar como concluído')):null;
    if(pre&&!pre.dataset.mutirao){
      const old=pre.onclick; pre.onclick=()=>isMultirao()?saveMutirao('andamento'):old?.(); pre.dataset.mutirao='1';
    }
    if(fin&&!fin.dataset.mutirao){
      const old=fin.onclick; fin.onclick=()=>isMultirao()?saveMutirao('concluido'):old?.(); fin.dataset.mutirao='1';
    }
    const note=document.querySelector('#regForm .workflow-note');
    if(note) note.innerHTML='<b>Fluxo diário:</b> pela manhã salve como pré-registro. Se a equipe não puder trabalhar, selecione <b>Equipe parada</b>. Em <b>Mutirão</b>, o setor é opcional e informe obrigatoriamente a região/local na observação.';
  }

  const start=()=>{setTimeout(wireButtons,250);document.querySelector('[data-page="registro"]')?.addEventListener('click',()=>setTimeout(wireButtons,80));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
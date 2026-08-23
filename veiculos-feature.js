(()=>{
  function vehicleById(id){return DB.veiculos.find(v=>v.id===id)}

  function vehicleForm(v){
    const equipes=DB.equipes.filter(e=>e.ativo||e.id===v?.equipe_id);
    return `
      <label>Código do veículo
        <input name="codigo" required placeholder="Ex.: CAM-01" value="${esc(v?.codigo||'')}">
      </label>
      <label>Tipo
        <select name="tipo" id="vftipo" required>
          ${['Caminhão Truck','Caminhão Toco','Pá Carregadeira','Outro'].map(t=>`<option value="${t}" ${v?.tipo===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </label>
      <label>Capacidade (m³)
        <input name="capacidade" id="vfcap" type="number" min="0" step="0.1" required value="${v?.capacidade??13}">
      </label>
      <label>Equipe vinculada
        <select name="equipe_id">
          <option value="">Sem equipe</option>
          ${equipes.map(e=>`<option value="${e.id}" ${v?.equipe_id===e.id?'selected':''}>${esc(e.nome)}</option>`).join('')}
        </select>
      </label>
      <label class="modalfull">Status
        <select name="ativo">
          <option value="true" ${v?.ativo!==false?'selected':''}>Operando</option>
          <option value="false" ${v?.ativo===false?'selected':''}>Inativo / fora de operação</option>
        </select>
      </label>
      <div class="hint modalfull">Para caminhões Truck, a capacidade média sugerida é 13 m³. Você pode alterar esse valor para cada veículo.</div>`;
  }

  function setupCapacitySuggestion(){
    setTimeout(()=>{
      const tipo=document.getElementById('vftipo'), cap=document.getElementById('vfcap');
      if(!tipo||!cap)return;
      tipo.addEventListener('change',()=>{
        if(tipo.value==='Caminhão Truck' && (!cap.value || Number(cap.value)===0)) cap.value='13';
        if(tipo.value==='Caminhão Toco' && (!cap.value || Number(cap.value)===0)) cap.value='8';
        if(tipo.value==='Pá Carregadeira') cap.value='0';
      });
    },0);
  }

  window.openVehicle=function(id=''){
    const v=id?vehicleById(id):null;
    modal(v?'Editar veículo':'Novo veículo',vehicleForm(v),async fd=>{
      const payload={
        codigo:String(fd.get('codigo')||'').trim(),
        tipo:String(fd.get('tipo')||'').trim(),
        capacidade:Number(fd.get('capacidade')||0),
        equipe_id:fd.get('equipe_id')||null,
        ativo:fd.get('ativo')==='true'
      };
      if(v){
        await req('/rest/v1/veiculos?id=eq.'+v.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
      }else{
        await req('/rest/v1/veiculos',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
      }
    });
    setupCapacitySuggestion();
  };

  function enhanceVehicleTable(){
    const tbody=document.getElementById('veiTable');
    if(!tbody || typeof DB==='undefined')return;
    const table=tbody.closest('table'), head=table?.querySelector('thead tr');
    if(!head)return;
    if(!head.querySelector('.vehicle-actions-head')){
      const th=document.createElement('th'); th.className='vehicle-actions-head'; th.textContent='Ações'; head.appendChild(th);
    }
    const rows=[...tbody.querySelectorAll('tr')];
    rows.forEach((tr,i)=>{
      if(tr.querySelector('.vehicle-actions'))return;
      const v=DB.veiculos[i]; if(!v)return;
      const td=document.createElement('td'); td.className='vehicle-actions';
      td.innerHTML=`<button type="button" class="editlink" onclick="openVehicle('${v.id}')">✏️ Editar veículo</button>`;
      tr.appendChild(td);
    });
  }

  function setup(){
    const btn=document.getElementById('addVeiculo');
    if(btn) btn.onclick=e=>{e.preventDefault();openVehicle('')};
    const tbody=document.getElementById('veiTable');
    if(tbody){
      const obs=new MutationObserver(()=>queueMicrotask(enhanceVehicleTable));
      obs.observe(tbody,{childList:true,subtree:false});
    }
    enhanceVehicleTable();
  }

  window.addEventListener('DOMContentLoaded',setup);
  setTimeout(setup,300);
})();
(()=>{
  const periodoLabel=p=>({matutino:'Matutino',vespertino:'Vespertino',integral:'Integral'})[p]||'Integral';
  const dataBR=d=>{if(!d)return '-';const [y,m,day]=String(d).split('-');return day&&m&&y?`${day}/${m}/${y}`:d};

  function getFilteredReportRecords(){
    if(typeof DB==='undefined') return [];
    const fini=document.getElementById('fini')?.value||'';
    const ffim=document.getElementById('ffim')?.value||'';
    const equipe=document.getElementById('fequipe')?.value||'';
    const setor=document.getElementById('fsetor')?.value||'';
    const periodo=document.getElementById('fperiodo')?.value||'';
    return DB.registros.filter(r=>(!fini||r.data>=fini)&&(!ffim||r.data<=ffim)&&(!equipe||r.equipe_id===equipe)&&(!setor||r.setor_id===setor)&&(!periodo||(r.periodo||'integral')===periodo));
  }

  function closeDetail(){document.getElementById('registroDetailModal')?.remove()}
  window.closeRegistroDetalhes=closeDetail;

  window.openRegistroDetalhes=id=>{
    const r=DB.registros.find(x=>x.id===id); if(!r)return;
    closeDetail();
    const overlay=document.createElement('div');
    overlay.id='registroDetailModal'; overlay.className='modalov';
    const equipe=eq(r.equipe_id)?.nome||'-', setor=st(r.setor_id)?.nome||'-';
    overlay.innerHTML=`<div class="modalbox" style="max-width:620px">
      <div class="modalhead"><h3>Detalhes do registro</h3><button type="button" class="closex" onclick="closeRegistroDetalhes()">×</button></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
        <div class="metricmini"><span class="sub">Data</span><b style="font-size:16px">${esc(dataBR(r.data))}</b></div>
        <div class="metricmini"><span class="sub">Período</span><b style="font-size:16px">${esc(periodoLabel(r.periodo))}</b></div>
        <div class="metricmini"><span class="sub">Equipe</span><b style="font-size:16px">${esc(equipe)}</b></div>
        <div class="metricmini"><span class="sub">Setor</span><b style="font-size:16px">${esc(setor)}</b></div>
        <div class="metricmini"><span class="sub">Viagens</span><b style="font-size:16px">${fmt(r.viagens)}</b></div>
        <div class="metricmini"><span class="sub">Capacidade por viagem</span><b style="font-size:16px">${fmt(r.capacidade)} m³</b></div>
        <div class="metricmini"><span class="sub">Volume total</span><b style="font-size:16px">${fmt(r.volume)} m³</b></div>
        <div class="metricmini"><span class="sub">Material</span><b style="font-size:16px">${esc(r.material||'-')}</b></div>
      </div>
      <div class="panel" style="margin:14px 0 0;padding:14px"><h2 style="margin-bottom:8px">Observações</h2><div style="white-space:pre-wrap;line-height:1.5">${esc(r.observacoes||'Sem observações.')}</div></div>
      <div class="actions" style="justify-content:flex-end"><button type="button" class="btn secondary" onclick="closeRegistroDetalhes()">Fechar</button></div>
    </div>`;
    overlay.onclick=e=>{if(e.target===overlay)closeDetail()};
    document.body.appendChild(overlay);
  };

  function enhanceTable(tableId,records){
    const tbody=document.getElementById(tableId); if(!tbody)return;
    const table=tbody.closest('table'), head=table?.querySelector('thead tr'); if(!head)return;
    head.querySelectorAll('.detail-head').forEach((el,i)=>{if(i>0)el.remove()});
    if(!head.querySelector('.detail-head')){const th=document.createElement('th'); th.className='detail-head'; th.textContent='Detalhes'; head.appendChild(th)}
    [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
      tr.querySelectorAll('.detail-cell').forEach((el,j)=>{if(j>0)el.remove()});
      let td=tr.querySelector('.detail-cell');
      if(!td){td=document.createElement('td');td.className='detail-cell';tr.appendChild(td)}
      const r=records[i];
      td.innerHTML=r?`<button type="button" class="actionbtn" onclick="openRegistroDetalhes('${r.id}')">👁 Ver detalhes</button>`:'-';
    });
  }

  function enhance(){
    if(typeof DB==='undefined')return;
    enhanceTable('reportTable',getFilteredReportRecords());
  }

  let scheduled=false;
  const scheduleEnhance=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;enhance()},0)};
  const obs=new MutationObserver(scheduleEnhance);
  window.addEventListener('DOMContentLoaded',()=>{
    const report=document.getElementById('reportTable');
    if(report)obs.observe(report,{childList:true,subtree:true});
    document.getElementById('filterBtn')?.addEventListener('click',()=>setTimeout(enhance,20));
    setTimeout(enhance,300);
  });
})();

(()=>{
  function vehicleById(id){return DB.veiculos.find(v=>v.id===id)}
  function formHtml(v){
    const teams=DB.equipes.filter(e=>e.ativo||e.id===v?.equipe_id);
    const types=['Caminhão Truck','Caminhão Toco','Pá Carregadeira','Outro'];
    const currentType=v?.tipo||'Caminhão Truck';
    return `<label>Código do veículo<input name="codigo" required placeholder="Ex.: CAM-01" value="${esc(v?.codigo||'')}"></label>
      <label>Tipo<select name="tipo" id="vehicleType" required>${types.map(t=>`<option value="${t}" ${currentType===t?'selected':''}>${t}</option>`).join('')}</select></label>
      <label>Capacidade (m³)<input name="capacidade" id="vehicleCapacity" type="number" min="0" step="0.1" required value="${v?.capacidade??13}"></label>
      <label>Equipe vinculada<select name="equipe_id"><option value="">Sem equipe</option>${teams.map(e=>`<option value="${e.id}" ${v?.equipe_id===e.id?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></label>
      <label class="modalfull">Status<select name="ativo"><option value="true" ${v?.ativo!==false?'selected':''}>Operando</option><option value="false" ${v?.ativo===false?'selected':''}>Inativo / fora de operação</option></select></label>
      <div class="hint modalfull">Para caminhões Truck, a capacidade média sugerida é 13 m³. O valor pode ser alterado individualmente.</div>`;
  }

  window.openVehicle=id=>{
    const v=id?vehicleById(id):null;
    modal(v?'Editar veículo':'Novo veículo',formHtml(v),async fd=>{
      const payload={codigo:String(fd.get('codigo')||'').trim(),tipo:String(fd.get('tipo')||'').trim(),capacidade:Number(fd.get('capacidade')||0),equipe_id:fd.get('equipe_id')||null,ativo:fd.get('ativo')==='true'};
      if(v) await req('/rest/v1/veiculos?id=eq.'+v.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
      else await req('/rest/v1/veiculos',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
    });
    setTimeout(()=>{
      const type=document.getElementById('vehicleType'),cap=document.getElementById('vehicleCapacity');
      if(!type||!cap)return;
      type.onchange=()=>{
        if(type.value==='Pá Carregadeira') cap.value='0';
        else if(type.value==='Caminhão Truck' && (!cap.value||Number(cap.value)===0)) cap.value='13';
        else if(type.value==='Caminhão Toco' && (!cap.value||Number(cap.value)===0)) cap.value='8';
      };
    },0);
  };

  function enhanceVehicles(){
    const tbody=document.getElementById('veiTable'); if(!tbody||typeof DB==='undefined')return;
    const head=tbody.closest('table')?.querySelector('thead tr'); if(!head)return;
    if(!head.querySelector('.vehicle-actions-head')){const th=document.createElement('th');th.className='vehicle-actions-head';th.textContent='Ações';head.appendChild(th)}
    [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
      if(tr.querySelector('.vehicle-actions'))return;
      const v=DB.veiculos[i]; if(!v)return;
      const td=document.createElement('td');td.className='vehicle-actions';td.innerHTML=`<button type="button" class="editlink" onclick="openVehicle('${v.id}')">✏️ Editar veículo</button>`;tr.appendChild(td);
    });
  }

  function setupVehicles(){
    const btn=document.getElementById('addVeiculo'); if(btn) btn.onclick=e=>{e.preventDefault();openVehicle('')};
    const tbody=document.getElementById('veiTable');
    if(tbody){new MutationObserver(()=>queueMicrotask(enhanceVehicles)).observe(tbody,{childList:true});}
    enhanceVehicles();
  }
  window.addEventListener('DOMContentLoaded',setupVehicles);
  setTimeout(setupVehicles,350);
})();
(()=>{
  let manutencoes=[];
  const statusLabel=s=>({parado:'Parado',em_manutencao:'Em manutenção',aguardando_peca:'Aguardando peça',liberado:'Liberado'})[s]||s;
  const fmtMoney=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const dataBR=d=>{if(!d)return '-';const [y,m,dd]=String(d).split('-');return dd&&m&&y?`${dd}/${m}/${y}`:d};
  const vehicle=id=>DB.veiculos.find(v=>v.id===id);
  const diasParado=m=>{
    const ini=new Date(m.data_inicio+'T00:00:00');
    const fim=new Date((m.data_retorno||new Date().toISOString().slice(0,10))+'T00:00:00');
    return Math.max(0,Math.round((fim-ini)/86400000));
  };

  async function loadManutencoes(){
    try{manutencoes=await req('/rest/v1/manutencoes?select=*&order=data_inicio.desc,created_at.desc')||[];renderMaintenancePage()}
    catch(e){console.error(e)}
  }
  window.loadManutencoes=loadManutencoes;

  function openOccurrence(id=''){
    const m=id?manutencoes.find(x=>x.id===id):null;
    modal(m?'Editar ocorrência':'Nova ocorrência',`
      <label class="modalfull">Veículo<select name="veiculo_id" required>
        <option value="">Selecione...</option>${DB.veiculos.map(v=>`<option value="${v.id}" ${m?.veiculo_id===v.id?'selected':''}>${esc(v.codigo)} — ${esc(v.tipo)}</option>`).join('')}
      </select></label>
      <label>Data da ocorrência<input name="data_inicio" type="date" required value="${m?.data_inicio||new Date().toISOString().slice(0,10)}"></label>
      <label>Situação<select name="status">
        <option value="parado" ${m?.status==='parado'?'selected':''}>Parado</option>
        <option value="em_manutencao" ${m?.status==='em_manutencao'?'selected':''}>Em manutenção</option>
        <option value="aguardando_peca" ${m?.status==='aguardando_peca'?'selected':''}>Aguardando peça</option>
        ${m?.status==='liberado'?'<option value="liberado" selected>Liberado</option>':''}
      </select></label>
      <label class="modalfull">Tipo de problema<input name="tipo_problema" required placeholder="Ex.: problema hidráulico, pneu, motor" value="${esc(m?.tipo_problema||'')}"></label>
      <label class="modalfull">Descrição do defeito<input name="descricao" placeholder="Descreva o que aconteceu" value="${esc(m?.descricao||'')}"></label>
      <label>Oficina / local<input name="oficina" value="${esc(m?.oficina||'')}"></label>
      <label>Custo estimado (R$)<input name="custo_estimado" type="number" min="0" step="0.01" value="${m?.custo_estimado??''}"></label>
      <label class="modalfull">Observações<input name="observacoes" value="${esc(m?.observacoes||'')}"></label>`,
      async fd=>{
        const payload={
          veiculo_id:fd.get('veiculo_id'),data_inicio:fd.get('data_inicio'),status:fd.get('status'),
          tipo_problema:fd.get('tipo_problema').trim(),descricao:fd.get('descricao').trim()||null,
          oficina:fd.get('oficina').trim()||null,custo_estimado:fd.get('custo_estimado')?+fd.get('custo_estimado'):null,
          observacoes:fd.get('observacoes').trim()||null
        };
        if(m) await req('/rest/v1/manutencoes?id=eq.'+m.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
        else await req('/rest/v1/manutencoes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
        await req('/rest/v1/veiculos?id=eq.'+payload.veiculo_id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({ativo:false})});
        await load(); await loadManutencoes();
      });
  }
  window.openOccurrence=openOccurrence;

  function finalizeOccurrence(id){
    const m=manutencoes.find(x=>x.id===id); if(!m)return;
    modal('Finalizar manutenção',`
      <div class="modalfull hint"><b>${esc(vehicle(m.veiculo_id)?.codigo||'')} — ${esc(vehicle(m.veiculo_id)?.tipo||'')}</b><br>${esc(m.tipo_problema)}</div>
      <label>Data de retorno<input name="data_retorno" type="date" required value="${new Date().toISOString().slice(0,10)}"></label>
      <label>Custo final (R$)<input name="custo_final" type="number" min="0" step="0.01" value="${m.custo_final??''}"></label>
      <label class="modalfull">Serviço realizado<input name="servico_realizado" required placeholder="Descreva o reparo realizado" value="${esc(m.servico_realizado||'')}"></label>
      <label class="modalfull">Observações finais<input name="observacoes_finais" value=""></label>`,
      async fd=>{
        const extra=fd.get('observacoes_finais').trim();
        await req('/rest/v1/manutencoes?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({
          status:'liberado',data_retorno:fd.get('data_retorno'),servico_realizado:fd.get('servico_realizado').trim(),
          custo_final:fd.get('custo_final')?+fd.get('custo_final'):null,
          observacoes:[m.observacoes,extra].filter(Boolean).join(' | ')||null
        })});
        await req('/rest/v1/veiculos?id=eq.'+m.veiculo_id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({ativo:true})});
        await load(); await loadManutencoes();
      });
  }
  window.finalizeOccurrence=finalizeOccurrence;

  function viewOccurrence(id){
    const m=manutencoes.find(x=>x.id===id),v=m&&vehicle(m.veiculo_id); if(!m)return;
    const ov=document.createElement('div');ov.className='modalov';ov.id='maintenanceDetail';
    ov.innerHTML=`<div class="modalbox" style="max-width:650px"><div class="modalhead"><h3>Detalhes da manutenção</h3><button class="closex">×</button></div>
      <div class="metricrow"><div class="metricmini"><span class="sub">Veículo</span><b>${esc(v?.codigo||'-')} — ${esc(v?.tipo||'-')}</b></div><div class="metricmini"><span class="sub">Situação</span><b>${esc(statusLabel(m.status))}</b></div></div>
      <div class="metricrow" style="margin-top:10px"><div class="metricmini"><span class="sub">Início</span><b>${dataBR(m.data_inicio)}</b></div><div class="metricmini"><span class="sub">Retorno</span><b>${dataBR(m.data_retorno)}</b></div><div class="metricmini"><span class="sub">Dias parado</span><b>${diasParado(m)}</b></div></div>
      <div class="panel" style="margin-top:12px"><p><b>Problema:</b> ${esc(m.tipo_problema)}</p><p><b>Descrição:</b> ${esc(m.descricao||'-')}</p><p><b>Oficina/local:</b> ${esc(m.oficina||'-')}</p><p><b>Serviço realizado:</b> ${esc(m.servico_realizado||'-')}</p><p><b>Observações:</b> ${esc(m.observacoes||'-')}</p><p><b>Custo estimado:</b> ${fmtMoney(m.custo_estimado)}</p><p><b>Custo final:</b> ${fmtMoney(m.custo_final)}</p></div>
      <div class="actions" style="justify-content:flex-end"><button class="btn secondary closem">Fechar</button></div></div>`;
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('.closex').onclick=close;ov.querySelector('.closem').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
  }
  window.viewOccurrence=viewOccurrence;

  function exportMaintenanceCSV(){
    const head=['Veículo','Tipo','Data início','Data retorno','Problema','Situação','Dias parado','Oficina','Custo estimado','Custo final','Serviço realizado','Observações'];
    const rows=manutencoes.map(m=>{const v=vehicle(m.veiculo_id);return [v?.codigo||'',v?.tipo||'',m.data_inicio||'',m.data_retorno||'',m.tipo_problema||'',statusLabel(m.status),diasParado(m),m.oficina||'',m.custo_estimado||'',m.custo_final||'',m.servico_realizado||'',m.observacoes||'']});
    const csv=[head,...rows].map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(';')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='relatorio_manutencao.csv';a.click();URL.revokeObjectURL(a.href);
  }
  window.exportMaintenanceCSV=exportMaintenanceCSV;

  function renderMaintenancePage(){
    const sec=document.getElementById('manutencao');if(!sec||typeof DB==='undefined')return;
    const abertas=manutencoes.filter(m=>m.status!=='liberado'), liberadas=manutencoes.filter(m=>m.status==='liberado');
    const month=new Date().toISOString().slice(0,7), noMes=manutencoes.filter(m=>String(m.data_inicio).startsWith(month)).length;
    const custoMes=manutencoes.filter(m=>String(m.data_inicio).startsWith(month)).reduce((a,m)=>a+Number(m.custo_final||m.custo_estimado||0),0);
    sec.innerHTML=`<div class="toolbar"><div><h2>Manutenção</h2><p>Histórico e acompanhamento da frota</p></div><div class="actions"><button class="btn secondary" onclick="exportMaintenanceCSV()">Exportar CSV</button><button class="btn primary" onclick="openOccurrence()">＋ Nova Ocorrência</button></div></div>
      <div class="cards"><div class="card"><div class="label green">Operando</div><div class="num green">${DB.veiculos.filter(v=>v.ativo).length}</div></div><div class="card"><div class="label orange">Parados / manutenção</div><div class="num orange">${new Set(abertas.map(m=>m.veiculo_id)).size}</div></div><div class="card"><div class="label purple">Ocorrências no mês</div><div class="num purple">${noMes}</div></div><div class="card"><div class="label blue">Custo no mês</div><div class="num blue" style="font-size:24px">${fmtMoney(custoMes)}</div></div></div>
      <div class="panel tablewrap"><h2>Ocorrências em andamento</h2><table><thead><tr><th>Veículo</th><th>Início</th><th>Problema</th><th>Situação</th><th>Dias parado</th><th>Ações</th></tr></thead><tbody>${abertas.map(m=>{const v=vehicle(m.veiculo_id);return `<tr><td><b>${esc(v?.codigo||'-')}</b><br>${esc(v?.tipo||'-')}</td><td>${dataBR(m.data_inicio)}</td><td>${esc(m.tipo_problema)}</td><td><span class="badge unlinked">${esc(statusLabel(m.status))}</span></td><td>${diasParado(m)}</td><td><button class="actionbtn" onclick="viewOccurrence('${m.id}')">👁 Detalhes</button> <button class="actionbtn" onclick="openOccurrence('${m.id}')">✏️ Editar</button> <button class="btn primary" style="padding:7px 10px" onclick="finalizeOccurrence('${m.id}')">✓ Finalizar</button></td></tr>`}).join('')||'<tr><td colspan="6">Nenhuma manutenção em andamento.</td></tr>'}</tbody></table></div>
      <div class="panel tablewrap"><h2>Histórico de manutenções</h2><table><thead><tr><th>Veículo</th><th>Início</th><th>Retorno</th><th>Problema</th><th>Dias parado</th><th>Custo final</th><th>Detalhes</th></tr></thead><tbody>${liberadas.map(m=>{const v=vehicle(m.veiculo_id);return `<tr><td>${esc(v?.codigo||'-')} — ${esc(v?.tipo||'-')}</td><td>${dataBR(m.data_inicio)}</td><td>${dataBR(m.data_retorno)}</td><td>${esc(m.tipo_problema)}</td><td>${diasParado(m)}</td><td>${fmtMoney(m.custo_final)}</td><td><button class="actionbtn" onclick="viewOccurrence('${m.id}')">👁 Ver detalhes</button></td></tr>`}).join('')||'<tr><td colspan="7">Nenhum histórico concluído ainda.</td></tr>'}</tbody></table></div>`;
  }
  window.renderMaintenancePage=renderMaintenancePage;

  window.addEventListener('DOMContentLoaded',()=>setTimeout(loadManutencoes,500));
  document.querySelector('[data-page="manutencao"]')?.addEventListener('click',()=>setTimeout(loadManutencoes,50));
})();
(()=>{
function labelPeriodo(p){return ({matutino:'Matutino',vespertino:'Vespertino',integral:'Integral'})[p]||'Integral'}
function setup(){
 const form=document.getElementById('regForm'); if(!form||document.getElementById('rperiodo')) return;
 const equipe=document.getElementById('requipe');
 const lab=document.createElement('label'); lab.innerHTML='Período<select id="rperiodo" required><option value="integral">Integral</option><option value="matutino">Matutino</option><option value="vespertino">Vespertino</option></select>';
 equipe.closest('label').after(lab);
 const fset=document.getElementById('fsetor');
 const flab=document.createElement('label'); flab.innerHTML='Período<select id="fperiodo"><option value="">Todos os períodos</option><option value="matutino">Matutino</option><option value="vespertino">Vespertino</option><option value="integral">Integral</option></select>';
 fset.closest('label').after(flab);
 form.addEventListener('submit',async ev=>{
   ev.preventDefault(); ev.stopImmediatePropagation();
   const msg=document.getElementById('regmsg'); msg.textContent='Salvando...'; msg.className='msg full';
   try{
    await req('/rest/v1/registros',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({data:document.getElementById('rdata').value,equipe_id:equipe.value,setor_id:document.getElementById('rsetor').value,periodo:document.getElementById('rperiodo').value,viagens:+document.getElementById('rviagens').value,capacidade:+document.getElementById('rcap').value,material:document.getElementById('rmaterial').value,observacoes:document.getElementById('robs').value})});
    msg.className='msg oktxt full'; msg.textContent='Registro '+labelPeriodo(document.getElementById('rperiodo').value)+' salvo com sucesso.'; await load();
   }catch(x){msg.className='msg err full';msg.textContent=x.message}
 },true);
 const btn=document.getElementById('filterBtn');
 if(btn) btn.addEventListener('click',e=>{e.preventDefault();renderPeriodoReport(true)});
 renderPeriodoReport(false);
}
function renderPeriodoReport(scroll){
 if(typeof DB==='undefined'||!document.getElementById('reportTable'))return;
 const per=document.getElementById('fperiodo')?.value||'';
 const ini=document.getElementById('fini')?.value||'';
 const fim=document.getElementById('ffim')?.value||'';
 const equipe=document.getElementById('fequipe')?.value||'';
 const setor=document.getElementById('fsetor')?.value||'';
 const rs=DB.registros.filter(r=>(!ini||r.data>=ini)&&(!fim||r.data<=fim)&&(!equipe||r.equipe_id===equipe)&&(!setor||r.setor_id===setor)&&(!per||(r.periodo||'integral')===per));
 const table=document.getElementById('reportTable').closest('table');
 table.querySelector('thead tr').innerHTML='<th>Data</th><th>Equipe</th><th>Período</th><th>Setor</th><th>Viagens</th><th>Volume (m³)</th><th>Material</th><th>Detalhes</th>';
 document.getElementById('reportTable').innerHTML=rs.map(r=>`<tr><td>${r.data}</td><td>${esc(eq(r.equipe_id)?.nome||'-')}</td><td>${labelPeriodo(r.periodo||'integral')}</td><td>${esc(st(r.setor_id)?.nome||'-')}</td><td>${r.viagens}</td><td>${fmt(r.volume)}</td><td>${esc(r.material||'-')}</td><td><button class="actionbtn" onclick="window.openRegistroDetalhes&&window.openRegistroDetalhes('${r.id}')">👁 Ver detalhes</button></td></tr>`).join('')||'<tr><td colspan="8">Nenhum resultado para os filtros selecionados.</td></tr>';
 document.getElementById('reportCards').innerHTML=[['Viagens Totais',rs.reduce((a,r)=>a+Number(r.viagens||0),0)],['Volume Total',fmt(rs.reduce((a,r)=>a+Number(r.volume||0),0))+' m³'],['Setores Atendidos',new Set(rs.map(r=>r.setor_id)).size],['Equipes Ativas',new Set(rs.map(r=>r.equipe_id)).size]].map(x=>`<div class="card"><div class="label">${x[0]}</div><div class="num green">${x[1]}</div></div>`).join('');
 if(scroll){document.getElementById('reportCards')?.scrollIntoView({behavior:'smooth',block:'start'})}
}
window.renderPeriodoReport=renderPeriodoReport;
window.addEventListener('DOMContentLoaded',setup);
})();
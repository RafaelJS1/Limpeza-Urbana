const SUPABASE_URL='https://bppqbhfsvwokfdawauht.supabase.co';
const KEY='sb_publishable_dGv-k8m6A9tACGpQsxaapg_IxrW5LfA';
let token=localStorage.getItem('lu_token')||'';
let DB={equipes:[],setores:[],veiculos:[],registros:[]};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
const eq=id=>DB.equipes.find(x=>x.id===id);
const st=id=>DB.setores.find(x=>x.id===id);

async function req(path,opt={}){
  const h={'apikey':KEY,'Content-Type':'application/json'};
  if(token) h.Authorization='Bearer '+token;
  const r=await fetch(SUPABASE_URL+path,{...opt,headers:{...h,...(opt.headers||{})}});
  const t=await r.text(); let d;
  try{d=t?JSON.parse(t):null}catch{d=t}
  if(!r.ok) throw Error(d?.msg||d?.message||d?.error_description||t||('Erro '+r.status));
  return d;
}

async function load(){
  [DB.equipes,DB.setores,DB.veiculos,DB.registros]=await Promise.all(
    ['equipes','setores','veiculos','registros'].map(t=>req('/rest/v1/'+t+'?select=*&order=created_at.asc'))
  );
  render();
}

function go(id){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  $(id)?.classList.add('active');
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
  $('side')?.classList.remove('open');
}
window.go=go;

document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));
$('hamb').onclick=()=>$('side').classList.toggle('open');

function ensureExtraStyle(){
  if(document.getElementById('lu-extra-style')) return;
  const s=document.createElement('style'); s.id='lu-extra-style';
  s.textContent=`
  .actionbtn{border:0;border-radius:7px;padding:7px 10px;font-weight:700;cursor:pointer;background:#eaf3f8;color:#165a78}
  .editlink{display:inline-flex;align-items:center;gap:5px;margin-top:6px;border:0;background:#eaf3f8;color:#165a78;padding:6px 8px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer}
  .modalov{position:fixed;inset:0;background:#071c2bcc;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
  .modalbox{background:#fff;width:min(560px,100%);max-height:88vh;overflow:auto;border-radius:14px;padding:20px;box-shadow:0 20px 60px #0004}
  .modalhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.modalhead h3{margin:0}.closex{border:0;background:none;font-size:25px;cursor:pointer}
  .modalform{display:grid;grid-template-columns:1fr 1fr;gap:12px}.modalform label{font-size:12px;font-weight:700}
  .modalform input,.modalform select{width:100%;padding:10px;margin-top:5px;border:1px solid #cfd9e2;border-radius:7px}
  .modalfull{grid-column:1/-1}.sectorbox{border:1px solid #dbe3ea;border-radius:8px;padding:10px;max-height:230px;overflow:auto}
  .sectoritem{display:flex!important;align-items:center;gap:8px;padding:7px 2px;font-weight:500!important}.sectoritem input{width:auto!important;margin:0!important}
  .hint{font-size:11px;color:#718096;margin:3px 0 8px}.unlinked{background:#fff5dc;color:#986500}
  @media(max-width:700px){
    .modalform{grid-template-columns:1fr}.modalfull{grid-column:auto}
    #eqTable td:first-child{min-width:135px}
    #eqTable th:last-child,#eqTable td:last-child{display:none}
    #setTable th:last-child,#setTable td:last-child{display:none}
  }`;
  document.head.appendChild(s);
}

function modal(title,body,onSave){
  const ov=document.createElement('div'); ov.className='modalov';
  ov.innerHTML=`<div class="modalbox"><div class="modalhead"><h3>${esc(title)}</h3><button type="button" class="closex">×</button></div>
  <form class="modalform">${body}
  <div class="modalfull actions"><button type="button" class="btn secondary cancelm">Cancelar</button><button class="btn primary">Salvar</button></div>
  <div class="msg modmsg modalfull"></div></form></div>`;
  document.body.appendChild(ov);
  const form=ov.querySelector('form'), msg=ov.querySelector('.modmsg');
  const close=()=>ov.remove();
  ov.querySelector('.closex').onclick=close; ov.querySelector('.cancelm').onclick=close; ov.onclick=e=>{if(e.target===ov)close()};
  form.onsubmit=async e=>{
    e.preventDefault(); msg.className='msg modmsg modalfull'; msg.textContent='Salvando...';
    try{await onSave(new FormData(form)); close(); await load()}
    catch(x){msg.className='msg err modmsg modalfull'; msg.textContent=x.message}
  };
}

function sectorChecks(teamId=''){
  const available=DB.setores.filter(s=>!s.equipe_id||s.equipe_id===teamId);
  if(!available.length) return `<div class="hint">Nenhum setor disponível. Cadastre os setores primeiro na tela Setores.</div>`;
  return `<div class="sectorbox">${available.map(s=>`<label class="sectoritem">
  <input type="checkbox" name="setores" value="${s.id}" ${s.equipe_id===teamId?'checked':''}>
  <span>${esc(s.nome)}</span>${!s.equipe_id?'<span class="badge unlinked">Livre</span>':''}</label>`).join('')}</div>`;
}

async function assignSectors(teamId,selected){
  const current=DB.setores.filter(s=>s.equipe_id===teamId);
  for(const s of current){
    if(!selected.includes(s.id)) await req('/rest/v1/setores?id=eq.'+s.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({equipe_id:null})});
  }
  for(const id of selected){
    if(st(id)?.equipe_id!==teamId) await req('/rest/v1/setores?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({equipe_id:teamId})});
  }
}

function openTeam(teamId=''){
  const e=teamId?eq(teamId):null;
  modal(e?'Editar equipe':'Nova equipe',
  `<label>Nome da equipe<input name="nome" required value="${esc(e?.nome||'')}"></label>
   <label>Responsável<input name="responsavel" placeholder="Nome do responsável" value="${esc(e?.responsavel||'')}"></label>
   <label>Pá carregadeira<input name="pa" type="number" min="0" value="${e?.pa??0}"></label>
   <label>Caminhões<input name="caminhoes" type="number" min="0" value="${e?.caminhoes??0}"></label>
   <label class="modalfull">Status<select name="ativo"><option value="true" ${e?.ativo!==false?'selected':''}>Ativa</option><option value="false" ${e?.ativo===false?'selected':''}>Inativa</option></select></label>
   <div class="modalfull"><b>Setores atendidos</b><div class="hint">Marque os setores pré-cadastrados que pertencem a esta equipe.</div>${sectorChecks(teamId)}</div>`,
   async fd=>{
     const payload={
       nome:fd.get('nome').trim(),
       responsavel:fd.get('responsavel').trim(),
       pa:+fd.get('pa'),
       caminhoes:+fd.get('caminhoes'),
       ativo:fd.get('ativo')==='true'
     };
     const selected=fd.getAll('setores');
     let id=teamId;
     if(e){
       await req('/rest/v1/equipes?id=eq.'+teamId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
     }else{
       const ret=await req('/rest/v1/equipes',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
       id=ret?.[0]?.id;
       if(!id) throw Error('Equipe criada, mas não foi possível obter o ID.');
     }
     await assignSectors(id,selected);
   });
}
window.openTeam=openTeam;

function openSector(setorId=''){
  const s=setorId?st(setorId):null;
  modal(s?'Editar setor':'Novo setor',
  `<label class="modalfull">Nome do setor<input name="nome" required value="${esc(s?.nome||'')}"></label>
   <label class="modalfull">Equipe responsável<select name="equipe_id"><option value="">Sem equipe / disponível</option>
   ${DB.equipes.filter(e=>e.ativo).map(e=>`<option value="${e.id}" ${s?.equipe_id===e.id?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></label>
   <div class="hint modalfull">Você pode deixar o setor livre e vinculá-lo depois ao editar uma equipe.</div>`,
  async fd=>{
    const payload={nome:fd.get('nome').trim(),equipe_id:fd.get('equipe_id')||null,ativo:true};
    if(s) await req('/rest/v1/setores?id=eq.'+s.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
    else await req('/rest/v1/setores',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
  });
}
window.openSector=openSector;

function render(){
  ensureExtraStyle();
  const totalV=DB.registros.reduce((a,r)=>a+Number(r.viagens||0),0);
  const totalM=DB.registros.reduce((a,r)=>a+Number(r.volume||0),0);

  $('dashcards').innerHTML=[
    ['Viagens hoje',totalV,'green'],['Volume removido',fmt(totalM)+' m³','blue'],
    ['Equipes em operação',DB.equipes.filter(e=>e.ativo).length,'purple'],
    ['Setores atendidos',DB.setores.filter(s=>s.ativo&&s.equipe_id).length,'orange']
  ].map(x=>`<div class="card"><div class="label ${x[2]}">${x[0]}</div><div class="num ${x[2]}">${x[1]}</div><div class="sub">Dados registrados no sistema</div></div>`).join('');

  const vals=DB.equipes.map(e=>DB.registros.filter(r=>r.equipe_id===e.id).reduce((a,r)=>a+Number(r.viagens||0),0)), mx=Math.max(1,...vals);
  $('bars').innerHTML=DB.equipes.map((e,i)=>`<div class="barwrap"><div class="bar" style="height:${Math.max(3,vals[i]/mx*145)}px"><b>${vals[i]}</b></div><span>${esc(e.nome)}</span></div>`).join('');

  const days={}; DB.registros.forEach(r=>days[r.data]=(days[r.data]||0)+Number(r.volume||0));
  const arr=Object.entries(days).sort(), max=Math.max(1,...arr.map(x=>x[1]));
  const pts=arr.length?arr.map((x,i)=>`${i/Math.max(1,arr.length-1)*500},${165-x[1]/max*135}`).join(' '):'0,165 500,165';
  $('volumeLine').setAttribute('points',pts); $('volumeArea').setAttribute('points','0,180 '+pts+' 500,180');

  $('prodTable').innerHTML=DB.equipes.map(e=>{
    const rr=DB.registros.filter(r=>r.equipe_id===e.id), v=rr.reduce((a,r)=>a+Number(r.viagens||0),0), m=rr.reduce((a,r)=>a+Number(r.volume||0),0), ss=new Set(rr.map(r=>r.setor_id)).size;
    return `<tr><td>${esc(e.nome)}</td><td>${v}</td><td>${fmt(m)}</td><td>${ss}</td><td>${rr.length?fmt(m/Math.max(1,new Set(rr.map(r=>r.data)).size)):0} m³</td></tr>`;
  }).join('');

  $('eqTable').innerHTML=DB.equipes.map(e=>`<tr>
    <td><b>${esc(e.nome)}</b><br><button class="editlink" onclick="openTeam('${e.id}')">✏️ Editar equipe</button></td>
    <td>${esc(e.responsavel||'Não informado')}</td><td>${e.pa}</td><td>${e.caminhoes}</td>
    <td>${DB.setores.filter(s=>s.equipe_id===e.id).length}</td><td><span class="badge ok">${e.ativo?'Ativa':'Inativa'}</span></td>
    <td><button class="actionbtn" onclick="openTeam('${e.id}')">✏️ Editar</button></td></tr>`).join('');

  $('eqDetail').innerHTML=DB.equipes.map(e=>`<span class="chip"><b>${esc(e.nome)}</b> • 🚜 ${e.pa} • 🚛 ${e.caminhoes} • 📍 ${DB.setores.filter(s=>s.equipe_id===e.id).length}</span>`).join('');

  $('setTable').innerHTML=DB.setores.map(s=>`<tr>
    <td><b>${esc(s.nome)}</b><br><button class="editlink" onclick="openSector('${s.id}')">✏️ Editar setor</button></td>
    <td>${esc(eq(s.equipe_id)?.nome||'Disponível')}</td>
    <td><span class="badge ${s.equipe_id?'ok':'unlinked'}">${s.equipe_id?'Vinculado':'Sem equipe'}</span></td>
    <td><button class="actionbtn" onclick="openSector('${s.id}')">✏️ Editar</button></td></tr>`).join('')||'<tr><td colspan="4">Nenhum setor cadastrado.</td></tr>';

  $('veiTable').innerHTML=DB.veiculos.map(v=>`<tr><td>${esc(v.codigo)}</td><td>${esc(v.tipo)}</td><td>${fmt(v.capacidade)} m³</td><td>${esc(eq(v.equipe_id)?.nome||'-')}</td><td><span class="badge ok">${v.ativo?'Operando':'Inativo'}</span></td></tr>`).join('')||'<tr><td colspan="5">Nenhum veículo cadastrado.</td></tr>';

  const opts='<option value="">Selecione...</option>'+DB.equipes.filter(e=>e.ativo).map(e=>`<option value="${e.id}">${esc(e.nome)}</option>`).join('');
  $('requipe').innerHTML=opts;
  $('fequipe').innerHTML='<option value="">Todas as equipes</option>'+opts.replace('<option value="">Selecione...</option>','');
  $('fsetor').innerHTML='<option value="">Todos os setores</option>'+DB.setores.map(s=>`<option value="${s.id}">${esc(s.nome)}</option>`).join('');

  const rows=DB.registros.slice().sort((a,b)=>b.data.localeCompare(a.data)).map(r=>`<tr><td>${r.data}</td><td>${esc(eq(r.equipe_id)?.nome||'-')}</td><td>${esc(st(r.setor_id)?.nome||'-')}</td><td>${r.viagens}</td><td>${fmt(r.volume)} m³</td><td>${esc(r.material||'-')}</td></tr>`).join('');
  $('allRegs').innerHTML=rows||'<tr><td colspan="6">Nenhum registro.</td></tr>';

  $('productionCards').innerHTML=[['Viagens',totalV],['Volume',fmt(totalM)+' m³'],['Registros',DB.registros.length],['Setores',new Set(DB.registros.map(r=>r.setor_id)).size]].map(x=>`<div class="card"><div class="label">${x[0]}</div><div class="num green">${x[1]}</div></div>`).join('');
  $('maintenance').innerHTML=DB.veiculos.length?DB.veiculos.map(v=>`<div class="alert"><b>${esc(v.codigo)}</b> — ${esc(v.tipo)} — ${v.ativo?'🟢 Operando':'🔴 Inativo'}</div>`).join(''):'Nenhum veículo cadastrado.';
  filterReport();
}

$('requipe').onchange=()=>{
  const e=eq($('requipe').value); $('rpa').textContent=e?.pa||0; $('rcam').textContent=e?.caminhoes||0;
  $('rsetor').innerHTML='<option value="">Selecione o setor</option>'+DB.setores.filter(s=>s.equipe_id===$('requipe').value&&s.ativo).map(s=>`<option value="${s.id}">${esc(s.nome)}</option>`).join('');
};
function calc(){$('rvolume').value=(Number($('rviagens').value||0)*Number($('rcap').value||0)).toFixed(2)}
$('rviagens').oninput=calc; $('rcap').oninput=calc;

$('regForm').onsubmit=async e=>{
  e.preventDefault(); $('regmsg').textContent='Salvando...';
  try{
    await req('/rest/v1/registros',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
      data:$('rdata').value,equipe_id:$('requipe').value,setor_id:$('rsetor').value,viagens:+$('rviagens').value,
      capacidade:+$('rcap').value,material:$('rmaterial').value,observacoes:$('robs').value
    })});
    $('regmsg').className='msg oktxt full'; $('regmsg').textContent='Registro salvo com sucesso.'; await load();
  }catch(x){$('regmsg').className='msg err full'; $('regmsg').textContent=x.message}
};

$('addEquipe').onclick=()=>openTeam('');
$('addSetor').onclick=()=>openSector('');
$('addVeiculo').onclick=async()=>{
  const codigo=prompt('Código do veículo:'); if(!codigo)return;
  const tipo=prompt('Tipo:','Basculante')||'Basculante', cap=+(prompt('Capacidade em m³:','18')||0);
  const n=+(prompt('Equipe (1 a '+DB.equipes.length+'):')||0), e=DB.equipes[n-1]; if(!e)return;
  await req('/rest/v1/veiculos',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({codigo,tipo,capacidade:cap,equipe_id:e.id,ativo:true})});
  await load();
};

function filterReport(){
  const rs=DB.registros.filter(r=>(!$('fini').value||r.data>=$('fini').value)&&(!$('ffim').value||r.data<=$('ffim').value)&&(!$('fequipe').value||r.equipe_id===$('fequipe').value)&&(!$('fsetor').value||r.setor_id===$('fsetor').value));
  $('reportCards').innerHTML=[['Viagens Totais',rs.reduce((a,r)=>a+Number(r.viagens||0),0)],['Volume Total',fmt(rs.reduce((a,r)=>a+Number(r.volume||0),0))+' m³'],['Setores Atendidos',new Set(rs.map(r=>r.setor_id)).size],['Equipes Ativas',new Set(rs.map(r=>r.equipe_id)).size]].map(x=>`<div class="card"><div class="label">${x[0]}</div><div class="num green">${x[1]}</div></div>`).join('');
  $('reportTable').innerHTML=rs.map(r=>`<tr><td>${r.data}</td><td>${esc(eq(r.equipe_id)?.nome||'-')}</td><td>${esc(st(r.setor_id)?.nome||'-')}</td><td>${r.viagens}</td><td>${fmt(r.volume)}</td><td>${esc(r.material||'-')}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum resultado.</td></tr>';
}
$('filterBtn').onclick=filterReport;

$('csvBtn').onclick=()=>{
  const rows=[['Data','Equipe','Setor','Viagens','Volume','Material'],...DB.registros.map(r=>[r.data,eq(r.equipe_id)?.nome||'',st(r.setor_id)?.nome||'',r.viagens,r.volume,r.material||''])];
  const csv='\ufeff'+rows.map(a=>a.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const a=document.createElement('a'); a.href=window.URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='relatorio-limpeza-urbana.csv'; a.click();
};

$('loginForm').onsubmit=async e=>{
  e.preventDefault(); $('authmsg').textContent='Entrando...';
  try{
    const d=await req('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('email').value.trim(),password:$('password').value})});
    token=d.access_token; localStorage.setItem('lu_token',token); $('login').classList.add('hidden'); $('system').classList.remove('hidden'); await load();
  }catch(x){$('authmsg').className='msg err'; $('authmsg').textContent=x.message}
};
$('signup').onclick=async()=>{
  const email=$('email').value.trim(),password=$('password').value;
  if(!email||password.length<6){$('authmsg').className='msg err';$('authmsg').textContent='Informe e-mail e senha de pelo menos 6 caracteres.';return}
  try{
    const d=await req('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
    $('authmsg').className='msg oktxt'; $('authmsg').textContent=d.access_token?'Conta criada. Entrando...':'Conta criada. Confirme seu e-mail.';
    if(d.access_token){token=d.access_token;localStorage.setItem('lu_token',token);$('login').classList.add('hidden');$('system').classList.remove('hidden');await load()}
  }catch(x){$('authmsg').className='msg err';$('authmsg').textContent=x.message}
};
$('logout').onclick=()=>{localStorage.removeItem('lu_token');token='';location.reload()};
$('today').textContent=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
$('rdata').value=new Date().toISOString().slice(0,10); calc();
if(token){$('login').classList.add('hidden');$('system').classList.remove('hidden');load().catch(()=>{localStorage.removeItem('lu_token');location.reload()})}
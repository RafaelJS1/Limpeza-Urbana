(()=>{
  let currentProfile=null, profiles=[];
  function uid(){try{return JSON.parse(atob((token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub||''}catch{return''}}
  async function loadProfiles(){
    if(!token)return;
    try{profiles=await req('/rest/v1/user_profiles?select=*&order=created_at.asc');currentProfile=profiles.find(p=>p.id===uid())||null;await req('/rest/v1/rpc/touch_my_profile',{method:'POST',body:'{}'}).catch(()=>{});applyRole();renderUsers()}catch(e){console.warn('Perfis:',e)}
  }
  function isAdmin(){return currentProfile?.role==='administrador'&&currentProfile?.ativo!==false}
  function hideNav(page){const b=document.querySelector(`.nav button[data-page="${page}"]`);if(b)b.style.display='none'}
  function showNav(page){const b=document.querySelector(`.nav button[data-page="${page}"]`);if(b)b.style.display='flex'}
  function applyRole(){
    const admin=isAdmin();
    ['registro','equipes','setores','veiculos','producao','relatorios','manutencao','usuarios','config'].forEach(p=>admin?showNav(p):hideNav(p));
    document.querySelectorAll('#dashboard .primary').forEach(b=>b.style.display=admin?'':'none');
    const prof=document.querySelector('.profile');if(prof)prof.innerHTML=`<b>${esc(currentProfile?.nome||currentProfile?.email||'Usuário')}</b>${admin?'Administrador':'Membro'}`;
    if(!admin && !document.getElementById('dashboard')?.classList.contains('active')) go('dashboard');
  }
  function fdate(v){if(!v)return'Nunca';return new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
  function renderUsers(){
    const sec=document.getElementById('usuarios'); if(!sec)return;
    if(!isAdmin()){sec.innerHTML='<div class="panel"><h2>Acesso restrito</h2><p>Somente administradores podem gerenciar usuários.</p></div>';return}
    const ativos=profiles.filter(p=>p.ativo).length, admins=profiles.filter(p=>p.ativo&&p.role==='administrador').length;
    sec.innerHTML=`<div class="toolbar"><div><h2>Usuários</h2><p>Gerenciamento de acesso ao sistema</p></div></div>
    <div class="cards"><div class="card"><div class="label">Cadastrados</div><div class="num green">${profiles.length}</div></div><div class="card"><div class="label">Ativos</div><div class="num blue">${ativos}</div></div><div class="card"><div class="label">Administradores</div><div class="num purple">${admins}</div></div><div class="card"><div class="label">Membros</div><div class="num orange">${profiles.filter(p=>p.role==='membro').length}</div></div></div>
    <div class="panel tablewrap" style="margin-top:14px"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Último acesso</th><th>Cadastrado</th><th>Ações</th></tr></thead><tbody>${profiles.map(p=>`<tr><td><b>${esc(p.nome||p.email||'Usuário')}</b><br><small>${esc(p.email||'')}</small></td><td><span class="badge ${p.role==='administrador'?'ok':''}">${p.role==='administrador'?'Administrador':'Membro'}</span></td><td>${p.ativo?'<span class="badge ok">Ativo</span>':'<span class="badge unlinked">Inativo</span>'}</td><td>${fdate(p.last_seen_at)}</td><td>${fdate(p.created_at)}</td><td><button class="actionbtn" onclick="editUserRole('${p.id}')">⚙ Gerenciar</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  window.editUserRole=function(id){
    if(!isAdmin())return;const p=profiles.find(x=>x.id===id);if(!p)return;
    modal('Gerenciar usuário',`<label class="modalfull">Usuário<input value="${esc(p.email||'')}" disabled></label><label>Perfil<select name="role"><option value="membro" ${p.role==='membro'?'selected':''}>Membro — somente Dashboard</option><option value="administrador" ${p.role==='administrador'?'selected':''}>Administrador — acesso completo</option></select></label><label>Status<select name="ativo"><option value="true" ${p.ativo?'selected':''}>Ativo</option><option value="false" ${!p.ativo?'selected':''}>Inativo</option></select></label><div class="hint modalfull">Membro visualiza apenas o Dashboard. Administrador pode visualizar e editar todas as áreas.</div>`,async fd=>{
      await req('/rest/v1/user_profiles?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({role:fd.get('role'),ativo:fd.get('ativo')==='true'})});
      await loadProfiles();
    });
  };
  const oldLoad=window.load||load;
  const wrapped=async()=>{await oldLoad();await loadProfiles()};
  try{load=wrapped}catch{} window.load=wrapped;
  const oldGo=window.go;
  window.go=function(id){if(currentProfile&&!isAdmin()&&id!=='dashboard')return oldGo('dashboard');return oldGo(id)};
  if(token)setTimeout(loadProfiles,300);
})();
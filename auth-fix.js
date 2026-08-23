// Renovação automática de sessão Supabase
(() => {
  const REFRESH_KEY = 'lu_refresh_token';
  const ACCESS_KEY = 'lu_token';
  const originalReq = window.req || req;
  let refreshing = null;

  function saveSession(data){
    if(data?.access_token){
      token = data.access_token;
      localStorage.setItem(ACCESS_KEY, data.access_token);
    }
    if(data?.refresh_token){
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
    }
  }

  async function refreshSession(){
    if(refreshing) return refreshing;
    refreshing = (async()=>{
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if(!refreshToken) throw new Error('SESSION_EXPIRED');
      const r = await fetch(URL + '/auth/v1/token?grant_type=refresh_token', {
        method:'POST',
        headers:{'apikey':KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:refreshToken})
      });
      const text = await r.text();
      let data; try{ data = text ? JSON.parse(text) : null }catch{ data = text }
      if(!r.ok || !data?.access_token) throw new Error('SESSION_EXPIRED');
      saveSession(data);
      return data.access_token;
    })().finally(()=>{ refreshing = null; });
    return refreshing;
  }

  async function smartReq(path,opt={}){
    try{
      return await originalReq(path,opt);
    }catch(err){
      const m = String(err?.message||'').toLowerCase();
      const expired = m.includes('jwt expired') || m.includes('invalid jwt') || m.includes('token has expired');
      if(!expired) throw err;
      try{
        await refreshSession();
        return await originalReq(path,opt);
      }catch(refreshErr){
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        token='';
        alert('Sua sessão expirou. Faça login novamente para continuar.');
        location.reload();
        throw new Error('Sessão expirada');
      }
    }
  }

  // Substitui a função global usada pelo restante do sistema.
  window.req = smartReq;
  try { req = smartReq; } catch(e) {}

  // Login: passa a guardar também o refresh token.
  const loginForm = document.getElementById('loginForm');
  if(loginForm){
    loginForm.onsubmit = async e => {
      e.preventDefault();
      const msg = document.getElementById('authmsg');
      msg.className='msg'; msg.textContent='Entrando...';
      try{
        const r = await fetch(URL + '/auth/v1/token?grant_type=password', {
          method:'POST',
          headers:{'apikey':KEY,'Content-Type':'application/json'},
          body:JSON.stringify({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value})
        });
        const text=await r.text(); let d; try{d=text?JSON.parse(text):null}catch{d=text}
        if(!r.ok) throw new Error(d?.msg||d?.message||d?.error_description||text||'Erro ao entrar');
        saveSession(d);
        document.getElementById('login').classList.add('hidden');
        document.getElementById('system').classList.remove('hidden');
        await load();
      }catch(x){ msg.className='msg err'; msg.textContent=x.message; }
    };
  }

  const signup = document.getElementById('signup');
  if(signup){
    signup.onclick = async()=>{
      const email=document.getElementById('email').value.trim();
      const password=document.getElementById('password').value;
      const msg=document.getElementById('authmsg');
      if(!email||password.length<6){msg.className='msg err';msg.textContent='Informe e-mail e senha de pelo menos 6 caracteres.';return}
      try{
        const r=await fetch(URL+'/auth/v1/signup',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
        const text=await r.text();let d;try{d=text?JSON.parse(text):null}catch{d=text}
        if(!r.ok)throw new Error(d?.msg||d?.message||d?.error_description||text||'Erro ao criar acesso');
        if(d?.access_token){saveSession(d);document.getElementById('login').classList.add('hidden');document.getElementById('system').classList.remove('hidden');await load()}
        else{msg.className='msg oktxt';msg.textContent='Conta criada. Confirme seu e-mail.'}
      }catch(x){msg.className='msg err';msg.textContent=x.message}
    };
  }

  const logout=document.getElementById('logout');
  if(logout){logout.onclick=()=>{localStorage.removeItem(ACCESS_KEY);localStorage.removeItem(REFRESH_KEY);token='';location.reload()}}
})();
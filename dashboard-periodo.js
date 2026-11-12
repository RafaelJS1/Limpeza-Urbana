// Dashboard por período: cards do dia + gráficos/tabela do mês atual
(()=>{
  const baseRender=render;
  const isoLocal=d=>{
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const currentMonthPrefix=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-`};
  const currentMonthRegs=()=>DB.registros.filter(r=>String(r.data||'').startsWith(currentMonthPrefix()));
  const todayRegs=()=>{const hoje=isoLocal(new Date());return DB.registros.filter(r=>r.data===hoje)};

  function ensureRoutePanel(){
    if(document.getElementById('routeProgressPanel')) return;
    const dash=document.getElementById('dashboard'),cards=document.getElementById('dashcards');
    if(!dash||!cards) return;
    const panel=document.createElement('div');
    panel.id='routeProgressPanel';panel.className='panel';panel.style.marginBottom='16px';
    panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><h2 style="margin:0 0 4px">Cumprimento da rota mensal</h2><p class="hint" style="margin:0">100% = todos os setores ativos concluídos uma vez no mês.</p></div><span class="datebox" id="routeMonthLabel"></span></div><div id="routeProgressList" style="display:grid;gap:14px;margin-top:16px"></div>';
    const cols=dash.querySelector('.cols');if(cols)dash.insertBefore(panel,cols);else cards.after(panel);
  }

  function renderRouteProgress(mes,equipesAtivas){
    ensureRoutePanel();
    const list=document.getElementById('routeProgressList'),label=document.getElementById('routeMonthLabel');
    if(!list)return;
    const now=new Date();
    if(label)label.textContent=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const concluidos=mes.filter(r=>r.situacao_setor==='concluido'&&r.situacao!=='multirao'&&r.setor_id);
    list.innerHTML=equipesAtivas.map(e=>{
      const setores=DB.setores.filter(s=>s.equipe_id===e.id&&s.ativo!==false);
      const total=setores.length;
      const contagem=new Map();
      concluidos.filter(r=>r.equipe_id===e.id).forEach(r=>contagem.set(r.setor_id,(contagem.get(r.setor_id)||0)+1));
      const passagens=setores.reduce((sum,s)=>sum+(contagem.get(s.id)||0),0);
      const percentual=total?passagens/total*100:0,barra=Math.min(100,percentual);
      const detalhes=total?setores.map(s=>'<span style="display:inline-block;background:#f1f5f9;border-radius:20px;padding:4px 8px;margin:3px;font-size:11px">'+esc(s.nome)+': <b>'+(contagem.get(s.id)||0)+'x</b></span>').join(''):'<span class="hint">Nenhum setor ativo vinculado a esta equipe.</span>';
      return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:13px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>'+esc(e.nome)+'</b><strong style="font-size:22px;color:#087f5b">'+(total?fmt(percentual):'0')+'%</strong></div><div style="height:10px;background:#edf2f7;border-radius:20px;overflow:hidden;margin:9px 0"><div style="height:100%;width:'+barra+'%;background:#10a36a;border-radius:20px"></div></div><div class="hint">'+passagens+' passagens concluídas de '+total+' previstas • '+(total?fmt(passagens/total):'0')+' ciclo(s) de rota</div><div style="margin-top:7px">'+detalhes+'</div></div>';
    }).join('')||'<p class="hint">Nenhuma equipe ativa cadastrada.</p>';
  }

  function renderDashboardPeriods(){
    const mes=currentMonthRegs(),hoje=todayRegs();
    const viagensHoje=hoje.reduce((a,r)=>a+Number(r.viagens||0),0);
    const volumeHoje=hoje.reduce((a,r)=>a+Number(r.volume||0),0);
    const setoresMes=new Set(mes.map(r=>r.setor_id).filter(Boolean)).size;
    if($('dashcards')) $('dashcards').innerHTML=[
      ['Viagens hoje',viagensHoje,'green'],['Volume removido hoje',fmt(volumeHoje)+' m³','blue'],
      ['Equipes em operação',DB.equipes.filter(e=>e.ativo).length,'purple'],['Setores atendidos no mês',setoresMes,'orange']
    ].map(x=>`<div class="card"><div class="label ${x[2]}">${x[0]}</div><div class="num ${x[2]}">${x[1]}</div><div class="sub">Atualização automática</div></div>`).join('');

    const equipesAtivas=DB.equipes.filter(e=>e.ativo!==false);
    const vals=equipesAtivas.map(e=>mes.filter(r=>r.equipe_id===e.id).reduce((a,r)=>a+Number(r.viagens||0),0));
    renderRouteProgress(mes,equipesAtivas);
    const mx=Math.max(1,...vals);
    if($('bars')) $('bars').innerHTML=equipesAtivas.map((e,i)=>`<div class="barwrap"><div class="bar" style="height:${Math.max(3,vals[i]/mx*145)}px"><b>${vals[i]}</b></div><span>${esc(e.nome)}</span></div>`).join('')||'<p class="hint">Nenhuma equipe ativa cadastrada.</p>';

    const days={};mes.forEach(r=>days[r.data]=(days[r.data]||0)+Number(r.volume||0));
    const arr=Object.entries(days).sort(),max=Math.max(1,...arr.map(x=>x[1]));
    const pts=arr.length?arr.map((x,i)=>`${i/Math.max(1,arr.length-1)*500},${165-x[1]/max*135}`).join(' '):'0,165 500,165';
    if($('volumeLine')) $('volumeLine').setAttribute('points',pts);
    if($('volumeArea')) $('volumeArea').setAttribute('points','0,180 '+pts+' 500,180');
    if($('prodTable')) $('prodTable').innerHTML=equipesAtivas.map(e=>{
      const rr=mes.filter(r=>r.equipe_id===e.id);
      const v=rr.reduce((a,r)=>a+Number(r.viagens||0),0),m=rr.reduce((a,r)=>a+Number(r.volume||0),0);
      const ss=new Set(rr.map(r=>r.setor_id).filter(Boolean)).size,dias=new Set(rr.map(r=>r.data)).size;
      return `<tr><td>${esc(e.nome)}</td><td>${v}</td><td>${fmt(m)}</td><td>${ss}</td><td>${dias?fmt(m/dias):0} m³</td></tr>`;
    }).join('');
  }
  render=function(){baseRender();renderDashboardPeriods()};
  window.render=render;
})();
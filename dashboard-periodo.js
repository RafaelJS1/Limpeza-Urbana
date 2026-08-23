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

  function renderDashboardPeriods(){
    const mes=currentMonthRegs(),hoje=todayRegs();
    const viagensHoje=hoje.reduce((a,r)=>a+Number(r.viagens||0),0);
    const volumeHoje=hoje.reduce((a,r)=>a+Number(r.volume||0),0);
    const setoresMes=new Set(mes.map(r=>r.setor_id).filter(Boolean)).size;

    if($('dashcards')) $('dashcards').innerHTML=[
      ['Viagens hoje',viagensHoje,'green'],
      ['Volume removido hoje',fmt(volumeHoje)+' m³','blue'],
      ['Equipes em operação',DB.equipes.filter(e=>e.ativo).length,'purple'],
      ['Setores atendidos no mês',setoresMes,'orange']
    ].map(x=>`<div class="card"><div class="label ${x[2]}">${x[0]}</div><div class="num ${x[2]}">${x[1]}</div><div class="sub">Atualização automática</div></div>`).join('');

    const vals=DB.equipes.map(e=>mes.filter(r=>r.equipe_id===e.id).reduce((a,r)=>a+Number(r.viagens||0),0));
    const mx=Math.max(1,...vals);
    if($('bars')) $('bars').innerHTML=DB.equipes.map((e,i)=>`<div class="barwrap"><div class="bar" style="height:${Math.max(3,vals[i]/mx*145)}px"><b>${vals[i]}</b></div><span>${esc(e.nome)}</span></div>`).join('');

    const days={};mes.forEach(r=>days[r.data]=(days[r.data]||0)+Number(r.volume||0));
    const arr=Object.entries(days).sort(),max=Math.max(1,...arr.map(x=>x[1]));
    const pts=arr.length?arr.map((x,i)=>`${i/Math.max(1,arr.length-1)*500},${165-x[1]/max*135}`).join(' '):'0,165 500,165';
    if($('volumeLine')) $('volumeLine').setAttribute('points',pts);
    if($('volumeArea')) $('volumeArea').setAttribute('points','0,180 '+pts+' 500,180');

    if($('prodTable')) $('prodTable').innerHTML=DB.equipes.map(e=>{
      const rr=mes.filter(r=>r.equipe_id===e.id);
      const v=rr.reduce((a,r)=>a+Number(r.viagens||0),0),m=rr.reduce((a,r)=>a+Number(r.volume||0),0);
      const ss=new Set(rr.map(r=>r.setor_id).filter(Boolean)).size;
      const dias=new Set(rr.map(r=>r.data)).size;
      return `<tr><td>${esc(e.nome)}</td><td>${v}</td><td>${fmt(m)}</td><td>${ss}</td><td>${dias?fmt(m/dias):0} m³</td></tr>`;
    }).join('');
  }

  render=function(){baseRender();renderDashboardPeriods()};
  window.render=render;
})();
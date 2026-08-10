// v7 UI: expose lunch, dinner, and dessert boards and make cloning generic.
function countTerminalNodesV7(node){
  if(!node)return 0;
  if(node.terminal||!(node.children?.length))return 1;
  return node.children.reduce((sum,child)=>sum+countTerminalNodesV7(child),0);
}
function renderHome(){
  const due=Object.values(reviewState).filter(x=>x.status==='again'||(x.due&&x.due<=Date.now())).length;
  const courseCards=COURSES.map(c=>`<button class="card clickable" style="--card-accent:${c.accent}" data-go="#/course/${c.id}"><div class="eyebrow">STUDY COURSE · ${c.chapters.length} CHAPTERS</div><h3>${c.title}</h3><p>${c.desc}</p><div class="chips"><span class="chip">CHAPTER SPINE</span><span class="chip">정의·정리·증명</span></div></button>`).join('');
  const exampleCards=HUB_MAPS.map(m=>`<button class="card clickable" style="--card-accent:${m.accent}" data-go="#/map/${m.id}"><div class="eyebrow">DECISION HUB · DATA/TREND</div><h3>${m.title}</h3><p>${m.description}</p><div class="chips"><span class="chip">중앙 허브 + 8가지</span><span class="chip">${countTerminalNodesV7(m.root)} FINAL OPTIONS</span></div></button>`).join('');
  const personals=personalBoards.map(b=>`<article class="card clickable" style="--card-accent:#2f5d62" data-go="#/personal/${b.id}"><button class="iconbtn" style="position:absolute;right:11px;top:11px;width:30px;height:30px;z-index:2" data-delete-board="${b.id}" aria-label="삭제">✕</button><div class="eyebrow">PERSONAL HUB 9ⁿ</div><h3>${esc(b.title)}</h3><p>${Object.keys(b.nodes||{}).length}개의 노드 · 모든 화면이 중앙 허브 구조</p></article>`).join('');
  const mapButtons=HUB_MAPS.map(m=>`<button class="pillbtn" data-go="#/map/${m.id}">${m.short} 고르기</button>`).join('');
  const cloneButtons=HUB_MAPS.map(m=>`<button class="pillbtn" data-clone-map="${m.id}">+ ${m.short} 복제</button>`).join('');
  app.innerHTML=`${topbar('')}<section class="hero"><div class="hero-main"><div class="kicker">UNIVERSAL HUB MAP · VERSION 7</div><h1>중심에서 가지로, 마지막에는 선택지로</h1><p>수학 개념은 챕터 축으로 이어가고, 점심·저녁·디저트처럼 분류하고 결정하는 문제는 중앙 허브에서 여덟 갈래로 내려갑니다. 모든 개인 보드도 같은 허브 구조를 사용합니다.</p><div class="hero-actions"><button class="primarybtn" data-go="#/course/la">선형대수 시작</button>${mapButtons}<button class="pillbtn" data-new-board>새 허브 보드</button></div></div><aside class="hero-side"><div><div class="kicker">CENTER TILE IS AN ACTION</div><div class="big">8 + 1</div><h2>주변 8가지와 클릭 가능한 중앙 허브</h2><p>학습 보드에서는 다음 챕터로, 결정판에서는 데이터 가중 랜덤으로, 개인 보드에서는 편집 또는 최종 선택으로 작동합니다.</p></div><button class="pillbtn" data-review>복습 ${due?`(${due})`:''}</button></aside></section><div class="section-head"><h2>학습 보드</h2><p>챕터 순서와 개념 깊이를 동시에 유지합니다.</p></div><section class="card-grid">${courseCards}</section><div class="section-head"><h2>결정 보드</h2><p>점심·저녁·디저트를 충분한 후보와 상대 가중치로 고릅니다.</p></div><section class="card-grid">${exampleCards}</section><div class="hero-actions">${cloneButtons}</div><div class="section-head"><h2>내 허브 보드</h2><p>자유형 없이 모든 보드가 중앙 허브 + 주변 8가지입니다.</p></div><section class="card-grid">${personals||'<div class="card"><h3 style="font-size:21px">아직 개인 보드가 없습니다</h3><p>빈 허브 보드를 만들거나 결정판 예시를 복제해보세요.</p></div>'}</section><div class="hero-actions"><button class="primarybtn" data-new-board>+ 새 허브 보드</button>${cloneButtons}</div>`;
}
function renderMap(r){
  const current=findMapNode(r.map.root,r.path)||r.map.root;
  const children=current.terminal?[]:(current.children||[]);
  const center=current.terminal?{label:'이 메뉴로 결정',confirm:true}:{label:'🎲 이 허브에서 고르기',random:true};
  const crumbs=[{label:r.map.short,go:`#/map/${r.map.id}`}];
  let path=[];
  for(const part of r.path){
    path.push(part);
    crumbs.push({label:decodeURIComponent(part),go:`#/map/${r.map.id}/${path.join('/')}`});
  }
  const terminal=current.terminal?`<div class="terminal-callout"><strong>${esc(current.title)}</strong><p>이 노드는 더 나누지 않는 최종 선택지입니다.</p></div>`:'';
  const basis=current.dataBasis?`<div class="note"><b>데이터 기준</b><p>${esc(current.dataBasis.note||'공개 소비·주문 자료를 상대 가중치로 반영했습니다.')}</p></div>`:'';
  app.innerHTML=`${topbar(r.path.length?`#/map/${r.map.id}/${r.path.slice(0,-1).join('/')}`:'#/')}<div class="crumbs">${renderCrumbs(crumbs)}</div><section class="hub-layout"><div><div class="viewport"><div class="hub-grid">${gridHtml(current,children,center)}</div></div><p class="hint">중앙 큐브를 누르면 현재 분류 아래의 최종 선택지 중 하나를 상대 가중치로 골라줍니다.</p></div><aside class="panel" style="${typeStyle(current.type)}"><span class="badge">${esc(current.terminal?'최종 메뉴':'결정 허브')}</span><h2>${esc(current.title)}</h2><p class="summary">${esc(current.summary||'')}</p>${terminal}${basis}<div class="panel-actions">${!current.terminal?'<button class="primarybtn" data-center-random>🎲 데이터 가중 선택</button>':'<button class="primarybtn" data-center-confirm>이 메뉴로 결정</button>'}<button class="pillbtn" data-clone-map="${r.map.id}">내 보드로 복제</button></div></aside></section>`;
}
function cloneMapBoardV7(mapId){
  const map=HUB_MAPS.find(item=>item.id===mapId);
  if(!map?.root)return toast('결정판 데이터를 찾을 수 없습니다.');
  const id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const board={
    id,
    title:`나의 ${map.title}`,
    note:map.root.summary||map.description||'',
    sourceMapId:map.id,
    nodes:{}
  };
  function flatten(node,path=[]){
    node.children?.slice(0,8).forEach((child,i)=>{
      const p=[...path,SLOT_ORDER[i]];
      board.nodes[p.join(',')]={
        title:child.title,
        note:child.summary||'',
        terminal:!!child.terminal,
        weight:Number(child.weight)||1
      };
      flatten(child,p);
    });
  }
  flatten(map.root);
  personalBoards.push(board);
  savePersonal();
  toast(`${map.short} 결정판을 내 보드로 복제했습니다.`);
  go(`#/personal/${id}`);
}
function cloneLunchBoard(){cloneMapBoardV7('lunch')}
function weightedPersonalTerminalV7(board,path=[]){
  const options=[];
  for(const slot of SLOT_ORDER){
    const p=[...path,slot];
    const node=board.nodes[p.join(',')];
    if(node)options.push({node,path:p,weight:Number(node.weight)||1});
  }
  if(!options.length){
    const node=personalNode(board,path);
    return path.length&&node?{node,path}:null;
  }
  const chosen=weightedChildV6(options.map(item=>Object.assign({},item,{weight:item.weight})));
  if(!chosen)return null;
  if(chosen.node.terminal)return{node:chosen.node,path:chosen.path};
  return weightedPersonalTerminalV7(board,chosen.path);
}
function randomFromPersonal(r){
  const pick=weightedPersonalTerminalV7(r.board,r.path);
  if(!pick)return toast('먼저 최종 선택지를 추가하세요.');
  showChoice(pick.node.title,`${r.board.title}에서 데이터/설정 가중 선택`,`#/personal/${r.board.id}/${pick.path.join('/')}`,()=>randomFromPersonal(r));
}
function randomFromMap(r){
  const current=findMapNode(r.map.root,r.path)||r.map.root;
  const pick=weightedTerminalV6(current,r.path);
  if(!pick)return toast('최종 선택지가 없습니다.');
  showChoice(pick.node.title,`${current.title} · 데이터 가중 랜덤`,`#/map/${r.map.id}/${pick.path.join('/')}`,()=>randomFromMap(r));
}
function bindCommon(){
  app.querySelectorAll('[data-go]').forEach(el=>el.onclick=e=>{e.stopPropagation();go(el.dataset.go)});
  app.querySelectorAll('[data-search]').forEach(el=>el.onclick=openSearch);
  app.querySelectorAll('[data-review]').forEach(el=>el.onclick=openDueReview);
  app.querySelectorAll('[data-new-board]').forEach(el=>el.onclick=createBlankBoard);
  app.querySelectorAll('[data-clone-map]').forEach(el=>el.onclick=e=>{e.stopPropagation();cloneMapBoardV7(el.dataset.cloneMap)});
  app.querySelectorAll('[data-clone-lunch]').forEach(el=>el.onclick=e=>{e.stopPropagation();cloneMapBoardV7('lunch')});
  app.querySelectorAll('[data-delete-board]').forEach(el=>el.onclick=e=>{e.stopPropagation();if(confirm('이 보드를 삭제할까요?')){personalBoards=personalBoards.filter(b=>b.id!==el.dataset.deleteBoard);savePersonal();render()}});
  const r=parseRoute();
  if(r.view==='chapter'){
    app.querySelectorAll('[data-child]').forEach(el=>el.onclick=()=>go(`#/course/${r.course.id}/${r.chapter.id}/${[...r.path,el.dataset.child].join('/')}`));
    app.querySelectorAll('[data-status]').forEach(el=>el.onclick=()=>{
      const key=`${r.course.id}/${r.chapter.id}/${r.path.join('/')}`;
      const status=el.dataset.status;
      const node=findStudyNode(r.chapter,r.path);
      reviewState[key]={status,due:status==='again'?Date.now()+86400000:Date.now()+7*86400000,route:location.hash,title:node?.title};
      saveReview();
      render();
    });
    const reveal=app.querySelector('[data-reveal]');
    if(reveal)reveal.onclick=()=>{
      const ans=app.querySelector('.answer');
      ans.classList.toggle('show');
      reveal.textContent=ans.classList.contains('show')?'정답 숨기기':'정답 보기';
    };
  }
  if(r.view==='map'){
    app.querySelectorAll('[data-child]').forEach(el=>el.onclick=()=>go(`#/map/${r.map.id}/${[...r.path,el.dataset.child].join('/')}`));
    app.querySelectorAll('[data-center-random]').forEach(el=>el.onclick=()=>randomFromMap(r));
    app.querySelectorAll('[data-center-confirm]').forEach(el=>el.onclick=()=>showChoice((findMapNode(r.map.root,r.path)||r.map.root).title,'선택 완료',location.hash));
  }
  if(r.view==='personal'){
    app.querySelectorAll('[data-personal-child]').forEach(el=>el.onclick=()=>go(`#/personal/${r.board.id}/${[...r.path,Number(el.dataset.personalChild)].join('/')}`));
    app.querySelectorAll('[data-add-slot]').forEach(el=>el.onclick=()=>{
      const p=[...r.path,Number(el.dataset.addSlot)];
      const key=p.join(',');
      r.board.nodes[key]={title:'새 항목',note:'',terminal:false,weight:1};
      savePersonal();
      go(`#/personal/${r.board.id}/${p.join('/')}`);
    });
    app.querySelectorAll('[data-center-random]').forEach(el=>el.onclick=()=>randomFromPersonal(r));
    app.querySelectorAll('[data-center-confirm]').forEach(el=>el.onclick=()=>showChoice(personalNode(r.board,r.path).title,'선택 완료',location.hash));
    app.querySelectorAll('[data-center-edit]').forEach(el=>el.onclick=()=>document.getElementById('node-title')?.focus());
    const save=app.querySelector('[data-save-node]');
    if(save)save.onclick=()=>savePersonalNode(r);
    const del=app.querySelector('[data-delete-branch]');
    if(del)del.onclick=()=>deletePersonalBranch(r);
  }
}
render();

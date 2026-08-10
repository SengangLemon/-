const app=document.getElementById('app'),modalRoot=document.getElementById('modal-root'),toastEl=document.getElementById('toast');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>encodeURIComponent(String(s).replaceAll('/','-'));
const REVIEW_KEY='nonet:review-v4',PERSONAL_KEY='nonet:personal-v5';
let reviewState={},personalBoards=[];
try{reviewState=JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}')}catch{}
personalBoards=loadPersonalBoards();
function typeStyle(type){const a=T[type]||T.concept;return`--tc:${a[1]};--ts:${a[2]}`}
function savePersonal(){localStorage.setItem(PERSONAL_KEY,JSON.stringify(personalBoards))}
function saveReview(){localStorage.setItem(REVIEW_KEY,JSON.stringify(reviewState))}
function loadPersonalBoards(){
  try{const v5=JSON.parse(localStorage.getItem(PERSONAL_KEY)||'null');if(Array.isArray(v5))return v5.map(normalizeBoard)}catch{}
  for(const key of ['nonet:personal-v4','nonet:personal-v3']){
    try{const old=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(old)){const migrated=old.map(normalizeBoard);localStorage.setItem(PERSONAL_KEY,JSON.stringify(migrated));return migrated}}catch{}
  }
  try{
    const idx=JSON.parse(localStorage.getItem('nonet:boards-index')||'[]');
    const boards=idx.map(meta=>{let raw={};try{raw=JSON.parse(localStorage.getItem('nonet:board:'+meta.id)||'{}')}catch{};const nodes={};for(const [k,v] of Object.entries(raw.nodes||{}))nodes[k]={title:v.label||v.title||'이름 없음',note:v.note||'',terminal:false};return normalizeBoard({id:meta.id,title:meta.title||raw.title||'이전 보드',note:'',nodes})});
    if(boards.length){localStorage.setItem(PERSONAL_KEY,JSON.stringify(boards));return boards}
  }catch{}
  return [];
}
function normalizeBoard(board){
  const b={id:board.id||('p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),title:board.title||'허브 보드',note:board.note||'',nodes:{}};
  for(const [k,v] of Object.entries(board.nodes||{}))b.nodes[k]={title:v.title||v.label||'이름 없음',note:v.note||'',terminal:!!v.terminal};
  return migrateCenterBranches(b);
}
function migrateCenterBranches(board){
  const root={data:null,children:{}};
  for(const [key,data] of Object.entries(board.nodes||{})){
    if(key===''){root.data=data;continue}
    let cur=root;for(const seg of key.split(',').map(Number)){cur.children[seg]=cur.children[seg]||{data:null,children:{}};cur=cur.children[seg]}cur.data=data;
  }
  function normalize(node){
    Object.values(node.children).forEach(normalize);
    if(node.children[4]){
      const free=SLOT_ORDER.find(i=>!node.children[i]);
      if(free!==undefined){node.children[free]=node.children[4]}
      else{const old8=node.children[8];node.children[8]={data:{title:'이전 중앙 가지',note:'자유형 보드의 중앙 가지를 보존하기 위해 자동으로 묶었습니다.',terminal:false},children:{0:old8,1:node.children[4]}}}
      delete node.children[4];
    }
  }
  normalize(root);const out={};
  function flatten(node,path=[]){if(node.data)out[path.join(',')]=node.data;for(const [i,ch] of Object.entries(node.children))flatten(ch,[...path,Number(i)])}
  flatten(root);board.nodes=out;return board;
}
function topbar(back='#/'){
  return`<div class="topbar">${back?`<button class="iconbtn" data-go="${back}" aria-label="뒤로">←</button>`:''}<button class="brand" data-go="#/">Nonet Hub<sup>9ⁿ</sup></button><span class="spacer"></span><button class="pillbtn" data-review>복습</button><button class="pillbtn" data-search>검색</button></div>`
}
function go(hash){location.hash=hash}
function parseRoute(){
  const p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!p.length)return{view:'home'};
  if(p[0]==='course'){
    const course=COURSES.find(c=>c.id===p[1]);if(!course)return{view:'home'};
    if(!p[2])return{view:'course',course};
    const chapter=course.chapters.find(ch=>ch.id===p[2]);if(!chapter)return{view:'course',course};
    return{view:'chapter',course,chapter,path:p.slice(3)};
  }
  if(p[0]==='map'){
    const map=HUB_MAPS.find(m=>m.id===p[1]);return map?{view:'map',map,path:p.slice(2)}:{view:'home'};
  }
  if(p[0]==='personal'){
    const board=personalBoards.find(b=>b.id===p[1]);return board?{view:'personal',board,path:p.slice(2).map(Number)}:{view:'home'};
  }
  return{view:'home'};
}
function render(){
  const r=parseRoute();document.documentElement.style.setProperty('--accent',r.course?.accent||r.map?.accent||'#2f5d62');
  if(r.view==='home')renderHome();else if(r.view==='course')renderCourse(r.course);else if(r.view==='chapter')renderChapter(r);else if(r.view==='map')renderMap(r);else if(r.view==='personal')renderPersonal(r);
  bindCommon();
}
function renderHome(){
  const due=Object.values(reviewState).filter(x=>x.status==='again'||(x.due&&x.due<=Date.now())).length;
  const courseCards=COURSES.map(c=>`<button class="card clickable" style="--card-accent:${c.accent}" data-go="#/course/${c.id}"><div class="eyebrow">STUDY COURSE · ${c.chapters.length} CHAPTERS</div><h3>${c.title}</h3><p>${c.desc}</p><div class="chips"><span class="chip">CHAPTER SPINE</span><span class="chip">정의·정리·증명</span></div></button>`).join('');
  const exampleCards=HUB_MAPS.map(m=>`<button class="card clickable" style="--card-accent:${m.accent}" data-go="#/map/${m.id}"><div class="eyebrow">DECISION HUB · EXAMPLE</div><h3>${m.title}</h3><p>${m.description}</p><div class="chips"><span class="chip">중앙 허브 + 8가지</span><span class="chip">최종 선택 랜덤</span></div></button>`).join('');
  const personals=personalBoards.map(b=>`<article class="card clickable" style="--card-accent:#2f5d62" data-go="#/personal/${b.id}"><button class="iconbtn" style="position:absolute;right:11px;top:11px;width:30px;height:30px;z-index:2" data-delete-board="${b.id}" aria-label="삭제">✕</button><div class="eyebrow">PERSONAL HUB 9ⁿ</div><h3>${esc(b.title)}</h3><p>${Object.keys(b.nodes||{}).length}개의 노드 · 모든 화면이 중앙 허브 구조</p></article>`).join('');
  app.innerHTML=`${topbar('')}<section class="hero"><div class="hero-main"><div class="kicker">UNIVERSAL HUB MAP · VERSION 5</div><h1>중심에서 가지로, 마지막에는 선택지로</h1><p>수학 개념처럼 순서가 있는 지식은 챕터 축으로 이어가고, 점심 메뉴처럼 분류하고 결정하는 문제는 중앙 허브에서 여덟 갈래로 내려갑니다. 모든 개인 보드도 같은 허브 구조를 사용합니다.</p><div class="hero-actions"><button class="primarybtn" data-go="#/course/la">선형대수 시작</button><button class="pillbtn" data-go="#/map/lunch">점심 메뉴 고르기</button><button class="pillbtn" data-new-board>새 허브 보드</button></div></div><aside class="hero-side"><div><div class="kicker">CENTER TILE IS AN ACTION</div><div class="big">8 + 1</div><h2>주변 8가지와 클릭 가능한 중앙 허브</h2><p>챕터에서는 다음 챕터로, 결정판에서는 최종 선택 랜덤으로, 개인 보드에서는 편집 또는 랜덤 선택으로 작동합니다.</p></div><button class="pillbtn" data-review>복습 ${due?`(${due})`:''}</button></aside></section><div class="section-head"><h2>학습 보드</h2><p>챕터 순서와 개념 깊이를 동시에 유지합니다.</p></div><section class="card-grid">${courseCards}</section><div class="section-head"><h2>활용 예시</h2><p>수학이 아닌 결정·분류 문제에도 같은 구조를 씁니다.</p></div><section class="card-grid">${exampleCards}</section><div class="section-head"><h2>내 허브 보드</h2><p>자유형 없이 모든 보드가 중앙 허브 + 주변 8가지입니다.</p></div><section class="card-grid">${personals||'<div class="card"><h3 style="font-size:21px">아직 개인 보드가 없습니다</h3><p>빈 허브 보드를 만들거나 점심 메뉴 예시를 복제해보세요.</p></div>'}</section><div class="hero-actions"><button class="primarybtn" data-new-board>+ 새 허브 보드</button><button class="pillbtn" data-clone-lunch>+ 점심 메뉴판 복제</button></div>`;
}
function renderCourse(course){
  const cards=course.chapters.map((ch,i)=>`<div class="chapter-step"><button class="chapter-card" data-go="#/course/${course.id}/${ch.id}"><div class="chapter-no">CHAPTER ${String(ch.no).padStart(2,'0')}</div><h3>${ch.title}</h3><p>${ch.sub}</p></button>${i<course.chapters.length-1?'<i class="connector"></i>':''}</div>`).join('');
  app.innerHTML=`${topbar('#/')}<section class="course-hero"><div class="kicker">${course.chapters.length} CHAPTERS · SEQUENTIAL HUBS</div><h1>${course.title}</h1><p>${course.desc}. 챕터 화면의 중앙 큐브를 누르면 다음 챕터로 이동합니다.</p><div class="course-tools"><button class="primarybtn" data-go="#/course/${course.id}/${course.chapters[0].id}">Chapter 1 시작</button><button class="pillbtn" data-search>전체 검색</button></div></section><div class="section-head"><h2>Chapter spine</h2><p>왼쪽에서 오른쪽으로 진행됩니다.</p></div><section class="chapter-track">${cards}</section>`;
}
function findStudyNode(chapter,path){let arr=chapter.concepts,node=null;for(const part of path){node=arr.find(x=>slug(x.title)===part);if(!node)return null;arr=node.children||[]}return node}
function flattenStudyPaths(nodes,prefix=[],out=[]){for(const node of nodes){const p=[...prefix,slug(node.title)];out.push(p);if(node.children?.length)flattenStudyPaths(node.children,p,out)}return out}
function studyCenterAction(r){
  if(!r.path.length){const i=r.course.chapters.findIndex(ch=>ch.id===r.chapter.id);const next=r.course.chapters[i+1];return next?{label:`다음 · Ch.${next.no}`,go:`#/course/${r.course.id}/${next.id}`}:{label:'과목 목차로',go:`#/course/${r.course.id}`}}
  const paths=flattenStudyPaths(r.chapter.concepts);const idx=paths.findIndex(p=>p.join('/')===r.path.join('/'));if(idx>=0&&paths[idx+1])return{label:'다음 개념',go:`#/course/${r.course.id}/${r.chapter.id}/${paths[idx+1].join('/')}`};
  const ci=r.course.chapters.findIndex(ch=>ch.id===r.chapter.id),next=r.course.chapters[ci+1];return next?{label:`다음 · Ch.${next.no}`,go:`#/course/${r.course.id}/${next.id}`}:{label:'과목 목차로',go:`#/course/${r.course.id}`};
}
function renderCrumbs(parts){return parts.map((p,i)=>`${i?'<span class="crumb-arrow">›</span>':''}<button class="crumb" data-go="${p.go}">${esc(p.label)}</button>`).join('')}
function gridHtml(current,children,center){const cells=Array(9).fill(null);children.slice(0,8).forEach((x,i)=>cells[SLOT_ORDER[i]]=x);return cells.map((child,i)=>i===4?`<button class="tile center" style="${typeStyle(current?.type||'concept')}" ${center.go?`data-go="${center.go}"`:center.random?'data-center-random':center.confirm?'data-center-confirm':'data-center-edit'}><span class="badge">${esc(current?.terminal?'최종 선택':current?T[current.type]?.[0]||'허브':'허브')}</span><h3>${esc(current?.title||center.title)}</h3><span class="center-action">${esc(center.label)}</span></button>`:child?`<button class="tile" style="${typeStyle(child.type||'concept')}" data-child="${slug(child.title)}"><span class="badge">${esc(child.terminal?'최종 선택':T[child.type]?.[0]||'가지')}</span><h3>${esc(child.title)}</h3>${child.children?.length?`<span class="child-count">${child.children.length}</span>`:''}</button>`:`<div class="tile empty"><span class="badge">EMPTY</span><h3>비어 있음</h3></div>`).join('')}
function renderChapter(r){
  const node=findStudyNode(r.chapter,r.path),children=node?(node.children||[]):r.chapter.concepts,current=node||{title:r.chapter.title,type:'concept',summary:r.chapter.sub};const center=studyCenterAction(r),key=`${r.course.id}/${r.chapter.id}/${r.path.join('/')}`,rv=reviewState[key]||{};
  const crumbs=[{label:r.course.short,go:`#/course/${r.course.id}`},{label:`Ch.${r.chapter.no} ${r.chapter.title}`,go:`#/course/${r.course.id}/${r.chapter.id}`}];let path=[];for(const part of r.path){path.push(part);crumbs.push({label:decodeURIComponent(part),go:`#/course/${r.course.id}/${r.chapter.id}/${path.join('/')}`})}
  const notes=node?`${node.statement?`<div class="note theorem"><b>정리</b><p>${esc(node.statement)}</p></div>`:''}${node.proof?`<div class="note proof"><b>증명 포인트</b><p>${esc(node.proof)}</p></div>`:''}${node.type==='warning'?`<div class="note warning"><b>주의</b><p>${esc(node.summary)}</p></div>`:''}`:`<div class="note"><b>허브 구조</b><p>중앙은 현재 챕터입니다. 주변 8칸은 핵심 개념이며, 중앙을 누르면 다음 챕터로 넘어갑니다.</p></div>`;
  const recall=node?.quiz?`<div class="recall"><div class="recall-q">${esc(node.quiz)}</div><button class="pillbtn" data-reveal>정답 보기</button><div class="answer">${esc(node.answer||'')}</div></div>`:'';
  app.innerHTML=`${topbar(r.path.length?`#/course/${r.course.id}/${r.chapter.id}/${r.path.slice(0,-1).join('/')}`:`#/course/${r.course.id}`)}<div class="crumbs">${renderCrumbs(crumbs)}</div><section class="hub-layout"><div><div class="viewport"><div class="hub-grid">${gridHtml(current,children,center)}</div></div><p class="hint">주변 개념을 눌러 내려가거나 중앙 큐브로 다음 순서를 진행하세요.</p></div><aside class="panel" style="${typeStyle(current.type)}"><span class="badge">${esc(node?T[node.type]?.[0]||'개념':'CHAPTER HUB')}</span><h2>${esc(current.title)}</h2><p class="summary">${esc(current.summary||r.chapter.sub)}</p>${notes}${recall}${node?`<div class="review-actions"><button data-status="again" class="${rv.status==='again'?'active':''}">↺ 다시 보기</button><button data-status="known" class="${rv.status==='known'?'active':''}">✓ 이해함</button></div>`:''}</aside></section>`;
}
function findMapNode(root,path){let node=root;for(const part of path){node=(node.children||[]).find(x=>slug(x.title)===part);if(!node)return null}return node}
function collectTerminals(node,path=[],out=[]){if(!node)return out;if(node.terminal||!(node.children?.length)){out.push({node,path});return out}for(const ch of node.children)collectTerminals(ch,[...path,slug(ch.title)],out);return out}
function renderMap(r){
  const current=findMapNode(r.map.root,r.path)||r.map.root,children=current.terminal?[]:(current.children||[]);const center=current.terminal?{label:'이 메뉴로 결정',confirm:true}:{label:'🎲 이 허브에서 고르기',random:true};
  const crumbs=[{label:r.map.short,go:`#/map/${r.map.id}`}];let path=[];for(const part of r.path){path.push(part);crumbs.push({label:decodeURIComponent(part),go:`#/map/${r.map.id}/${path.join('/')}`})}
  const terminal=current.terminal?`<div class="terminal-callout"><strong>${esc(current.title)}</strong><p>이 노드는 더 나누지 않는 최종 메뉴입니다.</p></div>`:'';
  app.innerHTML=`${topbar(r.path.length?`#/map/${r.map.id}/${r.path.slice(0,-1).join('/')}`:'#/')}<div class="crumbs">${renderCrumbs(crumbs)}</div><section class="hub-layout"><div><div class="viewport"><div class="hub-grid">${gridHtml(current,children,center)}</div></div><p class="hint">중앙 큐브를 누르면 현재 분류 아래의 최종 메뉴 중 하나를 골라줍니다.</p></div><aside class="panel" style="${typeStyle(current.type)}"><span class="badge">${esc(current.terminal?'최종 메뉴':'결정 허브')}</span><h2>${esc(current.title)}</h2><p class="summary">${esc(current.summary||'')}</p>${terminal}<div class="panel-actions">${!current.terminal?'<button class="primarybtn" data-center-random>🎲 랜덤 선택</button>':'<button class="primarybtn" data-center-confirm>이 메뉴로 결정</button>'}<button class="pillbtn" data-clone-lunch>내 보드로 복제</button></div></aside></section>`;
}

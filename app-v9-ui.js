// v9: public template gallery + browser-local private study UI.
(function installV9UI(global){
  'use strict';

  // A category with no children is an unfinished branch, not an implicit final choice.
  if(typeof collectPersonalTerminals==='function'){
    collectPersonalTerminals=function collectExplicitPersonalTerminals(board,path=[],out=[]){
      for(const slot of SLOT_ORDER){
        const p=[...path,slot];
        const node=board.nodes[p.join(',')];
        if(!node)continue;
        if(node.terminal){out.push({node,path:p});continue;}
        collectExplicitPersonalTerminals(board,p,out);
      }
      return out;
    };
  }

  if(typeof weightedPersonalTerminalV7==='function'){
    weightedPersonalTerminalV7=function weightedExplicitPersonalTerminal(board,path=[]){
      const options=[];
      for(const slot of SLOT_ORDER){
        const p=[...path,slot];
        const node=board.nodes[p.join(',')];
        if(node)options.push({node,path:p,weight:Number(node.weight)||1});
      }
      if(!options.length){
        const node=personalNode(board,path);
        return node?.terminal?{node,path}:null;
      }
      const viable=options.filter(item=>item.node.terminal||SLOT_ORDER.some(slot=>board.nodes[[...item.path,slot].join(',')]));
      if(!viable.length)return null;
      const chosen=weightedChildV6(viable.map(item=>Object.assign({},item,{weight:item.weight})));
      if(!chosen)return null;
      if(chosen.node.terminal)return{node:chosen.node,path:chosen.path};
      return weightedExplicitPersonalTerminal(board,chosen.path);
    };
  }

  function templateCard(template){
    const branches=template.branches.map(branch=>`<span class="chip">${esc(branch)}</span>`).join('');
    return`<article class="card" style="--card-accent:${template.accent}">
      <div class="eyebrow">STARTER TEMPLATE · EMPTY INSIDE</div>
      <h3>${esc(template.title)}</h3>
      <p>${esc(template.description)}</p>
      <div class="chips">${branches}</div>
      <div class="hero-actions"><button class="pillbtn" data-clone-template="${template.id}">복제해서 시작</button></div>
    </article>`;
  }

  function privateStudySection(){
    if(COURSES.length){
      const meta=global.NONET_PRIVATE_STUDY_META;
      const cards=COURSES.map(course=>`<button class="card clickable" style="--card-accent:${course.accent||'#5d607d'}" data-go="#/course/${course.id}">
        <div class="eyebrow">PRIVATE · THIS BROWSER ONLY</div>
        <h3>${esc(course.title)}</h3>
        <p>${esc(course.desc||'개인 학습팩')}</p>
        <div class="chips"><span class="chip">${course.chapters?.length||0} CHAPTERS</span><span class="chip">localStorage</span></div>
      </button>`).join('');
      return`<div class="section-head"><h2>내 학습 보드</h2><p>${esc(meta?.title||'개인 학습팩')} · 이 브라우저에서만 보입니다.</p></div>
        <section class="card-grid">${cards}</section>
        <div class="hero-actions"><button class="pillbtn" data-import-study>학습팩 교체</button><button class="ghostbtn" data-export-study>학습팩 내보내기</button><button class="ghostbtn" data-clear-study>이 브라우저에서 제거</button></div>`;
    }
    return`<div class="section-head"><h2>개인 학습팩</h2><p>개인 파일을 가져오면 이 브라우저에서만 학습 보드가 나타납니다.</p></div>
      <section class="card-grid"><article class="card" style="--card-accent:#5d607d"><div class="eyebrow">PRIVATE · OPTIONAL</div><h3>내 학습 자료 가져오기</h3><p>공용 앱에는 학습 내용이 포함되지 않습니다. 개인 Nonet 학습팩 JSON을 가져오면 기기 로컬에만 저장됩니다.</p><div class="hero-actions"><button class="primarybtn" data-import-study>학습팩 가져오기</button></div></article></section>`;
  }

  renderHome=function renderHomeV9(){
    const due=Object.values(reviewState).filter(item=>item.status==='again'||(item.due&&item.due<=Date.now())).length;
    const decisionCards=HUB_MAPS.map(map=>`<button class="card clickable" style="--card-accent:${map.accent}" data-go="#/map/${map.id}">
      <div class="eyebrow">BUILT-IN · BUNDLED WITH APP</div>
      <h3>${esc(map.title)}</h3><p>${esc(map.description)}</p>
      <div class="chips"><span class="chip">오프라인 내장</span><span class="chip">연간 업데이트</span></div>
    </button>`).join('');
    const templateCards=(global.NONET_GUIDE_TEMPLATES||[]).map(templateCard).join('');
    const personals=personalBoards.map(board=>`<article class="card clickable" style="--card-accent:#2f5d62" data-go="#/personal/${board.id}">
      <button class="iconbtn" style="position:absolute;right:11px;top:11px;width:30px;height:30px;z-index:2" data-delete-board="${board.id}" aria-label="삭제">✕</button>
      <div class="eyebrow">MY HUB · THIS BROWSER</div><h3>${esc(board.title)}</h3><p>${Object.keys(board.nodes||{}).length}개의 노드 · localStorage</p>
    </article>`).join('');
    const quickDecision=HUB_MAPS.map(map=>`<button class="pillbtn" data-go="#/map/${map.id}">${esc(map.short)} 고르기</button>`).join('');

    app.innerHTML=`${topbar('')}
      <section class="hero"><div class="hero-main"><div class="kicker">NONET HUB · PUBLIC + PRIVATE</div>
        <h1>하나의 질문을 8개의 가지로 나누기</h1>
        <p>앱에 기본 포함되는 결정판은 누구에게나 같고, 직접 만드는 보드와 개인 학습팩은 각 브라우저에만 저장됩니다. 아래 빈 템플릿을 복제하면 여행·구매·프로젝트·운동 등 여러 용도로 바로 시작할 수 있습니다.</p>
        <div class="hero-actions">${quickDecision}<button class="primarybtn" data-new-board>+ 빈 허브 만들기</button></div>
      </div><aside class="hero-side"><div><div class="kicker">PUBLIC VS PRIVATE</div><div class="big">3 + ∞</div><h2>기본 결정판 3개, 개인 보드는 원하는 만큼</h2><p>점심·저녁·디저트만 앱에 하드코딩됩니다. 개인 보드와 학습팩은 기기 로컬에 머뭅니다.</p></div><button class="pillbtn" data-review>복습 ${due?`(${due})`:''}</button></aside></section>

      <div class="section-head"><h2>기본 결정판</h2><p>앱과 함께 배포되는 공용 데이터입니다.</p></div>
      <section class="card-grid">${decisionCards}</section>

      <div class="section-head"><h2>무엇을 만들 수 있나요?</h2><p>8개 방향만 제시된 빈 템플릿입니다. 복제한 뒤 자유롭게 내려가세요.</p></div>
      <section class="card-grid">${templateCards}</section>

      ${privateStudySection()}

      <div class="section-head"><h2>내 허브 보드</h2><p>여기서 만든 보드는 다른 사용자에게 보이지 않습니다.</p></div>
      <section class="card-grid">${personals||'<div class="card"><h3 style="font-size:21px">아직 개인 보드가 없습니다</h3><p>위 템플릿을 복제하거나 빈 허브를 만들어 시작하세요.</p></div>'}</section>
      <div class="hero-actions"><button class="primarybtn" data-new-board>+ 새 허브 보드</button></div>`;
  };

  function cloneTemplate(templateId){
    const template=(global.NONET_GUIDE_TEMPLATES||[]).find(item=>item.id===templateId);
    if(!template)return toast('템플릿을 찾을 수 없습니다.');
    const id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    const board={id,title:template.title,note:template.description,sourceTemplateId:template.id,nodes:{}};
    template.branches.slice(0,8).forEach((title,index)=>{
      const slot=SLOT_ORDER[index];
      board.nodes[String(slot)]={
        title,
        note:`${title}에 필요한 항목을 아래 가지에 추가하세요.`,
        terminal:false,
        weight:1
      };
    });
    personalBoards.push(board);
    savePersonal();
    toast(`${template.title} 템플릿을 내 보드에 만들었습니다.`);
    go(`#/personal/${id}`);
  }

  function chooseStudyPackFile(){
    const input=document.createElement('input');
    input.type='file';
    input.accept='.json,.nonet,application/json';
    input.onchange=async()=>{
      const file=input.files?.[0];
      if(!file)return;
      try{
        const text=await file.text();
        const meta=global.importNonetPrivateStudyPack(text);
        toast(`${meta.courseCount}개 개인 학습 보드를 가져왔습니다.`);
        render();
      }catch(error){
        console.error(error);
        alert(`학습팩을 가져오지 못했습니다.\n${error.message||error}`);
      }
    };
    input.click();
  }

  function exportStudyPack(){
    const text=global.exportNonetPrivateStudyPack?.();
    if(!text)return toast('내보낼 개인 학습팩이 없습니다.');
    const blob=new Blob([text],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='nonet-private-study-pack.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const previousBind=bindCommon;
  bindCommon=function bindCommonV9(){
    previousBind();
    app.querySelectorAll('[data-clone-template]').forEach(button=>button.onclick=()=>cloneTemplate(button.dataset.cloneTemplate));
    app.querySelectorAll('[data-import-study]').forEach(button=>button.onclick=chooseStudyPackFile);
    app.querySelectorAll('[data-export-study]').forEach(button=>button.onclick=exportStudyPack);
    app.querySelectorAll('[data-clear-study]').forEach(button=>button.onclick=()=>{
      if(!confirm('이 브라우저에서 개인 학습팩을 제거할까요? 복습 기록은 그대로 남습니다.'))return;
      global.clearNonetPrivateStudyPack?.();
      toast('개인 학습팩을 제거했습니다.');
      go('#/');render();
    });
  };

  // Public search remains useful; private courses automatically join it only after import.
  render();
})(window);

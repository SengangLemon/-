// v10: preserve private-board metadata needed for cloud sync and annual snapshots.
(function installNonetModelV10(){
  'use strict';

  const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));

  normalizeBoard=function normalizeBoardV10(board){
    const raw=copy(board)||{};
    const normalized={
      ...raw,
      id:raw.id||('p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
      title:raw.title||'허브 보드',
      note:raw.note||'',
      nodes:{}
    };

    for(const [key,value] of Object.entries(raw.nodes||{})){
      const node=value&&typeof value==='object'?value:{};
      normalized.nodes[key]={
        ...node,
        title:node.title||node.label||'이름 없음',
        note:node.note||'',
        terminal:Boolean(node.terminal),
        weight:Number(node.weight)||1
      };
    }

    return typeof migrateCenterBranches==='function'?migrateCenterBranches(normalized):normalized;
  };

  personalBoards.splice(0,personalBoards.length,...personalBoards.map(normalizeBoard));
  localStorage.setItem(PERSONAL_KEY,JSON.stringify(personalBoards));

  if(typeof savePersonalNode==='function'){
    savePersonalNode=function savePersonalNodeV10(route){
      const title=document.getElementById('node-title').value.trim()||'이름 없음';
      const note=document.getElementById('node-note').value;
      const terminal=Boolean(document.getElementById('node-terminal')?.checked);
      const stamp=Date.now();

      if(!route.path.length){
        route.board.title=title;
        route.board.note=note;
        route.board.updatedAt=stamp;
      }else{
        const key=route.path.join(',');
        route.board.nodes[key]={
          ...(route.board.nodes[key]||{}),
          title,
          note,
          terminal,
          weight:Number(route.board.nodes[key]?.weight)||1,
          updatedAt:stamp
        };
        route.board.updatedAt=stamp;
      }

      savePersonal();
      toast('저장했습니다.');
      render();
    };
  }
})();

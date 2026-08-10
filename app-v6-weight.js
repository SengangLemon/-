// v6 weighted random: choose recursively so category probability is not inflated
// merely because a branch contains more terminal menu leaves.
function weightedChildV6(children){
  const usable=(children||[]).filter(Boolean);
  if(!usable.length)return null;
  const total=usable.reduce((s,x)=>s+(Number(x.weight)||1),0);
  let r=Math.random()*total;
  for(const child of usable){
    r-=Number(child.weight)||1;
    if(r<=0)return child;
  }
  return usable[usable.length-1];
}
function weightedTerminalV6(node,path=[]){
  if(!node)return null;
  if(node.terminal||!(node.children?.length))return{node,path};
  const child=weightedChildV6(node.children);
  if(!child)return null;
  return weightedTerminalV6(child,[...path,slug(child.title)]);
}
function randomFromMap(r){
  const current=findMapNode(r.map.root,r.path)||r.map.root;
  const pick=weightedTerminalV6(current,r.path);
  if(!pick)return toast('최종 선택지가 없습니다.');
  showChoice(pick.node.title,`${current.title} · 주문데이터 가중 랜덤`,`#/map/${r.map.id}/${pick.path.join('/')}`,()=>randomFromMap(r));
}
function cloneLunchBoard(){
  const root=(HUB_MAPS.find(m=>m.id==='lunch')||{}).root;
  if(!root)return toast('점심 메뉴 데이터를 찾을 수 없습니다.');
  const id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const board={id,title:'나의 서울 점심 메뉴 결정판',note:root.summary,nodes:{}};
  function flatten(node,path=[]){
    node.children?.slice(0,8).forEach((child,i)=>{
      const p=[...path,SLOT_ORDER[i]];
      board.nodes[p.join(',')]={title:child.title,note:child.summary||'',terminal:!!child.terminal};
      flatten(child,p);
    });
  }
  flatten(root);
  personalBoards.push(board);
  savePersonal();
  toast('확장된 서울 점심 메뉴판을 내 보드로 복제했습니다.');
  go(`#/personal/${id}`);
}

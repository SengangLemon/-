// v8: annual hardcoded data lifecycle and snapshot-safe cloning.
(function installAnnualMenuLifecycle(global){
  'use strict';

  function datasetForMap(mapOrId){
    const id=typeof mapOrId==='string'?mapOrId:mapOrId?.id;
    return global.getNonetMenuDataset?.(id) || null;
  }

  function datasetLabel(map){
    const item=datasetForMap(map);
    if(!item)return '내장 데이터';
    return `${item.dataset.year} · ${item.dataset.version}`;
  }

  function snapshotNode(node){
    return {
      title:String(node.title||''),
      note:String(node.summary||''),
      terminal:Boolean(node.terminal),
      weight:Number(node.weight)||1
    };
  }

  // Built-in maps always point to the active annual release. Personal clones are snapshots,
  // so a user's edits are never overwritten when the next annual release is published.
  global.cloneMapBoardV7=function cloneMapBoardAnnual(mapId){
    const item=datasetForMap(mapId);
    const map=item?.map || HUB_MAPS.find(entry=>entry.id===mapId);
    if(!map?.root)return toast('결정판 데이터를 찾을 수 없습니다.');

    const id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    const dataset=item?.dataset || map.dataset || null;
    const board={
      id,
      title:`나의 ${map.title}`,
      note:map.root.summary||map.description||'',
      sourceMapId:map.id,
      sourceDataset:dataset?{
        id:dataset.id,
        year:dataset.year,
        version:dataset.version,
        updatedAt:dataset.updatedAt,
        schemaVersion:dataset.schemaVersion,
        clonedAt:new Date().toISOString(),
        policy:'snapshot'
      }:null,
      nodes:{}
    };

    function flatten(node,path=[]){
      node.children?.slice(0,8).forEach((child,index)=>{
        const nextPath=[...path,SLOT_ORDER[index]];
        board.nodes[nextPath.join(',')]=snapshotNode(child);
        flatten(child,nextPath);
      });
    }

    flatten(map.root);
    personalBoards.push(board);
    savePersonal();
    toast(`${map.short} ${dataset?dataset.year:''} 결정판을 내 보드로 복제했습니다.`);
    go(`#/personal/${id}`);
  };

  global.cloneLunchBoard=function cloneLunchBoardAnnual(){
    global.cloneMapBoardV7('lunch');
  };

  global.getNonetBoardUpdateState=function getNonetBoardUpdateState(board){
    const source=board?.sourceDataset;
    if(!source)return{tracked:false,updateAvailable:false};
    const current=datasetForMap(source.id)?.dataset;
    if(!current)return{tracked:true,updateAvailable:false,missingCurrent:true,source};
    return{
      tracked:true,
      source,
      current,
      updateAvailable:String(source.version)!==String(current.version),
      sameSchema:Number(source.schemaVersion)===Number(current.schemaVersion)
    };
  };

  // JSON export is intentionally local-only. It proves that the three decision boards are
  // bundled with the application and can be copied into a packaged app without an API call.
  global.exportNonetMenuCatalog=function exportNonetMenuCatalog(){
    const payload={
      config:global.NONET_MENU_CONFIG,
      maps:HUB_MAPS.map(map=>({
        id:map.id,
        title:map.title,
        short:map.short,
        accent:map.accent,
        description:map.description,
        dataset:map.dataset,
        root:map.root
      }))
    };
    return JSON.stringify(payload,null,2);
  };

  const originalRenderMap=global.renderMap;
  if(typeof originalRenderMap==='function'){
    global.renderMap=function renderVersionedMap(r){
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
      const item=datasetForMap(r.map.id);
      const dataset=item?.dataset;
      const validation=item?.validation;
      const sourceCount=dataset?.sources?.length||0;
      const dataInfo=dataset?`<div class="note"><b>내장 데이터</b><p>${esc(`${dataset.year}년판 · ${dataset.version} · ${dataset.updatedAt} 갱신\n앱 파일에 하드코딩되어 오프라인에서도 동작합니다. 출처 메모 ${sourceCount}개, 최종 선택지 ${validation?.stats?.terminals||0}개.`)}</p></div>`:'';
      const stale=global.NONET_MENU_CONFIG?.stale?`<div class="note warning"><b>연간 업데이트 필요</b><p>${esc(`${global.NONET_MENU_CONFIG.activeYear}년판보다 현재 연도가 뒤입니다. 새 연도 데이터를 등록한 뒤 data/menus/active.js의 연도만 바꾸세요.`)}</p></div>`:'';

      app.innerHTML=`${topbar(r.path.length?`#/map/${r.map.id}/${r.path.slice(0,-1).join('/')}`:'#/')}<div class="crumbs">${renderCrumbs(crumbs)}</div><section class="hub-layout"><div><div class="viewport"><div class="hub-grid">${gridHtml(current,children,center)}</div></div><p class="hint">중앙 큐브를 누르면 현재 분류 아래의 최종 선택지 중 하나를 상대 가중치로 골라줍니다.</p></div><aside class="panel" style="${typeStyle(current.type)}"><span class="badge">${esc(current.terminal?'최종 메뉴':datasetLabel(r.map))}</span><h2>${esc(current.title)}</h2><p class="summary">${esc(current.summary||'')}</p>${terminal}${dataInfo}${stale}<div class="panel-actions">${!current.terminal?'<button class="primarybtn" data-center-random>🎲 데이터 가중 선택</button>':'<button class="primarybtn" data-center-confirm>이 메뉴로 결정</button>'}<button class="pillbtn" data-clone-map="${r.map.id}">내 보드로 복제</button></div></aside></section>`;
    };
  }

  // Make the active release visible in existing home cards without changing their layout.
  for(const map of HUB_MAPS){
    const item=datasetForMap(map.id);
    if(item && !map.description.includes(item.dataset.version)){
      map.description=`${map.description} · 내장 ${item.dataset.year}년판 ${item.dataset.version}`;
    }
  }

  // app-v7-ui.js renders once before this compatibility layer is loaded.
  // Render again so the active-year metadata is immediately visible.
  if(typeof render==='function')render();
})(window);

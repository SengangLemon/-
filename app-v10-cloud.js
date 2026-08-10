// v10: Firebase Auth + Firestore account sync for private Nonet data.
// Built-in decision boards and public templates remain static app assets.
// Only personal boards, review state, and the private study pack are synced.
(function installNonetCloudSync(global){
  'use strict';

  const SDK_VERSION='12.15.0';
  const CLOUD_SCHEMA_VERSION=1;
  const MAX_DOCUMENT_BYTES=850000;
  const DEVICE_KEY='nonet:cloud-device-id:v1';
  const STUDY_KEY=global.NONET_PRIVATE_STUDY_STORAGE_KEY||'nonet:private-study-pack-v1';
  const firebaseConfig={
    apiKey:'AIzaSyBcuvT0PF7Gs-YhjSeVFLEFqvdyifgcPAA',
    authDomain:'microchronos-3dd02.firebaseapp.com',
    projectId:'microchronos-3dd02',
    storageBucket:'microchronos-3dd02.firebasestorage.app',
    messagingSenderId:'72284913318',
    appId:'1:72284913318:web:7b361fc3da8057ad9eac67',
    measurementId:'G-EY9MX47BSR'
  };

  function makeDeviceId(){
    let id=localStorage.getItem(DEVICE_KEY);
    if(id)return id;
    id=global.crypto?.randomUUID?.()||('device-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
    localStorage.setItem(DEVICE_KEY,id);
    return id;
  }

  const cloud={
    ready:false,
    user:null,
    status:'initializing',
    online:navigator.onLine,
    syncing:false,
    lastSyncAt:0,
    error:null,
    deviceId:makeDeviceId(),
    unsubscribe:null,
    writeTimer:null,
    applyingRemote:false,
    lastAppliedRevision:0,
    lastWrittenRevision:0,
    auth:null,
    db:null,
    api:null,
    userRef:null
  };
  global.NONET_CLOUD=cloud;

  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const now=()=>Date.now();
  const asTime=value=>{
    if(Number.isFinite(Number(value)))return Number(value);
    const parsed=Date.parse(value||'');
    return Number.isFinite(parsed)?parsed:0;
  };
  const safeText=value=>String(value??'');

  let originalSavePersonal=typeof savePersonal==='function'?savePersonal:null;
  let originalSaveReview=typeof saveReview==='function'?saveReview:null;
  const originalImportStudy=global.importNonetPrivateStudyPack;
  const originalClearStudy=global.clearNonetPrivateStudyPack;
  let lastBoardDigests=new Map();
  let lastReviewDigests=new Map();

  function digestWithoutTimestamp(value){
    const copy=clone(value)||{};
    delete copy.updatedAt;
    delete copy.updatedAtMs;
    return JSON.stringify(copy);
  }

  function refreshDigests(){
    lastBoardDigests=new Map((personalBoards||[]).map(board=>[board.id,digestWithoutTimestamp(board)]));
    lastReviewDigests=new Map(Object.entries(reviewState||{}).map(([key,item])=>[key,digestWithoutTimestamp(item)]));
  }

  function touchChangedBoards(){
    const stamp=now();
    for(const board of personalBoards||[]){
      if(!board.id)board.id='p'+stamp.toString(36)+Math.random().toString(36).slice(2,5);
      if(!board.createdAt)board.createdAt=stamp;
      const digest=digestWithoutTimestamp(board);
      if(lastBoardDigests.get(board.id)!==digest)board.updatedAt=stamp;
    }
    refreshDigests();
  }

  function touchChangedReview(){
    const stamp=now();
    for(const [key,item] of Object.entries(reviewState||{})){
      if(!item||typeof item!=='object')continue;
      const digest=digestWithoutTimestamp(item);
      if(lastReviewDigests.get(key)!==digest)item.updatedAt=stamp;
    }
    refreshDigests();
  }

  function dispatchLocalChange(scope){
    if(cloud.applyingRemote)return;
    global.dispatchEvent(new CustomEvent('nonet:local-change',{detail:{scope}}));
  }

  if(originalSavePersonal){
    savePersonal=function savePersonalWithCloudSignal(){
      touchChangedBoards();
      originalSavePersonal();
      dispatchLocalChange('boards');
    };
  }
  if(originalSaveReview){
    saveReview=function saveReviewWithCloudSignal(){
      touchChangedReview();
      originalSaveReview();
      dispatchLocalChange('review');
    };
  }
  if(typeof originalImportStudy==='function'){
    global.importNonetPrivateStudyPack=function importStudyWithCloudSignal(raw){
      const result=originalImportStudy(raw);
      dispatchLocalChange('study');
      return result;
    };
  }
  if(typeof originalClearStudy==='function'){
    global.clearNonetPrivateStudyPack=function clearStudyWithCloudSignal(){
      const result=originalClearStudy();
      dispatchLocalChange('study');
      return result;
    };
  }
  refreshDigests();

  function readStudyPack(){
    try{
      const text=localStorage.getItem(STUDY_KEY);
      return text?JSON.parse(text):null;
    }catch(error){
      console.warn('[Nonet cloud] invalid local study pack',error);
      return null;
    }
  }

  function normalizeBoardForCloud(board){
    const normalized=typeof normalizeBoard==='function'?normalizeBoard(clone(board)):clone(board);
    normalized.createdAt=asTime(normalized.createdAt)||0;
    normalized.updatedAt=asTime(normalized.updatedAt)||normalized.createdAt||0;
    normalized.nodes=normalized.nodes&&typeof normalized.nodes==='object'?normalized.nodes:{};
    return normalized;
  }

  function makeLocalSnapshot(){
    const stamp=now();
    const snapshot={
      schemaVersion:CLOUD_SCHEMA_VERSION,
      revision:stamp,
      updatedAtMs:stamp,
      updatedBy:cloud.deviceId,
      personalBoards:(personalBoards||[]).map(normalizeBoardForCloud),
      reviewState:clone(reviewState||{}),
      privateStudyPack:readStudyPack()
    };
    return JSON.parse(JSON.stringify(snapshot));
  }

  function boardTimestamp(board){return asTime(board?.updatedAt)||asTime(board?.createdAt);}
  function reviewTimestamp(item){return asTime(item?.updatedAt)||asTime(item?.due);}
  function packTimestamp(pack){return asTime(pack?.updatedAt);}

  function mergeBoards(remoteBoards=[],localBoards=[]){
    const byId=new Map();
    for(const board of remoteBoards||[]){
      if(!board?.id)continue;
      byId.set(board.id,normalizeBoardForCloud(board));
    }
    for(const board of localBoards||[]){
      if(!board?.id)continue;
      const local=normalizeBoardForCloud(board);
      const remote=byId.get(local.id);
      if(!remote||boardTimestamp(local)>boardTimestamp(remote))byId.set(local.id,local);
    }
    return [...byId.values()].sort((a,b)=>(asTime(a.createdAt)-asTime(b.createdAt))||safeText(a.title).localeCompare(safeText(b.title),'ko'));
  }

  function mergeReview(remote={},local={}){
    const out=clone(remote||{});
    for(const [key,item] of Object.entries(local||{})){
      if(!out[key]||reviewTimestamp(item)>reviewTimestamp(out[key]))out[key]=clone(item);
    }
    return out;
  }

  function chooseStudyPack(remote,local){
    if(!remote)return clone(local);
    if(!local)return clone(remote);
    return packTimestamp(local)>packTimestamp(remote)?clone(local):clone(remote);
  }

  function mergeSnapshots(local,remote){
    if(!remote)return local;
    const stamp=now();
    return{
      schemaVersion:CLOUD_SCHEMA_VERSION,
      revision:Math.max(Number(local?.revision)||0,Number(remote?.revision)||0,stamp),
      updatedAtMs:stamp,
      updatedBy:cloud.deviceId,
      personalBoards:mergeBoards(remote.personalBoards,local.personalBoards),
      reviewState:mergeReview(remote.reviewState,local.reviewState),
      privateStudyPack:chooseStudyPack(remote.privateStudyPack,local.privateStudyPack)
    };
  }

  function applySnapshot(snapshot,{rerender=true}={}){
    if(!snapshot||typeof snapshot!=='object')return;
    cloud.applyingRemote=true;
    try{
      const boards=(snapshot.personalBoards||[]).map(normalizeBoardForCloud);
      personalBoards.splice(0,personalBoards.length,...boards);
      if(originalSavePersonal)originalSavePersonal();
      else localStorage.setItem('nonet:personal-v5',JSON.stringify(personalBoards));

      reviewState=clone(snapshot.reviewState||{});
      if(originalSaveReview)originalSaveReview();
      else localStorage.setItem('nonet:review-v4',JSON.stringify(reviewState));

      if(snapshot.privateStudyPack&&typeof originalImportStudy==='function'){
        originalImportStudy(snapshot.privateStudyPack);
      }else if(!snapshot.privateStudyPack&&typeof originalClearStudy==='function'){
        originalClearStudy();
      }

      cloud.lastAppliedRevision=Math.max(cloud.lastAppliedRevision,Number(snapshot.revision)||0);
      refreshDigests();
    }finally{
      cloud.applyingRemote=false;
    }
    if(rerender&&typeof render==='function')render();
  }

  function stateByteSize(snapshot){
    try{return new Blob([JSON.stringify(snapshot)]).size;}catch{return JSON.stringify(snapshot).length;}
  }

  function statusLabel(){
    if(!cloud.ready)return'클라우드 준비 중';
    if(!cloud.user)return'로그인';
    if(cloud.error)return'동기화 오류';
    if(cloud.syncing)return'동기화 중';
    if(!cloud.online)return'오프라인';
    return'동기화됨';
  }

  function userLabel(){
    if(!cloud.user)return statusLabel();
    return cloud.user.displayName||cloud.user.email||statusLabel();
  }

  function decorateHomeForCloud(){
    const hero=document.querySelector('.hero');
    if(!hero||document.querySelector('[data-cloud-banner]'))return;
    const signed=Boolean(cloud.user);
    const section=document.createElement('section');
    section.className='cloud-banner';
    section.dataset.cloudBanner='1';
    section.innerHTML=`<div><div class="kicker">PRIVATE CLOUD WORKSPACE</div><h2>${signed?'내 계정으로 기기 간 동기화':'PC·휴대폰에서 같은 보드를 사용하세요'}</h2><p>${signed?`${esc(userLabel())} 계정으로 개인 보드·학습팩·복습기록을 동기화합니다.`:'로그인하면 선형대수·현대대수와 직접 만든 보드가 PC와 휴대폰에 동일하게 나타납니다.'}</p></div><button class="${signed?'pillbtn':'primarybtn'}" data-cloud-account>${signed?statusLabel():'로그인하고 동기화'}</button>`;
    hero.insertAdjacentElement('afterend',section);

    if(signed){
      document.querySelectorAll('p,.eyebrow,.chip').forEach(node=>{
        if(node.textContent.includes('이 브라우저에서만'))node.textContent=node.textContent.replace('이 브라우저에서만','내 계정의 모든 기기에서');
        if(node.textContent.includes('THIS BROWSER ONLY'))node.textContent=node.textContent.replace('THIS BROWSER ONLY','ACCOUNT SYNC');
        if(node.textContent.trim()==='localStorage')node.textContent='Firebase Sync';
      });
    }
  }

  const baseTopbar=typeof topbar==='function'?topbar:null;
  if(baseTopbar){
    topbar=function cloudTopbar(back='#/'){
      const html=baseTopbar(back);
      const button=`<button class="pillbtn cloud-account-btn ${cloud.user?'signed-in':''}" data-cloud-account title="${esc(statusLabel())}"><span class="cloud-dot ${cloud.status}"></span>${esc(cloud.user?userLabel():'로그인')}</button>`;
      return html.replace('</div>',button+'</div>');
    };
  }

  const baseRenderHome=typeof renderHome==='function'?renderHome:null;
  if(baseRenderHome){
    renderHome=function cloudAwareHome(){
      baseRenderHome();
      decorateHomeForCloud();
    };
  }

  const baseBindCommon=typeof bindCommon==='function'?bindCommon:null;
  if(baseBindCommon){
    bindCommon=function cloudAwareBind(){
      baseBindCommon();
      app.querySelectorAll('[data-cloud-account]').forEach(button=>button.onclick=openAccountModal);
    };
  }

  function injectCloudStyles(){
    if(document.getElementById('nonet-cloud-styles'))return;
    const style=document.createElement('style');
    style.id='nonet-cloud-styles';
    style.textContent=`
      .cloud-account-btn{max-width:210px;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:7px}
      .cloud-dot{width:8px;height:8px;border-radius:50%;background:#9b927e;flex:none}
      .cloud-dot.synced{background:#2f7d5b}.cloud-dot.syncing,.cloud-dot.initializing{background:#b8842d}.cloud-dot.error{background:#a4433c}.cloud-dot.offline{background:#7a7184}
      .cloud-banner{margin:-10px 0 24px;padding:18px 20px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(135deg,#edf3f1,var(--paper-raised));display:flex;align-items:center;gap:18px;box-shadow:var(--shadow-card)}
      .cloud-banner>div{flex:1}.cloud-banner h2{font:600 22px/1.2 'Fraunces',serif;margin:5px 0 6px}.cloud-banner p{font-size:12px;line-height:1.55;color:var(--ink-soft)}
      .cloud-user{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line-soft);border-radius:14px;background:#fff}
      .cloud-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;background:var(--accent-soft);display:grid;place-items:center;font-weight:700;color:var(--accent)}
      .cloud-status-list{display:grid;grid-template-columns:auto 1fr;gap:7px 12px;margin-top:14px;font-size:12px}.cloud-status-list dt{color:var(--ink-faint)}.cloud-status-list dd{color:var(--ink-soft);word-break:break-all}
      .cloud-auth-grid{display:grid;gap:10px;margin-top:14px}.cloud-auth-grid input{width:100%;border:1px solid var(--line);background:#fff;border-radius:11px;padding:11px;outline:0}.cloud-auth-grid input:focus{border-color:var(--accent)}
      .cloud-divider{display:flex;align-items:center;gap:10px;color:var(--ink-faint);font-size:10px;margin:14px 0}.cloud-divider:before,.cloud-divider:after{content:'';height:1px;background:var(--line);flex:1}
      .cloud-error{margin-top:12px;border:1px solid #e3bbb3;background:#f8e9e5;color:#873f32;border-radius:12px;padding:11px;font-size:11px;line-height:1.55;white-space:pre-line}
      @media(max-width:640px){.cloud-account-btn{max-width:100px;padding:8px 9px}.cloud-banner{align-items:flex-start;flex-direction:column}.cloud-banner button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function formatDate(timestamp){
    if(!timestamp)return'아직 없음';
    try{return new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(timestamp));}catch{return new Date(timestamp).toLocaleString();}
  }

  function authErrorMessage(error){
    const code=error?.code||'';
    const map={
      'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/email-already-in-use':'이미 가입된 이메일입니다.',
      'auth/weak-password':'비밀번호는 6자 이상으로 설정하세요.',
      'auth/invalid-email':'이메일 형식이 올바르지 않습니다.',
      'auth/popup-closed-by-user':'로그인 창이 닫혔습니다.',
      'auth/network-request-failed':'네트워크 연결을 확인하세요.',
      'auth/unauthorized-domain':`Firebase Authentication의 승인된 도메인에 ${location.hostname}을 추가해야 합니다.`,
      'permission-denied':'Firestore 보안 규칙이 이 계정의 users/{uid} 문서 접근을 허용해야 합니다.'
    };
    return map[code]||error?.message||'처리 중 오류가 발생했습니다.';
  }

  function modalError(message){
    const target=modalRoot.querySelector('[data-cloud-error]');
    if(target){target.textContent=message;target.hidden=false;}
    else alert(message);
  }

  function openAccountModal(){
    const signed=Boolean(cloud.user);
    const photo=cloud.user?.photoURL;
    modalRoot.innerHTML=`<div class="modal-backdrop"><section class="modal"><div class="modal-head"><div><div class="kicker">NONET CLOUD</div><h2>${signed?'내 계정 동기화':'로그인하고 기기 연결'}</h2></div><span class="spacer"></span><button class="iconbtn" data-close-cloud>✕</button></div>
      ${signed?`<div class="cloud-user">${photo?`<img class="cloud-avatar" src="${esc(photo)}" alt="">`:`<div class="cloud-avatar">${esc((userLabel()[0]||'N').toUpperCase())}</div>`}<div><strong>${esc(userLabel())}</strong><p class="summary" style="margin-top:3px">${esc(cloud.user.email||'')}</p></div></div>
      <dl class="cloud-status-list"><dt>상태</dt><dd>${esc(statusLabel())}</dd><dt>마지막 동기화</dt><dd>${esc(formatDate(cloud.lastSyncAt))}</dd><dt>동기화 항목</dt><dd>개인 보드 · 개인 학습팩 · 복습 기록</dd><dt>기기 ID</dt><dd>${esc(cloud.deviceId)}</dd></dl>
      <div class="hero-actions"><button class="primarybtn" data-sync-now>지금 동기화</button><button class="pillbtn" data-sign-out>로그아웃</button></div>`:
      `<p class="summary">같은 계정으로 로그인하면 PC와 휴대폰에서 선형대수·현대대수, 직접 만든 보드, 복습기록을 함께 사용합니다. 로그인 전에도 앱은 기기 로컬 방식으로 계속 사용할 수 있습니다.</p>
      <div class="hero-actions"><button class="primarybtn" data-google-login>Google로 로그인</button></div><div class="cloud-divider">또는 이메일</div>
      <div class="cloud-auth-grid"><input id="cloud-email" type="email" autocomplete="email" placeholder="이메일"><input id="cloud-password" type="password" autocomplete="current-password" minlength="6" placeholder="비밀번호 6자 이상"><div class="hero-actions" style="margin-top:0"><button class="primarybtn" data-email-login>이메일 로그인</button><button class="pillbtn" data-email-signup>새 계정 만들기</button></div></div>`}
      <div class="cloud-error" data-cloud-error ${cloud.error?'':'hidden'}>${esc(cloud.error||'')}</div>
      <p class="source-note">Firebase 프로젝트: microchronos-3dd02 · 사용자별 users/{uid}.nonet 영역만 사용합니다.</p></section></div>`;

    modalRoot.querySelector('[data-close-cloud]').onclick=()=>modalRoot.innerHTML='';
    modalRoot.querySelector('[data-google-login]')?.addEventListener('click',loginWithGoogle);
    modalRoot.querySelector('[data-email-login]')?.addEventListener('click',()=>loginWithEmail(false));
    modalRoot.querySelector('[data-email-signup]')?.addEventListener('click',()=>loginWithEmail(true));
    modalRoot.querySelector('[data-sync-now]')?.addEventListener('click',async()=>{
      try{await syncNow();modalRoot.innerHTML='';toast('클라우드 동기화를 완료했습니다.');}catch(error){modalError(authErrorMessage(error));}
    });
    modalRoot.querySelector('[data-sign-out]')?.addEventListener('click',async()=>{
      try{await cloud.api.signOut(cloud.auth);modalRoot.innerHTML='';}catch(error){modalError(authErrorMessage(error));}
    });
  }

  async function loginWithGoogle(){
    if(!cloud.ready)return modalError('Firebase를 준비하는 중입니다. 잠시 후 다시 눌러주세요.');
    const provider=new cloud.api.GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||matchMedia('(pointer:coarse)').matches;
    try{
      if(mobile){
        await cloud.api.signInWithRedirect(cloud.auth,provider);
      }else{
        await cloud.api.signInWithPopup(cloud.auth,provider);
        modalRoot.innerHTML='';
      }
    }catch(error){
      if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(error?.code)){
        await cloud.api.signInWithRedirect(cloud.auth,provider);
        return;
      }
      modalError(authErrorMessage(error));
    }
  }

  async function loginWithEmail(createAccount){
    if(!cloud.ready)return modalError('Firebase를 준비하는 중입니다. 잠시 후 다시 눌러주세요.');
    const email=modalRoot.querySelector('#cloud-email')?.value.trim();
    const password=modalRoot.querySelector('#cloud-password')?.value||'';
    if(!email||password.length<6)return modalError('이메일과 6자 이상의 비밀번호를 입력하세요.');
    try{
      if(createAccount)await cloud.api.createUserWithEmailAndPassword(cloud.auth,email,password);
      else await cloud.api.signInWithEmailAndPassword(cloud.auth,email,password);
      modalRoot.innerHTML='';
    }catch(error){modalError(authErrorMessage(error));}
  }

  async function writeSnapshot(snapshot){
    if(!cloud.user||!cloud.userRef)throw new Error('로그인이 필요합니다.');
    const size=stateByteSize(snapshot);
    if(size>MAX_DOCUMENT_BYTES){
      const error=new Error(`동기화 데이터가 ${(size/1024).toFixed(0)}KB입니다. Firestore 단일 문서 안전 한도 850KB를 넘었습니다. 큰 개인 보드는 나누어야 합니다.`);
      error.code='nonet/document-too-large';
      throw error;
    }
    cloud.syncing=true;
    cloud.status=cloud.online?'syncing':'offline';
    cloud.error=null;
    const revision=Math.max(Number(snapshot.revision)||0,now());
    snapshot.revision=revision;
    snapshot.updatedAtMs=now();
    snapshot.updatedBy=cloud.deviceId;
    cloud.lastWrittenRevision=revision;
    await cloud.api.setDoc(cloud.userRef,{
      nonet:snapshot,
      nonetUpdatedAt:cloud.api.serverTimestamp(),
      nonetUpdatedBy:cloud.deviceId,
      email:cloud.user.email||null,
      displayName:cloud.user.displayName||null,
      photoURL:cloud.user.photoURL||null
    },{merge:true});
    cloud.lastSyncAt=now();
    cloud.syncing=false;
    cloud.status=cloud.online?'synced':'offline';
    cloud.error=null;
  }

  async function syncNow(){
    if(!cloud.user)return openAccountModal();
    const snapshot=makeLocalSnapshot();
    await writeSnapshot(snapshot);
  }

  function scheduleSync(){
    if(!cloud.user||cloud.applyingRemote)return;
    clearTimeout(cloud.writeTimer);
    cloud.writeTimer=setTimeout(async()=>{
      try{await syncNow();if(typeof render==='function')render();}
      catch(error){cloud.syncing=false;cloud.status='error';cloud.error=authErrorMessage(error);console.error('[Nonet cloud] sync failed',error);if(typeof render==='function')render();}
    },700);
  }

  async function bootstrapUser(user){
    cloud.user=user;
    cloud.userRef=cloud.api.doc(cloud.db,'users',user.uid);
    cloud.status='syncing';
    cloud.error=null;
    if(typeof render==='function')render();

    const local=makeLocalSnapshot();
    const snapshot=await cloud.api.getDoc(cloud.userRef);
    const remote=snapshot.exists()?snapshot.data()?.nonet:null;
    const merged=remote?mergeSnapshots(local,remote):local;
    applySnapshot(merged,{rerender:false});
    await writeSnapshot(merged);

    cloud.unsubscribe?.();
    cloud.unsubscribe=cloud.api.onSnapshot(cloud.userRef,{includeMetadataChanges:true},docSnapshot=>{
      if(!docSnapshot.exists()||docSnapshot.metadata.hasPendingWrites)return;
      const remoteState=docSnapshot.data()?.nonet;
      if(!remoteState)return;
      const revision=Number(remoteState.revision)||0;
      if(revision<=cloud.lastAppliedRevision)return;
      applySnapshot(remoteState);
      cloud.lastSyncAt=now();
      cloud.status=docSnapshot.metadata.fromCache&&!navigator.onLine?'offline':'synced';
      cloud.error=null;
    },error=>{
      cloud.status='error';
      cloud.error=authErrorMessage(error);
      console.error('[Nonet cloud] listener failed',error);
      if(typeof render==='function')render();
    });

    cloud.status=cloud.online?'synced':'offline';
    cloud.lastSyncAt=now();
    cloud.error=null;
    if(typeof render==='function')render();
  }

  async function initFirebase(){
    injectCloudStyles();
    try{
      const appApi=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`);
      const authApi=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`);
      const firestoreApi=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`);
      const firebaseApp=appApi.initializeApp(firebaseConfig,'nonet-cloud');
      const auth=authApi.getAuth(firebaseApp);
      auth.useDeviceLanguage();
      await authApi.setPersistence(auth,authApi.browserLocalPersistence);

      let db;
      try{
        db=firestoreApi.initializeFirestore(firebaseApp,{
          localCache:firestoreApi.persistentLocalCache({tabManager:firestoreApi.persistentMultipleTabManager()})
        });
      }catch(error){
        console.warn('[Nonet cloud] persistent cache unavailable; using memory cache',error);
        db=firestoreApi.getFirestore(firebaseApp);
      }

      cloud.api={...authApi,...firestoreApi};
      cloud.auth=auth;
      cloud.db=db;
      cloud.ready=true;
      cloud.status='signed-out';
      cloud.error=null;

      try{await authApi.getRedirectResult(auth);}catch(error){cloud.error=authErrorMessage(error);}

      authApi.onAuthStateChanged(auth,async user=>{
        if(!user){
          cloud.unsubscribe?.();cloud.unsubscribe=null;cloud.user=null;cloud.userRef=null;cloud.status='signed-out';cloud.syncing=false;
          if(typeof render==='function')render();
          return;
        }
        try{await bootstrapUser(user);}catch(error){cloud.user=user;cloud.status='error';cloud.error=authErrorMessage(error);console.error('[Nonet cloud] bootstrap failed',error);if(typeof render==='function')render();}
      });
    }catch(error){
      cloud.ready=false;
      cloud.status='error';
      cloud.error=`Firebase SDK를 불러오지 못했습니다.\n${authErrorMessage(error)}`;
      console.error('[Nonet cloud] initialization failed',error);
      if(typeof render==='function')render();
    }
  }

  global.addEventListener('nonet:local-change',scheduleSync);
  global.addEventListener('online',()=>{cloud.online=true;cloud.status=cloud.user?'syncing':'signed-out';if(cloud.user)scheduleSync();if(typeof render==='function')render();});
  global.addEventListener('offline',()=>{cloud.online=false;if(cloud.user)cloud.status='offline';if(typeof render==='function')render();});
  global.openNonetCloudAccount=openAccountModal;
  global.syncNonetCloudNow=syncNow;
  global.exportNonetCloudSnapshot=()=>JSON.stringify(makeLocalSnapshot(),null,2);

  initFirebase();
  if(typeof render==='function')render();
})(window);

// v10.1: use popup-first Google authentication on every browser.
// Firebase redirect flows require extra same-site auth-domain setup on modern Safari/Firefox/Chrome.
(function installPopupFirstCloudAuth(global){
  'use strict';

  const originalOpen=global.openNonetCloudAccount;

  function messageFor(error){
    const code=error?.code||'';
    const messages={
      'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/email-already-in-use':'이미 가입된 이메일입니다.',
      'auth/weak-password':'비밀번호는 6자 이상으로 설정하세요.',
      'auth/invalid-email':'이메일 형식이 올바르지 않습니다.',
      'auth/popup-closed-by-user':'로그인 창이 닫혔습니다.',
      'auth/network-request-failed':'네트워크 연결을 확인하세요.',
      'auth/unauthorized-domain':`Firebase 승인 도메인에 ${location.hostname}을 추가해야 합니다.`
    };
    return messages[code]||error?.message||'로그인 중 오류가 발생했습니다.';
  }

  function showError(message){
    const box=modalRoot.querySelector('[data-cloud-error]');
    if(box){box.hidden=false;box.textContent=message;}
    else alert(message);
  }

  function openPopupFirstAccount(){
    const cloud=global.NONET_CLOUD;
    if(cloud?.user||!cloud?.ready)return originalOpen?.();

    modalRoot.innerHTML=`<div class="modal-backdrop"><section class="modal"><div class="modal-head"><div><div class="kicker">NONET CLOUD</div><h2>로그인하고 기기 연결</h2></div><span class="spacer"></span><button class="iconbtn" data-close-cloud>✕</button></div>
      <p class="summary">같은 계정으로 로그인하면 PC와 휴대폰에서 선형대수·현대대수, 직접 만든 보드, 복습기록을 함께 사용합니다.</p>
      <div class="hero-actions"><button class="primarybtn" data-google-popup>Google로 로그인</button></div>
      <div class="cloud-divider">또는 이메일</div>
      <div class="cloud-auth-grid"><input id="cloud-email" type="email" autocomplete="email" placeholder="이메일"><input id="cloud-password" type="password" autocomplete="current-password" minlength="6" placeholder="비밀번호 6자 이상"><div class="hero-actions" style="margin-top:0"><button class="primarybtn" data-email-login>이메일 로그인</button><button class="pillbtn" data-email-signup>새 계정 만들기</button></div></div>
      <div class="cloud-error" data-cloud-error hidden></div>
      <p class="source-note">로그인 전 데이터는 그대로 유지되며, 첫 로그인 때 클라우드 자료와 자동 병합됩니다.</p></section></div>`;

    modalRoot.querySelector('[data-close-cloud]').onclick=()=>modalRoot.innerHTML='';
    modalRoot.querySelector('[data-google-popup]').onclick=async()=>{
      const provider=new cloud.api.GoogleAuthProvider();
      provider.setCustomParameters({prompt:'select_account'});
      try{
        await cloud.api.signInWithPopup(cloud.auth,provider);
        modalRoot.innerHTML='';
      }catch(error){
        if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(error?.code)){
          try{await cloud.api.signInWithRedirect(cloud.auth,provider);return;}catch(redirectError){showError(messageFor(redirectError));return;}
        }
        showError(messageFor(error));
      }
    };

    async function emailAuth(create){
      const email=modalRoot.querySelector('#cloud-email')?.value.trim();
      const password=modalRoot.querySelector('#cloud-password')?.value||'';
      if(!email||password.length<6)return showError('이메일과 6자 이상의 비밀번호를 입력하세요.');
      try{
        if(create)await cloud.api.createUserWithEmailAndPassword(cloud.auth,email,password);
        else await cloud.api.signInWithEmailAndPassword(cloud.auth,email,password);
        modalRoot.innerHTML='';
      }catch(error){showError(messageFor(error));}
    }

    modalRoot.querySelector('[data-email-login]').onclick=()=>emailAuth(false);
    modalRoot.querySelector('[data-email-signup]').onclick=()=>emailAuth(true);
  }

  global.openNonetCloudAccount=openPopupFirstAccount;
  const previousBind=bindCommon;
  bindCommon=function popupFirstCloudBind(){
    previousBind();
    app.querySelectorAll('[data-cloud-account]').forEach(button=>button.onclick=openPopupFirstAccount);
  };
  render();
})(window);

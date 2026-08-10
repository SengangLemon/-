const API_KEY='AIzaSyBcuvT0PF7Gs-YhjSeVFLEFqvdyifgcPAA';

async function readBody(response){
  const text=await response.text();
  try{return JSON.parse(text);}catch{return text;}
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const result={checkedAt:new Date().toISOString(),project:'microchronos-3dd02'};
  try{
    const configResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(API_KEY)}`);
    result.projectConfig={status:configResponse.status,body:await readBody(configResponse)};

    result.continueUris=[];
    for(const continueUri of ['https://sigma-swart-49.vercel.app/','https://nonet-study.vercel.app/']){
      const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(API_KEY)}`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({identifier:'nonet-auth-probe@example.invalid',continueUri})
      });
      result.continueUris.push({continueUri,status:response.status,body:await readBody(response)});
    }

    const passwordResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(API_KEY)}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'nonet-auth-probe@example.invalid',password:'not-a-real-password',returnSecureToken:true})
    });
    result.passwordProvider={status:passwordResponse.status,body:await readBody(passwordResponse)};

    res.status(200).end(JSON.stringify(result,null,2));
  }catch(error){
    res.status(500).end(JSON.stringify({ok:false,error:error?.message||String(error)},null,2));
  }
};

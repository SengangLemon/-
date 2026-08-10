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
    result.hostingConfig=[];
    for(const url of [
      'https://microchronos-3dd02.firebaseapp.com/__/firebase/init.json',
      'https://microchronos-3dd02.web.app/__/firebase/init.json'
    ]){
      const response=await fetch(url,{redirect:'follow'});
      result.hostingConfig.push({url,status:response.status,body:await readBody(response)});
    }

    const configResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(API_KEY)}`);
    result.currentKeyProjectConfig={status:configResponse.status,body:await readBody(configResponse)};

    res.status(200).end(JSON.stringify(result,null,2));
  }catch(error){
    res.status(500).end(JSON.stringify({ok:false,error:error?.message||String(error)},null,2));
  }
};

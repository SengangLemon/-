const OWNER='SengangLemon';
const REPOS=['account','habit-lock','choice','reading','tcgstatus','vocawithnuance','Knowledge','open-algebra-kr','NexonYoungProgrammersCup','SengangLemon','-'];
const TEXT_EXT=/\.(?:js|jsx|ts|tsx|html|json|env|txt|md|yml|yaml|toml|xml|plist|gradle|properties)$/i;
const PATH_INTERESTING=/(?:\.github\/workflows|firebase|google-services|GoogleService-Info|service.account|config|auth|login|main|app|index|env)/i;
const CONTENT_INTERESTING=/(?:firebase|google-services|identitytoolkit|FIREBASE_TOKEN|SERVICE_ACCOUNT|GCLOUD|GOOGLE_APPLICATION_CREDENTIALS|microchronos|AIza)/i;
function matchedSnippets(body){
  const lines=body.split(/\r?\n/);
  const out=[];
  for(let i=0;i<lines.length;i++){
    if(CONTENT_INTERESTING.test(lines[i]))out.push(lines.slice(Math.max(0,i-3),Math.min(lines.length,i+5)).join('\n'));
  }
  const config=body.match(/firebaseConfig\s*=\s*\{[\s\S]{0,2400}?\}/i);
  if(config)out.unshift(config[0]);
  return [...new Set(out)].slice(0,30);
}
async function getJson(url){
  const response=await fetch(url,{headers:{'User-Agent':'nonet-auth-repair'}});
  const text=await response.text();
  let body;try{body=JSON.parse(text);}catch{body=text;}
  return{status:response.status,body};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const result={checkedAt:new Date().toISOString(),owner:OWNER,repositories:[]};
  try{
    for(const repo of REPOS){
      const entry={repo,paths:[],files:[],errors:[]};
      const tree=await getJson(`https://api.github.com/repos/${OWNER}/${encodeURIComponent(repo)}/git/trees/main?recursive=1`);
      entry.treeStatus=tree.status;
      if(tree.status!==200||!Array.isArray(tree.body?.tree)){
        entry.errors.push(typeof tree.body==='string'?tree.body:tree.body?.message||'tree failed');
        result.repositories.push(entry);continue;
      }
      const blobs=tree.body.tree.filter(item=>item.type==='blob');
      entry.paths=blobs.filter(item=>PATH_INTERESTING.test(item.path)).map(item=>item.path).slice(0,200);
      const candidates=blobs.filter(item=>item.size<=900000&&TEXT_EXT.test(item.path)&&(PATH_INTERESTING.test(item.path)||repo!=='vocawithnuance'&&item.size<=180000)).slice(0,180);
      for(const item of candidates){
        const raw=`https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(repo)}/main/${item.path.split('/').map(encodeURIComponent).join('/')}`;
        try{
          const response=await fetch(raw,{headers:{'User-Agent':'nonet-auth-repair'}});
          if(!response.ok)continue;
          const body=await response.text();
          if(!CONTENT_INTERESTING.test(body))continue;
          const found=matchedSnippets(body);
          entry.files.push({path:item.path,matches:found});
        }catch(error){entry.errors.push(`${item.path}: ${error.message}`);}
      }
      result.repositories.push(entry);
    }
    res.status(200).end(JSON.stringify(result,null,2));
  }catch(error){res.status(500).end(JSON.stringify({error:error.message},null,2));}
};

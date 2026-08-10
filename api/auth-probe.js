const OWNER='SengangLemon';
const REPOS=['account','habit-lock','choice','reading','tcgstatus','vocawithnuance','Knowledge','open-algebra-kr','NexonYoungProgrammersCup','SengangLemon','-'];
const TEXT_EXT=/\.(?:js|jsx|ts|tsx|html|json|env|txt|md|yml|yaml|toml|xml|plist|gradle|properties)$/i;
const INTERESTING=/(?:firebase|google-services|config|auth|login|main|app|index|env)/i;
function matches(body){
  const patterns=[
    /firebaseConfig\s*=\s*\{[\s\S]{0,2000}?\}/gi,
    /apiKey\s*[:=]\s*["'][^"']+["']/gi,
    /authDomain\s*[:=]\s*["'][^"']+["']/gi,
    /projectId\s*[:=]\s*["'][^"']+["']/gi,
    /messagingSenderId\s*[:=]\s*["'][^"']+["']/gi,
    /appId\s*[:=]\s*["'][^"']+["']/gi,
    /microchronos-[a-z0-9-]+/gi,
    /AIza[0-9A-Za-z_-]{20,}/g
  ];
  const found=[];
  for(const pattern of patterns)for(const match of body.matchAll(pattern))found.push(match[0].slice(0,2200));
  return [...new Set(found)];
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
      const entry={repo,files:[],errors:[]};
      const tree=await getJson(`https://api.github.com/repos/${OWNER}/${encodeURIComponent(repo)}/git/trees/main?recursive=1`);
      entry.treeStatus=tree.status;
      if(tree.status!==200||!Array.isArray(tree.body?.tree)){
        entry.errors.push(typeof tree.body==='string'?tree.body:tree.body?.message||'tree failed');
        result.repositories.push(entry);continue;
      }
      const candidates=tree.body.tree.filter(item=>item.type==='blob'&&item.size<=600000&&TEXT_EXT.test(item.path)&&INTERESTING.test(item.path)).slice(0,80);
      for(const item of candidates){
        const raw=`https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(repo)}/main/${item.path.split('/').map(encodeURIComponent).join('/')}`;
        try{
          const response=await fetch(raw,{headers:{'User-Agent':'nonet-auth-repair'}});
          if(!response.ok)continue;
          const body=await response.text();
          const found=matches(body);
          if(found.length)entry.files.push({path:item.path,matches:found});
        }catch(error){entry.errors.push(`${item.path}: ${error.message}`);}
      }
      result.repositories.push(entry);
    }
    res.status(200).end(JSON.stringify(result,null,2));
  }catch(error){res.status(500).end(JSON.stringify({error:error.message},null,2));}
};

async function text(response){return await response.text();}
function absolute(base,ref){try{return new URL(ref,base).href;}catch{return null;}}
function snippets(source){
  const patterns=[/firebaseConfig\s*=\s*\{[\s\S]{0,1200}?\}/gi,/apiKey\s*[:=]\s*["'][^"']+["']/gi,/projectId\s*[:=]\s*["'][^"']+["']/gi,/microchronos-[a-z0-9-]+/gi,/AIza[0-9A-Za-z_-]{20,}/g];
  const out=[];
  for(const p of patterns)for(const match of source.matchAll(p))out.push(match[0].slice(0,1500));
  return [...new Set(out)];
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const roots=['https://legendary-paletas-866e41.netlify.app/'];
  const result={checkedAt:new Date().toISOString(),pages:[]};
  try{
    for(const root of roots){
      const page={url:root,assets:[],matches:[]};
      const response=await fetch(root,{redirect:'follow'});
      page.status=response.status;
      const html=await text(response);
      page.matches.push(...snippets(html));
      const refs=[...html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]);
      for(const ref of refs.slice(0,80)){
        const url=absolute(root,ref);
        if(!url||!/^https?:/.test(url))continue;
        try{
          const assetResponse=await fetch(url,{redirect:'follow'});
          const body=await text(assetResponse);
          const found=snippets(body);
          if(found.length)page.assets.push({url,status:assetResponse.status,matches:found});
        }catch(error){page.assets.push({url,error:error.message});}
      }
      result.pages.push(page);
    }
    res.status(200).end(JSON.stringify(result,null,2));
  }catch(error){res.status(500).end(JSON.stringify({error:error.message},null,2));}
};

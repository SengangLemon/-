const SAFE_NAMES=[
  'FIREBASE_API_KEY','FIREBASE_AUTH_DOMAIN','FIREBASE_PROJECT_ID','FIREBASE_STORAGE_BUCKET','FIREBASE_MESSAGING_SENDER_ID','FIREBASE_APP_ID','FIREBASE_MEASUREMENT_ID',
  'VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_STORAGE_BUCKET','VITE_FIREBASE_MESSAGING_SENDER_ID','VITE_FIREBASE_APP_ID','VITE_FIREBASE_MEASUREMENT_ID',
  'NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_PROJECT_ID','NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET','NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID','NEXT_PUBLIC_FIREBASE_APP_ID','NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'REACT_APP_FIREBASE_API_KEY','REACT_APP_FIREBASE_AUTH_DOMAIN','REACT_APP_FIREBASE_PROJECT_ID','REACT_APP_FIREBASE_STORAGE_BUCKET','REACT_APP_FIREBASE_MESSAGING_SENDER_ID','REACT_APP_FIREBASE_APP_ID'
];
function mask(value){if(!value)return null;const s=String(value);return s.length<=10?s:`${s.slice(0,6)}…${s.slice(-4)} (${s.length})`;}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const safe={};
  for(const name of SAFE_NAMES)if(process.env[name])safe[name]={value:process.env[name],masked:mask(process.env[name])};
  const relatedNames=Object.keys(process.env).filter(name=>/(?:FIREBASE|GOOGLE|GCLOUD|SUPABASE|POSTGRES|KV|BLOB)/i.test(name));
  res.status(200).end(JSON.stringify({checkedAt:new Date().toISOString(),safe,relatedNames},null,2));
};

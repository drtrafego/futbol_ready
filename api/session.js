import { handleSession } from '../server/auth.mjs';
export default async function handler(req,res){try{await handleSession(req,res);}catch(error){console.error('Session endpoint failed.');res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Não foi possível concluir a autenticação.'}));}}

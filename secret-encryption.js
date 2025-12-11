const crypto=require('crypto');
const MASTER_KEY=process.env.MASTER_KEY||null;
if(!MASTER_KEY) console.warn('WARNING: MASTER_KEY not set. Use 32 byte string.');

function getKey(){
  if(!MASTER_KEY) return crypto.randomBytes(32);
  const buf=Buffer.from(MASTER_KEY);
  if(buf.length===32) return buf;
  const out=Buffer.alloc(32); buf.copy(out); return out;
}

function encryptSecret(plaintext){
  const key=getKey();
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const enc=Buffer.concat([cipher.update(String(plaintext),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return {ciphertext:enc.toString('base64'),iv:iv.toString('base64'),tag:tag.toString('base64')};
}

function decryptSecret({ciphertext,iv,tag}){
  const key=getKey();
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64'));
  decipher.setAuthTag(Buffer.from(tag,'base64'));
  const dec=Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64')),decipher.final()]);
  return dec.toString('utf8');
}

module.exports={encryptSecret,decryptSecret};

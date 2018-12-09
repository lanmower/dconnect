const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

global.decrypt = (message) => {
  const {SPUB, NONCE, RSECRET} = process.env;
  try {
    const spub = nacl.util.decodeBase64(SPUB);
    const rsecret = nacl.util.decodeBase64(RSECRET);
    const bytes = nacl.box.open(nacl.util.decodeBase64(message), nacl.util.decodeBase64(NONCE), spub, rsecret);
    const utf8 = nacl.util.encodeUTF8(bytes);
    return JSON.parse(utf8);
  } catch(e) {
  }
}; 


global.encrypt = (input, nonce)=>{
  const {SSECRET,RPUB,NONCE} = process.env;
  const rpub = nacl.util.decodeBase64(RPUB);
  const ssecret = nacl.util.decodeBase64(SSECRET);
  const inputBytes = nacl.util.decodeUTF8(JSON.stringify(input));
  const bytes = nacl.box(inputBytes, nacl.util.decodeBase64(NONCE), rpub, ssecret);
  return nacl.util.encodeBase64(bytes);
};

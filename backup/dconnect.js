const sign = function(username, password) {
  const keys = nacl.sign.keyPair.fromSeed(nacl.util.decodeUTF8(md5(username+':dconnect:'+password)));
  const signature = nacl.sign.detached(nacl.util.decodeUTF8(username), keys.secretKey);
  return nacl.util.encodeBase64(signature);
};

async function getUsername(username, password) {
  var hist = await steem.api.getAccountHistoryAsync('dconnect', -1, 10000).catch(console.error);
  let signed = false;
  var users = hist.filter(block=>{
    try {
      const transferOp = block[1].op;
      if(transferOp[0] !='transfer') return false;
      const name = transferOp[1].memo.split(':')[1];
      if(transferOp[1].from != username) return false;
      if(!transferOp[1].memo.startsWith('CONNECT:')) return false;
      if(parseFloat(transferOp[1].amount.split(' ')[0]) < 0.001) return false;
      if(transferOp[1].memo.split(':').length == 3) {
        const key = nacl.util.decodeBase64(transferOp[1].memo.split(':')[2]);
        const keys = md5(name+':asterisk:'+password);
        signed = false;
        return true;
      }
      if(transferOp[1].memo.split(':').length == 4) {
        const key = nacl.util.decodeBase64(transferOp[1].memo.split(':')[3]);
        const keys = nacl.sign.keyPair.fromSeed(nacl.util.decodeUTF8(md5(name+':dconnect:'+password)));
        const userkey = nacl.util.decodeUTF8(name);
        const signature =  nacl.sign.detached(userkey, keys.secretKey);
        if(nacl.sign.detached.verify(userkey, signature, key)) {
          signed = true;
          return true;
        }
      }
    } catch(e) {
      console.error(e);
    }
  });
  if(users.length) return {signed, username:users[users.length-1][1].op[1].memo.split(':')[1]};
  return false;
}

const  getCredentials = async () => {
  const {signed, username} = (await getUsername(document.querySelector('[name="username"]').value, document.querySelector('[name="password"]').value));
  const user = {
    username,
    password: signed?await sign(username, document.querySelector('[name="password"]').value):md5(username+':asterisk:'+document.querySelector('[name="password"]').value)
  };

  return user;
};

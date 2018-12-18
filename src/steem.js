const steem = require('steem');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
module.exports = function(app) {
  try {
    app.steemhooks = [];
    app.steemhooks.push(usersFromSteem);
    app.steemhooks.push(doRooms);
    let done = 0;
    const dosteemhooks = async ()=>{
      const total = (await steem.api.getAccountHistoryAsync('dconnect', Number.MAX_SAFE_INTEGER, 1))[0][0];
      console.log(total, done);
      if(total+2 <= done) return;
      try {
        const hist = await steem.api.getAccountHistoryAsync('dconnect', total-done+1, total-done>999?999:total-done+1);
        for(let index = 0; index < hist.length; index++) {
          done++;
          const item = hist[index];
          if(item[1].op[0] != 'transfer') continue;
          for(hook in app.steemhooks) {
            app.steemhooks[hook](app,item);
          }
        }
        console.log(total, done);
      } catch (e) {
        console.error(e);
      }
    };
    setInterval(dosteemhooks, 15000);
    setTimeout(dosteemhooks,0);
    app.post('/steemuser', async function(req,res) {
      try {
        const username = req.body.name;
        const hist = await steem.api.getAccountHistoryAsync('dconnect', -1, 10000);
        const users = hist.filter(block=>{
          const transferOp = block[1].op;
          const {memo, from, amount} = transferOp[1];
          if(from != username) return false;
          if(transferOp[0] != 'transfer') return false;
          if(!memo.startsWith('CONNECT:')) return false;
          if(parseFloat(amount.split(' ')[0]) < 0.001) return false;
          if(memo.split(':').length != 3) return false;
          const publicKey = memo.split(':')[1];
          const code = memo.split(':')[2];
          const decrypted = nacl.util.encodeUTF8(nacl.sign.open(nacl.util.decodeBase64(code), nacl.util.decodeBase64(publicKey)));
          if(!decrypted) return;
          if(decrypted.split(':')[0] != 'STEEM') return false;
          if(decrypted.split(':')[1] != from) return false;
          //if(decrypted.split(':')[1] != password) return false;
          return true;
        });
        if(!users.length){
          throw new Error('No valid accounts with this username/password found');
        }

        const transfer = users.pop();

        var localAccounts = await app.service('users').find({
          'query': {
            username,
            '$limit': 1
          }
        });
        const {memo} = transfer[1].op[1];
        const publicKey = memo.split(':')[1];
        const code = memo.split(':')[2];
        const decrypted = nacl.util.encodeUTF8(nacl.sign.open(nacl.util.decodeBase64(code), nacl.util.decodeBase64(publicKey)));
        res.json({ user:decrypted.split(':')[2] });
      } catch (e) {
        console.error(e);
        res.json({ error:e });
      }
    });

    return;
  } catch(e) {
    console.error(e);
  }
};

const rooms = [];
const doRooms = (app, item)=>{
  const transferOp = item[1].op;
  if(transferOp[0] =='transfer' && transferOp[1].memo.split(':').length > 2 && transferOp[1].memo.startsWith('ROOM:') && parseFloat(transferOp[1].amount.split(' ')[0]) >= 0.001) {
    const room = transferOp[1].memo;
    const split = room.split(':');
    const name = split[1];
    if(rooms.indexOf(name) == -1) {
      console.log('adding room', name);
      rooms.push(name);
      const messages = app.getMessagesService(name);
      app.configure(messages);
    }
  }
};

function usersFromSteem(app, item) {
  if(item[1].op[0] != 'transfer') return false;
  const {memo, from, amount} = item[1].op[1];

  if(!memo.startsWith('CONNECT:')) return false;
  if(parseFloat(amount.split(' ')[0]) < 0.001) return false;
  if(memo.length < 170)return;
  console.log(memo.length);
  if(memo.split(':').length != 3) return false;
  const publicKey = memo.split(':')[1];
  const code = memo.split(':')[2];
  const decrypted = nacl.util.encodeUTF8(nacl.sign.open(nacl.util.decodeBase64(code), nacl.util.decodeBase64(publicKey)));
  if(!decrypted) return;
  if(decrypted.split(':')[0] != 'STEEM') return false;
  if(decrypted.split(':')[1] != from) return false;
  const username = decrypted.split(':')[2];
  const password = publicKey;
  app.service('users').find({
    'query': {
      username,
      '$limit': 1
    }
  }).then(async (localAccounts)=>{
    try {
      const local = localAccounts.data.length?localAccounts.data[0]:null;
      const data = {};
      data.steemnames=local&&local.steemnames?local.steemnames:{};
      data.steemnames[from]=data.steemnames[from]?data.steemnames[from]:{};
      const userdata = await steem.api.getAccountsAsync([from]);
      const profile = (userdata && userdata[0] && userdata[0].json_metadata)?JSON.parse(userdata[0].json_metadata).profile:null;
      if(profile&&profile.profile_image) {
        data.steemnames[from].avatar = profile.profile_image;
        data.avatar = profile.profile_image;
      }
      if(!(local && local.nick)) data.nick = from;
      if(local) {
        if((password == local.password) || !local.password) app.service('users').patch(local._id, data).catch(console.error);
      }
      else {
        data.username = username;
        data.password = password;
        app.service('users').create(data).catch(console.error);
      }
    } catch(e) {console.error(e);}
  });
  return false;
}

const steem = require('steem');
const getMessagesService = require('./messages/messages.service.js');
const users = require('./users/users.service.js');
const rooms = [];

const dorooms = (app)=>{
  steem.api.getAccountHistoryAsync('dconnect', -1 ,1000).then(
    (hist)=>{
      for(const index in hist) {
        const transferOp = hist[index][1].op;
        if(transferOp[0] =='transfer' && transferOp[1].memo.split(':').length > 2 && transferOp[1].memo.startsWith('ROOM:') && parseFloat(transferOp[1].amount.split(' ')[0]) >= 0.001) {
          const room = transferOp[1].memo;
          const split = room.split(':');
          const name = split[1];
          if(rooms.indexOf(name) == -1) {
            console.log('adding', name);
            rooms.push(name);
            const messages = getMessagesService(name);
            app.configure(messages);
          }
        }
      } 
    }
  ).catch(console.error);
};

module.exports = function (app) {
  setInterval(()=>{dorooms(app);},60000);
  dorooms(app);
  app.configure(users);
};

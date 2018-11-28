if(localStorage.getItem('dapps')=='[null]')localStorage.setItem('dapps','[]');
if(!localStorage.getItem('dapps')) localStorage.setItem('dapps',JSON.stringify([]));
// Establish a Socket.io connection
const socket = io();
// Initialize our Feathers client application through Socket.io
// with hooks and authentication.
const client = feathers();

client.configure(feathers.socketio(socket));
// Use localStorage to store our login token
client.configure(feathers.authentication({
  storage: window.localStorage
}));

window.dapp = {
  clients:{},
};

const getSubscriptionHandler = (name, service, event) =>{
  return (data)=>{
    const client = dapp.clients[name];
    if(!client) return;
    const methods = client.methods;
    if(methods && methods.update) dapp.clients[name].methods.update({service, event:'created', data:Object.assign(data, {})});
  };
};

const doSubscribe = function(name, service) {
  client.service(service).on('created', getSubscriptionHandler(name, service, 'created'));
  client.service(service).on('patched', getSubscriptionHandler(name, service, 'patched'));
  client.service(service).on('updated', getSubscriptionHandler(name, service, 'updated'));
  client.service(service).on('removed', getSubscriptionHandler(name, service, 'removed'));
};
dapp.subscribe = function(name) {
  if(!dapp.clients[name]) {
    const service = 'dapp.'+name+'.messages';
    doSubscribe(name, 'users');
    doSubscribe(name, service);
    dapp.clients[name] = {methods:{}};
  } else {
  };
  return dapp.clients[name];
};


const getMethods = (name)=> {
  return {
    create:(service, data)=>{
      return client.service('dapp.'+name+'.'+service).create(data);
    },
    subscribe:(serv)=>{
      return 'Deprecated, subscriptions are automatic now';
    },
    video:(num)=>{
      return runme(num);
    },
    call:(num)=>{
      if(dapp.voice) return dapp.voice.call(num);
    },
    find:async(service, limit=1000)=>{
      let selector = await client.service(service=='users'?service:'dapp.'+name+'.'+service).find({
        query: {
          $sort: { createdAt: -1 },
          $limit: limit
        }
      });
      let array = [];
      selector.data.forEach((item)=>{
        array.push(item);
      });
      return array;
    },
    logout: async()=>{
      await client.logout();
      document.getElementById('app').innerHTML = loginHTML;
    },
    addApp: async(name)=>{
      const dapps = JSON.parse(localStorage.getItem('dapps'));
      const room = await getRoom(name);
      var index;
      for(const i in dapps) {
        if(name == dapps[i].name) {
          index=i;
        }
      }
      if(room) dapps[index?index:dapps.length]=room;
      localStorage.setItem('dapps', JSON.stringify(dapps));
      updateList('dapps-menu');
    }
  };
};
const updateList = (item)=>{
  const dappsjson = localStorage.getItem('dapps');
  const dapps = dappsjson?JSON.parse(dappsjson):[];
  const config = [
    {image:'https://cdn.glitch.com/912a0b25-5ca3-4b45-8496-060a45039a66%2Ficon.jpg?1543144476433', name:'dchat'},
  ];
  if(typeof dapps == 'object') {
    for(const index in dapps) {
      config.push(dapps[index]);
    }
  }
  config.push({image:'https://cdn.glitch.com/912a0b25-5ca3-4b45-8496-060a45039a66%2Fplus.png?1543145430954', name:'add-dapp'});
  
  const apps = (config.map((app)=>{
    dapp.subscribe(app.name);
    return '<img  alt="" onclick=\'showApp(); openChild("'+app.name+'")\' class="avatar" src="'+app.image+'"/>';
  }).join(''));
  document.getElementById(item).innerHTML=apps;
};

const openChild = (name)=>{
  const url = 'https://'+name+'.glitch.me/?name='+name;
  if(document.getElementById('frame').children[1]) {
    document.getElementById('frame').children[1].delete;
  }
  Penpal.connectToChild({
    url: url,
    appendTo: document.getElementById('frame'),
    methods: getMethods(name)
  }).promise.then((methods)=>{
    dapp.clients[name].methods.update = methods.update;
  });
  document.getElementById('frame').children[1].classList.add('col-12');
  document.getElementById('frame').children[1].style = 'padding:0px';
};

const login = async credentials => {
  try {
    if(!credentials) {
      // Try to authenticate using the JWT from localStorage
      await client.authenticate();
    } else {
      // If we get login information, add the strategy we want to use for login
      const payload = Object.assign({ strategy: 'local' }, credentials);
      localStorage.setItem('voice', credentials.username+':'+credentials.password);
      localStorage.setItem('user', document.querySelector('[name="username"]').value);
      await client.authenticate(payload);
    }
    const voice = localStorage.getItem('voice');
    startPhone('web.'+voice.split(':')[0], voice.split(':')[1]);
    showApp();
    
    document.getElementById('dapps-menu').children[0].click();
  } catch(error) {
    // If we got an error, show the login page
    console.log(error);
    showLogin(error);
  }
};

const getRoom = async (roomName)=>{
  const owners = {};
  const hist = await window.steem.api.getAccountHistoryAsync('dconnect', -1 ,1000);
  var output;
  for(const index in hist) {
    const transferOp = hist[index][1].op;
    if(transferOp[0] =='transfer' && transferOp[1].memo.split(':').length >= 2 && transferOp[1].memo.startsWith('ROOM:') && parseFloat(transferOp[1].amount.split(' ')[0]) >= 0.001) {
      const room = transferOp[1].memo;
      const split = room.split(':');
      const name = split[1];
      if(name == roomName && split[1] && (!owners[name] || owners.name==transferOp[1].from)) { //only owners can update
        output= {name:split[1],image:split.length>3?[split[2],split[3]].join(':'):''}; 
        owners[name] = transferOp[1].fron;
      }
    }
  } 
  return output;
};
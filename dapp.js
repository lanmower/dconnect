function initDapp() {
  if(localStorage.getItem('dapps')=='[null]')localStorage.setItem('dapps','[]');
  if(!localStorage.getItem('dapps')) localStorage.setItem('dapps',JSON.stringify([]));

  // Initialize our Feathers client application through Socket.io
  // with hooks and authentication.
  window.client = Gun(['https://gunjs.herokuapp.com/gun']).get('dconnect');
  var userId;

  var code = localStorage.getItem('code');
  const clients = {};
  var user;
  function subscribe(name) {
    if(!clients[name]) {
      client.get(name).get('user').on(function(data, key) {
        clients[name].methods.update('user',data,key);
      });
      client.get(name).get('messages').on(function(data, key) {
        clients[name].methods.update('messages',data,key);
      });
      clients[name] = {methods:{}};
  } else {
    };
    return clients[name];
  };

  function appUser = () => {
    return client.get(name).get('users').get(username);
  }

  function globalUser = () => {
    return client.get('users').get(username);
  }

  const getMethods = (name)=> {
    return {
      create:(name, service, data)=>{
        return client.get(name).get(service).create(data);
      },
      video:(num)=>{
        /*var domain = 'meet.jit.si';
        var options = {
          roomName: num,
          parentNode: document.querySelector('#meet')
        };
        var api = new JitsiMeetExternalAPI(domain, options);
        document.getElementById('meet').style.display='block';*/
        init(num);
      },
      /*call:async (num)=>{
        if(!voice.started) {
          await startPhone();
          await voice.init();
          await voice.register();
          voice.started = 1;
        }
        if(voice) return voice.call(num);
      },*/
      find:(service, limit=1000)=>{
        return new Promise((resolve, reject)=>{
          let selector = client.get(name).get(service).once(resolve)
        });
      },
      logout: ()=>{
      },
      editApp: async(name)=>{
        showApp();
        openChild(name);
        openEdit(name);
      },
      addApp: (name)=>{
        const dapps = JSON.parse(localStorage.getItem('dapps'));
        const room = await getRoom(name);
        let index;
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

  const openEdit = (name)=>{
    console.log('opening edit', name);
    const url = 'https://glitch.com/edit/#!/'+name;
    if(document.getElementById('edit').children[1]) {
      document.getElementById('edit').children[1].delete;
    }
    document.getElementById('edit').innerHTML = '<button onclick="openChild(\''+name+'\'); console.log(\''+name+'\');">REFRESH</button><iframe src="'+url+'"></iframe>';
    document.getElementById('edit').style.display = 'block';
    //document.getElementById('frame').children[1].classList.add('col-12');
    //document.getElementById('frame').children[1].style = 'padding:0px';
  };

  window.login = async {username,password} => {
    try {
      user = username;
      user.auth(username, password);
      showApp();
      const urlParams = new URLSearchParams(location.search);
      if(urlParams.get('a')) {
        const dapps = JSON.parse(localStorage.getItem('dapps'));
        const room = await getRoom(urlParams.get('a'));
        let index;
        for(const i in dapps) {
          if(room.name == dapps[i].name) {
            index=i;
          }
        }
        console.log(index);
        if(room && !index) dapps[dapps.length]=room;
        localStorage.setItem('dapps', JSON.stringify(dapps));
        updateList('dapps-menu');
        openChild(urlParams.get('a'));
      }
      else document.getElementById('dapps-menu').children[1].click();
    } catch(error) {
      // If we got an error, show the login page
      console.log(error);
      showLogin(error);
    }
  };

  const getRoom = (roomName)=>{
    return new Promise(resolve, reject) {
      client.get('room').once(resolve);
    }
  };

  window.openChild = (name)=>{
    subscribe(name);
    const url = 'https://'+name+'.glitch.me/?name='+name;
    document.getElementById('frame').innerHTML = '';
    Penpal.connectToChild({
      url: url,
      appendTo: document.getElementById('frame'),
      methods: getMethods(name)
    }).promise.then((methods)=>{
      clients[name].methods.update = methods.update;
    });
    appUser().put({online:new Date().getTime()});
  };

  window.updateList = (item)=>{
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
      subscribe(app.name);
      return '<img  alt="" onclick=\'showApp(); openChild("'+app.name+'")\' class="avatar" src="'+app.image+'"/>';
    }).join(''));
    const profile = '<img  alt="" id="showAccount" class="avatar" src="https://cdn.steemitimages.com/DQmPCGd7UMMjJwxh1UbLxqTkvFzTBir4ddwnyBxQmuVJMrU/DCONNECT-LOGO-2.png"/>';
    document.getElementById(item).innerHTML=profile+apps;
    document.getElementById('showAccount').onclick = () => {
      showAccount(code);
    };
    globalUser().put({rooms:config.map(app=>{return app.name;})});
  };
}
initDapp();

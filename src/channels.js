module.exports = function(app) {
  if(typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return;
  }
  

  app.on('connection', connection => {
    // On a new real-time connection, add it to the anonymous channel
    app.channel('anonymous').join(connection);
  });
  
  
  setInterval(async ()=>{
    try{
      const testOnline = (await app.service('users').find({
        query: {
          online: true
        }
      })).data;
      const online = app.channel('authenticated').connections;
      const offlineUsers = testOnline.filter(user=>{
        var remove = true;
        for(var index in online) {
          const connection = online[index];
          if(connection.user._id == user._id) remove= false;
        }
        return remove;
      });
      for(var y in offlineUsers) {
        app.service('users').patch(offlineUsers[y]._id, { online: false });
      }
    }catch(e){console.error(e);};
  },10000);
 
  
  app.on('logout', (payload, { connection }) => {
    app.service('users').patch(connection.user._id, { online: false });
    if(connection) {
      //When logging out, leave all channels before joining anonymous channel
      app.channel(app.channels).leave(connection);
      app.channel('anonymous').join(connection);
    }
  });
  
  app.on('login', (authResult, { connection }) => {
    app.service('users').patch(connection.user._id, { online: true });
    // connection can be undefined if there is no
    // real-time connection, e.g. when logging in via REST
    if(connection) {
      // Obtain the logged in user from the connection
      // const user = connection.user;

      // The connection is no longer anonymous, remove it
      app.channel('anonymous').leave(connection);
      // Add it to the authenticated user channel
      app.channel('authenticated').join(connection);
      app.channel(connection.user._id).join(connection);
    }
  });

  app.publish((data, hook) => { // eslint-disable-line no-unused-vars
    // Publish all service events to all authenticated users
    return app.channel('authenticated').filter(connection => {
      try { 
        if(data.to) { 
          if(connection.user._id != data.to) return false;
        }
        if(!connection.user) return false;
        return connection.user.rooms.indexOf(hook.service.name) !== -1;
      } catch(e) {
        console.error(e);
      }
    });

    return app.channel('authenticated');
  });
};
dapp.voice = {call:{}};
const voice = dapp.voice;
dapp.verifyBrowser = (SIPml) => {
  var message, link;
  if(SIPml.isWebRtcSupported()) return true;;
  // check webrtc4all version
  if (SIPml.isWebRtc4AllSupported() && SIPml.isWebRtc4AllPluginOutdated()) {
    message ='Your WebRtc4all extension is outdated ('+SIPml.getWebRtc4AllVersion()+'). A new version with critical bug fix is available. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.';
    link = 'http://code.google.com/p/webrtc4all/downloads/list';
    return {link, message};
  }

  // check for WebRTC support
  if (!SIPml.isWebRtcSupported()) {
  // is it chrome?
    if (SIPml.getNavigatorFriendlyName() == 'chrome') {
      message ='You are using an old Chrome version or WebRTC is not enabled.\nDo you want to see how to enable WebRTC?';
      link = 'http://www.webrtc.org/running-the-demos';
      return {link, message};
    }
  }

  // for now the plugins (WebRTC4all only works on Windows)
  if (SIPml.getSystemFriendlyName() == 'windows') {
    if (SIPml.getNavigatorFriendlyName() == 'ie') {
      if (parseFloat(SIPml.getNavigatorVersion()) < 9.0) {
        message ='You are using an old IE version. You need at least version 9. Would you like to update IE?';
        link = 'http://windows.microsoft.com/en-us/internet-explorer/products/ie/home';
      }
    }
  }

  // check for WebRTC4all extension
  if (!SIPml.isWebRtc4AllSupported()) {
    message ='webrtc4all extension is not installed. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.';
    link = 'http://code.google.com/p/webrtc4all/downloads/list';
  }
  // break page loading ('window.location' won't stop JS execution)
  if (!SIPml.isWebRtc4AllSupported()) {
    return {link, message};
  }
  else if (SIPml.getNavigatorFriendlyName() == 'safari' || SIPml.getNavigatorFriendlyName() == 'firefox' || SIPml.getNavigatorFriendlyName() == 'opera') {
    message ='Your browser does not support WebRTC.\nDo you want to install WebRTC4all extension to enjoy audio calls?\nIMPORTANT: You must restart your browser after the installation.';
    link = 'http://code.google.com/p/webrtc4all/downloads/list';
    return {link, message};
  } else {
    message ='WebRTC not supported on your browser.\nDo you want to download a WebRTC-capable browser?';
    link = 'https://www.google.com/intl/en/chrome/browser/';
    return {link, message};
  }

  // checks for WebSocket support
  if (!SIPml.isWebSocketSupported() && !SIPml.isWebRtc4AllSupported()) {
    message ='Your browser don\'t support WebSockets.\nDo you want to download a WebSocket-capable browser?';
    link = 'https://www.google.com/intl/en/chrome/browser/';
  }

  if (!SIPml.isWebRtc4AllSupported() && !SIPml.isWebRtcSupported()) {
    message ='Your browser don\'t support WebRTC.\n calls will be disabled.\nDo you want to download a WebRTC-capable browser?';
    link = 'https://www.google.com/intl/en/chrome/browser/';
  }
  return true;
};

startPhone = (username, password) => {
  let {SIPml, localStorage}=window;
  var oRingTone, oRingbackTone;
  var oSipStack, oSipSessionRegister, oSipSessionCall;
  var audioRemote;
  var oNotifICall;
  var oReadyStateTimer;
  const sip_caps = [
    { name: '+g.oma.sip-im', value: null },
    { name: '+audio', value: null },
    { name: 'language', value: '\'en,fr\'' }
  ];
  
  audioRemote = document.getElementById('audio_remote');
  
  SIPml.setDebugLevel(dapp.sipDebug?dapp.sipDebug:'info');
  
  var getPVal = function (PName) {
    var query = location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) === PName) {
        return decodeURIComponent(pair[1]);
      }
    }
    return null;
  };
  
  oReadyStateTimer = setInterval(function () {
    if (document.readyState === 'complete') {
      clearInterval(oReadyStateTimer);
      SIPml.init(postInit);
    }
  },
  500);
  
  
  function postInit() {
    const browserStatus = dapp.verifyBrowser(SIPml);
    if(browserStatus !== true) {
      dapp.dialog(browserStatus.message+'<br/><a href='+browserStatus.link+'/>Click here</a>');
      return;
    } 
    SIPml.setDebugLevel('error');
    
    sipRegister();
  }
  
  
  
  
  function sipRegister() {
    try {
      
      
      var o_impu = tsip_uri.prototype.Parse(username);
      
      // enable notifications if not already done
      if (window.webkitNotifications && window.webkitNotifications.checkPermission() != 0) {
        window.webkitNotifications.requestPermission();
      }
      
      SIPml.setDebugLevel(dapp.sipDebug?dapp.sipDebug:'info');
      const config = {
        realm: 'asterisk.org',
        impi: username,
        impu: 'sip:'+username+'@steem.host',
        password: password,
        display_name: '',
        websocket_proxy_url: 'wss://steem.host:8089/ws',
        outbound_proxy_url: null,
        ice_servers: [{ url: 'stun:stun.l.google.com:19302'}],
        enable_rtcweb_breaker: false,
        events_listener: { events: '*', listener: onSipEventStack },
        enable_early_ims: true,
        enable_media_stream_cache: false,
        bandwidth: localStorage.getItem('bandwidth'),
        sip_headers: [
          { name: 'User-Agent', value: 'IM-client/OMA1.0 dConnect.v0.01' },
          { name: 'Organization', value: 'dConnect' }
        ]
      };
      // create SIP stack
      oSipStack = new SIPml.Stack(config);
      if (oSipStack.start() != 0) {
        txtRegStatus.innerHTML = '<b>Failed to start the SIP stack</b>';
      };
      
    }
    catch (e) {
      console.log(e);
      txtRegStatus.innerHTML = e.toString();
    }
  }
  
  sipUnRegister = () => {if (oSipStack) oSipStack.stop();};
  
  dapp.voice.call = (address, s_type='call-audio') => {
    const oConfigCall = {
      audio_remote: audioRemote,
      screencast_window_id: 0x00000000, // entire desktop
      bandwidth: { audio:undefined },
      events_listener: { events: '*', listener: onSipEventSession },
      sip_caps: [
        { name: '+g.oma.sip-im' },
        { name: 'language', value: '\'en,fr\'' }
      ]
    };
    if (oSipStack && !oSipSessionCall) {

      if(!oConfigCall) oConfigCall = {};
      oConfigCall.bandwidth = tsk_string_to_object(localStorage.getItem('bandwidth'));
      oSipSessionCall = oSipStack.newSession(s_type, oConfigCall);
      if (oSipSessionCall.call(address) != 0) {
        oSipSessionCall = null;
        voice.callstatus = 'Failed to make call';
        return;
      }
    }
    else if (oSipSessionCall) {
      voice.callstatus = 'Connecting...';
      oSipSessionCall.accept(oConfigCall);
    }
  };
  
  function sipToggleMute() {
    if (oSipSessionCall) {
      var i_ret;
      var bMute = !oSipSessionCall.bMute;
      voice.callstatus = bMute ? 'Mute the call...' : 'Unmute the call...';
      i_ret = oSipSessionCall.mute('audio', bMute);
      if (i_ret != 0) {
        voice.callstatus = 'Mute / Unmute failed';
        return;
      }
      oSipSessionCall.bMute = bMute;
    }
  }
  
  sipHangUp = function sipHangUp() {
    if (oSipSessionCall) {
      voice.callstatus = 'Terminating the call...';
      oSipSessionCall.hangup({events_listener: { events: '*', listener: onSipEventSession }});
    }
  };
  
  function sipSendDTMF(c){
    if(oSipSessionCall && c){
      if(oSipSessionCall.dtmf(c) == 0){
        try { dtmfTone.play(); } catch(e){ }
      }
    }
  }
  
  function startRingTone() {
    try { ringtone.play(); }
    catch (e) { }
  }
  
  function stopRingTone() {
    try { ringtone.pause(); }
    catch (e) { }
  }
  
  function startRingbackTone() {
    try { ringbacktone.play(); }
    catch (e) { }
  }
  
  function stopRingbackTone() {
    try { ringbacktone.pause(); }
    catch (e) { }
  }
  
  
  function showNotifICall(s_number) {
    // permission already asked when we registered
    if (webkitNotifications && webkitNotifications.checkPermission() == 0) {
      if (oNotifICall) {
        oNotifICall.cancel();
      }
      oNotifICall = webkitNotifications.createNotification('images/sipml-34x39.png', 'Incaming call', 'Incoming call from ' + s_number);
      oNotifICall.onclose = function () { oNotifICall = null; };
      oNotifICall.show();
    }
  }
  
  
  
  function uiOnConnectionEvent(b_connected, b_connecting) { 
  }
  
  
  function uiCallTerminated(s_description){
    oSipSessionCall = null;
    
    stopRingbackTone();
    stopRingTone();
    
    voice.callstatus = s_description;
    
    if (oNotifICall) {
      oNotifICall.cancel();
      oNotifICall = null;
    }
    
    
    setTimeout(function () { if (!oSipSessionCall) dapp.voice.status = ''; }, 2500);
  }
  
  // Callback function for SIP Stacks
  function onSipEventStack(e /*SIPml.Stack.Event*/) {
    tsk_utils_log_info('==stack event = ' + e.type);
    switch (e.type) {
    case 'started':
    {
      // catch exception for IE (DOM not ready)
      try {
        // LogIn (REGISTER) as soon as the stack finish starting
        oSipSessionRegister = this.newSession('register', {
          expires: 200,
          events_listener: { events: '*', listener: onSipEventSession },
          sip_caps
        });
        oSipSessionRegister.register();
      }
      catch (e) {
        dapp.voice.regstatus = e.toString();
      }
      break;
    }
    case 'stopping': case 'stopped': case 'failed_to_start': case 'failed_to_stop':
    {
      var bFailure = (e.type == 'failed_to_start') || (e.type == 'failed_to_stop');
      oSipStack = null;
      oSipSessionRegister = null;
      oSipSessionCall = null;

      uiOnConnectionEvent(false, false);

      stopRingbackTone();
      stopRingTone();


      dapp.voice.status = '';
      dapp.voice.regStatus = bFailure ? 'Disconnected:' + e.description : 'Disconnected';
      break;
    }

    case 'i_new_call':
    {
      if (oSipSessionCall) {
        // do not accept the incoming call if we're already 'in call'
        e.newSession.hangup(); // comment this line for multi-line support
      }
      else {
        oSipSessionCall = e.newSession;
        // start listening for events
        oSipSessionCall.setConfiguration(oConfigCall);


        startRingTone();

        var sRemoteNumber = (oSipSessionCall.getRemoteFriendlyName() || 'unknown');
        voice.callstatus = 'Incoming call from [' + sRemoteNumber + ']';
        showNotifICall(sRemoteNumber);
      }
      break;
    }
      
    case 'starting': default: break;
    }
  };
  
  function onSipEventSession(e) {
    switch (e.type) {
    case 'connecting': case 'connected':
    {
      var bConnected = (e.type == 'connected');
      if (e.session == oSipSessionRegister) {
        uiOnConnectionEvent(bConnected, !bConnected);
        console.log(e);
        dapp.voice.regstatus = 'Ready';
      }
      else if (e.session == oSipSessionCall) {
        if (bConnected) {
          stopRingbackTone();
          stopRingTone();

          if (oNotifICall) {
            oNotifICall.cancel();
            oNotifICall = null;
          }
        }

        dapp.voice.callstatus =  e.description;

      }
      break;
    }
    case 'terminating': case 'terminated':
    {
      if (e.session == oSipSessionRegister) {
        uiOnConnectionEvent(false, false);

        oSipSessionCall = null;
        oSipSessionRegister = null;
        console.log(e);
        dapp.voice.callstatus = e.description;
      }
      else if (e.session == oSipSessionCall) {
        uiCallTerminated(e.description);
      }
      break;
    } // 'terminating' | 'terminated'
    case 'm_stream_audio_remote_removed': {
      break;
    }

    case 'i_ao_request': {
      if(e.session == oSipSessionCall){
        var iSipResponseCode = e.getSipResponseCode();
        if (iSipResponseCode == 180 || iSipResponseCode == 183) {
          startRingbackTone();
          dapp.voice.callstatus = 'Ringing...';
        }
      }
      break;
    }

    case 'm_early_media': {
      if(e.session == oSipSessionCall){
        stopRingbackTone();
        stopRingTone();
        dapp.voice.callstatus = 'Early media started';
      }
      break;
    }

    case 'm_remote_hold': {
      if(e.session == oSipSessionCall){
        dapp.voice.callstatus = 'Placed on hold by remote party';
      }
      break;
    }
    case 'm_remote_resume': {
      if(e.session == oSipSessionCall){
        dapp.voice.callstatus = 'Taken off hold by remote party';
      }
      break;
    }
    }
  }
};


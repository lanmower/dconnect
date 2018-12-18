const appURL = () => {
  const protocol = 'http'+((location.hostname == 'localhost') ? '' : 's')+'://';
  return protocol+'dvid-server.glitch.me'; 
};
const getRoomName = () => {
  let roomName = location.pathname.substring(1);
  if(roomName == '') {
    const randomName = () => Math.random().toString(36).substr(2, 6);
    roomName = randomName();
    const newurl = appURL() +'/'+ roomName;
    //window.history.pushState({url: newurl}, roomName, newurl);
  }
  return roomName;
};
var SIGNALING_SERVER = appURL();
var USE_AUDIO = true;
var USE_VIDEO = true;

var ICE_SERVERS = [
  /*{'urls': 'stun:stun.l.google.com:19302'},
  {'urls': 'stun:stun.stunprotocol.org:3478'},
  {'urls': 'stun:stun.sipnet.net:3478'},*/
  {'urls': 'stun:stun.ideasip.com:3478'},
  {'urls': 'stun:stun.iptel.org:3478'}
];

var signaling_socket = null;   /* our socket.io connection to our webserver */
var local_media_stream = null; /* our own microphone / webcam */
var peers = {};                /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */
var peer_media_elements = {};  /* keep track of our <video>/<audio> tags, indexed by peer_id */

function init(ROOM_ID) {
  // console.log("Connecting to signaling server");
  signaling_socket = io(SIGNALING_SERVER);

  signaling_socket.on('connect', function() {
    // console.log("Connected to signaling server");
    setup_local_media(function() {
      /* once the user has given us access to their
       * microphone/camcorder, join the channel and start peering up */
      join_chat_channel(ROOM_ID, {});
    });
  });
  signaling_socket.on('disconnect', function() {
    // console.log("Disconnected from signaling server");
    /* Tear down all of our peer connections and remove all the
     * media divs when we disconnect */
    for (peer_id in peer_media_elements) {
      document.getElementById('video').removeChild(peer_media_elements[peer_id].parentNode);
      resizeVideos();
    }
    for (peer_id in peers) {
      peers[peer_id].close();
    }

    peers = {};
    peer_media_elements = {};
  });
  function join_chat_channel(channel, userdata) {
    signaling_socket.emit('join', {channel, userdata});
  }
  function part_chat_channel(channel) {
    signaling_socket.emit('part', channel);
  }


  /** 
  * When we join a group, our signaling server will send out 'addPeer' events to each pair
  * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
  * in the channel you will connect directly to the other 5, so there will be a total of 15 
  * connections in the network). 
  */
  signaling_socket.on('addPeer', function(config) {
    // console.log('Signaling server said to add peer:', config);
    var peer_id = config.peer_id;
    if (peer_id in peers) {
      /* This could happen if the user joins multiple channels where the other peer is also in. */
      // console.log("Already connected to peer ", peer_id);
      return;
    }
    var peer_connection = new RTCPeerConnection(
      {'iceServers': ICE_SERVERS},
      {'optional': [{'DtlsSrtpKeyAgreement': true}]} // this will no longer be needed by chrome eventually (supposedly), but is necessary for now to get firefox to talk to chrome
    );
    peers[peer_id] = peer_connection;

    peer_connection.onicecandidate = function(event) {
      if (event.candidate) {
        signaling_socket.emit('relayICECandidate', {
          'peer_id': peer_id, 
          'ice_candidate': {
            'sdpMLineIndex': event.candidate.sdpMLineIndex,
            'candidate': event.candidate.candidate
          }
        });
      }
    };
    peer_connection.onaddstream = function(event) {
      // console.log("onAddStream", event);
      const videoWrap = document.createElement('div');
      videoWrap.className = 'video';
      const remote_media = document.createElement('video');
      remote_media.onclick = ()=>{remote_media.classList.toggle('selected');};
      videoWrap.appendChild(remote_media);
      remote_media.setAttribute('playsinline', true);
      remote_media.mediaGroup = 'remotevideo';
      remote_media.autoplay = true;
      remote_media.controls = false;
      peer_media_elements[peer_id] = remote_media;
      document.getElementById('video').appendChild(videoWrap);
      attachMediaStream(remote_media, event.stream);
      resizeVideos();
      checkParticipantsCount();
    };

    /* Add our local stream */
    peer_connection.addStream(local_media_stream);

    /* Only one side of the peer connection should create the
     * offer, the signaling server picks one to be the offerer. 
     * The other user will get a 'sessionDescription' event and will
     * create an offer, then send back an answer 'sessionDescription' to us
     */
    if (config.should_create_offer) {
      // console.log("Creating RTC offer to ", peer_id);
      peer_connection.createOffer(
        function (local_description) { 
          // console.log("Local offer description is: ", local_description);
          peer_connection.setLocalDescription(local_description,
            function() { 
              signaling_socket.emit('relaySessionDescription', 
                {'peer_id': peer_id, 'session_description': local_description});
              // console.log("Offer setLocalDescription succeeded"); 
            },
            function() { Alert('Offer setLocalDescription failed!'); }
          );
        },
        function (error) {
          console.log('Error sending offer: '+error);
        });
    }
  });


  /** 
   * Peers exchange session descriptions which contains information
   * about their audio / video settings and that sort of stuff. First
   * the 'offerer' sends a description to the 'answerer' (with type
   * "offer"), then the answerer sends one back (with type "answer").  
   */
  signaling_socket.on('sessionDescription', function(config) {
     console.log('Remote description received: ', config);
    var peer_id = config.peer_id;
    var peer = peers[peer_id];
    var remote_description = config.session_description;
     console.log(config.session_description);

    var desc = new RTCSessionDescription(remote_description);
    var stuff = peer.setRemoteDescription(desc, 
      function() {
         console.log("setRemoteDescription succeeded");
        if (remote_description.type == 'offer') {
           console.log("Creating answer");
          peer.createAnswer(
            function(local_description) {
              // console.log("Answer description is: ", local_description);
              peer.setLocalDescription(local_description,
                function() { 
                  signaling_socket.emit('relaySessionDescription', 
                    {'peer_id': peer_id, 'session_description': local_description});
                  // console.log("Answer setLocalDescription succeeded");
                },
                function() { Alert('Answer setLocalDescription failed!'); }
              );
            },
            function(error) {
              console.log('Error creating answer: ', error);
               console.log(peer);
            });
        }
      },
      function(error) {
        console.log('setRemoteDescription error: ', error);
      }
    );
    // console.log("Description Object: ", desc);
  });

  /**
   * The offerer will send a number of ICE Candidate blobs to the answerer so they 
   * can begin trying to find the best path to one another on the net.
   */
  signaling_socket.on('iceCandidate', function(config) {
    console.log('ice candidate', config);
    var peer = peers[config.peer_id];
    var ice_candidate = config.ice_candidate;
    peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
  });

  /**
   * When a user leaves a channel (or is disconnected from the
   * signaling server) everyone will recieve a 'removePeer' message
   * telling them to trash the media channels they have open for those
   * that peer. If it was this client that left a channel, they'll also
   * receive the removePeers. If this client was disconnected, they
   * wont receive removePeers, but rather the
   * signaling_socket.on('disconnect') code will kick in and tear down
   * all the peer sessions.
   */
  signaling_socket.on('removePeer', function(config) {
    // console.log('Signaling server said to remove peer:', config);
    var peer_id = config.peer_id;
    if (peer_id in peer_media_elements) {
      document.getElementById('video').removeChild(peer_media_elements[peer_id].parentNode);
      resizeVideos();
    }
    if (peer_id in peers) {
      peers[peer_id].close();
    }

    delete peers[peer_id];
    delete peer_media_elements[config.peer_id];
  });
  document.getElementById('roomurl').textContent = SIGNALING_SERVER+'/'+ROOM_ID;
  document.getElementById('roomurl').addEventListener('click', event => {
    let range, selection;
    selection = window.getSelection();
    range = document.createRange();
    range.selectNodeContents(event.target);
    selection.removeAllRanges();
    selection.addRange(range);			
  });

}
function setup_local_media(callback, errorback) {
  if (local_media_stream != null) {  /* ie, if we've already been initialized */
    if (callback) callback();
    return; 
  }
  attachMediaStream = function(element, stream) {
    // console.log('DEPRECATED, attachMediaStream will soon be removed.');
    element.srcObject = stream;
  };
  navigator.mediaDevices.getUserMedia({'audio':USE_AUDIO, 'video':USE_VIDEO}).then((stream) => {
    local_media_stream = stream;
    const videoWrap = document.createElement('div');
    videoWrap.className = 'video';
    videoWrap.setAttribute('id', 'selfVideoWrap');
    const btnWrap = document.createElement('div');
    btnWrap.setAttribute('id', 'btnWrap');
    const muteBtn = document.createElement('button');
    muteBtn.setAttribute('id', 'mutebtn');
    muteBtn.className = 'fas fa-microphone';
    muteBtn.addEventListener('click', (e) => {
      local_media_stream.getAudioTracks()[0].enabled = !(local_media_stream.getAudioTracks()[0].enabled);
      e.target.className = 'fas fa-microphone'+(local_media_stream.getAudioTracks()[0].enabled ? '' : '-slash');
    });
    btnWrap.appendChild(muteBtn);
    const videoMuteBtn = document.createElement('button');
    videoMuteBtn.setAttribute('id', 'videomutebtn');
    videoMuteBtn.className = 'fas fa-video';
    videoMuteBtn.addEventListener('click', (e) => {
      local_media_stream.getVideoTracks()[0].enabled = !(local_media_stream.getVideoTracks()[0].enabled);
      e.target.className = 'fas fa-video'+(local_media_stream.getVideoTracks()[0].enabled ? '' : '-slash');
    });
    btnWrap.appendChild(videoMuteBtn);
    videoWrap.appendChild(btnWrap);
    const local_media = document.createElement('video');
    videoWrap.appendChild(local_media);
    local_media.setAttribute('id', 'selfVideo');
    local_media.setAttribute('playsinline', true);
    local_media.autoplay = true;
    local_media.muted = true;
    local_media.volume = 0;
    local_media.controls = false;
    document.getElementById('video').appendChild(videoWrap);
    attachMediaStream(local_media, stream);
    resizeVideos();
    if (callback) callback();
  }).catch(() => { /* user denied access to a/v */
    alert('if you clicked from a mobile device you will need to click the three dots in the upper right corner to display "open in Chrome". Then click "open in Chrome" and then "Allow" ');
    if (errorback) errorback();
  });
}
const resizeVideos = () => {
  const numToString = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
  const videos = document.querySelectorAll('.video');
  document.querySelectorAll('.video').forEach(v => {
    v.className = 'video '+numToString[videos.length];
  });
};
const checkParticipantsCount = () => {
  const videos = document.querySelectorAll('.video');
  if(videos.length > 4){
    document.getElementById('tooManyParticipants').style.display = 'block';
    setTimeout(() => {
      document.getElementById('tooManyParticipants').style.display = 'none';
    }, 3000);
  }
  if(videos.length > 1) {
    document.getElementById('intro').style.display = 'none';
  }
};
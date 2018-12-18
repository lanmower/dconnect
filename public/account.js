// Chat base HTML (without user list and messages)
const accountHTML = `
<div id="dapps-menu" class="mui--no-user-select">
</div>
<div id="content-wrapper" class="login">
  <p>
  Register your social identity using: 
  <select id="network">
    <option value="STEEM">STEEM</option>
  </select>
  </p>
  <div>
  account name: @<input type="text" id="name"></input>
  <div>
  password:
  <input type="password" id="password"></input>
  </div>
  </div>
  <fieldset>
  <textarea id="code" rows="6" cols="40"></textarea>
  </fieldset>
</div>
`;

const showAccount = async (code) => {
  function debounce(cb, interval, immediate) {
    var timeout;

    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) cb.apply(context, args);
      };          

      var callNow = immediate && !timeout;

      clearTimeout(timeout);
      timeout = setTimeout(later, interval);

      if (callNow) cb.apply(context, args);
    };
  };
  async function docode() {
    const network = document.getElementById('network').value;
    const name = document.getElementById('name').value;
    const username = (await client.service('users').get((await client.passport.verifyJWT(client.passport.storage['feathers-jwt'])).userId)).username;
    const password = document.getElementById('password').value;
    const hash = md5([username,'asterisk',password].join(':'));
    const keys = nacl.sign.keyPair.fromSeed(nacl.util.decodeUTF8(md5(hash)));
    const {secretKey, publicKey} = keys;
    console.log([network,name,username].join(':'));
    const data = nacl.util.encodeBase64(nacl.sign(nacl.util.decodeUTF8([network,name,username].join(':')), secretKey));
    if(localStorage.getItem('pubKey') != nacl.util.encodeBase64(publicKey)) {
      document.getElementById('code').textContent = 'Incorrect password';
      return;
    }
    document.getElementById('code').textContent = 'CONNECT:'+nacl.util.encodeBase64(publicKey)+':'+data;
  }

  document.getElementById('app').innerHTML = accountHTML;
  updateList('dapps-menu');
  document.getElementById('network').onchange= docode;
  document.getElementById('name').onkeydown= debounce(docode, 250);
  document.getElementById('name').onchange= debounce(docode, 250);
  document.getElementById('password').onkeydown= debounce(docode, 250);
  document.getElementById('password').onchange= debounce(docode, 250);
  document.getElementById('code').onkeydown= (ev)=>{ev.target.select();  document.execCommand('copy');};
};


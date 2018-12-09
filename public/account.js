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
  </div>
  <fieldset>
  <textarea id="code" rows="4" cols="40"></textarea>
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
    const encrypted = await encrypt(code+':'+network+':'+name);
    document.getElementById('code').innerHTML = 'CONNECT:'+encrypted;
  }

  function encrypt(code) {
    return new Promise(resolve =>{
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          resolve(JSON.parse(this.responseText).code);
        }
      };
      xhttp.open('POST', '/code', true);
      xhttp.setRequestHeader('Content-type', 'application/json');
      xhttp.send(JSON.stringify({code}));
    });
  }

  document.getElementById('app').innerHTML = accountHTML;
  updateList('dapps-menu');
  document.getElementById('network').onchange= docode;
  document.getElementById('name').onkeydown= debounce(docode, 250);
  document.getElementById('name').onchange= debounce(docode, 250);
  document.getElementById('code').onkeydown= (ev)=>{ev.target.select();  document.execCommand('copy');};
};


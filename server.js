var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var app = express();
var random; 
app.use(bodyParser.urlencoded({ extended: true }));
const eos = require('eosjs')({httpEndpoint: 'http://127.0.0.1:8888', chainId:'342f1b4af05f4978a8f5d8e3e3e3761cb22dacf21a93e42abe0753bdacb6b621'});

function Random(seed) {
  this._seed = seed % 2147483647;
  if (this._seed <= 0) this._seed += 2147483646;
}

Random.prototype.next = function () {
  return this._seed = this._seed * 16807 % 2147483647;
};

Random.prototype.nextFloat = function (opt_minOrMax, opt_max) {
  // We know that result of next() will be 1 to 2147483646 (inclusive).
  return (this.next() - 1) / 2147483646;
};

const hashCode = function(s) {
  var h = 0, l = s.length, i = 0;
  if ( l > 0 )
    while (i < l)
      h = (h << 5) - h + s.charCodeAt(i++) | 0;
  return h;
};

function randomString(inputRandom) {
  var chars = "abcdefghiklmnopqrstuvwxyz12345";
  var string_length = 12;
  var randomstring = '';
  for (var i=0; i<string_length; i++) {
    const next = inputRandom.nextFloat(0,1);
    var rnum = Math.floor(next * chars.length);
    randomstring += chars.substring(rnum,rnum+1);
  }
  return randomstring;
}

const get = async (key, table="public")=>{
  const conf = {json:true,scope:'freedomfirst',code:'freedomfirst', table, lower_bound:key, upper_bound:key, limit:100};
  if(table == 'public') {
     conf.table_key = 'key';
     conf.key_type = 'name';
     conf.index_position = 2;
  }
  const resp = await eos.getTableRows(conf);
  if(resp.rows.length && resp.rows[resp.rows.length-1].key == key) return resp.rows[resp.rows.length-1].value;
}
const getHash = function (path) {
  const random = new Random(hashCode(path.split('#')[0]));
  const id = randomString(random);
  return id;
}

app.use('/store', async function(req, res, next) {
    var path = req.query.path;
    var table = req.query.table||'public';
    const id = table=='public'?getHash(path):path;
    const page = await get(id, table)||'';
    await ipfs.pin.add(page);
    res.send('Upload done:'+page)
});

app.use(express.static('public'));
var proxy = require('express-http-proxy');
app.use(
  '/*', 
  proxy('http://127.0.0.1:8080', {
    proxyReqPathResolver: async function (req) {
      var path = req.query.path;
      var table = req.query.table||'public';
      if(req.originalUrl.startsWith('/ipfs')) return req.originalUrl;
      const split = req.originalUrl.split('?')[0].split('relative/');
      const request = split[0];
      const relative = split.length>1?'/'+split[1]:'/';
      const id = table=='public'?getHash(request):request.slice(1,-1);
      console.log("GETTING", id, table);
      let page = await get(id, table)||'';
      console.log(page);
      if(page.length == 46) return "http://127.0.0.1:8080/ipfs/"+page+relative;
    }
  })
);


var ipfsClient = require('ipfs-http-client')
global.ipfs = ipfsClient({ host: '127.0.0.1', port:5001, protocol: 'http' }); // Connect to IPFS

setInterval(async ()=>{
  const rows = (await eosPublic.getTableRows(true, 'freedomfirst','freedomfirst', 'public', null, 0, -1, 100)).rows;

  for(let index in rows) {
    const row = rows[index];
    setTimeout(()=>{ipfs.pin.add(row.value);},0);
  }
}, 86400000);

var listener = app.listen(3000, function() {
  console.log('Your app is listening on port ' + 3000);
});

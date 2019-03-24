ulimit -n 65535
forever start -a -o out.log -e err.log server.js 
 screen -dmS "ipfs" -s /bin/sh ./ipfs daemon

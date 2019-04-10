screen -dmS ipfs bash -c 'while true; do ./ipfs daemon && break; done'
screen -dmS ipfs bash -c 'while true; do node server.js && break; done'

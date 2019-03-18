rtmcore
=======

This is Under's fork of Bitpay's Bitcore that uses Raptoreum 1.0 It has a limited segwit support.

It is HIGHLY recommended to use https://github.com/Raptor3um/rtmcore-deb to build and deploy packages for production use.

----
Getting Started
=====================================
Deploying rtmcore full-stack manually:
----
````
sudo apt-get update
sudo apt-get -y install curl git python3 make build-essential libzmq3-dev python2.7
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

#restart your shell/os

nvm install 10.5.0
nvm use 10.5.0

#install mongodb
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable mongod.service

#install rtmcore
sudo ln -s /usr/bin/python2.7 /usr/bin/python
git clone https://github.com/Raptor3um/rtmcore.git
cd rtmcore && git checkout lightweight
npm install -g --production
````
Copy the following into a file named rtmcore-node.json and place it in ~/.rtmcore/ (be sure to customize username values(without angle brackets<>) and/or ports)
````json
{
  "network": "livenet",
  "port": 3001,
  "services": [
    "raptoreumd",
    "web",
    "insight-api",
    "insight-ui"
  ],
  "allowedOriginRegexp": "^https://<yourdomain>\\.<yourTLD>$",
  "messageLog": "",
  "servicesConfig": {
    "web": {
      "disablePolling": true,
      "enableSocketRPC": false
    },
    "insight-ui": {
      "routePrefix": "",
      "apiPrefix": "api"
    },
    "insight-api": {
      "routePrefix": "api",
      "coinTicker" : "https://api.coinmarketcap.com/v1/ticker/raptoreum/?convert=USD",
      "coinShort": "RVN",
	    "db": {
		  "host": "127.0.0.1",
		  "port": "27017",
		  "database": "raptor-api-livenet",
		  "user": "",
		  "password": ""
	  }
    },
    "raptoreumd": {
      "sendTxLog": "/home/<yourusername>/.rtmcore/pushtx.log",
      "spawn": {
        "datadir": "/home/<yourusername>/.rtmcore/data",
        "exec": "/home/<yourusername>/rtmcore/node_modules/rtmcore-node/bin/raptoreumd",
        "rpcqueue": 1000,
        "rpcport": 8766,
        "zmqpubrawtx": "tcp://127.0.0.1:28332",
        "zmqpubhashblock": "tcp://127.0.0.1:28332"
      }
    }
  }
}
````
Quick note on allowing socket.io from other services. 
- If you would like to have a seperate services be able to query your api with live updates, remove the "allowedOriginRegexp": setting and change "disablePolling": to false. 
- "enableSocketRPC" should remain false unless you can control who is connecting to your socket.io service. 
- The allowed OriginRegexp does not follow standard regex rules. If you have a subdomain, the format would be(without angle brackets<>):
````
"allowedOriginRegexp": "^https://<yoursubdomain>\\.<yourdomain>\\.<yourTLD>$",
````

To setup unique mongo credentials:
````
mongo
>use raptor-api-livenet
>db.createUser( { user: "test", pwd: "test1234", roles: [ "readWrite" ] } )
>exit
````
(then add these unique credentials to your rtmcore-node.json)

Copy the following into a file named raptor.conf and place it in ~/.rtmcore/data
````json
server=1
whitelist=127.0.0.1
txindex=1
addressindex=1
timestampindex=1
spentindex=1
zmqpubrawtx=tcp://127.0.0.1:28332
zmqpubhashblock=tcp://127.0.0.1:28332
rpcport=8766
rpcallowip=127.0.0.1
rpcuser=raptoreum
rpcpassword=local321 #change to something unique
uacomment=rtmcore-sl

mempoolexpiry=72 # Default 336
rpcworkqueue=1100
maxmempool=2000
dbcache=1000
maxtxfee=1.0
dbmaxfilesize=64
````
Launch your copy of rtmcore:
````
rtmcored
````
You can then view the Raptoreum block explorer at the location: `http://localhost:3001`

Create an Nginx proxy to forward port 80 and 443(with a snakeoil ssl cert)traffic:
----
IMPORTANT: this "nginx-rtmcore" config is not meant for production use
see this guide [here](https://www.nginx.com/blog/using-free-ssltls-certificates-from-lets-encrypt-with-nginx/) for production usage
````
sudo apt-get install -y nginx ssl-cert
````
copy the following into a file named "nginx-rtmcore" and place it in /etc/nginx/sites-available/
````
server {
    listen 80;
    listen 443 ssl;
        
    include snippets/snakeoil.conf;
    root /home/rtmcore/www;
    access_log /var/log/nginx/rtmcore-access.log;
    error_log /var/log/nginx/rtmcore-error.log;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 10;
        proxy_send_timeout 10;
        proxy_read_timeout 100; # 100s is timeout of Cloudflare
        send_timeout 10;
    }
    location /robots.txt {
       add_header Content-Type text/plain;
       return 200 "User-agent: *\nallow: /\n";
    }
    location /rtmcore-hostname.txt {
        alias /var/www/html/rtmcore-hostname.txt;
    }
}
````
Then enable your site:
````
sudo ln -s /etc/nginx/sites-available/nginx-rtmcore /etc/nginx/sites-enabled
sudo rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default
sudo mkdir /etc/systemd/system/nginx.service.d
sudo printf "[Service]\nExecStartPost=/bin/sleep 0.1\n" | sudo tee /etc/systemd/system/nginx.service.d/override.conf
sudo systemctl daemon-reload
sudo systemctl restart nginx
````
Upgrading rtmcore full-stack manually:
----

- This will leave the local blockchain copy intact:
Shutdown the rtmcored application first, and backup your unique raptor.conf and rtmcore-node.json
````
cd ~/
rm -rf .npm .node-gyp rtmcore
rm .rtmcore/data/raptor.conf .rtmcore/rtmcore-node.json

#reboot

git clone https://github.com/Raptor3um/rtmcore.git
cd rtmcore && git checkout lightweight
npm install -g --production
````
(recreate your unique raptor.conf and rtmcore-node.json)

- This will redownload a new blockchain copy:
(Some updates may require you to reindex the blockchain data. If this is the case, redownloading the blockchain only takes 20 minutes)
Shutdown the rtmcored application first, and backup your unique raptor.conf and rtmcore-node.json
````
cd ~/
rm -rf .npm .node-gyp rtmcore
rm -rf .rtmcore

#reboot

git clone https://github.com/Raptor3um/rtmcore.git
cd rtmcore && git checkout lightweight
npm install -g --production
````
(recreate your unique raptor.conf and rtmcore-node.json)

Undeploying rtmcore full-stack manually:
----
````
nvm deactivate
nvm uninstall 10.5.0
rm -rf .npm .node-gyp rtmcore
rm .rtmcore/data/raptor.conf .rtmcore/rtmcore-node.json
mongo
>use raptor-api-livenet
>db.dropDatabase()
>exit
````

## Applications

- [Node](https://github.com/Raptor3um/rtmcore-node) - A full node with extended capabilities using Raptoreum Core
- [Insight API](https://github.com/Raptor3um/insight-api) - A blockchain explorer HTTP API
- [Insight UI](https://github.com/Raptor3um/insight) - A blockchain explorer web user interface
- (to-do) [Wallet Service](https://github.com/Raptor3um/rtmcore-wallet-service) - A multisig HD service for wallets
- (to-do) [Wallet Client](https://github.com/Raptor3um/rtmcore-wallet-client) - A client for the wallet service
- (to-do) [CLI Wallet](https://github.com/Raptor3um/rtmcore-wallet) - A command-line based wallet client
- (to-do) [Angular Wallet Client](https://github.com/Raptor3um/angular-rtmcore-wallet-client) - An Angular based wallet client
- (to-do) [Copay](https://github.com/Raptor3um/copay) - An easy-to-use, multiplatform, multisignature, secure raptoreum wallet

## Libraries

- [Lib](https://github.com/Raptor3um/rtmcore-lib) - All of the core Raptoreum primatives including transactions, private key management and others
- (to-do) [Payment Protocol](https://github.com/Raptor3um/rtmcore-payment-protocol) - A protocol for communication between a merchant and customer
- [P2P](https://github.com/Raptor3um/rtmcore-p2p) - The peer-to-peer networking protocol
- (to-do) [Mnemonic](https://github.com/Raptor3um/rtmcore-mnemonic) - Implements mnemonic code for generating deterministic keys
- (to-do) [Channel](https://github.com/Raptor3um/rtmcore-channel) - Micropayment channels for rapidly adjusting raptoreum transactions
- [Message](https://github.com/Raptor3um/rtmcore-message) - Raptoreum message verification and signing
- (to-do) [ECIES](https://github.com/Raptor3um/rtmcore-ecies) - Uses ECIES symmetric key negotiation from public keys to encrypt arbitrarily long data streams.

## Security

We're using rtmcore in production, but please use common sense when doing anything related to finances! We take no responsibility for your implementation decisions.

## Contributing

Please send pull requests for bug fixes, code optimization, and ideas for improvement. For more information on how to contribute, please refer to our [CONTRIBUTING](https://github.com/Raptor3um/rtmcore/blob/master/CONTRIBUTING.md) file.

To verify signatures, use the following PGP keys:
- @Raptor3um: http://pgp.mit.edu/pks/lookup?op=get&search=0x009BAB88B3BD190C `EE6F 9673 1EF6 ED85 B12B  0A3F 009B AB88 B3BD 190C`

## License

Code released under [the MIT license](https://github.com/Raptor3um/rtmcore/blob/master/LICENSE).

#!/bin/bash

cd template
yarn install
cd -

mkdir -p alice bob
cp -r template/* alice/
cp -r template/* bob/
sed -i s/%PORT%/8000/g alice/server.js
sed -i s/%PORT%/9944/g alice/src/index.js
sed -i s/%PORT%/8001/g bob/server.js
sed -i s/%PORT%/9945/g bob/src/index.js

cd alice
ln -s docs dist
yarn run dev &> ../alice.log &
echo $! > ../alice.pid
cd -

cd bob
ln -s docs dist
yarn run dev &> ../bob.log &
echo $! > ../bob.pid
cd -

tail -f alice.log bob.log

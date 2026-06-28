#!/bin/bash

cd ~/PETALPATH_app_v2
git pull

cd server
npm install
npm run build

pm2 restart petalpath-api

echo "Deployment complete."
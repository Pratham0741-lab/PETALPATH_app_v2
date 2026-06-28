#!/bin/bash

cd ~/PETALPATH_app_v2
git pull

cd backend
npm install
npm run build

pm2 delete petalpath-api || true
pm2 start dist/server.js --name petalpath-api
pm2 save

echo "Deployment complete."
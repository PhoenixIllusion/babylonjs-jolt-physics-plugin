pushd .. && npm run build && popd && \
rm -fr ./node_modules/\@phoenixillusion/babylonjs-jolt-plugin
rm -fr ./node_modules/.vite
npm uninstall .. && npm install .. --install-links && npm run dev

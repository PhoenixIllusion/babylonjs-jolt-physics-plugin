cd ../basic-examples
npm ci
npm run build
mv dist ../.git-pages/basic-examples
cd ../trenchbroom-examples
npm ci
npm run build
mv dist ../.git-pages/trenchbroom-examples
cd ../.git-pages
rm build.sh
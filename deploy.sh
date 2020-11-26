#!/bin/sh
set -e -x

OUTPUT=/tmp/open-cluster-management.github.io

COMMIT_ID=$(git rev-parse --short HEAD)

rm -rf $OUTPUT 

git clone ssh://git@github.com/open-cluster-management/open-cluster-management.github.io $OUTPUT 

# prune old stuff (remove files which may go out)
rm -rf $OUTPUT/*

# copy new content
cp -rf output/* $OUTPUT

echo "open-cluster-management.github.io" > ${OUTPUT}/CNAME

cd $OUTPUT
git add **
git commit -a -m "Updated website from open-cluster-management/website ${COMMIT_ID}"
git push
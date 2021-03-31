#!/bin/sh
set -e -x

OUTPUT=/tmp/open-cluster-management.github.io

COMMIT_ID=$(git rev-parse --short HEAD)
GITHUB_TOKEN=$(cat /etc/github/token 2> /dev/null )

rm -rf $OUTPUT 

git clone https://acm-cicd:${GITHUB_TOKEN}@github.com/open-cluster-management/open-cluster-management.github.io.git $OUTPUT 

# prune old stuff (remove files which may go out)
rm -rf $OUTPUT/*

# copy new content
cp -rf output/* $OUTPUT

echo "open-cluster-management.io" > ${OUTPUT}/CNAME

cd $OUTPUT
git config user.email "acm-cicd@redhat.com"
git config user.name "ACM CICD"
git add **
git commit -a -m "Updated website from open-cluster-management/website ${COMMIT_ID}"

git push https://acm-cicd:${GITHUB_TOKEN}@github.com/open-cluster-management/open-cluster-management.github.io.git main

#!/bin/sh
# Nahrá dist/ do vetvy gh-pages. Vlastný skript namiesto balíka gh-pages,
# lebo ten vynecháva priečinky node_modules (Expo v nich má ikonky).
set -e
cd "$(dirname "$0")/.."
REMOTE=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -R dist/. "$TMP"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A -f
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" commit -qm "Nasadenie $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$REMOTE" gh-pages
cd - >/dev/null
rm -rf "$TMP"
echo "Nasadené: https://simidrinkova.github.io/tea-app/"

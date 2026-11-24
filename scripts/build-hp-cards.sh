#!/bin/sh
# Rebuilds the standalone Harry Potter cards bundle into hosting/hp-cards, the folder that is deployed.
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
public="$root/hosting/hp-cards/public"
python3 "$root/scripts/prepare-hp-vocabulary.py"
# --clear: the Expo cache otherwise keeps a bundle built without the standalone flag.
(cd "$root/apps/mobile" && EXPO_PUBLIC_HP_STANDALONE=1 EXPO_PUBLIC_API_URL=/api npx expo export --platform web --clear)
rm -rf "$public/_expo" "$public/assets"
cp -R "$root/apps/mobile/dist/_expo" "$root/apps/mobile/dist/assets" "$public/"
cp "$root/apps/mobile/dist/metadata.json" "$root/apps/mobile/dist/favicon.ico" "$public/"
node -e "const fs=require('fs');fs.writeFileSync(process.argv[2],'export default '+JSON.stringify(fs.readFileSync(process.argv[1],'utf8'))+';\n')" "$root/apps/mobile/dist/index.html" "$root/hosting/hp-cards/lib/mobile-document.ts"
ls "$public/_expo/static/js/web"

# LingoLoop hosted cards

The only deploy folder for the Harry Potter cards site (Sites project in `.openai/hosting.json`). Deploy this folder; do not keep a second copy.

- The Expo web export lives in `public`, and the document is served at `/hp-cards`. Root redirects there.
- The pronunciation proxy runs on the hosted Worker and never calls the local Mac. No local database or credentials are included.
- Update the bundle with `scripts/build-hp-cards.sh` from the repository root, then deploy.
- This folder keeps its own `.git` with the Sites deploy history ("Update Site source"). The parent repository tracks the same files and ignores that inner `.git`.

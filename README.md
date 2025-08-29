# 999 Oxford Radio (Static Web App)

A simple, static, web-based radio UI for the 999 Oxford roleplay community. No backend required; user identity and channel messages are stored in `localStorage`.

## Features

- Service + callsign modal (TVP or SCAS, 4-digit callsign)
- Channel tabs: Global, Thames Valley Police, South Central Ambulance Service
- Quick messages panel sends standardized status messages to the selected channel
- Per-channel message history stored locally in the browser
- Responsive layout suitable for desktop and mobile

## Run locally

Just open `index.html` in any modern browser, or serve the folder with a simple HTTP server.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new repository and add these files.
2. Commit and push to the `main` branch.
3. In GitHub, go to Settings → Pages → Build and deployment:
   - Source: Deploy from a branch
   - Branch: `main` / root
4. Visit the provided Pages URL.

## Notes

- All data lives in the browser. Clearing site data resets identity and messages.
- Message format is `[####]: (message)` where `####` is your 4-digit callsign.
- This is a simple front-end and can be extended with real-time backends in the future if required.
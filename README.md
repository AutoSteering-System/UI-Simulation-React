# UI - How to run

This project is plain HTML + React (via CDN) and loads icons from `src/assets/icons`.
Because icons are loaded with `fetch`, you must serve the folder with a local web server.

## Option 1: VS Code Live Server (recommended)
1. Open `main.html` in VS Code.
2. Right click the file and choose **Open with Live Server**.
3. The page will open in the browser (usually `http://localhost:5500/main.html`).

## Option 2: Any simple static server
From the project root, run one of these:

### Python (if installed)
```bash
python -m http.server 5500
```
Then open: `http://localhost:5500/main.html`

### Node (if installed)
```bash
npx serve .
```
Then open the URL shown by the command.

## Common issues
- **Icons not showing**: make sure you are not opening `main.html` via `file://`.
  Use a local server so `fetch('src/assets/icons/...')` can load SVGs.
- **"localhost refused to connect"**: no server is running on that port.
  Start Live Server or a static server first.

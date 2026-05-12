# Sakura Walkthrough Portfolio

Static first-person portfolio prototype for Hostinger-style deployment.

## Run locally

```powershell
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Controls

- Click **Enter walkthrough** to start.
- Use `WASD` to walk.
- Hold `Shift` to move faster.
- Move the mouse to look. If pointer lock is blocked by an embedded browser,
  click and drag to look around.
- Center the reticle on a panel, then click or press `E` to open it.
- Press `Esc` or click **Close** to close a detail panel.

## Where to fill in your content

Most text lives in `src/main.js` inside the `cards` array.

Replace each template card:

- `About Sashi`
- `Project One`
- `Project Two`
- `Project Three`
- `Experience Timeline`
- `Technical Stack`
- `Contact`

Each card has:

- `title`
- `kicker`
- `summary`
- `body`
- `bullets`
- `primary`
- `secondary`

The theme is intentionally narrow: sakura blush, warm paper, tatami, dark cedar,
moss, stone, and soft gold accents.

[Open Quiet Classroom](https://quiet-classroom.vercel.app/)

# Quiet Classroom

A gentle study companion: keep a little fish asleep by maintaining a quieter room. Built with plain HTML, CSS, and JavaScript. No frontend framework, build step, or runtime package installation is required.

## How to play

1. Open the live website above and choose Manual, Timed, or Scheduled mode.
2. Set the duration or local start and end times if needed. Adjust the noise threshold to suit your room.
3. Select **Start session** and allow microphone access. Stay quiet to let your fish sleep and earn points.
4. Sustained sound wakes the fish and subtracts 25 points. Return to quiet to let it fall asleep again.
5. Select **End** to view your score, quiet time, longest streak, and wake-ups. **Reset** clears the current session.

Use **Try the demo first** to explore without a microphone. During a demo, **Simulate a sound** demonstrates the awake state. Demo sessions do not earn points.

## Run locally

With Node.js 18 or later:

```sh
npm start
```

Open http://localhost:3000 and allow microphone access. Production microphone access requires HTTPS. You can also use the clearly labeled demo without microphone access. Demo sound is simulated and does not award scores or record quiet time/noise events.

## Source and assignment

- `index.html`: semantic interface and classroom illustration structure
- `style.css`: responsive layout, day/night themes, aquarium and fish animation
- `script.js`: microphone analysis, session scheduling, scoring, and results
- [Design reflection and illustrated gameplay guide](design/Quiet_Classroom_Design_With_Screenshots_and_Gameplay.docx): English Word assignment with three screenshots
- [Design screenshot gallery](design/README.md): five screenshots, including mobile and night views
- `public/`: matching static entry for deployments configured to serve this directory
- `server.mjs`: dependency-free local server

Both HTML entries use the adjacent CSS and JavaScript. Keep the root and `public/` copies in sync when editing. Vercel serves static files directly; the previous catch-all HTML rewrite was removed so CSS and JavaScript receive their proper content types.

## Interaction details

Manual sessions end when you choose End. Duration sessions accept 1 to 1440 minutes and start after microphone permission is granted. Scheduled sessions use local time, allow overnight ranges, and reject equal times and expired daytime slots. Keep the page and browser open for an appointment; browsers and sleeping devices can delay timers. A reserved microphone track is disabled until the scheduled start. Cancel or reset releases it.

Noise must remain above the threshold for 300 ms to wake the fish. Sustained noise counts as one disturbance, and the fish falls asleep after 1.4 seconds below 90% of the threshold. Quiet time increases the score with a streak bonus; a disturbance subtracts 25 points, never below zero. Noise resets the streak. Unobserved background intervals, muted input, and suspended audio contexts do not earn quiet time. Stopping, resetting, permission cancellation, or leaving the page cleans up microphone tracks, animation frames, and session timers.

Audio is analyzed locally with the Web Audio API. No recording, uploads, or persistence are implemented. The percentage is a scaled relative microphone amplitude, not calibrated dB SPL. Device gain and position affect it; adjust the threshold for the room.

## Checks

`npm run check` checks the syntax of both JavaScript files. The browser regression script in `submission/browser_checks.cjs` requires Playwright Core and Chrome. Install Playwright Core separately for browser testing. Set `CHROME_PATH` if Chrome is not at the default macOS location; `PLAYWRIGHT_CORE_PATH` can point to an existing Playwright Core package. The test substitutes microphone data and does not record real audio.

Checks cover demo isolation, sustained noise episodes, quiet recovery, permission denial and pending cancellation, microphone cleanup, input validation, overnight scheduling, scheduled cancellation, timed endings, four viewport widths, reduced motion, and both HTML entries. Real microphone sensitivity and browser/OS permission behavior still require a device check.

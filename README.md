# Quiet Classroom

A browser-based focus companion that turns room noise into a living aquarium. Keep the space quiet to let a little fish sleep, build a quiet streak, and earn points. When sustained noise crosses your chosen threshold, the fish wakes up and the interface responds.

**[Explore the live demo](https://quiet-classroom.vercel.app/)**

![Quiet Classroom desktop interface](design/screenshots/01-overview.png)

## Features

- **Animated feedback:** a sleeping and waking fish, moving fins, bubbles, and swaying plants make the room feel alive.
- **Three session modes:** start and end manually, set a duration, or schedule a local start and end time.
- **Adjustable noise threshold:** tune the response to your microphone and surroundings using a live volume meter.
- **Session tracking:** review your score, quiet time, longest quiet streak, and wake-ups.
- **Microphone-free demo:** explore the interaction with simulated sound and no points awarded.
- **Responsive interface:** use the controls beside the aquarium on desktop or below it on smaller screens.
- **Time-based themes:** morning, afternoon, and night styling follows your device's local time.
- **Accessibility support:** labeled controls, visible keyboard focus, a keyboard-accessible results dialog, and reduced-motion styling.

## Getting started

Open **[quiet-classroom.vercel.app](https://quiet-classroom.vercel.app/)** in a browser and choose a session mode:

| Mode | Behavior |
| --- | --- |
| Manual start / end | Run a session until you select **End**. |
| Timed session | Choose a duration from 1 to 1440 minutes. The timer starts after microphone access is granted. |
| Scheduled session | Choose local start and end times, including an overnight range. Keep the page and browser open. |

Select **Start session**, allow microphone access, and adjust **Noise threshold** while watching **Room volume**. Stay quiet to keep the fish asleep. Select **End** to view the session summary, **Done** to close it, or **Reset** to clear the session.

To explore without microphone access, select **Try the demo first**, then **Simulate a sound** to wake the fish. Demo sessions do not earn points or record quiet time and wake-ups.

## How sound feedback works

The app reads microphone samples through the Web Audio API, calculates their root mean square amplitude, and scales that value into a relative percentage for the meter.

- Sound must stay above the selected threshold for **300 milliseconds** to wake the fish.
- A sustained noisy episode counts as **one wake-up** and subtracts **25 points**, without taking the score below zero.
- The fish returns to sleep after **1.4 seconds** below **90% of the threshold**. This gap helps prevent rapid switching near the boundary.
- Quiet time earns points, with a growing bonus for longer quiet streaks. Sound above the threshold resets the streak.

The meter is **not a calibrated decibel measurement**. Microphone gain, device placement, and room acoustics affect the reading, so adjust the threshold for your setup.

## Run locally

Requires Node.js 18 or later. The app has no runtime package dependencies and needs no build step.

```sh
git clone https://github.com/yz5099-sys/Quiet-Classroom.git
cd Quiet-Classroom
npm start
```

Open **http://localhost:3000**. To choose a different port:

```sh
PORT=8080 npm start
```

The local server binds to `127.0.0.1`. For hosted use, serve the app over HTTPS so the browser can request microphone access.

## Project structure

```text
index.html          Interface and classroom illustration structure
style.css           Layout, themes, responsive styles, and animations
script.js           Audio analysis, scheduling, scoring, and session controls
server.mjs          Local static server using Node.js built-in modules
favicon.svg         Aquarium-inspired browser icon
public/             Matching static entry and assets for public-directory hosting
design/screenshots/ Desktop, mobile, sound-response, and results screenshots
vercel.json         Vercel response headers and microphone permission policy
```

The root and `public/` HTML entries each load their adjacent CSS, JavaScript, and favicon. Keep these copies synchronized when changing the interface. The illustration and animations are implemented with HTML and CSS; no image assets or animation libraries are needed at runtime.

## Privacy and session lifecycle

Microphone sound is analyzed on the device. The app does not record audio, upload audio, or persist session results.

Scheduled sessions request microphone permission when created and disable audio input until their start time. Ending, canceling, resetting, or leaving the page stops microphone tracks and clears session timers and animation frames.

Suspended audio processing and muted input do not earn quiet time. Unobserved time after a background tab resumes is not added in full to the score. Browser throttling and device sleep can delay scheduled actions; this app relies on the page remaining open.

## Development checks

Run the JavaScript syntax checks:

```sh
npm run check
```

Browser regression coverage includes simulated sound, quiet recovery, demo isolation, microphone cleanup, permission denial and cancellation, duration validation, overnight scheduling, automatic endings, responsive layouts, and reduced motion. Microphone sensitivity and browser or operating-system permissions should also be checked on a real device.

## Deployment

The production site is hosted on Vercel:

**[https://quiet-classroom.vercel.app/](https://quiet-classroom.vercel.app/)**

The app can also be served by a static host using the root files or the contents of `public/`. Serve HTML, CSS, JavaScript, and SVG with their correct content types. The Vercel configuration sets `Permissions-Policy: microphone=(self)` and lets static assets resolve directly.

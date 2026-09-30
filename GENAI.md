# Generative AI in the Development of Overclocked

This document describes how generative AI was used to build *Overclocked*: the tools involved, the working method, how the design evolved, which decisions were made by the human author and which by the AI, and how the result was verified.

**Terminology.** In this document, "Claude" refers to the AI assistant that built the game, and "the game's AI" refers to the in-game autopilot that controls the robots during play.

## Contents

- [Overview](#overview)
- [1. Working method](#1-working-method)
- [2. Design evolution](#2-design-evolution)
- [3. Robot roles](#3-robot-roles)
- [4. Decision log](#4-decision-log)
- [5. Verification](#5-verification)
- [6. Notable issues found and fixed](#6-notable-issues-found-and-fixed)
- [7. Limitations](#7-limitations)
- [8. Reproducing the results](#8-reproducing-the-results)

## Overview

| | |
|---|---|
| **AI tools** | Claude Opus 5.5 in Claude Code (desktop app), including its built-in browser; the final review pass used Claude Code on the web. Google Gemini, used by the human author for a second opinion and a few game-feel features (see [Contributions made with Gemini](#contributions-made-with-gemini)). |
| **Other tooling** | Node.js for headless simulations and tests. Headless Chrome driven through the DevTools protocol, and later Playwright with headless Chromium during the final review, for browser checks and for capturing the README screenshot and GIF. Python with Pillow to assemble the GIF. |
| **Inputs provided to the AI** | The competition brief and its example prompt; the official robot model sheets and venue plans from the Devoxx references; the author's photos of the Kinepolis rooms and screenshots of the Kinepolis Antwerp virtual tour; the public Devoxx Belgium 2026 schedule (only talk titles are used); and a prompt suggested by Gemini. |
| **Produced by Claude** | Design proposals; the code (simulation, rendering, UI, audio), except for the Gemini-assisted features; the procedural robot art; the test and balancing tools; and first drafts of the documentation. |
| **Produced by the human author** | The overall direction and every product decision; continuous playtesting on a laptop and a phone; first-hand knowledge of Devoxx and of the venue; the tone and the ethical boundaries of the game. |
| **Timeline** | 26–30 September 2026, in the days before the submission deadline. The review and polish pass, during which most of the venue and the rules took their final shape, ran from 28 to 30 September. |

## 1. Working method

Development followed a short iterative loop, repeated many times a day:

1. **Playtest.** The human author played the current build on a laptop or a phone and reported observations in plain language, often with a screenshot or a photo of the venue.
2. **Propose.** Claude proposed one or more solutions, with their trade-offs (impact on the concept, on balance and on the remaining time) and a recommendation.
3. **Decide.** The human author chose. When they disagreed with Claude's recommendation, their decision was applied.
4. **Implement and verify.** Claude implemented the change and verified it before reporting back, using automated tests, headless simulations, and a browser check at desktop and phone sizes. Each change was then deployed for the next playtest.

Claude's side of the loop followed three principles:

- **Measure before changing.** Balance questions were answered with a scripted player and seeded runs rather than intuition. When a change appeared harmful, an A/B comparison on the same seeds confirmed or refuted it.
- **Verify in the real game.** Every visible change was checked in the browser. Screenshots caught problems that tests cannot detect, such as overlapping text, invisible bars and truncated tables.
- **State what is not known.** Assumptions about the venue are listed in the README, and were corrected whenever the author's first-hand knowledge contradicted them.

## 2. Design evolution

The final game results from deliberate changes of direction, each triggered by playtesting:

| Stage | Concept | Reason for the change |
|---|---|---|
| Crowd-flow puzzle | The player shapes the flow of attendees between talks by means of the robots (doors, escalators, props). | First playtest feedback: *"I don't understand the game at all."* Indirect control was clever on paper but unreadable in play. The engine was kept; the concept was dropped. |
| Robots under pressure | The player controls the robots; crowds and pushy attendees drain their patience, and a robot at zero turns "rogue". | Portraying visitors as the problem was inappropriate for a community event, and the robots' distress was not where the fun was. The author pointed to the work itself as the source of tension. |
| **Overwork (final)** | The robots do their jobs on their own and do not know when to stop. Work, crowds and enthusiastic fans drain their energy. Only the player looks after them; a worn-out robot stops and recharges on a charging base. | The author's own summary of what made the game fun: *"the robots do their job, they wear themselves out, and on their own they don't look after themselves."* The game, previously titled *Keep Calm, Robots*, was renamed **Overclocked** to match. |

The author set the following constraints for the final version:

- **Visitors are friendly.** Nobody attacks the robots. Fans take three selfies and leave; unhappy attendees complain out loud but never chase a robot.
- **Only the player cares.** The game's AI performs the jobs, but robots under its control never look after each other; only the robot the player steers can. This rule is covered by automated tests.
- **The venue is real.** Both floors follow the official Kinepolis and exhibition plans, corrected by the author wherever the plans or the brief's example prompt did not match the building (see [section 4](#4-decision-log)).
- **The week is real.** Deep Dive days are calmer; Wednesday opens with the keynote and is the busiest day; Thursday is slightly calmer; Friday is a half day. Breaks, keynotes and talk titles come from the public Devoxx Belgium 2026 schedule.

## 3. Robot roles

The roles follow the official model sheets and were refined through playtesting:

- **Voxxy, technician** (the fastest robot). Fixes projectors, Wi-Fi, microphones, coffee machines, the badge printer, booth power, toilets and the popcorn machine. Repair times vary, and long repairs are tiring.
- **Droid, guide** (tall, deliberate, "knows the building"). Leads lost attendees to the door of their room at a pace they can follow; they enter on their own. Long escorts are tiring.
- **Biggy, security** (heavy, slow to start, hard to stop). Checks unattended bags, clears people sitting on the stairs, and calms fans who get carried away or keep following a busy robot. Bags and stairs take priority over fans (see [section 6](#6-notable-issues-found-and-fixed)). When steered next to a tired robot, Biggy is the most reassuring companion. The game's AI never pushes anyone with Biggy; a player who drives it fast into a crowd bumps people, which costs satisfaction.

Alternatives considered and rejected: swapping roles to match the original job titles on the model sheets, and a door guard for full rooms (never seen at Devoxx).

## 4. Decision log

### Human decisions (selection)

- **Concept and tone.** The concept pivots; the overwork theme and the charging bases; friendly visitors; the robots' roles; the title *Overclocked*; the closing line of the week screen, *"Even the best robots need a break. So do you."*
- **Scope.** Staying in 2D after weighing a 3D version; the five-day structure; removing features that did not fit the venue (timed room doors, the foyer, the phone-zombie pest, kicking attendees); using the real talk titles (titles only, no speaker names).
- **Interface.** Numerous details from playtesting on a phone (card layout, button order, text sizes, end-of-week screens).

### Requests made during the review and polish pass

- **Rules.**
  - Only the robot the player steers looks after the others, Biggy included.
  - A robot recharges only on a charging base or with the player, never while walking.
  - Staying with a robot fills it up to 100%, but a repair within reach takes priority when the other robot is above 75%.
  - The robots rest overnight: every day starts at full energy.
  - One star per objective: closing time, no robot worn out, 75% satisfaction.
  - Biggy's patrols tire it slightly, like the other robots' jobs.
  - A breakdown in a room with no talk in progress costs a third as much, and nobody complains about it until a talk starts.
- **Pace.** A ⏩ button toggling ×1 and ×2 that keeps the player's setting. A ×3 speed and an automatic return to ×1 when a robot ran low were tried, then removed.
- **A realistic Devoxx.**
  - A distinct crowd level per day, with Wednesday the busiest.
  - Fewer lost attendees and fans once people know the building (Tuesday, Thursday, Friday); fans for every robot.
  - About one attendee in ten skipping a talk.
  - Women's and men's toilets with a few stalls and a queue when full; men make up about 85% of the crowd.
  - People of every skin tone.
  - Booths set up on Monday morning and open at 14:00, while the polo pickup is open from the start of the day.
  - People sitting on the steps at reception.
  - Talk titles from the public schedule, in the schedule's colours.
- **The venue, from photos and the Kinepolis virtual tour.**
  - *Rooms:* seats running to the back and side walls; a cross aisle halfway, with the entrance under the back rows; the projection room along the back wall, where Voxxy fixes the room's breakdowns; a single door per room, positioned as at Kinepolis; dark during a talk and lit between talks, as in the photos.
  - *Stairs:* flights climbed step by step, with railings all around; the wide stairs rising straight ahead from the main entrance (*"what makes the Antwerp Kinepolis so majestic"*), centred on it, with the reception desk beneath them and visible from the hall side; the upstairs stairwells along the corridor walls, between rooms 3 and 4 and between rooms 9 and 10; two short parallel flights in the exhibition hall.
  - *Exhibition hall* (the Kinepolis "Hollywood" hall): beige-brown carpet, white walls, a grid of white pillars, twelve booths with clear aisles, the hall coffee station, and the long white counter of the polo pickup.
  - *Corridor and lounge:* dark pillars under white fabric sails; standing tables clear of the doors; sofas facing the lounge's coffee and popcorn machines; charging bases with three pads, one of them in a corner of reception.
- **Interface.** One message at a time, above the robot cards; a distinct colour per robot, used for its energy ring, its card and its card on the robot selection screen; start and end screens covering the whole screen, with consistent text sizes; the guide arrow naming the problem ("Mic broken, Room 4"); no label next to a breakdown, since the flashing ⚠ already signals it; the first words of the talk on a white card on the room's screen, with the full title while the player's robot is in the room.
- **Privacy.** Progress stays in the browser's `localStorage`, with no account, cookies or analytics. Reviewing this revealed that the last ten play logs were also stored there without ever being read; they are no longer stored.
- **An easter egg**, intentionally not mentioned in the README: a toilet break as an additional way for a robot to recover energy.

### Where Claude argued against a request

| Request or idea | Claude's position | Outcome |
|---|---|---|
| Restart from a single-prompt game suggested by Gemini | A task-dispatch game is the obvious reading of the brief, and restarting four days before the deadline would discard every tested iteration. | The game was kept; Gemini's good ideas were adopted (named incidents, the crowd stepping aside for Biggy). |
| Make standing tables a "quiet zone" | People gather around tables, so a quiet zone there would contradict the crowd mechanic. | Tables became a short pit stop instead. |
| Align the stairs of the two floors exactly | The two official plans share no reference point; aligning them would distort the exhibition plan. | The plans were kept faithful; the offset is documented in the README. |
| Use the real session titles | Rooms are not yet assigned, and titles are published with speaker names. | Adopted at the author's request: titles only are used, and the room assignment is documented as the game's own choice. |

### Where the human author corrected Claude

- **Difficulty curve.** Claude had made Friday the hardest day; the author knew it is the calmest.
- **Repair variability.** Repair time now varies per occurrence rather than per breakdown type.
- **Invented assumptions.** The non-existent foyer and the timed room doors were removed.
- **A legacy threshold.** A rule that stopped "stay with a robot" at 75%, unquestioned since the first version, was changed so that staying fills the robot to 100%.
- **The venue, on many occasions.** Claude turned the reception stairs the wrong way round (their direction is the defining feature of the entrance), made room for the stairwells by moving doors (the author preferred smaller stairwells), gave each room two doors (the real rooms have one), moved the polo pickup to the far end of the hall, and widened the reception desk under the stairs when the intent was to make it visible.
- **The game's message.** In a discussion of how the job would work with human staff instead of robots, Claude assumed that people take breaks on their own and that colleagues notice when someone is running low. The author disagreed (otherwise developers would not burn out), and the week screen's closing line, *"So do you."*, came out of that exchange.

### Contributions made with Gemini

The following features were produced by the author with Gemini and integrated into the codebase: a double-tap focus effect on the robot being steered, the "Espresso Boost" near coffee stations and the teamwork repair bonus, off-screen indicators pointing to events outside the camera view, a pulsing ring when a robot's energy is low, and confetti on a won day. In a prompt shared by the author, Gemini also suggested named incidents and the crowd stepping aside for Biggy, which Claude adapted.

## 5. Verification

### Automated tests

`npm test` runs 64 scripted checks (about 30 seconds) that drive the robots through every action and rule: repairs, guiding, security checks, charging, the comfort rules (including "robots controlled by the AI never comfort each other"), the star rules, the toilets and their queues, attendees who skip a talk, the sizes documented in the README, message timing at ×2, the staff-only service corridors, and the robots' starting positions. The command exits with an error if any check fails.

### Headless simulation tools

| Tool | Purpose |
|---|---|
| `tools/player-bot.mjs` | An attentive scripted player, run on 16 seeded days per weekday. |
| `tools/sim.mjs` | A player who selects Voxxy and never touches the controls, while the game's AI runs the other two robots. With `ai`, the game's AI runs all three. |
| `tools/stress.mjs` | Full days with random input, checking for invalid values, robots leaving the map, and an empty crowd. |

Targeted diagnostics were also written for specific questions and re-run after every floor-plan change: attendees standing still on their way somewhere, attendees crossing a staircase without taking it, the longest wait at a door, and whether each robot can still reach every repair panel and staircase.

### Independent review

Before the final round of changes, the concept and its rules were written up as a specification. A separate Claude agent, started without the conversation history, reviewed the entire project against it without modifying anything. All of its findings were addressed: inconsistent wording, two bugs affecting key moments, outdated README images, and dead code. The README and this document were then re-read against the game and further dead code was removed; the simulations produced identical results, to the character, before and after.

### Final code review

On 30 September, after the documentation pass, Claude reviewed the whole codebase line by line and ran every tool again. It found and fixed:

- **Stars that disagreed with the results screen.** The third star was computed from the unrounded satisfaction, while the results screen showed and ticked the rounded figure: 74.6% appeared as a ticked "75%" with only two stars. The star now follows the displayed value; a test covers both sides of the boundary.
- **A test command that never failed.** A failing check was printed, but `npm test` still exited successfully. It now exits with an error.
- **Robots starting inside pillars.** Voxxy and Biggy started on two of the corridor pillars added in the last venue changes, and an idle robot could stay stuck in one. Since then, `tools/stress.mjs` had stopped at the first frame of every run. The author chose to keep the pillars and move the two starting positions clear of them (by 0.7 m and 1 m); a test now checks the starting positions, and the stress runs complete again.
- **Stair footsteps playing all at once.** The noise part of the stair sound was not delayed like its tones.

One finding was kept by the author's choice: when the player stays with Voxxy while the game's AI has it repairing, Voxxy stops moving but keeps repairing.

The review also removed dead code and duplicated values, let Tab move between menu buttons (with Enter and Space no longer able to press two buttons at once), and turned off screen shake and confetti under the system's reduce-motion setting. Before the starting positions were moved, every simulation produced identical output, to the character, before and after these changes. Moving the robots reshuffles every seeded day, so the balance below was measured again.

### Final balance

Measured on 30 September 2026 on the final build: 16 seeded days per weekday for the attentive scripted player, and seeds 1 to 12 with `tools/sim.mjs <seed> ai` for the game's AI alone, with stars awarded under the final rule (one per objective).

| Day | Attentive player: days won | Average stars | Game's AI alone: days won |
|---|---|---|---|
| Monday · Deep Dive | 16/16 | 2.4 | 12/12 |
| Tuesday · Deep Dive | 16/16 | 2.7 | 12/12 |
| Wednesday · opening keynote, busiest day | 14/16 | 1.1 | 1/12 |
| Thursday · closing keynote | 16/16 | 2.0 | 7/12 |
| Friday · half day | 16/16 | 2.9 | 12/12 |

Moving the robots' starting positions made the busy days slightly harder. Over 40 seeded days, the attentive player won 33 Wednesdays instead of 35 (1.2 stars on average instead of 1.5), and still won every Thursday (1.9 stars instead of 2.3).

A 16-day sample is small: any change to the game reshuffles the day's random events, and a day's figures vary by a few wins and a few tenths of a star on their own. Only differences that held on a larger sample (48 days instead of 16) were acted upon.

- **Wednesday is the hardest day.** Once fans targeted every robot, the attentive player won only 8 Wednesdays out of 16. With the author's agreement, Wednesday received about 20% fewer fans while keeping the week's largest crowd, the most lost attendees and the most fans. The venue changes of the final day (one door per room, railings, pillars) affected the attentive player's results no more than the day-to-day noise; the table above reflects the final build.
- **The game's AI alone loses Wednesday by design.** Nobody looks after the robots: the game's AI never makes them look after each other, and they never stop before they are worn out. On Wednesday, the busiest day, all three wear out simultaneously in the afternoon, which ends the day even though attendees are still satisfied. When the last venue changes made this systematic, the author chose to keep it, as it encourages the player to engage.
- **A rule measured and dropped.** Making a robot that wears out a second time on the same day return weaker ("burnout") mainly penalised the attentive player on Wednesday (13 of 16 days won instead of 15) and made no clear difference to a day left to the game's AI.

## 6. Notable issues found and fixed

Examples of issues caught by the tools or by playtesting, and how they were resolved:

| Issue | Cause | Resolution |
|---|---|---|
| **Performance** | The first build ran at a tenth of real time; each flow-field update took 14 ms. | Rewritten with flat typed arrays and staggered updates (about 2 ms per step). |
| **The game played itself** | The first headless run won with no input. | Crowd size, walking speeds and room exits were rebalanced until inaction lost. |
| **Looking after the robots did not matter** | A satisfaction ledger showed that days were lost to the job backlog alone. | The rules were rebalanced so that neglecting the robots is what costs the day. |
| **A rule that looked good but hurt** | Letting Biggy handle fans following a busy robot made Wednesday and Thursday markedly harder, as confirmed by an A/B test on the same seeds. | Bags and blocked stairs were given priority over fans, which restored the balance. |
| **Latent freeze** | The crowd's spatial index was initialised with 0 instead of "empty", so a lookup before the first frame could loop forever. | Fixed; found by a new test. |
| **Nobody used the toilets at breaks** | A 30-minute break lasts about 8 seconds of game time, less than the walk to the toilets, and the next talk cancelled the trip. | Toilet trips are no longer cancelled (attendees arrive slightly late to the talk). On a Wednesday, 80 people now use the toilets instead of 1. |
| **Toilet queues jamming** | People leaving walked into the queue, and a queue could stall permanently when its first person was jostled behind the others. | Queues now run along the wall, clear of the doorway. Whoever reaches the door enters, earliest in line first. The last case was found by a test that failed randomly on 2 draws out of 12. |
| **Attendees stuck en route** | After attendees were resized, "keep right" lanes pushed them into door jambs; later, people brushing along a new railing stepped back every time they touched it. | Attendees now sidestep only what blocks their path, and can escape a doorway corner they were pushed into. Over three days, samples of people standing still for five seconds en route dropped from 204 to 1. |
| **Gaps too narrow to pass** | A pillar next to the polo pickup, and a gap between a room's door and its side wall where one person stayed pinned for 41 seconds in a crowd. | The pillar was removed (the polo pickup has since moved), the gap was filled, and the longer polo counter was placed against the wall to avoid creating another narrow gap. |
| **Backstage shortcut** | The service corridors behind the rooms, left over from the first concept, were drawn as staff-only but open to everyone. Later, attendees were found following the robots' route to the stairs through those corridors; one stood at a closed fire exit for 37 seconds. | Attendees now have their own walls closing the service doors and fire exits, and their own routes to the stairs. |
| **People walking across stairwells** | The upstairs stairwells were open on every side. | Railings now enclose them except at their top end. People crossing without taking the stairs dropped from 496 samples over two days to 2. |
| **Robots tired before the day began** | The first attendees were placed at random, sometimes surrounding a robot, which lost 30–50% of its energy in the first 10 seconds. | Attendees now spawn at least 6 m from any robot, and never inside a booth or a desk. |
| **Alert could be lost** | The "worn out" alert queued behind breakdown messages and could even be dropped. | It now goes straight to the front of the queue. |
| **Biggy comforting on its own** | When Biggy sent a fan home, the robot being bothered regained energy even while the game's AI was driving Biggy, violating the rule that only the player's robot looks after the others. | The bonus now applies only when the player steers Biggy; a test covers it. |
| **One toilet kiosk for everyone** | Every attendee went to the nearest block: one upstairs kiosk received 249 visits over three days, the other 3. | With separate women's and men's toilets, the two kiosks now share visits evenly (124 and 121). |
| **Tests coupled to the layout** | Several checks placed robots or groups at fixed coordinates that later became a table, a staircase or a doorway. | The checks were updated; where possible, they now read positions from the level data. |
| **Phone-specific issues** | An energy bar squeezed to 2 pixels, a results table wider than the screen, screens opening scrolled halfway down, and phones serving a stale cached version. | Each was reproduced at the phone's exact resolution and fixed; the local playtest server disables caching. |

## 7. Limitations

- Balance was measured with a scripted player; human players, especially first-time ones, may find Wednesday harder or easier. The scripted player does not use the toilet break or the ⏩ button.
- Left to the game's AI, Wednesday is lost almost every time and Thursday a little under half the time (see [section 5](#5-verification)): the challenge lies in looking after the robots, not in reaching closing time on autopilot.
- Even at 30% larger than the real robots, the robots are small on a laptop screen showing a whole floor; the energy ring in each robot's colour is what keeps them easy to spot.
- The public schedule does not yet assign rooms, so which talk appears in which room is the game's own choice. `node tools/talks.mjs` refreshes the titles from the schedule API.
- Some internal names predate the final theme (`patience` for energy, `rogue` for worn out, and `keepcalm.` storage keys from the earlier working title *Keep Calm, Robots*). They were kept to avoid a risky rename close to the deadline and to preserve players' saved progress.
- The official model sheets and venue photos were used as references but are not included in the repository.

## 8. Reproducing the results

The day is selected with the `DAY` environment variable (0 = Monday … 4 = Friday).

```bash
npm test                                  # every robot action and rule, scripted
node tools/sim.mjs 3                      # Monday, idle player steering Voxxy (seed 3)
DAY=2 node tools/sim.mjs 3                # the same on Wednesday
DAY=2 node tools/sim.mjs 1 ai             # Wednesday run by the game's AI alone, no input (seed 1)
DAY=3 node tools/player-bot.mjs 16        # the attentive scripted player, 16 seeded Thursdays
for s in $(seq 1 12); do DAY=3 node tools/sim.mjs $s ai; done   # the game's AI alone, 12 seeded Thursdays
node tools/stress.mjs 3                   # full days with random input
node tools/talks.mjs                      # refresh the talk titles from the public schedule
```

In Windows PowerShell, set the day first:

```powershell
$env:DAY = 3; node tools/player-bot.mjs 16
```

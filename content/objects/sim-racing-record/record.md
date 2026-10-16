# Research: the sim-racing work, 2025–2026 (visual + historical deep dive)

Compiled 2026-10-16 from the git history of 26 repositories (github.com/k10-motorsports, github.com/alternatekev), the reflogs of three local-only repos on the rig, the repos' own docs, and screenshots on the rig. Everything below is sourced; where a number depends on a method, the method is stated.

A compiled record, not a chapter: the chapters are told in Kevin's words; this file supplies the facts, dates and quotes they draw on, and the manifests in the sibling `sim-racing-*` folders hold the images.

---

## 1. Headline numbers

| Measure | Value | Method |
|---|---|---|
| Human-authored commits, 2026 | **2,259** | all repos, deduplicated across repos that absorbed one another (prodrive-ac-builder → k10-track-agents → airoso; prodrive-* → racing-desk), CI-bot commits excluded (142) |
| Active days | **128** | distinct Denver-local dates with ≥1 commit, Mar 5 – Oct 15 |
| Repositories | **29** | 23 in k10-motorsports + 3 under alternatekev (doooom-iRacing-liveries, mclaren-corsa-site/-data) + 3 local-only (airoso, racing-desk, doooom-paints) |
| Pull requests merged | **374** | "Merge pull request" commits; highest PR numbers: plugin #192, overlay #180, homebridge #150, server #79 |
| Commits authored as "Claude" | 185 | author field; most work is committed under Kevin's name regardless of who typed it |
| Tagged versions | k10-track-agents 172 (v0.1.0 9 Jun → v0.66.3 9 Aug); prodrive-plugin 128; overlay 95; ac-builder 85; windows 61 | git tags |
| Languages | C#, TypeScript/TSX, JavaScript, Swift, Python, Rust (Tauri), SQL, XAML | file census: 374 .py, 288 .ts, 201 .tsx, 185 .cs, 136 .swift, 103 .js, 341 .md |
| Monthly commits | Mar 393 · Apr 766 · May 206 · Jun 217 · Jul 390 · Aug 74 · Sep 127 · Oct 86 | deduplicated, Denver time |
| Peak week | 20–26 Apr: 316 | |
| Peak days | 26 Apr 141 · 25 Apr 127 · 31 Mar 117 · 27 Mar 72 · 1 Apr 66 · 26 Jul 59 · 1 Jul 33 · 11 Oct 22 | pre-dedup for the April days |
| Working sessions | 451 (gap < 45 min between commits) | |
| Median gap between commits inside a session | 1.1 min (n = 2,468) | |
| Best sustained rate | 26.1 commits/hour (1 Apr 15:06–17:26, 61 commits; also 28 Mar 21:25, 57 in 131 min) | |
| Time of day | two shifts: 10:00–13:00 and 16:00–23:00; the 22:00 hour (200) out-commits the 14:00 hour (113) | Denver time |
| Weekday | Sat 580 · Wed 510 · Sun 498 · Tue 366 · Fri 327 · Mon 323 · Thu 315 | |

## 2. The five eras

### Era 0 — Driving (to Feb 2026)
- 41 Assetto Corsa screenshots on the rig from Jan–Mar 2025, 38 of them McLarens (plus three of a GMA T.50 at Imola): Elva, P1, 720S GT3X, 765LT, Senna GTR, Solus GT, Artura, W1 — on LA Canyons, Brands Hatch, Imola, Bathurst, Pacific Coast Hwy, Shuto.
- 2025-01-19: `alternatekev/mclaren-corsa-data` (Strapi) and `mclaren-corsa-site` (Vite + React). Three commits in one evening. README: "This is a pretty cool website I guess." Never touched again.
- 2025-12-27: a full-desktop screenshot of iRacing on the 3440×1440 ultrawide with a "READY" card on the second display — stock HUD, no software of his own. Ten weeks before the first plugin commit.

### Era 1 — Pro Drive / RaceCor.io (5 Mar → May 2026)
- **2026-03-05 23:49** `prodrive-plugin` "initial non-working version" (C#, .NET 4.8 SimHub plugin). GitHub Actions on the first night.
- 03-11 homebridge (HomeKit lights follow flags/proximity/commentary severity). 03-13 first dashboard screenshot in docs (AI "Tyre Overheat" car-response message, fuel, tyres, pedal histogram, iRating/SR, gear/speed). 03-19 "sectors and website" (the server/marketing side starts inside the plugin monorepo).
- 03-27: first 70-commit day (pit-box states, logo-only startup, Moza FFB curves overhaul, dashboard scaling; 63 commits in 192 minutes that evening).
- 03-30: rename to RaceCor.io; overlay becomes its own repo (`prodrive-overlay`: Electron, transparent, click-through, always-on-top, ~30 fps poll of `localhost:8889`; green-chroma mode for ARM devices; same `dashboard.html` powers Electron, the SimHub dash and a browser).
- 03-31 / 04-01: 117 and 66 commits — "Tufte pure minimal" HUD redesign merged (PR #102), AI Race Coach (live Claude commentary from the overlay, user's own API key), initial-rating backfill, `drive.racecor.io` → `prodrive.racecor.io`.
- 04-15 `prodrive-edit`: telemetry-driven race condensing (event detection → significance scoring → EDL → ffmpeg; optional "claude-director").
- What the platform ended up being (from prodrive-plugin README, May): plugin = producer (~100 properties, 33+ commentary triggers, strategy modules, pushes sessions to cloud); overlay = HUD + `.rcpdv` race recording (MP4 + telemetry sidecar) + replay + Race Coach + voice + incident coach, 51 modules; server = marketing site + members dashboard + 65+ API routes + Chrome extension ("RaceCor iRacing Sync", scrapes members-ng) + calc engines (Driver DNA, Mastery, Moments, When-engine, Race-Now verdict, Next Race Ideas) as Vercel Functions; Neon Postgres + Drizzle; NextAuth + Discord.
- 05-02 `prodrive-support` (Fumadocs, llms.txt, JSON API for native apps). 05-16 last narrative edit. 06-03 `prodrive-images-api` (manufacturer car imagery on Cloudflare R2, replacing Unsplash; built in one day, six commits).

### Era 2 — Native apps and the seven-repo split (23 Apr → 21 Jul)
- 04-23: `prodrive-server` "native apps v1 api"; `prodrive-ios` and `prodrive-macos` scaffolded (WKWebView shell + SwiftUI native + an Expo RN variant that was dropped two days later).
- 04-24: `prodrive-windows` (WinUI 3, C# .NET 8). 04-25: `prodrive-tvos` (device-link OAuth because Apple TV can't open a browser; 6-char code at racecor.io/link).
- **04-25 (127 commits)**: the monorepo is split into plugin, overlay, homebridge, edit, server, windows + `prodrive-agents` — one submodule mounted at `agents/` in every repo, carrying every repo's CLAUDE.md tree and the cross-repo context. Release-on-tag CI. Calc engines moved to `web-api`.
- **04-26 (141 commits)**: Phase 6/9 calc migration — every native app consumes the same `/api/v1/calc/*` endpoints "so all platforms render identical text and numbers"; macOS gets "real Liquid Glass on macOS 26+, frosted blur fallback below". `prodrive-designer` (Electron tool compositing the live HUD over recorded race video, telemetry replayed in lockstep, Claude attached for click-to-pick iteration). `prodrive-narrative` opens.
- The "gone" incident (04-26): Kevin: "the when to race / should you race feature is gone from the web app entirely." Claude pushed deprecation through three repos; the real cause was five ESM imports missing `.js` extensions → 500s swallowed by a try/catch. The correction became a standing memory: for anything that changes a feature's existence, ask one sentence first. (01-collaboration.md)
- Windows app by July: nine pages (Login, Dashboard, Sessions, SessionDetail, Library of local `.rcpdv` bundles, Editor, Settings with a Moza hardware tab…), iRacing detector auto-launching the overlay, Inno Setup installer bundling the overlay. Last native commits 07-20/21; plugin's last 07-28.

### Era 3 — Real roads → Assetto Corsa (5 Jun → Aug)
- **2026-06-05 18:46** `prodrive-ac-builder` "real-road → Assetto Corsa track pipeline". First track Sand Creek Raceway (Commerce City street loop). First principle in the README: "the screenshot is a selection aid, not data." Phases: Overpass/KML → centreline → USGS 3DEP elevation → local metres + true north → road ribbon + grass heightfield → headless Blender 4.2 + AC Tools → kn5 → install/drive/record AI lines (Windows). Four skills: gps-extraction, elevation, lighting, ac-track-modding (later + aerial-tracing, road-grounding, track-grading, mesh-audit, drive-test, route-tracing, scs-extraction).
- 07-23: first in-game screenshots of his own track — Praga R1 (07:41–07:45) and 650 GT3 (13:39) on **Lookout Lariat**, at night, streetlamps placed by the engine, car on the grass in the GT3 shot.
- **07-01**: Lake Murray loop v0.1.2 → v0.9.2 in nine hours (see §4). IMI Motorsports (aerial-sourced) built the same afternoon. K10 Colorado network v0.3.0 → v0.4.1 that evening. 25 engine tags.
- 07-02: `k10-1978` — UE5 game, "driving as painting": the car is the brush, telemetry is the paint; starts on a real street in 1978 San Diego ("Gala" codename, Gala Ave) and dissolves into procedural worlds; gritty 70s film stock; handoff plan written "for future Claude Code sessions" with checkable acceptance criteria per milestone; M0 grey-box drivable seed world compiled on UE 5.8 (Mac) the same day. Seed bundle exported by the track engine (`gala-seed`).
- 07-03: `k10-colorado` (Sand Creek, IMI, High Plains, Aspen/Woody Creek, PPIR, Second Creek; "live in Blender" bridge) and `k10-san-diego` (Lake Murray loop, "Blender-first", plus the freeway graph) as standalone consumer repos. 08-09: Lake Murray August build screenshot (Alfa 4C; wireframe palms, black-blob trees).
- 07-24: `k10-colorado-rally` — Rally Colorado (ARA, Rangely): Dragon Tail (CR 116, 25.2 km) and Under the Dragon (CR 109, 25.6 km), each shipped twice (gravel + fantasy tarmac); four more stages not built "because their county roads are not in OpenStreetMap… there is no honest geometry to build from yet."
- 07-25 `k10-stories` (carmeet-reels: phone dump → 1080×1920 stories and Ken Burns reels). 07-26 `k10-mxc` (concept-car spec: twin-turbo V6, carbon monocoque, butterfly doors, 3900 mm). 07-26: 59 commits, 32 engine tags (registry, terrain skirts, junction-pad slew limits).
- Fleet era (k10-track-agents absorbs ac-builder; `fleet/` control plane: registry, LAWS, STANDARDS, DEFINITION-OF-DONE tiers T0–T5, GATES-CHANGELOG, feedback ledger, build trains; orchestrator agents standards-auditor / feedback-router / geometry-surgeon / fleet-builder / engine-pin). 15 tracks across four kinds: fictional street circuit (Sand Creek), street ports (Lookout Lariat, Lake Murray, SD freeway network), circuit ports (IMI, Aspen, Grand Junction, Pikes Peak, Pueblo, High Plains, Second Creek), rally stages (×2, gravel + tarmac).
- 08-06 REALISM doctrine ("the engine prepares a data underlay, authorship happens in Blender, the game is the judge"). 08-10: V1 autopsy + "V2 reboot: Claude-as-orchestrator operating model"; `airoso` initial commit. 08-19/20: engine-july and k10-sd-v021 retired; airoso = "THE repo. The only one." (V3). From airoso/README: "V1 (prodrive-ac-builder, Jun–Jul 2026) built a real engine and never verified a track in-game. V2 (airoso's minimal generator, Aug 2026) proved the one-shot approach dead a second time. The fleet era… fixed a lot and diagnosed everything, but green gates kept shipping undrivable junctions. V3 is the synthesis: draft → author → gate → drive." The four rules: the engine drafts; hands author (Claude in Blender, `AUTH_*` layers never regenerated over); gates judge (drive_test → audit_mesh → verify_kn5 → kn5_ground_check, no bypass flags); Kevin drives ("The seat is the only ground truth. No drive-test report, no claim.").

### Era 4 — Local-first: Racing Desk, by DOOOOM (16 Sep → now)
- **09-16** `racing-desk` monorepo: prodrive-overlay, -plugin, -edit, -agents imported with history (subtree merges) at 15:35; replay harness, golden frames and a green unit suite by 15:53. `docs/local-first-refactor-plan.md` the same day. Scope: "one user, one rig… No accounts, no sync, no distribution, no audience."
- Three stated reasons: (1) iRacing shipped Track Map, Fuel Calculator and Incident Tracker widgets in 2026 S3 — "Feature parity is no longer a position. Rendering quality, information design, and integration are."; (2) iRacing retired legacy read-only auth (2026 S1) and paused OAuth client creation — "A cloud hub whose ingest depends on iRacing web auth is building on sand."; (3) the local `.ibt` corpus already carries GPS-grade Lat/Lon/Alt and full grids with iRatings.
- What goes: Neon Postgres (23 tables), NextAuth + Discord, 83 API routes, Vercel Blob telemetry, stored track maps, Chrome extension, marketing site, six-repo lockstep release pipeline. What stays: calc engines ported verbatim with tests into the Electron main process; HUD; recording; the edit CLI; SQLite at `%LOCALAPPDATA%`; `.ibt` backfill; track outlines from Lat/Lon.
- 09-23 `doooom-iRacing-liveries`: DOOOOM SPEEDSPORTS paints for Lotus 79, Nissan GTP ZX-T, MX-5, then 15 more cars (720S GT3, 570S GT4, M2 CS, P217, JS P320, 963 GTP, Valkyrie, V-Series.R, both Caterhams, SF23, F3, F4, iR-01, IR18); shard field, colour patches, number-block rule, logos, sponsor rows; the paint `.tga` + its spec map. Skills added the same day to prodrive-agents: iracing-livery-placement, iracing-paint-templates, iracing-paint-install, illustrator-scripting. 09-22 screenshot: Lotus 79 v13 shatter in the iRacing paint viewer.
- 09-24 `doooom-paints`: Tauri v2 + React livery-swap app ("a mini Trading Paints with no service behind it"), six commits 17:56–22:32: backup, apply, `.mip` cleanup, Trading Paints guard, git-backed library with ff-only updates, built-in TGA decoding. Imported into racing-desk as `apps/paints` on 09-27.
- **09-27** rename: "The Racing Desk, by DOOOOM — every K10 Motorsports, RaceCor and Pro Drive name" retired; `RacingDesk.dll`, `:8889/racing-desk/`; the desk is the main UI (Desk, Paints, Settings).
- 10-07: first Racing Desk recordings (570S GT4 Nordschleife Gesamtstrecke, 2.4 GB MP4 + 3.5 MB `.telemetry.jsonl` sidecar, 38 channels/frame at ~27 fps); 10-11 four more (0.5–1.7 GB).
- **10-11** airoso: Lake Murray three layouts dry-run 04:44 → installed 07:41 (Street Loop, Race CW, Race ACW) → lights "a bit brighter but not much" 08:34 → Kevin "what about lariat" 10:39 → Lariat V3 dossier 12:38 → race corridors (ledger 0049) 14:17 → installed v0.17.0 18:26 → mouth weld v0.17.1 21:12. 10-14: v0.18.0 (Free Roam / Speedway / Speedway Reverse; terrain + Cowles + I-8), ledger 0054 expansion phases in Kevin's order (College → Waring → Princess View → Mission Gorge → Jackson), lamp weight measured (streetlights = 57 % of installed vertices). 10-15 01:51: v0.18.1 installed — LED streetlights, College Ave on its real alignment; ledger 0050 "closed in the seat ('that corner feels right now')".
- Lake Murray v3 as installed 10-14: 116 MB kn5, three layouts sharing one model, 14 tree species (Agave, Bush, Gum, Oak, Palm ×3, Pepper, Aleppo pine, Sage, Sycamore ×2, Yucca), AI fast/pit lanes per layout, CC0 vs full package split (docs/PUBLISHING.md: builds reach doooom.fast via GitHub Releases read by prodrive-server).

## 3. The working agreement (as written in the repos)
From `prodrive-narrative/01-collaboration.md` (2026-04-26), the practices that made "one person + one model" hold across eight repos:
1. **Agents-as-submodule** — `prodrive-agents` mounted at `agents/` everywhere; thin pointer CLAUDE.md in each repo.
2. **Worktrees by default** for every delegated task.
3. **The `(Recommended)` default** — 3–4 options, one labelled; Kevin picks it ~30 times in a row in one session, so the model stops asking.
4. **Tabular, one-screen summaries** — "the diff is the recap."
5. **Investigate-first when something is 'gone'** — born from the 04-26 incident.
Memory discipline: "would a future conversation be measurably better with this written down? If the answer was 'the code already says this,' the memory didn't get written."
Quote to keep: "The model is doing the work that on a real team gets distributed across an engineer, a tech lead, and a project manager. Kevin is doing the work that gets distributed across a designer, a PM, and the staff engineer who decides what to ship next." And: "the working agreement matters more than the tooling."

The track side formalised it further (airoso/fleet): LAWS "each with the failure that bought it"; a feedback ledger where the Symptom section is "Kevin's words, kept", Evidence must be measured before a Diagnosis is written, Verification is decided before the Fix, and fixes route to the engine so they reach all 15 tracks; an entry closes only by a drive. 57 entries (0001–0057) as of 10-15. Examples: 0001 "the sidewalks on Sand Creek are insane" (junction flare); 0030 "the DEM was the error, not the filter — SRTM 30 m for non-US tracks", proven with Bathurst as the control; 0043 "sodium lights from the 80s" (18 KB on lamp colour/intensity/spacing) later replaced by 0056 lighter modern LED once driven; 0049 Kevin: "the track width and race track layouts are incredible" → corridor model kept; 0050 (verbatim, 10-12): "the small steps are a problem at jackson/navajo and arrow signs are only placed for one direction of driving. no flickers at all that i can see, load time and frame rate are great" → one road triangle, 0.33 m², 901 % slope; closed 10-15.

## 4. Iteration case studies (timestamps, Denver)
**1 July — Lake Murray in nine hours** (k10-track-agents): 11:20 v0.1.2 grass vert cap · 16:27 v0.1.7 first connector (Cowles Mountain Blvd) · 16:45 v0.1.8 Aztec Dr · 16:55 v0.1.9 Fletcher Pkwy · 17:07 v0.2.0 six connectors · 17:31 v0.3.0 454 real OSM footprints with mined façades · 17:36 v0.4.0 palms, street trees, water · 17:44 v0.5.0 3D houses mined from LA Canyons · 18:10 v0.5.1 flat intersections (the undrivable-crossings fix) · **19:28 v0.6.0 reset to the bare loop** · 19:51 v0.7.0 Jackson Drive · 20:05 v0.8.0 both arms + Baltimore · 20:16 v0.9.0 Lake Shore Dr · 20:36/20:45 v0.9.1/2 terrain slope-limit, "no more walls at crossings".

**23–26 April — four platforms, seven repos**: 04-23 server native API + iOS + macOS; 04-24 Windows; 04-25 tvOS + split + agents + CI (127 commits); 04-26 shared calc endpoints on every client, Liquid Glass, narrative (141 commits). 266 commits in the two days; the 04-25 10:52 session touched nine repos in 164 minutes (62 commits).

**11 October — dry run to installed, three times** (airoso): listed in §2 Era 4. Note the two verbatim Kevin lines captured in commit messages ("a bit brighter but not much"; "what about lariat") and the reprioritisation they caused within two hours.

**24 September — an app in an evening** (doooom-paints): 17:56 "Build doooom paints: Tauri v2 livery swapper for iRacing" · 17:58 clippy clean · 18:21 library driven from its git repo · 18:31 warning chips in the header · 19:34 show the paint on the cards · 22:32 backups out of the library.

## 5. Visual inventory (what exists, where)
On the rig unless noted. Web-sized copies are in the sibling `sim-racing-*` object folders, each with a `manifest.json`.
- Assetto Corsa screenshots folder — 41 shots Jan–Mar 2025, 38 McLarens + 3 GMA T.50 (3840×2160); Miata Nordschleife 2026-06-05; **Lookout Lariat** 2026-07-23 (Praga R1 ×6 07:41–07:45, 650 GT3 13:39; 3440×1440); **Lake Murray** 2026-08-09 (Alfa 4C). Note: AC screenshot filenames use a zero-based month (`23-6-126` = 23 July 2026); dates here are from file mtimes in Denver time.
- Windows screenshots folder — Screenshot (1).png 2024-12-24 (LM menu over a Porsche cockpit, 3840×2160); Screenshot (2).png 2025-12-27 (full desktop, iRacing + READY card, 5360×1440); Screenshot 2026-09-22 095514.png (Lotus 79 v13 shatter in the paint viewer).
- racing-desk, `apps/overlay/tests/golden/` — HUD golden frames: in-car synthetic (1920×1080), glance race 1180×820 and 820×1180 (dated 2026-10-08).
- racing-desk, `docs/phase0-probes/outlines.png` — track outlines reconstructed from `.ibt` (2026-09-16).
- `prodrive-plugin/racecor-plugin/docs/dashboard-screenshot.png` (in repo, committed 2026-03-13) — the first HUD frame.
- `k10-track-agents/projects/sand-creek-raceway/source/track-layout.png` — the marked aerial; `tracks/*/ui/*/outline.png|preview.png` for Sand Creek, Lake Murray, IMI.
- the Lake Murray v3 install archive (2026-10-14) — the installed v3 (map.png, ui/*/outline.png, preview.png, 116 MB kn5).
- Racing Desk recordings folder — 2026-10-07 (×4 sessions: Gesamtstrecke 570S GT4 and 720S GT3 EVO, Road Atlanta JS P320, Mount Panorama 992.2 Cup) and 2026-10-11 (×4). MP4 + `.telemetry.jsonl` sidecar; 0.5–2.4 GB each.
- the track build archive — dated build snapshots 2026-10-11 → 10-14 (e.g. `2026-10-11_073736_pre-three-versions`, `2026-10-14_engine-july_before_v0.18.0`).
- Repos hold almost no product screenshots; `prodrive-narrative/06-visuals.md` §12 lists the punch list that was never captured (hero reel, real dashboard, DNA radar, when-engine heatmap, native-app screenshots, installer, ambient-light room photo).

**Gaps worth closing for the site** (Kevin has to take these on the rig): Lake Murray v3 in daylight at College/Navajo; the race-corridor layout from the chase cam; the Racing Desk HUD over a real lap; a Racing Desk desk/Paints window; a frame from a 10-07 recording (the MP4s are too large to stage; a still from the rig would do).

## 6. Repo index (first → last commit, deduplicated commits)
prodrive-plugin 03-05→07-28 (559) · prodrive-homebridge 03-11→06-02 (15) · prodrive-server 03-19→10-09 (257) · prodrive-overlay 03-30→07-01 (333) · prodrive-edit 04-15→06-02 (10) · prodrive-ios 04-23→07-20 (48) · prodrive-macos 04-23→07-20 (64) · prodrive-windows 04-24→07-21 (177) · prodrive-agents 04-25→09-30 (69) · prodrive-tvos 04-25→07-20 (29) · prodrive-designer 04-26→06-02 (4) · prodrive-narrative 04-26→05-16 (3) · prodrive-support 05-02→06-02 (6) · prodrive-images-api 06-03 (6) · prodrive-ac-builder 06-05→08-28 (44 after dedup; 236 raw) · k10-track-agents 06-05→08-10 (324) · k10-1978 07-02→07-08 (9) · k10-colorado 07-03→08-28 (115) · k10-san-diego 07-03→08-28 (51) · k10-colorado-rally 07-24→07-27 (10) · k10-stories 07-25 (1) · k10-mxc 07-26 (3) · airoso 08-10→10-15 (88, reflog) · racing-desk 09-16→10-09 (88, reflog) · doooom-iRacing-liveries 09-23→09-30 (18) · doooom-paints 09-24 (6, reflog). Not on GitHub: airoso, racing-desk, doooom-paints (repo home noted as `DOOOOM/racing-desk`). Also on GitHub but not cloned: k10-motorsports/.github (org profile), and the `prodrive-server-showcase` / `prodrive-overlay-showcase` public demos referenced in READMEs.

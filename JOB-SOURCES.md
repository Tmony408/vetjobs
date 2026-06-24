# Job sources — keys to collect

The feed runs in the Next `/api/jobs` route, so **all keys go on the WEB service**
(Render → vetjobs-web → Environment), not the backend. Every source is optional —
blank key = skipped. Adapters live in `vetjobs-app/lib/source.js`.

## Already working (no key)
Arbeitnow · Remotive · Jobicy · RemoteOK · Himalayas · The Muse · Working Nomads
· company boards: GitLab, Coinbase, Robinhood, Brex, Doximity (Greenhouse) +
Netlify, Plaid, Ramp (Lever).

## Free, key-based — get these

### Covers NIGERIA (priority)
| Source | Get a key | Env vars | Adapter |
|---|---|---|---|
| **Jooble** | https://jooble.org/api/about | `JOOBLE_KEY` | ✅ wired |
| **Careerjet** | https://www.careerjet.com/partners/api/ | `CAREERJET_KEY` | needs adapter |
| **JSearch** (Google for Jobs, aggregator) | https://rapidapi.com → search "JSearch" | `RAPIDAPI_KEY` | needs adapter |
| **LoopCV** (aggregates 30+ boards) | https://www.loopcv.pro/developers/ | `LOOPCV_KEY` | needs adapter |

### Global / remote (foreign roles Nigerians can do remotely)
| Source | Get a key | Env vars | Adapter |
|---|---|---|---|
| **Adzuna** (no NG; UK/US/SA/etc.) | https://developer.adzuna.com | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` | ✅ wired |
| **Findwork** | https://findwork.dev/developers | `FINDWORK_KEY` | ✅ wired |
| **Reed** (UK) | https://www.reed.co.uk/developers | `REED_KEY` | ✅ wired |
| **apijobs.dev** | https://apijobs.dev | `APIJOBS_KEY` | needs adapter |
| **USAJobs** (US) | https://developer.usajobs.gov | `USAJOBS_KEY`, `USAJOBS_EMAIL` | needs adapter |
| **CareerOneStop** (US) | https://www.careeronestop.org/Developers/ | `CAREERONESTOP_KEY`, `CAREERONESTOP_USERID` | needs adapter |

## The shortcut to "30–40 sources"
You don't need 40 sign-ups. **JSearch** alone pulls Google for Jobs (thousands of
boards), and **LoopCV** aggregates 30+. So **Jooble + Careerjet + JSearch + LoopCV**
≈ dozens of boards including Nigeria, from four free keys.

## How to add the ones marked "needs adapter"
Get the key, then tell me which you have — I'll add the adapter to `lib/source.js`
(each is ~15 lines, env-gated like the others) and it'll activate on deploy.

Use this prompt with PI on your MacBook after cloning this repo:

---

I cloned `~/Downloads/pi-setup-config`.
Please set up my PI config from this repo.

Do this:
1. Verify these exist:
   - `config/settings.json`
   - `config/themes`
   - `config/skills`
2. Back up my current config if it exists:
   - `~/.pi/agent` -> `~/.pi/agent.backup-<timestamp>`
3. Apply repo config to `~/.pi/agent`:
   - copy `settings.json`
   - replace `themes` and `skills`
4. Install dependencies in each skill folder with `package.json`:
   - use `npm ci --omit=dev` if `package-lock.json` exists
   - otherwise `npm install --omit=dev`
5. Confirm result:
   - show active theme from `~/.pi/agent/settings.json`
   - list installed skill folders
6. Give me a short summary.

Only touch settings/themes/skills. Do not touch auth/session files.

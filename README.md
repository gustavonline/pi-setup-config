# PI setup config (Windows + macOS)

This repo stores your **PI agent setup** so you can keep the same experience on multiple machines.

It currently syncs:

- `settings.json`
- custom `themes/`
- `skills/` (including your local custom skill folders)

It intentionally does **not** sync sensitive/auth files like `auth.json` or session history.

## Repo layout

- `config/settings.json`
- `config/themes/*`
- `config/skills/*`
- `scripts/apply-config.mjs` → apply repo config to local `~/.pi/agent`
- `scripts/export-config.mjs` → export current local `~/.pi/agent` back into this repo

---

## 1) Clone on any machine

```bash
git clone https://github.com/gustavonline/pi-setup-config.git
cd pi-setup-config
```

---

## 2) Apply this config to your local PI setup

```bash
npm run apply
```

If you also want all skill dependencies installed:

```bash
npm run apply:with-deps
```

This writes to:

- macOS: `~/.pi/agent`
- Windows: `%USERPROFILE%\\.pi\\agent` (resolved automatically by Node)

---

## 3) Update the repo after making local PI changes

After editing themes/skills/settings locally:

```bash
npm run export
git add .
git commit -m "Update PI config"
git push
```

Then pull on your other machine and run:

```bash
npm run apply:with-deps
```

---

## Notes

- If PI is open while syncing, restart PI after `apply`.
- `node_modules` inside skill folders are not stored in git; they are reinstalled with `apply:with-deps`.

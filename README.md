# pi-setup-config

Simple backup/sync repo for your PI setup across **Windows + macOS**.

This repo contains only what you need:

- `config/settings.json`
- `config/themes/*`
- `config/skills/*`

It does **not** include auth/session files.

---

## macOS setup

```bash
cd ~/Downloads
git clone https://github.com/gustavonline/pi-setup-config.git
cd pi-setup-config

# optional backup
mkdir -p ~/.pi
[ -d ~/.pi/agent ] && cp -R ~/.pi/agent ~/.pi/agent.backup.$(date +%Y%m%d-%H%M%S)

# apply config
mkdir -p ~/.pi/agent
cp config/settings.json ~/.pi/agent/settings.json
rm -rf ~/.pi/agent/themes ~/.pi/agent/skills
cp -R config/themes ~/.pi/agent/themes
cp -R config/skills ~/.pi/agent/skills

# install deps for skills
find ~/.pi/agent/skills -name package.json -not -path '*/node_modules/*' -print0 | while IFS= read -r -d '' pkg; do
  d="$(dirname "$pkg")"
  (
    cd "$d"
    if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
  )
done
```

Restart PI after setup.

---

## Windows (PowerShell) setup

```powershell
cd $HOME\Downloads
git clone https://github.com/gustavonline/pi-setup-config.git
cd .\pi-setup-config

$target = Join-Path $HOME ".pi\agent"
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item .\config\settings.json (Join-Path $target "settings.json") -Force
Remove-Item (Join-Path $target "themes") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $target "skills") -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item .\config\themes (Join-Path $target "themes") -Recurse -Force
Copy-Item .\config\skills (Join-Path $target "skills") -Recurse -Force

Get-ChildItem (Join-Path $target "skills") -Recurse -Filter package.json | ForEach-Object {
  $dir = $_.Directory.FullName
  Push-Location $dir
  if (Test-Path "package-lock.json") { npm ci --omit=dev } else { npm install --omit=dev }
  Pop-Location
}
```

---

## Keep repo updated

After changing local PI config:

```bash
cd ~/Downloads/pi-setup-config
cp ~/.pi/agent/settings.json config/settings.json
rm -rf config/themes config/skills
cp -R ~/.pi/agent/themes config/themes
cp -R ~/.pi/agent/skills config/skills
find config/skills -type d -name node_modules -prune -exec rm -rf {} +
find config/skills -type f -name .package-lock.json -delete

git add .
git commit -m "Update PI config"
git push
```

---

Assistant prompt to use on MacBook: `SETUP_PROMPT.md`

---
name: vps-temporary-ssh
description: Generate a temporary SSH ed25519 key in the agent environment and provide one copy/paste VPS command that grants access and auto-revokes the key after 30 minutes. Store artifacts in the current project's .pi/tmp/ssh and write a .txt/.md command file for wrap-safe copying in terminals like Warp.
---

# VPS Temporary SSH Access (30 min)

Use this skill when the user wants fast temporary SSH access setup (typically root on a VPS) with automatic key expiry.

## Default behavior

- Generate the SSH key pair yourself (agent-side). Do **not** ask the user to generate keys unless explicitly requested.
- Default TTL is **30 minutes**.
- Build **one single-line VPS command**.
- Store everything in the **project-local** folder: `<project>/.pi/tmp/ssh` (never `~/.pi/tmp/ssh`).
- Always write the command to local files so the user can copy from file (avoids Warp line-wrap paste issues):
  - `<key>.vps-command.txt` (exact one-liner only)
  - `<key>.vps-command.md` (human-readable)
- Prefer returning file paths + clipboard helper command. Only include the long one-liner inline if user asks.

## Required flow

1. Resolve the current project root by finding the nearest parent directory containing `.pi`.
2. Generate keypair in `<project>/.pi/tmp/ssh`.
3. Read public key and fingerprint.
4. Build base64 payload from public key.
5. Build one-line VPS command (add key + auto-remove after 30 minutes).
6. Write `.txt` and `.md` command files next to the generated key.
7. Return:
   1. Public key
   2. Fingerprint
   3. File paths to the saved command
   4. Short clipboard command (macOS by default)
   5. Optional PowerShell clipboard command (when relevant)
   6. Optional direct local-to-VPS execution command if host/IP is known

## Agent-side key generation

```bash
SEARCH_DIR="$PWD"
while [ "$SEARCH_DIR" != "/" ] && [ ! -d "$SEARCH_DIR/.pi" ]; do SEARCH_DIR="$(dirname "$SEARCH_DIR")"; done
if [ ! -d "$SEARCH_DIR/.pi" ]; then echo "ERROR: no project .pi directory found from $PWD upward" >&2; exit 1; fi
PROJECT_ROOT="$SEARCH_DIR"
KEY_DIR="$PROJECT_ROOT/.pi/tmp/ssh"
STAMP="$(date +%Y%m%d_%H%M%S)"
KEY="$KEY_DIR/pi_vps_${STAMP}"
mkdir -p "$KEY_DIR"
umask 077
ssh-keygen -t ed25519 -N "" -f "$KEY" -C "pi-temp-${STAMP}" >/dev/null
FP="$(ssh-keygen -lf "$KEY.pub")"
PUB="$(cat "$KEY.pub")"
KEY_TAG="$(awk '{print $3}' "$KEY.pub")"
KB64="$(printf '%s' "$PUB" | base64 | tr -d '\n')"
```

## VPS command template (single line)

```bash
KB64='{{PUBLIC_KEY_BASE64}}'; K="$(printf '%s' "$KB64" | base64 -d)"; install -d -m 700 /root/.ssh && touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys && printf '%s\n' "$K" | tee -a /root/.ssh/authorized_keys >/dev/null && (sleep 1800; sed -i '/ {{KEY_TAG}}$/d' /root/.ssh/authorized_keys) >/dev/null 2>&1 & echo "Added {{KEY_TAG}} (auto-remove in 30 min)"
```

## Write artifact files

```bash
CMD="KB64='${KB64}'; K=\"\$(printf '%s' \"\$KB64\" | base64 -d)\"; install -d -m 700 /root/.ssh && touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys && printf '%s\\n' \"\$K\" | tee -a /root/.ssh/authorized_keys >/dev/null && (sleep 1800; sed -i '/ ${KEY_TAG}$/d' /root/.ssh/authorized_keys) >/dev/null 2>&1 & echo \"Added ${KEY_TAG} (auto-remove in 30 min)\""
CMD_TXT="${KEY}.vps-command.txt"
CMD_MD="${KEY}.vps-command.md"
printf '%s' "$CMD" > "$CMD_TXT"
cat > "$CMD_MD" <<EOF
# Temporary VPS SSH command (30 min)

Use the txt file for safest paste in Warp.

Key tag: ${KEY_TAG}
Fingerprint: ${FP}

~~~bash
${CMD}
~~~
EOF
```

If useful (Windows users), also get Windows path for user:

```bash
CMD_TXT_WIN="$(cygpath -w "$CMD_TXT" 2>/dev/null || true)"
CMD_MD_WIN="$(cygpath -w "$CMD_MD" 2>/dev/null || true)"
KEY_WIN="$(cygpath -w "$KEY" 2>/dev/null || true)"
PUB_WIN="$(cygpath -w "$KEY.pub" 2>/dev/null || true)"
```

## Response template

Use concise output:

1. `Her er public key:` + key line
2. `Fingerprint:` + fingerprint line
3. `Kommando gemt i:` + `.txt` path (and `.md` path)
4. `Kopiér sikkert til clipboard (macOS):`
   - `pbcopy < "<CMD_TXT_PATH>"`
5. `Kopiér sikkert til clipboard (PowerShell, hvis relevant):`
   - `Get-Content -Raw "<WIN_CMD_TXT_PATH>" | Set-Clipboard`
6. If VPS host/IP is known, also provide:
   - `ssh root@<HOST> "$(cat '<CMD_TXT_PATH>')"`
7. `Sig til når kommandoen er kørt, så fortsætter jeg.`

## Safety notes

- Never print private key content.
- Keep private key file permissions at `600`.
- Manual revoke command (if needed):

```bash
sed -i '/ pi-temp-/d' /root/.ssh/authorized_keys
```

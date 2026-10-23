#!/usr/bin/env bash
# One-time setup of a fresh Lightsail Ubuntu 24.04 instance for the Gloceries
# backend. Run as the default `ubuntu` user:
#   curl -fsSL <raw URL of this file> -o setup.sh && sudo bash setup.sh
# Safe to run again.
set -euo pipefail

APP_DIR=/opt/gloceries
DEPLOY_USER=ubuntu

echo "== System updates and automatic security patches"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades docker.io docker-compose-v2 ufw
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== Docker"
systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER"

echo "== 2 GB swap (image resizing with sharp can spike memory)"
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  if [[ ! -e /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  chmod 600 /swapfile
  swapon /swapfile
fi
grep -qE '^/swapfile[[:space:]]' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

echo "== Firewall: SSH, HTTP, HTTPS only (also open 80/443 in the Lightsail Networking tab)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "== SSH: keys only"
cat > /etc/ssh/sshd_config.d/00-gloceries.conf <<'SSH'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
SSH
sshd -t
systemctl reload ssh

echo "== App directory"
mkdir -p "$APP_DIR/releases"
chown "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR"
chmod 750 "$APP_DIR"

cat <<EOF

Done. Next, as $DEPLOY_USER (log out and back in so the docker group applies):
  1. Stage deployment files into $APP_DIR/releases/<commit>
  2. Create $APP_DIR/.env with the same variables Railway has (chmod 600)
  3. Add API_DOMAIN=api.gloceries.com to that .env (Compose reads it for the Caddy domain)
  4. docker login ghcr.io  (GitHub username + a token with read:packages)
  5. bash $APP_DIR/releases/<commit>/deploy.sh <commit>
EOF

#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Este instalador debe correr como root (usá: sudo ./instalar-en-cliente.sh)"
  exit 1
fi

INSTALL_DIR="/opt/repro-publicidad"
NODE_MAJOR=20
SRC="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Instalador de Repro Publicidad (Debian/Ubuntu) ==="
echo "Origen:  $SRC"
echo "Destino: $INSTALL_DIR"
echo

read -r -p "Usuario administrador del panel [admin]: " ADMIN_USER
if [ -z "$ADMIN_USER" ]; then ADMIN_USER="admin"; fi
read -r -s -p "Contraseña de administrador del panel: " ADMIN_PASS; echo
read -r -s -p "Repetí la contraseña: " ADMIN_PASS2; echo
if [ "$ADMIN_PASS" != "$ADMIN_PASS2" ]; then
  echo "ERROR: las contraseñas no coinciden."
  exit 1
fi

echo
echo "=== Instalando dependencias del sistema ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg openssl

echo "=== Instalando Node.js $NODE_MAJOR ==="
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y nodejs
node -v

echo "=== Instalando MongoDB ==="
. /etc/os-release
case "$ID" in
  debian)
    case "$VERSION_CODENAME" in
      bullseye|bookworm) CODENAME="$VERSION_CODENAME" ;;
      *) CODENAME="bookworm" ;;
    esac
    REPO_LINE="deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian ${CODENAME}/mongodb-org/8.0 main"
    ;;
  ubuntu)
    case "$VERSION_CODENAME" in
      focal|jammy|noble) CODENAME="$VERSION_CODENAME" ;;
      *) CODENAME="jammy" ;;
    esac
    REPO_LINE="deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/8.0 main"
    ;;
  *)
    echo "ERROR: distribución no soportada ($ID). Instalá MongoDB manualmente."
    exit 1
    ;;
esac
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "$REPO_LINE" > /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update
apt-get install -y mongodb-org
systemctl enable --now mongod
sleep 2
systemctl is-active mongod

echo "=== Copiando proyecto a $INSTALL_DIR ==="
mkdir -p "$INSTALL_DIR"
(cd "$SRC" && tar --exclude=node_modules --exclude=.git --exclude=.env --exclude=uploads --exclude=apps/server/public --exclude=dist --exclude=deploy -cf - .) | (cd "$INSTALL_DIR" && tar xf -)

echo "=== Configurando .env ==="
JWT_SECRET="$(openssl rand -hex 32)"
cat > "$INSTALL_DIR/.env" <<EOF
PORT=3000
MONGO_URL=mongodb://127.0.0.1:27017/repro-publicidad
JWT_SECRET=$JWT_SECRET
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF

echo "=== Instalando dependencias y compilando ==="
cd "$INSTALL_DIR"
npm ci --no-audit --no-fund
npm run build
npm run seed --prefix apps/server

echo "=== Creando servicio de arranque automático ==="
cat > /etc/systemd/system/repro-publicidad.service <<EOF
[Unit]
Description=Repro Publicidad (panel + player + API)
After=network-online.target mongod.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR/apps/server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now repro-publicidad
sleep 3
systemctl is-active repro-publicidad

echo "=== Abriendo puerto 3000 en el firewall ==="
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 3000/tcp || true
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -z "$IP" ] && IP="<IP de esta PC>"
echo
echo "==================== INSTALACIÓN COMPLETA ===================="
echo "  Panel administrativo:  http://$IP:3000/panel"
echo "  Player (pantallas):    http://$IP:3000/player"
echo "  Usuario admin:         $ADMIN_USER"
echo "=============================================================="
echo "Para ver en las pantallas, abrí el navegador del TV con la URL del player."
echo "La PC debe quedar prendida y en la misma red que los televisores."
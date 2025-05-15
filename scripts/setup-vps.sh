#!/bin/bash

# Aktualisiere das System
sudo apt update && sudo apt upgrade -y

# Installiere Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installiere PM2
sudo npm install -g pm2

# Installiere MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Installiere Nginx
sudo apt install -y nginx

# Konfiguriere Firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable

# Hole Let's Encrypt Zertifikat
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d housnkuh.de -d www.housnkuh.de

# Erstelle Anwendungsverzeichnis
sudo mkdir -p /var/www/housnkuh
sudo chown -R $USER:$USER /var/www/housnkuh

# Nginx-Konfiguration
sudo tee /etc/nginx/sites-available/housnkuh.de > /dev/null << EOF
server {
    server_name housnkuh.de www.housnkuh.de;

    location / {
        root /var/www/housnkuh/client/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    listen 443 ssl;
    # SSL-Konfiguration wird von Certbot hinzugefügt
}
EOF

# Aktiviere die Seite
sudo ln -s /etc/nginx/sites-available/housnkuh.de /etc/nginx/sites-enabled/
sudo systemctl restart nginx

echo "VPS-Setup abgeschlossen!"
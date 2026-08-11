#!/bin/bash
# Setup script for Supabase self-hosting on Ubuntu VPS (200.234.32.189) for dbsetu.supplysetu.app

set -e

echo "=== Updating system and installing dependencies ==="
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx || true

echo "=== Setting up Nginx for dbsetu.supplysetu.app ==="
sudo cp nginx.conf /etc/nginx/sites-available/dbsetu.supplysetu.app
sudo ln -sf /etc/nginx/sites-available/dbsetu.supplysetu.app /etc/nginx/sites-enabled/
sudo nginx -t

echo "=== Obtaining SSL Certificate via Certbot ==="
sudo certbot --nginx -d dbsetu.supplysetu.app --non-interactive --agree-tos --register-unsafely-without-email || true

echo "=== Starting Supabase Docker Stack ==="
if [ ! -f .env ]; then
    cp .env.example .env
fi

mkdir -p volumes/db/data volumes/db/init volumes/storage
docker-compose up -d || docker compose up -d

echo "=== Reloading Nginx ==="
sudo systemctl reload nginx

echo "=== Supabase Setup Complete! ==="
echo "Studio Dashboard: https://dbsetu.supplysetu.app"

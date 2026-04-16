#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────────────────
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-your-dockerhub-username}"

BACKEND_IMAGE="$DOCKERHUB_USERNAME/retro-backend"
FRONTEND_IMAGE="$DOCKERHUB_USERNAME/retro-frontend"

# ── Login ─────────────────────────────────────────────────────────────────────
echo "🔐 Logging in to Docker Hub..."
docker login

# ── Build ─────────────────────────────────────────────────────────────────────
echo ""
echo "🔨 Building backend..."
docker build --platform linux/amd64 -t "$BACKEND_IMAGE:latest" ./retro-server

echo ""
echo "🔨 Building frontend..."
docker build --platform linux/amd64 -t "$FRONTEND_IMAGE:latest" ./retro-fe

# ── Push ──────────────────────────────────────────────────────────────────────
echo ""
echo "🚀 Pushing backend..."
docker push "$BACKEND_IMAGE:latest"

echo ""
echo "🚀 Pushing frontend..."
docker push "$FRONTEND_IMAGE:latest"

echo ""
echo "✅ Done! Images pushed:"
echo "   $BACKEND_IMAGE:latest"
echo "   $FRONTEND_IMAGE:latest"

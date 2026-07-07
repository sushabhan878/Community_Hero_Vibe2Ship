#!/bin/bash
# GCP Deployment Script for Community Hero Backend
# This script uses GCP Cloud Build to compile and push the container in the cloud,
# then deploys it to Google Cloud Run.

set -e

# Configuration
SERVICE_NAME="community-hero-api"
REGION="us-central1"
REPO_NAME="community-hero-repo"

# Ensure we are in the backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check if logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "ERROR: You are not logged in to Google Cloud SDK."
    echo "Please run: gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    echo "ERROR: No active GCP project set."
    echo "Please set one using: gcloud config set project [YOUR-PROJECT-ID]"
    exit 1
fi

echo "Deploying backend to GCP..."
echo "Project ID:  $PROJECT_ID"
echo "Service:     $SERVICE_NAME"
echo "Region:      $REGION"
echo "Repository:  $REPO_NAME"
echo "----------------------------------------"

# 1. Create Artifact Registry repository if it doesn't exist
echo "Checking/creating Artifact Registry repository..."
gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &>/dev/null || \
gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker repository for Community Hero" \
    --quiet

IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

# 2. Build image using Cloud Build
echo "Building Docker container in the cloud using Google Cloud Build..."
gcloud builds submit --tag "$IMAGE_TAG" .

# 3. Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --region "$REGION" \
    --allow-unauthenticated \
    --port 8000 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 5

echo "----------------------------------------"
echo "Deployment completed successfully!"
echo "You can view your service logs using: gcloud run services logs tail $SERVICE_NAME --region $REGION"

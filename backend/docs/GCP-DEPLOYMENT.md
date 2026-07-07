# GCP Deployment Guide for Express Backend

This guide walks you through deploying the Community Hero Express/TypeScript backend to **Google Cloud Run** using either **GitHub Actions (CI/CD)** or a **Manual Deployment Script**.

---

## 1. Initial Google Cloud Platform Setup

Before deploying, you must set up your Google Cloud Platform (GCP) project.

### Step 1: Create a GCP Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top-left and select **New Project**.
3. Enter a Project Name (e.g., `community-hero-vibe2ship`) and make note of the **Project ID** (e.g., `community-hero-123456`).
4. Ensure billing is enabled for your project (Cloud Run has a generous free tier, but a billing account is required).

### Step 2: Enable the Required APIs
You need to enable the APIs for Cloud Run, Cloud Build, and Artifact Registry. Run the following command in Google Cloud Shell or your local CLI:
```bash
gcloud services enable \
    run.googleapis.com \
    build.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com
```
*Alternatively, you can search for and enable these APIs in the API Library in the GCP Console.*

---

## 2. Managing Database & API Credentials (Secrets)

Your backend relies on external services (Supabase, Gemini API, etc.). We recommend storing these sensitive credentials in **Google Cloud Secret Manager** and injecting them into your Cloud Run service.

### Step 1: Create Secrets in GCP
For each sensitive environment variable (refer to `.env.example`), create a secret:
1. Go to **Security > Secret Manager** in the GCP Console.
2. Click **Create Secret**.
3. Name the secret (e.g., `DATABASE_URL`) and paste the secret value.
4. Do this for the following critical variables:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`

### Step 2: Map Secrets in Cloud Run
When configuring Cloud Run, you can map Secret Manager secrets to environment variables so that your code can read them via `process.env.DATABASE_URL` etc.
- In the Cloud Run deployment console, go to **Variables & Secrets**.
- Click **Reference a Secret**.
- Map each secret (e.g. `DATABASE_URL` secret version `latest` mapped to environment variable `DATABASE_URL`).

---

## 3. Deployment Method A: GitHub Actions (CI/CD)

This method automatically deploys the backend every time you push to the `main` branch.

### Step 1: Create a Service Account for GitHub
1. In the GCP Console, go to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**.
3. Name it `github-actions-deployer` and click **Create and Continue**.
4. Grant the Service Account the following IAM roles:
   - **Cloud Run Developer** (`roles/run.developer`): To deploy new revisions of Cloud Run.
   - **Service Account User** (`roles/iam.serviceAccountUser`): To run the Cloud Run service as the runtime service account.
   - **Artifact Registry Writer** (`roles/artifactregistry.writer`): To push build images.
   - **Cloud Build Editor** (`roles/cloudbuild.builds.editor`): To execute container builds if needed.
5. Click **Done**.

### Step 2: Generate the JSON Key
1. Click on the newly created Service Account.
2. Go to the **Keys** tab, click **Add Key**, and select **Create new key**.
3. Select **JSON** and click **Create**. This downloads a JSON file containing the credentials.
4. **Keep this file secure! Do not commit it to Git.**

### Step 3: Configure GitHub Secrets
1. Go to your GitHub repository: `sushabhan878/Community_Hero_Vibe2Ship`.
2. Go to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret** and add the following:
   - **`GCP_PROJECT_ID`**: Your Google Cloud Project ID.
   - **`GCP_SA_KEY`**: The complete contents of the downloaded Service Account JSON file.

### Step 4: Push to Main
Push your changes to GitHub:
```bash
git add .
git commit -m "Configure GCP deployment"
git push origin main
```
This triggers the workflow `.github/workflows/deploy-gcp.yml` to build and deploy.

---

## 4. Deployment Method B: Manual Script (Cloud Build)

If you want to deploy manually from your machine or Google Cloud Shell:

### Step 1: Install Google Cloud SDK (Local CLI)
If deploying locally, install the Google Cloud CLI:
- **Windows (PowerShell)**:
  ```powershell
  winget install Google.CloudSDK
  ```
- **macOS / Linux**:
  Follow instructions at [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install).

### Step 2: Authenticate and Set Project
Run the following in your terminal:
```bash
# Log in to your Google Account
gcloud auth login

# Set your active project ID
gcloud config set project [YOUR-PROJECT-ID]
```

### Step 3: Run the Deployment Script
Run the script we created:
```bash
# Make the script executable (Mac/Linux/Git Bash)
chmod +x backend/scripts/deploy-gcp.sh

# Execute the deployment
./backend/scripts/deploy-gcp.sh
```
This script will upload your local codebase, build the Docker image in GCP (using Cloud Build), push it to Artifact Registry, and deploy it to Cloud Run.

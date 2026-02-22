# Google Cloud Storage (GCS) Free Tier Migration Plan

This document outlines the steps and exact configuration required to migrate Journey Documents from local storage in the Travel Planner app to Google Cloud Storage while strictly staying within the "Always Free" tier.

## 1. Why Migrate?
Currently, journey documents (like tickets, PDFs, and receipts) are stored on the local file system. If the application is deployed to a PaaS (like Heroku, Vercel, or Render) or a containerized environment, local storage is ephemeral. This means any user-uploaded files will be lost every time the server restarts or redeploys.

Google Cloud Storage (GCS) offers a robust, cloud-native solution for file storage, and its "Always Free" tier provides enough resources for a typical early-stage application.

## 2. GCS "Always Free" Tier Limits
To ensure zero costs, usage must stay under the following monthly limits (calculated per billing account):
- **Storage Limit:** 5 GB of regional standard storage per month.
- **Egress Limit:** 100 GB of network egress (data downloaded out of GCS) per month. *(Note: Data egress to China and Australia is excluded from the free tier).*
- **Operation Limits:**
  - 5,000 Class A operations (e.g., uploading a file, creating a bucket).
  - 50,000 Class B operations (e.g., downloading a file, listing files).

## 3. Strict Bucket Configuration
To qualify for the free tier, the GCS bucket **must** be configured with the following specific settings. Any deviation will result in standard billing rates.

1. **Location Type:** Must be **Region**. (Do NOT select Multi-region or Dual-region).
2. **Location:** Must be one of the following three US regions:
    - `us-west1` (Oregon)
    - `us-central1` (Iowa)
    - `us-east1` (South Carolina)
3. **Storage Class:** Must be **Standard**. (Do NOT select Nearline, Coldline, or Archive).

## 4. Implementation Plan

### Phase 1: Google Cloud Setup
- Create a Google Cloud Project.
- Enable Billing (required for the Free Tier, but costs will be $0 if limits are respected).
- Create the bucket using the strict configuration listed in Section 3.
- Generate a Service Account key (JSON) with `Storage Object Admin` permissions to allow the backend to upload/delete files.

### Phase 2: Safeguards & Alerts
- **Set a Billing Alert:** In the Google Cloud Console (Billing > Budgets & alerts), set a budget of `$0.00` and create an alert to trigger at 100% of the budget. This provides immediate notification if any configuration mistake leads to potential charges.

### Phase 3: Backend Integration (Python/FastAPI)
- Install the `google-cloud-storage` package: `pip install google-cloud-storage`
- Update `app/routers/journey_documents.py` to:
  - Read GCS credentials from environment variables (`GOOGLE_APPLICATION_CREDENTIALS`).
  - Read the bucket name from environment variables (`GCS_BUCKET_NAME`).
  - Replace the local file saving (`shutil.copyfileobj`) with an upload stream directly to the GCS bucket.
  - On file deletion, properly trigger a deletion request to the GCS bucket. Deleting files is a free operation and is critical for staying under the 5 GB storage limit.

### Phase 4: Application Level Optimizations
- **Compress Uploads:** Consider compressing images and files (e.g., shrinking large receipt photos) either on the frontend or backend prior to GCS upload. This maximizes the 5 GB allowance.
- **Orphan Cleanup:** Ensure robust logic so that if a Journey or User is deleted, their associated documents are also purged from the GCS bucket.

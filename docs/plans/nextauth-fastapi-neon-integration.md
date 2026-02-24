# NextAuth.js (Auth.js) Integration Design

## Overview
This document outlines the architectural design and implementation plan for integrating NextAuth.js into the Travel Planner application. The goal is to replace the custom-rolled FastAPI authentication with a robust, community-supported solution that runs in the Next.js frontend, while maintaining our Neon PostgreSQL database as the single source of truth and keeping the FastAPI backend secure.

## Current vs. Proposed Architecture

### Current Architecture
* **Frontend (Next.js):** Handles login/register forms, stores `access_token` and `refresh_token` in `localStorage` or cookies.
* **Backend (FastAPI):** Exposes `/auth/register` and `/auth/login`. Hashes passwords, issues JWTs, and verifies them on protected routes.
* **Database (Neon):** Stores users and their hashed passwords.

### Proposed Architecture (NextAuth.js)
* **Frontend (Next.js + NextAuth):** Handles all authentication flows (OAuth, Magic Links, Credentials). Manages sessions natively via secure HttpOnly cookies.
* **Backend (FastAPI):** Becomes an API resource server. It no longer handles passwords or issues tokens. It simply verifies the JWTs sent by the frontend.
* **Database (Neon):** NextAuth connects directly to Neon (via an adapter like Prisma or Drizzle, or a custom adapter utilizing the existing SQLAlchemy schema via the backend API) to create users, accounts (for OAuth), and sessions.

---

## Architectural Deep Dive

Since we have a decoupled architecture (Next.js Frontend + FastAPI Backend), we need a strategy to share the authentication state securely between the two.

### The "Shared Secret JWT" Strategy (Recommended)

NextAuth defaults to a JWT-based session strategy when using certain providers. We can leverage this to authenticate requests to the FastAPI backend.

1. **Authentication:** The user logs in via NextAuth on the frontend (e.g., Google OAuth).
2. **Session Creation:** NextAuth creates a user record in the Neon DB (via its database adapter). NextAuth issues an encrypted JWT stored in an HttpOnly cookie on the frontend.
3. **API Request:** When the frontend needs to fetch data from the FastAPI backend, it extracts the JWT (or a customized access token embedded within the NextAuth session) and sends it in the `Authorization: Bearer <token>` header.
4. **Backend Verification:** The FastAPI backend intercepts the request and decodes the JWT. 
   * **Wait, how does FastAPI read NextAuth's token?** NextAuth uses JWE (JSON Web Encryption) with A256GCM by default, which can be complex to decrypt in Python. 
   * **The Solution:** We configure NextAuth to use standard JWS (JSON Web Signatures) during the `jwt` callback, signing it with a shared secret (`NEXTAUTH_SECRET`). The FastAPI backend uses the same `NEXTAUTH_SECRET` to verify the signature (using a library like `PyJWT`).

### The Database Adapter

NextAuth requires a database adapter to store users and OAuth account linkages. Since our database is hosted on Neon, NextAuth can connect to it securely.

* **Challenge:** Our backend expects user schemas to be managed by SQLAlchemy (Alembic migrations). If NextAuth creates its own tables (`User`, `Account`, `Session`), our backend must be aware of them.
* **Solution:** We can map NextAuth's required table structures into our existing SQLAlchemy models. When NextAuth writes to the database (e.g., via the Postgres adapter or a custom adapter calling our FastAPI backend to create the user), the tables will align with what the backend expects for foreign keys (e.g., `trip.user_id`).

---

## Implementation Plan

### Phase 1: Next.js Frontend Setup
1. **Install Dependencies:** `npm install next-auth`
2. **Configure Provider:** Setup `app/api/auth/[...nextauth]/route.ts`.
3. **Customize JWT:** Intercept the JWT callback to generate a standard JWT signed with a secret, embedding the `user_id` inside it.
   ```typescript
   import jwt from 'jsonwebtoken';
   
   export const authOptions = {
     session: { strategy: "jwt" },
     callbacks: {
       async jwt({ token, user, account }) {
         if (user) {
           // On initial sign in, attach user id
           token.id = user.id;
         }
         return token;
       },
       // Important: Override encode/decode to use standard JWS instead of NextAuth's default JWE
       // This allows the Python backend to easily decode it.
       async encode({ secret, token }) {
         return jwt.sign(token, secret);
       },
       async decode({ secret, token }) {
         return jwt.verify(token, secret);
       }
     }
   }
   ```
4. **Update Frontend API Calls:** Update custom fetch wrappers (or Axios instances) to retrieve the active session token (via `getSession()`) and inject it into the `Authorization` header when calling the FastAPI backend.

### Phase 2: FastAPI Backend Modifications
1. **Remove Old Auth Logic:** Deprecate `/auth/register` and `/auth/login` (unless keeping credential login). Passwords are no longer stored or verified by the backend.
2. **Update Dependency Injection:** Modify the `get_current_user` dependency in `app/core/security.py`.
   * Switch from validating the old custom token format to validating the standard JWS token signed by `NEXTAUTH_SECRET`.
   * Ensure `PyJWT` is configured to decode the token properly.
3. **Database Schema Alignment:** Ensure the `users` table schema in SQLAlchemy has the necessary fields to support NextAuth (e.g., `email_verified`, `image`, and OAuth accounts).

### Phase 3: OAuth Configuration
1. Setup Google Cloud Platform (GCP) credentials for Google OAuth.
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the `.env` files.
3. Hook Google Provider into the NextAuth configuration.

---

## Pros and Cons of this Approach

### Pros
* **No Vendor Lock-in:** User data stays completely within our Neon database. No monthly subscription fees to Clerk or Supabase.
* **OAuth Simplified:** NextAuth abstracts away the painful OAuth 2.0 PKCE flows for Google, Apple, etc.
* **Security:** NextAuth handles session rotation, CSRF, and secure cookies natively within Next.js.
* **Decoupled Backend:** The FastAPI backend remains a pure, stateless API. It scales independently and only trusts requests signed with the shared secret.

### Cons
* **Cross-Language Crypto:** Making sure NextAuth (TypeScript) and FastAPI (Python) agree on the JWT encoding/decoding algorithm (`HS256`) requires careful initial configuration (overriding NextAuth's default encryption).
* **Database Dual-Management:** Both NextAuth (frontend) and SQLAlchemy (backend) interact with the user tables. Schema migrations must be handled carefully via Alembic to ensure both systems remain compatible.

## Next Steps
1. Decide if we want to retain Email/Password login (Credentials provider in NextAuth) or migrate entirely to OAuth-only (Magic Links / Google).
2. Draft the revised SQLAlchemy models for the `User` and `Account` tables to satisfy NextAuth's schema requirements.
3. Setup a proof-of-concept branch testing the shared-secret JWT verification between Next.js and FastAPI.

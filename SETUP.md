# Setup checklist (Phase 5)

Do the steps in order and tell Claude after each numbered block. Menu names on Google and Meta change often; steps marked [unverified] describe where the option was at the time of writing. Never paste a secret into the chat: secrets go only into GitHub's secret form (repo → Settings → Secrets and variables → Actions → New repository secret).

## 1. GitHub (done)

Repo `gonzaloramosfdz/faceless-studio` exists and the code is pushed. Install the GitHub mobile app and sign in; approvals and failure alerts arrive there.

## 2. YouTube API access

The channel exists. Phone verification is not needed for Shorts.

1. Go to console.cloud.google.com, signed in with the channel's Google account → create a project → APIs & Services → Library → enable **YouTube Data API v3**.
2. APIs & Services → OAuth consent screen (Google Auth Platform): External, an app name, your email. Add your own Google account as a test user.
3. Set the publishing status to **In production**. Otherwise the login expires every 7 days. If Google demands verification before it lets you continue, stop and tell Claude.
4. Credentials → Create credentials → OAuth client ID → type **Web application**. Under "Authorized redirect URIs" add `https://developers.google.com/oauthplayground`. Keep the client ID and client secret open in a tab.
5. Open developers.google.com/oauthplayground → gear icon (top right) → tick "Use your own OAuth credentials" → paste the client ID and secret.
6. In the box "Input your own scopes" paste: `https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl` → Authorize APIs → choose the channel's account. Google shows an "unverified app" warning: Advanced → continue.
7. Press "Exchange authorization code for tokens" and copy the **Refresh token**.
8. Add three GitHub secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.

## 3. Instagram API access

No Facebook Page is needed. A Meta developer account is, and Meta requires a personal Facebook login to open one [unverified]; it is only used to sign in to the developer site.

1. In the Instagram app: Settings → Account type and tools → switch to a **Professional** account (Creator). The API cannot post to personal accounts.
2. Go to developers.facebook.com → My Apps → Create app. Pick the use case for managing Instagram content / "Instagram" product [unverified].
3. In the app dashboard open Instagram → **API setup with Instagram login**.
4. Under "Generate access tokens", add your Instagram account and log in to it. Approve the permissions; `instagram_business_basic` and `instagram_business_content_publish` must be included.
5. Press Generate token and copy it. It is a long-lived token (60 days; the pipeline renews it).
6. Add one GitHub secret: `IG_ACCESS_TOKEN`.
7. If Meta asks for app review or business verification before it shows a token, stop and tell Claude.

## 4. Optional but recommended: automatic Instagram token renewal

Without this, an issue reminds you to paste a new Instagram token about every 7 weeks.

1. GitHub → your profile picture → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Repository access: only `faceless-studio`. Permissions → Repository → **Secrets: Read and write**. Expiration: the longest offered.
3. Add it as the GitHub secret `GH_ADMIN_TOKEN`.

## 5. First live test (Claude runs these with you)

1. Login check workflow: confirms both logins work.
2. Weekly batch with dry run off: plans the first 7 days.
3. Post with dry run off: uploads to YouTube as private, holds the Instagram video, and opens a review issue.
4. Publish approved: you approve that first post from the issue.

## 6. Go live (Phase 6)

1. Settings → Secrets and variables → Actions → Variables → New variable `SCHEDULE_ENABLED` = `true`.
2. Approve the first 5 posts per platform from the review issues. After that each platform publishes on its own.

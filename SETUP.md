# Setup checklist (Phase 5)

Do the steps in order and tell Claude after each numbered block. Menu names on Google and Meta change often; steps marked [unverified] describe where the option was at the time of writing. Never paste a secret into the chat: secrets go only into GitHub's secret form.

## 1. GitHub

1. Create an account at github.com (free plan).
2. Create a new repository: name `faceless-studio`, **Public**, no README, no .gitignore.
3. Install the GitHub mobile app and sign in (used for approvals and failure alerts).
4. Give this Claude session access to the repo (Claude will ask through a prompt), so the code can be pushed.

## 2. YouTube

1. Create a Google account for the channel, then a YouTube channel (name, handle, picture).
2. In YouTube Studio → Settings → Channel → Feature eligibility, verify your phone number (needed for videos over 15 minutes and custom thumbnails).
3. Go to console.cloud.google.com → create a project → APIs & Services → Library → enable **YouTube Data API v3**.
4. APIs & Services → OAuth consent screen: External, app name, your email. Add yourself as a test user. Then set the publishing status to **In production** (otherwise the login expires every 7 days). If Google asks for verification, stop and tell Claude.
5. Credentials → Create credentials → OAuth client ID → **Web application**. Add the redirect URI `https://developers.google.com/oauthplayground`. Keep the client ID and client secret open in a tab.
6. Open developers.google.com/oauthplayground → gear icon → tick "Use your own OAuth credentials" → enter the client ID and secret. In the scope box enter `https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl` → Authorize APIs → sign in with the channel's account → Exchange authorization code for tokens. Copy the **refresh token**.
7. In the GitHub repo → Settings → Secrets and variables → Actions → New repository secret, add: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.

## 3. Instagram and Facebook

1. Create an Instagram account for the channel and switch it to a **Professional** account (Creator).
2. Create a Facebook **Page** for the channel and link the Instagram account to it (Page settings → Linked accounts) [unverified].
3. Go to developers.facebook.com → My Apps → Create app → type Business [unverified]. Note the **App ID** and **App secret** (App settings → Basic).
4. If Meta asks for business verification or app review before you can post to your own Page, stop and tell Claude.
5. Open Tools → Graph API Explorer. Select your app, choose "Get User Access Token" and tick: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`. Generate and approve.
6. Open Tools → Access Token Debugger, paste that token there, press "Extend Access Token" to get a long-lived token.
7. Back in Graph API Explorer, paste the long-lived token into the token field and run `me/accounts`. Copy your Page's `id` and its `access_token` (this is the page token).
8. Run `<page id>?fields=instagram_business_account` and copy the Instagram `id`.
9. Add GitHub secrets: `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_TOKEN`, `IG_USER_ID`, `FB_PAGE_ID`.

## 4. First cloud test (Claude does this with you)

1. Actions → Post → Run workflow with dry run **on**. Check the video in the run's Artifacts.
2. Actions → Weekly batch → Run workflow with dry run **off**. This plans the first 7 days.
3. Actions → Post → Run workflow with dry run **off**. This is the live test: it uploads to YouTube as private and opens a review issue.

## 5. Go live (Phase 6)

1. Settings → Secrets and variables → Actions → Variables → New variable `SCHEDULE_ENABLED` = `true`.
2. Approve the first 5 posts per platform from the review issues.

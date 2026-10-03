# Yaz Unlock serial portal

This Vercel project provides immediate serial registration, desktop serial checks, and an admin dashboard. Serial records are stored as JSON in this repository; registration does not require approval.

## Configure and deploy

1. Keep `YazUnlockPortal/data/serials.json` initialized as `{"serials":[]}`.
2. Create a fine-grained GitHub token with repository **Contents: Read and write** permission for `yazan10/huu`. Store it only as the Vercel `GITHUB_TOKEN` environment variable.
3. Set `GITHUB_OWNER` to `yazan10`, `GITHUB_REPO` to `huu`, and `GITHUB_DATA_FILE` to `YazUnlockPortal/data/serials.json`.
4. Set `ADMIN_PASSWORD` to a new, private password of at least 12 characters and `SESSION_SECRET` to a random value of at least 32 bytes. Do not reuse a password or token posted in chat or commit either value.
5. Deploy the project with `YazUnlockPortal` as its Root Directory. Serial-file changes are excluded from triggering a new Vercel deployment.
6. The user's published Blogger serial-registration page is https://yaz-blog.blogspot.com/p/serial-huawei.html. The matching embed/source file in this project is `public/blogger-registration.html`; replace `YOUR-VERCEL-PROJECT` with the deployed Vercel hostname before using this source on Blogger.
7. Set `LicenseCheckUrl` in `HuaweiUnlock.exe.config` to `https://<your-vercel-host>/api/serials/check` and distribute the updated desktop build.

The admin dashboard is available at `https://<your-vercel-host>/admin.html` after deployment. It uses an HTTP-only, secure, same-site session cookie. The check endpoint accepts a serial and returns only whether it is registered; the registration endpoint adds the serial immediately.

The Blogger form and desktop application must know the public API address to contact it. The address is not a secret and cannot be reliably hidden in browser markup or a desktop executable. Admin credentials and the GitHub token remain server-side in Vercel environment variables. **This repository is public, so every registered serial in the JSON file is publicly visible.** A single JSON file is limited by GitHub's Contents API file-size limit.

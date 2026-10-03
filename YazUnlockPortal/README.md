# Yaz Unlock serial portal

This Vercel project provides immediate serial registration, desktop serial checks, and an admin dashboard. Serial records are stored in Neon Postgres; registration does not require approval.

## Configure and deploy

1. Create a Vercel project with `YazUnlockPortal` as its Root Directory.
2. Connect a Neon Postgres database and set `DATABASE_URL` (or `POSTGRES_URL`) in the Vercel project environment variables.
3. Set `ADMIN_PASSWORD` to a new, private password of at least 12 characters and `SESSION_SECRET` to a random value of at least 32 bytes. Do not reuse a password or token posted in chat or commit either value.
4. Deploy the project. The database table is created on the first serial API request.
5. The user's published Blogger serial-registration page is https://yaz-blog.blogspot.com/p/serial-huawei.html. The matching embed/source file in this project is `public/blogger-registration.html`; replace `YOUR-VERCEL-PROJECT` with the deployed Vercel hostname before using this source on Blogger.
6. Set `LicenseCheckUrl` in `HuaweiUnlock.exe.config` to `https://<your-vercel-host>/api/serials/check` and distribute the updated desktop build.

The admin dashboard is available at `https://<your-vercel-host>/admin.html` after deployment. It uses an HTTP-only, secure, same-site session cookie. The check endpoint accepts a serial and returns only whether it is registered; the registration endpoint adds the serial immediately.

The Blogger form and desktop application must know the public API address to contact it. The address is not a secret and cannot be reliably hidden in browser markup or a desktop executable. Admin/database credentials remain server-side in Vercel environment variables.

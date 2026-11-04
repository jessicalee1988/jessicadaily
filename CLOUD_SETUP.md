# Jessica Daily — Cloud Backup Preview

This is an optional cloud-backup upgrade. The existing offline/localStorage functionality remains usable without Supabase.

## Set up in Supabase
1. Create a **private** Supabase project under your own account.
2. In SQL Editor, run `supabase/schema.sql` to create the per-user table and Row Level Security policies.
3. Under Authentication, enable email/password login (verify emails if required).
4. Copy **Project URL** and **anon/publishable key**. Never use a service_role key in browser code.

## Set up in Vercel
Project > Settings > Environment Variables:
- `SUPABASE_URL`: Supabase Project URL
- `SUPABASE_ANON_KEY`: Supabase anon/publishable key
- `GEMINI_API_KEY` (optional): existing Zalo image/text AI extraction

Redeploy after setting variables.

## First use
1. On the existing device, go to **Tìm kiếm & Thu nhập > Xuất JSON** and keep a copy.
2. Log in to the Cloud panel using your own email/password (or create an account).
3. Click **Sao lưu lên đám mây** to upload current orders.
4. On another device, log into the same account and click **Tải từ đám mây**. Be careful: this replaces local data on that device.
5. To combine records with different IDs, choose **Nhập thêm từ đám mây**; duplicate IDs retain the local record.

### Important limitations
- Cloud backup is **manual**, not real-time sync. Changes on one device will not appear automatically on another.
- If the account already contains different records, the application asks before overwriting.
- Only a verified email/password Supabase account can access its own row (RLS).
- The user must configure the Supabase project and Vercel environment variables before cloud features work.
- GitHub public code should never contain personal customer/order import JSON. This branch removes the import file from the current source tree; **historical commits may still expose it**. Make the repository private or remove the sensitive data from Git history and rotate any leaked secrets.
- The existing **MY JOB import** button still supports selecting the downloaded JSON locally.

## Deployment safety
Changes are in `feature/jessica-cloud-sync`. Merge only after verifying login, backup, restore, existing orders, and Zalo extraction in a preview deployment. Keep `main` live until then.

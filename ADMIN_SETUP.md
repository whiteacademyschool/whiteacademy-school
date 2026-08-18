# White Academy Admin Panel

The admin panel is available at `/admin.html`. The public website keeps its existing HTML, CSS, layout and visual design. The CMS applies saved text, image, link and SEO overrides at runtime.

## One-time setup

1. Create a Supabase project.
2. Open **SQL Editor** and run the complete `supabase/cms.sql` file.
3. In **Authentication → Users**, create the single school administrator with an email and password.
4. In SQL Editor, authorize that user:

```sql
insert into public.cms_admins (user_id)
select id from auth.users
where email = 'ADMIN_EMAIL_HERE';
```

5. Copy the **Project URL** and **Publishable key** from the project's **Connect** dialog or **Settings → API Keys**.
6. In Vercel, open the White Academy project → **Settings → Environment Variables** and add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

7. Apply the variables to Production, Preview and Development, then redeploy.
8. Open `https://whiteacademy-school.vercel.app/admin.html` and sign in.

## What the administrator can manage

- Text across all 23 public pages
- Website photos and icons
- Link destinations
- Browser titles and meta descriptions
- Individual field restoration
- Full-page restoration
- Live updates without a Vercel redeployment

## Security

- The Supabase publishable key is designed for public browser applications. Never use the secret or service-role key here.
- Row Level Security permits public reads only.
- Only the user listed in `cms_admins` can create, update or delete content and upload files.
- The admin page is marked `noindex` and requires Supabase authentication.

# Base44 Transfer Bundle

Copy these files into the matching Base44 code editor paths. This bundle keeps the app-style organization from the prototype, but uses the more polished information density and counselor workflows from the website.

## Copy Order

1. Paste the JSON files in `entities/` into the matching Base44 entity files.
2. Paste `src/Layout.jsx`.
3. Paste `src/styles/toss-future-theme.css`.
4. Paste every file in `src/components/admission/`.
5. Paste the page files in `src/pages/`.

## Student Navigation

- `/` - Home dashboard
- `/universities` - Target universities
- `/grades` - Grade book and trend
- `/checklist` - Roadmap checklist
- `/counseling` - Counseling booking

## Counselor Navigation

- `/counselor-students` - Grouped student roster with filters
- `/counselor-requests` - Counseling requests, confirmation, and email composer

If Base44 does not automatically create routes for new page files, add route entries for `CounselorStudents` and `CounselorRequests` using the two paths above.

## Notes

- The pages use `base44` from `@/api/base44Client`, which is the generated Base44 client used by the prototype.
- If an entity does not exist yet, create it from the matching JSON schema before opening the page.
- The email confirmation flow opens the user's mail app with a prepared `mailto:` draft. For automatic email sending, connect a backend function or email integration later.
- The visual system is Toss-inspired, not a Toss copy: deep navy `#001A57`, cyan `#0EA5E9`, orange `#F97316`, soft gray `#E5E7EB`, and dark ink `#0B1324`.

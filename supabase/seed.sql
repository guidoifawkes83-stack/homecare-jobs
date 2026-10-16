insert into sources (id, name, method, enabled)
values
  ('remotive', 'Remotive', 'api', true),
  ('remoteok', 'Remote OK', 'api', true),
  ('weworkremotely', 'We Work Remotely', 'rss', true),
  ('himalayas', 'Himalayas', 'api', true),
  ('workingnomads', 'Working Nomads', 'api', true),
  ('onlinejobs', 'OnlineJobs.ph', 'html', true),
  ('jobstreet', 'JobStreet PH', 'html', true),
  ('workable', 'Workable', 'html', true)
on conflict (id) do nothing;

insert into jobs (
  id, dedupe_key, title, company, pay_text, poster_type, software,
  region_note, score, status, posted_at
)
values
  ('00000000-0000-4000-8000-000000000001', 'cedar grove home support|home care scheduler', 'Home Care Scheduler', 'Cedar Grove Home Support', '$6–8 / hr', 'direct', array['WellSky'], 'Philippines', 92, 'new', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000002', 'harborlight care|care coordination assistant', 'Care Coordination Assistant', 'Harborlight Care', '$1,100 / mo', 'direct', array['AxisCare'], 'Remote', 86, 'new', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000003', 'pearl talent|scheduling coordinator', 'Scheduling Coordinator', 'Pearl Talent', '$5–7 / hr', 'agency', array[]::text[], 'Philippines', 74, 'new', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000004', 'brightpath living|home health intake coordinator', 'Home Health Intake Coordinator', 'BrightPath Living', '$1,250 / mo', 'direct', array['ClearCare'], 'Remote', 81, 'new', now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000005', 'superstaff|caregiver staffing coordinator', 'Caregiver Staffing Coordinator', 'SuperStaff', '$4–5 / hr', 'agency', array[]::text[], 'Philippines', 52, 'new', now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000006', 'kindred home services|remote care scheduler', 'Remote Care Scheduler', 'Kindred Home Services', '$7 / hr', 'direct', array['ShiftCare'], 'Philippines eligible', 89, 'new', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000007', 'helper heroes|workforce scheduling assistant', 'Workforce Scheduling Assistant', 'Helper Heroes', '$900–1,100 / mo', 'agency', array['Connecteam'], 'Philippines', 69, 'new', now() - interval '6 days'),
  ('00000000-0000-4000-8000-000000000008', 'maple main care|home care operations coordinator', 'Home Care Operations Coordinator', 'Maple & Main Care', '$6.50 / hr', 'direct', array['EVV'], 'Remote', 84, 'new', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000009', 'winning assistants|intake and placement specialist', 'Intake and Placement Specialist', 'Winning Assistants', '$5 / hr', 'agency', array[]::text[], 'Philippines', 64, 'new', now() - interval '7 days'),
  ('00000000-0000-4000-8000-000000000010', 'silver fern at home|care services scheduling assistant', 'Care Services Scheduling Assistant', 'Silver Fern at Home', '$1,300 / mo', 'direct', array['AlayaCare'], 'Remote', 87, 'new', now() - interval '3 days')
on conflict (dedupe_key) do nothing;

insert into job_sources (job_id, source_id, url)
values
  ('00000000-0000-4000-8000-000000000001', 'onlinejobs', 'https://example.com/demo/listing-001'),
  ('00000000-0000-4000-8000-000000000002', 'remotive', 'https://example.com/demo/listing-002'),
  ('00000000-0000-4000-8000-000000000003', 'workable', 'https://example.com/demo/listing-003'),
  ('00000000-0000-4000-8000-000000000004', 'weworkremotely', 'https://example.com/demo/listing-004'),
  ('00000000-0000-4000-8000-000000000005', 'jobstreet', 'https://example.com/demo/listing-005'),
  ('00000000-0000-4000-8000-000000000006', 'himalayas', 'https://example.com/demo/listing-006'),
  ('00000000-0000-4000-8000-000000000007', 'workable', 'https://example.com/demo/listing-007'),
  ('00000000-0000-4000-8000-000000000008', 'remoteok', 'https://example.com/demo/listing-008'),
  ('00000000-0000-4000-8000-000000000009', 'onlinejobs', 'https://example.com/demo/listing-009'),
  ('00000000-0000-4000-8000-000000000010', 'workingnomads', 'https://example.com/demo/listing-010')
on conflict (job_id, source_id) do nothing;

-- Seed the three pilot trainings and placeholder sessions.
-- Idempotent: re-run updates catalog rows in place by slug / session_number.

insert into public.trainings (slug, title, description, session_count, order_index)
values
  (
    'fundamentals',
    'Fathering Fundamentals',
    'Connect with your child with meaning and impact.',
    8,
    1
  ),
  (
    'anger',
    'Steady Under Pressure',
    'Steadiness when the moments get loud.',
    12,
    2
  ),
  (
    'reentry',
    'Coming Home Present',
    'Improving your most important relationships.',
    12,
    3
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  session_count = excluded.session_count,
  order_index = excluded.order_index;

with catalog (
  training_slug,
  session_number,
  title,
  keyline
) as (
  values
    -- Fathering Fundamentals (8)
    ('fundamentals', 1, 'Introduction', 'Welcome, overview, and take the assessment.'),
    ('fundamentals', 2, 'First Secret: Commitment', 'Present physically, emotionally, spiritually; commitment builds trust.'),
    ('fundamentals', 3, 'Second Secret: Knowing Your Child', 'Unique personality, needs, and interests open deeper connection.'),
    ('fundamentals', 4, 'Third Secret: Showing Up Consistently', 'Stability through consistent actions, values, and discipline.'),
    ('fundamentals', 5, 'Fourth Secret: Protecting and Providing Security', 'Physical, emotional, and spiritual safety and provision.'),
    ('fundamentals', 6, 'Fifth Secret: Loving Their Mother', 'Honor their mother. Civil if you are not together. Never undercut her.'),
    ('fundamentals', 7, 'Sixth Secret: Active Listening', 'Two-way. Full attention. Not an interrogation.'),
    ('fundamentals', 8, 'Seventh Secret: Spiritual Equipping', 'Live convictions a child can trust.'),
    -- Steady Under Pressure (12)
    ('anger', 1, 'The Surge Is a Signal', 'The surge is a signal, not an order.'),
    ('anger', 2, 'Know Your Early Cues', 'Catch it in the jaw, not the shout.'),
    ('anger', 3, 'Six Seconds', 'Six seconds buy your judgment back.'),
    ('anger', 4, 'The Long Exhale', 'A long exhale stands the body down.'),
    ('anger', 5, 'Step Away to Come Back', 'Step away to come back.'),
    ('anger', 6, 'The Line You Leave On', 'Say the line, then leave the room.'),
    ('anger', 7, 'Name the Feeling', 'Say the feeling so you do not have to show it.'),
    ('anger', 8, 'Feelings Without Weapons', 'Name it without loading it.'),
    ('anger', 9, 'Own It Same Day', 'Own it out loud, same day.'),
    ('anger', 10, 'The Short Apology', 'Short, specific, no defense.'),
    ('anger', 11, 'Sleep, Food, Movement', 'Steadiness is built in the boring hours.'),
    ('anger', 12, 'Your Steady Week', 'Stack the small things until they hold.'),
    -- Coming Home Present (12)
    ('reentry', 1, 'The Body You Bring Home', 'Your body did its job there. Now teach it that home is not there.'),
    ('reentry', 2, 'Home Is Not There', 'Same noise, new meaning. Train the difference.'),
    ('reentry', 3, 'Plan Around the Wave', 'Plan around the wave. Do not grade yourself by it.'),
    ('reentry', 4, 'Few Promises, Kept', 'Few commitments, kept without fail.'),
    ('reentry', 5, 'The Child Who Grew', 'Meet the child in front of you, not the one you left.'),
    ('reentry', 6, 'Ask Before You Assume', 'Ask once. Listen longer than you talk.'),
    ('reentry', 7, 'Small Deposits', 'Small and often beats big and rare.'),
    ('reentry', 8, 'Frequency Beats Intensity', 'Show up short and steady.'),
    ('reentry', 9, 'When It Breaks', 'Rupture is normal. Repair is the skill.'),
    ('reentry', 10, 'Repair Without Pride', 'Go first. Keep it short.'),
    ('reentry', 11, 'Reunion Day', 'If the child pulls away, that is the start, not the answer.'),
    ('reentry', 12, 'The Season of Return', 'The return is a season, not a day.')
)
insert into public.sessions (
  training_id,
  session_number,
  title,
  keyline,
  video_url,
  order_index
)
select
  trainings.id,
  catalog.session_number,
  catalog.title,
  catalog.keyline,
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  catalog.session_number
from catalog
join public.trainings on trainings.slug = catalog.training_slug
on conflict (training_id, session_number) do update
set
  title = excluded.title,
  keyline = excluded.keyline,
  video_url = excluded.video_url,
  order_index = excluded.order_index;

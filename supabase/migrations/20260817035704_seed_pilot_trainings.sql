-- Seed the three pilot trainings and placeholder sessions.
-- Idempotent: re-run updates catalog rows in place by slug / session_number.

insert into public.trainings (slug, title, description, session_count, order_index)
values
  (
    'fundamentals',
    'Fathering Fundamentals – Seven Secrets of Effective Fathers',
    'The Seven Secrets of Effective Fathers. Short sessions you can use the same night.',
    9,
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
  keyline,
  video_url
) as (
  values
    -- Fathering Fundamentals (9)
    ('fundamentals', 1, 'Training Overview', 'Welcome to the Seven Secrets of Effective Fathers.', 'https://www.youtube.com/watch?v=1Tuv_7uYhN0'),
    ('fundamentals', 2, 'First Secret: Commitment', 'Present physically, emotionally, spiritually; commitment builds trust.', 'https://www.youtube.com/watch?v=Vaj10-J4MX0'),
    ('fundamentals', 3, 'Second Secret: Knowing Your Child', 'Unique personality, needs, and interests open deeper connection.', 'https://www.youtube.com/watch?v=-omEMXA9iGU'),
    ('fundamentals', 4, 'Third Secret: Showing Up Consistently', 'Stability through consistent actions, values, and discipline.', 'https://www.youtube.com/watch?v=Yza6Pra56Cs'),
    ('fundamentals', 5, 'Fourth Secret: Protecting and Providing', 'Physical, emotional, and spiritual safety and provision.', 'https://www.youtube.com/watch?v=ZQ_etqp_-DU'),
    ('fundamentals', 6, 'Fifth Secret: Affirming and Encouraging', 'Speak life into your child with words that land.', 'https://www.youtube.com/watch?v=bQnb1f9Jv5g'),
    ('fundamentals', 7, 'Sixth Secret: Disciplining with Love', 'Firm and kind. Correction that keeps the relationship.', 'https://www.youtube.com/watch?v=EdXDZY5y-Uc'),
    ('fundamentals', 8, 'Seventh Secret: Modeling Integrity and Faith', 'Live convictions a child can trust.', 'https://www.youtube.com/watch?v=Y8rnrolyvuU'),
    ('fundamentals', 9, 'Bonus Eighth Secret', 'One more practice to carry the Seven Secrets home.', 'https://www.youtube.com/watch?v=PTdj6-bZ74Q'),
    -- Steady Under Pressure (12)
    ('anger', 1, 'The Surge Is a Signal', 'The surge is a signal, not an order.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 2, 'Know Your Early Cues', 'Catch it in the jaw, not the shout.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 3, 'Six Seconds', 'Six seconds buy your judgment back.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 4, 'The Long Exhale', 'A long exhale stands the body down.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 5, 'Step Away to Come Back', 'Step away to come back.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 6, 'The Line You Leave On', 'Say the line, then leave the room.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 7, 'Name the Feeling', 'Say the feeling so you do not have to show it.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 8, 'Feelings Without Weapons', 'Name it without loading it.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 9, 'Own It Same Day', 'Own it out loud, same day.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 10, 'The Short Apology', 'Short, specific, no defense.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 11, 'Sleep, Food, Movement', 'Steadiness is built in the boring hours.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('anger', 12, 'Your Steady Week', 'Stack the small things until they hold.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    -- Coming Home Present (12)
    ('reentry', 1, 'The Body You Bring Home', 'Your body did its job there. Now teach it that home is not there.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 2, 'Home Is Not There', 'Same noise, new meaning. Train the difference.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 3, 'Plan Around the Wave', 'Plan around the wave. Do not grade yourself by it.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 4, 'Few Promises, Kept', 'Few commitments, kept without fail.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 5, 'The Child Who Grew', 'Meet the child in front of you, not the one you left.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 6, 'Ask Before You Assume', 'Ask once. Listen longer than you talk.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 7, 'Small Deposits', 'Small and often beats big and rare.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 8, 'Frequency Beats Intensity', 'Show up short and steady.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 9, 'When It Breaks', 'Rupture is normal. Repair is the skill.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 10, 'Repair Without Pride', 'Go first. Keep it short.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 11, 'Reunion Day', 'If the child pulls away, that is the start, not the answer.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
    ('reentry', 12, 'The Season of Return', 'The return is a season, not a day.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ')
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
  catalog.video_url,
  catalog.session_number
from catalog
join public.trainings on trainings.slug = catalog.training_slug
on conflict (training_id, session_number) do update
set
  title = excluded.title,
  keyline = excluded.keyline,
  video_url = excluded.video_url,
  order_index = excluded.order_index;

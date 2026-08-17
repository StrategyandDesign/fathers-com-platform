-- Update Fathering Fundamentals to the real Seven Secrets catalog (9 videos).
-- Sessions 1–8 keep their ids so existing session_progress stays attached.
-- Session 9 is inserted as a new row.

update public.trainings
set
  title = 'Fathering Fundamentals – Seven Secrets of Effective Fathers',
  description = 'The Seven Secrets of Effective Fathers. Short sessions you can use the same night.',
  session_count = 9
where slug = 'fundamentals';

with catalog (
  session_number,
  title,
  keyline,
  video_url
) as (
  values
    (
      1,
      'Training Overview',
      'Welcome to the Seven Secrets of Effective Fathers.',
      'https://www.youtube.com/watch?v=1Tuv_7uYhN0'
    ),
    (
      2,
      'First Secret: Commitment',
      'Present physically, emotionally, spiritually; commitment builds trust.',
      'https://www.youtube.com/watch?v=Vaj10-J4MX0'
    ),
    (
      3,
      'Second Secret: Knowing Your Child',
      'Unique personality, needs, and interests open deeper connection.',
      'https://www.youtube.com/watch?v=-omEMXA9iGU'
    ),
    (
      4,
      'Third Secret: Showing Up Consistently',
      'Stability through consistent actions, values, and discipline.',
      'https://www.youtube.com/watch?v=Yza6Pra56Cs'
    ),
    (
      5,
      'Fourth Secret: Protecting and Providing',
      'Physical, emotional, and spiritual safety and provision.',
      'https://www.youtube.com/watch?v=ZQ_etqp_-DU'
    ),
    (
      6,
      'Fifth Secret: Affirming and Encouraging',
      'Speak life into your child with words that land.',
      'https://www.youtube.com/watch?v=bQnb1f9Jv5g'
    ),
    (
      7,
      'Sixth Secret: Disciplining with Love',
      'Firm and kind. Correction that keeps the relationship.',
      'https://www.youtube.com/watch?v=EdXDZY5y-Uc'
    ),
    (
      8,
      'Seventh Secret: Modeling Integrity and Faith',
      'Live convictions a child can trust.',
      'https://www.youtube.com/watch?v=Y8rnrolyvuU'
    ),
    (
      9,
      'Bonus Eighth Secret',
      'One more practice to carry the Seven Secrets home.',
      'https://www.youtube.com/watch?v=PTdj6-bZ74Q'
    )
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
join public.trainings on trainings.slug = 'fundamentals'
on conflict (training_id, session_number) do update
set
  title = excluded.title,
  keyline = excluded.keyline,
  video_url = excluded.video_url,
  order_index = excluded.order_index;

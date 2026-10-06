import type { TemplateFile } from '../vault-templates'

/**
 * Personal CRM template. Five years of example catch ups, read by
 * dashboard.md. Replace the rows with your own.
 */

export const PERSONAL_CRM_FILES: TemplateFile[] = [
  {
    path: 'people/README.md',
    content: `# Personal CRM

Open the [people dashboard](dashboard.md) to see how much time goes into the people who matter and who is due a catch up.

Keep people notes, conversations and follow-ups here. List each person once in [People](people.md), log meaningful conversations in [Catch ups](catch-ups.md) and track promises in [Follow-ups](follow-ups.md). The rows that ship with this template are five years of example data, so replace them with your own.
`,
  },
  {
    path: 'people/people.md',
    content: `---
type: Dataset
title: People
description: The people you keep in touch with and how often you would like to see or speak to them.
tags: [people]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    name: { type: text, required: true }
    circle: { type: enum, values: [family, friends, work, community] }
    contact_every: { type: number }
    last_contact: { type: date }
---

# People

contact_every is how many days you would like between catch ups. Update last_contact when you log a catch up.

| id | name | circle | contact_every | last_contact |
| --- | --- | --- | --- | --- |
| mum | Mum | family | 30 | 2026-09-14 |
| dad | Dad | family | 60 | 2026-08-22 |
| sister-amy | Amy (sister) | family | 60 | 2026-08-26 |
| grandma | Grandma | family | 21 | 2026-09-27 |
| josh | Josh | friends | 90 | 2026-07-22 |
| priya | Priya | friends | 21 | 2026-09-19 |
| dan | Dan | friends | 180 | 2026-04-22 |
| ellie | Ellie | friends | 30 | 2026-04-03 |
| marcus | Marcus | friends | 60 | 2026-09-11 |
| uni-group | Uni group | friends | 90 | 2026-04-08 |
| running-club | Running club | community | 120 | 2026-07-05 |
| sam-run | Sam (running club) | friends | 42 | 2026-08-31 |
| neighbours | Neighbours | community | 90 | 2026-07-15 |
| mentor-jo | Jo (mentor) | work | 210 | 2026-03-29 |
| alex-work | Alex (old team) | work | 60 | 2026-09-23 |
| nina-work | Nina (Meridian) | work | 42 | 2026-09-04 |
| godson-leo | Leo (godson) | family | 120 | 2026-06-12 |
| book-club | Book club | community | 90 | 2026-07-29 |
`,
  },
  {
    path: 'people/catch-ups.md',
    content: `---
type: Dataset
title: Catch ups
description: "Every proper catch up: who it was with, what you did and for how long."
tags: [people, catch-ups]
dataset:
  columns:
    date: { type: date, required: true }
    person: { type: ref, to: people.md, required: true }
    type: { type: enum, values: [call, video, message, visit, dinner, pub, activity, event, coffee, lunch], required: true }
    minutes: { type: number }
    notes: { type: text }
---

# Catch ups

Log the conversations that mattered, not every message.

| date | person | type | minutes | notes |
| --- | --- | --- | --- | --- |
| 2021-10-01 | dan | pub | 155 |  |
| 2021-10-16 | mum | call | 41 |  |
| 2021-10-29 | uni-group | call | 30 |  |
| 2021-11-13 | dad | call | 43 |  |
| 2021-11-29 | marcus | message | 10 |  |
| 2021-12-12 | mum | video | 52 |  |
| 2021-12-26 | dad | video | 51 |  |
| 2022-01-01 | sister-amy | call | 31 |  |
| 2022-01-15 | ellie | activity | 132 |  |
| 2022-01-21 | dad | visit | 173 |  |
| 2022-02-05 | josh | dinner | 166 |  |
| 2022-02-17 | sister-amy | call | 36 |  |
| 2022-02-28 | running-club | activity | 139 |  |
| 2022-03-05 | sister-amy | video | 43 |  |
| 2022-03-13 | josh | pub | 156 |  |
| 2022-03-27 | josh | pub | 159 |  |
| 2022-04-07 | sister-amy | call | 32 |  |
| 2022-04-16 | mum | call | 46 |  |
| 2022-04-29 | dan | pub | 146 |  |
| 2022-05-11 | mum | visit | 187 |  |
| 2022-05-24 | priya | call | 31 |  |
| 2022-06-01 | sister-amy | call | 41 |  |
| 2022-06-15 | mum | dinner | 159 |  |
| 2022-06-26 | sister-amy | dinner | 147 |  |
| 2022-07-08 | mum | video | 51 |  |
| 2022-07-20 | grandma | dinner | 165 |  |
| 2022-07-25 | grandma | visit | 192 |  |
| 2022-08-05 | sam-run | dinner | 163 |  |
| 2022-08-15 | grandma | call | 20 |  |
| 2022-08-19 | mum | video | 55 |  |
| 2022-08-26 | dad | dinner | 150 |  |
| 2022-09-07 | dad | dinner | 169 |  |
| 2022-09-18 | priya | call | 39 |  |
| 2022-09-26 | josh | dinner | 163 |  |
| 2022-10-03 | sister-amy | dinner | 150 |  |
| 2022-10-10 | dad | video | 42 |  |
| 2022-10-20 | dad | dinner | 155 |  |
| 2022-10-30 | dad | visit | 187 |  |
| 2022-11-03 | josh | pub | 145 |  |
| 2022-11-07 | running-club | event | 101 |  |
| 2022-11-17 | sister-amy | dinner | 167 |  |
| 2022-11-25 | neighbours | event | 110 |  |
| 2022-12-01 | mum | video | 45 |  |
| 2022-12-05 | dad | visit | 181 |  |
| 2022-12-16 | ellie | dinner | 159 |  |
| 2022-12-22 | mum | call | 42 |  |
| 2022-12-27 | dan | activity | 133 |  |
| 2023-01-07 | dan | message | 10 |  |
| 2023-01-12 | running-club | event | 85 |  |
| 2023-01-20 | neighbours | activity | 124 |  |
| 2023-01-27 | mum | call | 46 |  |
| 2023-02-07 | mentor-jo | lunch | 65 |  |
| 2023-02-16 | josh | call | 35 |  |
| 2023-02-25 | mum | visit | 181 |  |
| 2023-03-03 | alex-work | coffee | 51 |  |
| 2023-03-13 | sister-amy | dinner | 153 |  |
| 2023-03-20 | grandma | call | 27 |  |
| 2023-03-29 | ellie | message | 10 |  |
| 2023-04-07 | running-club | event | 91 |  |
| 2023-04-11 | book-club | activity | 134 |  |
| 2023-04-20 | dad | dinner | 150 |  |
| 2023-04-30 | dad | call | 32 |  |
| 2023-05-07 | josh | activity | 130 |  |
| 2023-05-11 | mum | video | 30 |  |
| 2023-05-16 | uni-group | dinner | 149 |  |
| 2023-05-24 | josh | activity | 135 |  |
| 2023-05-29 | dad | video | 52 |  |
| 2023-06-07 | josh | dinner | 164 |  |
| 2023-06-12 | dad | video | 30 |  |
| 2023-06-21 | dan | dinner | 164 |  |
| 2023-06-26 | grandma | dinner | 140 |  |
| 2023-07-02 | book-club | activity | 137 |  |
| 2023-07-10 | running-club | activity | 127 |  |
| 2023-07-18 | grandma | call | 24 |  |
| 2023-07-22 | ellie | activity | 112 |  |
| 2023-07-26 | mum | call | 23 |  |
| 2023-08-02 | priya | call | 39 |  |
| 2023-08-05 | priya | activity | 117 |  |
| 2023-08-13 | uni-group | call | 22 |  |
| 2023-08-19 | running-club | event | 85 |  |
| 2023-08-28 | josh | pub | 162 |  |
| 2023-09-06 | mum | call | 44 |  |
| 2023-09-14 | book-club | event | 100 |  |
| 2023-09-22 | dad | call | 26 |  |
| 2023-09-30 | marcus | message | 10 |  |
| 2023-10-08 | dad | video | 30 |  |
| 2023-10-13 | sam-run | call | 44 |  |
| 2023-10-19 | dan | pub | 151 |  |
| 2023-10-24 | mum | call | 31 |  |
| 2023-11-02 | godson-leo | dinner | 161 |  |
| 2023-11-10 | mum | call | 20 |  |
| 2023-11-13 | mum | call | 34 |  |
| 2023-11-21 | mum | video | 49 |  |
| 2023-11-26 | mum | dinner | 157 |  |
| 2023-11-30 | book-club | event | 99 |  |
| 2023-12-06 | priya | activity | 139 |  |
| 2023-12-11 | mum | call | 26 |  |
| 2023-12-18 | mum | call | 38 |  |
| 2023-12-22 | godson-leo | call | 36 |  |
| 2023-12-26 | dad | dinner | 155 |  |
| 2024-01-01 | mentor-jo | video | 47 |  |
| 2024-01-09 | josh | activity | 114 |  |
| 2024-01-16 | josh | pub | 150 |  |
| 2024-01-21 | sister-amy | visit | 181 |  |
| 2024-01-27 | uni-group | dinner | 140 |  |
| 2024-02-03 | dad | dinner | 159 |  |
| 2024-02-09 | dad | call | 26 |  |
| 2024-02-14 | mum | call | 36 |  |
| 2024-02-22 | mum | video | 54 |  |
| 2024-03-01 | godson-leo | visit | 196 |  |
| 2024-03-08 | grandma | visit | 190 |  |
| 2024-03-15 | book-club | event | 84 |  |
| 2024-03-18 | dan | message | 10 |  |
| 2024-03-25 | dad | video | 46 |  |
| 2024-03-28 | uni-group | pub | 142 |  |
| 2024-04-05 | marcus | pub | 146 |  |
| 2024-04-10 | dad | call | 25 |  |
| 2024-04-18 | dad | call | 47 |  |
| 2024-04-23 | godson-leo | video | 33 |  |
| 2024-04-30 | mum | call | 38 |  |
| 2024-05-05 | dad | visit | 190 |  |
| 2024-05-09 | mum | call | 21 |  |
| 2024-05-17 | mum | dinner | 150 |  |
| 2024-05-20 | sister-amy | call | 32 |  |
| 2024-05-28 | sister-amy | visit | 174 |  |
| 2024-06-04 | dad | dinner | 163 |  |
| 2024-06-09 | mum | video | 58 |  |
| 2024-06-16 | mum | dinner | 151 |  |
| 2024-06-19 | book-club | event | 101 |  |
| 2024-06-25 | sister-amy | dinner | 143 |  |
| 2024-06-30 | dad | video | 57 |  |
| 2024-07-04 | sister-amy | video | 54 |  |
| 2024-07-08 | priya | call | 34 |  |
| 2024-07-14 | mentor-jo | coffee | 51 |  |
| 2024-07-21 | marcus | message | 10 |  |
| 2024-07-29 | priya | activity | 127 |  |
| 2024-08-03 | dad | call | 30 |  |
| 2024-08-06 | dad | visit | 176 |  |
| 2024-08-09 | mum | visit | 192 |  |
| 2024-08-17 | grandma | call | 39 |  |
| 2024-08-20 | neighbours | event | 98 |  |
| 2024-08-24 | dad | call | 35 |  |
| 2024-08-29 | priya | call | 23 |  |
| 2024-09-04 | mum | dinner | 141 |  |
| 2024-09-10 | ellie | message | 10 |  |
| 2024-09-15 | dad | call | 35 |  |
| 2024-09-21 | priya | message | 10 |  |
| 2024-09-25 | sister-amy | visit | 179 |  |
| 2024-10-02 | running-club | event | 104 |  |
| 2024-10-07 | alex-work | coffee | 65 |  |
| 2024-10-11 | ellie | call | 46 |  |
| 2024-10-17 | priya | pub | 161 |  |
| 2024-10-20 | josh | message | 10 |  |
| 2024-10-23 | uni-group | call | 20 |  |
| 2024-10-26 | running-club | event | 92 |  |
| 2024-10-31 | running-club | activity | 112 |  |
| 2024-11-06 | sister-amy | dinner | 154 |  |
| 2024-11-12 | alex-work | coffee | 59 |  |
| 2024-11-15 | mum | video | 47 |  |
| 2024-11-22 | dad | visit | 190 |  |
| 2024-11-28 | running-club | event | 83 |  |
| 2024-12-02 | book-club | activity | 113 |  |
| 2024-12-05 | sister-amy | call | 22 |  |
| 2024-12-11 | running-club | event | 84 |  |
| 2024-12-14 | mum | call | 39 |  |
| 2024-12-18 | josh | activity | 129 |  |
| 2024-12-23 | josh | message | 10 |  |
| 2024-12-28 | sam-run | message | 10 |  |
| 2024-12-31 | marcus | dinner | 152 |  |
| 2025-01-04 | grandma | video | 54 |  |
| 2025-01-10 | dan | message | 10 |  |
| 2025-01-17 | dan | dinner | 163 |  |
| 2025-01-20 | dad | video | 53 |  |
| 2025-01-23 | ellie | call | 31 |  |
| 2025-01-29 | ellie | activity | 122 |  |
| 2025-02-02 | priya | message | 10 |  |
| 2025-02-06 | alex-work | lunch | 70 |  |
| 2025-02-11 | sister-amy | video | 51 |  |
| 2025-02-16 | mum | video | 35 |  |
| 2025-02-20 | josh | activity | 135 |  |
| 2025-02-24 | josh | activity | 110 |  |
| 2025-03-02 | mum | call | 35 |  |
| 2025-03-06 | mum | call | 46 |  |
| 2025-03-12 | neighbours | activity | 121 |  |
| 2025-03-19 | dad | call | 35 |  |
| 2025-03-24 | josh | message | 10 |  |
| 2025-03-27 | grandma | call | 39 |  |
| 2025-04-02 | sister-amy | video | 46 |  |
| 2025-04-09 | mentor-jo | lunch | 76 |  |
| 2025-04-15 | grandma | call | 39 |  |
| 2025-04-19 | sister-amy | dinner | 167 |  |
| 2025-04-25 | mum | video | 55 |  |
| 2025-04-28 | sam-run | pub | 155 |  |
| 2025-05-03 | dan | activity | 120 |  |
| 2025-05-10 | priya | dinner | 151 |  |
| 2025-05-17 | mum | call | 49 |  |
| 2025-05-20 | book-club | event | 87 |  |
| 2025-05-24 | grandma | visit | 192 |  |
| 2025-05-30 | marcus | call | 46 |  |
| 2025-06-02 | mentor-jo | video | 31 |  |
| 2025-06-07 | dad | video | 59 |  |
| 2025-06-13 | running-club | activity | 140 |  |
| 2025-06-15 | godson-leo | call | 43 |  |
| 2025-06-18 | running-club | activity | 135 |  |
| 2025-06-21 | book-club | event | 96 |  |
| 2025-06-26 | priya | call | 48 |  |
| 2025-07-01 | josh | pub | 147 |  |
| 2025-07-05 | dan | call | 24 |  |
| 2025-07-10 | mum | call | 32 |  |
| 2025-07-15 | dad | call | 43 |  |
| 2025-07-19 | ellie | message | 10 |  |
| 2025-07-25 | mum | video | 57 |  |
| 2025-07-30 | dad | call | 41 |  |
| 2025-08-04 | marcus | call | 33 |  |
| 2025-08-08 | josh | pub | 154 |  |
| 2025-08-11 | sister-amy | dinner | 151 |  |
| 2025-08-17 | uni-group | call | 31 |  |
| 2025-08-22 | josh | call | 36 |  |
| 2025-08-26 | sister-amy | call | 39 |  |
| 2025-09-02 | ellie | dinner | 159 |  |
| 2025-09-06 | dad | video | 30 |  |
| 2025-09-09 | dad | visit | 184 |  |
| 2025-09-14 | book-club | activity | 119 |  |
| 2025-09-16 | alex-work | video | 31 |  |
| 2025-09-20 | mum | visit | 174 |  |
| 2025-09-26 | dan | pub | 169 |  |
| 2025-10-01 | neighbours | event | 88 |  |
| 2025-10-06 | mum | video | 49 |  |
| 2025-10-10 | mum | video | 59 |  |
| 2025-10-12 | sister-amy | call | 26 |  |
| 2025-10-14 | book-club | event | 99 |  |
| 2025-10-18 | sister-amy | call | 49 |  |
| 2025-10-24 | sam-run | activity | 135 |  |
| 2025-10-29 | mentor-jo | coffee | 40 |  |
| 2025-11-03 | alex-work | video | 37 |  |
| 2025-11-07 | sister-amy | call | 28 |  |
| 2025-11-10 | grandma | visit | 188 |  |
| 2025-11-16 | dad | call | 38 |  |
| 2025-11-22 | josh | pub | 142 |  |
| 2025-11-28 | mum | visit | 184 |  |
| 2025-12-02 | priya | dinner | 153 |  |
| 2025-12-08 | ellie | call | 48 |  |
| 2025-12-13 | josh | message | 10 |  |
| 2025-12-17 | mentor-jo | coffee | 62 |  |
| 2025-12-22 | alex-work | lunch | 71 |  |
| 2025-12-26 | mum | video | 44 |  |
| 2025-12-30 | ellie | dinner | 143 |  |
| 2026-01-04 | mum | call | 26 |  |
| 2026-01-08 | godson-leo | call | 45 |  |
| 2026-01-12 | grandma | call | 46 |  |
| 2026-01-14 | josh | call | 48 |  |
| 2026-01-18 | sam-run | message | 10 |  |
| 2026-01-21 | priya | pub | 140 |  |
| 2026-01-25 | marcus | call | 27 |  |
| 2026-01-31 | josh | activity | 140 |  |
| 2026-02-04 | sister-amy | call | 44 |  |
| 2026-02-10 | godson-leo | dinner | 154 |  |
| 2026-02-15 | mum | visit | 188 |  |
| 2026-02-19 | sister-amy | video | 53 |  |
| 2026-02-22 | sister-amy | visit | 194 |  |
| 2026-02-28 | grandma | visit | 178 |  |
| 2026-03-04 | marcus | call | 34 |  |
| 2026-03-10 | dad | video | 43 |  |
| 2026-03-16 | sister-amy | call | 31 |  |
| 2026-03-20 | alex-work | video | 31 |  |
| 2026-03-22 | godson-leo | call | 47 |  |
| 2026-03-24 | priya | pub | 153 |  |
| 2026-03-26 | dad | call | 28 |  |
| 2026-03-29 | mentor-jo | coffee | 42 |  |
| 2026-04-03 | ellie | pub | 162 |  |
| 2026-04-08 | uni-group | activity | 112 |  |
| 2026-04-14 | running-club | activity | 131 |  |
| 2026-04-17 | godson-leo | dinner | 169 |  |
| 2026-04-20 | nina-work | lunch | 58 |  |
| 2026-04-22 | dan | call | 45 |  |
| 2026-04-27 | marcus | message | 10 |  |
| 2026-05-02 | book-club | activity | 130 |  |
| 2026-05-06 | book-club | event | 100 |  |
| 2026-05-12 | sister-amy | call | 26 |  |
| 2026-05-15 | mum | call | 38 |  |
| 2026-05-20 | grandma | call | 42 |  |
| 2026-05-25 | dad | visit | 190 |  |
| 2026-05-29 | sister-amy | call | 26 |  |
| 2026-06-01 | mum | video | 43 |  |
| 2026-06-04 | grandma | call | 20 |  |
| 2026-06-08 | sister-amy | call | 25 |  |
| 2026-06-10 | running-club | event | 90 |  |
| 2026-06-12 | godson-leo | call | 24 |  |
| 2026-06-15 | sam-run | dinner | 147 |  |
| 2026-06-18 | priya | call | 50 |  |
| 2026-06-21 | mum | call | 27 |  |
| 2026-06-25 | book-club | event | 97 |  |
| 2026-06-29 | book-club | event | 84 |  |
| 2026-07-03 | mum | visit | 177 |  |
| 2026-07-05 | running-club | event | 110 |  |
| 2026-07-07 | grandma | visit | 192 |  |
| 2026-07-10 | dad | call | 30 |  |
| 2026-07-15 | neighbours | activity | 114 |  |
| 2026-07-18 | mum | dinner | 170 |  |
| 2026-07-22 | josh | message | 10 |  |
| 2026-07-24 | nina-work | video | 47 |  |
| 2026-07-29 | book-club | event | 107 |  |
| 2026-08-03 | mum | visit | 170 |  |
| 2026-08-07 | alex-work | video | 45 |  |
| 2026-08-11 | sister-amy | dinner | 168 |  |
| 2026-08-15 | priya | dinner | 140 |  |
| 2026-08-19 | mum | call | 22 |  |
| 2026-08-22 | dad | video | 36 |  |
| 2026-08-26 | sister-amy | call | 39 |  |
| 2026-08-31 | sam-run | message | 10 |  |
| 2026-09-04 | nina-work | video | 41 |  |
| 2026-09-06 | mum | dinner | 140 |  |
| 2026-09-11 | marcus | dinner | 162 |  |
| 2026-09-14 | mum | video | 53 |  |
| 2026-09-19 | priya | dinner | 159 |  |
| 2026-09-23 | alex-work | coffee | 41 |  |
| 2026-09-27 | grandma | call | 47 | Long walk and lunch |
`,
  },
  {
    path: 'people/follow-ups.md',
    content: `---
type: Dataset
title: Follow-ups
description: Things you said you would do for or with someone, and when.
tags: [people, follow-up]
dataset:
  columns:
    person: { type: ref, to: people.md, required: true }
    topic: { type: text, required: true }
    due: { type: date }
    status: { type: enum, values: [open, done], required: true }
---

# Follow-ups

| person | topic | due | status |
| --- | --- | --- | --- |
| josh | Send the stag weekend dates | 2026-09-20 | done |
| mentor-jo | Share how the reorg went | 2026-09-28 | done |
| grandma | Print and post the holiday photos | 2026-10-04 | open |
| priya | Book tickets for the gig | 2026-10-09 | open |
| marcus | Arrange a visit to Leeds | 2026-10-18 | open |
| sister-amy | Plan Mum's 65th birthday | 2026-10-25 | open |
| nina-work | Introduce to the data team | 2026-10-12 | open |
| uni-group | Find a date for the reunion | 2026-11-01 | open |
`,
  },
  {
    path: 'people/templates/person.md',
    content: `---
tags: [people]
status: active
---

# Person name

## Context

## Conversations

## Follow-ups

## Notes
`,
  },
  {
    path: 'people/dashboard.md',
    content: `---
type: Dashboard
title: People dashboard
description: How much time goes into the people who matter, who is due a catch up and what you promised.
---

# People dashboard

Reads [People](people.md), [Catch ups](catch-ups.md) and [Follow-ups](follow-ups.md).

\`\`\`caedora-dashboard
data:
  people: people.md
  catchups: catch-ups.md
  followups: follow-ups.md
rows:
  - columns: 4
    items:
      - stat: { label: Catch ups this year, source: catchups, where: year(date) = year(today()), value: count(), format: integer }
      - stat: { label: Hours together this year, source: catchups, where: year(date) = year(today()), value: sum(minutes) / 60, format: integer }
      - stat: { label: Due a catch up, source: people, where: days_until(last_contact) + contact_every < 0, value: count(), format: integer }
      - stat: { label: Open follow-ups, source: followups, where: status = open, value: count(), format: integer }
  - columns: 1
    items:
      - bar:
          title: Catch ups per month
          source: catchups
          x: month(date)
          y: count()
          series: person.circle
          stacked: true
          format: integer
          ranges: [12m, 3y, all]
  - columns: 2
    items:
      - pie: { title: Time by circle this year (hours), source: catchups, where: year(date) = year(today()), label: person.circle, value: sum(minutes) / 60, format: integer }
      - bar: { title: How we spend it this year, source: catchups, where: year(date) = year(today()), x: type, y: count(), horizontal: true, format: integer }
  - columns: 2
    items:
      - line: { title: Hours together per month, source: catchups, x: month(date), y: sum(minutes) / 60, format: number, ranges: [12m, 3y, all] }
      - list:
          title: Due a catch up
          description: Longer than you planned since you last spoke
          source: people
          where: days_until(last_contact) + contact_every < 0
          label: name
          detail: last_contact
          sort: last_contact
  - columns: 1
    items:
      - table:
          title: Open follow-ups
          source: followups
          where: status = open
          columns: [person.name, topic, due]
          sort: due
\`\`\`
`,
  },
  {
    path: 'people/AGENTS.md',
    content: `# Relationship context guidance

Use people notes respectfully, avoid inventing personal details, and surface follow-ups only from documented context.

- people.md, catch-ups.md and follow-ups.md are Datasets. Keep ISO dates (YYYY-MM-DD).
- When logging a catch up, also update last_contact for that person in people.md.
`,
  },
]

import type { TemplateFile } from '../vault-templates'

/**
 * Freelance and side business template. Five years of example invoices,
 * clients and expenses, read by dashboard.md. Replace the rows with your own.
 */

export const SIDE_BUSINESS_FILES: TemplateFile[] = [
  {
    path: 'business/README.md',
    content: `# Freelance and side business

Open the [business dashboard](dashboard.md) for revenue, your hourly rate, money owed and what the business costs to run.

List clients once in [Clients](clients.md), add every invoice to [Invoices](invoices.md) and log costs in [Expenses](expenses.md). The rows that ship with this template are five years of example data for a freelance consultancy run alongside a full time job, so replace them with your own.
`,
  },
  {
    path: 'business/clients.md',
    content: `---
type: Dataset
title: Clients
description: Everyone you work for, their sector and when you started.
tags: [business, clients]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    name: { type: text, required: true }
    sector: { type: enum, values: [retail, agency, health, education, energy, professional-services, fintech, logistics, other] }
    since: { type: date }
---

# Clients

| id | name | sector | since |
| --- | --- | --- | --- |
| fernway | Fernway | retail | 2021-11-01 |
| tidal | Tidal Studio | agency | 2022-03-01 |
| copperleaf | Copperleaf Health | health | 2022-09-01 |
| brightpath | Brightpath | education | 2023-04-01 |
| lumen | Lumen Energy | energy | 2023-11-01 |
| ashgrove | Ashgrove Legal | professional-services | 2024-05-01 |
| pebble | Pebble Pay | fintech | 2025-01-01 |
| orchard | Orchard Foods | retail | 2025-09-01 |
| kite | Kite Logistics | logistics | 2026-03-01 |
`,
  },
  {
    path: 'business/invoices.md',
    content: `---
type: Dataset
title: Invoices
description: Every invoice with the hours billed, amount, status and how long it took to be paid.
tags: [business, invoices]
dataset:
  key: [number]
  columns:
    number: { type: text, required: true }
    client: { type: ref, to: clients.md, required: true }
    issued: { type: date, required: true }
    hours: { type: number }
    amount: { type: currency, currency: GBP, required: true }
    status: { type: enum, values: [draft, sent, overdue, paid], required: true }
    paid: { type: date }
    days_to_pay: { type: number }
---

# Invoices

Invoice at the end of each month. When one is paid, fill in the paid date and how many days it took.

| number | client | issued | hours | amount | status | paid | days_to_pay |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INV-0001 | fernway | 2021-11-30 | 11 | 605.00 | paid | 2022-01-02 | 33 |
| INV-0002 | fernway | 2021-12-31 | 7 | 385.00 | paid | 2022-01-30 | 30 |
| INV-0003 | fernway | 2022-01-31 | 14 | 840.00 | paid | 2022-03-09 | 37 |
| INV-0004 | fernway | 2022-02-28 | 14 | 840.00 | paid | 2022-03-29 | 29 |
| INV-0005 | fernway | 2022-03-31 | 8 | 480.00 | paid | 2022-04-30 | 30 |
| INV-0006 | tidal | 2022-03-31 | 5 | 300.00 | paid | 2022-05-07 | 37 |
| INV-0007 | fernway | 2022-04-30 | 10 | 600.00 | paid | 2022-05-27 | 27 |
| INV-0008 | tidal | 2022-04-30 | 7 | 420.00 | paid | 2022-06-02 | 33 |
| INV-0009 | fernway | 2022-05-31 | 9 | 585.00 | paid | 2022-06-29 | 29 |
| INV-0010 | tidal | 2022-05-31 | 6 | 390.00 | paid | 2022-07-01 | 31 |
| INV-0011 | fernway | 2022-06-30 | 10 | 650.00 | paid | 2022-08-02 | 33 |
| INV-0012 | tidal | 2022-06-30 | 5 | 325.00 | paid | 2022-08-03 | 34 |
| INV-0013 | fernway | 2022-07-31 | 12 | 780.00 | paid | 2022-09-05 | 36 |
| INV-0014 | tidal | 2022-07-31 | 7 | 455.00 | paid | 2022-08-25 | 25 |
| INV-0015 | fernway | 2022-08-31 | 5 | 325.00 | paid | 2022-09-26 | 26 |
| INV-0016 | tidal | 2022-08-31 | 5 | 325.00 | paid | 2022-09-28 | 28 |
| INV-0017 | fernway | 2022-09-30 | 6 | 420.00 | paid | 2022-11-03 | 34 |
| INV-0018 | tidal | 2022-09-30 | 4 | 280.00 | paid | 2022-10-30 | 30 |
| INV-0019 | copperleaf | 2022-09-30 | 6 | 420.00 | paid | 2022-10-25 | 25 |
| INV-0020 | fernway | 2022-10-31 | 7 | 490.00 | paid | 2022-12-03 | 33 |
| INV-0021 | tidal | 2022-10-31 | 4 | 280.00 | paid | 2022-11-26 | 26 |
| INV-0022 | copperleaf | 2022-10-31 | 7 | 490.00 | paid | 2022-11-24 | 24 |
| INV-0023 | fernway | 2022-11-30 | 7 | 490.00 | paid | 2023-01-01 | 32 |
| INV-0024 | tidal | 2022-11-30 | 5 | 350.00 | paid | 2022-12-29 | 29 |
| INV-0025 | copperleaf | 2022-11-30 | 8 | 560.00 | paid | 2022-12-25 | 25 |
| INV-0026 | fernway | 2022-12-31 | 5 | 350.00 | paid | 2023-01-27 | 27 |
| INV-0027 | tidal | 2022-12-31 | 3 | 210.00 | paid | 2023-01-24 | 24 |
| INV-0028 | copperleaf | 2022-12-31 | 5 | 350.00 | paid | 2023-01-24 | 24 |
| INV-0029 | fernway | 2023-01-31 | 7 | 525.00 | paid | 2023-03-03 | 31 |
| INV-0030 | tidal | 2023-01-31 | 6 | 450.00 | paid | 2023-02-27 | 27 |
| INV-0031 | copperleaf | 2023-01-31 | 7 | 525.00 | paid | 2023-02-25 | 25 |
| INV-0032 | fernway | 2023-02-28 | 7 | 525.00 | paid | 2023-03-29 | 29 |
| INV-0033 | tidal | 2023-02-28 | 5 | 375.00 | paid | 2023-03-23 | 23 |
| INV-0034 | copperleaf | 2023-02-28 | 8 | 600.00 | paid | 2023-03-24 | 24 |
| INV-0035 | fernway | 2023-03-31 | 9 | 675.00 | paid | 2023-04-30 | 30 |
| INV-0036 | tidal | 2023-03-31 | 6 | 450.00 | paid | 2023-04-27 | 27 |
| INV-0037 | copperleaf | 2023-03-31 | 8 | 600.00 | paid | 2023-04-26 | 26 |
| INV-0038 | fernway | 2023-04-30 | 5 | 375.00 | paid | 2023-05-29 | 29 |
| INV-0039 | tidal | 2023-04-30 | 4 | 300.00 | paid | 2023-05-24 | 24 |
| INV-0040 | copperleaf | 2023-04-30 | 6 | 450.00 | paid | 2023-05-26 | 26 |
| INV-0041 | brightpath | 2023-04-30 | 5 | 375.00 | paid | 2023-05-25 | 25 |
| INV-0042 | fernway | 2023-05-31 | 8 | 600.00 | paid | 2023-06-28 | 28 |
| INV-0043 | tidal | 2023-05-31 | 4 | 300.00 | paid | 2023-06-26 | 26 |
| INV-0044 | copperleaf | 2023-05-31 | 8 | 600.00 | paid | 2023-06-26 | 26 |
| INV-0045 | brightpath | 2023-05-31 | 5 | 375.00 | paid | 2023-06-21 | 21 |
| INV-0046 | fernway | 2023-06-30 | 7 | 560.00 | paid | 2023-07-25 | 25 |
| INV-0047 | tidal | 2023-06-30 | 5 | 400.00 | paid | 2023-07-25 | 25 |
| INV-0048 | copperleaf | 2023-06-30 | 7 | 560.00 | paid | 2023-07-26 | 26 |
| INV-0049 | brightpath | 2023-06-30 | 5 | 400.00 | paid | 2023-07-22 | 22 |
| INV-0050 | fernway | 2023-07-31 | 7 | 560.00 | paid | 2023-08-30 | 30 |
| INV-0051 | tidal | 2023-07-31 | 5 | 400.00 | paid | 2023-08-20 | 20 |
| INV-0052 | copperleaf | 2023-07-31 | 6 | 480.00 | paid | 2023-08-26 | 26 |
| INV-0053 | brightpath | 2023-07-31 | 4 | 320.00 | paid | 2023-08-21 | 21 |
| INV-0054 | fernway | 2023-08-31 | 4 | 320.00 | paid | 2023-09-24 | 24 |
| INV-0055 | tidal | 2023-08-31 | 4 | 320.00 | paid | 2023-09-25 | 25 |
| INV-0056 | copperleaf | 2023-08-31 | 4 | 320.00 | paid | 2023-09-24 | 24 |
| INV-0057 | brightpath | 2023-08-31 | 3 | 240.00 | paid | 2023-09-24 | 24 |
| INV-0058 | fernway | 2023-09-30 | 8 | 640.00 | paid | 2023-10-29 | 29 |
| INV-0059 | tidal | 2023-09-30 | 6 | 480.00 | paid | 2023-10-24 | 24 |
| INV-0060 | copperleaf | 2023-09-30 | 8 | 640.00 | paid | 2023-10-29 | 29 |
| INV-0061 | brightpath | 2023-09-30 | 4 | 320.00 | paid | 2023-10-21 | 21 |
| INV-0062 | fernway | 2023-10-31 | 8 | 680.00 | paid | 2023-11-26 | 26 |
| INV-0063 | tidal | 2023-10-31 | 6 | 510.00 | paid | 2023-11-25 | 25 |
| INV-0064 | copperleaf | 2023-10-31 | 9 | 765.00 | paid | 2023-11-24 | 24 |
| INV-0065 | brightpath | 2023-10-31 | 6 | 510.00 | paid | 2023-11-29 | 29 |
| INV-0066 | tidal | 2023-11-30 | 5 | 425.00 | paid | 2023-12-27 | 27 |
| INV-0067 | copperleaf | 2023-11-30 | 8 | 680.00 | paid | 2023-12-28 | 28 |
| INV-0068 | brightpath | 2023-11-30 | 4 | 340.00 | paid | 2023-12-28 | 28 |
| INV-0069 | lumen | 2023-11-30 | 11 | 935.00 | paid | 2023-12-29 | 29 |
| INV-0070 | tidal | 2023-12-31 | 4 | 340.00 | paid | 2024-01-21 | 21 |
| INV-0071 | copperleaf | 2023-12-31 | 5 | 425.00 | paid | 2024-01-19 | 19 |
| INV-0072 | brightpath | 2023-12-31 | 3 | 255.00 | paid | 2024-01-28 | 28 |
| INV-0073 | lumen | 2023-12-31 | 5 | 425.00 | paid | 2024-01-21 | 21 |
| INV-0074 | tidal | 2024-01-31 | 4 | 340.00 | paid | 2024-02-19 | 19 |
| INV-0075 | copperleaf | 2024-01-31 | 7 | 595.00 | paid | 2024-02-18 | 18 |
| INV-0076 | brightpath | 2024-01-31 | 6 | 510.00 | paid | 2024-02-27 | 27 |
| INV-0077 | lumen | 2024-01-31 | 10 | 850.00 | paid | 2024-02-25 | 25 |
| INV-0078 | tidal | 2024-02-29 | 6 | 510.00 | paid | 2024-03-23 | 23 |
| INV-0079 | copperleaf | 2024-02-29 | 8 | 680.00 | paid | 2024-03-24 | 24 |
| INV-0080 | brightpath | 2024-02-29 | 5 | 425.00 | paid | 2024-03-20 | 20 |
| INV-0081 | lumen | 2024-02-29 | 10 | 850.00 | paid | 2024-03-24 | 24 |
| INV-0082 | tidal | 2024-03-31 | 6 | 540.00 | paid | 2024-04-19 | 19 |
| INV-0083 | copperleaf | 2024-03-31 | 8 | 720.00 | paid | 2024-04-26 | 26 |
| INV-0084 | brightpath | 2024-03-31 | 6 | 540.00 | paid | 2024-04-24 | 24 |
| INV-0085 | lumen | 2024-03-31 | 9 | 810.00 | paid | 2024-04-21 | 21 |
| INV-0086 | tidal | 2024-04-30 | 5 | 450.00 | paid | 2024-05-17 | 17 |
| INV-0087 | copperleaf | 2024-04-30 | 7 | 630.00 | paid | 2024-05-21 | 21 |
| INV-0088 | brightpath | 2024-04-30 | 6 | 540.00 | paid | 2024-05-23 | 23 |
| INV-0089 | lumen | 2024-04-30 | 10 | 900.00 | paid | 2024-05-24 | 24 |
| INV-0090 | copperleaf | 2024-05-31 | 8 | 720.00 | paid | 2024-06-21 | 21 |
| INV-0091 | brightpath | 2024-05-31 | 5 | 450.00 | paid | 2024-06-21 | 21 |
| INV-0092 | lumen | 2024-05-31 | 10 | 900.00 | paid | 2024-06-24 | 24 |
| INV-0093 | ashgrove | 2024-05-31 | 8 | 720.00 | paid | 2024-06-21 | 21 |
| INV-0094 | copperleaf | 2024-06-30 | 8 | 720.00 | paid | 2024-07-21 | 21 |
| INV-0095 | brightpath | 2024-06-30 | 6 | 540.00 | paid | 2024-07-23 | 23 |
| INV-0096 | lumen | 2024-06-30 | 12 | 1,080.00 | paid | 2024-07-20 | 20 |
| INV-0097 | ashgrove | 2024-06-30 | 9 | 810.00 | paid | 2024-07-26 | 26 |
| INV-0098 | copperleaf | 2024-07-31 | 10 | 900.00 | paid | 2024-08-23 | 23 |
| INV-0099 | brightpath | 2024-07-31 | 4 | 360.00 | paid | 2024-08-24 | 24 |
| INV-0100 | lumen | 2024-07-31 | 12 | 1,080.00 | paid | 2024-08-15 | 15 |
| INV-0101 | ashgrove | 2024-07-31 | 8 | 720.00 | paid | 2024-08-18 | 18 |
| INV-0102 | copperleaf | 2024-08-31 | 5 | 475.00 | paid | 2024-09-21 | 21 |
| INV-0103 | brightpath | 2024-08-31 | 3 | 285.00 | paid | 2024-09-17 | 17 |
| INV-0104 | lumen | 2024-08-31 | 6 | 570.00 | paid | 2024-09-16 | 16 |
| INV-0105 | ashgrove | 2024-08-31 | 6 | 570.00 | paid | 2024-09-25 | 25 |
| INV-0106 | copperleaf | 2024-09-30 | 7 | 665.00 | paid | 2024-10-22 | 22 |
| INV-0107 | brightpath | 2024-09-30 | 7 | 665.00 | paid | 2024-10-16 | 16 |
| INV-0108 | lumen | 2024-09-30 | 11 | 1,045.00 | paid | 2024-10-19 | 19 |
| INV-0109 | ashgrove | 2024-09-30 | 10 | 950.00 | paid | 2024-10-24 | 24 |
| INV-0110 | copperleaf | 2024-10-31 | 7 | 665.00 | paid | 2024-11-16 | 16 |
| INV-0111 | brightpath | 2024-10-31 | 6 | 570.00 | paid | 2024-11-20 | 20 |
| INV-0112 | lumen | 2024-10-31 | 11 | 1,045.00 | paid | 2024-11-23 | 23 |
| INV-0113 | ashgrove | 2024-10-31 | 9 | 855.00 | paid | 2024-11-24 | 24 |
| INV-0114 | copperleaf | 2024-11-30 | 8 | 760.00 | paid | 2024-12-14 | 14 |
| INV-0115 | brightpath | 2024-11-30 | 6 | 570.00 | paid | 2024-12-14 | 14 |
| INV-0116 | lumen | 2024-11-30 | 12 | 1,140.00 | paid | 2024-12-23 | 23 |
| INV-0117 | ashgrove | 2024-11-30 | 8 | 760.00 | paid | 2024-12-20 | 20 |
| INV-0118 | copperleaf | 2024-12-31 | 5 | 475.00 | paid | 2025-01-15 | 15 |
| INV-0119 | brightpath | 2024-12-31 | 4 | 380.00 | paid | 2025-01-23 | 23 |
| INV-0120 | lumen | 2024-12-31 | 8 | 760.00 | paid | 2025-01-13 | 13 |
| INV-0121 | ashgrove | 2024-12-31 | 6 | 570.00 | paid | 2025-01-19 | 19 |
| INV-0122 | brightpath | 2025-01-31 | 5 | 500.00 | paid | 2025-02-17 | 17 |
| INV-0123 | lumen | 2025-01-31 | 11 | 1,100.00 | paid | 2025-02-17 | 17 |
| INV-0124 | ashgrove | 2025-01-31 | 7 | 700.00 | paid | 2025-02-22 | 22 |
| INV-0125 | pebble | 2025-01-31 | 14 | 1,400.00 | paid | 2025-02-19 | 19 |
| INV-0126 | brightpath | 2025-02-28 | 6 | 600.00 | paid | 2025-03-23 | 23 |
| INV-0127 | lumen | 2025-02-28 | 9 | 900.00 | paid | 2025-03-21 | 21 |
| INV-0128 | ashgrove | 2025-02-28 | 9 | 900.00 | paid | 2025-03-16 | 16 |
| INV-0129 | pebble | 2025-02-28 | 13 | 1,300.00 | paid | 2025-03-17 | 17 |
| INV-0130 | brightpath | 2025-03-31 | 5 | 500.00 | paid | 2025-04-17 | 17 |
| INV-0131 | lumen | 2025-03-31 | 9 | 900.00 | paid | 2025-04-22 | 22 |
| INV-0132 | ashgrove | 2025-03-31 | 7 | 700.00 | paid | 2025-04-19 | 19 |
| INV-0133 | pebble | 2025-03-31 | 14 | 1,400.00 | paid | 2025-04-23 | 23 |
| INV-0134 | brightpath | 2025-04-30 | 6 | 600.00 | paid | 2025-05-16 | 16 |
| INV-0135 | lumen | 2025-04-30 | 10 | 1,000.00 | paid | 2025-05-12 | 12 |
| INV-0136 | ashgrove | 2025-04-30 | 7 | 700.00 | paid | 2025-05-15 | 15 |
| INV-0137 | pebble | 2025-04-30 | 16 | 1,600.00 | paid | 2025-05-12 | 12 |
| INV-0138 | brightpath | 2025-05-31 | 5 | 500.00 | paid | 2025-06-18 | 18 |
| INV-0139 | lumen | 2025-05-31 | 10 | 1,000.00 | paid | 2025-06-13 | 13 |
| INV-0140 | ashgrove | 2025-05-31 | 10 | 1,000.00 | paid | 2025-06-12 | 12 |
| INV-0141 | pebble | 2025-05-31 | 14 | 1,400.00 | paid | 2025-06-16 | 16 |
| INV-0142 | brightpath | 2025-06-30 | 5 | 525.00 | paid | 2025-07-13 | 13 |
| INV-0143 | lumen | 2025-06-30 | 10 | 1,050.00 | paid | 2025-07-15 | 15 |
| INV-0144 | ashgrove | 2025-06-30 | 9 | 945.00 | paid | 2025-07-16 | 16 |
| INV-0145 | pebble | 2025-06-30 | 15 | 1,575.00 | paid | 2025-07-21 | 21 |
| INV-0146 | brightpath | 2025-07-31 | 5 | 525.00 | paid | 2025-08-20 | 20 |
| INV-0147 | lumen | 2025-07-31 | 12 | 1,260.00 | paid | 2025-08-15 | 15 |
| INV-0148 | ashgrove | 2025-07-31 | 8 | 840.00 | paid | 2025-08-20 | 20 |
| INV-0149 | pebble | 2025-07-31 | 13 | 1,365.00 | paid | 2025-08-12 | 12 |
| INV-0150 | brightpath | 2025-08-31 | 4 | 420.00 | paid | 2025-09-12 | 12 |
| INV-0151 | lumen | 2025-08-31 | 6 | 630.00 | paid | 2025-09-18 | 18 |
| INV-0152 | ashgrove | 2025-08-31 | 5 | 525.00 | paid | 2025-09-14 | 14 |
| INV-0153 | pebble | 2025-08-31 | 9 | 945.00 | paid | 2025-09-20 | 20 |
| INV-0154 | lumen | 2025-09-30 | 10 | 1,050.00 | paid | 2025-10-20 | 20 |
| INV-0155 | ashgrove | 2025-09-30 | 8 | 840.00 | paid | 2025-10-17 | 17 |
| INV-0156 | pebble | 2025-09-30 | 14 | 1,470.00 | paid | 2025-10-10 | 10 |
| INV-0157 | orchard | 2025-09-30 | 7 | 735.00 | paid | 2025-10-17 | 17 |
| INV-0158 | lumen | 2025-10-31 | 12 | 1,260.00 | paid | 2025-11-11 | 11 |
| INV-0159 | ashgrove | 2025-10-31 | 9 | 945.00 | paid | 2025-11-15 | 15 |
| INV-0160 | pebble | 2025-10-31 | 14 | 1,470.00 | paid | 2025-11-14 | 14 |
| INV-0161 | orchard | 2025-10-31 | 7 | 735.00 | paid | 2025-11-14 | 14 |
| INV-0162 | lumen | 2025-11-30 | 13 | 1,430.00 | paid | 2025-12-11 | 11 |
| INV-0163 | ashgrove | 2025-11-30 | 10 | 1,100.00 | paid | 2025-12-15 | 15 |
| INV-0164 | pebble | 2025-11-30 | 11 | 1,210.00 | paid | 2025-12-18 | 18 |
| INV-0165 | orchard | 2025-11-30 | 7 | 770.00 | paid | 2025-12-19 | 19 |
| INV-0166 | lumen | 2025-12-31 | 6 | 660.00 | paid | 2026-01-19 | 19 |
| INV-0167 | ashgrove | 2025-12-31 | 6 | 660.00 | paid | 2026-01-13 | 13 |
| INV-0168 | pebble | 2025-12-31 | 9 | 990.00 | paid | 2026-01-20 | 20 |
| INV-0169 | orchard | 2025-12-31 | 4 | 440.00 | paid | 2026-01-11 | 11 |
| INV-0170 | lumen | 2026-01-31 | 10 | 1,100.00 | paid | 2026-02-18 | 18 |
| INV-0171 | ashgrove | 2026-01-31 | 8 | 880.00 | paid | 2026-02-12 | 12 |
| INV-0172 | pebble | 2026-01-31 | 15 | 1,650.00 | paid | 2026-02-15 | 15 |
| INV-0173 | orchard | 2026-01-31 | 8 | 880.00 | paid | 2026-02-15 | 15 |
| INV-0174 | lumen | 2026-02-28 | 9 | 990.00 | paid | 2026-03-09 | 9 |
| INV-0175 | ashgrove | 2026-02-28 | 7 | 770.00 | paid | 2026-03-09 | 9 |
| INV-0176 | pebble | 2026-02-28 | 16 | 1,760.00 | paid | 2026-03-19 | 19 |
| INV-0177 | orchard | 2026-02-28 | 7 | 770.00 | paid | 2026-03-13 | 13 |
| INV-0178 | ashgrove | 2026-03-31 | 7 | 770.00 | paid | 2026-04-13 | 13 |
| INV-0179 | pebble | 2026-03-31 | 15 | 1,650.00 | paid | 2026-04-15 | 15 |
| INV-0180 | orchard | 2026-03-31 | 10 | 1,100.00 | paid | 2026-04-14 | 14 |
| INV-0181 | kite | 2026-03-31 | 10 | 1,100.00 | paid | 2026-04-12 | 12 |
| INV-0182 | ashgrove | 2026-04-30 | 9 | 990.00 | paid | 2026-05-12 | 12 |
| INV-0183 | pebble | 2026-04-30 | 12 | 1,320.00 | paid | 2026-05-15 | 15 |
| INV-0184 | orchard | 2026-04-30 | 9 | 990.00 | paid | 2026-05-16 | 16 |
| INV-0185 | kite | 2026-04-30 | 11 | 1,210.00 | paid | 2026-05-09 | 9 |
| INV-0186 | ashgrove | 2026-05-31 | 8 | 880.00 | paid | 2026-06-10 | 10 |
| INV-0187 | pebble | 2026-05-31 | 15 | 1,650.00 | paid | 2026-06-09 | 9 |
| INV-0188 | orchard | 2026-05-31 | 7 | 770.00 | paid | 2026-06-14 | 14 |
| INV-0189 | kite | 2026-05-31 | 10 | 1,100.00 | paid | 2026-06-09 | 9 |
| INV-0190 | ashgrove | 2026-06-30 | 8 | 920.00 | paid | 2026-07-15 | 15 |
| INV-0191 | pebble | 2026-06-30 | 17 | 1,955.00 | paid | 2026-07-16 | 16 |
| INV-0192 | orchard | 2026-06-30 | 9 | 1,035.00 | paid | 2026-07-15 | 15 |
| INV-0193 | kite | 2026-06-30 | 13 | 1,495.00 | paid | 2026-07-12 | 12 |
| INV-0194 | ashgrove | 2026-07-31 | 9 | 1,035.00 | paid | 2026-08-15 | 15 |
| INV-0195 | pebble | 2026-07-31 | 16 | 1,840.00 | paid | 2026-08-14 | 14 |
| INV-0196 | orchard | 2026-07-31 | 10 | 1,150.00 | paid | 2026-08-13 | 13 |
| INV-0197 | kite | 2026-07-31 | 11 | 1,265.00 | paid | 2026-08-11 | 11 |
| INV-0198 | ashgrove | 2026-08-31 | 6 | 690.00 | paid | 2026-09-12 | 12 |
| INV-0199 | pebble | 2026-08-31 | 10 | 1,150.00 | paid | 2026-09-11 | 11 |
| INV-0200 | orchard | 2026-08-31 | 6 | 690.00 | paid | 2026-09-08 | 8 |
| INV-0201 | kite | 2026-08-31 | 7 | 805.00 | overdue |  |  |
| INV-0202 | ashgrove | 2026-09-30 | 10 | 1,150.00 | sent |  |  |
| INV-0203 | pebble | 2026-09-30 | 13 | 1,495.00 | sent |  |  |
| INV-0204 | orchard | 2026-09-30 | 10 | 1,150.00 | sent |  |  |
| INV-0205 | kite | 2026-09-30 | 10 | 1,150.00 | sent |  |  |
`,
  },
  {
    path: 'business/expenses.md',
    content: `---
type: Dataset
title: Expenses
description: Business costs, for the tax return and to see what the business spends.
tags: [business, expenses]
dataset:
  columns:
    date: { type: date, required: true }
    category: { type: enum, values: [software, equipment, accountant, insurance, training, travel, marketing, other], required: true }
    amount: { type: currency, currency: GBP, required: true }
    notes: { type: text }
---

# Expenses

| date | category | amount | notes |
| --- | --- | --- | --- |
| 2021-10-03 | software | 35.00 | Design and accounting tools |
| 2021-11-03 | software | 36.00 | Design and accounting tools |
| 2021-12-03 | software | 38.00 | Design and accounting tools |
| 2022-01-03 | software | 39.00 | Design and accounting tools |
| 2022-01-08 | insurance | 187.00 | Professional indemnity |
| 2022-01-20 | accountant | 625.00 | Year end accounts |
| 2022-02-03 | software | 41.00 | Design and accounting tools |
| 2022-03-03 | software | 42.00 | Design and accounting tools |
| 2022-04-03 | software | 44.00 | Design and accounting tools |
| 2022-05-03 | software | 45.00 | Design and accounting tools |
| 2022-05-15 | marketing | 257.00 |  |
| 2022-06-03 | software | 47.00 | Design and accounting tools |
| 2022-06-15 | travel | 217.00 |  |
| 2022-07-03 | software | 48.00 | Design and accounting tools |
| 2022-08-03 | software | 49.00 | Design and accounting tools |
| 2022-09-03 | software | 51.00 | Design and accounting tools |
| 2022-10-03 | software | 52.00 | Design and accounting tools |
| 2022-11-03 | software | 54.00 | Design and accounting tools |
| 2022-12-03 | software | 55.00 | Design and accounting tools |
| 2023-01-03 | software | 57.00 | Design and accounting tools |
| 2023-01-08 | insurance | 216.00 | Professional indemnity |
| 2023-01-20 | accountant | 727.00 | Year end accounts |
| 2023-02-03 | software | 58.00 | Design and accounting tools |
| 2023-03-03 | software | 59.00 | Design and accounting tools |
| 2023-04-03 | software | 61.00 | Design and accounting tools |
| 2023-05-03 | software | 62.00 | Design and accounting tools |
| 2023-05-15 | equipment | 1,041.00 |  |
| 2023-06-03 | software | 64.00 | Design and accounting tools |
| 2023-07-03 | software | 65.00 | Design and accounting tools |
| 2023-08-03 | software | 67.00 | Design and accounting tools |
| 2023-09-03 | software | 68.00 | Design and accounting tools |
| 2023-10-03 | software | 70.00 | Design and accounting tools |
| 2023-11-03 | software | 71.00 | Design and accounting tools |
| 2023-12-03 | software | 72.00 | Design and accounting tools |
| 2024-01-03 | software | 74.00 | Design and accounting tools |
| 2024-01-08 | insurance | 244.00 | Professional indemnity |
| 2024-01-15 | equipment | 1,324.00 |  |
| 2024-01-20 | accountant | 829.00 | Year end accounts |
| 2024-02-03 | software | 75.00 | Design and accounting tools |
| 2024-03-03 | software | 77.00 | Design and accounting tools |
| 2024-04-03 | software | 78.00 | Design and accounting tools |
| 2024-05-03 | software | 80.00 | Design and accounting tools |
| 2024-06-03 | software | 81.00 | Design and accounting tools |
| 2024-07-03 | software | 83.00 | Design and accounting tools |
| 2024-07-15 | equipment | 1,355.00 |  |
| 2024-08-03 | software | 84.00 | Design and accounting tools |
| 2024-09-03 | software | 85.00 | Design and accounting tools |
| 2024-10-03 | software | 87.00 | Design and accounting tools |
| 2024-10-15 | training | 494.00 |  |
| 2024-11-03 | software | 88.00 | Design and accounting tools |
| 2024-12-03 | software | 90.00 | Design and accounting tools |
| 2025-01-03 | software | 91.00 | Design and accounting tools |
| 2025-01-08 | insurance | 273.00 | Professional indemnity |
| 2025-01-20 | accountant | 931.00 | Year end accounts |
| 2025-02-03 | software | 93.00 | Design and accounting tools |
| 2025-03-03 | software | 94.00 | Design and accounting tools |
| 2025-04-03 | software | 96.00 | Design and accounting tools |
| 2025-04-15 | marketing | 126.00 |  |
| 2025-05-03 | software | 97.00 | Design and accounting tools |
| 2025-06-03 | software | 98.00 | Design and accounting tools |
| 2025-07-03 | software | 100.00 | Design and accounting tools |
| 2025-08-03 | software | 101.00 | Design and accounting tools |
| 2025-09-03 | software | 103.00 | Design and accounting tools |
| 2025-10-03 | software | 104.00 | Design and accounting tools |
| 2025-11-03 | software | 106.00 | Design and accounting tools |
| 2025-11-15 | training | 534.00 |  |
| 2025-12-03 | software | 107.00 | Design and accounting tools |
| 2026-01-03 | software | 108.00 | Design and accounting tools |
| 2026-01-08 | insurance | 301.00 | Professional indemnity |
| 2026-01-15 | marketing | 209.00 |  |
| 2026-01-20 | accountant | 1,032.00 | Year end accounts |
| 2026-02-03 | software | 110.00 | Design and accounting tools |
| 2026-03-03 | software | 111.00 | Design and accounting tools |
| 2026-04-03 | software | 113.00 | Design and accounting tools |
| 2026-04-15 | training | 449.00 |  |
| 2026-05-03 | software | 114.00 | Design and accounting tools |
| 2026-06-03 | software | 116.00 | Design and accounting tools |
| 2026-07-03 | software | 117.00 | Design and accounting tools |
| 2026-08-03 | software | 119.00 | Design and accounting tools |
| 2026-09-03 | software | 120.00 | Design and accounting tools |
`,
  },
  {
    path: 'business/templates/proposal.md',
    content: `---
tags: [business, proposal]
status: draft
---

# Proposal

## The problem

## What I will do

## Timeline

## Price

## Next steps
`,
  },
  {
    path: 'business/dashboard.md',
    content: `---
type: Dashboard
title: Business dashboard
description: Revenue, rates, cash owed to you, who the work comes from and what it costs to run.
---

# Business dashboard

Reads [Invoices](invoices.md), [Clients](clients.md) and [Expenses](expenses.md). Tax years run from 6 April.

\`\`\`caedora-dashboard
data:
  invoices: invoices.md
  clients: clients.md
  expenses: expenses.md
rows:
  - columns: 4
    items:
      - stat: { label: Revenue this tax year, source: invoices, where: tax_year(issued) = current_tax_year(), value: sum(amount) }
      - stat: { label: Owed to you, source: invoices, where: "status in [sent, overdue]", value: sum(amount) }
      - stat: { label: Hourly rate this year, source: invoices, where: year(issued) = year(today()), value: sum(amount) / sum(hours), format: currency }
      - stat: { label: Expenses this tax year, source: expenses, where: tax_year(date) = current_tax_year(), value: sum(amount) }
  - columns: 1
    items:
      - bar:
          title: Revenue per month
          source: invoices
          x: month(issued)
          y: sum(amount)
          ranges: [12m, 3y, all]
  - columns: 2
    items:
      - bar: { title: Revenue each tax year, description: Completed tax years, source: invoices, where: tax_year(issued) != current_tax_year(), x: tax_year(issued), y: sum(amount) }
      - line: { title: Effective hourly rate, source: invoices, x: year(issued), y: sum(amount) / sum(hours), format: currency }
  - columns: 2
    items:
      - pie: { title: Revenue by client this tax year, source: invoices, where: tax_year(issued) = current_tax_year(), label: client.name, value: sum(amount) }
      - line: { title: Days to get paid, description: Average for each year, source: invoices, where: status = paid, x: year(issued), y: avg(days_to_pay), format: number }
  - columns: 2
    items:
      - bar: { title: Expenses each tax year, description: Completed tax years, source: expenses, where: tax_year(date) != current_tax_year(), x: tax_year(date), y: sum(amount), series: category, stacked: true }
      - table:
          title: Waiting to be paid
          source: invoices
          where: "status in [sent, overdue]"
          columns: [number, client.name, issued, amount, status]
          sort: issued
\`\`\`
`,
  },
  {
    path: 'business/AGENTS.md',
    content: `# Business guidance

Help keep invoices and expenses tidy and prepare summaries for the tax return. Do not give tax or legal advice; suggest checking with an accountant or HMRC guidance.

- clients.md, invoices.md and expenses.md are Datasets. Keep ISO dates (YYYY-MM-DD) and plain numbers for money.
- Invoices point at a client by its id in clients.md. Number invoices in order without gaps.
`,
  },
]

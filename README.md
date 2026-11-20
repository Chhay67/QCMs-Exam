# QCMs Exam Cambodia — ប្រព័ន្ធហ្វឹកហាត់សំណួរពហុចម្លើយមន្ត្រីរាជការ (២០២៦)

A static web application for practicing Cambodia Civil Service Multiple-Choice Questions (**សិស្សមន្ត្រីក្រមការ និងសិស្សមន្ត្រីជាន់ខ្ពស់ ឆ្នាំ២០២៦**), extracted from the 532-page source PDF (`QCM_correct_answers_yellow_highlight.pdf`) compiled by **លោក ណុំ វណ្ណា** and **លោកស្រី ម៉ប់ វិច្ឆិកា**.

## Key Features
- **Complete PDF QCM Dataset (`1,725` Questions)**:
  - **7 Official Past Exam Papers (`538` questions)**: ក្រមការ (លើកទី៧, លើកទី៨, លើកទី៩, លើកទី១០) & មន្ត្រីជាន់ខ្ពស់ (លើកទី១០, លើកទី១១, លើកទី១២).
  - **1,200 QCM Question Bank (`1,187` extracted MCQs across Chapters I–XIV)**.
  - Verified against both the **yellow highlight annotations** on the PDF pages and the official answer key tables (`អត្រាកំណែផ្លូវការ`).
- **Two Question Order Modes**:
  1. **សំណួរចៃដន្យ (Random Question Mode)**: Shuffles questions randomly from your selected number range (e.g., `1–100`) or selected exam/chapter.
  2. **សំណួរតាមលំដាប់ (Sequence Question Mode)**: Presents questions in sequential order (`1, 2, 3...`) matching the book.
- **1-Minute (`60s`) Per-Question Timer**:
  - Visual circular and horizontal countdown timer for every question.
  - Auto-submits as **Time Out** when `00:00` is reached, reveals the official yellow-highlighted answer, and waits for you to click **Next Question**.
- **Select & Click "ផ្ទៀងផ្ទាត់ចម្លើយ (Check Answer)" Correction**:
  - Select any option (`ក`, `ខ`, `គ`, `ឃ`, `ង`) and click **ផ្ទៀងផ្ទាត់ចម្លើយ (Check Answer)** (or press `Enter`) to lock and grade your answer immediately.
- **End-of-Quiz Summary, Retry Mistakes & Full Question Browser**:
  - Detailed accuracy report, average time per question, question-by-question answer review, one-click **Retry Mistakes Only**, and a searchable browser for all 1,725 questions.

## Deploying to Vercel
This repository is a zero-build static web app (`index.html`, `index.css`, `app.js`, `data/questions.json`, and `vercel.json`):
1. Import `Chhay67/QCMs-Exam` into [Vercel](https://vercel.com/new).
2. Leave **Framework Preset** as `Other` and **Output Directory** as `.` (default).
3. Click **Deploy**.

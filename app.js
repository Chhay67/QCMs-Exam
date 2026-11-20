/**
 * QCMs Exam Cambodia — Static Web Application Logic
 * Features:
 * - Source QCM Dataset from PDF (1,725 Questions with Yellow Highlight Correct Answers)
 * - Question Order Modes:
 *   1. Random Question (សំណួរចៃដន្យ)
 *   2. Sequence Question (សំណួរតាមលំដាប់លេខរៀង)
 * - Number Range Filter (e.g. 1-100, 101-200, or custom) & Category/Exam Filter
 * - 1-Minute (60s) Per-Question Countdown Timer with Auto-Timeout & Answer Reveal
 * - Select Option & Click "ផ្ទៀងផ្ទាត់ចម្លើយ (Check Answer)" Instant Correction
 * - End-of-Quiz Summary, Retry Mistakes Mode, and Full Question Bank Browser
 */

(function () {
  'use strict';

  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  function toKhmerNum(n) {
    return String(n).replace(/[0-9]/g, (d) => KHMER_DIGITS[Number(d)]);
  }

  // Application State
  const state = {
    dataset: null,
    allQuestions: [],
    categories: [],

    // Configuration State
    orderMode: 'random', // 'random' | 'sequence'
    categoryGroupTab: 'bank-1200', // 'bank-1200' | 'past-exams' | 'all'
    selectedCategoryId: 'bank-all', // 'bank-all' | 'past-all' | 'all-pools' | specific category id
    rangeStart: 1,
    rangeEnd: 100,
    sessionCount: 100, // 10, 20, 50, 100, or 'all'
    timerSecondsPerQuestion: 60, // default 60s (1 minute)

    // Active Quiz Session State
    quizQueue: [],
    currentIndex: 0,
    selectedOptionKey: null,
    isQuestionSubmitted: false,
    questionTimerId: null,
    timeLeftSeconds: 60,
    questionStartTimestamp: 0,
    resultsHistory: [], // { questionObj, userChoice, isCorrect, isTimeout, timeSpentSec }

    // Review & Browse State
    reviewFilter: 'all', // 'all' | 'wrong' | 'correct'
    browseLimit: 80,
  };

  // DOM Elements
  const el = {
    loadingView: document.getElementById('loading-view'),
    setupView: document.getElementById('setup-view'),
    quizView: document.getElementById('quiz-view'),
    resultsView: document.getElementById('results-view'),
    browseView: document.getElementById('browse-view'),

    brandHomeTrigger: document.getElementById('brand-home-trigger'),
    totalBankBadge: document.getElementById('total-bank-badge'),
    btnOpenBrowse: document.getElementById('btn-open-browse'),
    btnCloseBrowse: document.getElementById('btn-close-browse'),

    // Presets
    presetRandom100: document.getElementById('preset-random-100'),
    presetSeq100: document.getElementById('preset-seq-100'),

    // Setup Controls
    modeBtnRandom: document.getElementById('mode-btn-random'),
    modeBtnSequence: document.getElementById('mode-btn-sequence'),
    inputRangeStart: document.getElementById('input-range-start'),
    inputRangeEnd: document.getElementById('input-range-end'),
    rangeChips: document.querySelectorAll('.range-chip'),
    countBtns: document.querySelectorAll('.count-btn'),
    timerBtns: document.querySelectorAll('.timer-btn'),
    catTabs: document.querySelectorAll('.cat-tab'),
    categoryList: document.getElementById('category-list'),
    launchSummaryTitle: document.getElementById('launch-summary-title'),
    launchSummarySub: document.getElementById('launch-summary-sub'),
    btnStartQuiz: document.getElementById('btn-start-quiz'),

    // Quiz HUD & Progress
    btnQuitQuiz: document.getElementById('btn-quit-quiz'),
    hudModeBadge: document.getElementById('hud-mode-badge'),
    hudSectionBadge: document.getElementById('hud-section-badge'),
    hudCorrectCount: document.getElementById('hud-correct-count'),
    hudWrongCount: document.getElementById('hud-wrong-count'),
    hudTimeoutCount: document.getElementById('hud-timeout-count'),
    timerWidget: document.getElementById('timer-widget'),
    timerRingCircle: document.getElementById('timer-ring-circle'),
    timerClock: document.getElementById('timer-clock'),
    progressStepLabel: document.getElementById('progress-step-label'),
    progressSourceMeta: document.getElementById('progress-source-meta'),
    sessionProgressFill: document.getElementById('session-progress-fill'),
    questionTimerBarTrack: document.getElementById('question-timer-bar-track'),
    questionTimerBarFill: document.getElementById('question-timer-bar-fill'),

    // Question Card
    qNumberChip: document.getElementById('q-number-chip'),
    qSourceTag: document.getElementById('q-source-tag'),
    questionStem: document.getElementById('question-stem'),
    optionsContainer: document.getElementById('options-container'),
    correctionBanner: document.getElementById('correction-banner'),
    correctionTitle: document.getElementById('correction-title'),
    correctionDetail: document.getElementById('correction-detail'),
    correctionSourceBadge: document.getElementById('correction-source-badge'),
    btnSkipQuestion: document.getElementById('btn-skip-question'),
    btnSubmitAnswer: document.getElementById('btn-submit-answer'),
    btnNextQuestion: document.getElementById('btn-next-question'),
    btnNextLabel: document.getElementById('btn-next-label'),
    navDotsGrid: document.getElementById('nav-dots-grid'),

    // Results View
    resPercentage: document.getElementById('res-percentage'),
    resGradeTag: document.getElementById('res-grade-tag'),
    resSessionMeta: document.getElementById('res-session-meta'),
    resFeedbackMsg: document.getElementById('res-feedback-msg'),
    resCorrect: document.getElementById('res-correct'),
    resWrong: document.getElementById('res-wrong'),
    resTimeout: document.getElementById('res-timeout'),
    resAvgTime: document.getElementById('res-avg-time'),
    btnRetryMistakes: document.getElementById('btn-retry-mistakes'),
    btnRetryMistakesLabel: document.getElementById('btn-retry-mistakes-label'),
    btnRestartSame: document.getElementById('btn-restart-same'),
    btnBackHome: document.getElementById('btn-back-home'),
    revFilterBtns: document.querySelectorAll('.rev-filter-btn'),
    reviewCardsContainer: document.getElementById('review-cards-container'),

    // Browse View
    browseSearchInput: document.getElementById('browse-search-input'),
    browseCategorySelect: document.getElementById('browse-category-select'),
    browseResultsInfo: document.getElementById('browse-results-info'),
    browseCardsContainer: document.getElementById('browse-cards-container'),
    btnBrowseLoadMore: document.getElementById('btn-browse-load-more'),
  };

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  async function initApp() {
    try {
      let data = window.QCM_DATASET;
      if (!data) {
        const response = await fetch('./data/questions.json');
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        data = await response.json();
      }
      state.dataset = data;
      state.allQuestions = data.questions || [];
      state.categories = data.categories || [];

      el.totalBankBadge.textContent = `${toKhmerNum(state.allQuestions.length)} សំណួរក្នុង PDF`;

      populateBrowseCategorySelect();
      renderCategoryList();
      updateLaunchSummary();
      bindEvents();

      showView('setup');
    } catch (err) {
      console.error('Failed to load QCM dataset:', err);
      el.loadingView.innerHTML = `
        <p class="loading-title" style="color: var(--wrong-text)">មិនអាចផ្ទុកទិន្នន័យសំណួរបានទេ</p>
        <p class="loading-sub">${err.message}</p>
      `;
    }
  }

  function showView(viewName) {
    stopQuestionTimer();
    el.loadingView.classList.add('hidden');
    el.setupView.classList.toggle('hidden', viewName !== 'setup');
    el.quizView.classList.toggle('hidden', viewName !== 'quiz');
    el.resultsView.classList.toggle('hidden', viewName !== 'results');
    el.browseView.classList.toggle('hidden', viewName !== 'browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // SETUP & FILTERING LOGIC
  // =========================================================================

  function getPoolBySelectedCategory() {
    const catId = state.selectedCategoryId;
    if (catId === 'bank-all') {
      return state.allQuestions.filter((q) => q.categoryGroup === 'bank-1200');
    }
    if (catId === 'past-all') {
      return state.allQuestions.filter((q) => q.categoryGroup === 'past-exams');
    }
    if (catId === 'all-pools') {
      return state.allQuestions.slice();
    }
    return state.allQuestions.filter((q) => q.sectionId === catId);
  }

  function getFilteredPoolWithRange() {
    const basePool = getPoolBySelectedCategory();
    const start = Math.max(1, Number(state.rangeStart) || 1);
    const end = Math.max(start, Number(state.rangeEnd) || 9999);

    // Filter by question's book number (`q.number`) if it falls within [start, end]
    const byBookNum = basePool.filter((q) => q.number >= start && q.number <= end);
    if (byBookNum.length > 0) {
      return byBookNum;
    }
    // Fallback to 1-based slice index within basePool
    return basePool.slice(Math.max(0, start - 1), end);
  }

  function renderCategoryList() {
    const group = state.categoryGroupTab;
    const items = [];

    if (group === 'bank-1200') {
      const bankTotal = state.allQuestions.filter((q) => q.categoryGroup === 'bank-1200').length;
      items.push({
        id: 'bank-all',
        title: 'កម្រងសំណួរពហុចម្លើយ ១,២០០ សំណួរ (ទាំងអស់)',
        sub: 'សំណួរទី ១ ដល់ ១២០០ (គ្រប់ផ្នែក I–XIV)',
        count: bankTotal,
        defaultRange: [1, 100],
      });
      state.categories
        .filter((c) => c.group === 'bank-1200')
        .forEach((c) => {
          items.push({
            id: c.id,
            title: c.title,
            sub: c.range ? `សំណួរលេខ ${toKhmerNum(c.range[0])} ដល់ ${toKhmerNum(c.range[1])}` : 'កម្រង ១២០០ សំណួរ',
            count: c.count,
            defaultRange: c.range || [1, 1200],
          });
        });
    } else if (group === 'past-exams') {
      const pastTotal = state.allQuestions.filter((q) => q.categoryGroup === 'past-exams').length;
      items.push({
        id: 'past-all',
        title: 'វិញ្ញាសាធ្លាប់ចេញប្រឡងទាំង ៧ វិញ្ញាសា (រួមគ្នា)',
        sub: 'ក្រមការ (លើកទី៧–១០) និងមន្ត្រីជាន់ខ្ពស់ (លើកទី១០–១២)',
        count: pastTotal,
        defaultRange: [1, 100],
      });
      state.categories
        .filter((c) => c.group === 'past-exams')
        .forEach((c) => {
          items.push({
            id: c.id,
            title: c.title,
            sub: `សំណួរទី ១ ដល់ ${toKhmerNum(c.count)}`,
            count: c.count,
            defaultRange: [1, c.count],
          });
        });
    } else {
      items.push({
        id: 'all-pools',
        title: 'រួមបញ្ចូលគ្រប់វិញ្ញាសា និងកម្រង ១,២០០ សំណួរទាំងអស់',
        sub: 'សំណួរសរុបទាំងអស់ក្នុងសៀវភៅ PDF (ទំព័រ ៤៥–៥១១)',
        count: state.allQuestions.length,
        defaultRange: [1, 1200],
      });
    }

    el.categoryList.innerHTML = items
      .map((item) => {
        const isActive = item.id === state.selectedCategoryId;
        return `
          <button type="button" class="category-item ${isActive ? 'active' : ''}"
                  data-cat-id="${item.id}"
                  data-rstart="${item.defaultRange[0]}"
                  data-rend="${item.defaultRange[1]}"
                  role="option" aria-selected="${isActive}">
            <div>
              <div class="cat-item-title">${item.title}</div>
              <div class="cat-item-sub">${item.sub}</div>
            </div>
            <span class="cat-item-count">${toKhmerNum(item.count)} សំណួរ</span>
          </button>
        `;
      })
      .join('');

    el.categoryList.querySelectorAll('.category-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedCategoryId = btn.dataset.catId;
        const rStart = Number(btn.dataset.rstart) || 1;
        const rEnd = Number(btn.dataset.rend) || 100;
        setRangeValues(rStart, rEnd);
        renderCategoryList();
        updateLaunchSummary();
      });
    });
  }

  function setRangeValues(start, end) {
    state.rangeStart = start;
    state.rangeEnd = end;
    el.inputRangeStart.value = start;
    el.inputRangeEnd.value = end;

    el.rangeChips.forEach((chip) => {
      const cs = Number(chip.dataset.start);
      const ce = Number(chip.dataset.end);
      chip.classList.toggle('active', cs === start && ce === end);
    });
  }

  function setOrderMode(mode) {
    state.orderMode = mode;
    const isRandom = mode === 'random';
    el.modeBtnRandom.classList.toggle('active', isRandom);
    el.modeBtnRandom.setAttribute('aria-checked', String(isRandom));
    el.modeBtnSequence.classList.toggle('active', !isRandom);
    el.modeBtnSequence.setAttribute('aria-checked', String(!isRandom));
    updateLaunchSummary();
  }

  function updateLaunchSummary() {
    const pool = getFilteredPoolWithRange();
    const desiredCount =
      state.sessionCount === 'all' ? pool.length : Math.min(Number(state.sessionCount) || 100, pool.length);

    const modeLabel =
      state.orderMode === 'random'
        ? 'សំណួរចៃដន្យ (Random Question)'
        : 'តាមលំដាប់លេខរៀង (Sequence Question)';

    const timerLabel =
      state.timerSecondsPerQuestion > 0
        ? `${toKhmerNum(state.timerSecondsPerQuestion)} វិនាទី/សំណួរ`
        : 'មិនកំណត់ម៉ោង';

    el.launchSummaryTitle.textContent = `ត្រៀមប្រឡង៖ ${toKhmerNum(desiredCount)} សំណួរ • ${modeLabel} (ចន្លោះលេខ ${toKhmerNum(state.rangeStart)}–${toKhmerNum(state.rangeEnd)})`;
    el.launchSummarySub.textContent = `សំណួរក្នុងចន្លោះនេះមាន ${toKhmerNum(pool.length)} សំណួរ • កំណត់ម៉ោង៖ ${timerLabel}`;
    el.btnStartQuiz.disabled = desiredCount === 0;
  }

  // =========================================================================
  // STARTING & RUNNING A QUIZ SESSION
  // =========================================================================

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function startQuizSession(customQuestionsList = null) {
    let pool;
    if (Array.isArray(customQuestionsList) && customQuestionsList.length > 0) {
      pool = customQuestionsList.slice();
    } else {
      pool = getFilteredPoolWithRange();
    }

    if (pool.length === 0) {
      return;
    }

    if (state.orderMode === 'random') {
      pool = shuffleArray(pool);
    } else {
      // Sequence mode: preserve natural book order (by PDF page & question number)
      pool = pool.slice().sort((a, b) => a.pdfPage - b.pdfPage || a.number - b.number);
    }

    const limit =
      customQuestionsList !== null
        ? pool.length
        : state.sessionCount === 'all'
        ? pool.length
        : Math.min(Number(state.sessionCount) || 100, pool.length);

    state.quizQueue = pool.slice(0, limit);
    state.currentIndex = 0;
    state.resultsHistory = [];

    el.hudModeBadge.textContent =
      state.orderMode === 'random' ? 'ចៃដន្យ (Random)' : 'តាមលំដាប់ (Sequence)';

    showView('quiz');
    renderCurrentQuestion();
  }

  function renderCurrentQuestion() {
    stopQuestionTimer();

    const q = state.quizQueue[state.currentIndex];
    const total = state.quizQueue.length;
    state.selectedOptionKey = null;
    state.isQuestionSubmitted = false;
    state.questionStartTimestamp = Date.now();

    // Update HUD Counters
    const correctCount = state.resultsHistory.filter((r) => r.isCorrect).length;
    const timeoutCount = state.resultsHistory.filter((r) => r.isTimeout).length;
    const wrongCount = state.resultsHistory.length - correctCount - timeoutCount;

    el.hudCorrectCount.textContent = toKhmerNum(correctCount);
    el.hudWrongCount.textContent = toKhmerNum(wrongCount);
    el.hudTimeoutCount.textContent = toKhmerNum(timeoutCount);
    el.hudSectionBadge.textContent = q.sectionTitle;

    // Progress Bar
    const stepNum = state.currentIndex + 1;
    const pct = Math.round((stepNum / total) * 100);
    el.progressStepLabel.textContent = `សំណួរទី ${toKhmerNum(stepNum)} នៃ ${toKhmerNum(total)}`;
    el.progressSourceMeta.textContent = `សំណួរដើមក្នុងសៀវភៅលេខ #${q.numberKh} • ទំព័រ PDF ${toKhmerNum(q.pdfPage)}`;
    el.sessionProgressFill.style.width = `${pct}%`;

    // Question Header & Stem
    el.qNumberChip.textContent = `សំណួរទី ${toKhmerNum(stepNum)} (លេខដើម #${q.numberKh})`;
    el.qSourceTag.textContent = `${q.sectionTitle} • ទំព័រ PDF ${toKhmerNum(q.pdfPage)}`;
    el.questionStem.textContent = `${q.numberKh}. ${q.question}`;

    // Render Options
    el.optionsContainer.innerHTML = q.options
      .map((opt, idx) => {
        return `
          <button type="button" class="option-item"
                  data-key="${opt.key}"
                  data-index="${idx}"
                  role="radio"
                  aria-checked="false"
                  id="opt-btn-${opt.key}">
            <span class="option-key-badge">${opt.key}</span>
            <span class="option-text">${opt.text}</span>
            <span class="option-status-tag hidden" id="opt-tag-${opt.key}"></span>
          </button>
        `;
      })
      .join('');

    el.optionsContainer.querySelectorAll('.option-item').forEach((btn) => {
      btn.addEventListener('click', () => handleSelectOption(btn.dataset.key));
    });

    // Reset Correction Banner & Action Buttons
    el.correctionBanner.className = 'correction-banner hidden';
    el.btnSubmitAnswer.disabled = true;
    el.btnSubmitAnswer.classList.remove('hidden');
    el.btnSkipQuestion.classList.remove('hidden');
    el.btnNextQuestion.classList.add('hidden');
    el.btnNextLabel.textContent =
      state.currentIndex + 1 < total ? 'សំណួរបន្ទាប់ (Next Question)' : 'មើលលទ្ធផលសរុប (Finish Quiz)';

    renderNavDots();
    startQuestionTimer();
  }

  function handleSelectOption(optionKey) {
    if (state.isQuestionSubmitted) {
      return;
    }
    state.selectedOptionKey = optionKey;
    el.optionsContainer.querySelectorAll('.option-item').forEach((btn) => {
      const isSelected = btn.dataset.key === optionKey;
      btn.classList.toggle('selected', isSelected);
      btn.setAttribute('aria-checked', String(isSelected));
    });
    el.btnSubmitAnswer.disabled = false;
  }

  // =========================================================================
  // 1-MINUTE PER-QUESTION COUNTDOWN TIMER
  // =========================================================================

  function startQuestionTimer() {
    const totalSec = state.timerSecondsPerQuestion;
    if (totalSec <= 0) {
      el.timerClock.textContent = '∞';
      el.timerWidget.classList.remove('timer-warning', 'timer-danger');
      el.timerRingCircle.style.strokeDashoffset = '0';
      el.questionTimerBarFill.style.width = '100%';
      return;
    }

    state.timeLeftSeconds = totalSec;
    updateTimerUI(totalSec, totalSec);

    state.questionTimerId = window.setInterval(() => {
      state.timeLeftSeconds -= 1;
      updateTimerUI(state.timeLeftSeconds, totalSec);

      if (state.timeLeftSeconds <= 0) {
        stopQuestionTimer();
        handleQuestionTimeout();
      }
    }, 1000);
  }

  function stopQuestionTimer() {
    if (state.questionTimerId !== null) {
      clearInterval(state.questionTimerId);
      state.questionTimerId = null;
    }
  }

  function updateTimerUI(remaining, total) {
    const safeRem = Math.max(0, remaining);
    const mins = Math.floor(safeRem / 60);
    const secs = safeRem % 60;
    el.timerClock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const circumference = 113.097;
    const fraction = total > 0 ? safeRem / total : 1;
    const offset = circumference * (1 - fraction);
    el.timerRingCircle.style.strokeDashoffset = String(offset);
    el.questionTimerBarFill.style.width = `${Math.max(0, fraction * 100)}%`;

    el.timerWidget.classList.toggle('timer-warning', safeRem <= 20 && safeRem > 10);
    el.timerWidget.classList.toggle('timer-danger', safeRem <= 10);
  }

  // =========================================================================
  // INSTANT ANSWER CORRECTION (ON SUBMIT OR TIMEOUT)
  // =========================================================================

  function submitCurrentAnswer(isTimeoutOrSkip = false) {
    if (state.isQuestionSubmitted) {
      return;
    }
    stopQuestionTimer();
    state.isQuestionSubmitted = true;

    const q = state.quizQueue[state.currentIndex];
    const userChoice = isTimeoutOrSkip ? null : state.selectedOptionKey;
    const correctKey = q.correctAnswer;
    const isCorrect = !isTimeoutOrSkip && userChoice === correctKey;
    const elapsedSec = Math.max(
      1,
      Math.round((Date.now() - state.questionStartTimestamp) / 1000)
    );

    state.resultsHistory.push({
      questionObj: q,
      userChoice,
      isCorrect,
      isTimeout: isTimeoutOrSkip,
      timeSpentSec: elapsedSec,
    });

    // Lock and Highlight Options
    el.optionsContainer.querySelectorAll('.option-item').forEach((btn) => {
      const key = btn.dataset.key;
      const tag = document.getElementById(`opt-tag-${key}`);
      btn.classList.add('locked');

      if (key === correctKey) {
        btn.classList.add('state-correct-highlight');
        if (tag) {
          tag.textContent =
            key === userChoice ? '✓ ចម្លើយត្រឹមត្រូវរបស់អ្នក' : '★ ចម្លើយត្រឹមត្រូវ (គំនូសពណ៌លឿង)';
          tag.classList.remove('hidden');
        }
      } else if (key === userChoice && !isCorrect) {
        btn.classList.add('state-user-wrong');
        if (tag) {
          tag.textContent = '✕ ចម្លើយដែលអ្នកបានជ្រើសរើស';
          tag.classList.remove('hidden');
        }
      }
    });

    // Find full text of correct option
    const correctOptObj = q.options.find((o) => o.key === correctKey);
    const correctDesc = correctOptObj ? `${correctKey}. ${correctOptObj.text}` : correctKey;

    // Show Correction Banner
    el.correctionBanner.classList.remove('hidden', 'banner-correct', 'banner-wrong', 'banner-timeout');
    if (isCorrect) {
      el.correctionBanner.classList.add('banner-correct');
      el.correctionTitle.textContent = '✓ អបអរសាទរ! ចម្លើយរបស់អ្នកត្រឹមត្រូវ';
      el.correctionDetail.textContent = `ចម្លើយផ្លូវការ៖ ${correctDesc}`;
    } else if (isTimeoutOrSkip) {
      el.correctionBanner.classList.add('banner-timeout');
      el.correctionTitle.textContent =
        state.timeLeftSeconds <= 0 && state.timerSecondsPerQuestion > 0
          ? '⏰ អស់ម៉ោងកំណត់ ១ នាទីហើយ! (Time Out)'
          : '⏭ បានរំលងសំណួរនេះ';
      el.correctionDetail.textContent = `ចម្លើយត្រឹមត្រូវក្នុងសៀវភៅគឺ៖ ${correctDesc}`;
    } else {
      el.correctionBanner.classList.add('banner-wrong');
      el.correctionTitle.textContent = `✕ មិនត្រឹមត្រូវទេ (អ្នកបានជ្រើសរើស «${userChoice}»)`;
      el.correctionDetail.textContent = `ចម្លើយត្រឹមត្រូវក្នុងសៀវភៅគឺ៖ ${correctDesc}`;
    }
    el.correctionSourceBadge.textContent = `គំនូសពណ៌លឿង • ទំព័រ PDF ${toKhmerNum(q.pdfPage)}`;

    // Update HUD Counters immediately
    const correctCount = state.resultsHistory.filter((r) => r.isCorrect).length;
    const timeoutCount = state.resultsHistory.filter((r) => r.isTimeout).length;
    const wrongCount = state.resultsHistory.length - correctCount - timeoutCount;
    el.hudCorrectCount.textContent = toKhmerNum(correctCount);
    el.hudWrongCount.textContent = toKhmerNum(wrongCount);
    el.hudTimeoutCount.textContent = toKhmerNum(timeoutCount);

    // Toggle Footer Buttons
    el.btnSubmitAnswer.classList.add('hidden');
    el.btnSkipQuestion.classList.add('hidden');
    el.btnNextQuestion.classList.remove('hidden');

    renderNavDots();
  }

  function handleQuestionTimeout() {
    submitCurrentAnswer(true);
  }

  function goToNextQuestion() {
    if (state.currentIndex + 1 < state.quizQueue.length) {
      state.currentIndex += 1;
      renderCurrentQuestion();
    } else {
      finishQuizAndShowResults();
    }
  }

  function renderNavDots() {
    const total = state.quizQueue.length;
    const html = [];
    for (let i = 0; i < total; i++) {
      const hist = state.resultsHistory[i];
      let cls = 'nav-dot-item';
      if (i === state.currentIndex) {
        cls += ' current';
      } else if (hist) {
        cls += hist.isCorrect ? ' answered-correct' : ' answered-wrong';
      }
      html.push(`<span class="${cls}" title="សំណួរទី ${i + 1}">${toKhmerNum(i + 1)}</span>`);
    }
    el.navDotsGrid.innerHTML = html.join('');
  }

  // =========================================================================
  // RESULTS & MISTAKE REVIEW
  // =========================================================================

  function finishQuizAndShowResults() {
    stopQuestionTimer();
    const total = state.resultsHistory.length || 1;
    const correct = state.resultsHistory.filter((r) => r.isCorrect).length;
    const timeout = state.resultsHistory.filter((r) => r.isTimeout).length;
    const wrong = state.resultsHistory.length - correct - timeout;
    const pct = Math.round((correct / total) * 100);
    const totalTime = state.resultsHistory.reduce((acc, r) => acc + r.timeSpentSec, 0);
    const avgTime = Math.round(totalTime / total);

    el.resPercentage.textContent = `${pct}%`;
    el.resCorrect.textContent = toKhmerNum(correct);
    el.resWrong.textContent = toKhmerNum(wrong);
    el.resTimeout.textContent = toKhmerNum(timeout);
    el.resAvgTime.textContent = `${toKhmerNum(avgTime)} វិនាទី`;

    const modeText =
      state.orderMode === 'random' ? 'លំដាប់ចៃដន្យ (Random)' : 'តាមលំដាប់លេខរៀង (Sequence)';
    el.resSessionMeta.textContent = `${modeText} • សរុប ${toKhmerNum(state.resultsHistory.length)} សំណួរ`;

    if (pct >= 80) {
      el.resGradeTag.textContent = 'ល្អប្រសើរណាស់!';
      el.resFeedbackMsg.textContent = `អបអរសាទរ! អ្នកឆ្លើយត្រូវ ${toKhmerNum(correct)} ក្នុងចំណោម ${toKhmerNum(state.resultsHistory.length)} សំណួរ។ ត្រៀមខ្លួនបានយ៉ាងល្អសម្រាប់ការប្រឡង!`;
    } else if (pct >= 50) {
      el.resGradeTag.textContent = 'មធ្យម — គួរហ្វឹកហាត់បន្ថែម';
      el.resFeedbackMsg.textContent = `អ្នកឆ្លើយត្រូវ ${toKhmerNum(correct)} ក្នុងចំណោម ${toKhmerNum(state.resultsHistory.length)} សំណួរ។ សូមពិនិត្យមើលសំណួរដែលខុសខាងក្រោម ហើយសាកល្បងធ្វើម្ដងទៀត។`;
    } else {
      el.resGradeTag.textContent = 'ត្រូវការរំលឹកមេរៀនបន្ថែម';
      el.resFeedbackMsg.textContent = `អ្នកឆ្លើយត្រូវ ${toKhmerNum(correct)} ក្នុងចំណោម ${toKhmerNum(state.resultsHistory.length)} សំណួរ។ សូមពិនិត្យចម្លើយគំនូសពណ៌លឿងខាងក្រោមដើម្បីចងចាំចម្លើយត្រឹមត្រូវ។`;
    }

    const mistakesCount = wrong + timeout;
    el.btnRetryMistakes.disabled = mistakesCount === 0;
    el.btnRetryMistakesLabel.textContent =
      mistakesCount > 0
        ? `ធ្វើម្ដងទៀតចំពោះសំណួរខុស (${toKhmerNum(mistakesCount)} សំណួរ)`
        : 'ឆ្លើយត្រូវទាំងអស់!';

    state.reviewFilter = 'all';
    el.revFilterBtns.forEach((b) => b.classList.toggle('active', b.dataset.filter === 'all'));
    renderReviewCards();
    showView('results');
  }

  function renderReviewCards() {
    const filtered = state.resultsHistory.filter((item) => {
      if (state.reviewFilter === 'correct') return item.isCorrect;
      if (state.reviewFilter === 'wrong') return !item.isCorrect;
      return true;
    });

    if (filtered.length === 0) {
      el.reviewCardsContainer.innerHTML = `
        <div class="review-card" style="text-align:center; color: var(--text-secondary);">
          មិនមានសំណួរក្នុងប្រភេទនេះទេ។
        </div>
      `;
      return;
    }

    el.reviewCardsContainer.innerHTML = filtered
      .map((item, idx) => {
        const q = item.questionObj;
        const statusBadge = item.isCorrect
          ? `<span class="score-pill pill-correct">✓ ឆ្លើយត្រូវ (${toKhmerNum(item.timeSpentSec)}s)</span>`
          : item.isTimeout
          ? `<span class="score-pill pill-timeout">⏰ ផុតម៉ោង / រំលង</span>`
          : `<span class="score-pill pill-wrong">✕ ឆ្លើយខុស (ជ្រើសរើស ${item.userChoice})</span>`;

        const optionsHtml = q.options
          .map((opt) => {
            const isCorrectOpt = opt.key === q.correctAnswer;
            const isUserWrong = !item.isCorrect && opt.key === item.userChoice;
            let rowCls = 'review-opt-row';
            if (isCorrectOpt) rowCls += ' is-correct-yellow';
            else if (isUserWrong) rowCls += ' is-user-wrong';

            const tag = isCorrectOpt
              ? ' <span style="margin-left:auto; font-size:0.78rem; color:var(--correct-text);">★ ចម្លើយគំនូសពណ៌លឿង</span>'
              : isUserWrong
              ? ' <span style="margin-left:auto; font-size:0.78rem;">✕ ចម្លើយរបស់អ្នក</span>'
              : '';

            return `
              <div class="${rowCls}">
                <strong>${opt.key}.</strong>
                <span>${opt.text}</span>
                ${tag}
              </div>
            `;
          })
          .join('');

        return `
          <article class="review-card">
            <div class="review-card-top">
              <span class="hud-badge hud-mode-badge">សំណួរដើម #${q.numberKh} • ${q.sectionTitle} (ទំព័រ PDF ${toKhmerNum(q.pdfPage)})</span>
              ${statusBadge}
            </div>
            <h4 class="review-q-title">${q.numberKh}. ${q.question}</h4>
            <div class="review-options-list">${optionsHtml}</div>
          </article>
        `;
      })
      .join('');
  }

  // =========================================================================
  // FULL QUESTION BANK & ANSWER KEY BROWSER
  // =========================================================================

  function populateBrowseCategorySelect() {
    const opts = [
      `<option value="all">គ្រប់ជំពូក និងវិញ្ញាសាទាំងអស់ (${toKhmerNum(state.allQuestions.length)} សំណួរ)</option>`,
    ];
    state.categories.forEach((c) => {
      opts.push(`<option value="${c.id}">${c.title} (${toKhmerNum(c.count)} សំណួរ)</option>`);
    });
    el.browseCategorySelect.innerHTML = opts.join('');
  }

  function renderBrowseQuestions() {
    const query = (el.browseSearchInput.value || '').trim().toLowerCase();
    const catId = el.browseCategorySelect.value;

    const matched = state.allQuestions.filter((q) => {
      if (catId !== 'all' && q.sectionId !== catId) return false;
      if (!query) return true;
      if (String(q.number) === query || q.numberKh === query) return true;
      if (q.question.toLowerCase().includes(query)) return true;
      return q.options.some((o) => o.text.toLowerCase().includes(query));
    });

    const visible = matched.slice(0, state.browseLimit);
    el.browseResultsInfo.textContent = `រកឃើញ ${toKhmerNum(matched.length)} សំណួរ (កំពុងបង្ហាញ ${toKhmerNum(visible.length)} សំណួរ)`;
    el.btnBrowseLoadMore.classList.toggle('hidden', visible.length >= matched.length);

    el.browseCardsContainer.innerHTML = visible
      .map((q) => {
        const optionsHtml = q.options
          .map((opt) => {
            const isCorrectOpt = opt.key === q.correctAnswer;
            return `
              <div class="review-opt-row ${isCorrectOpt ? 'is-correct-yellow' : ''}">
                <strong>${opt.key}.</strong>
                <span>${opt.text}</span>
                ${
                  isCorrectOpt
                    ? '<span style="margin-left:auto; font-size:0.78rem; color:var(--correct-text);">★ ចម្លើយគំនូសពណ៌លឿង</span>'
                    : ''
                }
              </div>
            `;
          })
          .join('');

        return `
          <article class="review-card">
            <div class="review-card-top">
              <span class="hud-badge hud-mode-badge">សំណួរ #${q.numberKh} • ${q.sectionTitle}</span>
              <span class="correction-source-badge">ទំព័រ PDF ${toKhmerNum(q.pdfPage)}</span>
            </div>
            <h4 class="review-q-title">${q.numberKh}. ${q.question}</h4>
            <div class="review-options-list">${optionsHtml}</div>
          </article>
        `;
      })
      .join('');
  }

  // =========================================================================
  // EVENT BINDINGS & KEYBOARD SHORTCUTS
  // =========================================================================

  function bindEvents() {
    el.brandHomeTrigger.addEventListener('click', () => showView('setup'));

    // Browse View
    el.btnOpenBrowse.addEventListener('click', () => {
      state.browseLimit = 80;
      renderBrowseQuestions();
      showView('browse');
    });
    el.btnCloseBrowse.addEventListener('click', () => showView('setup'));
    el.browseSearchInput.addEventListener('input', () => {
      state.browseLimit = 80;
      renderBrowseQuestions();
    });
    el.browseCategorySelect.addEventListener('change', () => {
      state.browseLimit = 80;
      renderBrowseQuestions();
    });
    el.btnBrowseLoadMore.addEventListener('click', () => {
      state.browseLimit += 80;
      renderBrowseQuestions();
    });

    // Hero Quick Presets (1-100 Random & 1-100 Sequence)
    el.presetRandom100.addEventListener('click', () => {
      state.categoryGroupTab = 'bank-1200';
      state.selectedCategoryId = 'bank-all';
      state.sessionCount = 100;
      state.timerSecondsPerQuestion = 60;
      setOrderMode('random');
      setRangeValues(1, 100);
      renderCategoryList();
      updateLaunchSummary();
      startQuizSession();
    });

    el.presetSeq100.addEventListener('click', () => {
      state.categoryGroupTab = 'bank-1200';
      state.selectedCategoryId = 'bank-all';
      state.sessionCount = 100;
      state.timerSecondsPerQuestion = 60;
      setOrderMode('sequence');
      setRangeValues(1, 100);
      renderCategoryList();
      updateLaunchSummary();
      startQuizSession();
    });

    // Order Mode Toggle (Random vs Sequence)
    el.modeBtnRandom.addEventListener('click', () => setOrderMode('random'));
    el.modeBtnSequence.addEventListener('click', () => setOrderMode('sequence'));

    // Range Inputs & Quick Range Chips
    el.inputRangeStart.addEventListener('input', () => {
      state.rangeStart = Math.max(1, Number(el.inputRangeStart.value) || 1);
      updateLaunchSummary();
    });
    el.inputRangeEnd.addEventListener('input', () => {
      state.rangeEnd = Math.max(state.rangeStart, Number(el.inputRangeEnd.value) || 100);
      updateLaunchSummary();
    });
    el.rangeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const s = Number(chip.dataset.start);
        const e = Number(chip.dataset.end);
        const pool = getPoolBySelectedCategory();
        const maxNum = pool.reduce((m, q) => Math.max(m, q.number), pool.length);
        setRangeValues(s, e === 9999 ? maxNum : e);
        updateLaunchSummary();
      });
    });

    // Session Question Count Buttons
    el.countBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.sessionCount = btn.dataset.count === 'all' ? 'all' : Number(btn.dataset.count);
        el.countBtns.forEach((b) => b.classList.toggle('active', b === btn));
        updateLaunchSummary();
      });
    });

    // Timer Duration Buttons
    el.timerBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.timerSecondsPerQuestion = Number(btn.dataset.seconds);
        el.timerBtns.forEach((b) => b.classList.toggle('active', b === btn));
        updateLaunchSummary();
      });
    });

    // Category Tabs
    el.catTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        state.categoryGroupTab = tab.dataset.group;
        el.catTabs.forEach((t) => t.classList.toggle('active', t === tab));
        if (state.categoryGroupTab === 'bank-1200') {
          state.selectedCategoryId = 'bank-all';
          setRangeValues(1, 100);
        } else if (state.categoryGroupTab === 'past-exams') {
          state.selectedCategoryId = 'exam-kramkar-7';
          setRangeValues(1, 40);
        } else {
          state.selectedCategoryId = 'all-pools';
          setRangeValues(1, 100);
        }
        renderCategoryList();
        updateLaunchSummary();
      });
    });

    // Start Quiz Button
    el.btnStartQuiz.addEventListener('click', () => startQuizSession());

    // Quiz Actions
    el.btnQuitQuiz.addEventListener('click', () => {
      if (state.resultsHistory.length > 0) {
        finishQuizAndShowResults();
      } else {
        showView('setup');
      }
    });
    el.btnSubmitAnswer.addEventListener('click', () => submitCurrentAnswer(false));
    el.btnSkipQuestion.addEventListener('click', () => submitCurrentAnswer(true));
    el.btnNextQuestion.addEventListener('click', () => goToNextQuestion());

    // Results Actions
    el.btnRetryMistakes.addEventListener('click', () => {
      const mistakeQuestions = state.resultsHistory
        .filter((r) => !r.isCorrect)
        .map((r) => r.questionObj);
      if (mistakeQuestions.length > 0) {
        startQuizSession(mistakeQuestions);
      }
    });
    el.btnRestartSame.addEventListener('click', () => startQuizSession());
    el.btnBackHome.addEventListener('click', () => showView('setup'));

    el.revFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.reviewFilter = btn.dataset.filter;
        el.revFilterBtns.forEach((b) => b.classList.toggle('active', b === btn));
        renderReviewCards();
      });
    });

    // Keyboard Shortcuts during Active Quiz
    window.addEventListener('keydown', (e) => {
      if (el.quizView.classList.contains('hidden')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      const q = state.quizQueue[state.currentIndex];
      if (!q) return;

      // 1-5 keys to select options ក, ខ, គ, ឃ, ង
      if (!state.isQuestionSubmitted && ['1', '2', '3', '4', '5'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (q.options[idx]) {
          e.preventDefault();
          handleSelectOption(q.options[idx].key);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!state.isQuestionSubmitted && state.selectedOptionKey) {
          submitCurrentAnswer(false);
        } else if (state.isQuestionSubmitted) {
          goToNextQuestion();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

/**
 * Bill Splitter - Pure Vanilla JavaScript (ES6+)
 * Robust edge-case handling, exact penny math, and LocalStorage persistence.
 */

(function () {
  'use strict';

  // --- STORAGE KEYS ---
  const STORAGE_KEY_CURRENT = 'bill_splitter_current_draft';
  const STORAGE_KEY_HISTORY = 'bill_splitter_history_ledger';

  // --- DOM ELEMENTS ---
  const tabCalculator = document.getElementById('tab-calculator');
  const tabHistory = document.getElementById('tab-history');
  const viewCalculator = document.getElementById('view-calculator');
  const viewHistory = document.getElementById('view-history');
  const historyCountBadge = document.getElementById('history-count');

  // Alert Banner
  const alertBanner = document.getElementById('alert-banner');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  const alertCloseBtn = document.getElementById('alert-close-btn');

  // Presets Menu
  const btnTogglePresets = document.getElementById('btn-toggle-presets');
  const presetsMenu = document.getElementById('presets-menu');

  // Form & Inputs
  const billForm = document.getElementById('bill-form');
  const occasionInput = document.getElementById('occasion-name');
  const dateInput = document.getElementById('bill-date');
  const amountInput = document.getElementById('bill-amount');
  const currencySelect = document.getElementById('currency-select');
  const currencySymbolDisplay = document.getElementById('currency-symbol-display');
  const numPeopleInput = document.getElementById('num-people');
  const btnDecreasePeople = document.getElementById('btn-decrease-people');
  const btnIncreasePeople = document.getElementById('btn-increase-people');

  // Inline error message elements
  const errOccasion = document.getElementById('err-occasion');
  const errDate = document.getElementById('err-date');
  const errAmount = document.getElementById('err-amount');
  const errPeopleCount = document.getElementById('err-people-count');

  // Tip calculator elements
  const btnToggleTipCalc = document.getElementById('btn-toggle-tip-calc');
  const tipCalcContent = document.getElementById('tip-calc-content');
  const tipAccordionSummary = document.getElementById('tip-accordion-summary');
  const subtotalInput = document.getElementById('subtotal-amount');
  const computedTipAmount = document.getElementById('computed-tip-amount');
  const btnApplyTipToBill = document.getElementById('btn-apply-tip-to-bill');
  const tipChips = document.querySelectorAll('.tip-chip');

  // People & Payments
  const singlePayerSection = document.getElementById('single-payer-section');
  const singlePayerSelect = document.getElementById('single-payer-select');
  const peopleListContainer = document.getElementById('people-list-container');
  const paidSumIndicator = document.getElementById('paid-sum-indicator');
  const paidProgressBarWrap = document.getElementById('paid-progress-bar-wrap');
  const paidProgressFill = document.getElementById('paid-progress-fill');
  const paidProgressText = document.getElementById('paid-progress-text');
  const participantsCountDisplay = document.getElementById('participants-count-display');

  const btnAddPerson = document.getElementById('btn-add-person');
  const btnAutoFill = document.getElementById('btn-quick-auto-fill');
  const btnResetForm = document.getElementById('btn-reset-form');
  const btnQuickClear = document.getElementById('btn-quick-clear');
  const btnPlaceholderSample = document.getElementById('btn-placeholder-sample');

  // Results
  const resultPlaceholder = document.getElementById('result-placeholder');
  const resultCard = document.getElementById('result-card');
  const resOccasionName = document.getElementById('res-occasion-name');
  const resOccasionDate = document.getElementById('res-occasion-date');
  const resTotalAmount = document.getElementById('res-total-amount');
  const mathCheckText = document.getElementById('math-check-text');
  const sharePerPersonSubtext = document.getElementById('share-per-person-subtext');
  const sharesCountBadge = document.getElementById('shares-count-badge');
  const sharesList = document.getElementById('shares-list');
  const settlementCountBadge = document.getElementById('settlement-count-badge');
  const settlementsList = document.getElementById('settlements-list');
  const btnSaveBill = document.getElementById('btn-save-bill');
  const btnCopySummary = document.getElementById('btn-copy-summary');
  const btnPrintBill = document.getElementById('btn-print-bill');

  // History & Stats
  const historyEmptyState = document.getElementById('history-empty-state');
  const historyListContainer = document.getElementById('history-list-container');
  const historyFilter = document.getElementById('history-filter');
  const historySearch = document.getElementById('history-search');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnGotoCalculator = document.getElementById('btn-goto-calculator');
  const pendingSummaryCard = document.getElementById('pending-summary-card');
  const globalPendingAmount = document.getElementById('global-pending-amount');
  const pendingBreakdownList = document.getElementById('pending-breakdown-list');

  const statTotalBills = document.getElementById('stat-total-bills');
  const statTotalAmount = document.getElementById('stat-total-amount');
  const statTotalPending = document.getElementById('stat-total-pending');
  const statTotalSettled = document.getElementById('stat-total-settled');

  const toast = document.getElementById('toast');

  // --- STATE ---
  let people = [
    { id: 1, name: 'Alice', paid: 0 },
    { id: 2, name: 'Bob', paid: 0 },
    { id: 3, name: 'Charlie', paid: 0 },
  ];
  let currentCalculation = null;
  let savedHistory = [];
  let selectedTipPercent = 0;

  // --- INITIALIZATION ---
  function init() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    loadHistoryFromStorage();
    loadDraftFromStorage();

    attachEventListeners();
    updateCurrencySymbol();
    renderPeopleInputs();
    updateHistoryBadge();
    updateHistoryStats();

    // If an active calculation was preserved, restore it immediately
    if (currentCalculation) {
      displayCalculationResult(currentCalculation);
    }
  }

  // --- EVENT LISTENERS ---
  function attachEventListeners() {
    // Tab switching
    tabCalculator.addEventListener('click', () => switchTab('calculator'));
    tabHistory.addEventListener('click', () => {
      switchTab('history');
      renderHistoryView();
    });
    btnGotoCalculator.addEventListener('click', () => switchTab('calculator'));

    // Alert Banner Close
    alertCloseBtn.addEventListener('click', hideAlert);

    // Presets dropdown toggle
    btnTogglePresets.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = presetsMenu.classList.contains('hidden');
      if (isHidden) {
        presetsMenu.classList.remove('hidden');
        btnTogglePresets.setAttribute('aria-expanded', 'true');
      } else {
        presetsMenu.classList.add('hidden');
        btnTogglePresets.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (!presetsMenu.contains(e.target) && e.target !== btnTogglePresets) {
        presetsMenu.classList.add('hidden');
        btnTogglePresets.setAttribute('aria-expanded', 'false');
      }
    });

    // Preset options click
    document.querySelectorAll('.preset-item').forEach((item) => {
      item.addEventListener('click', () => {
        const presetKey = item.dataset.preset;
        loadPreset(presetKey);
        presetsMenu.classList.add('hidden');
        btnTogglePresets.setAttribute('aria-expanded', 'false');
      });
    });

    if (btnPlaceholderSample) {
      btnPlaceholderSample.addEventListener('click', () => loadPreset('dinner'));
    }

    // Quick Amount Chips
    document.querySelectorAll('.amount-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        amountInput.value = chip.dataset.val;
        clearInlineError(amountInput, errAmount);
        hideAlert();
        syncSinglePayerAmounts();
        updatePaidSumIndicator();
        saveDraftToStorage();
      });
    });

    // Currency Change
    currencySelect.addEventListener('change', () => {
      updateCurrencySymbol();
      updatePaidSumIndicator();
      if (currentCalculation) {
        currentCalculation.currencyCode = currencySelect.value;
        currentCalculation.currencySymbol = getSelectedCurrency().symbol;
        displayCalculationResult(currentCalculation);
      }
      saveDraftToStorage();
    });

    // Tip Calculator Accordion
    btnToggleTipCalc.addEventListener('click', toggleTipCalculator);
    subtotalInput.addEventListener('input', calculateTip);
    tipChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        tipChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        selectedTipPercent = parseFloat(chip.dataset.tip) || 0;
        calculateTip();
      });
    });
    btnApplyTipToBill.addEventListener('click', applyTipToBill);

    // Stepper buttons for people count
    btnDecreasePeople.addEventListener('click', () => {
      let count = parseInt(numPeopleInput.value, 10) || 1;
      if (count > 1) {
        numPeopleInput.value = count - 1;
        adjustPeopleCount(count - 1);
      }
    });

    btnIncreasePeople.addEventListener('click', () => {
      let count = parseInt(numPeopleInput.value, 10) || 1;
      if (count < 50) {
        numPeopleInput.value = count + 1;
        adjustPeopleCount(count + 1);
      }
    });

    numPeopleInput.addEventListener('input', (e) => {
      let count = parseInt(e.target.value, 10);
      if (!isNaN(count) && count >= 1 && count <= 50) {
        clearInlineError(numPeopleInput, errPeopleCount);
        adjustPeopleCount(count);
      }
    });

    // Payment mode change
    const modeRadios = document.querySelectorAll('input[name="payment-mode"]');
    modeRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        handlePaymentModeChange();
        saveDraftToStorage();
      });
    });

    // Add person button
    btnAddPerson.addEventListener('click', () => {
      const newId = people.length > 0 ? Math.max(...people.map((p) => p.id)) + 1 : 1;
      people.push({
        id: newId,
        name: `Person ${people.length + 1}`,
        paid: 0,
      });
      numPeopleInput.value = people.length;
      clearInlineError(numPeopleInput, errPeopleCount);
      renderPeopleInputs();
      saveDraftToStorage();
    });

    // Single payer select change
    singlePayerSelect.addEventListener('change', () => {
      syncSinglePayerAmounts();
      saveDraftToStorage();
    });

    // Auto-fill remainder button
    if (btnAutoFill) {
      btnAutoFill.addEventListener('click', autoFillRemainder);
    }

    // Input listeners for error clearing & draft saving
    amountInput.addEventListener('input', () => {
      clearInlineError(amountInput, errAmount);
      hideAlert();
      syncSinglePayerAmounts();
      updatePaidSumIndicator();
      saveDraftToStorage();
    });

    occasionInput.addEventListener('input', () => {
      clearInlineError(occasionInput, errOccasion);
      hideAlert();
      saveDraftToStorage();
    });

    dateInput.addEventListener('change', () => {
      clearInlineError(dateInput, errDate);
      hideAlert();
      saveDraftToStorage();
    });

    // Form submit -> calculate
    billForm.addEventListener('submit', (e) => {
      e.preventDefault();
      calculateBill();
    });

    // Reset Form
    btnResetForm.addEventListener('click', resetForm);
    if (btnQuickClear) {
      btnQuickClear.addEventListener('click', resetForm);
    }

    // Actions
    btnSaveBill.addEventListener('click', saveCurrentBillToHistory);
    btnCopySummary.addEventListener('click', copySummaryToClipboard);
    if (btnPrintBill) {
      btnPrintBill.addEventListener('click', () => window.print());
    }

    // History controls
    historyFilter.addEventListener('change', renderHistoryView);
    historySearch.addEventListener('input', renderHistoryView);
    btnClearHistory.addEventListener('click', clearAllHistory);
  }

  // --- NAVIGATION TABS ---
  function switchTab(target) {
    if (target === 'calculator') {
      tabCalculator.classList.add('active');
      tabHistory.classList.remove('active');
      viewCalculator.classList.add('active');
      viewHistory.classList.remove('active');
    } else {
      tabHistory.classList.add('active');
      tabCalculator.classList.remove('active');
      viewHistory.classList.add('active');
      viewCalculator.classList.remove('active');
    }
  }

  // --- CURRENCY HELPER ---
  function getSelectedCurrency() {
    const selected = currencySelect.options[currencySelect.selectedIndex];
    return {
      code: selected.value,
      symbol: selected.getAttribute('data-symbol') || '$',
    };
  }

  function updateCurrencySymbol() {
    const { symbol } = getSelectedCurrency();
    currencySymbolDisplay.textContent = symbol;
    document.querySelectorAll('.person-paid-prefix').forEach((el) => {
      el.textContent = symbol;
    });
  }

  function formatMoney(amount, symbol) {
    const sym = symbol !== undefined ? symbol : getSelectedCurrency().symbol;
    const num = Number(amount);
    return `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // --- TIP CALCULATOR ---
  function toggleTipCalculator() {
    const isHidden = tipCalcContent.classList.contains('hidden');
    if (isHidden) {
      tipCalcContent.classList.remove('hidden');
      btnToggleTipCalc.setAttribute('aria-expanded', 'true');
      if (amountInput.value && !subtotalInput.value) {
        subtotalInput.value = amountInput.value;
        calculateTip();
      }
    } else {
      tipCalcContent.classList.add('hidden');
      btnToggleTipCalc.setAttribute('aria-expanded', 'false');
    }
  }

  function calculateTip() {
    const subtotal = parseFloat(subtotalInput.value) || 0;
    const { symbol } = getSelectedCurrency();
    const tipAmount = subtotal * (selectedTipPercent / 100);
    computedTipAmount.textContent = formatMoney(tipAmount, symbol);
    tipAccordionSummary.textContent = selectedTipPercent > 0 ? `${selectedTipPercent}% Tip (+${formatMoney(tipAmount, symbol)})` : 'None';
  }

  function applyTipToBill() {
    const subtotal = parseFloat(subtotalInput.value) || 0;
    const tipAmount = subtotal * (selectedTipPercent / 100);
    const total = subtotal + tipAmount;

    if (total <= 0) {
      showAlert('Input Error', 'Please enter a valid subtotal first.');
      return;
    }

    amountInput.value = total.toFixed(2);
    clearInlineError(amountInput, errAmount);
    syncSinglePayerAmounts();
    updatePaidSumIndicator();
    saveDraftToStorage();
    tipCalcContent.classList.add('hidden');
    btnToggleTipCalc.setAttribute('aria-expanded', 'false');
    showToast(`Applied ${formatMoney(total)} (subtotal + tip) to total bill!`);
  }

  // --- PEOPLE MANAGEMENT ---
  function adjustPeopleCount(targetCount) {
    if (targetCount < 1 || targetCount > 50) return;

    const defaultNames = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'];

    while (people.length < targetCount) {
      const newId = people.length > 0 ? Math.max(...people.map((p) => p.id)) + 1 : 1;
      const suggestedName = defaultNames[people.length] || `Person ${people.length + 1}`;
      people.push({
        id: newId,
        name: suggestedName,
        paid: 0,
      });
    }

    if (people.length > targetCount) {
      people = people.slice(0, targetCount);
    }

    renderPeopleInputs();
    saveDraftToStorage();
  }

  function getPaymentMode() {
    const checked = document.querySelector('input[name="payment-mode"]:checked');
    return checked ? checked.value : 'single';
  }

  function handlePaymentModeChange() {
    const mode = getPaymentMode();
    if (mode === 'single') {
      singlePayerSection.classList.remove('hidden');
      paidProgressBarWrap.classList.add('hidden');
      syncSinglePayerAmounts();
    } else if (mode === 'multiple') {
      singlePayerSection.classList.add('hidden');
      paidProgressBarWrap.classList.remove('hidden');
    } else if (mode === 'equal') {
      singlePayerSection.classList.add('hidden');
      paidProgressBarWrap.classList.add('hidden');
      syncEqualPayments();
    }
    renderPeopleInputs();
  }

  function syncSinglePayerAmounts() {
    const mode = getPaymentMode();
    if (mode !== 'single') return;

    const total = parseFloat(amountInput.value) || 0;
    const selectedPayerId = parseInt(singlePayerSelect.value, 10);

    people.forEach((p) => {
      p.paid = p.id === selectedPayerId ? total : 0;
    });

    updatePaidSumIndicator();
  }

  function syncEqualPayments() {
    const total = parseFloat(amountInput.value) || 0;
    const n = people.length;
    if (n === 0) return;

    const totalCents = Math.round(total * 100);
    const baseCents = Math.floor(totalCents / n);
    const remainder = totalCents % n;

    people.forEach((p, idx) => {
      const shareCents = baseCents + (idx < remainder ? 1 : 0);
      p.paid = shareCents / 100;
    });

    updatePaidSumIndicator();
  }

  function autoFillRemainder() {
    const total = parseFloat(amountInput.value) || 0;
    if (total <= 0) {
      showInlineError(amountInput, errAmount, 'Please enter a valid bill amount first');
      showAlert('Bill Amount Missing', 'Please enter a total bill amount greater than 0 first.');
      return;
    }

    let currentPaid = 0;
    for (let i = 0; i < people.length - 1; i++) {
      currentPaid += Number(people[i].paid) || 0;
    }

    const remaining = Math.max(0, total - currentPaid);
    people[people.length - 1].paid = parseFloat(remaining.toFixed(2));
    renderPeopleInputs();
    updatePaidSumIndicator();
    hideAlert();
    showToast(`Assigned remainder ${formatMoney(remaining)} to ${people[people.length - 1].name}`);
  }

  function renderPeopleInputs() {
    const mode = getPaymentMode();
    const { symbol } = getSelectedCurrency();

    participantsCountDisplay.textContent = `${people.length} Participant${people.length === 1 ? '' : 's'}`;

    const currentSelectedId = parseInt(singlePayerSelect.value, 10);
    singlePayerSelect.innerHTML = '';
    people.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === currentSelectedId) opt.selected = true;
      singlePayerSelect.appendChild(opt);
    });

    peopleListContainer.innerHTML = '';

    people.forEach((person, index) => {
      const row = document.createElement('div');
      row.className = `person-row ${mode === 'multiple' ? 'custom-mode' : ''}`;
      row.dataset.personId = person.id;
      row.setAttribute('role', 'listitem');

      const avatar = document.createElement('div');
      avatar.className = `person-avatar-circle avatar-color-${index % 6}`;
      avatar.textContent = person.name.charAt(0).toUpperCase() || (index + 1);

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'form-input person-name-input';
      nameInput.value = person.name;
      nameInput.placeholder = `Person ${index + 1} Name`;
      nameInput.setAttribute('aria-label', `Name for Person ${index + 1}`);
      nameInput.addEventListener('input', (e) => {
        person.name = e.target.value.trim() || `Person ${index + 1}`;
        avatar.textContent = person.name.charAt(0).toUpperCase();
        const opt = singlePayerSelect.querySelector(`option[value="${person.id}"]`);
        if (opt) opt.textContent = person.name;
        saveDraftToStorage();
      });

      row.appendChild(avatar);
      row.appendChild(nameInput);

      if (mode === 'multiple') {
        const paidWrap = document.createElement('div');
        paidWrap.className = 'person-paid-input-wrap';

        const prefix = document.createElement('span');
        prefix.className = 'person-paid-prefix';
        prefix.textContent = symbol;

        const paidInput = document.createElement('input');
        paidInput.type = 'number';
        paidInput.step = '0.01';
        paidInput.min = '0';
        paidInput.className = 'form-input person-paid-input font-mono';
        paidInput.value = person.paid > 0 ? person.paid : '';
        paidInput.placeholder = '0.00';
        paidInput.setAttribute('aria-label', `Amount paid upfront by ${person.name}`);
        paidInput.addEventListener('input', (e) => {
          let val = parseFloat(e.target.value) || 0;
          if (val < 0) val = 0; // Prevent negative inputs
          person.paid = val;
          updatePaidSumIndicator();
          saveDraftToStorage();
        });

        paidWrap.appendChild(prefix);
        paidWrap.appendChild(paidInput);
        row.appendChild(paidWrap);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'person-remove-btn';
      removeBtn.title = `Remove ${person.name}`;
      removeBtn.setAttribute('aria-label', `Remove ${person.name}`);
      removeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      if (people.length <= 1) {
        removeBtn.style.visibility = 'hidden';
      } else {
        removeBtn.addEventListener('click', () => {
          people = people.filter((p) => p.id !== person.id);
          numPeopleInput.value = people.length;
          renderPeopleInputs();
          syncSinglePayerAmounts();
          saveDraftToStorage();
        });
      }

      row.appendChild(removeBtn);
      peopleListContainer.appendChild(row);
    });

    updatePaidSumIndicator();
  }

  function updatePaidSumIndicator() {
    const mode = getPaymentMode();
    const billTotal = parseFloat(amountInput.value) || 0;

    if (mode !== 'multiple') {
      paidSumIndicator.textContent = '';
      paidProgressBarWrap.classList.add('hidden');
      return;
    }

    paidProgressBarWrap.classList.remove('hidden');
    const currentTotalPaid = people.reduce((acc, p) => acc + (Number(p.paid) || 0), 0);
    const diff = currentTotalPaid - billTotal;

    const percent = billTotal > 0 ? Math.min(100, Math.max(0, (currentTotalPaid / billTotal) * 100)) : 0;
    paidProgressFill.style.width = `${percent}%`;
    paidProgressText.textContent = `Assigned: ${formatMoney(currentTotalPaid)} / ${formatMoney(billTotal)}`;

    paidProgressFill.classList.remove('matched', 'overflow');

    if (Math.abs(diff) < 0.009 && billTotal > 0) {
      paidSumIndicator.className = 'people-subtext matched';
      paidSumIndicator.textContent = `Paid: ${formatMoney(currentTotalPaid)} (Balanced ✓)`;
      paidProgressFill.classList.add('matched');
    } else if (diff < 0) {
      paidSumIndicator.className = 'people-subtext mismatch';
      paidSumIndicator.textContent = `${formatMoney(Math.abs(diff))} remaining to balance`;
    } else {
      paidSumIndicator.className = 'people-subtext mismatch';
      paidSumIndicator.textContent = `${formatMoney(diff)} over total bill`;
      paidProgressFill.classList.add('overflow');
    }
  }

  // --- ERROR HANDLING & VALIDATION ---
  function showInlineError(inputEl, msgEl, text) {
    if (inputEl) inputEl.classList.add('input-error');
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.classList.remove('hidden');
    }
  }

  function clearInlineError(inputEl, msgEl) {
    if (inputEl) inputEl.classList.remove('input-error');
    if (msgEl) msgEl.classList.add('hidden');
  }

  function clearAllErrors() {
    clearInlineError(occasionInput, errOccasion);
    clearInlineError(dateInput, errDate);
    clearInlineError(amountInput, errAmount);
    clearInlineError(numPeopleInput, errPeopleCount);
    hideAlert();
  }

  function showAlert(title, msg) {
    alertTitle.textContent = title || 'Validation Error';
    alertMessage.textContent = msg;
    alertBanner.classList.remove('hidden');
    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    alertBanner.classList.add('hidden');
  }

  // --- CALCULATION LOGIC ---
  function calculateBill() {
    clearAllErrors();

    const occasion = occasionInput.value.trim();
    let dateVal = dateInput.value;
    const billAmount = parseFloat(amountInput.value);
    const numPeople = parseInt(numPeopleInput.value, 10);
    const { code: currencyCode, symbol: currencySymbol } = getSelectedCurrency();
    const mode = getPaymentMode();

    let hasErrors = false;

    // EDGE CASE 1: Bill Amount validation (empty, zero, negative, or NaN)
    if (isNaN(billAmount) || billAmount <= 0) {
      showInlineError(amountInput, errAmount, 'Please enter a bill amount greater than 0');
      showAlert('Invalid Bill Amount', 'Bill amount cannot be empty, zero, or negative. Please enter a positive amount.');
      clearResult();
      hasErrors = true;
    }

    // EDGE CASE 2: Number of people validation (empty, zero, negative, float)
    if (isNaN(numPeople) || numPeople <= 0 || !Number.isInteger(numPeople)) {
      showInlineError(numPeopleInput, errPeopleCount, 'Number of people must be at least 1');
      if (!hasErrors) {
        showAlert('Invalid Participant Count', 'Number of people cannot be empty, zero, or negative. Please enter a valid number (at least 1).');
      }
      clearResult();
      hasErrors = true;
    }

    // EDGE CASE 3: Occasion validation
    if (!occasion) {
      showInlineError(occasionInput, errOccasion, 'Please enter an occasion name');
      if (!hasErrors) {
        showAlert('Occasion Required', 'Please enter an occasion name (e.g., "Dinner with Friends", "Road Trip").');
      }
      clearResult();
      hasErrors = true;
    }

    // EDGE CASE 4: Date fallback
    if (!dateVal) {
      dateVal = new Date().toISOString().split('T')[0];
      dateInput.value = dateVal;
    }

    if (hasErrors) return;

    // EDGE CASE 5: Multiple payers mismatch
    if (mode === 'single') {
      const payerId = parseInt(singlePayerSelect.value, 10);
      people.forEach((p) => {
        p.paid = p.id === payerId ? billAmount : 0;
      });
    } else if (mode === 'equal') {
      syncEqualPayments();
    } else if (mode === 'multiple') {
      const totalPaid = people.reduce((acc, p) => acc + (Number(p.paid) || 0), 0);
      const diff = Math.abs(totalPaid - billAmount);
      if (diff > 0.05) {
        showAlert(
          'Payment Mismatch',
          `Total assigned to participants (${formatMoney(totalPaid, currencySymbol)}) does not match bill amount (${formatMoney(billAmount, currencySymbol)}). Difference: ${formatMoney(diff, currencySymbol)}. Please balance or click "Auto-fill Remainder".`
        );
        clearResult();
        return;
      }
    }

    // Disambiguate duplicate names if any exist
    const disambiguatedNames = disambiguatePersonNames(people);

    // --- EXACT PENNY DIVISION CALCULATION ---
    const totalCents = Math.round(billAmount * 100);
    const n = people.length;
    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents % n;

    let computedShares = [];
    let netBalances = [];

    for (let i = 0; i < n; i++) {
      const person = people[i];
      const displayName = disambiguatedNames[i];
      const shareCents = baseCents + (i < remainderCents ? 1 : 0);
      const shareAmount = shareCents / 100;
      const paidCents = Math.round(Number(person.paid) * 100);
      const netCents = paidCents - shareCents;

      computedShares.push({
        id: person.id,
        name: displayName,
        share: shareAmount,
        paid: person.paid,
        net: netCents / 100,
        netCents: netCents,
        avatarColorIndex: i % 6,
      });

      netBalances.push({
        id: person.id,
        name: displayName,
        netCents: netCents,
        avatarColorIndex: i % 6,
      });
    }

    // Verify mathematical equality down to the penny
    const sumOfSharesCents = computedShares.reduce((acc, s) => acc + Math.round(s.share * 100), 0);
    const isExactMatch = sumOfSharesCents === totalCents;

    // --- SETTLEMENT TRANSFERS ---
    const settlements = computeSettlements(netBalances, occasion, dateVal, currencyCode, currencySymbol);

    currentCalculation = {
      id: 'calc_' + Date.now(),
      occasion: occasion,
      date: dateVal,
      totalAmount: billAmount,
      currencyCode: currencyCode,
      currencySymbol: currencySymbol,
      peopleCount: n,
      shares: computedShares,
      settlements: settlements,
      isExactMatch: isExactMatch,
      timestamp: new Date().toISOString(),
    };

    displayCalculationResult(currentCalculation);
    saveDraftToStorage();
    showToast('Bill split calculated successfully!');
  }

  function disambiguatePersonNames(peopleArray) {
    const counts = {};
    peopleArray.forEach((p) => {
      const name = p.name.trim();
      counts[name] = (counts[name] || 0) + 1;
    });

    const currentSeen = {};
    return peopleArray.map((p) => {
      const name = p.name.trim();
      if (counts[name] > 1) {
        currentSeen[name] = (currentSeen[name] || 0) + 1;
        return `${name} (${currentSeen[name]})`;
      }
      return name;
    });
  }

  function computeSettlements(netBalances, occasion, date, currencyCode, currencySymbol) {
    let creditors = [];
    let debtors = [];

    netBalances.forEach((item) => {
      if (item.netCents > 0) {
        creditors.push({ ...item, remaining: item.netCents });
      } else if (item.netCents < 0) {
        debtors.push({ ...item, remaining: -item.netCents });
      }
    });

    creditors.sort((a, b) => b.remaining - a.remaining);
    debtors.sort((a, b) => b.remaining - a.remaining);

    const transactions = [];
    let cIdx = 0;
    let dIdx = 0;
    let transactionCounter = 1;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const transferCents = Math.min(debtor.remaining, creditor.remaining);
      const transferAmount = transferCents / 100;

      if (transferCents > 0) {
        transactions.push({
          id: `tx_${Date.now()}_${transactionCounter++}`,
          debtorName: debtor.name,
          debtorId: debtor.id,
          debtorAvatarIndex: debtor.avatarColorIndex || 0,
          creditorName: creditor.name,
          creditorId: creditor.id,
          creditorAvatarIndex: creditor.avatarColorIndex || 1,
          amount: transferAmount,
          occasion: occasion,
          date: date,
          currencyCode: currencyCode,
          currencySymbol: currencySymbol,
          settled: false,
        });
      }

      debtor.remaining -= transferCents;
      creditor.remaining -= transferCents;

      if (debtor.remaining === 0) dIdx++;
      if (creditor.remaining === 0) cIdx++;
    }

    return transactions;
  }

  // --- DISPLAY RESULT ---
  function displayCalculationResult(calc) {
    if (!calc) return;

    resultPlaceholder.classList.add('hidden');
    resultCard.classList.remove('hidden');

    resOccasionName.textContent = calc.occasion;
    resOccasionDate.textContent = `${calc.occasion} · ${formatDateDisplay(calc.date)}`;
    resTotalAmount.textContent = formatMoney(calc.totalAmount, calc.currencySymbol);

    const totalShares = calc.shares.reduce((a, b) => a + b.share, 0);
    mathCheckText.textContent = `Sum of individual shares: ${formatMoney(totalShares, calc.currencySymbol)} = Total Bill: ${formatMoney(calc.totalAmount, calc.currencySymbol)} (100% exact match).`;

    sharesList.innerHTML = '';
    sharePerPersonSubtext.textContent = `Fairly divided among ${calc.shares.length} participants`;
    sharesCountBadge.textContent = `${calc.shares.length} People`;

    calc.shares.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'share-row';
      row.setAttribute('role', 'listitem');

      const meta = document.createElement('div');
      meta.className = 'share-person-meta';

      const avatar = document.createElement('div');
      avatar.className = `person-avatar-circle avatar-color-${(item.avatarColorIndex !== undefined ? item.avatarColorIndex : idx) % 6}`;
      avatar.textContent = item.name.charAt(0).toUpperCase();

      const nameBox = document.createElement('div');
      const nameEl = document.createElement('div');
      nameEl.className = 'share-person-name';
      nameEl.textContent = item.name;

      const paidInfo = document.createElement('div');
      paidInfo.className = 'share-person-paid-info';
      paidInfo.textContent = `Paid upfront: ${formatMoney(item.paid, calc.currencySymbol)}`;

      nameBox.appendChild(nameEl);
      nameBox.appendChild(paidInfo);
      meta.appendChild(avatar);
      meta.appendChild(nameBox);

      const amountBox = document.createElement('div');
      amountBox.className = 'share-amount-box';

      const shareAmount = document.createElement('div');
      shareAmount.className = 'share-amount';
      shareAmount.textContent = formatMoney(item.share, calc.currencySymbol);

      const netBadge = document.createElement('span');
      netBadge.className = 'share-net-badge';
      if (item.net > 0) {
        netBadge.classList.add('positive');
        netBadge.textContent = `Receives +${formatMoney(item.net, calc.currencySymbol)}`;
      } else if (item.net < 0) {
        netBadge.classList.add('negative');
        netBadge.textContent = `Owes -${formatMoney(Math.abs(item.net), calc.currencySymbol)}`;
      } else {
        netBadge.classList.add('zero');
        netBadge.textContent = 'Even ($0.00)';
      }

      amountBox.appendChild(shareAmount);
      amountBox.appendChild(netBadge);

      row.appendChild(meta);
      row.appendChild(amountBox);
      sharesList.appendChild(row);
    });

    renderSettlementsList(calc);

    if (window.innerWidth < 960) {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderSettlementsList(calc) {
    settlementsList.innerHTML = '';

    if (calc.settlements.length === 0) {
      settlementCountBadge.textContent = 'All Even';
      settlementsList.innerHTML = `
        <div class="all-settled-notice">
          Everyone contributed their exact share! No money needs to be transferred.
        </div>
      `;
      return;
    }

    const pendingCount = calc.settlements.filter((s) => !s.settled).length;
    settlementCountBadge.textContent =
      pendingCount === 0 ? 'All Settled ✓' : `${pendingCount} Transfer${pendingCount > 1 ? 's' : ''} Pending`;

    calc.settlements.forEach((s) => {
      const card = document.createElement('div');
      card.className = `settlement-card ${s.settled ? 'settled' : ''}`;
      card.setAttribute('role', 'listitem');

      const diagram = document.createElement('div');
      diagram.className = 'settlement-flow-diagram';

      const debtorNode = document.createElement('div');
      debtorNode.className = 'participant-node';
      debtorNode.innerHTML = `
        <div class="person-avatar-circle avatar-color-${(s.debtorAvatarIndex || 0) % 6}">${escapeHtml(s.debtorName.charAt(0).toUpperCase())}</div>
        <div>
          <span class="node-name">${escapeHtml(s.debtorName)}</span>
          <span class="node-role-debtor">OWES</span>
        </div>
      `;

      const arrowNode = document.createElement('div');
      arrowNode.className = 'transfer-arrow-node';
      arrowNode.innerHTML = `
        <span class="transfer-amount-tag">${formatMoney(s.amount, s.currencySymbol)}</span>
        <span class="arrow-line">──────▶</span>
      `;

      const creditorNode = document.createElement('div');
      creditorNode.className = 'participant-node';
      creditorNode.innerHTML = `
        <div class="person-avatar-circle avatar-color-${(s.creditorAvatarIndex || 1) % 6}">${escapeHtml(s.creditorName.charAt(0).toUpperCase())}</div>
        <div>
          <span class="node-name">${escapeHtml(s.creditorName)}</span>
          <span class="node-role-creditor">RECEIVES</span>
        </div>
      `;

      diagram.appendChild(debtorNode);
      diagram.appendChild(arrowNode);
      diagram.appendChild(creditorNode);

      // Statement matching user requirement:
      // "like p2 has to pay p1 900 USD of that occasion(abc) on date(XX/XX/XXX)"
      const statement = document.createElement('div');
      statement.className = 'settlement-formal-statement';
      statement.innerHTML = `
        <strong>${escapeHtml(s.debtorName)}</strong> has to pay <strong>${escapeHtml(s.creditorName)}</strong> 
        <strong>${formatMoney(s.amount, s.currencySymbol)} ${escapeHtml(s.currencyCode)}</strong> 
        for occasion <em>${escapeHtml(s.occasion)}</em> on date (${formatDateDisplay(s.date)}).
      `;

      const bottom = document.createElement('div');
      bottom.className = 'settlement-bottom';

      const statusPill = document.createElement('span');
      statusPill.className = `status-pill ${s.settled ? 'settled' : 'pending'}`;
      statusPill.textContent = s.settled ? 'Settled ✓' : 'Pending ⏳';

      const actionGroup = document.createElement('div');
      actionGroup.className = 'settlement-actions-group';

      const copyReminderBtn = document.createElement('button');
      copyReminderBtn.type = 'button';
      copyReminderBtn.className = 'btn btn-secondary btn-xs';
      copyReminderBtn.title = 'Copy polite payment reminder to clipboard';
      copyReminderBtn.textContent = 'Copy Reminder';
      copyReminderBtn.addEventListener('click', () => {
        const reminderMsg = `Hey ${s.debtorName}! Your share for "${s.occasion}" on ${formatDateDisplay(s.date)} is ${formatMoney(s.amount, s.currencySymbol)} ${s.currencyCode}. Please transfer it to ${s.creditorName} when convenient. Thanks!`;
        copyToClipboard(reminderMsg, `Reminder message for ${s.debtorName} copied!`);
      });

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn-toggle-settle';
      toggleBtn.textContent = s.settled ? 'Mark as Pending' : 'Mark as Paid / Settled';
      toggleBtn.addEventListener('click', () => {
        s.settled = !s.settled;
        renderSettlementsList(calc);
        saveDraftToStorage();
        updateHistorySettlementStatus(calc.id, s.id, s.settled);
        updateHistoryStats();
        showToast(s.settled ? 'Transfer marked as settled!' : 'Transfer marked as pending');
      });

      actionGroup.appendChild(copyReminderBtn);
      actionGroup.appendChild(toggleBtn);

      bottom.appendChild(statusPill);
      bottom.appendChild(actionGroup);

      card.appendChild(diagram);
      card.appendChild(statement);
      card.appendChild(bottom);
      settlementsList.appendChild(card);
    });
  }

  function clearResult() {
    currentCalculation = null;
    resultCard.classList.add('hidden');
    resultPlaceholder.classList.remove('hidden');
    saveDraftToStorage();
  }

  function resetForm() {
    billForm.reset();
    clearAllErrors();
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    occasionInput.value = '';
    amountInput.value = '';
    currencySelect.value = 'USD';
    numPeopleInput.value = 3;

    people = [
      { id: 1, name: 'Alice', paid: 0 },
      { id: 2, name: 'Bob', paid: 0 },
      { id: 3, name: 'Charlie', paid: 0 },
    ];

    document.querySelector('input[name="payment-mode"][value="single"]').checked = true;
    handlePaymentModeChange();
    updateCurrencySymbol();
    renderPeopleInputs();
    clearResult();
    showToast('Form reset to default.');
  }

  // --- PRESETS & EDGE CASE SIMULATORS ---
  function loadPreset(key) {
    clearAllErrors();
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    currencySelect.value = 'USD';
    updateCurrencySymbol();

    if (key === 'dinner') {
      occasionInput.value = 'Dinner with Friends';
      amountInput.value = '180.00';
      people = [
        { id: 1, name: 'Alice', paid: 150.00 },
        { id: 2, name: 'Bob', paid: 30.00 },
        { id: 3, name: 'Charlie', paid: 0.00 },
      ];
      numPeopleInput.value = 3;
      document.querySelector('input[name="payment-mode"][value="multiple"]').checked = true;
      handlePaymentModeChange();
      renderPeopleInputs();
      showToast('Loaded Dinner preset ($180 / 3 people)');
      calculateBill();
    } else if (key === 'debt900') {
      // Direct fulfillment of: "p2 has to pay p1 900 USD of that occasion(abc) on date(XX/XX/XXX)"
      occasionInput.value = 'Road Trip';
      amountInput.value = '1800.00';
      people = [
        { id: 1, name: 'p1', paid: 1800.00 },
        { id: 2, name: 'p2', paid: 0.00 },
      ];
      numPeopleInput.value = 2;
      document.querySelector('input[name="payment-mode"][value="single"]').checked = true;
      handlePaymentModeChange();
      singlePayerSelect.value = '1';
      syncSinglePayerAmounts();
      renderPeopleInputs();
      showToast('Loaded p1 & p2 preset ($1800 total -> p2 owes p1 $900)');
      calculateBill();
    } else if (key === 'penny') {
      // Exact penny division test
      occasionInput.value = 'Penny Division Test';
      amountInput.value = '100.00';
      people = [
        { id: 1, name: 'Alice', paid: 100.00 },
        { id: 2, name: 'Bob', paid: 0.00 },
        { id: 3, name: 'Charlie', paid: 0.00 },
      ];
      numPeopleInput.value = 3;
      document.querySelector('input[name="payment-mode"][value="single"]').checked = true;
      handlePaymentModeChange();
      singlePayerSelect.value = '1';
      syncSinglePayerAmounts();
      renderPeopleInputs();
      showToast('Loaded Penny test: $100.00 split 3 ways ($33.34, $33.33, $33.33)');
      calculateBill();
    } else if (key === 'micro') {
      // Tiny micro-bill edge case test
      occasionInput.value = 'Micro Bill Test';
      amountInput.value = '0.05';
      people = [
        { id: 1, name: 'Alice', paid: 0.05 },
        { id: 2, name: 'Bob', paid: 0.00 },
        { id: 3, name: 'Charlie', paid: 0.00 },
        { id: 4, name: 'David', paid: 0.00 },
      ];
      numPeopleInput.value = 4;
      document.querySelector('input[name="payment-mode"][value="single"]').checked = true;
      handlePaymentModeChange();
      singlePayerSelect.value = '1';
      syncSinglePayerAmounts();
      renderPeopleInputs();
      showToast('Loaded Micro Bill: $0.05 split among 4 people');
      calculateBill();
    } else if (key === 'error-zero') {
      // Error handling test
      occasionInput.value = 'Invalid Test Bill';
      amountInput.value = '0.00';
      people = [
        { id: 1, name: 'Person 1', paid: 0 },
        { id: 2, name: 'Person 2', paid: 0 },
      ];
      numPeopleInput.value = 2;
      renderPeopleInputs();
      showToast('Simulating error test with $0.00 amount...');
      calculateBill();
    }
  }

  // --- SAVE BILL TO HISTORY ---
  function saveCurrentBillToHistory() {
    if (!currentCalculation) {
      showAlert('No Calculation', 'Please calculate a bill before saving to history.');
      return;
    }

    const existingIndex = savedHistory.findIndex((b) => b.id === currentCalculation.id);
    if (existingIndex >= 0) {
      savedHistory[existingIndex] = JSON.parse(JSON.stringify(currentCalculation));
      showToast('Updated existing bill in history!');
    } else {
      savedHistory.unshift(JSON.parse(JSON.stringify(currentCalculation)));
      showToast('Bill saved to previous history!');
    }

    saveHistoryToStorage();
    updateHistoryBadge();
    updateHistoryStats();
  }

  function updateHistorySettlementStatus(calcId, settlementId, settledStatus) {
    const bill = savedHistory.find((b) => b.id === calcId);
    if (bill && bill.settlements) {
      const s = bill.settlements.find((item) => item.id === settlementId);
      if (s) {
        s.settled = settledStatus;
        saveHistoryToStorage();
        updateHistoryStats();
      }
    }
  }

  // --- PREVIOUS BILLS VIEW ---
  function renderHistoryView() {
    updateHistoryBadge();
    updateHistoryStats();

    if (savedHistory.length === 0) {
      historyEmptyState.classList.remove('hidden');
      historyListContainer.classList.add('hidden');
      pendingSummaryCard.classList.add('hidden');
      return;
    }

    historyEmptyState.classList.add('hidden');
    historyListContainer.classList.remove('hidden');

    renderGlobalPendingDebts();

    const filter = historyFilter.value;
    const query = historySearch.value.trim().toLowerCase();

    let filteredBills = savedHistory.filter((bill) => {
      const hasPending = bill.settlements.some((s) => !s.settled);
      if (filter === 'pending' && !hasPending) return false;
      if (filter === 'settled' && hasPending) return false;

      if (query) {
        const occasionMatch = bill.occasion.toLowerCase().includes(query);
        const peopleMatch = bill.shares.some((p) => p.name.toLowerCase().includes(query));
        const dateMatch = bill.date.includes(query);
        if (!occasionMatch && !peopleMatch && !dateMatch) return false;
      }

      return true;
    });

    historyListContainer.innerHTML = '';

    if (filteredBills.length === 0) {
      historyListContainer.innerHTML = `
        <div class="card empty-state-card" style="grid-column: 1 / -1;">
          <p class="empty-desc">No previous bills match your search criteria.</p>
        </div>
      `;
      return;
    }

    filteredBills.forEach((bill) => {
      const card = createHistoryBillCard(bill);
      historyListContainer.appendChild(card);
    });
  }

  function renderGlobalPendingDebts() {
    let pendingDebts = [];
    let totalPendingCents = 0;

    savedHistory.forEach((bill) => {
      bill.settlements.forEach((s) => {
        if (!s.settled) {
          pendingDebts.push({ ...s, billId: bill.id });
          totalPendingCents += Math.round(s.amount * 100);
        }
      });
    });

    if (pendingDebts.length === 0) {
      pendingSummaryCard.classList.add('hidden');
      return;
    }

    pendingSummaryCard.classList.remove('hidden');
    const { symbol } = getSelectedCurrency();
    globalPendingAmount.textContent = `${formatMoney(totalPendingCents / 100, symbol)} Pending`;

    pendingBreakdownList.innerHTML = '';
    pendingDebts.slice(0, 6).forEach((s) => {
      const item = document.createElement('div');
      item.className = 'pending-debt-item';
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(s.debtorName)}</strong> owes <strong>${escapeHtml(s.creditorName)}</strong>: 
          <span style="font-weight:800; color:var(--danger); font-family:var(--font-mono);">${formatMoney(s.amount, s.currencySymbol)} ${escapeHtml(s.currencyCode)}</span>
          <span style="color:var(--text-subtle);"> · ${escapeHtml(s.occasion)} (${formatDateDisplay(s.date)})</span>
        </div>
      `;

      const settleBtn = document.createElement('button');
      settleBtn.type = 'button';
      settleBtn.className = 'btn-toggle-settle';
      settleBtn.textContent = 'Mark Paid ✓';
      settleBtn.addEventListener('click', () => {
        s.settled = true;
        updateHistorySettlementStatus(s.billId, s.id, true);
        if (currentCalculation && currentCalculation.id === s.billId) {
          const match = currentCalculation.settlements.find((item) => item.id === s.id);
          if (match) match.settled = true;
          displayCalculationResult(currentCalculation);
        }
        renderHistoryView();
        showToast(`Settled: ${s.debtorName} → ${s.creditorName}`);
      });

      item.appendChild(settleBtn);
      pendingBreakdownList.appendChild(item);
    });

    if (pendingDebts.length > 6) {
      const more = document.createElement('div');
      more.style.fontSize = '0.75rem';
      more.style.color = 'var(--text-subtle)';
      more.style.textAlign = 'center';
      more.textContent = `+ ${pendingDebts.length - 6} more pending debts in bills below`;
      pendingBreakdownList.appendChild(more);
    }
  }

  function updateHistoryStats() {
    const totalBills = savedHistory.length;
    let totalCents = 0;
    let totalPendingCents = 0;
    let totalSettledCount = 0;

    savedHistory.forEach((bill) => {
      totalCents += Math.round(Number(bill.totalAmount) * 100);
      bill.settlements.forEach((s) => {
        if (s.settled) {
          totalSettledCount++;
        } else {
          totalPendingCents += Math.round(Number(s.amount) * 100);
        }
      });
    });

    const { symbol } = getSelectedCurrency();
    statTotalBills.textContent = totalBills;
    statTotalAmount.textContent = formatMoney(totalCents / 100, symbol);
    statTotalPending.textContent = formatMoney(totalPendingCents / 100, symbol);
    statTotalSettled.textContent = totalSettledCount;
  }

  function createHistoryBillCard(bill) {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.setAttribute('role', 'listitem');

    const hasPending = bill.settlements.some((s) => !s.settled);

    const header = document.createElement('div');
    header.className = 'history-card-header';

    const titleBox = document.createElement('div');
    const metaDate = document.createElement('div');
    metaDate.className = 'history-card-meta';
    metaDate.textContent = formatDateDisplay(bill.date);

    const title = document.createElement('h3');
    title.className = 'history-card-title';
    title.textContent = bill.occasion;

    titleBox.appendChild(metaDate);
    titleBox.appendChild(title);

    const amountBox = document.createElement('div');
    amountBox.className = 'history-card-amount';

    const amountVal = document.createElement('div');
    amountVal.className = 'history-amount-val';
    amountVal.textContent = formatMoney(bill.totalAmount, bill.currencySymbol);

    const countLabel = document.createElement('div');
    countLabel.className = 'history-people-count';
    countLabel.textContent = `${bill.peopleCount} people · ${hasPending ? '⏳ Has Pending' : '✓ All Settled'}`;

    amountBox.appendChild(amountVal);
    amountBox.appendChild(countLabel);

    header.appendChild(titleBox);
    header.appendChild(amountBox);
    card.appendChild(header);

    const settlementsSection = document.createElement('div');
    const sTitle = document.createElement('div');
    sTitle.className = 'history-section-title';
    sTitle.textContent = 'Settlements:';
    settlementsSection.appendChild(sTitle);

    const settlementsContainer = document.createElement('div');
    settlementsContainer.className = 'history-settlements';

    if (bill.settlements.length === 0) {
      const evenItem = document.createElement('div');
      evenItem.className = 'history-settlement-item';
      evenItem.textContent = 'Even split upfront · No debts.';
      settlementsContainer.appendChild(evenItem);
    } else {
      bill.settlements.forEach((s) => {
        const item = document.createElement('div');
        item.className = `history-settlement-item ${s.settled ? 'settled' : ''}`;

        const text = document.createElement('span');
        text.innerHTML = `
          <strong>${escapeHtml(s.debtorName)}</strong> owes <strong>${escapeHtml(s.creditorName)}</strong>: 
          <strong>${formatMoney(s.amount, s.currencySymbol)}</strong>
        `;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-toggle-settle';
        btn.textContent = s.settled ? 'Settled ✓' : 'Mark Paid';
        btn.addEventListener('click', () => {
          s.settled = !s.settled;
          saveHistoryToStorage();
          if (currentCalculation && currentCalculation.id === bill.id) {
            const match = currentCalculation.settlements.find((item) => item.id === s.id);
            if (match) match.settled = s.settled;
            displayCalculationResult(currentCalculation);
          }
          renderHistoryView();
          showToast(s.settled ? 'Marked as settled' : 'Marked as pending');
        });

        item.appendChild(text);
        item.appendChild(btn);
        settlementsContainer.appendChild(item);
      });
    }

    settlementsSection.appendChild(settlementsContainer);
    card.appendChild(settlementsSection);

    const actions = document.createElement('div');
    actions.className = 'history-actions';

    const leftBtns = document.createElement('div');
    leftBtns.className = 'history-action-left';

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'btn btn-secondary btn-sm';
    loadBtn.textContent = 'Load into Calculator';
    loadBtn.addEventListener('click', () => loadBillIntoCalculator(bill));

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-secondary btn-sm';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => copyBillSummary(bill));

    leftBtns.appendChild(loadBtn);
    leftBtns.appendChild(copyBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-outline-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      savedHistory = savedHistory.filter((b) => b.id !== bill.id);
      saveHistoryToStorage();
      renderHistoryView();
      showToast('Bill removed from history.');
    });

    actions.appendChild(leftBtns);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    return card;
  }

  function loadBillIntoCalculator(bill) {
    occasionInput.value = bill.occasion;
    dateInput.value = bill.date;
    amountInput.value = bill.totalAmount;
    currencySelect.value = bill.currencyCode;
    updateCurrencySymbol();

    people = bill.shares.map((s, idx) => ({
      id: s.id || idx + 1,
      name: s.name,
      paid: s.paid || 0,
    }));

    numPeopleInput.value = people.length;

    const allPaidZeroExceptOne =
      people.filter((p) => p.paid > 0).length === 1 &&
      people.some((p) => Math.abs(p.paid - bill.totalAmount) < 0.01);

    if (allPaidZeroExceptOne) {
      document.querySelector('input[name="payment-mode"][value="single"]').checked = true;
      handlePaymentModeChange();
      const payer = people.find((p) => p.paid > 0);
      if (payer) singlePayerSelect.value = payer.id;
    } else {
      document.querySelector('input[name="payment-mode"][value="multiple"]').checked = true;
      handlePaymentModeChange();
    }

    renderPeopleInputs();
    currentCalculation = JSON.parse(JSON.stringify(bill));
    displayCalculationResult(currentCalculation);
    saveDraftToStorage();

    switchTab('calculator');
    showToast(`Loaded "${bill.occasion}" into calculator.`);
  }

  function clearAllHistory() {
    if (savedHistory.length === 0) return;
    if (window.confirm('Are you sure you want to delete all saved previous bills? This cannot be undone.')) {
      savedHistory = [];
      saveHistoryToStorage();
      renderHistoryView();
      showToast('All history cleared.');
    }
  }

  function updateHistoryBadge() {
    historyCountBadge.textContent = savedHistory.length;
  }

  // --- SAFE LOCAL STORAGE ---
  function saveDraftToStorage() {
    try {
      const draft = {
        occasion: occasionInput.value,
        date: dateInput.value,
        amount: amountInput.value,
        currency: currencySelect.value,
        numPeople: numPeopleInput.value,
        paymentMode: getPaymentMode(),
        singlePayerId: singlePayerSelect.value,
        people: people,
        currentCalculation: currentCalculation,
      };
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(draft));
    } catch (e) {
      console.warn('LocalStorage save draft failed:', e);
    }
  }

  function loadDraftFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (!raw) return;

      const draft = JSON.parse(raw);
      if (draft.occasion !== undefined) occasionInput.value = draft.occasion;
      if (draft.date) dateInput.value = draft.date;
      if (draft.amount !== undefined) amountInput.value = draft.amount;
      if (draft.currency) currencySelect.value = draft.currency;

      if (Array.isArray(draft.people) && draft.people.length > 0) {
        people = draft.people;
        numPeopleInput.value = people.length;
      }

      if (draft.paymentMode) {
        const modeRadio = document.querySelector(
          `input[name="payment-mode"][value="${draft.paymentMode}"]`
        );
        if (modeRadio) modeRadio.checked = true;
        handlePaymentModeChange();
      }

      if (draft.singlePayerId) {
        singlePayerSelect.value = draft.singlePayerId;
      }

      if (draft.currentCalculation) {
        currentCalculation = draft.currentCalculation;
      }
    } catch (e) {
      console.warn('LocalStorage load draft failed:', e);
    }
  }

  function saveHistoryToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(savedHistory));
    } catch (e) {
      console.warn('LocalStorage save history failed:', e);
    }
  }

  function loadHistoryFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) {
        savedHistory = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('LocalStorage load history failed:', e);
      savedHistory = [];
    }
  }

  // --- CLIPBOARD & EXPORT ---
  function copySummaryToClipboard() {
    if (!currentCalculation) return;
    copyBillSummary(currentCalculation);
  }

  function copyBillSummary(calc) {
    let lines = [];
    lines.push(`💰 Bill Split: ${calc.occasion}`);
    lines.push(`📅 Date: ${formatDateDisplay(calc.date)}`);
    lines.push(`💵 Total Bill: ${formatMoney(calc.totalAmount, calc.currencySymbol)} ${calc.currencyCode}`);
    lines.push(`👥 Split between ${calc.shares.length} people:`);
    lines.push('');

    lines.push('--- Individual Shares ---');
    calc.shares.forEach((s) => {
      lines.push(`• ${s.name}: ${formatMoney(s.share, calc.currencySymbol)} (Paid upfront: ${formatMoney(s.paid, calc.currencySymbol)})`);
    });

    lines.push('');
    lines.push('--- Settlements (Who Pays Whom) ---');
    if (calc.settlements.length === 0) {
      lines.push('All accounts settled evenly! No transfers needed.');
    } else {
      calc.settlements.forEach((s) => {
        const status = s.settled ? '✓ SETTLED' : '⏳ PENDING';
        lines.push(`• ${s.debtorName} has to pay ${s.creditorName} ${formatMoney(s.amount, s.currencySymbol)} ${s.currencyCode} for ${s.occasion} on ${formatDateDisplay(s.date)} [${status}]`);
      });
    }

    const text = lines.join('\n');
    copyToClipboard(text, 'Full summary copied to clipboard!');
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(successMsg || 'Copied to clipboard!'),
        () => fallbackCopyText(text, successMsg)
      );
    } else {
      fallbackCopyText(text, successMsg);
    }
  }

  function fallbackCopyText(text, successMsg) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(successMsg || 'Copied to clipboard!');
    } catch (e) {
      showToast('Unable to copy text.');
    }
    document.body.removeChild(textarea);
  }

  // --- GENERAL HELPERS ---
  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // --- BOOTSTRAP ---
  document.addEventListener('DOMContentLoaded', init);
})();

/// <reference types="cypress" />

function resetBrowserState(): void {
  cy.visit('/setup', {
    onBeforeLoad: (win: Window) => {
      win.localStorage.clear();
    },
  });

  cy.window().then((win: Window) => {
    return new Cypress.Promise<void>((resolve: () => void) => {
      const request = win.indexedDB.deleteDatabase('triada-web');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  cy.visit('/setup');
}

function createBudget(monthlyIncome: string): void {
  cy.get('#income').clear();
  cy.get('#income').type(monthlyIncome);
  cy.contains('button', 'Crear Presupuesto').click();
  cy.url().should('include', '/year');
}

function navTo(label: 'Año' | 'Mes' | 'Ajustes'): void {
  cy.contains('.bottom-nav a', label).click();
}

function goToMonth(): void {
  navTo('Mes');
  cy.url().should('include', '/month');
}

function openAddExpense(): void {
  cy.get('#bottom-nav-add').click({ force: true });
  cy.url().should('include', '/month');
  cy.get('.expense-sheet:visible').should('be.visible');
}

function submitAddExpense(): void {
  cy.get('#expense-submit', { timeout: 10000 }).click({ force: true });
  cy.get('.expense-sheet').should('not.exist');
}

function buildImportSnapshot(): Record<string, unknown> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const timestamp = now.toISOString();

  return {
    meta: {
      format: 'triada-db-export',
      schemaVersion: 1,
      exportedAt: timestamp,
      appVersion: '0.0.1',
    },
    data: {
      budget_years: [
        {
          id: 'import-year',
          monthly_income: 90000,
          year: currentYear,
          currency: 'EUR',
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      budget_months: [
        {
          id: 'import-month',
          budget_year_id: 'import-year',
          month: currentMonth,
          year: currentYear,
          monthly_income: 90000,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      budget_allocations: [
        {
          id: 'import-allocation-needs',
          budget_month_id: 'import-month',
          group: 'needs',
          allocated: 45000,
          spent: 0,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          id: 'import-allocation-wants',
          budget_month_id: 'import-month',
          group: 'wants',
          allocated: 27000,
          spent: 0,
          created_at: timestamp,
          updated_at: timestamp,
        },
        {
          id: 'import-allocation-savings',
          budget_month_id: 'import-month',
          group: 'savings',
          allocated: 18000,
          spent: 0,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      budget_expenses: [],
      recurring_expense_rules: [],
      expense_categories: [],
    },
  };
}

function setNetworkOffline() {
  if (Cypress.browser.family !== 'chromium') {
    return cy.wrap(null, { log: false });
  }

  return cy
    .wrap(
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.enable',
      }),
      { log: false },
    )
    .then(async () => {
      await Cypress.automation('remote:debugger:protocol', {
        command: 'Network.emulateNetworkConditions',
        params: {
          offline: true,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
          connectionType: 'none',
        },
      });
    });
}

function setNetworkOnline() {
  if (Cypress.browser.family !== 'chromium') {
    return cy.wrap(null, { log: false });
  }

  return cy
    .wrap(
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.enable',
      }),
      { log: false },
    )
    .then(async () => {
      await Cypress.automation('remote:debugger:protocol', {
        command: 'Network.emulateNetworkConditions',
        params: {
          offline: false,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
          connectionType: 'wifi',
        },
      });
    });
}

describe('Budget flow', () => {
  beforeEach(() => {
    resetBrowserState();
  });

  afterEach(() => {
    setNetworkOnline();
  });

  it('should create a budget in setup and land on the year view', () => {
    createBudget('1000');

    cy.contains('Resumen anual').should('be.visible');
    cy.contains('Ingreso anual planificado').should('be.visible');
    cy.contains('12.000,00 €').should('be.visible');
    cy.contains('Necesidades').should('be.visible');
    cy.contains('Gastos personales').should('be.visible');
    cy.contains('Ahorro e inversión').should('be.visible');
  });

  it('should show the bottom navigation on the app screens but not on setup', () => {
    createBudget('1000');

    cy.get('.bottom-nav').should('be.visible');
    cy.get('#bottom-nav-add').should('be.visible');

    goToMonth();
    cy.get('.bottom-nav').should('be.visible');

    navTo('Ajustes');
    cy.url().should('include', '/settings');
    cy.get('.bottom-nav').should('be.visible');
  });

  it('should lock the viewport so an installed PWA cannot pinch-zoom', () => {
    cy.document().then((doc) => {
      const viewport = doc.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '';
      expect(viewport).to.contain('user-scalable=no');
      expect(viewport).to.contain('maximum-scale=1');
    });
    cy.get('html').should('have.css', 'touch-action', 'pan-x pan-y');
  });

  it('should redirect / to the year view when a budget exists', () => {
    createBudget('1500');

    cy.visit('/');
    cy.url().should('include', '/year');
    cy.contains('18.000,00 €').should('be.visible');
  });

  it('should keep data after page reload', () => {
    createBudget('2500');

    cy.reload();

    cy.url().should('include', '/year');
    cy.contains('30.000,00 €').should('be.visible');
  });

  it('should redirect from setup to the year view when a budget already exists', () => {
    createBudget('1750');

    cy.visit('/setup');

    cy.url().should('include', '/year');
    cy.contains('21.000,00 €').should('be.visible');
  });

  it('should request a numeric keypad for the income field', () => {
    cy.get('#income').should('have.attr', 'inputmode', 'decimal');
    cy.get('#income').should('not.have.attr', 'type', 'number');
  });

  it('should keep create action disabled for invalid income values', () => {
    cy.contains('button', 'Crear Presupuesto').should('be.disabled');

    for (const value of ['0', '-1', 'abc', '12abc', '.', '1e5']) {
      cy.get('#income').clear();
      cy.get('#income').type(value);
      cy.contains('button', 'Crear Presupuesto').should('be.disabled');
    }

    cy.get('#income').clear();
    cy.get('#income').type('1500');
    cy.contains('button', 'Crear Presupuesto').should('be.enabled');
  });

  it('should default setup selectors to Spanish and Euro', () => {
    cy.get('#language').should('have.value', 'es');
    cy.get('#currency').should('have.value', 'EUR');
  });

  it('should render floored 50/30/20 preview values for decimal inputs', () => {
    cy.get('#income').clear();
    cy.get('#income').type('1000.55');

    cy.contains('Desglose del presupuesto').should('be.visible');
    cy.contains('500,27 €').should('be.visible');
    cy.contains('300,16 €').should('be.visible');
    cy.contains('200,11 €').should('be.visible');
  });

  it('should re-allocate the preview when the split is edited', () => {
    cy.get('#income').clear();
    cy.get('#income').type('1000');

    cy.get('#split-needs').clear();
    cy.get('#split-needs').type('60');
    cy.get('#split-wants').clear();
    cy.get('#split-wants').type('25');
    cy.get('#split-savings').clear();
    cy.get('#split-savings').type('15');

    cy.contains('600,00 €').should('be.visible');
    cy.contains('250,00 €').should('be.visible');
    cy.contains('150,00 €').should('be.visible');
  });

  it('should persist selected locale after reload', () => {
    cy.get('#language').select('English');
    cy.contains('Welcome to Triada').should('be.visible');
    cy.contains('button', 'Create Budget').should('be.visible');

    cy.reload();

    cy.contains('Welcome to Triada').should('be.visible');
    cy.contains('button', 'Create Budget').should('be.visible');
  });

  it('should render the selected currency on the month view after setup', () => {
    cy.get('#currency').select('€ - Euro');

    createBudget('1000');
    goToMonth();

    cy.contains('Ingreso Mensual').should('be.visible');
    cy.contains('1.000,00 €').should('be.visible');
  });

  it('should add an expense from the FAB and persist it after reload', () => {
    createBudget('1000');

    openAddExpense();
    cy.get('#expense-amount').should('not.be.disabled');
    cy.get('#expense-amount').clear();
    cy.get('#expense-amount').type('100.50');
    cy.get('input[placeholder="Describe este gasto"]').type('Supermercado semanal');
    submitAddExpense();

    cy.contains('100,50 €').should('be.visible');

    cy.reload();

    cy.contains('100,50 €').should('be.visible');
  });

  it('should apply recurring expense from current month to future months', () => {
    createBudget('1000');

    openAddExpense();
    cy.get('#expense-amount').should('not.be.disabled');
    cy.get('#expense-amount').clear();
    cy.get('#expense-amount').type('50');
    cy.get('input[placeholder="Describe este gasto"]').type('Renta fija');
    cy.get('#expense-recurring').check({ force: true });
    cy.get('#expense-recurring').should('be.checked');
    submitAddExpense();
  });

  it('should add an expense to the month in view and back-fill a recurring one from there', () => {
    createBudget('1200');
    goToMonth();

    cy.get('.month-selector .p-button').eq(0).click({ force: true });

    cy.get('#bottom-nav-add').click({ force: true });
    cy.get('.expense-sheet:visible').should('be.visible');

    cy.get('#expense-amount').clear();
    cy.get('#expense-amount').type('90');
    cy.get('input[placeholder="Describe este gasto"]').type('Alquiler');
    cy.get('#expense-recurring').check({ force: true });
    submitAddExpense();

    cy.contains('.group-display', '90,00 €').should('be.visible');

    cy.get('.month-selector .p-button').last().click({ force: true });
    cy.contains('.group-display', '90,00 €').should('be.visible');

    cy.get('.month-selector .p-button').last().click({ force: true });
    cy.contains('.group-display', '90,00 €').should('be.visible');

    cy.get('.month-selector .p-button').eq(0).click({ force: true });
    cy.get('.month-selector .p-button').eq(0).click({ force: true });
    cy.get('.month-selector .p-button').eq(0).click({ force: true });
    cy.contains('.group-display', '90,00 €').should('not.exist');
  });

  it('should validate the edit-monthly-income field with a numeric keypad', () => {
    createBudget('1000');
    goToMonth();

    cy.get('#edit-monthly-income').click();
    cy.get('#monthly-income-edit-input').should('have.attr', 'inputmode', 'decimal');
    cy.get('#monthly-income-edit-input').should('not.have.attr', 'type', 'number');

    for (const value of ['0', 'abc', '-5']) {
      cy.get('#monthly-income-edit-input').clear();
      cy.get('#monthly-income-edit-input').type(value);
      cy.contains('.p-dialog:visible button', 'Guardar').should('be.disabled');
    }

    cy.get('#monthly-income-edit-input').clear();
    cy.get('#monthly-income-edit-input').type('1500,50');
    cy.contains('.p-dialog:visible button', 'Guardar').should('be.enabled');
  });

  it('should update monthly income from selected month to future months only', () => {
    createBudget('1000');
    goToMonth();

    cy.get('.month-selector .p-button').last().click({ force: true });

    cy.get('#edit-monthly-income').click();
    cy.get('#monthly-income-edit-input').clear();
    cy.get('#monthly-income-edit-input').type('1200');
    cy.contains('.p-dialog:visible button', 'Guardar').click();

    cy.contains('1.200,00 €').should('be.visible');
    cy.contains('600,00 €').should('be.visible');

    cy.get('.month-selector .p-button').eq(0).click({ force: true });
    cy.contains('1.000,00 €').should('be.visible');
  });

  it('should show the annual summary and navigate between year and month', () => {
    createBudget('1000');

    const currentMonth = new Date().getMonth() + 1;

    cy.contains('Resumen anual').should('be.visible');
    cy.contains('Ingreso anual planificado').should('be.visible');
    cy.contains('12.000,00 €').should('be.visible');

    cy.get('[data-testid^="year-month-card-"]').should('have.length', 12);
    cy.get('[data-testid="annual-group-needs"]').should('contain', '6.000,00 €');
    cy.get('[data-testid="annual-group-wants"]').should('contain', '3.600,00 €');
    cy.get('[data-testid="annual-group-savings"]').should('contain', '2.400,00 €');

    cy.get(`[data-testid="year-month-card-${currentMonth}"]`).click();
    cy.url().should('include', '/month');
    cy.contains('Ingreso Mensual').should('be.visible');
    cy.contains('1.000,00 €').should('be.visible');

    navTo('Año');
    cy.url().should('include', '/year');
    cy.contains('Resumen anual').should('be.visible');
  });

  it('should surface year insights once expenses exist', () => {
    createBudget('1000');

    openAddExpense();
    cy.get('#expense-amount').clear();
    cy.get('#expense-amount').type('120');
    submitAddExpense();

    navTo('Año');
    cy.url().should('include', '/year');

    cy.contains('Gasto por mes').should('be.visible');
    cy.contains('Categorías con más gasto').should('be.visible');
    cy.get('[aria-label="year-top-categories"]').should('contain', 'Vivienda');
    cy.get('[aria-label="year-top-categories"]').should('contain', '120,00 €');
  });

  it('should render the month view while offline after service worker activation', () => {
    createBudget('1300');
    goToMonth();

    cy.reload();
    cy.window().its('navigator.serviceWorker.controller').should('exist');

    setNetworkOffline();

    cy.visit('/month');
    cy.url().should('include', '/month');
    cy.contains('Ingreso Mensual').should('be.visible');
    cy.contains('1.300,00 €').should('be.visible');
  });

  it('should create, edit, and delete a custom category from category manager', () => {
    createBudget('1000');

    openAddExpense();

    cy.get('[data-testid="open-manage-categories"]').click({ force: true });
    cy.contains('.p-dialog-title', 'Gestionar categorías').should('be.visible');

    cy.get('[data-testid="new-category-name-input"]').type('Mascotas');
    cy.get('[data-testid="add-category-submit"]').click();
    cy.contains('Categoría creada').should('be.visible');

    cy.contains('[data-testid^="category-row-"]', 'Mascotas').should('be.visible');
    cy.contains('[data-testid^="category-row-"]', 'Mascotas')
      .find('[data-testid^="edit-category-"]')
      .click({ force: true });

    cy.contains('.p-dialog-title', 'Editar categoría').should('be.visible');
    cy.contains('.p-dialog-title', 'Editar categoría')
      .parents('.p-dialog')
      .first()
      .within(() => {
        cy.get('input').first().click({ force: true });
        cy.get('input').first().type('{selectall}Mascotas y vet', { force: true });
        cy.get('input').first().should('contain.value', 'Mascotas y vet');
        cy.get('#save-category-name').should('not.be.disabled');
        cy.get('#save-category-name').click({ force: true });
      });
    cy.contains('Categoría actualizada').should('be.visible');
    cy.contains('[data-testid^="category-row-"]', 'Mascotas y vet').should('be.visible');

    cy.contains('[data-testid^="category-row-"]', 'Mascotas y vet')
      .find('[data-testid^="delete-category-"]')
      .click();
    cy.contains('.p-dialog-title', 'Eliminar categoría').should('be.visible');
    cy.get('#confirm-category-delete').click();

    cy.contains('Categoría eliminada').should('be.visible');
    cy.contains('[data-testid^="category-row-"]', 'Mascotas y vet').should('not.exist');
  });

  it('should change the language from settings and persist it', () => {
    createBudget('1000');
    navTo('Ajustes');
    cy.url().should('include', '/settings');

    cy.get('#settings-language').select('English');
    cy.contains('.bottom-nav a', 'Year').should('be.visible');

    cy.reload();
    cy.contains('.bottom-nav a', 'Year').should('be.visible');
  });

  it('should export backup and import a snapshot replacing current data from settings', () => {
    createBudget('1000');
    navTo('Ajustes');
    cy.url().should('include', '/settings');

    let createObjectUrlCallCount = 0;
    let downloadClickCallCount = 0;

    cy.window().then((win) => {
      cy.stub(win.URL, 'createObjectURL').callsFake(() => {
        createObjectUrlCallCount += 1;
        return 'blob:triada-test';
      });
      cy.stub(win.HTMLAnchorElement.prototype, 'click').callsFake(() => {
        downloadClickCallCount += 1;
      });
    });

    cy.get('#settings-export').click();

    cy.then(() => {
      expect(createObjectUrlCallCount).to.eq(1);
      expect(downloadClickCallCount).to.eq(1);
    });
    cy.contains('Respaldo exportado correctamente.').should('be.visible');

    const snapshot = buildImportSnapshot();

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(JSON.stringify(snapshot)),
        fileName: 'triada-import.json',
        mimeType: 'application/json',
      },
      { force: true },
    );

    cy.contains('.p-dialog:visible', 'reemplazara toda tu base de datos').should('be.visible');
    cy.get('#settings-import-confirm').click();

    cy.contains('Respaldo importado correctamente.').should('be.visible');
    cy.url().should('include', '/year');
    cy.contains('900,00 €').should('be.visible');
    cy.contains('1.000,00 €').should('not.exist');
  });
});

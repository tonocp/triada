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
}

function submitAddExpense(): void {
  cy.contains('.p-dialog:visible .p-dialog-footer button', 'Agregar', { timeout: 10000 }).click({
    force: true,
  });

  cy.contains('.p-dialog-title', 'Agregar Gasto').should('not.exist');
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

  it('should create a budget in setup and redirect to dashboard', () => {
    createBudget('1000');

    cy.url().should('include', '/dashboard');
    cy.contains('Ingreso Mensual').should('be.visible');
    cy.contains('€1000.00').should('be.visible');
    cy.contains('Necesidades').should('be.visible');
    cy.contains('Gastos personales').should('be.visible');
    cy.contains('Ahorro e inversión').should('be.visible');
  });

  it('should keep data after page reload', () => {
    createBudget('2500');
    cy.url().should('include', '/dashboard');

    cy.reload();

    cy.url().should('include', '/dashboard');
    cy.contains('Ingreso Mensual').should('be.visible');
    cy.contains('€2500.00').should('be.visible');
  });

  it('should redirect from setup to dashboard when a budget already exists', () => {
    createBudget('1750');
    cy.url().should('include', '/dashboard');

    cy.visit('/setup');

    cy.url().should('include', '/dashboard');
    cy.contains('€1750.00').should('be.visible');
  });

  it('should keep create action disabled for invalid income values', () => {
    cy.contains('button', 'Crear Presupuesto').should('be.disabled');

    cy.get('#income').clear();
    cy.get('#income').type('0');
    cy.contains('button', 'Crear Presupuesto').should('be.disabled');

    cy.get('#income').clear();
    cy.get('#income').type('-1');
    cy.contains('button', 'Crear Presupuesto').should('be.disabled');
  });

  it('should default setup selectors to Spanish and Euro', () => {
    cy.get('#language').should('have.value', 'es');
    cy.get('#currency').should('have.value', 'EUR');
  });

  it('should render floored 50/30/20 preview values for decimal inputs', () => {
    cy.get('#income').clear();
    cy.get('#income').type('1000.55');

    cy.contains('Desglose 50/30/20').should('be.visible');
    cy.contains('€500.27').should('be.visible');
    cy.contains('€300.16').should('be.visible');
    cy.contains('€200.11').should('be.visible');
  });

  it('should persist selected locale after reload', () => {
    cy.get('#language').select('English');
    cy.contains('Welcome to Triada').should('be.visible');
    cy.contains('button', 'Create Budget').should('be.visible');

    cy.reload();

    cy.contains('Welcome to Triada').should('be.visible');
    cy.contains('button', 'Create Budget').should('be.visible');
  });

  it('should use selected currency symbol on dashboard after setup', () => {
    cy.get('#currency').select('€ - Euro');

    createBudget('1000');

    cy.url().should('include', '/dashboard');
    cy.contains('€1000.00').should('be.visible');
  });

  it('should add expense from dashboard form and persist after reload', () => {
    createBudget('1000');

    cy.url().should('include', '/dashboard');

    cy.contains('Necesidades').should('be.visible');
    cy.contains('€0.00').should('be.visible');

    cy.get('.actions-section .p-button').first().scrollIntoView();
    cy.get('.actions-section .p-button').first().click({ force: true });
    cy.contains('.p-dialog-title', 'Agregar Gasto').should('be.visible');
    cy.get('#expense-amount').should('not.be.disabled');
    cy.get('#expense-amount').clear();
    cy.get('#expense-amount').type('100.50');
    cy.get('input[placeholder="Describe este gasto"]').type('Supermercado semanal');
    submitAddExpense();

    cy.contains('€100.50').should('be.visible');

    cy.reload();

    cy.contains('€100.50').should('be.visible');
  });

  it('should apply recurring expense from current month to future months', () => {
    createBudget('1000');

    cy.get('.actions-section .p-button').first().scrollIntoView();
    cy.get('.actions-section .p-button').first().click({ force: true });
    cy.contains('.p-dialog-title', 'Agregar Gasto').should('be.visible');
    cy.get('#expense-amount').should('not.be.disabled');
    cy.get('#expense-amount').clear();
    cy.get('#expense-amount').type('50');
    cy.get('input[placeholder="Describe este gasto"]').type('Renta fija');
    cy.get('#expense-recurring').check({ force: true });
    cy.get('#expense-recurring').should('be.checked');
    submitAddExpense();
  });

  it('should update monthly income from selected month to future months only', () => {
    createBudget('1000');

    cy.get('.month-selector .p-button').last().click({ force: true });

    cy.get('#more-actions-menu-trigger').click();
    cy.contains('.p-menu-item-link', 'Editar ingreso mensual').click();
    cy.get('#monthly-income-edit-input').clear();
    cy.get('#monthly-income-edit-input').type('1200');
    cy.contains('.p-dialog:visible button', 'Guardar').click();

    cy.contains('€1200.00').should('be.visible');
    cy.contains('€600.00').should('be.visible');

    cy.get('.month-selector .p-button').eq(0).click({ force: true });
    cy.contains('€1000.00').should('be.visible');
  });

  it('should render dashboard while offline after service worker activation', () => {
    createBudget('1300');

    cy.url().should('include', '/dashboard');
    cy.reload();

    cy.window().its('navigator.serviceWorker.controller').should('exist');

    setNetworkOffline();

    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');
    cy.contains('Ingreso Mensual').should('be.visible');
    cy.contains('€1300.00').should('be.visible');
  });

  it('should create, edit, and delete a custom category from category manager', () => {
    createBudget('1000');

    cy.get('.actions-section .p-button').first().scrollIntoView();
    cy.get('.actions-section .p-button').first().click({ force: true });
    cy.contains('.p-dialog-title', 'Agregar Gasto').should('be.visible');

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

  it('should export backup and import snapshot replacing current data', () => {
    createBudget('1000');
    cy.contains('Ingreso Mensual').should('be.visible');

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

    cy.get('#more-actions-menu-trigger').click();
    cy.contains('.p-menu-item-link', 'Exportar respaldo JSON').click();

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

    cy.contains('Respaldo importado correctamente.').should('be.visible');
    cy.contains('€900.00').should('be.visible');
    cy.contains('€1000.00').should('not.exist');
  });
});

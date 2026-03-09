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

    cy.contains('.bucket-display', 'Necesidades')
      .contains('.amount-row', 'Gastado')
      .find('.amount-value')
      .should('contain', '€0.00');

    cy.get('.actions-section .p-button').scrollIntoView();
    cy.get('.actions-section .p-button').click({ force: true });
    cy.contains('.p-dialog-title', 'Agregar Gasto').should('be.visible');
    cy.get('.p-dialog:visible').within(() => {
      cy.get('#expense-category-needs').check({ force: true });
      cy.get('input[placeholder="0.00"]').last().clear();
      cy.get('input[placeholder="0.00"]').last().type('100.50');
      cy.contains('button', /^Agregar$/).click();
    });

    cy.contains('.bucket-display', 'Necesidades')
      .contains('.amount-row', 'Gastado')
      .find('.amount-value')
      .should('contain', '€100.50');

    cy.reload();

    cy.contains('.bucket-display', 'Necesidades')
      .contains('.amount-row', 'Gastado')
      .find('.amount-value')
      .should('contain', '€100.50');
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
});

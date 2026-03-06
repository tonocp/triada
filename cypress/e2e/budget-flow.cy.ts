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

describe('Budget flow', () => {
  beforeEach(() => {
    resetBrowserState();
  });

  it('should create a budget in setup and redirect to dashboard', () => {
    createBudget('1000');

    cy.url().should('include', '/dashboard');
    cy.contains('Ingreso Mensual').should('be.visible');
    cy.contains('$1000.00').should('be.visible');
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
    cy.contains('$2500.00').should('be.visible');
  });

  it('should redirect from setup to dashboard when a budget already exists', () => {
    createBudget('1750');
    cy.url().should('include', '/dashboard');

    cy.visit('/setup');

    cy.url().should('include', '/dashboard');
    cy.contains('$1750.00').should('be.visible');
  });
});

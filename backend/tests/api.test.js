const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

// Using mock token with timestamp for clean isolated test runs
const TEST_TOKEN = `mock-token-test-user-${Date.now()}`;

describe('Express REST API Automated Test Suite', () => {
  it('1. GET /api/v1/health should return 200 and healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
  });

  it('2. Protected endpoint without token should return 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/transactions');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  it('3. Protected endpoint with invalid token should return 401 Invalid Token', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', 'Bearer invalid-token');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('4. POST /api/v1/transactions with invalid data should return 400 Validation Error', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        type: 'invalid_type',
        title: '',
        amount: -50,
      });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
  });

  let createdExpenseId;
  let createdIncomeId;

  it('5. POST /api/v1/transactions creates a valid expense transaction', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        type: 'expense',
        title: 'Office Stationery & Books',
        amount: 450.5,
        category: 'Shopping',
        date: '2026-10-15',
        paymentMethod: 'Credit Card',
        notes: 'Monthly stationery refill',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.strictEqual(res.body.data.title, 'Office Stationery & Books');
    assert.strictEqual(res.body.data.amount, 450.5);
    createdExpenseId = res.body.data.id;
  });

  it('6. POST /api/v1/transactions creates a valid income transaction', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        type: 'income',
        title: 'Monthly Salary Credit',
        amount: 65000,
        category: 'Salary',
        date: '2026-10-01',
        paymentMethod: 'Bank Transfer',
        notes: 'Tech Corp monthly salary',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.amount, 65000);
    createdIncomeId = res.body.data.id;
  });

  it('7. GET /api/v1/transactions retrieves paginated list with search & filter', async () => {
    const res = await request(app)
      .get('/api/v1/transactions?search=Stationery')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.transactions));
    assert.strictEqual(res.body.data.transactions.length, 1);
    assert.strictEqual(res.body.data.transactions[0].id, createdExpenseId);
  });

  it('8. PATCH /api/v1/transactions/:id updates a transaction', async () => {
    const res = await request(app)
      .patch(`/api/v1/transactions/${createdExpenseId}`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        amount: 520,
        notes: 'Updated refill amount',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.amount, 520);
  });

  it('9. GET /api/v1/categories returns default and custom categories', async () => {
    const res = await request(app)
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.length >= 10);
  });

  it('10. POST /api/v1/categories creates a custom category', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        name: 'Gym & Fitness',
        type: 'expense',
        icon: 'activity',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, 'Gym & Fitness');
  });

  it('11. POST /api/v1/budgets sets a monthly budget and verifies spending', async () => {
    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        categoryId: 'all',
        categoryName: 'Total Monthly Budget',
        amount: 25000,
        month: 10,
        year: 2026,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const getRes = await request(app)
      .get('/api/v1/budgets?month=10&year=2026')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.data.budgets.length >= 1);
    // Verified that spending is calculated correctly from the expense transaction
    const totalBudget = getRes.body.data.budgets.find((b) => b.categoryId === 'all');
    assert.ok(totalBudget);
    assert.strictEqual(totalBudget.spent, 520);
  });

  it('12. GET /api/v1/dashboard/summary calculates correct metrics and income vs expenses', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary?month=10&year=2026')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const cards = res.body.data.cards;
    assert.strictEqual(cards.periodIncome, 65000);
    assert.strictEqual(cards.periodExpense, 520);
    assert.strictEqual(cards.netCashFlow, 64480);
    assert.strictEqual(cards.totalBalance, 64480);
  });

  it('13. GET /api/v1/reports/export downloads safe CSV file', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.header['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Office Stationery & Books'));
    assert.ok(res.text.includes('Monthly Salary Credit'));
  });

  it('14. DELETE /api/v1/transactions/:id deletes the transaction', async () => {
    const res = await request(app)
      .delete(`/api/v1/transactions/${createdExpenseId}`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});

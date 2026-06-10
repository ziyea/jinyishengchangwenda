const { test, expect } = require('@playwright/test');

test.describe('后端版 — 注册与答题', () => {
  test('页面加载，显示注册表单', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('精益');
    await expect(page.locator('#regName')).toBeVisible();
    await expect(page.locator('#regEid')).toBeVisible();
    await expect(page.locator('#btnGo')).toBeVisible();
  });

  test('填写信息后开始答题', async ({ page }) => {
    await page.goto('/');
    await page.fill('#regName', '测试员');
    await page.fill('#regEid', '00123');
    await page.click('#btnGo');

    // 应进入答题页，显示题目文本和选项
    await expect(page.locator('.q-text')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.opt').first()).toBeVisible();
    await expect(page.locator('#btnNext')).toBeVisible();
  });

  test('完成全部题目提交，显示分数', async ({ page }) => {
    await page.goto('/');
    await page.fill('#regName', '提交测试');
    await page.fill('#regEid', '90001');
    await page.click('#btnGo');

    // 10 道题，每题选第一个选项后点下一题
    for (let i = 0; i < 10; i++) {
      await expect(page.locator('.q-text')).toBeVisible();
      const firstOpt = page.locator('.opt').first();
      await firstOpt.click();
      await expect(firstOpt).toHaveClass(/sel/);
      const btn = page.locator('#btnNext');
      await btn.click();
    }

    // 提交后应显示分数
    await expect(page.locator('.r-score')).toBeVisible({ timeout: 5000 });
    const scoreText = await page.locator('.r-score').textContent();
    const score = parseInt(scoreText, 10);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

test.describe('后端版 — API 接口', () => {
  test('/api/random-questions 返回 10 道题目', async ({ request }) => {
    const resp = await request.get('/api/random-questions');
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe('new');
    expect(data.questions).toHaveLength(10);
  });

  test('/api/score 查分接口可访问', async ({ request }) => {
    const resp = await request.get('/api/score');
    expect(resp.status()).toBe(200);
  });
});

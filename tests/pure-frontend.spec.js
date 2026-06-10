const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_PATH = path.resolve(__dirname, '../index.html');

test.describe('纯前端版 — 首页', () => {
  test('加载页面，显示注册表单', async ({ page }) => {
    await page.goto(`file://${INDEX_PATH}`);
    await expect(page.locator('h1')).toContainText('精益');
    await expect(page.locator('#regName')).toBeVisible();
    await expect(page.locator('#regEid')).toBeVisible();
    await expect(page.locator('#regDept')).toBeVisible();
    await expect(page.locator('#btnGo')).toBeVisible();
  });

  test('不填姓名时点击开始，弹出提示', async ({ page }) => {
    await page.goto(`file://${INDEX_PATH}`);
    await page.click('#btnGo');
    await expect(page.locator('#toast')).toContainText('请输入姓名');
  });

  test('填写信息后开始答题', async ({ page }) => {
    await page.goto(`file://${INDEX_PATH}`);
    await page.fill('#regName', '测试员');
    await page.fill('#regEid', '00123');
    await page.fill('#regDept', '总经办');
    await page.click('#btnGo');
    await expect(page.locator('.q-card')).toBeVisible();
    await expect(page.locator('.q-text')).toBeVisible();
    await expect(page.locator('.progress-txt')).toBeVisible();
  });
});

test.describe('纯前端版 — 答题流程', () => {
  test('完成全部题目后提交，显示分数', async ({ page }) => {
    await page.goto(`file://${INDEX_PATH}`);
    await page.fill('#regName', '测试员');
    await page.fill('#regEid', '00123');
    await page.fill('#regDept', '总经办');
    await page.click('#btnGo');

    for (let i = 0; i < 10; i++) {
      await expect(page.locator('.q-card')).toBeVisible();
      const firstOpt = page.locator('.opt').first();
      await firstOpt.click();
      await expect(firstOpt).toHaveClass(/sel/);
      await page.locator('#btnNext').click();
    }

    await expect(page.locator('.r-score')).toBeVisible();
  });
});

test.describe('纯前端版 — 管理面板', () => {
  test('点击齿轮弹出密码输入，正确密码进入管理面板', async ({ page }) => {
    // 先监听 dialog 再点击触发
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('admin888');
    });
    await page.goto(`file://${INDEX_PATH}`);
    await page.click('#admBtn');
    // 输入正确密码后应进入管理面板
    await expect(page.locator('.admin-box')).toBeVisible({ timeout: 3000 });
  });

  test('管理面板有导出按钮和清空按钮', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept('admin888');
    });
    await page.goto(`file://${INDEX_PATH}`);
    await page.click('#admBtn');
    await expect(page.locator('#btnXlsx')).toBeVisible();
    await expect(page.locator('#btnJson')).toBeVisible();
    await expect(page.locator('#btnClear')).toBeVisible();
    await expect(page.locator('#btnCls')).toBeVisible();
  });
});

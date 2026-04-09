from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    print("正在访问应用...")
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    
    print("等待页面加载完成...")
    time.sleep(2)
    
    print("截取屏幕截图...")
    page.screenshot(path='e:/项目/data-viz-app/screenshot.png', full_page=True)
    
    print("检查页面标题...")
    title = page.title()
    print(f"页面标题: {title}")
    
    print("检查主要元素...")
    try:
        upload_area = page.locator('text=拖拽文件到此处')
        if upload_area.count() > 0:
            print("✓ 文件上传区域已找到")
        else:
            print("✗ 文件上传区域未找到")
    except Exception as e:
        print(f"检查文件上传区域时出错: {e}")
    
    print("\n测试完成！")
    browser.close()

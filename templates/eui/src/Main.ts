/**
 * Blakron EUI 项目模板
 *
 * 使用 @blakron/ui 组件库 + EXML 皮肤系统构建数据驱动的 UI 界面。
 * Main 继承 UILayer，在 createChildren 中初始化主题并创建游戏场景。
 *
 * 生命周期：createChildren → 初始化 Theme → runGame → loadResource → createGameScene → startAnimation
 *
 * 主题（Theme）：
 *   - resource/default.thm.json 定义了组件名到皮肤名的映射
 *   - src/skins/*.exml 是皮肤描述文件，编译时由 EXML 编译器转为 .gjs.js
 *   - blakron build 自动完成 EXML 编译
 *
 * 组件（@blakron/ui）：
 *   - Button / CheckBox / RadioButton — 按钮类组件
 *   - Label / TextInput — 文本显示与输入
 *   - ComboBox / List / TabBar — 数据驱动选择组件
 *   - Panel / Scroller / ViewStack — 容器组件
 *   - HSlider / VSlider / ProgressBar — 数值类组件
 *   - 更多组件请查阅 @blakron/ui 文档
 */
import { createPlayer, TextField, Shape, TouchEvent, Event, Stage, resource } from '@blakron/core';
import { Button, Label, CheckBox, ComboBox, Panel, Theme, setTheme, UILayer, ArrayCollection } from '@blakron/ui';
import { Tween } from '@blakron/game';

class Main extends UILayer {
	/**
	 * 组件子级创建完毕后调用。
	 * 在这里初始化主题、加载资源、启动游戏逻辑。
	 */
	protected createChildren(): void {
		super.createChildren();

		// 初始化主题 —— 将组件类名映射到皮肤类名
		// EXML 编译器会在 build 时将 src/skins/*.exml 编译为 JS 工厂函数
		const theme = new Theme('resource/default.thm.json');
		setTheme(theme);

		const stage = this.stage;
		if (!stage) return;

		this.runGame(stage).catch(e => {
			console.log(e);
		});
	}

	private async runGame(stage: Stage): Promise<void> {
		await this.loadResource(stage);
		this.createGameScene(stage);
		this.startAnimation();
	}

	private async loadResource(stage: Stage): Promise<void> {
		const loadingView = new LoadingUI();
		stage.addChild(loadingView);

		try {
			await resource.loadConfig('resource/default.res.json', 'resource/');
			if (resource.hasGroup('preload')) {
				await resource.loadGroup('preload', 0, (loaded, total) => {
					loadingView.onProgress(loaded, total);
				});
			}
		} catch {
			// 资源配置文件不存在时静默跳过（纯代码项目无需资源配置）
		}

		stage.removeChild(loadingView);
	}

	private textfield!: TextField;

	/**
	 * 创建游戏场景
	 *
	 * 演示了 @blakron/ui 组件的基本用法：
	 * - 创建组件实例 → 设置属性 → addChild 添加到场景
	 * - 组件会自动从 Theme 获取对应的皮肤
	 * - 通过 addEventListener 监听交互事件
	 */
	private createGameScene(stage: Stage): void {
		const stageW = stage.stageWidth;
		const stageH = stage.stageHeight;

		// 背景色块
		const sky = new Shape();
		sky.graphics.beginFill(0x1a1a2e, 1);
		sky.graphics.drawRect(0, 0, stageW, stageH);
		sky.graphics.endFill();
		this.addChild(sky);

		// 半透明顶栏
		const topMask = new Shape();
		topMask.graphics.beginFill(0x000000, 0.5);
		topMask.graphics.drawRect(0, 0, stageW, 172);
		topMask.graphics.endFill();
		topMask.y = 33;
		this.addChild(topMask);

		// 标题
		const colorLabel = new Label();
		colorLabel.textColor = 0xffffff;
		colorLabel.width = stageW;
		colorLabel.textAlign = 'center';
		colorLabel.text = 'Hello Blakron';
		colorLabel.size = 36;
		colorLabel.x = 0;
		colorLabel.y = 80;
		this.addChild(colorLabel);

		// 描述文本（用于动画）
		const textfield = new TextField();
		this.addChild(textfield);
		textfield.alpha = 0;
		textfield.width = stageW;
		textfield.textAlign = 'center';
		textfield.size = 24;
		textfield.textColor = 0xffffff;
		textfield.x = 0;
		textfield.y = 135;
		this.textfield = textfield;

		// 按钮 —— 点击后弹出 Panel
		const button = new Button();
		button.label = 'Click!';
		button.x = 240;
		button.y = 200;
		this.addChild(button);
		button.addEventListener(TouchEvent.TOUCH_TAP, this.onButtonClick, this);

		// 复选框
		const cb = new CheckBox();
		cb.label = 'Toggle option';
		cb.x = 200;
		cb.y = 260;
		this.addChild(cb);

		// 下拉选择框 —— 通过 ArrayCollection 提供数据
		const comboData = new ArrayCollection([{ label: 'Option A' }, { label: 'Option B' }, { label: 'Option C' }]);
		const combo = new ComboBox();
		combo.dataProvider = comboData;
		combo.x = 120;
		combo.y = 310;
		combo.prompt = 'Select...';
		this.addChild(combo);
	}

	/**
	 * 播放文本淡入淡出动画
	 */
	private startAnimation(): void {
		const texts = ['Open-source, Free, Multi-platform', 'Push Game Forward', 'HTML5 Game Engine'];
		let count = -1;
		const change = () => {
			count++;
			if (count >= texts.length) {
				count = 0;
			}
			this.textfield.text = texts[count];
			const tw = Tween.get(this.textfield);
			tw.to({ alpha: 1 }, 200);
			tw.wait(2000);
			tw.to({ alpha: 0 }, 200);
			tw.call(change, this);
		};
		change();
	}

	/**
	 * 点击按钮回调 —— 弹出一个 Panel 对话框
	 */
	private onButtonClick(_e: Event): void {
		const panel = new Panel();
		panel.title = 'Title';
		panel.x = 170;
		panel.y = 400;
		this.addChild(panel);
	}
}

// ── 启动 ──────────────────────────────────────────────────────────────────
const app = createPlayer({
	canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
	contentWidth: 640,
	contentHeight: 1136,
	scaleMode: 'showAll',
	frameRate: 60,
});

app.start(new Main());

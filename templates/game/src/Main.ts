/**
 * Blakron 标准游戏模板
 *
 * 使用 @blakron/core 进行 Canvas 绘制 + @blakron/game 补间动画。
 * 通过 Shape、TextField 等基础显示对象构建游戏场景。
 *
 * 生命周期：constructor → ADDED_TO_STAGE → onAddToStage → runGame → loadResource → createGameScene → startAnimation
 */
import { createPlayer, Sprite, TextField, Shape, Bitmap, Texture, Event, HttpRequest } from '@blakron/core';
import { Tween, Ease } from '@blakron/game';

class Main extends Sprite {
	public constructor() {
		super();
		this.addEventListener(Event.ADDED_TO_STAGE, this.onAddToStage, this);
	}

	private onAddToStage(_event: Event): void {
		this.runGame().catch(e => {
			console.log(e);
		});
	}

	private async runGame(): Promise<void> {
		await this.loadResource();
		this.createGameScene();
		this.startAnimation();
	}

	private async loadResource(): Promise<void> {
		const loadingView = new LoadingUI();
		this.stage!.addChild(loadingView);
		// TODO: integrate with @blakron/core Resource when available
		this.stage!.removeChild(loadingView);
	}

	private textfield!: TextField;

	/**
	 * 创建游戏场景
	 *
	 * 使用 Shape（矢量绘制）和 TextField（文本）等基础显示对象搭建画面。
	 */
	private createGameScene(): void {
		const stageW = this.stage!.stageWidth;
		const stageH = this.stage!.stageHeight;

		// 背景色块
		const sky = new Shape();
		sky.graphics.beginFill(0x2d3436, 1);
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

		// 标题文本
		const colorLabel = new TextField();
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

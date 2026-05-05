/**
 * Blakron 标准游戏模板
 *
 * 使用 @blakron/core 进行纯 Canvas 绘制，不含 EUI 皮肤系统。
 * 通过 Shape、TextField 等基础显示对象构建游戏场景。
 *
 * 生命周期：constructor → ADDED_TO_STAGE → onAddToStage → runGame → createGameScene
 */
import { createPlayer, Sprite, TextField, Shape, Event } from '@blakron/core';

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
		this.createGameScene();
	}

	private textfield!: TextField;

	/**
	 * 创建游戏场景
	 *
	 * 使用 Shape（矢量绘制）和 TextField（文本）等基础显示对象搭建画面。
	 * 如需资源加载，可在 runGame() 中调用加载逻辑后再执行此方法。
	 */
	private createGameScene(): void {
		const stageW = 640;
		const stageH = 1136;

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

		// 描述文本（可用于后续动画等）
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

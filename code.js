import { RPM } from "../path.js"

const pluginName = "Multiple text boxes";

var lastX = 0;
var lastY = 0;

RPM.Core.WindowBox.prototype.draw = function (isChoice = false, windowDimension = this.windowDimension, contentDimension = this.contentDimension)
{
	if (this.content)
		this.content.drawBehind(contentDimension[0], contentDimension[1], contentDimension[2], contentDimension[3]);

	// Single line alteration from source code
	!!this.customWindowSkin ? this.customWindowSkin.drawBox(windowDimension, this.selected, this.bordersVisible) : RPM.Datas.Systems.getCurrentWindowSkin().drawBox(windowDimension, this.selected, this.bordersVisible);

	if (this.content)
	{
		if (!isChoice && this.limitContent)
		{
			RPM.Common.Platform.ctx.save();
			RPM.Common.Platform.ctx.beginPath();
			RPM.Common.Platform.ctx.rect(contentDimension[0], contentDimension[1] -
			RPM.Common.ScreenResolution.getScreenY(this.padding[3] / 2), contentDimension[2], contentDimension[3] + RPM.Common.ScreenResolution.getScreenY(this.padding[3]));
			RPM.Common.Platform.ctx.clip();
		}
		if (isChoice)
			this.content.drawChoice(contentDimension[0], contentDimension[1], contentDimension[2], contentDimension[3]);
		else
			this.content.draw(contentDimension[0], contentDimension[1], contentDimension[2], contentDimension[3]);
		if (!isChoice && this.limitContent)
			RPM.Common.Platform.ctx.restore();
	}
}

document.addEventListener("mousemove", (e) =>
{
	lastX = e.clientX;
	lastY = e.clientY;
});

window.addEventListener("resize", (e) =>
{
	const p = RPM.Manager.Stack.displayedPictures;
	for (var i = 0; i < p.length; i++)
	{
		if (!!p[i][1].customWindowSkin)
		{
			p[i][1].updateDimensions();
			p[i][1].update();
		}
	}
});

function getWindow(id)
{
	const p = RPM.Manager.Stack.displayedPictures;
	for (var i = 0; i < p.length; i++)
		if (id === p[i][0])
			return p[i][1];
	return new RPM.Core.WindowBox(0, 0, 0, 0);
}

RPM.Manager.Plugins.registerCommand(pluginName, "Spawn window", (id, x, y, width, height, text) =>
{
	var i;
	text = text.toString();
	while (true) // not the best practice but works in this scenario
	{
		i = text.search(/[^\\]\\n/); // regex for "find \n except when it's \\n"
		if (i === -1)
			break;
		text = text.slice(0, i + 1) + "\n" + text.slice(i + 3);
	}
	const pad = RPM.Datas.Systems.dbOptions;
	const value = [id, new RPM.Core.WindowBox(x, y, width, height,
	{
		content: new RPM.Graphic.Message(text, -1, 0, 0),
		padding: [pad.v_pLeft, pad.v_pTop, pad.v_pRight, pad.v_pBottom]
	})];
	value[1].content.update();
	value[1].customWindowSkin = RPM.Datas.Systems.getCurrentWindowSkin();
	const p = RPM.Manager.Stack.displayedPictures;
	var ok = false;
	for (i = 0; i < p.length; i++)
	{
		if (id === p[i][0])
		{
			p[i] = value;
			ok = true;
			break;
		}
		else if (id < p[i][0])
		{
			p.splice(i, 0, value);
			ok = true;
			break;
		}
	}
	if (!ok)
		p.push(value);
});

RPM.Manager.Plugins.registerCommand(pluginName, "Update window", (id) =>
{
	const p = getWindow(id);
	if (!!p)
	{
		p.updateDimensions();
		p.update();
	}
});

RPM.Manager.Plugins.registerCommand(pluginName, "Edit content", (id, text) =>
{
	const p = getWindow(id);
	if (!!p)
	{
		p.content.setMessage(text.toString());
		p.content.update();
	}
});

RPM.Manager.Plugins.registerCommand(pluginName, "Mark selected", (id, select) =>
{
	const p = getWindow(id);
	if (!!p)
		getWindow(id).selected = select;
});

RPM.Manager.Plugins.registerCommand(pluginName, "Get window under cursor", (variable) =>
{
	RPM.Core.Game.current.variables[variable] = null;
	const x = RPM.Common.ScreenResolution.getScreenXReverse(lastX);
	const y = RPM.Common.ScreenResolution.getScreenYReverse(lastY);
	const p = RPM.Manager.Stack.displayedPictures;
	for (var i = p.length - 1; i >= 0; i--)
	{
		if (p[i][1].constructor.name === "WindowBox" && x > p[i][1].oX && y > p[i][1].oY && x < p[i][1].oX + p[i][1].oW && y < p[i][1].oY + p[i][1].oH)
		{
			RPM.Core.Game.current.variables[variable] = p[i][0];
			break;
		}
	}
});

class DisplayChoiceCustom extends RPM.EventCommand.DisplayChoice
{
	constructor(command)
	{
		super([-1, command[0]]);
		var i = 0;
		this.choices = command[i++];
		this.x = command[i++];
		this.y = command[i++];
		this.maxWidth = command[i++];
		this.height = command[i++];
		this.space = command[i++];
		this.currentSelectedIndex = command[i++];
		this.cancelAutoIndex = RPM.System.DynamicValue.createNumber(command[i++]);
		this.resultVariableID = command[i++];
		this. disableCancel = command[i++];

		this.graphics = new Array(this.choices.length);
		for (let i = 0; i < this.choices.length; i++)
		{
			this.graphics[i] = new RPM.Graphic.Text(this.choices[i], { align: RPM.Common.Enum.Align.Center });
			this.maxWidth = Math.max(this.maxWidth, this.graphics[i].textWidth);
		}
	}

	initialize()
	{
		RPM.Core.Game.current.variables[this.resultVariableID] = null;
		this.windowChoices = new RPM.Core.WindowChoices(this.x, this.y, this.maxWidth, this.height, this.graphics, { nbItemsMax: this.choices.length, space: this.space });
		return { index: -1 };
	}

	action(currentState, isKey, options = {})
	{
		if (RPM.Scene.MenuBase.checkActionMenu(isKey, options))
		{
			RPM.Datas.Systems.soundConfirmation.playSound();
			currentState.index = this.windowChoices.currentSelectedIndex;
			RPM.Core.Game.current.variables[this.resultVariableID] = currentState.index;
		}
		else if (RPM.Scene.MenuBase.checkCancel(isKey, options) && !this.disableCancel)
		{
			RPM.Datas.Systems.soundCancel.playSound();
			currentState.index = this.cancelAutoIndex.getValue();
			RPM.Core.Game.current.variables[this.resultVariableID] = currentState.index;
		}
	}

	update(currentState)
	{
		this.windowChoices.update();
		return RPM.Core.Game.current.variables[this.resultVariableID] !== null;
	}
}

RPM.Manager.Plugins.registerCommand(pluginName, "Display choices", (choices, x, y, width, height, spacing, selected, cancel, result, disableCancel) =>
{
	const c = RPM.Core.ReactionInterpreter.currentReaction.currentCommand;
	if (!c.hasDisplayChoiceCustomCommand)
	{
		c.hasDisplayChoiceCustomCommand = true;
		const n = c.next;
		c.next = new RPM.Core.Node(c.parent, new DisplayChoiceCustom([choices, x, y, width, height, spacing, selected, cancel, result, disableCancel]));
		c.next.next = n;
	}
});

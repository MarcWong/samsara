var CLASS$=Laya.class;
var STATICATTR$=Laya.static;
var View=laya.ui.View;
var Dialog=laya.ui.Dialog;
var AchievementPopupUI=(function(_super){
		function AchievementPopupUI(){
			
		    this.boxBg=null;
		    this.bg1=null;
		    this.labName=null;
			AchievementPopupUI.__super.call(this);
		}
		CLASS$(AchievementPopupUI,'ui.view.DefaultTheme.AchievementPopupUI',_super);
		var __proto__=AchievementPopupUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(AchievementPopupUI.uiView);
		}
		AchievementPopupUI.uiView={"type":"View","props":{"y":50,"width":570,"mouseThrough":true,"mouseEnabled":false,"height":150,"alpha":0.75},"compId":1,"child":[{"type":"Box","props":{"var":"boxBg","top":0,"right":0,"name":"boxBg","left":0,"bottom":0},"compId":5,"child":[{"type":"Rect","props":{"y":0,"x":560,"width":10,"lineWidth":1,"height":150,"fillColor":"#84ff55"},"compId":14},{"type":"Box","props":{"var":"bg1","top":0,"runtime":"Laya.runtime.ColorfulBox","right":10,"left":0,"bottom":0},"compId":15}]},{"type":"Label","props":{"y":10,"text":"UI_Achievement_Achieve","left":40,"fontSize":40,"font":"Agency FB, Consolas, Arial","color":"#84ff55","bold":true},"compId":12},{"type":"Label","props":{"var":"labName","text":"Achievement","name":"labName","left":40,"fontSize":60,"font":"Agency FB, Consolas, Arial","color":"#cccccc","centerY":30},"compId":13}],"loadList":[],"loadList3D":[]};
		return AchievementPopupUI;
	})(View);
var MainUI=(function(_super){
		function MainUI(){
			
		    this.labSubTitle=null;
		    this.btnRemake=null;
			MainUI.__super.call(this);
		}
		CLASS$(MainUI,'ui.view.DefaultTheme.MainUI',_super);
		var __proto__=MainUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(MainUI.uiView);
		}
		MainUI.uiView={"type":"View","props":{"y":1218,"x":562,"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436,"anchorY":0.5,"anchorX":0.5},"compId":1,"child":[{"type":"Label","props":{"zOrder":1,"text":"UI_Title_Remake","name":"title","fontSize":130,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":-260,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":8},{"type":"Label","props":{"wordWrap":true,"var":"labSubTitle","text":"UI_Title_Subsequent","right":3,"name":"title","left":-14,"fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#999999","centerY":913,"anchorY":0.5,"anchorX":0.5,"align":"center"},"compId":11},{"type":"Box","props":{"zOrder":1,"width":600,"var":"btnRemake","runtime":"Laya.runtime.ColorfulBox","name":"btnRemake","height":150,"centerY":-36,"centerX":17,"bgColor":"#5a5757"},"compId":85,"child":[{"type":"Label","props":{"text":"Start","name":"label","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":86}]},{"type":"Image","props":{"top":0,"skin":"images/background/01.png","right":0,"left":0,"bottom":0},"compId":101}],"loadList":["images/background/01.png"],"loadList3D":[]};
		return MainUI;
	})(View);
var ModeUI=(function(_super){
		function ModeUI(){
			
		    this.btnAfg=null;
		    this.btnEgp=null;
		    this.btnInd=null;
		    this.btnJpn=null;
		    this.btnUsa=null;
		    this.btnChn=null;
		    this.boxText=null;
			ModeUI.__super.call(this);
		}
		CLASS$(ModeUI,'ui.view.DefaultTheme.ModeUI',_super);
		var __proto__=ModeUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(ModeUI.uiView);
		}
		ModeUI.uiView={"type":"View","props":{"width":1125,"height":2436},"compId":1,"child":[{"type":"Box","props":{"zOrder":1,"y":647,"x":188,"width":750,"var":"btnAfg","runtime":"Laya.runtime.ColorfulBox","name":"btnAfg","height":166,"centerY":-488,"centerX":0},"compId":2,"child":[{"type":"Label","props":{"y":43,"x":205,"width":339,"top":43,"text":"Afghanistan","name":"label","height":80,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":-10},"compId":4}]},{"type":"Box","props":{"zOrder":1,"y":1084,"x":188,"width":750,"var":"btnEgp","runtime":"Laya.runtime.ColorfulBox","name":"btnEgp","height":166,"centerY":-51,"centerX":0},"compId":12,"child":[{"type":"Label","props":{"width":150,"top":42,"text":"Egypt","name":"label","height":83,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0},"compId":13}]},{"type":"Box","props":{"zOrder":1,"y":1302,"x":188,"width":750,"var":"btnInd","runtime":"Laya.runtime.ColorfulBox","name":"btnInd","height":166,"centerY":167,"centerX":0},"compId":16,"child":[{"type":"Label","props":{"width":129,"top":43,"text":"India","name":"label","height":80,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0},"compId":17}]},{"type":"Box","props":{"zOrder":1,"y":1525,"x":188,"width":750,"var":"btnJpn","runtime":"Laya.runtime.ColorfulBox","name":"btnJpn","height":166,"centerY":390,"centerX":0},"compId":20,"child":[{"type":"Label","props":{"top":43,"text":"Japan","name":"label","fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0},"compId":21}]},{"type":"Box","props":{"zOrder":1,"y":1751,"x":188,"width":750,"var":"btnUsa","runtime":"Laya.runtime.ColorfulBox","name":"btnUsa","height":166,"centerY":616,"centerX":0},"compId":24,"child":[{"type":"Label","props":{"top":43,"text":"United States","name":"label","fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0},"compId":25}]},{"type":"Box","props":{"zOrder":1,"y":867,"x":188,"width":750,"var":"btnChn","runtime":"Laya.runtime.ColorfulBox","name":"btnChn","height":166,"centerY":-268,"centerX":0},"compId":28,"child":[{"type":"Label","props":{"width":150,"top":43,"text":"China","name":"label","height":80,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0,"bold":false},"compId":29}]},{"type":"Image","props":{"y":0,"x":0,"top":0,"skin":"images/background/03.png","right":0,"left":0,"bottom":0},"compId":32},{"type":"Label","props":{"zOrder":1,"width":620,"text":"♀Samsara","name":"title","height":100,"fontSize":130,"font":"Agency FB, Consolas, Arial","color":"#000000","centerY":-1067,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":33},{"type":"Box","props":{"zOrder":1,"y":318,"x":9,"width":1106,"var":"boxText","runtime":"Laya.runtime.ColorfulBox","name":"boxText","height":93,"centerY":-854,"centerX":20,"bgColor":"#f6f4f4","alpha":0.7},"compId":36,"child":[{"type":"Label","props":{"zOrder":1,"width":1012,"text":"Which country would you choose to be born in?","name":"label","height":100,"fontSize":72,"font":"Agency FB, Consolas, Arial","color":"#191717","centerY":14,"centerX":-30,"anchorY":0.5,"anchorX":0.5},"compId":37}]}],"loadList":["images/background/03.png"],"loadList3D":[]};
		return ModeUI;
	})(View);
var PropertyUI=(function(_super){
		function PropertyUI(){
			
		    this.labLeftPropertyPoint=null;
		    this.boxCharm=null;
		    this.boxCharmAllocate=null;
		    this.btnCharmReduce=null;
		    this.inputCharm=null;
		    this.btnCharmIncrease=null;
		    this.boxIntelligence=null;
		    this.boxIntelligenceAllocate=null;
		    this.btnIntelligenceReduce=null;
		    this.inputIntelligence=null;
		    this.btnIntelligenceIncrease=null;
		    this.boxStrength=null;
		    this.boxStrengthAllocate=null;
		    this.btnStrengthReduce=null;
		    this.inputStrength=null;
		    this.btnStrengthIncrease=null;
		    this.boxMoney=null;
		    this.boxSpiritAllocate=null;
		    this.btnSpiritReduce=null;
		    this.inputSpirit=null;
		    this.btnSpiritIncrease=null;
		    this.btnMoneyReduce=null;
		    this.inputMoney=null;
		    this.btnMoneyIncrease=null;
		    this.listSelectedTalents=null;
		    this.btnRandomAllocate=null;
		    this.btnNext=null;
		    this.boxText=null;
			PropertyUI.__super.call(this);
		}
		CLASS$(PropertyUI,'ui.view.DefaultTheme.PropertyUI',_super);
		var __proto__=PropertyUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			View.regComponent("Laya.runtime.ColorFilterItem",Laya.runtime.ColorFilterItem);
			View.regComponent("Laya.runtime.ScaleButton",Laya.runtime.ScaleButton);
			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(PropertyUI.uiView);
		}
		PropertyUI.uiView={"type":"View","props":{"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436},"compId":1,"child":[{"type":"Box","props":{"zOrder":1,"top":230,"right":40,"name":"propertyAllocate","left":40,"height":1100},"compId":8,"child":[{"type":"HBox","props":{"top":0,"height":100,"centerX":0},"compId":50,"child":[{"type":"Label","props":{"x":0,"text":"UI_Left_Property_Point","name":"font_default","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0},"compId":52},{"type":"Label","props":{"x":1,"text":"UI_Colon","name":"font_default","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0},"compId":54},{"type":"Label","props":{"x":2,"var":"labLeftPropertyPoint","text":"0","name":"font_default","fontSize":70,"color":"#ffffff","centerY":0},"compId":53}]},{"type":"VBox","props":{"top":200,"space":100,"right":50,"left":50},"compId":120,"child":[{"type":"Box","props":{"y":0,"var":"boxCharm","right":0,"left":0,"height":130},"compId":10,"child":[{"type":"Label","props":{"x":183,"text":"UI_Property_Charm","name":"font_default","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"anchorY":0.5,"anchorX":0.5},"compId":19},{"type":"Box","props":{"width":590,"var":"boxCharmAllocate","runtime":"Laya.runtime.ColorFilterItem","right":30,"name":"property","height":110,"centerY":0},"compId":20,"child":[{"type":"Box","props":{"width":110,"var":"btnCharmReduce","name":"btnCharmReduce","left":0,"height":110,"centerY":0},"compId":21,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":24,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":26},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":27},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":28},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":30}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":39,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":25,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":23}]}]}]},{"type":"Box","props":{"y":0,"x":110,"top":0,"right":110,"left":110,"bottom":0},"compId":42,"child":[{"type":"TextInput","props":{"var":"inputCharm","type":"number","top":0,"text":"0","right":0,"promptColor":"#828282","prompt":0,"name":"inputCharm","maxChars":1,"left":0,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#ffffff","bottom":0,"align":"center"},"compId":48},{"type":"Rect","props":{"y":0,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":223},{"type":"Rect","props":{"y":106,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":224}]},{"type":"Box","props":{"width":110,"var":"btnCharmIncrease","right":0,"name":"btnCharmIncrease","height":110,"centerY":0},"compId":22,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":31,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":32},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":33},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":34},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":35}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":38,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":36,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":37}]},{"type":"Box","props":{"width":48,"rotation":90,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":40,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":41}]}]}]}]}]},{"type":"Box","props":{"y":1,"var":"boxIntelligence","right":0,"left":0,"height":130},"compId":121,"child":[{"type":"Label","props":{"x":183,"text":"UI_Property_Intelligence","name":"font_default","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"anchorY":0.5,"anchorX":0.5},"compId":124},{"type":"Box","props":{"width":590,"var":"boxIntelligenceAllocate","runtime":"Laya.runtime.ColorFilterItem","right":30,"name":"property","height":110,"centerY":0},"compId":125,"child":[{"type":"Box","props":{"width":110,"var":"btnIntelligenceReduce","name":"btnIntelligenceReduce","left":0,"height":110,"centerY":0},"compId":126,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":127,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":128},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":129},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":130},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":131}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":132,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":133,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":134}]}]}]},{"type":"Box","props":{"y":0,"x":110,"top":0,"right":110,"left":110,"bottom":0},"compId":135,"child":[{"type":"TextInput","props":{"var":"inputIntelligence","type":"number","top":0,"text":"0","right":0,"promptColor":"#828282","prompt":0,"name":"inputIntelligence","maxChars":1,"left":0,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#ffffff","bottom":0,"align":"center"},"compId":136},{"type":"Rect","props":{"y":0,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":221},{"type":"Rect","props":{"y":106,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":222}]},{"type":"Box","props":{"width":110,"var":"btnIntelligenceIncrease","right":0,"name":"btnIntelligenceIncrease","height":110,"centerY":0},"compId":140,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":141,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":142},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":143},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":144},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":145}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":146,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":147,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":148}]},{"type":"Box","props":{"width":48,"rotation":90,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":149,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":150}]}]}]}]}]},{"type":"Box","props":{"y":2,"var":"boxStrength","right":0,"left":0,"height":130},"compId":151,"child":[{"type":"Label","props":{"x":183,"text":"UI_Property_Strength","name":"font_default","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"anchorY":0.5,"anchorX":0.5},"compId":154},{"type":"Box","props":{"width":590,"var":"boxStrengthAllocate","runtime":"Laya.runtime.ColorFilterItem","right":30,"name":"property","height":110,"centerY":0},"compId":155,"child":[{"type":"Box","props":{"width":110,"var":"btnStrengthReduce","name":"btnStrengthReduce","left":0,"height":110,"centerY":0},"compId":156,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":157,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":158},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":159},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":160},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":161}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":162,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":163,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":164}]}]}]},{"type":"Box","props":{"y":0,"x":110,"top":0,"right":110,"left":110,"bottom":0},"compId":165,"child":[{"type":"TextInput","props":{"var":"inputStrength","type":"number","top":0,"text":"0","right":0,"promptColor":"#828282","prompt":0,"name":"inputStrength","maxChars":1,"left":0,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#ffffff","bottom":0,"align":"center"},"compId":166},{"type":"Rect","props":{"y":0,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":219},{"type":"Rect","props":{"y":106,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":220}]},{"type":"Box","props":{"width":110,"var":"btnStrengthIncrease","right":0,"name":"btnStrengthIncrease","height":110,"centerY":0},"compId":170,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":171,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":172},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":173},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":174},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":175}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":176,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":177,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":178}]},{"type":"Box","props":{"width":48,"rotation":90,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":179,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":180}]}]}]}]}]},{"type":"Box","props":{"y":3,"var":"boxMoney","right":0,"name":"boxEQ","left":0,"height":130},"compId":181,"child":[{"type":"Label","props":{"x":183,"text":"UI_Property_Spirit","name":"font_default","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"anchorY":0.5,"anchorX":0.5},"compId":184},{"type":"Box","props":{"width":590,"var":"boxSpiritAllocate","runtime":"Laya.runtime.ColorFilterItem","right":30,"name":"property","height":110,"centerY":0},"compId":185,"child":[{"type":"Box","props":{"width":110,"var":"btnSpiritReduce","name":"btnSpiritReduce","left":0,"height":110,"centerY":0},"compId":186,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":187,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":188},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":189},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":190},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":191}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":192,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":193,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":194}]}]}]},{"type":"Box","props":{"y":0,"x":110,"top":0,"right":110,"left":110,"bottom":0},"compId":195,"child":[{"type":"TextInput","props":{"var":"inputSpirit","type":"number","top":0,"text":"0","right":0,"promptColor":"#828282","prompt":0,"name":"inputSpirit","maxChars":1,"left":0,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#ffffff","bottom":0,"align":"center"},"compId":196},{"type":"Rect","props":{"y":0,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":217},{"type":"Rect","props":{"y":106,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":218}]},{"type":"Box","props":{"width":110,"var":"btnSpiritIncrease","right":0,"name":"btnSpiritIncrease","height":110,"centerY":0},"compId":200,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":201,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":202},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":203},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":204},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":205}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":206,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":207,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":208}]},{"type":"Box","props":{"width":48,"rotation":90,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":209,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":210}]}]}]}]}]},{"type":"Box","props":{"y":-187,"x":-50,"right":0,"name":"boxMoney","left":0,"height":130},"compId":252,"child":[{"type":"Label","props":{"x":183,"text":"UI_Property_Money","name":"font_default","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"anchorY":0.5,"anchorX":0.5},"compId":253},{"type":"Box","props":{"width":590,"runtime":"Laya.runtime.ColorFilterItem","right":30,"name":"property","height":110,"centerY":0},"compId":254,"child":[{"type":"Box","props":{"width":110,"var":"btnMoneyReduce","name":"btnMoneyReduce","left":0,"height":110,"centerY":0},"compId":255,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":256,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":257},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":258},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":259},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":260}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":261,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":262,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":263}]}]}]},{"type":"Box","props":{"y":0,"x":110,"top":0,"right":110,"left":110,"bottom":0},"compId":264,"child":[{"type":"TextInput","props":{"var":"inputMoney","type":"number","top":0,"text":"0","right":0,"promptColor":"#828282","prompt":0,"name":"inputMoney","maxChars":1,"left":0,"fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#ffffff","bottom":0,"align":"center"},"compId":265},{"type":"Rect","props":{"y":0,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":266},{"type":"Rect","props":{"y":106,"x":0,"width":370,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":267}]},{"type":"Box","props":{"width":110,"var":"btnMoneyIncrease","right":0,"name":"btnMoneyIncrease","height":110,"centerY":0},"compId":268,"child":[{"type":"Box","props":{"width":110,"height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":269,"child":[{"type":"Rect","props":{"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":270},{"type":"Rect","props":{"y":106,"x":0,"width":110,"lineWidth":1,"height":4,"fillColor":"#ffffff"},"compId":271},{"type":"Rect","props":{"y":0,"x":0,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":272},{"type":"Rect","props":{"y":0,"x":106,"width":4,"lineWidth":1,"height":110,"fillColor":"#ffffff"},"compId":273}]},{"type":"Box","props":{"width":110,"runtime":"Laya.runtime.ScaleButton","height":110,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":274,"child":[{"type":"Box","props":{"width":48,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":275,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":276}]},{"type":"Box","props":{"width":48,"rotation":90,"height":12,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":277,"child":[{"type":"Rect","props":{"y":0,"x":0,"width":48,"lineWidth":1,"height":12,"fillColor":"#ffffff"},"compId":278}]}]}]}]}]}]}]},{"type":"Box","props":{"visible":false,"right":40,"name":"selectedTalents","left":40,"height":450,"bottom":300},"compId":56,"child":[{"type":"Label","props":{"top":20,"text":"UI_Selected_Talent","name":"font_default","left":20,"fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff"},"compId":57},{"type":"List","props":{"var":"listSelectedTalents","vScrollBarSkin":" ","top":110,"spaceY":20,"right":10,"repeatY":3,"repeatX":1,"name":"listSelectedTalents","left":10,"bottom":10},"compId":58,"child":[{"type":"Box","props":{"y":15,"runtime":"Laya.runtime.ColorfulBox","right":15,"renderType":"render","left":15,"height":80},"compId":215,"child":[{"type":"Label","props":{"y":20,"text":"Title","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":216}]}]}]},{"type":"HBox","props":{"zOrder":1,"space":40,"name":"buttonGroup","height":150,"centerX":0,"bottom":90},"compId":212,"child":[{"type":"Box","props":{"y":0,"x":0,"width":480,"var":"btnRandomAllocate","top":0,"runtime":"Laya.runtime.ColorfulBox","name":"btnRandomAllocate","bottom":0},"compId":72,"child":[{"type":"Label","props":{"text":"UI_Random_Allocate","name":"label","fontSize":60,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":213}]},{"type":"Box","props":{"x":1,"width":480,"var":"btnNext","top":0,"runtime":"Laya.runtime.ColorfulBox","name":"btnNext","bottom":0},"compId":73,"child":[{"type":"Label","props":{"text":"UI_Make_New_Life","name":"label","fontSize":60,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":214}]}]},{"type":"Label","props":{"zOrder":1,"y":151,"x":562,"width":535,"text":"♀Samsara","name":"title","height":100,"fontSize":130,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":-1067,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":279},{"type":"Image","props":{"top":0,"skin":"images/background/07.png","right":0,"left":0,"bottom":0},"compId":280},{"type":"Box","props":{"zOrder":1,"width":1121,"var":"boxText","runtime":"Laya.runtime.ColorfulBox","name":"boxText","height":273,"centerY":481,"centerX":9,"bgColor":"#f6f4f4","alpha":0.7},"compId":281,"child":[{"type":"Label","props":{"zOrder":1,"wordWrap":true,"width":1121,"text":"To even it out or to be bold with the category you think is the most important one — that is the question.","name":"label","height":224,"fontSize":72,"font":"Agency FB, Consolas, Arial","color":"#191717","centerY":0,"centerX":30,"anchorY":0.5,"anchorX":0.5},"compId":282}]}],"loadList":["images/background/07.png"],"loadList3D":[]};
		return PropertyUI;
	})(View);
var PropertyTextUI=(function(_super){
		function PropertyTextUI(){
			
		    this.boxProperty=null;
		    this.btnContinue=null;
			PropertyTextUI.__super.call(this);
		}
		CLASS$(PropertyTextUI,'ui.view.DefaultTheme.PropertyTextUI',_super);
		var __proto__=PropertyTextUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(PropertyTextUI.uiView);
		}
		PropertyTextUI.uiView={"type":"View","props":{"y":1218,"x":562,"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436,"anchorY":0.5,"anchorX":0.5},"compId":1,"child":[{"type":"Box","props":{"zOrder":1,"width":1190,"var":"boxProperty","runtime":"Laya.runtime.ColorfulBox","name":"boxProperty","height":437,"centerY":-389,"centerX":0,"bgColor":"#f6f4f4","alpha":0.7},"compId":107,"child":[{"type":"Label","props":{"zOrder":1,"wordWrap":true,"width":1108,"text":"You have 13 tokens to allocate into the following 5 categories to restart your life as you desire:  Family Wealth, Health, Appearance, IQ, and EQ.Choose carefully!","name":"label","height":100,"fontSize":72,"font":"Agency FB, Consolas, Arial","color":"#191717","centerY":-138,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":8}]},{"type":"Box","props":{"zOrder":1,"width":440,"var":"btnContinue","runtime":"Laya.runtime.ColorfulBox","name":"btnContinue","height":150,"centerY":52,"centerX":215,"bgColor":"#f6f4f4","alpha":0.7},"compId":85,"child":[{"type":"Label","props":{"text":"Continue","name":"label","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#000000","centerY":0,"centerX":0},"compId":86}]},{"type":"Image","props":{"top":0,"skin":"images/background/06.png","right":0,"left":0,"bottom":0},"compId":109},{"type":"Label","props":{"zOrder":1,"y":10,"x":10,"width":520,"text":"♀Samsara","name":"title","height":100,"fontSize":130,"font":"Agency FB, Consolas, Arial","color":"#000000","centerY":1118,"centerX":302,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":110}],"loadList":["images/background/06.png"],"loadList3D":[]};
		return PropertyTextUI;
	})(View);
var RebornUI=(function(_super){
		function RebornUI(){
			
		    this.boxReborn=null;
		    this.btnContinue=null;
			RebornUI.__super.call(this);
		}
		CLASS$(RebornUI,'ui.view.DefaultTheme.RebornUI',_super);
		var __proto__=RebornUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(RebornUI.uiView);
		}
		RebornUI.uiView={"type":"View","props":{"y":1218,"x":562,"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436,"anchorY":0.5,"anchorX":0.5},"compId":1,"child":[{"type":"Box","props":{"zOrder":1,"width":917,"var":"boxReborn","runtime":"Laya.runtime.ColorfulBox","name":"boxReborn","height":93,"centerY":-245,"centerX":0,"bgColor":"#f6f4f4","alpha":0.7},"compId":107,"child":[{"type":"Label","props":{"zOrder":1,"width":1012,"text":"You are reborn today as a female.","name":"label","height":100,"fontSize":72,"font":"Agency FB, Consolas, Arial","color":"#191717","centerY":13,"centerX":64,"anchorY":0.5,"anchorX":0.5},"compId":8}]},{"type":"Box","props":{"zOrder":1,"width":440,"var":"btnContinue","runtime":"Laya.runtime.ColorfulBox","name":"btnContinue","height":150,"centerY":52,"centerX":328,"bgColor":"#f6f4f4","alpha":0.7},"compId":85,"child":[{"type":"Label","props":{"text":"Continue","name":"label","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#000000","centerY":0,"centerX":0},"compId":86}]},{"type":"Image","props":{"top":0,"skin":"images/background/02.png","right":0,"left":0,"bottom":0},"compId":105},{"type":"Label","props":{"zOrder":1,"width":520,"text":"♀Samsara","name":"title","height":100,"fontSize":130,"font":"Agency FB, Consolas, Arial","color":"#000000","centerY":1118,"centerX":302,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":106}],"loadList":["images/background/02.png"],"loadList3D":[]};
		return RebornUI;
	})(View);
var SexOrientationUI=(function(_super){
		function SexOrientationUI(){
			
		    this.btnStraight=null;
		    this.btnLBTQ=null;
		    this.boxText=null;
			SexOrientationUI.__super.call(this);
		}
		CLASS$(SexOrientationUI,'ui.view.DefaultTheme.SexOrientationUI',_super);
		var __proto__=SexOrientationUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(SexOrientationUI.uiView);
		}
		SexOrientationUI.uiView={"type":"View","props":{"width":1125,"height":2436},"compId":1,"child":[{"type":"Box","props":{"zOrder":1,"width":600,"var":"btnStraight","runtime":"Laya.runtime.ColorfulBox","name":"btnStraight","height":160,"centerY":-472,"centerX":0,"bgColor":"#ffffff"},"compId":2,"child":[{"type":"Label","props":{"y":40,"x":149,"top":50,"text":"Straight","name":"label","fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0},"compId":4}]},{"type":"Box","props":{"zOrder":1,"width":600,"var":"btnLBTQ","runtime":"Laya.runtime.ColorfulBox","name":"btnLBTQ","height":160,"centerY":-254,"centerX":0,"bgColor":"#ffffff"},"compId":12,"child":[{"type":"Label","props":{"y":40,"x":191,"top":50,"text":"LBTQ","name":"label","fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0},"compId":13}]},{"type":"Label","props":{"zOrder":1,"width":520,"text":"♀Samsara","name":"title","height":100,"fontSize":130,"font":"Agency FB, Consolas, Arial","color":"#000000","centerY":-1067,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":33},{"type":"Image","props":{"top":0,"skin":"images/background/04.png","right":0,"left":0,"bottom":0},"compId":35},{"type":"Box","props":{"zOrder":1,"y":321,"x":54,"width":1017,"var":"boxText","runtime":"Laya.runtime.ColorfulBox","name":"boxText","height":93,"centerY":-851,"centerX":65,"bgColor":"#f6f4f4","alpha":0.7},"compId":36,"child":[{"type":"Label","props":{"zOrder":1,"width":1012,"text":"What's your choice of sextual orientation?","name":"label","height":100,"fontSize":72,"font":"Agency FB, Consolas, Arial","color":"#191717","centerY":13,"centerX":14,"anchorY":0.5,"anchorX":0.5},"compId":37}]}],"loadList":["images/background/04.png"],"loadList3D":[]};
		return SexOrientationUI;
	})(View);
var SummaryUI=(function(_super){
		function SummaryUI(){
			
		    this.title=null;
		    this.listSummary=null;
		    this.listSelectedTalents=null;
		    this.btnAgain=null;
		    this.btnPrint=null;
			SummaryUI.__super.call(this);
		}
		CLASS$(SummaryUI,'ui.view.DefaultTheme.SummaryUI',_super);
		var __proto__=SummaryUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			View.regComponent("Text",Laya.Text);
			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(SummaryUI.uiView);
		}
		SummaryUI.uiView={"type":"View","props":{"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436},"compId":1,"child":[{"type":"Label","props":{"zOrder":1,"y":80,"var":"title","text":"UI_Title_Summary","name":"title","fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#000000","centerX":0},"compId":6},{"type":"Box","props":{"zOrder":1,"right":1,"left":0,"height":104,"bottom":0},"compId":276,"child":[{"type":"Text","props":{"y":12,"x":0,"text":"Engine based on LifeRestart @VickScarlet","fontSize":40,"font":"Agency FB, Consolas, Arial","color":"#ffffff"},"compId":274},{"type":"Text","props":{"y":61,"x":0,"text":"Developer @MarcWang","rotation":0,"fontSize":40,"font":"Agency FB, Consolas, Arial","color":"#ffffff"},"compId":277}]},{"type":"Box","props":{"zOrder":1,"top":230,"right":40,"name":"summary","left":40,"bottom":800},"compId":8,"child":[{"type":"List","props":{"var":"listSummary","top":0,"spaceY":20,"right":0,"repeatY":7,"repeatX":1,"name":"listSummary","left":0,"bottom":0},"compId":265,"child":[{"type":"Box","props":{"y":15,"runtime":"Laya.runtime.ColorfulBox","right":15,"renderType":"render","left":15,"height":160},"compId":266,"child":[{"type":"Label","props":{"y":20,"text":"Title","name":"label","left":100,"fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0},"compId":267}]}]}]},{"type":"Box","props":{"zOrder":1,"width":1045,"right":40,"name":"selectedTalents","left":40,"height":513,"bottom":314},"compId":9,"child":[{"type":"List","props":{"var":"listSelectedTalents","vScrollBarSkin":" ","top":110,"spaceY":20,"selectEnable":false,"right":0,"repeatY":3,"repeatX":1,"name":"listSelectedTalents","left":0,"bottom":10},"compId":138,"child":[{"type":"Box","props":{"y":15,"runtime":"Laya.runtime.ColorfulBox","right":15,"renderType":"render","left":15,"height":80},"compId":263,"child":[{"type":"Label","props":{"y":20,"text":"Title","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":264},{"type":"Box","props":{"top":0,"right":0,"name":"blank","left":0,"bottom":0,"alpha":0.3},"compId":270}]}]}]},{"type":"Box","props":{"zOrder":1,"top":2165,"right":1,"name":"buttonGroup","left":0,"bottom":80},"compId":10,"child":[{"type":"Box","props":{"y":20,"x":50,"width":537,"var":"btnAgain","runtime":"Laya.runtime.ColorfulBox","name":"btnAgain","left":50,"height":150,"bottom":80},"compId":268,"child":[{"type":"Label","props":{"text":"UI_Remake_Again","name":"label","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":269}]},{"type":"Box","props":{"y":20,"x":537,"width":537,"var":"btnPrint","runtime":"Laya.runtime.ColorfulBox","right":50,"name":"btnPrint","height":150,"bottom":80},"compId":271,"child":[{"type":"Label","props":{"text":"UI_Print","name":"label","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":272}]}]},{"type":"Image","props":{"width":1125,"top":0,"skin":"images/background/09.png","right":0,"pivotY":2385,"pivotX":838,"left":0,"height":2436,"bottom":0},"compId":273}],"loadList":["images/background/09.png"],"loadList3D":[]};
		return SummaryUI;
	})(View);
var TalentUI=(function(_super){
		function TalentUI(){
			
		    this.pageDrawCard=null;
		    this.btnDrawCard=null;
		    this.boxText=null;
			TalentUI.__super.call(this);
		}
		CLASS$(TalentUI,'ui.view.DefaultTheme.TalentUI',_super);
		var __proto__=TalentUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(TalentUI.uiView);
		}
		TalentUI.uiView={"type":"View","props":{"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436},"compId":1,"child":[{"type":"Box","props":{"zOrder":1,"var":"pageDrawCard","top":0,"right":0,"name":"pageDrawCard","left":0,"bottom":0},"compId":19,"child":[{"type":"Box","props":{"width":428,"var":"btnDrawCard","runtime":"Laya.runtime.ColorfulBox","name":"btnDrawCard","height":150,"centerY":243,"centerX":0},"compId":110,"child":[{"type":"Label","props":{"text":"UI_Talent_Draw","name":"label","fontSize":70,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":111}]}]},{"type":"Image","props":{"top":0,"skin":"images/background/05.png","right":0,"left":0,"bottom":0},"compId":117},{"type":"Label","props":{"zOrder":1,"y":20,"x":20,"width":620,"text":"♀Samsara","name":"title","height":100,"fontSize":130,"font":"Agency FB, Consolas, Arial","color":"#000000","centerY":-1067,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":118},{"type":"Box","props":{"zOrder":1,"width":1188,"var":"boxText","runtime":"Laya.runtime.ColorfulBox","name":"boxText","height":360,"centerY":589,"centerX":0,"bgColor":"#f6f4f4","alpha":0.7},"compId":120,"child":[{"type":"Label","props":{"zOrder":1,"wordWrap":true,"width":1104,"text":"\"Lucky Charms\" are random events that will change your life for better or for worse. Hit the button to draw 3 \"Lucky Charms\" to generate your new life. Good Luck! ","name":"label","height":351,"fontSize":72,"font":"Agency FB, Consolas, Arial","color":"#191717","centerY":23,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":121}]}],"loadList":["images/background/05.png"],"loadList3D":[]};
		return TalentUI;
	})(View);
var TrajectoryUI=(function(_super){
		function TrajectoryUI(){
			
		    this.labCharm=null;
		    this.labCharmAdd=null;
		    this.labIntelligence=null;
		    this.labIntelligenceAdd=null;
		    this.labStrength=null;
		    this.labStrengthAdd=null;
		    this.labMoney=null;
		    this.labMoneyAdd=null;
		    this.labSpirit=null;
		    this.labSpiritAdd=null;
		    this.labCountry=null;
		    this.labSex=null;
		    this.boxTrajectory=null;
		    this.panelTrajectory=null;
		    this.vboxTrajectory=null;
		    this.btnSummary=null;
		    this.boxSpeed=null;
		    this.prgSpeed=null;
		    this.scbSpeed=null;
			TrajectoryUI.__super.call(this);
		}
		CLASS$(TrajectoryUI,'ui.view.DefaultTheme.TrajectoryUI',_super);
		var __proto__=TrajectoryUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			View.regComponent("Laya.runtime.ColorFilterItem",Laya.runtime.ColorFilterItem);
			_super.prototype.createChildren.call(this);
			this.createView(TrajectoryUI.uiView);
		}
		TrajectoryUI.uiView={"type":"View","props":{"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436},"compId":1,"child":[{"type":"Box","props":{"zOrder":1,"top":0,"right":30,"left":30,"height":330,"bgColor":"#e3e2e2","alpha":0.8},"compId":31,"child":[{"type":"HBox","props":{"space":15,"centerY":91,"centerX":0,"align":"middle"},"compId":71,"child":[{"type":"Box","props":{"x":0,"width":220,"runtime":"Laya.runtime.ColorfulBox","name":"propertyBox","height":120,"centerY":0},"compId":34,"child":[{"type":"Label","props":{"y":30,"text":"UI_Property_Charm","name":"label","fontSize":45,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":39},{"type":"Box","props":{"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"propertyValue","left":0,"height":60,"bottom":0},"compId":41,"child":[{"type":"Label","props":{"var":"labCharm","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":40},{"type":"Label","props":{"visible":false,"var":"labCharmAdd","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":72,"anchorY":0.5,"anchorX":0.5},"compId":175}]}]},{"type":"Box","props":{"x":1,"width":220,"runtime":"Laya.runtime.ColorfulBox","name":"propertyBox","height":120,"centerY":0},"compId":50,"child":[{"type":"Label","props":{"y":30,"text":"UI_Property_Intelligence","name":"label","fontSize":45,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":54},{"type":"Box","props":{"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"propertyValue","left":0,"height":60,"bottom":0},"compId":55,"child":[{"type":"Label","props":{"var":"labIntelligence","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":56},{"type":"Label","props":{"visible":false,"var":"labIntelligenceAdd","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":2,"centerX":70,"anchorY":0.5,"anchorX":0.5},"compId":176}]}]},{"type":"Box","props":{"x":2,"width":220,"runtime":"Laya.runtime.ColorfulBox","name":"propertyBox","height":120,"centerY":0},"compId":74,"child":[{"type":"Label","props":{"y":30,"text":"UI_Property_Strength","name":"label","fontSize":45,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":78},{"type":"Box","props":{"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"propertyValue","left":0,"height":60,"bottom":0},"compId":79,"child":[{"type":"Label","props":{"var":"labStrength","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":80},{"type":"Label","props":{"visible":false,"var":"labStrengthAdd","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":65,"anchorY":0.5,"anchorX":0.5},"compId":177}]}]},{"type":"Box","props":{"x":3,"width":220,"runtime":"Laya.runtime.ColorfulBox","name":"propertyBox","height":120,"centerY":0},"compId":43,"child":[{"type":"Label","props":{"y":30,"text":"UI_Property_Money","name":"label","fontSize":45,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":47},{"type":"Box","props":{"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"propertyValue","left":0,"height":60,"bottom":0},"compId":48,"child":[{"type":"Label","props":{"var":"labMoney","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":49},{"type":"Label","props":{"visible":false,"var":"labMoneyAdd","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":82,"anchorY":0.5,"anchorX":0.5},"compId":178}]}]},{"type":"Box","props":{"x":4,"width":220,"runtime":"Laya.runtime.ColorfulBox","name":"propertyBox","height":120,"centerY":0},"compId":81,"child":[{"type":"Label","props":{"y":30,"text":"UI_Property_Spirit","name":"label","fontSize":45,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":85},{"type":"Box","props":{"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"propertyValue","left":0,"height":60,"bottom":0},"compId":86,"child":[{"type":"Label","props":{"var":"labSpirit","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":87},{"type":"Label","props":{"visible":false,"var":"labSpiritAdd","text":"10","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":2,"centerX":65,"anchorY":0.5,"anchorX":0.5},"compId":179}]}]}]},{"type":"Box","props":{"y":92,"x":181,"centerY":-27,"centerX":0},"compId":158,"child":[{"type":"Box","props":{"x":-55,"width":350,"runtime":"Laya.runtime.ColorfulBox","name":"propertyBox","height":120,"centerY":-14},"compId":167,"child":[{"type":"Label","props":{"y":30,"text":"Country","name":"label","fontSize":45,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":168},{"type":"Box","props":{"width":220,"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"propertyValue","left":0,"height":60,"bottom":0},"compId":169,"child":[{"type":"Label","props":{"var":"labCountry","text":"China","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":170}]}]},{"type":"Box","props":{"x":353,"width":350,"runtime":"Laya.runtime.ColorfulBox","name":"propertyBox","height":120,"centerY":-14},"compId":171,"child":[{"type":"Label","props":{"y":30,"text":"Sex orientation","name":"label","fontSize":45,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":172},{"type":"Box","props":{"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"propertyValue","left":0,"height":60,"bottom":0},"compId":173,"child":[{"type":"Label","props":{"var":"labSex","text":"LBTQ","name":"label","fontSize":55,"font":"Agency FB, Consolas, Arial","color":"#55fffe","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":174}]}]}]}]},{"type":"Box","props":{"zOrder":1,"var":"boxTrajectory","top":330,"runtime":"Laya.runtime.ColorfulBox","right":30,"name":"boxTrajectory","left":30,"bottom":150,"bgColor":"#e3e2e2","alpha":0.8},"compId":102,"child":[{"type":"Panel","props":{"var":"panelTrajectory","vScrollBarSkin":" ","top":0,"right":30,"name":"panelTrajectory","left":30,"bottom":0},"compId":18,"child":[{"type":"VBox","props":{"y":15,"var":"vboxTrajectory","space":20,"right":-6,"name":"vboxTrajectory","left":-6},"compId":17,"child":[{"type":"Box","props":{"runtime":"Laya.runtime.ColorfulBox","right":0,"name":"boxTrajectoryItem","left":0},"compId":88,"child":[{"type":"HBox","props":{"y":25,"x":137.2421875,"name":"hboxAge","anchorX":1,"align":"middle"},"compId":91,"child":[{"type":"Label","props":{"y":0,"x":-142,"text":"3000","name":"labAge","fontSize":48,"font":"Agency FB, Consolas, Arial","color":"#cfea5c","anchorX":0,"align":"right"},"compId":90}]},{"type":"Label","props":{"y":25,"wordWrap":true,"text":"你的父母开始辅导你数学和英语，智力+1","right":0,"name":"labContent","left":220,"leading":25,"fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff"},"compId":95}]}]}]}]},{"type":"Box","props":{"zOrder":1,"right":0,"left":0,"height":1,"bottom":-1},"compId":14,"child":[{"type":"Box","props":{"width":600,"var":"btnSummary","runtime":"Laya.runtime.ColorfulBox","name":"btnSummary","height":150,"centerX":0,"bottom":0},"compId":151,"child":[{"type":"Label","props":{"text":"UI_Goto_Summary","name":"label","fontSize":60,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0},"compId":152}]},{"type":"Box","props":{"y":-75,"var":"boxSpeed","runtime":"Laya.runtime.ColorFilterItem","right":100,"name":"boxSpeed","left":101,"height":150,"anchorY":0.5,"anchorX":0.5},"compId":104,"child":[{"type":"ProgressBar","props":{"var":"prgSpeed","skin":"images/progress/progress_s.png","right":0,"name":"prgSpeed","left":0,"bottom":0},"compId":105},{"type":"HScrollBar","props":{"var":"scbSpeed","skin":"images/slider/hslider_s.png","right":0,"name":"scbSpeed","min":0,"max":1000,"left":0,"height":60,"bottom":0},"compId":106},{"type":"Label","props":{"text":"UI_Manual","fontSize":50,"color":"#ffffff","bottom":70},"compId":107},{"type":"Label","props":{"text":"UI_Auto","right":0,"fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","bottom":70},"compId":108}]}]},{"type":"Image","props":{"top":0,"skin":"images/background/08.png","right":0,"left":0,"bottom":0},"compId":157}],"loadList":["images/progress/progress_s.png","images/slider/hslider_s.png","images/background/08.png"],"loadList3D":[]};
		return TrajectoryUI;
	})(View);
var LoadingUI=(function(_super){
		function LoadingUI(){
			
			LoadingUI.__super.call(this);
		}
		CLASS$(LoadingUI,'ui.view.LoadingUI',_super);
		var __proto__=LoadingUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ViewBase",Laya.runtime.ViewBase);
			_super.prototype.createChildren.call(this);
			this.createView(LoadingUI.uiView);
		}
		LoadingUI.uiView={"type":"View","props":{"width":1125,"runtime":"Laya.runtime.ViewBase","height":2436},"compId":1,"child":[{"type":"Sprite","props":{"y":0,"x":0,"alpha":0.3},"compId":11,"child":[{"type":"Rect","props":{"width":2000,"lineWidth":1,"height":3000,"fillColor":"#000000"},"compId":12}]},{"type":"Box","props":{"width":200,"scaleY":2,"scaleX":2,"height":200,"centerY":0,"centerX":0},"compId":2,"child":[{"type":"Animation","props":{"y":100,"x":100,"source":"view/CyberTheme/animation/circleFlash.ani","autoPlay":true},"compId":3},{"type":"Image","props":{"skin":"images/resource/circle.png","renderType":"mask"},"compId":9}]},{"type":"Label","props":{"text":"UI_Loading","fontSize":80,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":400,"centerX":0},"compId":10}],"loadList":["view/CyberTheme/animation/circleFlash.ani","images/resource/circle.png"],"loadList3D":[]};
		return LoadingUI;
	})(View);
var MessagePopupUI=(function(_super){
		function MessagePopupUI(){
			
		    this.boxBg=null;
		    this.message=null;
			MessagePopupUI.__super.call(this);
		}
		CLASS$(MessagePopupUI,'ui.view.MessagePopupUI',_super);
		var __proto__=MessagePopupUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(MessagePopupUI.uiView);
		}
		MessagePopupUI.uiView={"type":"View","props":{"width":1100,"mouseThrough":true,"mouseEnabled":false,"height":230},"compId":1,"child":[{"type":"Box","props":{"var":"boxBg","top":10,"runtime":"Laya.runtime.ColorfulBox","right":10,"name":"boxBg","left":10,"bottom":10,"alpha":0.75},"compId":3},{"type":"Label","props":{"wordWrap":true,"var":"message","text":"消息","right":50,"name":"message","left":50,"fontSize":60,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"align":"center"},"compId":2}],"loadList":[],"loadList3D":[]};
		return MessagePopupUI;
	})(View);
var SaveLoadUI=(function(_super){
		function SaveLoadUI(){
			
		    this.input=null;
		    this.btnSave=null;
		    this.btnLoad=null;
		    this.btnRead=null;
		    this.btnWrite=null;
		    this.btnClose=null;
		    this.btnBackup=null;
			SaveLoadUI.__super.call(this);
		}
		CLASS$(SaveLoadUI,'ui.view.SaveLoadUI',_super);
		var __proto__=SaveLoadUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(SaveLoadUI.uiView);
		}
		SaveLoadUI.uiView={"type":"Dialog","props":{"width":645,"height":400},"compId":1,"child":[{"type":"Box","props":{"top":0,"right":0,"left":0,"bottom":300},"compId":15,"child":[{"type":"Box","props":{"y":0,"x":0,"width":645,"height":2},"compId":19,"child":[{"type":"Rect","props":{"width":645,"lineWidth":1,"height":2,"fillColor":"#97ffe6"},"compId":17}]},{"type":"Box","props":{"width":645,"height":2,"centerX":0,"bottom":0},"compId":20,"child":[{"type":"Rect","props":{"width":645,"lineWidth":1,"height":2,"fillColor":"#97ffe6"},"compId":21}]},{"type":"Box","props":{"width":645,"height":100,"centerY":0,"centerX":0,"alpha":0.2},"compId":22,"child":[{"type":"Rect","props":{"width":645,"lineWidth":1,"height":100,"fillColor":"#000000"},"compId":23}]}]},{"type":"TextInput","props":{"wordWrap":false,"var":"input","valign":"middle","top":0,"text":"content","right":0,"overflow":"scroll","left":0,"fontSize":35,"font":"Agency FB, Consolas, Arial","color":"#ffffff","bottom":300},"compId":4},{"type":"Box","props":{"width":120,"var":"btnSave","runtime":"Laya.runtime.ColorfulBox","name":"btnSmall","left":5,"height":120,"bottom":155,"anchorY":0.5,"anchorX":0.5},"compId":5,"child":[{"type":"Label","props":{"text":"UI_Save","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":7}]},{"type":"Box","props":{"width":120,"var":"btnLoad","runtime":"Laya.runtime.ColorfulBox","name":"btnSmall","left":130,"height":120,"bottom":155,"anchorY":0.5,"anchorX":0.5},"compId":6,"child":[{"type":"Label","props":{"text":"UI_Load","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":8}]},{"type":"Box","props":{"width":120,"var":"btnRead","runtime":"Laya.runtime.ColorfulBox","name":"btnSmall","left":260,"height":120,"bottom":155,"anchorY":0.5,"anchorX":0.5},"compId":13,"child":[{"type":"Label","props":{"text":"UI_Read","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":14}]},{"type":"Box","props":{"width":120,"var":"btnWrite","runtime":"Laya.runtime.ColorfulBox","name":"btnSmall","left":390,"height":120,"bottom":155,"anchorY":0.5,"anchorX":0.5},"compId":11,"child":[{"type":"Label","props":{"text":"UI_Write","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":12}]},{"type":"Box","props":{"x":10,"width":120,"var":"btnClose","runtime":"Laya.runtime.ColorfulBox","right":5,"name":"btnSmall","height":120,"bottom":155,"anchorY":0.5,"anchorX":0.5},"compId":9,"child":[{"type":"Label","props":{"text":"×","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":10}]},{"type":"Box","props":{"y":20,"var":"btnBackup","runtime":"Laya.runtime.ColorfulBox","right":5,"name":"btnBackup","left":5,"height":120,"bottom":5,"anchorY":0.5,"anchorX":0.5},"compId":25,"child":[{"type":"Label","props":{"text":"UI_BackupBtn","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":26}]}],"loadList":[],"loadList3D":[]};
		return SaveLoadUI;
	})(Dialog);
var ThemesUI=(function(_super){
		function ThemesUI(){
			
		    this.radioTheme=null;
		    this.btnOK=null;
		    this.btnClose=null;
			ThemesUI.__super.call(this);
		}
		CLASS$(ThemesUI,'ui.view.ThemesUI',_super);
		var __proto__=ThemesUI.prototype;
		__proto__.createChildren=function(){
		    			View.regComponent("Laya.runtime.ColorfulBox",Laya.runtime.ColorfulBox);
			_super.prototype.createChildren.call(this);
			this.createView(ThemesUI.uiView);
		}
		ThemesUI.uiView={"type":"Dialog","props":{"width":350,"height":550},"compId":1,"child":[{"type":"Box","props":{"top":20,"right":20,"left":20,"bottom":130},"compId":6,"child":[{"type":"RadioGroup","props":{"var":"radioTheme","name":"radioTheme","height":380,"centerY":0,"centerX":0},"compId":13,"child":[{"type":"Radio","props":{"width":300,"top":0,"skin":"images/radio/radio_cyber.png","name":"item0","height":100},"compId":10},{"type":"Radio","props":{"width":300,"skin":"images/radio/radio_dark.png","name":"item1","height":100,"centerY":0},"compId":11},{"type":"Radio","props":{"width":300,"skin":"images/radio/radio_light.png","name":"item2","height":100,"bottom":0},"compId":12}]}]},{"type":"Box","props":{"width":90,"var":"btnOK","runtime":"Laya.runtime.ColorfulBox","name":"btnSmall","left":20,"height":90,"bottom":20,"anchorY":0.5,"anchorX":0.5},"compId":2,"child":[{"type":"Label","props":{"text":"√","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":3}]},{"type":"Box","props":{"width":90,"var":"btnClose","runtime":"Laya.runtime.ColorfulBox","right":20,"name":"btnSmall","height":90,"bottom":20,"anchorY":0.5,"anchorX":0.5},"compId":14,"child":[{"type":"Label","props":{"text":"×","name":"label","fontSize":50,"font":"Agency FB, Consolas, Arial","color":"#ffffff","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5},"compId":15}]}],"loadList":["images/radio/radio_cyber.png","images/radio/radio_dark.png","images/radio/radio_light.png"],"loadList3D":[]};
		return ThemesUI;
	})(Dialog);
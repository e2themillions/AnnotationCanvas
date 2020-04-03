/* AnnotationCanvas v.1.0 (forked from RoCanvas.js version 1.4.0)
*
*  OPEN SOURCE
*  License: BSD
*  Source code: https://github.com/e2themillions/AnnotationCanvas
*
**/

// rocanvas instances
var CanvasInstances = {};

var RoCanvas= function () {	
	// internal vars
	this.clickX = [];
	this.clickY = [];
	this.startX = 0;
	this.startY = 0;
	this.clearRect = [0,0,0,0];
	this.clearCircle = [0,0,0];
	this.clickDrag = [];
	this.paint = false;
	this.context = {};
	this.undoStack = [];
	this.redoStack = [];
	this.undoButtonID;
	this.redoButtonID;
	
	// changeable defaults
	this.shape = "round";	
	this.color = "#000";	
	this.tool = "path";
	this.drawTool = "path";
	this.lineWidth = 5;
	this.bgImage = null; //this is the initial background image
	this.currentBgImage = null; //this is the current background updated on mouse-up events..
	this.factor = 1.0; //To account for CSS scaling
	this.hardOffsetX = 0;
	this.hardOffsetY = 0;
	this.arrowHeadSize = 30; // length of arrow head in pixels
	this.hardFileLocation = '';
	
	// toolbar
	this.toolbar = {
		colors: ["#FFF","#000","#FF0000","#00FF00","#0000FF","#FFFF00","#00FFFF"],
		custom_color: true,
		sizes: [2, 5, 10, 25],
		tools: ["path","rectangle","filledrectangle","circle","filledcircle","ellipse","filledellipse","arrow","textbox","moustache1"],
		clearButton: {"text": "Clear Canvas"},
		saveButton: null,
		undoButton: {"text":"undo"},
		redoButton: {"text":"redo"}
	};
	
	var self = this;

	
	// the "constructor" that actually takes a div and converts it into RoCanvas
	// @param id string, the DOM ID of the div
	// @param vars - optionally pass custom vars.
	// - toolbar
	// - settings
	// - backgroundImage: a js Image object to use as background
	// - cssScale: if css has been used to resize the canvas (have a visually small canvas-object while keeping the canvas-drawing hi-res for instance) a scaling factor can be supplied
	// - hardOffsetX: if needed a hard offset can be set
	// - hardOffsetY: if needed a hard offset can be set
	this.RO = function(id, vars) {		
		self.id = id;
		self.undoButtonID = "btnUndo_" + id;
		self.redoButtonID = "btnRedo_" + id;

		// add to instances
		CanvasInstances[id] = self;
		
	
		// if settings or tools are passed overwrite them
		vars = vars||{};		
		
		if(vars['toolbar'])
		{
			for(var key in vars['toolbar'])
			{
				self.toolbar[key]=vars['toolbar'][key];
			}
		}		
		
		// if vars[settings] is passed allow changing some defaults 	
		if(vars['settings'])
		{
			// allow only shape, color, tool, lineWidth
			for(var key in vars['settings'])
			{
				if(!(key=='shape' 
					|| key=='color' 
					|| key=='tool' 
					|| key=='lineWidth'
					|| key=='arrowHeadSize'
					|| key=='hardFileLocation')) continue;				
					console.log("Setting:" + key);
				self[key]=vars['settings'][key];
			}
		}	

		// this file location folder
		self.fileLocation();		
		
		// prepare canvas		
		self.canvas = document.getElementById(id);			
		document.getElementById(id).style.cursor='crosshair';	
		
		// prepare background image
		if (vars['backgroundImage']) {
			self.bgImage = vars['backgroundImage'];	
		} else {
			self.bgImage = new Image();
			self.bgImage.src = self.canvas.toDataURL("image/jpeg");
		}

		// set scaling (e.g. if canvas has been scaled up or down by CSS).
		// We use this scaling method instead of context.scale() or .drawImage() with scaling, because we want to preseve the
		// original scale of the background image..
		if (vars['cssScale']) {
			self.factor = vars['cssScale'];
		}

		if (vars['hardOffsetY']) {
			self.hardOffsetY = vars['hardOffsetY'];
		}
		if (vars['hardOffsetX']) {
			self.hardOffsetX = vars['hardOffsetX'];
		}

		// get canvas parent and append div for the tools
		var parent=self.canvas.parentNode;
		var toolBarDOM=document.createElement("div");		
		toolBarDOM.className = 'canvas_toolbar';

		// add colors
		toolBarHTML="";
		if(self.toolbar.colors)
		{
			toolBarHTML+='<div class="ColorPicker">';
			toolBarHTML+='<div style="float:left;">Farve:</div>';
			for(c in self.toolbar['colors'])
			{
				var xClrBg = '';

				if (self.toolbar['colors'][c]=="WHITE"||self.toolbar['colors'][c]=="#FFF"||self.toolbar['colors'][c]=="#FFFFFF") {
					console.log(self.toolbar['colors'][c]);
					xClrBg = ' url('+self.filepath+'img/white_color.png) no-repeat 0 0;-webkit-background-size: cover;-moz-background-size: cover;-o-background-size: cover;background-size: cover;';
				}
				toolBarHTML+="<a id=\"color_" + c +"\" href=\"#\" class=\"ColorPicker\" onclick=\"CanvasInstances['"+self.id+"'].setColor('"
					+self.toolbar['colors'][c]+"');return false;\" style=\"background:"+self.toolbar['colors'][c]+xClrBg+";\">&nbsp;</a> ";
				//MarkSelCol(this.id);
			}
			toolBarHTML+='</div>';
		}	
		
		// custom color choice?
		if(self.toolbar.custom_color) {
			toolBarHTML+='<div class="CustomColorPicker">';
			toolBarHTML += "&nbsp; Custom:&nbsp;<a href=\"#\" style=\"background:white;\" onclick=\"CanvasInstances['"+self.id+"'].setColor(this.style.background);return false;\" id='customColorChoice"+ self.id +"'>&nbsp;</a> #<input type='text' size='6' maxlength='6' onkeyup=\"CanvasInstances['"+self.id+"'].customColor(this.value);\">";
			toolBarHTML+='</div>';
		}	
			
		// add sizes
		if(self.toolbar.sizes)
		{
			toolBarHTML+='<div class="SizePicker">';
			toolBarHTML+='<div>Streg:</div>';
			for(s in self.toolbar['sizes'])
			{
				toolBarHTML+="<a href=\"#\" id='size_"+self.toolbar['sizes'][s]+"_"+self.id+"'  onclick=\"CanvasInstances['"+self.id+"'].setSize("+self.toolbar['sizes'][s]
					+");return false;\"><div style=\"width:"+self.toolbar['sizes'][s]+"px;height:"
					+self.toolbar['sizes'][s]+"px;background-color:black;border-radius:"+self.toolbar['sizes'][s]+"px;margin-left:15px;\">&nbsp;</div></a>";	
			}
			toolBarHTML+='</div>';
		}		
		
		// add tools
		if(self.toolbar.tools)
		{
			if (self.toolbar['tools'].length>1) {
				toolBarHTML+='<div class="tools">';
				toolBarHTML+='<div style="float:left;">Pen:</div>';
				for (tool in self.toolbar['tools'])
				{
					var xID = "lnkTool_" + self.id + '_' +self.toolbar['tools'][tool];
					toolBarHTML+="<span class=\"tool_"+self.toolbar['tools'][tool]+"\"><a id=\""+xID+"\" href='#' onclick=\"CanvasInstances['"+self.id+"'].setTool('"+self.toolbar['tools'][tool]+"');return false;\" title=\""+self.toolbar['tools'][tool]+"\"></a></span>";
				}
				toolBarHTML+='</div>';
			}
		}
		
		// add buttons
		if(self.toolbar.clearButton || self.toolbar.saveButton)
		{
			toolBarHTML+='<div class="buttons_'+this.id+'" style="clear:both;">&nbsp;</div>';
			toolBarHTML+="<p>";
			
			if(self.toolbar.clearButton)
			{
				toolBarHTML+='<input type="button" value="'+self.toolbar.clearButton.text+'"' + " onclick=\"CanvasInstances['"+self.id+"'].clearCanvas();\">";
			}			
			
			if(self.toolbar.saveButton)
			{
				var saveButtonCallback="";
				if(self.toolbar.saveButton.callback) saveButtonCallback=' onclick="'+ self.toolbar.saveButton.callback + '(this);"';
				toolBarHTML+='<input type="button" id="RoCanvasSave_'+ this.id +'" value="'+self.toolbar.saveButton.text+'"'+saveButtonCallback+'>';
			}			
			if(self.toolbar.undoButton) 
			{
				toolBarHTML+='<input type="button" id="'+self.undoButtonID+'" disabled value="'+self.toolbar.undoButton.text+'"' + " onclick=\"CanvasInstances['"+self.id+"'].undo();\">";
			}
			if(self.toolbar.redoButton) 
			{
				toolBarHTML+='<input type="button" id="'+self.redoButtonID+'" disabled value="'+self.toolbar.redoButton.text+'"' + " onclick=\"CanvasInstances['"+self.id+"'].redo();\">";
			}
			toolBarHTML+="</p>";
		}
		
		toolBarDOM.innerHTML=toolBarHTML;
		parent.appendChild(toolBarDOM);
		
		// Check the element is in the DOM and the browser supports canvas
		if(self.canvas.getContext) 
		{

			 // Initaliase a 2-dimensional drawing context
			 self.context = self.canvas.getContext('2d');			 
			 self.context.strokeStyle = self.color;
			 self.context.lineJoin = self.shape;
			 self.context.lineWidth = self.lineWidth;	
		}
				
		// draw the background
		self.context.clearRect(0,0,self.canvas.width,self.canvas.height);
		self.context.drawImage(self.bgImage,0,0);
		self.currentBgImage = new Image();
		self.currentBgImage.src = self.canvas.toDataURL("image/jpeg");

		
		// mark selected tool
		self.setTool(self.tool);
		self.setSize(self.context.lineWidth);
		self.setColor(self.context.strokeStyle);

		/* declare mouse actions */
		

		// on mouse down
		$(self.canvas).bind('mousedown touchstart', function (e) {
				
		  var grr = (event.type.toLowerCase() === 'mousedown') ? event : e.originalEvent.touches[0];
            var mouseX = (grr.pageX - this.offsetLeft - self.hardOffsetX) * self.factor;
            self.startX = mouseX;
            var mouseY = (grr.pageY - this.offsetTop - self.hardOffsetY) * self.factor;
            self.startY = mouseY;
		
		  
		  
		  
		  self.paint = true;	
		  
		  if(self.drawTool=='path')
		  {
				self.addClick(mouseX, mouseY);
				self.redraw();
		  }
		});
		
		// on dragging
		$(self.canvas).bind('mousemove touchmove', function (e) {
		    if(self.paint)
		    {		    	

				// clear canvas to last saved state	
				self.context.clearRect(0, 0, self.canvas.width, self.canvas.height);
                self.context.drawImage(self.currentBgImage, 0, 0);
                var grr = (event.type.toLowerCase() === 'mousemove') ? event : e.originalEvent.touches[0];
                var pgY = (grr.pageY - this.offsetTop - self.hardOffsetY) * self.factor;
                var pgX = (grr.pageX - this.offsetLeft - self.hardOffsetX) * self.factor;

				// draw different shapes				
				switch(self.drawTool)
				{
					case 'rectangle':		
					case 'filledrectangle':		
						w = pgX - self.startX;
						h = pgY - self.startY;
												
						if(self.drawTool=='rectangle')
						{
							self.context.strokeRect(self.startX, self.startY, w, h);			
						}
						else
						{				
							self.context.fillRect(self.startX, self.startY, w, h);			
						}
						break;
			        case 'circle':
			        case 'filledcircle':
			            w = Math.abs(pgX - self.startX);
			            h = Math.abs(pgY - self.startY);
			               
			            // r is the bigger of h and w
			            r = h>w?h:w;			            
			            self.context.beginPath();			            
			            self.context.arc(self.startX,self.startY,r,0,Math.PI*2);// draw from the center
			            self.context.closePath();
			            
			            if(self.drawTool=='circle') 
			            {			            
			            	self.context.stroke();
			            }            
			            else
			            {
			             	self.context.fill();	
			            }
			        	break;
					case "filledellipse":
			        	self.drawEllipse(self.startX,self.startY,pgX-self.startX,pgY-self.startY,true);
			        	break;			        	
			        case "ellipse":
			        	self.drawEllipse(self.startX,self.startY,pgX-self.startX,pgY-self.startY,false);
			        	break;
			        case 'arrow':
			        	self.canvas_arrow(self.startX,self.startY,pgX,pgY);
			        	break;
					case 'textbox':		
						break; //text box is handled on mouseUp...
					case 'moustache1':
						self.canvas_moustache1(self.startX,self.startY,pgX,pgY);
						break;
					default:
						self.addClick(pgX, pgY, true);
						break;
			}		    
		    self.redraw();
		  }
		});
		
		// when mouse is released
		$(self.canvas).bind('mouseup touchend', function (e) {

			self.paint = false;
		  
			self.clickX = new Array();
			self.clickY = new Array();
			self.clickDrag = new Array();
			self.clearRect=[0,0,0,0];
			self.clearCircle=[0,0,0]; 	 	


			// any tool relevant post processing?
			switch (self.drawTool) {
				case 'textbox':
					//show popup asking for the text..
					var userInput = prompt("Text", "");
					if (!userInput) break;
					self.context.beginPath();			            
					self.context.font = "34pt Arial";
					self.context.fillText(userInput, self.startX, self.startY+50);
					self.context.closePath();			

					break;
				default:
					break;
			}

			//update the current background state
		 	self.updateCurrentState();
		});
		
		$(self.canvas).bind('mouseleave touchleave', function (e) { //touchleave is not really implemented...
		  self.paint = false;
		});
	};
	
    this.drawEllipseByCenter = function(cx, cy, w, h) {
      	drawEllipse(cx - w/2.0, cy - h/2.0, w, h);
    }
    
    this.drawEllipse = function(x, y, w, h, fill) {
    	var ctx = self.context;
      	var kappa = .5522848,
          ox = (w / 2) * kappa, // control point offset horizontal
          oy = (h / 2) * kappa, // control point offset vertical
          xe = x + w,           // x-end
          ye = y + h,           // y-end
          xm = x + w / 2,       // x-middle
          ym = y + h / 2;       // y-middle
    
      ctx.beginPath();
      ctx.moveTo(x, ym);
      ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
      ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
      ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
      ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
      ctx.closePath();
      if (fill) {
      	ctx.fill();
      } else {
      	ctx.stroke();
      }
      ctx.closePath();
    }

	this.canvas_arrow = function(fromx, fromy, tox, toy){
		var headlen = self.arrowHeadSize;
		var dx = tox-fromx;
		var dy = toy-fromy;
		var angle = Math.atan2(dy,dx);
		self.context.beginPath();			            
		self.context.moveTo(fromx, fromy);
		self.context.lineTo(tox, toy);
		self.context.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
		self.context.moveTo(tox, toy);
		self.context.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
		self.context.stroke();
		self.context.closePath(); 
	}

	this.canvas_moustache1 = function(fromx, fromy, tox, toy){
		
		/*
				    BL1  	BR1
			---------X-------X-----------
			|  							|
		 P1	X			P0				| P2
			|							|						
			----X-------------------X----
			   BL2				   BR2
		*/

		var dx = tox-fromx;
		var dy = toy-fromy;
		
		var p0y = p1y = p2y = fromy+dy/2;
		var p0x = fromx+dx/2;
		var p1x = fromx;
		var p2x = tox;

		var bl1y = br1y = fromy;
		var bl1x = p0x-(dx/8);
		var br1x = p2x-(dx/8);

		var bl2y = br2y = toy;
		var bl2x = p0x-(dx/3);
		var br2x = p2x-(dx/3);		

		self.context.beginPath();			            
		self.context.moveTo(p0x, p0y);		
		self.context.bezierCurveTo(br1x, br1y, br2x, br2y, p2x, p2y);
		self.context.moveTo(p0x, p0y);
		self.context.bezierCurveTo(bl1x, bl1y, bl2x, bl2y, p1x, p1y);

		self.context.stroke();
		self.context.closePath(); 
	}


	this.addClick = function(x, y, dragging)
	{
	  self.clickX.push(x);
	  self.clickY.push(y);
	  self.clickDrag.push(dragging);
	};
	
	this.redraw = function()
	{		
	  for(var i=0; i < self.clickX.length; i++)
	  {		
	    self.context.beginPath();
	    if(self.clickDrag[i] && i){	    	
	      self.context.moveTo(self.clickX[i-1], self.clickY[i-1]);
	     }else{	     	
	       self.context.moveTo(self.clickX[i]-1, self.clickY[i]);
	     }	     
	     self.context.lineTo(self.clickX[i], self.clickY[i]);
	     self.context.closePath();	     
	     self.context.stroke();
	  }
	};
	
	// blank the entire canvas and redraw background
	this.clearCanvas = function()
	{

		oldLineWidth=self.context.lineWidth;	
		self.context.clearRect(0,0,self.canvas.width,self.canvas.height);
	   	self.canvas.width = self.canvas.width;	    
	   	self.clickX = new Array();
	   	self.clickY = new Array();
	   	RoCanvas.clickDrag = new Array();
	   	self.setSize(oldLineWidth);
	   	self.context.lineJoin = self.shape;
	   	self.setColor(self.color);
		self.context.drawImage(self.bgImage,0,0);
		
		//update the current background 		  
		self.updateCurrentState();
	};

	// updates undo/redo stacks
	this.updateCurrentState = function() {
		self.undoStack.push(self.currentBgImage.src);		
		self.redoStack = [];
		self.currentBgImage.src = self.canvas.toDataURL("image/jpeg");	
		if (document.getElementById(self.redoButtonID)) document.getElementById(self.redoButtonID).disabled = true;
		if (document.getElementById(self.undoButtonID)) document.getElementById(self.undoButtonID).disabled = false;
		
	}



	/**
	/ 
	/ 'public' functions
	/
	/**/

	this.undo = function() {
		if (self.undoStack.length<1) return false;
		self.redoStack.push(self.currentBgImage.src);
		self.currentBgImage.src = self.undoStack.pop();
		
		self.context.clearRect(0,0,self.canvas.width,self.canvas.height); 
		self.context.drawImage(self.currentBgImage,0,0);

		if (document.getElementById(self.redoButtonID)) document.getElementById(self.redoButtonID).disabled = self.redoStack.length<1;
		if (document.getElementById(self.undoButtonID)) document.getElementById(self.undoButtonID).disabled = self.undoStack.length<1;
		return true;
	}

	this.redo = function() {
		if (self.redoStack.length<1) return false;
		self.undoStack.push(self.currentBgImage.src);
		self.currentBgImage.src = self.redoStack.pop();
		
		self.context.clearRect(0,0,self.canvas.width,self.canvas.height); 
		self.context.drawImage(self.currentBgImage,0,0);

		if (document.getElementById(self.redoButtonID)) document.getElementById(self.redoButtonID).disabled = self.redoStack.length<1;
		if (document.getElementById(self.undoButtonID)) document.getElementById(self.undoButtonID).disabled = self.undoStack.length<1;
		return true;
	}
	
	// sets the size of the drawing line in pixels
	this.setSize = function(px)
	{
	    self.context.lineWidth=px;
	    for(s in self.toolbar['sizes'])
		{
			var xID="size_" + self.toolbar['sizes'][s] + "_" + self.id;
			if (document.getElementById(xID)) {
				if (self.toolbar['sizes'][s] === px) {
					document.getElementById(xID).className = 'selected';
				} else {
					document.getElementById(xID).className = '';	
				}
			}
		}
	};

	// sets the tool to draw
	this.setTool = function(tool)
	{
		self.drawTool=tool;	
		for (itool in self.toolbar['tools'])
		{
			var xID = "lnkTool_" + self.id + '_' +self.toolbar['tools'][itool];
			if (document.getElementById(xID)) {
				if (self.toolbar['tools'][itool] === tool) {
					document.getElementById(xID).className = 'selected';
				} else {
					document.getElementById(xID).className = '';	
				}
			}
		}
	};
	
	this.setColor = function setColor(col)
	{		
	   self.context.strokeStyle = col;
		self.context.fillStyle = col;
		self.color=col;

		for(c in self.toolbar['colors'])
		{
			//console.log(self.toolbar['colors'][c] + "==" + col.toUpperCase());
			var xID="color_" + c;
			if (document.getElementById(xID)) {
				if (self.toolbar['colors'][c].toUpperCase() == col.toUpperCase()) {
					document.getElementById(xID).className = 'selected';
				} else {
					document.getElementById(xID).className = '';	
				}
			}
		}
	};
	


	/**
	/ 
	/ helper functions
	/
	/**/

	// finds the location of this file
	// required to render proper include path for images	
	this.fileLocation = function()
	{
		if (self.hardFileLocation!='') {
			self.filepath = self.hardFileLocation;
			return;
		} 
		var scripts = document.getElementsByTagName('script');
		for(i=0; i<scripts.length;i++)
		{
			if(scripts[i].src && scripts[i].src.indexOf("annocan.js">0))
			{
				path=scripts[i].src;
				break;
			}
		}		
		path=path.replace(/annocan\.js.*$/, '');
		
		self.filepath=path;
	}; 
	
	// update custom color when value is typed in the box
	this.customColor = function(val) {		
		document.getElementById('customColorChoice' + this.id).style.background = "#" + val;
		this.setColor('#'+val);
	}
	
	// serialize the drawing board data
	this.serialize = function() {
		var strImageData = this.canvas.toDataURL("image/jpeg");
		return strImageData;  
	}

}

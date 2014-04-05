/* RoCanvas.js version 1.4.0
* Converts any canvas object into a RoCanvas HTML 5 Drawing board
* Adds tools, shapes, color and size selection, etc
* Full documentation at http://re.trotoys.com/article/rocanvas/ 
*
*
* Modified by Emil:
* - added optional background image
* - fixed flickering bug when drawing shapes
* - made non-filled objects non-filled (instead of white-filled)
* 
**/

// rocanvas instances
var RoCanvasInstances = {};

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
	
	// changeable defaults
	this.shape = "round";	
	this.color = "#000";	
	this.tool = "path";
	this.drawTool = "path";
	this.lineWidth = 5;
	this.bgImage = null; //this is the initial background image
	this.currentBgImage = null; //this is the current background updated on mouse-up events..
	
	// toolbar
	this.toolbar = {
		colors: ["#FFF","#000","#FF0000","#00FF00","#0000FF","#FFFF00","#00FFFF"],
		custom_color: true,
		sizes: [2, 5, 10, 25],
		tools: ["path","rectangle","filledrectangle","circle","filledcircle"],
		clearButton: {"text": "Clear Canvas"},
		saveButton: null
	};
	
	var self = this;

	
	// the "constructor" that actually takes a div and converts it into RoCanvas
	// @param id string, the DOM ID of the div
	// @param vars - optionally pass custom vars, toolbar, backgroundImage etc  
	this.RO = function(id, vars) {		
		self.id = id;
		
		// add to instances
		RoCanvasInstances[id] = self;
		
		// this file location folder
		self.fileLocation();		
		
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
				if(!(key=='shape' || key=='color' || key=='tool' || key=='lineWidth')) continue;				
				self[key]=vars['settings'][key];
			}
		}	
		
		// prepare canvas		
		self.canvas = document.getElementById(id);			
		document.getElementById(id).style.cursor='crosshair';	
		
		// prepare background image
		if (vars['backgroundImage']) {
			self.bgImage = vars['backgroundImage'];	
		} else {
			self.bgImage = new Image();
			self.bgImage.src = self.canvas.toDataURL("image/png");
		}

		// get canvas parent and append div for the tools
		var parent=self.canvas.parentNode;
		var toolBarDOM=document.createElement("div");		
		toolBarDOM.className = 'canvas_toolbar';

		// add colors
		toolBarHTML="";
		if(self.toolbar.colors)
		{
			toolBarHTML='<div style="clear:both;">&nbsp;</div>';
			toolBarHTML+='<div style="float:left;">Farve:</div>';
			for(c in self.toolbar['colors'])
			{
				toolBarHTML+="<a id=\"color_" + c +"\" href=\"#\" class=\"roCanvasColorPicker\" onclick=\"RoCanvasInstances['"+self.id+"'].setColor('"
					+self.toolbar['colors'][c]+"');return false;\" style=\"background:"+self.toolbar['colors'][c]+";\">&nbsp;</a> ";
				//MarkSelCol(this.id);
			}
		}	
		
		// custom color choice?
		if(self.toolbar.custom_color) {
			toolBarHTML += "&nbsp; Custom:&nbsp;<a href=\"#\" class=\"roCanvasColorPicker\" style=\"background:white;\" onclick=\"RoCanvasInstances['"+self.id+"'].setColor(this.style.background);return false;\" id='customColorChoice"+ self.id +"'>&nbsp;</a> #<input type='text' size='6' maxlength='6' onkeyup=\"RoCanvasInstances['"+self.id+"'].customColor(this.value);\">";
		}	
			
		// add sizes
		if(self.toolbar.sizes)
		{
			toolBarHTML+='<div style="clear:both;">&nbsp;</div>';
			toolBarHTML+='<div style="float:left;">Streg:</div>';
			for(s in self.toolbar['sizes'])
			{
				toolBarHTML+="<a href=\"#\" class=\"roCanvasColorPicker\" onclick=\"RoCanvasInstances['"+self.id+"'].setSize("+self.toolbar['sizes'][s]
					+");return false;\" style=\"width:"+self.toolbar['sizes'][s]+"px;height:"
					+self.toolbar['sizes'][s]+"px;background-color:black;border-radius:"+self.toolbar['sizes'][s]+"px;margin-left:15px;\">&nbsp;</a>";	
			}
		}		
		
		// add tools
		if(self.toolbar.tools)
		{
			if (self.toolbar['tools'].length>1) {
				toolBarHTML+='<div style="clear:both;">&nbsp;</div>';
				toolBarHTML+='<div style="float:left;">Pen:</div>';
				for (tool in self.toolbar['tools'])
				{
					toolBarHTML+="<a href='#' onclick=\"RoCanvasInstances['"+self.id+"'].setTool('"+self.toolbar['tools'][tool]+"');return false;\"><img src=\""+self.filepath+"/img/tool-"+self.toolbar['tools'][tool]+".png\" width='25' height='25'></a> ";
				}
			}
		}
		
		// add buttons
		if(self.toolbar.clearButton || self.toolbar.saveButton)
		{
			toolBarHTML+='<div style="clear:both;">&nbsp;</div>';
			toolBarHTML+="<p>";
			
			if(self.toolbar.clearButton)
			{
				toolBarHTML+='<input type="button" value="'+self.toolbar.clearButton.text+'"' + " onclick=\"RoCanvasInstances['"+self.id+"'].clearCanvas();\">";
			}			
			
			if(self.toolbar.saveButton)
			{
				var saveButtonCallback="";
				if(self.toolbar.saveButton.callback) saveButtonCallback=' onclick="'+ self.toolbar.saveButton.callback + '(this);"';
				toolBarHTML+='<input type="button" id="RoCanvasSave_'+ this.id +'" value="'+self.toolbar.saveButton.text+'"'+saveButtonCallback+'>';
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
		self.currentBgImage.src = self.canvas.toDataURL("image/png");

		
		/* declare mouse actions */
		

		// on mouse down
		self.canvas.addEventListener('mousedown', function(e){			
		  var mouseX = e.pageX - this.offsetLeft;
		  self.startX=mouseX;
		  var mouseY = e.pageY - this.offsetTop;		  
		  self.startY=mouseY;
				
		  self.paint = true;	
		  
		  if(self.drawTool=='path')
		  {
				self.addClick(mouseX, mouseY);
				self.redraw();
		  }
		}, false);
		
		// on dragging
		self.canvas.addEventListener('mousemove', function(e)
		{
		    if(self.paint)
		    {		    	

				// clear canvas to last saved state	
				self.context.clearRect(0,0,self.canvas.width,self.canvas.height); 
				self.context.drawImage(self.currentBgImage,0,0);

				// draw different shapes				
				switch(self.drawTool)
				{
					case 'rectangle':		
					case 'filledrectangle':		
						w = e.pageX - this.offsetLeft - self.startX;
						h = e.pageY - this.offsetTop - self.startY;
												
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
			            w = Math.abs(e.pageX - this.offsetLeft - self.startX);
			            h = Math.abs(e.pageY - this.offsetTop - self.startY);
			               
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
					default:
						self.addClick(e.pageX - document.getElementById(id).offsetLeft, e.pageY - document.getElementById(id).offsetTop, true);
					break;
			}		    
		    self.redraw();
		  }
		}, false);
		
		// when mouse is released
		self.canvas.addEventListener('mouseup', function(e){
		  self.paint = false;
		  
		  self.clickX = new Array();
		  self.clickY = new Array();
		  self.clickDrag = new Array();
		  self.clearRect=[0,0,0,0];
		  self.clearCircle=[0,0,0]; 	 	

		  //TODO: update undoStack / redoStack

		  //update the current background 		  
		  self.currentBgImage.src = self.canvas.toDataURL("image/png");		  

		}, false);
		
		this.canvas.addEventListener('mouseleave', function(e){
		  self.paint = false;
		}, false);
	};
	
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
	};
	
	// sets the size of the drawing line in pixels
	this.setSize = function(px)
	{
	    self.context.lineWidth=px;
	};

	// sets the tool to draw
	this.setTool = function(tool)
	{
		self.drawTool=tool;	
	};
	
	this.setColor = function setColor(col)
	{		
	   self.context.strokeStyle = col;
		self.context.fillStyle = col;
		self.color=col;
	};
	
	// finds the location of this file
	// required to render proper include path for images	
	this.fileLocation = function()
	{
		var scripts = document.getElementsByTagName('script');
		for(i=0; i<scripts.length;i++)
		{
			if(scripts[i].src && scripts[i].src.indexOf("rocanvas.js">0))
			{
				path=scripts[i].src;
			}
		}		
		path=path.replace(/rocanvas\.js.*$/, '');
		
		self.filepath=path;
	}; 
	
	// update custom color when value is typed in the box
	this.customColor = function(val) {		
		document.getElementById('customColorChoice' + this.id).style.background = "#" + val;
		this.setColor('#'+val);
	}
	
	// serialize the drawing board data
	this.serialize = function() {
		var strImageData = this.canvas.toDataURL("image/png");
		return strImageData;  
	}
}
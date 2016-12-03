
iv.window=function (info)//canvas,file,color,path
{
	if(info.canvas){this.canvas=info.canvas;this.canvas.ivwindow=this;}else this.canvas=null;
	
	this.mvMatrix = mat4.create();
	this.mouseCaptured=false;
	this.mouseCancelPopup=false;
	this.mouseMoved=false;
    this.view=new iv.viewInfo({from:[0,0,6],to:[0,0,0],up:[0,1,0],fov:90});
	this.LY=this.LX=0;
	this.lastTouchDistance = -1;
	this.autoRotate= 0;// &1 - auto rotation on mouse up, &2 0 
	this.orbitMode=1;
	this.cameraMode=0;// 0 default rotate, 1 - zoom, 2 -pane
	this.bkColor=(info.color!=undefined)?info.color:0x7f7f7f;
	this.initHardware();
	this.vpVersion=0;
	this.mvtmVersion=-1;
    this.cfgMinDistance=1e-6;this.cfgMaxDistance=1e8;

	this.handler=null;
	this.m_undo=null;
	this.m_undovp=null;
	this.objEditorMode=0;
	this.objEditorAxis=1;


	this.timer=false;
	if(this.gl)
	{
		if(info.file)this.load(info.file,info);else this.space=null;
		this.gl.enable(this.gl.DEPTH_TEST);
		this.initHandlers();
		this.initEvents();
		this.invalidate();
	}
	if(window.performance && window.performance.now)
		this.getTickCount= function(){return window.performance.now();};  else	this.getTickCount= function(){var d = new Date();var time = d.getTime();return time;};
}

iv.window.prototype.setViewSize=function(w,h){
    var c=this.canvas,g=this.gl;
    if(w&&h&&c) {
        c.height=h;
        c.width=w;
        if((g.viewportHeight!=h)||(g.viewportWidth!=w)) {
            g.viewportHeight=h;g.viewportWidth=w;
            this.invalidate(iv.INV_VERSION);
        }
    }
}
iv.window.prototype.initHandlers=function()
{   
	var w=this;
	var i={"move":function(event) { return w._onMouseMove(event); },"down":function(event) { return w.onMouseDown(event,false); },"up":function(event) { return w.onMouseUp(event,false); },
		"dbl":function(event) { return w._onDblClick(event); },
		"touchstart":function(event) { return w.onMouseDown(event,true);},
		"touchcancel":function(event) { return w.onTouchCancel(event);},
		"touchend":function(event) { return w.onMouseUp(event);},
		"touchmove":function(event) { return w.onTouchMove(event);},
		"menu":function(event){return w._onContextMenu(event);},
		"wheel":function(event){w.onMouseWheel(event);},
		"a":function(){w.animate();}};
	this.input=i;
}
iv.window.prototype.initEvents=function()
{   
	var w=(/Firefox/i.test(navigator.userAgent))?"DOMMouseScroll":"mousewheel",c=this.canvas,i=this.input;
	this.setEvent(c,w,i.wheel);
	this.setEvent(c,"mousedown",i.down);
	this.setEvent(c,"mousemove",i.move);
	this.setEvent(c,"dblclick",i.dbl);
	this.setEvent(c,"contextmenu",i.menu);
	this.setEvent(c,"touchstart",i.touchstart);
	this.setEvent(c,"selectstart",function(){return false;});// Chrome/FF
}
iv.window.prototype.releaseCapture=function()
{
	if(this.mouseCaptured)
	{
		var e=this.canvas,i=this.input;
		if(e.releaseCapture)e.releaseCapture();
		else
		{
			e=document;
			this.delEvent(e,"mousemove",i.move);
			this.delEvent(e,"contextmenu",i.menu);
		}
		this.delEvent(e,"mouseup",i.up);
		this.delEvent(e,"touchmove", i.touchmove);
		this.delEvent(e,"touchend", i.touchend);
		this.delEvent(e,"touchcancel", i.touchcancel);
		this.mouseCaptured=false;
	}
}
iv.window.prototype.setCapture=function()
{
	if(!this.mouseCaptured)
	{
		var e=this.canvas,i=this.input;
		if(e.setCapture)e.setCapture();else
		{
			e=document;
			this.setEvent(e,"mousemove",i.move);        
			this.setEvent(e,"contextmenu",i.menu);
		}
		this.setEvent(e,"mouseup",i.up);
		this.setEvent(e,"touchmove", i.touchmove);
		this.setEvent(e,"touchend", i.touchend);
		this.setEvent(e,"touchcancel", i.touchcancel);
		this.mouseCaptured=true;
	}
}
iv.window.prototype.notify=function(a,b,def)
{
    var _i=this.refTargets;
    if(_i){
    b=b||{};
    b.code=a;
    b.wnd=this;
    if(def)b.doDef=true;
    for(var i=0;i<_i.length;i++)_i[i](b);
    return !def || b.doDef;
    }
    return true;
}
iv.window.prototype.removeRefTarget=function(f)
{
    if(this.refTargets)
    {
        var i=iv.indexOf(this.refTargets,f);
        if(i>=0)
        {
            if(this.refTargets.length==1)this.refTargets=null;
            else this.refTargets.splice(i,1);
            return true;
        }
    }
    return false;
}
iv.window.prototype.addRefTarget=function(f)
{
    if(!f)return false;
    if(this.refTargets)
    {
        if(iv.indexOf(this.refTargets,f)>=0)return false;
        this.refTargets.push(f);
    }else this.refTargets=[f];
    return true;
}
iv.window.prototype.delEvent=function(d,e,f)
{
	if (d.detachEvent) //if IE (and Opera depending on user setting)
		d.detachEvent("on"+e, f);
	else if (d.removeEventListener) //WC3 browsers
		d.removeEventListener(e, f);
}

iv.window.prototype.setEvent=function(d,e,f)
{
	if (d.attachEvent) //if IE (and Opera depending on user setting)
		d.attachEvent("on"+e, f);
	else if (d.addEventListener) //WC3 browsers
		d.addEventListener(e, f);
}

iv.window.prototype.getWindow = function(){return this;}
iv.window.prototype.initHardware = function()
{
    var r=null;
    if(window.requestAnimationFrame)r=window.requestAnimationFrame;else
    if(window.webkitRequestAnimationFrame)r=window.webkitRequestAnimationFrame;else
    if(window.mozRequestAnimationFrame)r=window.mozRequestAnimationFrame;else
    r =function(callback) {window.setTimeout(callback,1000/60)};
    this.requestAnimFrame=r;
	var n = ["webgl","experimental-webgl","webkit-3d","moz-webgl"];
	for (var i=0;i<n.length;i++) 
	{
		try {
			this.gl = this.canvas.getContext(n[i],{alpha:false});
		}catch (e) {   }
		if(this.gl)
		{
			this.gl.viewportWidth = this.canvas.width;this.gl.viewportHeight = this.canvas.height;
			break;
		}
	}
	if (!this.gl) {
		alert("Could not initialise WebGL");
	}
	return this.gl!=null;
}


iv.window.prototype.undoVp =function(name)
{
  if(this.m_undovp)
 {
	 var u=this.m_undovp;
		if(u.open()){
			u.add(new iv.undo.vp(this));
			u.accept(name);
		}
 }
}


iv.viewInfo=function(v)
{
	this.from=[];
	this.to=[];
	this.up=[]; 
    this.scale=1;
	this.update(v);
    
}

iv.viewInfo.prototype.update=function(from,to,up) {
	if(from){
		if(to) {
			vec3.cpy(this.from,from);
			vec3.cpy(this.to,to);
			vec3.cpy(this.up,up);
		} else {
			var V=from;
			vec3.cpy(this.from,V.from);
			vec3.cpy(this.to,V.to);
			vec3.cpy(this.up,V.up);
            if(V.ortho){this.scale=V.scale;}
            else
            if(V.fov)this.fov=V.fov;
            this.camera=from.camera?from.camera:null;
		}}
}

iv.viewInfo.prototype.getUpVector=function (v)
{
	return vec3.subtract(this.up,this.from,v||[]);
}

iv.viewInfo.prototype.getViewVector=function (v){return vec3.subtract(this.to,this.from,v||[]);}
iv.viewInfo.prototype.getViewVectorN=function (v){return vec3.subtractN(this.to,this.from,v||[]);}
iv.viewInfo.prototype.compare=function (v){return (vec3.compare(this.from,v.from,1e-6)&&vec3.compare(this.to,v.to,1e-6)&&vec3.compare(this.up,v.up,1e-6));}

iv.window.prototype.getView =function(i)
{
	if(i)i.update(this.view);
	else i=new iv.viewInfo(this.view);
	return i;
}

iv.transitionView=function(wnd,view,flags)
{
    this.transition=iv.easeInOut;
	this.type="view";
	this.wnd=wnd;
    this.old=wnd.getView();    
    this.target=view;
	this.current=new iv.viewInfo(null);
    if(flags)this.flags=flags;
	this.duration=600;
    this.tm=[];
    this.prepare(view);
    this.prepare(this.old);

    this._dir=[0,0,-1];
    this._up=[0,1,0];
}


iv.transitionView.prototype.calcQ=function(a1,a0,b1,b0,up)
{   
    var _a=vec3.sub_r(a1,a0),_b=vec3.sub_r(b1,b0),la=vec3.length(_a),lb=vec3.length(_b);

    //for(var i=0;i<3;i++){a[i]/=la;b[i]/=lb;}
    var a=vec3.scale(_a,1/la,[]);
    var b=vec3.scale(_b,1/lb,[]);
    var r={l0:la,l1:lb,a:a,b:b};
    var ac=vec3.dot(a,b),d=0.9999;
    if((ac<-d) && up)
    {
        r.axis=up.slice();
        r.angle=Math.PI;
    }else{
    if((ac<d)&&(ac>-d))
	{
    	r.angle=Math.acos(ac);
	    r.axis=vec3.cross(a,b,[]);
  	}else
	{
	vec3.cpy(r.a,_a);vec3.cpy(r.b,_b);
	}
    }
    return r;
}

iv.transitionView.prototype.detach=function(wnd,f)
{
    if(f && this.flags && this.target.anim){
        f=wnd._playFavAnimation(this.target,(this.flags&(iv.VIEW_ANIM_SET|iv.VIEW_ANIM_PLAY)) );
        if(f&iv.VIEW_INVALIDATE)wnd.invalidate();
    }

}

iv.transitionView.prototype.prepare=function(v)
{
    v._dir=vec3.subtract(v.to,v.from,[]);
    v._dirLen=vec3.length(v._dir);
    v._up=vec3.subtract(v.up,v.from,[]);
    v._upLen=vec3.length(v._up);
    if(v._dirLen)vec3.scale(v._dir,1/v._dirLen);
    if(v._upLen)vec3.scale(v._up,1/v._upLen);

    var _from=[0,0,0];
    var tm=mat4.lookAt(_from,v._dir,v._up,[]);    
    mat4.invert(tm,tm);
    v._Q=quat.fromMat4([],tm);
}

iv.transitionView.prototype.animate=function(k)
{  
    var c=this.current,t=this.target,o=this.old,_k=1-k;
    if(k>0.999)
    {
        k=1;_k=0;
        vec3.cpy(c.from,t.from);
        vec3.cpy(c.to,t.to);
        vec3.cpy(c.up,t.up);
    }else{
        vec3.lerp_ip(o.to,t.to,k,c.to);
        var q=[],upL=t._upLen*k+o._upLen*_k,dirL=t._dirLen*k+o._dirLen*_k;
        quat.slerp(q,o._Q,t._Q,k);
        mat4.fromQuat(this.tm,q);
        mat4.mulVector(this.tm,this._dir,c.from);
        mat4.mulVector(this.tm,this._up,c.up);
        vec3.scale(c.from,-dirL);
        vec3.scale(c.up,upL);
        vec3.add(c.from,c.to);
        vec3.add(c.up,c.from);
    }
    this.wnd.setView(c);
    return 7;
}


iv.window.prototype.setOrtho=function(b)
{
    var v=this.view;
    if(v.ortho==b)return false;
    var l=vec3.distance(v.from,v.to);
    if(b){
	    v.scale= 1.0/(l*Math.tan(Math.PI*v.fov/(360)));
    }else
    {
	    l*=v.scale;
	    if(l>1e-6)
	    {
	        v.fov=Math.atan(1/l)*360/Math.PI;
	    }
    }
    v.ortho=b;
    this.invalidate(iv.INV_VERSION);
    return true;
};


iv.window.prototype._cmpViews =function(V,v)
{
   if(v.from && v.to && v.up)
   { 
    if(V.compare(v))
	{
        if(v.fov){
			if( V.fov==v.fov && !V.ortho)return false;
		}else
    	if(v.scale)
		{
		if(V.scale==v.scale && this.ortho)return false;
		}
		else return false;
	}
   }
    return true;
}

iv.window.prototype.setView =function(V,flags)
{   
   if(!V)return;
   var v=new iv.viewInfo(V);

    var _dir=[],_up=v.getUpVector();
	vec3.subtractN(v.to,v.from,_dir);
	var _dot=vec3.dot(_dir,_up);
	if(Math.abs(_dot)>1e-5)
	{
		var a2=[],a1=[];
		vec3.crossN(_dir,_up,a2);
		vec3.crossN(_dir,a2,a1);
		_dot=vec3.dot(_up,a1);
		if(_dot<0)vec3.scale(a1,-1);
		vec3.add(v.from,a1,v.up);
	}    
   if(flags===undefined)flags=0;
   V=this.view;
    if(this._cmpViews(V,v))
    {
    

    if(flags&iv.VIEW_UNDO)this.undoVp("View");


    if(flags&iv.VIEW_TRANSITION)
    {
        this.stopAR();
        this.removeAnimationType("view",true);
        this.addAnimation(new iv.transitionView(this,v,flags));
        return ;
    }
    V.update(v);
    }

    if(flags&iv.VIEW_INVALIDATE)
            this.invalidate(iv.INV_VERSION);
}

iv.window.prototype.setDefView =function(flags)
{
	this.stopAR();
    if(flags===undefined)flags=iv.VIEW_INVALIDATE;
	this.setView(this.space.view,flags);
}



iv.window.prototype.load=function (file,d)
{
	var s=new iv.space(this,this.gl),w=this;
	if(d && d.path)s.path=d.path;
	var r = iv.createRequest(file,s.path),ext;
    if(d && d.type)ext=d.type;else ext = file.substr(file.lastIndexOf('.') + 1);
    ext=ext.toUpperCase();

    if(ext=='IV3D'){r.responseType = "arraybuffer";r.onprogress= function (e){if (e.lengthComputable)w.notify("progress",{loaded:e.loaded,total:e.total});} };

    r.onreadystatechange = function () {
		if (this.readyState == 4 && this.status==200) {
                
                w.space=s;
                if(ext=='IV3D')s.loadBin(this.response);
                else s.load(JSON.parse(this.responseText));
			    w.setDefView();
                w.notify("dataReady");
                
        }
	}

	r.send();
}

iv.window.prototype.getDoubleSided = function(){return this.space?this.space.cfgDbl:false;}
iv.window.prototype.setDoubleSided = function(b){if(this.space.cfgDbl!=b){var s=this.space;s.cfgDbl=b;s.invalidate();}}
iv.window.prototype.getMaterials= function(){return this.space?(this.space.cfgDefMtl==null):false;}
iv.window.prototype.setMaterials= function(b)
{
	var s=this.space;
	if(b)
	{
		if(s.cfgDefMtl){
            s.cfgDefMtl.clear();
            s.cfgDefMtl=null;this.invalidate();
        }
	}else{
		if(!s.cfgDefMtl)
		{
			var m=new iv.material(s);
			m.load({"diffuse":0xcccccc,"specular":0x808080,"ambient":0x050505,"phong":25.6});
			s.cfgDefMtl=m;
			this.invalidate();
		};
	}
};

iv.window.prototype.getTextures = function(){return this.space?this.space.cfgTextures:false;}
iv.window.prototype.setTextures = function(b){if(this.space && this.space.cfgTextures!=b){this.space.cfgTextures=b;this.invalidate();}}
iv.window.prototype.setLights=function(l)
{
    var s=this.space;
    if(!s)return false;
    if(l){
        s.lights=l;
        s.stdLights=true;
    }else
    {
        s.lights=[];
        s.stdLights=false;
    }
    this.invalidate(iv.INV_MTLS);
}


iv.window.prototype.handleObjSelect_down=function(x,y,event)
{
    this.deselectNodeOnUp=false;
    var h=this.hitTestXY(x,y);
    this.mouseMoved=false;var n=h?h.node:null;
    var bCtrl=(event.ctrlKey==1);
    var i={node:n,hitInfo:h,x:x,y:y};
    if(this.notify("mousedown",i,true))
    {
    if(bCtrl||n){
        var bSelect=true;
        if(bCtrl&&n&&n.state&4) bSelect=false;
        this.space.select(n,bSelect,bCtrl);
    }else if(this.space.selNode)this.deselectNodeOnUp=true;
    }
    if(i.handler)h.handler=i.handler;
    return h;
}
iv.window.prototype.handleObjSelect_up=function(x,y)
{
    var i={x:x,y:y};
    i=this.notify("mouseup",i,true);
    if(this.deselectNodeOnUp && i)
    {
        this.space.select(null,false,false);
        this.deselectNodeOnUp=null;
    }
}

iv.window.prototype.handleObjSelect=function(x,y,event,bDown) {
    if(bDown)return this.handleObjSelect_down(x,y,event);
     else this.handleObjSelect_up(x,y);
    return null;
}


iv.window.prototype.onMouseUp=function(event,touch)
{	
	var a=this.last;
    var ar=this.autoRotate;
	if(a)
	{

		this.last=null;
	}

	var e=event;
	if(touch){
		if(event.touches.length)
			e=event.touches[0];
		else e=null;
	}
	var p=this.getClientPoint(e,touch);
	var flags=3;
	if(this.handler)flags=this.handler.onMouseUp(p,event);
	if((!this.mouseMoved) && (flags&1))this.handleObjSelect(this.LX,this.LY,event,false);
    this.onHandler(flags);

    
	this.releaseCapture();
};

iv.window.prototype.getTouchDistance=function(e)
{
	var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
	return Math.sqrt(dx*dx+dy*dy);
}

iv.window.prototype.getClientPoint=function (e,touch)
{
	var r=this.canvas.getBoundingClientRect();
	var x,y;
	if(e){
		if(touch && e.touches && e.touches.length)e=e.touches[0];
		x = e.clientX-r.left;
		y = e.clientY-r.top;
	}else {x = this.LX;y = this.LY;}
	return {"x":x,"y":y,"r":r}
}
iv.window.prototype.decodeButtons=function(e,bt)
{
	var btn=0;
	if(bt && e.touches!=undefined)
	{
		if(e.touches.length>=3)return 4;// pan
		return 1;
	}
	if(e.buttons==undefined)
	{
		// chrome stuff
		if(e.which==1)btn=1;
		else
		if(e.which==2)btn=4;
		else
		if(e.which==3)btn=2;
		else btn=1;// just in case
	}else btn=e.buttons;// IE and Mozila
	return btn;
}

iv.window.prototype.pd=function(e){if(e && e.preventDefault)e.preventDefault();}
iv.window.prototype._onContextMenu=function(event)
{
	this.pd(event);
	if(this.mouseCancelPopup)
	{   
		this.mouseCancelPopup=false;return false;
	}
	if(this.onContextMenu)this.onContextMenu(event);
	return true;
}

iv.window.prototype._onDblClick=function(event) {
	if(this.onDblClick)this.onDblClick(event,false);
	this.pd(event);
	event.stopPropagation();
	return true;
}

iv.window.prototype.onTouchMove=function(event) 
{
	this.onMouseMove(event,true);
	this.pd(event);
	return false;
}

iv.window.prototype.onTouchCancel=function (event)
{
	this.onMouseUp(event,true);
	if(event.cancelable)this.pd(event);
}

iv.window.prototype._onMouseMove=function(event) {
	if (this.mouseCaptured){
		var b= this.decodeButtons(event,false);
		if(b)this.onMouseMove(event,false);
		else this.onMouseUp(event,false);
		this.pd(event);
		event.stopPropagation();
		return true;
	}
		else  {
        var p=this.getClientPoint(event,false);p.b= 0;
        if(this.handler && this.handler.onMouseHover){
            if(!this.onHandler(this.handler.onMouseHover(p,event)))
                return false;
        }
        if(this.onMouseHover)this.onMouseHover(event,p);
    }
	return false;
}

iv.window.prototype.onMouseHover=function(event,p)
{
    this.notify("mousehover",p);
}

iv.window.prototype.setHandler=function(h)
{
    var flags=0;
    var a=this.handler;
    if(a && a.detach)flags|=a.detach(this);
    this.handler=h?h:null;
    return flags;
}

iv.window.prototype.onMouseDown=function(event,touch)
{
	this.last={x:0,y:0,t:0};
	var e=event;
	this.lastTouchDistance=-1;
	if(touch)
	{
		e=event.touches[0];
		if(event.touches.length==2)
			this.lastTouchDistance=this.getTouchDistance(event);
	}
	var p=this.getClientPoint(e,touch);
    p.b= this.decodeButtons(event,touch);
    this.pd(event);

        if(this.handler){
        if(!this.onHandler(this.handler.onMouseDown(p,event)))
            return;
        }

	this.setCapture();
    this.stopAR();
	this.LX=p.x;
	this.LY=p.y;
	this.mouseMoved=false;
	
	

    var handler=null;
	if(p.b&1){p.hit=this.handleObjSelect(p.x,p.y,event,true);if(p.hit && p.hit.handler)handler=p.hit.handler;}
	if(!handler && this.getHandler)handler=this.getHandler(p,event);
    this.setHandler(handler);
	if(this.handler)this.onHandler(this.handler.onMouseDown(p,event));

}

iv.window.prototype.onMouseMove=function (event,touch)
{
	var e=event,p=this.getClientPoint(e,touch);
	if(touch)
	{
		e=event.touches[0];
		if(event.touches.length==2){
			var d=this.getTouchDistance(event);
			if(this.lastTouchDistance!=d)
			{
				if(this.lastTouchDistance>0)
				{
					var _d=this.lastTouchDistance-d;
        if(!this.mouseMoved)this.undoVp("Zoom via Dolly");
					this.doDolly(_d,_d);
					this.invalidate(iv.INV_VERSION);
				}
				this.lastTouchDistance=d;
				this.mouseMoved=true;
				this.LX = p.x;this.LY = p.y;
			}else this.lastTouchDistance-1;
			return;
		}
	}
	var dX=p.x-this.LX,dY=p.y-this.LY;

	if(this.mouseMoved||Math.abs(dX)|| Math.abs(dY))
	{
        this.removeAnimationType("view",true);
		var b=p.b=this.decodeButtons(event,touch),flags=3;

		if(this.handler)flags=this.handler.onMouseMove(p,event);
		if(flags&1)
		{

		if(this.cameraMode && b==1)
		{
			if(this.cameraMode==1)b=2;else
			if(this.cameraMode==2)b=4;else
            if(this.cameraMode==3)b=8;
		}
        if(b&8){  if(this.doLook){ if(!this.mouseMoved)this.undoVp("Look");this.doLook(dX,dY);flags|=8;} }else
		if(b&4){if(!this.mouseMoved)this.undoVp("Pan");this.doPan(dX,dY);flags|=8;}else
		if(b&1){if(!this.mouseMoved)this.undoVp("Orbit");
				var a=this.last;if(a){a.x=dX+a.x/2;a.y=dY+a.y/2;var t=this.getTickCount();a.dt=t-a.t;a.t=t; }this.doOrbit(dX,dY);flags|=8;
			}
			else
			if(b&2){
				if(!this.mouseMoved)this.undoVp("Zoom via Dolly");
				if(!this.doDolly(dX,dY))return;
				flags|=8;
				this.mouseCancelPopup=true;
			}

		}

		this.onHandler(flags);

		this.LX=p.x;this.LY=p.y;
		this.mouseMoved=true;
	}
}

iv.window.prototype.onHandler=function(flags)
{
    var invF=0;

    if(flags&4)flags|=this.setHandler(null);

    if(flags&8){flags|=2;invF=iv.INV_VERSION;}
	if(flags&2)this.invalidate(invF);
    return (flags&1)?true:false;
}


iv.window.prototype.onMouseWheel=function(event)
{
	var d;
	if(event.wheelDelta!=undefined)d=event.wheelDelta/-10;
	else
		if(event.detail!=undefined){
			d=event.detail;
			if(d>10)d=10;else if(d<-10)d=-10;
			d*=4;
		}

	if(this.m_undovp)
	{
		var u=this.m_undovp;
		var name="Mouse Wheel";
		if(u.canRedo() || u.getLastUndoDescription()!=name && u.open())
		{
			u.add(new iv.undo.vp(this));
			u.accept(name);
		}
	}
	this.doDolly(0,d);
	this.invalidate(iv.INV_VERSION);
	this.pd(event);
}

iv.window.prototype.doPan=function(dX,dY)
{
    var i={type:"pan",dX:dX,dY:dY};
    if(this.notify("camera",i,true)){
	var v=this.getView();
	var gl=this.gl;
	var x0=gl.viewportWidth/2,y0=gl.viewportHeight/2;
	var r0=this.getRay(x0,y0),r1=this.getRay(x0-i.dX,y0-i.dY);
	var d=[r1[3]-r0[3],r1[4]-r0[4],r1[5]-r0[5]];
	vec3.add_ip(v.from,d);
	vec3.add_ip(v.up,d);
	vec3.add_ip(v.to,d);    
	this.setView(v);
    }
}

iv.window.prototype.doOrbit=function(dX,dY)
{
    var i={type:"orbit",dX:dX,dY:dY};
    if(this.notify("camera",i)){
        dX=i.dX;dY=i.dY;
        var v=this.getView(),tm=[];
        var _u=v.getUpVector();
        if(dX && this.orbitMode)
        {
            mat4.identity(tm);
            mat4.rotateAxisOrg(tm,v.to,_u,-dX/200.0);
            mat4.mulPoint(tm,v.from);
            mat4.mulPoint(tm,v.up);
            dX=0;
        }
        if(dY)
        {	
            vec3.normalize(_u);
            var _d=v.getViewVectorN();
            var _axis=vec3.cross(_d,_u,[]);
            mat4.identity(tm);
            var angle=dY/200.0;
                    
            if(this.cfgMaxVAngle!=undefined){
                var viewAngle=Math.acos(Math.max(Math.min(vec3.dot(_d,[0,0,-1]),1),-1));
                var max=(90-this.cfgMinVAngle)*Math.PI/180,min=(90-this.cfgMaxVAngle)*Math.PI/180;
                if((viewAngle-angle)>max)
                    angle=viewAngle-max;
                else
                    if((viewAngle-angle)<min)
                        angle=viewAngle-min;
            }
            mat4.rotateAxisOrg(tm,v.to,_axis,-angle);
            mat4.mulPoint(tm,v.from);
            mat4.mulPoint(tm,v.up);
        }
        if(dX)
        {
            _u=[0,0,1];
            mat4.identity(tm);
            mat4.rotateAxisOrg(tm,v.to,_u,-dX/200.0);
            mat4.mulPoint(tm,v.from);
            mat4.mulPoint(tm,v.up);
        }
        this.setView(v);
    }
}

iv.window.prototype.doDolly=function(dX,dY)
{
    var i={type:"dolly",dX:dX,dY:dY},v=this.getView();
    if(this.viewOrtho)
    {
        var k=1.0+(dY/100);
        if(k<1e-1000)k=1e-1000;
        i.scale=this.viewScale/k;
        if(!this.notify("camera",i,true))return false;
        this.viewScale=i.scale;
    }else{
        var dir=vec3.sub_r(v.from,v.to);
        var l=vec3.length(dir);
        i.len=Math.min(Math.max(l+l*dY/100,this.cfgMinDistance),this.cfgMaxDistance);
        if(!this.notify("camera",i,true))return false;
        vec3.scale_ip(dir,i.len/l);
        var delta=vec3.sub_r(vec3.add_r(v.to,dir),v.from);
        vec3.add_ip(v.from,delta);
        vec3.add_ip(v.up,delta);
        this.setView(v);
    }
    return true;
}

iv.window.prototype.doFOV=function(dX,dY)
{
    var V=this.view;
    var i={type:"fov",dX:dX,dY:dY,fov:Math.min(Math.max(V.fov+dY/8,1),175)};
    if((i.fov!=V.fov)&&this.notify("camera",i,true))
    {
        V.fov=i.fov;
        return true;
    }
    return false;
}


iv.window.prototype.getRay=function(x,y,r)
{
    /* function returns two points - start, end*/
	var gl=this.gl,w=gl.viewportWidth,h=gl.viewportHeight;
    var v=this.view;
	var p1=v.from,p2=v.to;
	var dir=vec3.sub_r(v.to,v.from);
	var up=v.getUpVector();	
	vec3.normalize(up);
	var vx=vec3.cross_rn(dir,up),h2=h/2,w2=w/2,i;
    if(!r)r=[];
    if(this.viewOrtho)
    {
        var dy=(h2-y)/h2,dx=(x-w2)/h2;
        var k=1/v.scale;
        vec3.scale(vx,dx*k);
        vec3.scale(up,dy*k);        
        for(i=0;i<3;i++)r[i]=p1[i]+up[i]+vx[i];
    }else{
	var k=vec3.length(dir)*Math.tan(Math.PI*v.fov/360);
	var ky=(h2-y)/h2,kx=(x-w2)/w2;
	vec3.scale(up,k*ky);
	vec3.scale(vx,k*kx*w/h);
    vec3.cpy(r,p1);
    }
    for(i=0;i<3;i++)r[i+3]=p2[i]+up[i]+vx[i];
    return r;
}

iv.window.prototype.updateMVTM=function()
{
    if(this.vpVersion!=this.mvtmVersion){
    this.mvtmVersion=this.vpVersion;
    var v=this.view;

	mat4.lookAt(v.from, v.to, v.getUpVector(),this.mvMatrix);
    if(v.camera && (v.camera.object instanceof iv.camera))
    {
       var c=v.camera,C=c.object;
	if(!c.camTM)
	{
           c.camTM=[];
	   c.camTMi=[];
	   mat4.lookAt(C.from, C.to, vec3.subtractN(C.up,C.from,[]),c.camTM);
	   mat4.invert(c.camTMi,c.camTM);
	}
	var tm=c.enableTM();
        var tmi=[];
	mat4.invert(tmi,this.mvMatrix);
	mat4.m(c.camTM,tmi,tm);
	var tm2=[];
	mat4.m(c.camTM,tm,tm2);
    }
    }
}

iv.window.prototype.drawScene=function () {
	var gl=this.gl;
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    var s=this.space;
	if(!s || !s.bk || (!s.drawBk()))
	{
		var bk=this.bkColor;
		gl.clearColor(((bk>>16)&0xff)/255.0,((bk>>8)&0xff)/255.0,(bk&0xff)/255.0,1);
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);	
	}	
    if(s){this.updateMVTM();s.render(this.mvMatrix);}
	this.timer=false;
}

iv.window.prototype.invalidate=function(f) {
	if(f!==undefined)
	{
		if(f&iv.INV_VERSION)this.vpVersion++;
		if(f&iv.INV_MTLS && this.space)this.space.invalidateMaterials();
		
	}
	if(this.timer)return ;
	this.timer=true;
	this.requestAnimFrame.call(window,this.drawScene.bind(this));
}
iv.easeInOut=function(a)
{
  return 0.5+Math.sin((a-0.5)*Math.PI)/2;
}

iv.window.prototype.animate=function()
{
	var j=0,rez=0,uFlags=0,inv=false,bKill=true;
	var time = this.getTickCount();
	var _i=this.transitions;
	while(j<_i.length)
	{
		var i=_i[j];
		var bDel=false;
		if(i.lastTime!=time)
		{
			if(i.duration)
			{
				var a=(time-i.startTime)/i.duration;
				if((a>=1.0)||(a<0)){a=1.0;bDel=true;}
                if(i.transition)a=i.transition(a);
				rez=i.animate(a);
			}else
			{  
				rez=i.animate(Math.max(time-i.lastTime,0));
				if(!(rez&1))bDel=true;
			}
			i.lastTime=time;
		}
		if(rez&2)inv=true;
		if(rez&4)uFlags|=iv.INV_VERSION;
		if(bDel){
			_i.splice(j,1);
			if(i.detach)i.detach(this,true);
		}else j++;
	}
	if(inv)this.invalidate(uFlags);
	if(!_i.length)
	{
		clearInterval(this.transTimer);
		this.transTimer=null;
	}
}

iv.window.prototype.getAnimation=function(type)
{
	var _i=this.transitions;
	if(_i)
	{	
		for(var i=0;i<_i.length;i++)
		{
			var t=_i[i];
			if(t.type && t.type==type)
				return i;
		}
	}
	return -1;
};
iv.window.prototype.removeAnimationType=function(type,e)
{
	var _i=this.transitions,i,t;
	if(_i)
	{	
		for(i=0;i<_i.length;i++)
		{
			t=_i[i];
			if(t.type && t.type==type)
			{
                if(e && t.duration)t.animate(1.0);
				if(t.detach)t.detach(this,false);
				_i.splice(i,1);
				return true;
			}
		}
	}
	return false;
};
iv.window.prototype.removeAnimation=function(a)
{
	var _i=this.transitions;
	if(_i){
		var i=iv.indexOf(_i,a);
		if(i>-1)
		{
			if(a.detach)a.detach(this,false);
			_i.splice(i,1);
			return true;
		}}
	return false;
}
iv.window.prototype.addAnimation=function(i)
{
	i.lastTime = this.getTickCount();
	if(i.duration)i.startTime=i.lastTime;
	if(!this.transitions)this.transitions=[];
	this.transitions.push(i);
	if(!this.transTimer){
		var w=this;
		this.transTimer=setInterval(this.input.a,10);
	}return true;
};







iv.window.prototype.stopAR=function(){


}


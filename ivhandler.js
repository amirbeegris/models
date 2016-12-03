// handler

iv.undo={};
iv.undo.manager=function (wnd)
{
	this.window=wnd;
	this.max_items = 256;
	this.min_items = 10;
	this.action_count = 0;
	this.level = 0;
	this.group = null;
	this.active = null;
	this.m_bUndoRedoInfProgress=false;
	this.items=[];
}

iv.undo.group=function()
{
	this.items =[];
	this.bUndoReady=false;
	this.name="";
};

iv.undo.group.prototype.Insert=function (item)
{
	if(!item)return;
	this.items.push(item);
}

iv.undo.group.prototype.Do=function (bUndo)
{
	if(this.items)
	{
		var stage=0;
		var _bR= bUndo && (! this.bUndoReady );
		var stage_next=0;
		var ifrom,istep,ito;
		if(bUndo)
		{
			ifrom=this.items.length-1;istep=-1;ito=-1;
		}else
		{
			ifrom=0;istep=1;ito=this.items.length;
		}
		while(stage_next!=0xffff)
		{
		stage=stage_next;
		stage_next=0xffff;
		var i;

		if(_bR)
		{
		for(i=ifrom;i!=ito;i+=istep)
		{
			var item=this.items[i];
			var _stage=item.ui_stage==undefined?0:item.ui_stage;
			if(_stage==stage && item.prepareForRedo)
				item.prepareForRedo();
		}
		}

		for(i=ifrom;i!=ito;i+=istep)
		{
			var item=this.items[i];
			var _stage=item.ui_stage==undefined?0:item.ui_stage;
			if(_stage==stage)
			{
				if(bUndo)item.undo();else item.redo();
			}else
			{
				if((_stage>stage)&&(_stage<stage_next))
					stage_next=_stage;
			}
		}
		}
		if(_bR)this.bUndoReady=true;
		return true;
	}
	return false;
}

iv.undo.manager.prototype.updateButtons=function()
{

};
iv.undo.manager.prototype.updateDocument=function()
{
	if(this.window)
		this.window.invalidate();
};

iv.undo.manager.prototype.canUndo=function()
{
	return ( ( this.active > -1 ) && this.items.length );
};

iv.undo.manager.prototype.canRedo=function()
{
	return ( ( this.active < ( this.items.length - 1 ) ) && this.items.length);
};

iv.undo.manager.prototype.undo=function()
{
	if(this.m_bUndoRedoInfProgress)
		return false;
	this.m_bUndoRedoInfProgress++;
	var rez=false;
	if ( this.canUndo() )
	{
		var g = this.items[this.active];
		this.active--;
		rez=g.Do(true);
		this.updateButtons();
		this.updateDocument();
	}
	this.m_bUndoRedoInfProgress--;
	return rez;
};

iv.undo.manager.prototype.redo=function()
{
	if(this.m_bUndoRedoInfProgress)
		return false;
	this.m_bUndoRedoInfProgress++;
	var rez=false;
	if ( this.canRedo() )
	{
		var g = this.items[this.active+1];
		this.active++;
		rez= g.Do(false);
		this.updateButtons();
		this.updateDocument();
	}
	this.m_bUndoRedoInfProgress--;
	return rez;
};

iv.undo.manager.prototype.getLastUndo=function()
{
	if( (!this.canRedo()) &&  ( this.active > -1 ) && items.length )
		return items[active];
	return null;
};


iv.undo.manager.prototype.getLastUndoDescription =function()
{
	if ( this.canUndo() )
		return this.items[this.active].name;
	return null;
};

iv.undo.manager.prototype.getLastRedoDescription=function()
{
	if ( this.canRedo() )
		return this.items[this.active + 1].name;
	return null;
};

iv.undo.manager.prototype.isModifyed=function(){return this.action_count > 0;};

iv.undo.manager.prototype.open=function()
{
	if(this.m_bUndoRedoInfProgress)
		return false;
	if ( !this.level )
		this.group = null;
	this.level++;
	return true;
};

iv.undo.manager.prototype.isOpen=function(){return (this.level)?true:false;};
iv.undo.manager.prototype.anyToAccept=function()
{
	if(this.level)
	{
		if ( this.group && this.group.items.length)
			return true;
	}
	return false;
};
iv.undo.manager.prototype.accept =function( name )
{
	if ( !this.level )
		return false;
	
	this.level--;
	if ( !this.level )
	{
		if ( this.group && this.group.items.length )
		{
			this.group.name = name;
			var tormove=this.items.length-this.active-1;
			if(tormove>=0)
			{
				this.items=this.items.slice(0,this.items.length-tormove);
				this.action_count-=tormove;
			}
			this.action_count++;
			this.active =this.items.push ( this.group )-1;// active - index of item
			this.group=0;
			//CheckLimits();
			this.updateButtons();
			return true;
		}
		else
		{
			this.group=null;
			return false;
		}
	}
	return false;
};

iv.undo.manager.prototype.add =function( item )
{
	if(this.level)
	{
	if(!this.group)
		this.group=new iv.undo.group();
		this.group.Insert ( item );
		return true;
	};
	return false;
};

iv.undo.manager.prototype.discard=function()
{
	if ( !this.level ) return false;
	this.level--;
	if ( !this.level )
	{
		//delete this.group;
		this.group = null;
		this.level = 0;
		return true;
	}
	return false;
};

iv.undo.manager.prototype.flush=function()
{
	this.items=[];
	this.active = 0;
	this.updateButtons();
	return true;
};

/*node tm*/
iv.undo.nodeTm=function(node)
{
	this.node=node;
	if(node.tm)
		this.uTM=mat4.create(node.tm);
	else this.uTM=null;
}
iv.undo.nodeTm.prototype.prepareForRedo=function()
{
	if(this.node.tm)
		this.rTM=mat4.create(this.node.tm);
	else this.rTM=null;
}

iv.undo.nodeTm.prototype.setNodeTm=function(tm)
{
	if(tm)
		this.node.tm=mat4.create(tm);
	else this.node.tm=null;
}
iv.undo.nodeTm.prototype.redo=function(){this.setNodeTm(this.rTM);}
iv.undo.nodeTm.prototype.undo=function(){this.setNodeTm(this.uTM);}


/*viewport*/


iv.undo.vp=function(wnd)
{
	this.window=wnd;
	this.udata=this.getVpData();
}


iv.undo.vp.prototype.getVpData=function()
{
	return this.window.getView();
}

iv.undo.vp.prototype.setVpData=function (d)
{
    var w=this.window;
	w.setView(d);
    w.invalidate(iv.INV_VERSION);
}

iv.undo.vp.prototype.prepareForRedo=function()
{
	this.rdata=this.getVpData();
}
iv.undo.vp.prototype.redo=function(){this.setVpData(this.rdata);}
iv.undo.vp.prototype.undo=function(){this.setVpData(this.udata);}

/*handlers*/
iv.undo.addNodeTM=function (wnd,node,name)// just a helper one
{
	if(!wnd.mouseMoved && wnd.m_undo)
	{
		var u=wnd.m_undo;
		if(u.open()){
			var item=new iv.undo.nodeTm(node);
			u.add(item);
			u.accept(name);
		}
	}
}

iv.window.prototype.getHandler=function(b,event)
{
	if(this.objEditorMode && this.space && this.space.selNode)
	{
		if(this.objEditorMode==1)return new iv.objMoveHandler(this);
		if(this.objEditorMode==2)return new iv.objRotateHandler(this);
		if(this.objEditorMode==3)return new iv.objScaleHandler(this);
	}
	return null;
}

iv.objMoveHandler=function(wnd,iaxis)
{
 this.window=wnd;
 if(!iaxis)iaxis=wnd.objEditorAxis;
 if(iaxis==7|| !iaxis)iaxis=1;
 this.m_iaxis=iaxis;
 this.m_bLineMode=iaxis==1 || iaxis==2 || iaxis==4;
 if(this.m_bLineMode)
	this.m_dragAxis=[(iaxis&1)!=0,(iaxis&2)!=0,(iaxis&4)!=0];// we need line
 else
	this.m_dragAxis=[(iaxis&1)==0,(iaxis&2)==0,(iaxis&4)==0];// we need normal
}

iv.objMoveHandler.prototype.onMouseUp =function(p,event)
{
	return 1|4;
};
iv.objMoveHandler.prototype.onMouseDown =function(p,event)
{
	if(p.b!=1)return 4;
	var w=this.window;
	if(!w.space.selNode)return 4;
	var ray=w.getRay(p.x,p.y);
	var h=w.hitTest(ray);
	if(!h)return 4;
	this.node=w.space.selNode;
	this.m_hitPoint=h.pnt; // center of rotation, dragging
	
	this.m_lastDragPoint=h.pnt.slice();
	this.node_ptm= this.node.parent?this.node.parent.getWTM():null;
	if(this.node_ptm)
	{
		this.node_ptmi=mat4.create();
		mat4.invert(this.node_ptmi,this.node_ptm);
	}else this.node_ptmi=null;
	return 0;
};


iv.lineToLineDistance=function(l1_0,u,l2)// l2 ray
{
	var SMALL_NUM=1e-20;
	//bool rezult=true;
	//point3d   u = l1[1] - l1[0];
	var   v = [l2[3]-l2[0],l2[4]-l2[1],l2[5]-l2[2]];
	var	w = vec3.sub_r(l1_0,l2);

	var	a = vec3.dot(u,u);// always >= 0
	var	b = vec3.dot(u,v);
	var	c = vec3.dot(v,v);// always >= 0
	var	d = vec3.dot(u,w);
	var	e = vec3.dot(v,w);
	var	D = a*c - b*b;// always >= 0
	var	sc, tc;

	// compute the line parameters of the two closest points
	if (D < SMALL_NUM) {// the lines are almost parallel
		return false;
		sc = 0.0;
		tc = (b>c ? d/b : e/c);// use the largest denominator
		//rezult=false;
	}
	else {
		sc = (b*e - c*d) / D;
		tc = (a*e - b*d) / D;
	}
	// get the difference of the two closest points

	//point3d   dP = w + (sc * u) - (tc * v);  // = L1(sc) - L2(tc)
	var p1=vec3.scale_r(u,sc),p2=vec3.scale_r(v,tc);
	var p3 = vec3.sub_r(p1,p2);
	var dP = vec3.add_r(w,p3);
	var dst=vec3.length(dP);
	if(dst>1e3)return null;
	//if(h1)*h1=l1[0]+u*sc;
	var h1=vec3.add_r(l1_0,p1);
	return h1;
	//if(h2)*h2=l2[0]+v*tc;
	//dst=dP.length();

	//return rezult;   // return the closest distance
}

iv.lineToPlaneIntersection=function (Pv,Pn,ray)
{
	//point3d u = S[1] - S[0];
	var  u = [ray[3]-ray[0],ray[4]-ray[1],ray[5]-ray[2]];
	//point3d w = S[0] - Pv;
	var	w = vec3.sub_r(ray,Pv);

	var D = vec3.dot(Pn, u);
	var N = -vec3.dot(Pn, w);

	if (Math.abs(D) < 1e-10){	// segment is parallel to plane
		if (N == 0)	// segment lies in plane
			return null;
		else
			return null;	// no intersection
	}
	// they are not parallel, compute intersect param
	var sI = N / D;

	if (sI < 0 /*|| sI > 1*/)
		return 0;	// no intersection

	//I = S[0] + sI * u;	// compute segment intersect point
	vec3.scale_ip(u,sI);
	vec3.add_ip(u,ray);
	return u;
}


iv.objMoveHandler.prototype.onMouseMove =function(p,event)
{
	var w=this.window;
	var ray=w.getRay(p.x,p.y);
	iv.undo.addNodeTM(this.window,this.node,"Move Object");
	var i;
	if(this.m_bLineMode)
		i=iv.lineToLineDistance(this.m_hitPoint,this.m_dragAxis,ray); // where l1 - l2 first and second line, 
	else
		i=iv.lineToPlaneIntersection(this.m_hitPoint,this.m_dragAxis,ray);
	if(i)
	{
		var delta=vec3.sub_r(i,this.m_lastDragPoint);
		this.m_lastDragPoint=i;
		if(this.node_ptmi)
			mat4.mulVector(this.node_ptmi,delta);
		mat4.offset(this.node.enableTM(true),delta);
		return 2;
	}
	return 0;
};

iv.objRotateHandler=function (wnd,iAxis)
{
	this.window=wnd;
	if(!iAxis)iAxis=wnd.objEditorAxis;
	this.m_iaxis=iAxis;
	this.m_tm=mat4.create();
	this.rAxis=[(iAxis&1)?1:0,(iAxis&2)?1:0,(iAxis&4)?1:0];
}

iv.objRotateHandler.prototype.onMouseUp =function(p,event){return 1|4;};

iv.objRotateHandler.prototype.onMouseDown =function(p,event)
{
	if(p.b!=1)return 4;
	var w=this.window;
    if(!this.node)
    {
    this.node=w.space.selNode;
	if(!w.space.selNode)return 4;
    }
	var ray=w.getRay(p.x,p.y);
	var h=w.hitTest(ray);
	if(!h)return 4;
	this.m_lastX=p.x;
	this.m_lastY=p.y;
	return 0;
}

iv.objRotateHandler.prototype.onMouseMove =function(p,event)
{
	var d=(p.x-this.m_lastX);
	if(!d)return 0;
	this.m_lastX=p.x;
	iv.undo.addNodeTM(this.window,this.node,"Rotate Object");
	if(!this.node.tm)
	{
		this.node.tm=mat4.create();
		mat4.identity(this.node.tm);
	}
	var tm=this.node.tm;
	var oX=tm[12],oY=tm[13],oZ=tm[14];
	tm[12]=0;tm[13]=0;tm[14]=0;
	mat4.identity(this.m_tm);
	mat4.rotate(this.m_tm, d/100, this.rAxis);
	mat4.m(this.m_tm,tm,tm);
	tm[12]+=oX;tm[13]+=oY;tm[14]+=oZ;
	return 2;
}

/*scale handler*/
iv.objScaleHandler=function(wnd,iaxis)
{
	this.window=wnd;
	if(!iaxis)iaxis=wnd.objEditorAxis;
	this.m_iaxis=iaxis;
	this.m_tm=mat4.create();
	this.rAxis=[(iaxis&1)!=0,(iaxis&2)!=0,(iaxis&4)!=0];
}

iv.objScaleHandler.prototype.onMouseUp =function(p,event){return 1|4;};

iv.objScaleHandler.prototype.onMouseDown =function(p,event)
{
	if(p.b!=1)return 4;
	var w=this.window;
	if(!w.space.selNode)return 4;
	var ray=w.getRay(p.x,p.y);
	var h=w.hitTest(ray);
	if(!h)return 4;

	this.node=w.space.selNode;
	this.m_lastX=p.x;
	this.m_lastY=p.y;
	return 0;
}

iv.objScaleHandler.prototype.onMouseMove =function(p,event)
{
	var dx=(p.x-this.m_lastX);
	var dy=(p.y-this.m_lastY);
	if(dx==0 && dy==0)return 0;
	var d=Math.sqrt(dx*dx+dy*dy);
	if(dx<0)d=d*-1;
	d=1.0+d/100;
	iv.undo.addNodeTM(this.window,this.node,"Scale Object");
	this.m_lastX=p.x;
    this.m_lastY=p.y;

	var tm=this.node.enableTM();
	mat4.identity(this.m_tm);
	this.m_tm[0]=this.rAxis[0]?d:1.0;
	this.m_tm[5]=this.rAxis[1]?d:1.0;
	this.m_tm[10]=this.rAxis[2]?d:1.0;
	mat4.m(this.m_tm,tm,tm);
	return 2;
}




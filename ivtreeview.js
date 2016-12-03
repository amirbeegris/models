iv.treeView=function(div,wnd,size)
{
    if(!size)size=16;
    this.div=div;
    this.view3d=wnd;
    this.size=size;
    var tree=this;
    this._doSelect=function(event){tree.doSelect(this,event);};
    this._doDblClickItem=function(event){tree.doDblClickItem(this,event);};
    this._doToggleVisibility=function(event){tree.doToggleVisibility(this);};
    this._doToggleExpand=function(event){tree.doToggleExpand(this);};
}

iv.treeView.prototype.getNodeFromItem=function (obj) {
    var item=obj.parentNode;
    if(item.className.indexOf("gitem")>=0) item=item.parentNode;
    return item.ivnode;
}


iv.treeView.prototype.isGroup=function(item)
{
	return (item.className.indexOf('group')>=0);
}

iv.treeView.prototype.groupGetGitem=function(item)
{
	_item=item.firstChild;// must be gitem
	while(_item && (_item.className.indexOf('gitem')<0))_item=_item.nextSibling;
	return _item;
}

iv.treeView.prototype.searchItem=function(node,bExpand)
{	
	var item;
	if(node.parent && node.parent.parent)item=this.searchItem(node.parent,bExpand);else {item=this.div;}
	if(item)
	{
		if(item.className=='group-c')this.doToggleExpandImp(item);
		if(item.className=='group')item=this.getGroupItems(item);
		if(!item)return null;
		var _item=item.firstChild;
		while(_item)
		{
			if(_item.ivnode && _item.ivnode==node)
				return _item;
			_item=_item.nextSibling;
		}
	}
	return null;
}

iv.treeView.prototype.ensureVisible=function(item)
{
  var itemY=item.offsetTop;
   var tv=this.div;
  var r=tv.getBoundingClientRect();
  itemY-=r.top;
  if(itemY<tv.scrollTop){tv.scrollTop=itemY;return ;}
  var parentCHeight = tv.clientHeight;
  var y=itemY+this.size*18.0/16.0;
  if(y>(tv.scrollTop+parentCHeight))	tv.scrollTop=y-parentCHeight;
};


iv.treeView.prototype.removeSelection=function (item)
{
	var item=item.firstChild;
	while(item)
	{
		var _item=item;
		if(this.isGroup(item))
		{
			var items=this.getGroupItems(item);
			if(items)
			this.removeSelection(items);
			_item=this.groupGetGitem(item);
		}
		if(_item && !(item.ivnode.state&4) ){
		var index=_item.className.indexOf(" selected");
		if(index>=0){
			_item.className=_item.className.replace(" selected","").trim();
		}}
		item=item.nextSibling;
	}
}


iv.treeView.prototype.doToggleVisibility=function(obj)
{ 
    var node=this.getNodeFromItem(obj);
   if(node)
   {
    var s;
    if(obj.className=='vis'){obj.className='hdn';s=0;}else
    {obj.className='vis';s=3;}
    node.setState(s,3);
    this.view3d.invalidate();
   }
};


iv.treeView.prototype.doDblClickItem=function (obj,event) {
    var node=this.getNodeFromItem(obj);
    if(node) {
        if(node.object instanceof iv.camera)
        {
        var c=node.object;
        var wtm=node.getWTM();
        var d={from:c.from.slice(),to:c.to.slice(),up:c.up.slice()};
        if(wtm)
        {
            mat4.mulPoint(wtm,d.from);
            mat4.mulPoint(wtm,d.to);
            mat4.mulPoint(wtm,d.up);
        }
	if(c.fov)d.fov=c.fov;else d.fov=this.view3d.fov;
        this.view3d.setView(d,iv.VIEW_TRANSITION);
        }
    }
}


iv.treeView.prototype.doSelect=function(obj,event)
{
   var node=this.getNodeFromItem(obj);
   if(node)
   {
    this.view3d.space.select(node,true,event && event.ctrlKey!=0);
   }
}

iv.treeView.prototype.getGroupItems=function (group)
{
	var listItems=group.getElementsByClassName("items");
	if(listItems && listItems.length)
		return listItems[0];
	return null;
}

iv.treeView.prototype.doToggleExpandImp=function(group)
{
	if(group.className=='group')group.className='group-c';
	else {
	group.className='group';
	this.getGroupItems(group);
	var items=this.getGroupItems(group);
         if(items && !items.firstChild)
          {
            var node=group.ivnode;
	        this.expandNode(items,node)
          }
	}
}

iv.treeView.prototype.doToggleExpand=function (obj){this.doToggleExpandImp(obj.parentNode.parentNode);}


iv.treeView.prototype.newTreeItem=function(parent,node,bGroup) {
   //if(node.camera && (!node.firstChild))return;// skip cameras
    var item=document.createElement('div');
    var name=node.name;
    //var label='<span class="label" onclick="doSelect(this,event);"  ondblclick="doDblClickItem(this,event);">'

    var label=document.createElement('span');
    label.className="label";
    label.onclick=this._doSelect;
    label.ondblclick=this._doDblClickItem;

    var chk=document.createElement('span');
    if(node.state&&node.state&3) chk.className="vis"; else chk.className="hdn";
    chk.onclick=this._doToggleVisibility;
    var _icon=document.createElement('span');
    _icon.onclick=this._doSelect;
    _icon.ondblclick=this._doDblClickItem;

    if(bGroup) {
        if(!name) name="Group";
        item.className='group-c';
        //item.innerHTML='<div class="gitem"><span class="open" onclick="doToggle(this);"></span>'+chk+'<span class="icon" onclick="doSelect(this,event);"></span>'+label+name+'</span></div><div class="items"></div>';
        var div=document.createElement('div');
        div.className="gitem";

        var _open=document.createElement('span');
        _open.className="open";
        _open.onclick=this._doToggleExpand;
        div.appendChild(_open);
        div.appendChild(chk);
        
        _icon.className="icon";
        div.appendChild(_icon);
        div.appendChild(label);

        var _items=document.createElement('div');
        _items.className="items";
        item.appendChild(div);
        item.appendChild(_items);

        
    } else {
        if(!name) name="Object";
        item.className='item';
        var extra="";
        className="node";

        item.appendChild(chk);
        _icon.className=className;
        _icon.style.backgroundPosition="-"+id*this.size+"px 0px";

        item.appendChild(_icon);
        item.appendChild(label);
    }
    var id=0;
      if(node.object instanceof iv.light)id=11;		
        else
    if(node.object instanceof iv.camera)id=12;
    if(id) _icon.style.backgroundPosition="-"+id*this.size+"px 0px";

    label.innerHTML=name;
    item.ivnode=node;
    parent.appendChild(item);
}

iv.treeView.prototype.expandNode=function (treeParent,parent)
{
for(var node=parent.firstChild;node;node=node.next)
{
  if(node.state&128)continue;
  var g=node.firstChild!=undefined && node.firstChild!=null;
  if(g && node.state&8)g=false;
  this.newTreeItem(treeParent,node,g);

}
}
iv.treeView.prototype.onNodeSelected=function(node)
{
        if(node)
        {
        this.removeSelection(this.div);
		var item=this.searchItem(node,true);
		if(item)
		{
			if(item.className=='group-c' || item.className=='group')
			{
				item=this.groupGetGitem(item);
				if(!item)return item;
			}
			if(node.state&4){
			var index=item.className.indexOf(" selected");
			if(index<0)
				item.className+=" selected";
			this.ensureVisible(item);}
		}        
       }
}

iv.treeView.prototype.init=function(space)
{
    var r=space.root;
    if(r){if(r.firstChild)this.expandNode(this.div,r);else this.newTreeItem(this.div,r,false);}
}

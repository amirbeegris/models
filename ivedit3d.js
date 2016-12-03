var view3d;
var ivtoolbar;

function UndoMgr_UpdateButtons()
{
var name;
   if(this.m_undo_btn){
   var name=this.getLastUndoDescription();
	if(name)this.m_undo_btn.title="Undo: "+name;
   else this.m_undo_btn.title="Nothing to Undo";
 }
   if(this.m_redo_btn){
    name=this.getLastRedoDescription();
  if(name)this.m_redo_btn.title="Redo: "+name;
   else this.m_redo_btn.title="Nothing to Redo";
}

}


iv.window.prototype.fillTree=function()
{
    var objects=document.getElementById("treeview");
    this.treeView=new iv.treeView(objects,this);
    this.treeView.init(this.space);
}


iv.initEditor3d=function(file)
{
  var cnv=document.getElementById("ivwindow3d");
  ivtoolbar=document.getElementById("toolbar");
  ivResizeCanvas(cnv);
  var v=new iv.window({canvas:cnv,file:file,color:0xe5e5e5});
  v.addRefTarget(function(event)
  {
    switch(event.code)
    {
        case "dataReady":
            {
            event.wnd.fillTree();
            if(event.wnd.space.anim){
                var btn=document.getElementById("ivanimate");
                if(btn)btn.style.visibility="visible";
            }
    	    iv.updateButtons(event.wnd);
            }break;
        case "selection":event.wnd.treeView.onNodeSelected(event.node);
    }
  });

  v.m_undo=new iv.undo.manager(v);
  v.m_undovp=v.m_undo;
  v.m_undo.updateButtons=UndoMgr_UpdateButtons;
  v.m_undo.m_undo_btn=document.getElementById("view3d-undo");
  v.m_undo.m_redo_btn=document.getElementById("view3d-redo");
  v.m_undo.updateButtons();
  
  view3d=v;
  return view3d;
}

window.onresize = function() {
  var cnv=document.getElementById("ivwindow3d");
  ivResizeCanvas(cnv);
} 

function ivCheckButton(id,_id)
{
	var a=" tb-active";
	var btn=document.getElementById(id);// should we use toolbar?
	if(btn)
	{
		if(id==_id){
			if(btn.className.indexOf(a)<0)
				btn.className+= a;
			}
				else
			btn.className=btn.className.replace(a,"");
	}
}

function ivSetCheck(id,check)
{
	var a=" tb-active";
	var btn=document.getElementById(id);// should we use toolbar?
	if(btn)
	{
		if(check){
			if(btn.className.indexOf(a)<0)
				btn.className+= a;
			}
				else
			btn.className=btn.className.replace(a,"");
	}
}
function ivToggleButton(id)
{
	var btn=document.getElementById(id);// should we use toolbar?
	if(btn){
	var a=" tb-active";
		if(btn.className.indexOf(a)<0){
				btn.className+= a;
				return true;
				}
		else
				btn.className=btn.className.replace(a,"");
	}
	return false;
}
function ivShowFileInfo()
{

}


function ivSetVPMode(id)
{
	var _id="view3d-"+id;
	ivCheckButton("view3d-rotate",_id);
	ivCheckButton("view3d-zoom",_id);
	ivCheckButton("view3d-pan",_id);
if(id=="rotate")view3d.cameraMode=0;else
if(id=="zoom")view3d.cameraMode=1;else
if(id=="pan")view3d.cameraMode=2;
}
function ivSetEditMode(id)
{
	var _id="view3d-obj-"+id;
	ivCheckButton("view3d-obj-select",_id);
	ivCheckButton("view3d-obj-move",_id);
	ivCheckButton("view3d-obj-rotate",_id);
	ivCheckButton("view3d-obj-scale",_id);
if(id=="select")view3d.objEditorMode=0;else
if(id=="move")view3d.objEditorMode=1;else
if(id=="rotate")view3d.objEditorMode=2;
if(id=="scale")view3d.objEditorMode=3;
}

iv.setAxis=function(id)
{
 var _id="view3d-axis-"+id;
 var chk=ivToggleButton(_id);
 var iaxis=0;
 if(id=="x")iaxis=1;else
 if(id=="y")iaxis=2;else
 if(id=="z")iaxis=4;
 if(chk)view3d.objEditorAxis|=iaxis;else view3d.objEditorAxis&= ~iaxis;
}

iv.updateButtons=function(v)
{
var axis=v.objEditorAxis;
ivSetCheck("view3d-axis-x",axis&1);
ivSetCheck("view3d-axis-y",axis&2);
ivSetCheck("view3d-axis-z",axis&4);
var mode=v.cameraMode;
var id="";
if(mode==0)_id="view3d-rotate";else
if(mode==1)_id="view3d-zoom";else
if(mode==2)_id="view3d-pan"
ivSetCheck(_id,true);
id=""
mnode=v.objEditorMode;
if(mode==0)_id="view3d-obj-select";else
if(mode==1)_id="view3d-obj-move";else
if(mode==2)_id="view3d-obj-rotate";else
if(mode==3)_id="view3d-obj-scale"
ivSetCheck(_id,true);
iv.setCheckMenu("view3d-cfg-textures",v.getTextures());
iv.setCheckMenu("view3d-cfg-dblside",v.getDoubleSided());
iv.setCheckMenu("view3d-cfg-materials",v.getMaterials());
iv.updateButtonsLights("view3d-lights-world");
}

function ivDoUndo()
{
 view3d.m_undo.undo();
}
function ivDoRedo()
{
  view3d.m_undo.redo();
}

iv.setCheckMenu=function(id,bSet)
{
   var btn=document.getElementById(id);
   var objs = btn.getElementsByTagName("img");
   if(objs && objs.length)
   {
      var img=objs[0];
      var atrr=bSet?"visible":"hidden";
     if(img.style.visibility!=atrr)
	      img.style.visibility=atrr;
  }
}

iv.toggleTextures=function()
{
   var b=!view3d.getTextures();
   view3d.setTextures(b);
   iv.setCheckMenu("view3d-cfg-textures",b);
}

iv.toggleTree=function()
{
  var t=document.getElementById("treeview");  
  if(t.style.display=="none")
 {
  iv.setCheckMenu("view3d-cfg-tree",true);
  t.style.display="block";
}else
{
  iv.setCheckMenu("view3d-cfg-tree",false);
  t.style.display="none";
}
  ivResizeCanvas(document.getElementById("ivwindow3d"));
}

iv.toggleDoubleSided=function()
{
   var b=!view3d.getDoubleSided();
   view3d.setDoubleSided(b);
   iv.setCheckMenu("view3d-cfg-dblside",b);
}
iv.toggleMaterials=function()
{
  var b=!view3d.getMaterials();
   view3d.setMaterials(b); 
   iv.setCheckMenu("view3d-cfg-materials",b);
}


iv.setCheckMenu2=function(name,name2)
{
  iv.setCheckMenu(name,name==name2);
};

iv.updateButtonsLights=function(id)
{
  iv.setCheckMenu2("view3d-lights-world",id);
  iv.setCheckMenu2("view3d-lights-off",id);
  iv.setCheckMenu2("view3d-lights-hard",id);
  iv.setCheckMenu2("view3d-lights-white",id);
  iv.setCheckMenu2("view3d-lights-day",id);
  iv.setCheckMenu2("view3d-lights-blue",id);
}

iv.setLights=function(menu)
{
var id=0;
if(menu){
  var id=menu.id;
  var l=null;
  if(id=="view3d-lights-world")l=null;
  else
  if(id=="view3d-lights-off")l=[];
  else
  if(id=="view3d-lights-hard")  l=[{"color":[0.5,0.5,0.5],"dir":[-0.57735,-0.57735,-0.57735],"type":1},{"color":[0.8,0.8,0.9],"dir":[0.57735,0.57735,-0.57735],"type":1},{"color":[0.9,0.9,0.9],"dir":[-0.242536,0,0.970143],"type":1}];
    else
  if(id=="view3d-lights-blue") l=[{"color":[0.4,0.4,0.7],"dir":[-0.784465,-0.588348,-0.196116],"type":1},{"color":[0.75,0.75,0.95],"dir":[0.590796,0.324938,-0.738495],"type":1},{"color":[0.7,0.7,0.95],"dir":[0,0,1],"type":1}];
    else
  if(id=="view3d-lights-day") l=[{"color":[0.5,0.5,0.5],"dir":[-0.784465,-0.588348,-0.196116],"type":1},{"color":[0.8,0.8,0.9],"dir":[0.590796,0.324938,-0.738495],"type":1},{"color":[0.9,0.9,0.9],"dir":[0.00999937,0.00499969,0.999938],"type":1}];
  else
  if(id=="view3d-lights-white")l=[{"color":[0.38,0.38,0.45],"dir":[-0.784465,-0.588348,-0.196116],"type":1},{"color":[0.6,0.6,0.67],"dir":[0.590796,0.324938,-0.738495],"type":1},{"color":[0.5,0.5,0.57],"dir":[-0.242536,0,0.970143],"type":1}];
  
   view3d.setLights(l);
  }
  iv.updateButtonsLights(id);
}
function ivPlayAnimation()
{
	view3d.playAnimation();
}



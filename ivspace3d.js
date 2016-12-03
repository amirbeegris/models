
iv.space=function (view,gl){
	
	this.gl=gl;
	this.window=view;
	this.root=null;
	this.view=null;
	this.materials=[];
    

    this.cfgTextures=true;
	this.cfgDbl=true;
	this.cfgKeepMeshData=3;// & 1 - faces, & 2 - vertices
	this.cfgDefMtl=null;
	this.cfgSelZOffset=false;
	this.cfgRMode=0;
    this.clrSelection=[1,0,0];    
    this.stdLights=false;

	// each item f - faces, e - edge, n - normals, mtl - custom material
	this.rmodes=[//render modes
	    {f:{n:true}},//solid mode
	    {f:null,e:{n:true}}//wireframe
    ];

	this.lights=[];
	this.activeShader=null;
	this.q=[];
    for(var i=1;i<8;i++)this.q[i]=({L:0,I:[]});
    this.tmTmp=mat4.create();
	this.projectionTM = mat4.create();
	this.modelviewTM = mat4.create();	
    this.textures=[];
	this.meshesInQueue=0;


	if(gl){
		this.e_ans = (gl.getExtension('EXT_texture_filter_anisotropic') ||gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'));

	if(this.e_ans)	
	   this.e_ansMax = gl.getParameter(this.e_ans.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
	}
}

iv.space.prototype.getWindow = function(){return this.window;}

iv.space.prototype.onMeshLoaded=function(m)
{
	this.meshesInQueue--;
	if(!this.meshesInQueue)
	{
	var w=this.window;
	if(w && w.onMeshesReady)
		w.onMeshesReady(w,this);
	}
	this.invalidate();
};

// update shader inputs
iv.space.prototype.updateShadeArgs=function(a){
	var gl=this.gl,i;
	var p=this.activeShader;
	var ca=(p)?p.attrs.length:0,na=a?a.attrs.length:0;//current attributes, new attributes

	if(na>ca) //enable the missing attributes
	{
		for(i=ca;i<na;i++) gl.enableVertexAttribArray(i);
	}
	else if(na<ca) //disable the extra attributes
	{
		for(i=na;i<ca;i++) gl.disableVertexAttribArray(i);
	}

	ca=p?p.textures.length:0;
	for(i=0;i<ca;i++) {
		gl.activeTexture(gl.TEXTURE0+i);
		var txt=p.textures[i];
		var type=txt.txt.ivtype;
		gl.bindTexture(type===undefined?gl.TEXTURE_2D:type,null);
	}
}

iv.space.prototype.activateShader = function(s,info,flags)
{
	if(s!=this.activeShader)
		this.updateShadeArgs(s);
	if(s)s.activate(this,info,flags,s==this.activeShader);
	else this.gl.useProgram(null);
	this.activeShader=s;
}

iv.space.prototype.activateMaterial = function(m,info,flags)
{
	var s=m?m.getShader(flags):0;
	if(s && !s.bValid)
	{
		if(this.activeShader)this.activateShader(null,null);// disable material
		s.update(m);
	}
	this.activateShader(s,info,flags);
	return s;
}

iv.bk3d=function(space,txt)
{
	var gl=space.gl;
    this.uv=new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]);
	this.uvBuffer=iv.bufferF(gl,this.uv,2);
	this.vBuffer=iv.bufferF(gl,[-1.0,-1.0, 0.0,1.0, -1.0, 0.0,-1.0,1.0, 0.0,-1.0,1.0, 0.0,1.0,-1.0, 0.0,1.0,1.0,0.0],3);
	var mtl=new iv.material(space);
	mtl.load({emissive:{texture:txt,wrapS:gl.CLAMP_TO_EDGE,wrapT:gl.CLAMP_TO_EDGE}});
	this.mtl=mtl;
	this.texture=mtl.emissive[0].texture;
}

iv.space.prototype.drawBk=function() {

	if(this.bk&&this.bk.texture.ivready) {
		var gl=this.gl;
		if(gl.viewportHeight&&gl.viewportWidth) {
			gl.clear(gl.DEPTH_BUFFER_BIT);
			var bk=this.bk;
			var b=null;
			var w=512,h=512;
			var img=bk.texture.image;
			if(img && img.naturalWidth)w=img.naturalWidth;else if(bk.texture.width)w=bk.texture.width;
			if(img && img.naturalHeight)h=img.naturalHeight;else if(bk.texture.height)h=bk.texture.height;

			var s=this.activateMaterial(bk.mtl,{opacity:1.0},2);
			for(var i=0;i<s.attrs.length;i++) {
				var v=s.attrs[i];				
				switch(v.id) {
					case 4300: b=bk.vBuffer; gl.bindBuffer(gl.ARRAY_BUFFER,b); break;
					case 4302: {b=bk.uvBuffer;
						gl.bindBuffer(gl.ARRAY_BUFFER,b);

						var kx=gl.viewportWidth/w,ky=gl.viewportHeight/h;
						var x=0,y=0;
						if(kx>ky)
							y=(1.0-ky/kx)/2;
						else
							if(kx<ky)
								x=(1.0-kx/ky)/2;
						var uv=bk.uv;
						if(Math.abs(uv[0]-x)>1e-5||Math.abs(uv[1]-y)>1e-5) {
							uv[0]=x; uv[1]=y; uv[2]=1.0-x; uv[3]=y; uv[4]=x; uv[5]=1.0-y;
							uv[6]=x; uv[7]=1.0-y; uv[8]=1.0-x; uv[9]=y; uv[10]=1.0-x; uv[11]=1.0-y;
							gl.bufferData(gl.ARRAY_BUFFER,uv,gl.STATIC_DRAW);
						}
					} break;
				}
				if(b) gl.vertexAttribPointer(v.slot,b.itemSize,gl.FLOAT,false,0,0);
			}
			gl.disable(gl.DEPTH_TEST);
			gl.depthMask(false);
			gl.drawArrays(gl.TRIANGLES,0,6);
			gl.enable(gl.DEPTH_TEST);
			gl.depthMask(true);
			return true;
		}
	}
	return false;
}

iv.space.prototype.invalidate = function(f){this.window.invalidate(f);}
iv.handleLoadedTexture=function (texture) {
    function isPOW2(v){return (v&(v-1))==0;}
	if(texture.image.naturalWidth>0 && texture.image.naturalHeight>0)
	{
		var type=texture.ivtype;
		var gl=texture.ivspace.gl;
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.bindTexture(type, texture);
		gl.texImage2D(type, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
		var pot=isPOW2(texture.image.naturalWidth)&&isPOW2(texture.image.naturalHeight);
		gl.texParameteri(type, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(type, gl.TEXTURE_MIN_FILTER, pot?gl.LINEAR_MIPMAP_NEAREST:gl.LINEAR);
		if(pot)gl.generateMipmap(type);
		gl.bindTexture(type, null);
		texture.ivready=true;
		texture.ivpot=pot;
		texture.ivspace.invalidate();
	}
	delete texture.image.ivtexture;
	delete texture.ivspace;
}

iv.handleLoadedCubeTexture=function (image)
{
	var texture=image.ivtexture;
	var gl=texture.ivspace.gl;
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texImage2D(image.ivface, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
	texture.ivnumfaces++;
	if(texture.ivnumfaces==6)
	{
		texture.ivready=true;
		texture.ivspace.invalidate();
		delete texture.ivspace;
	}
	delete image.ivtexture;
};
// no insertion into list
iv.space.prototype.getTexture = function(str,type,mtl) {	
	var t;
	for(var i=0;i<this.textures.length;i++)
	{
		var t=this.textures[i];
		if((t.ivfile==str) && (t.ivtype==type)){t.ivrefcount++;return t;}
	}
	var gl=this.gl;
	t = this.gl.createTexture();
	t.ivspace=this;
	t.ivready=false;
	t.ivfile=str;
	t.ivtype=type;
	t.ivrefcount=1;
    var path=(mtl && mtl.path)?mtl.path:this.path;
	if(type==gl.TEXTURE_CUBE_MAP)
	{
	var faces = [["posx", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
	["negx", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
	["posy", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
	["negy", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
	["posz", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
	["negz", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];

	t.ivnumfaces=0;
	var _str=str.split(".");
	if(path)_str[0]=path+_str[0];
		for(var i=0;i<6;i++)
		{
			var filename=_str[0]+faces[i][0]+"."+_str[1];
			var image = new Image();
			image.ivtexture=t;
			image.ivface=faces[i][1];
			image.onload=function(){iv.handleLoadedCubeTexture(this)};
			image.src=filename;
		}
	}else
    if(str=='*camera'){if(iv.HandleCameraTexture)iv.HandleCameraTexture(t);}
	else
    {
	t.image = new Image();
	t.image.ivtexture=t;
    t.filter=iv.FILTER_MIPMAP;
	t.image.onload=function () {iv.handleLoadedTexture(this.ivtexture)};
	t.image.src=path?path+str:str;
	}
	this.textures.push(t);
	return t;
}
iv.space.prototype.newMaterial=function(n){
	var mtl=new iv.material(this);
	this.materials.push(mtl);
    var t=typeof n;
	if( t=='string') mtl.name=name; 
    else
    if( t=='object') mtl.load(n);
	return mtl;
}

iv.space.prototype.getBinData=function(b,i)
{
	return new DataView(b,i.pos,i.szCmp);
}
iv.space.prototype.loadBin=function(buffer)
{
	var data= new DataView(buffer);
	var ms=[];
	var l=data.byteLength,i=0;
	var root=null;
	while(i<l)
	{
		var id=data.getUint32(i,true);
		var d={pos:i+12,id:id,sz:data.getUint32(i+4,true),szCmp:data.getUint32(i+8,true)};
		if((id&0xff000000)==0x01000000)
			ms[id&0xffffff]=d;
		else
		if(id==0x746f6f72)root=d;
		i+=d.szCmp+12;
	}
	if(root)
	{
	var data=this.getBinData(buffer,root);
	var text=ZIP.inflateStr(data,root.sz);
	var js=JSON.parse(text);
	if(js && js.space)
	{
		var d={objects:[]};l=ms.length;
        for(i=0;i<l;i++)d.objects.push(new iv.mesh(this.gl));
        this.loadImp(js,d);
		for(i=0;i<l;i++)
		{
			var info=ms[i];
			d.objects[i].load(this,ZIP.inflateBin(this.getBinData(buffer,info),info.sz));
		}
	}
	}
}

iv.space.prototype.loadImp=function(data,d) {
	var s=data.space,i,a;
	d.materials=[];d.space=this;
	if(s.materials)
		for(i=0;i<s.materials.length;i++) {
			var mtl=this.newMaterial(s.materials[i]);
			d.materials.push(mtl);
		}

	if(s.root) {
		if(!this.root) this.root=new iv.node();
		this.root.load(s.root,d);
	}
    if(s.anims){
        this.anims=s.anims;
        for(i=0;i<s.anims.length;i++)
        {
            a=s.anims[i];
            if(a.active)
            {
                this.activateAnimation(a);
                break;
            }
        }    
    }
    if(s.view){
        a=s.view;
        this.view={from:a.from||a.org,to:a.to||a.target,up:a.up};
	    if(a.fov)this.view.fov=a.fov;
        if(a.viewScale)this.view.scale=a.viewScale;
        if(a.camera)this.view.camera=this.root.searchId(a.camera)
    }
    if(s.config)
    {
        var c=s.config;
        for(var v in c)
        {
            switch(v)
            {
            case "bkfaces":this.cfgDbl=c[v];break;
            }
        }
    }
	if(s.views) this.views=s.views;
	if(data.space.bk!=undefined)
		this.bk=new iv.bk3d(this,data.space.bk);
}

iv.space.prototype.load=function(data){
	if(data && data.space) {
			var m=data.space.meshes;
			var d={ objects:[]};
			if(m)
				for(var i=0;i<m.length;i++) {
					var obj=new iv.mesh(this.gl);
					if(this.path)
						obj.url=this.path+m[i].ref;
					else obj.url=m[i].ref;
					d.objects.push(obj);
				}
			this.loadImp(data,d);
		}
};

iv.space.prototype.renderQueue=function(items)// t transparency
{
	var c=items.length;
	var a;
	var gl=this.gl;
	for(var i=0;i<c;i++){
		var b=items[i];
		var d=(b.state&32)!=0;
		if(d!=a) {
			if(d) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
			a=d;
		}
		b.object.render(this,b);
	};
}

iv.space.prototype.updatePrjTM=function() {
    var V=this.window.view;
    var gl=this.gl;
    var bOk=false;
    var far=0,near=0;
    
    for(var iPass=1;iPass<this.q.length;iPass++) {
        var q=this.q[iPass],c=q.L;
        if(!c)continue;
        var items=q.I;
        for(var iO=0;iO<c;iO++) {
            var d=items[iO];
            if(bOk)
            {
                if(d.near<near)near=d.near;
                if(d.far>far)far=d.far;
            }else {far=d.far;near=d.near;bOk=true};
        }
    }
    var kx=gl.viewportWidth/gl.viewportHeight;
    if(V.ortho)
    {
        var ky=1;
        kx/=V.scale;
        ky/=V.scale;
        mat4.ortho(-kx,kx,-ky,ky,near,far,this.projectionTM);
    }else{
        if(bOk) {
            var d=far-near;
            d/=100;far+=d;near-=d;// some guard distance
            d=far/1000;
            if(near<d) near=d;// avoid Z buffer corruption
        } else {
            near=0.1; far=100;
        }
        mat4.perspective(V.fov,kx,near,far,this.projectionTM);
    }
};


iv.space.prototype.zCompareFunc=function(a, b) {
	var _a = a ? a.near : -1e38, _b = b ? b.near : -1e38;
	if (_a > _b) return -1; if (_a < _b) return 1; return 0;
};

iv.space.prototype.prepareLights=function() {
    var changes=false,_i=this.lights;
    var d=_i.length-this.currentLight;
    if(d) { _i.splice(this.currentLight,l); changes=true; }
    var org=[0,0,0];
    for(i=0;i<_i.length;i++) {
        var l=_i[i],L=l.light;
        if(L.type!==l.type) { l.type=L.type; changes=true; }
        l.color=L.color;
        if(L.type!=1) {
            if(l.tm) l.org=mat4.mulPoint(l.tm,org,[]); else l.org=org;
        }
        if(L.target)
        {
        if(!l.dir)l.dir=[];
        if(!l.targetNode || (L.target!=l.tagert))l.targetNode=this.root.searchId(l.tagert=L.target);
        
        if(l.targetNode)
        {
            var wtm=l.targetNode.getWTM();
            if(wtm)
                mat4.getTranslate(wtm,l.dir);
            else vec3.cpy(l.dir,[0,0,0]);
            vec3.subtractN(l.dir,l.org);
        }

        }else{
        if(l.tm) {

            if(L.dir) { l.dir=mat4.mulVector(l.tm,L.dir,[]); vec3.normalize(l.dir); }
        } else {
            if(L.dir) l.dir=L.dir;
        }
        }
        if(l.type==2)
        {
            if(!l.spot)l.spot=[0,0,0];
            var cin=Math.cos(L.inner/2),cout=Math.cos(L.outer/2);
            l.spot[0]=cin;
            l.spot[1]=cout;
        }
    }
    if(changes)this.invalidateMaterials();
}
iv.space.prototype.invalidateMaterials=function()
{
     var _i=this.materials;
     for(var i=0;i<_i.length;i++) _i[i].invalidate();
}

iv.space.prototype.render=function(tm) {
    if(this.root) {
        mat4.copy(tm,this.modelviewTM);
        var gl=this.gl,tmw=mat4.create(),astate=this.cfgRMode<<8,i;
        mat4.identity(tmw);
        if(this.cfgDbl)astate|=32;
        gl.cullFace(gl.BACK);

        this.currentLight=0;
        this.root.traverse(tmw,iv.nodeRender,this,astate,1.0);
        if(!this.stdLights)
            this.prepareLights();

        this.updatePrjTM();

        var blend=false;
        for(i=1;i<this.q.length;i++) {
            var q=this.q[i],L=q.L;
            if(!L)continue;
            var _i=q.I;
            if(_i.length>q.L)_i.splice(q.L, _i.length-q.L);
            if(i>3)
            {
                if(!blend)
                {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
                    blend=true;
                }
                if(i==7)gl.clear(gl.DEPTH_BUFFER_BIT);
                _i.sort(this.zCompareFunc);
            }
            this.renderQueue(_i);
            q.L=0;
        }
        if(blend)gl.disable(gl.BLEND);
        this.activateMaterial(null);//reset state
    }
};

iv.queueItem=function()
{
    this.tm=null;
    this.object=null;
    this.mtl=null;
    this.far=this.near=1.0;
    this.state=0;
}

iv.space.prototype.toRenderQueue=function(atm,node,state,opacity) {
    var tm;
    if(atm) tm=mat4.m_z(atm,this.modelviewTM,this.tmTmp);
    else tm=this.modelviewTM;
    var obj=node.object,_min=obj.boxMin,_max=obj.boxMax;
    
    var near= -(tm[2]*_min[0]+tm[6]*_min[1]+tm[10]*_min[2]),far=near;

    for(var i=1;i<8;i++) {
        var x=(i&1)?_max[0]:_min[0],y=(i&2)?_max[1]:_min[1],z=(i&4)?_max[2]:_min[2];        
        z= -(tm[2]*x+tm[6]*y+tm[10]*z);
        if(z<near) near=z; else if(z>far) far=z;
    }
    z=tm[14];
    far-=z;near-=z;
    if(far<1e-6) return;

    var rmode=this.rmodes[(state&0xff00)>>8],mtl=rmode.mtl||this.cfgDefMtl||node.material;
    var s=node.stage||((mtl.opacity!=undefined || opacity<1.0)?4:2) , _q=this.q[s],a=_q.I[_q.L];
    if(!mtl.sortId)mtl.sortId=this.mtlSortId++;

    if(!a) a=_q.I[_q.L]=new iv.queueItem();
    a.tm=atm;
    a.object=obj;
    a.mtl=mtl;
    a.near=near;
    a.far=far;
    a.state=state|(node.state&(16|32|0x30000));
    a.opacity=opacity;
    _q.L++;
};

iv.space.prototype.getMaterial=function(name){
	var it=this.materials;
	for(var i=0;i<it.length;i++) {
		var m=it[i];
		if((m.name!==undefined)&&m.name==name) return m;
	}
	return null;
}

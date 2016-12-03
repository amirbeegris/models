// material 3d interface

/* material flags
 1 - n
 2 - uv
 4 - colors
 8 - tm
 16 - bump
 32 - uv2
 64 - color emissive
 256 - selected
 512 - double sided
- 0x30000 - z offset
*/

iv.mtlchannel=function(){
	this.mode=0;
	this.color=null;
	this.texture=null;
}

iv.mtlvar=function(id,ord) {
	this.id=id;
	this.ord=ord;
	this.slot=null;
}

iv.shader=function(m,f) {
	this.mtl=m;
	this.flags=f;
	this.bValid=false;
	this.attrs=[];// list of attrs to program
	this.vars=[];// list of attrs to program
	this.textures=[];
	this.program=null;
	this.vShader=null;
	this.fShader=null;
	this.loadedtextures=0;
	this.numLights=0;
};

iv.material=function(space){
this.space=space;
this.gl=space.gl;
this.type="standard";
this.shaders=[];
// channels: diffuse, specular, emissive, reflection, bump, opacity
this.phong=18;
}

iv.mtlchannel.prototype.setColor=function(clr) {
	if(!this.color) this.color=[0,0,0];
	var c=this.color;
	var t=typeof clr;
	if(t==='number') {
		c[0]=((clr>>16)&0xff)/255;
		c[1]=((clr>>8)&0xff)/255;
		c[2]=(clr&0xff)/255;
	}
	else {
		c[0]=clr[0]; c[1]=clr[1]; c[2]=clr[2];
	}
}

iv.material.prototype.invalidate=function() {
	var s=this.shaders;
	if(s) {
		for(var i=0;i<s.length;i++)
			s[i].detach(this.gl);
		this.shaders=[];
	}
}

iv.material.prototype.clear = function()
{
	if(this.diffuse)delete this.diffuse;
	if(this.specular)delete this.specular;
	if(this.emissive)delete this.emissive;
	if(this.reflection)delete this.reflection;
	if(this.bump)delete this.bump;
	if(this.opacity)delete this.opacity;
    if(this.lightmap)delete this.lightmap;
	this.invalidate();
}

iv.material.prototype.isChannel  = function(c)
{
	if( (c===undefined)||(c===null))return false;
	if(c.length===0)return false;
	for(var i=0;i<c.length;i++)
	{
		var item=c[i];
		if(item.texture!=null || item.color!=null || item.amount!=null)return true;
	}
	return false;
}

iv.material.prototype.newChannel = function(type,ch)
{
	if(!ch)ch=new iv.mtlchannel();
	if(!(type in this))this[type]=[];
	this[type].push(ch);
	this.bValid=false;
	return ch;
}

iv.material.prototype.getChannel = function(type)//returns first channel
{
	if(!(type in this))return null;
	var items=this[type];
	return items[0];
}


iv.material.prototype.newTexture = function(c,name,type)
{
	var gl=this.gl;
	if(type===undefined)type=gl.TEXTURE_2D;
	c.texture=this.space.getTexture(name,type,this);
	if(type==gl.TEXTURE_CUBE_MAP)c.wrapT=c.wrapS=gl.CLAMP_TO_EDGE;
	else
	{
		if(!c.wrapS)c.wrapS=gl.REPEAT;
		if(!c.wrapT)c.wrapT=gl.REPEAT;
	}
}

iv.material.prototype.cnvTtxMatrix=function (a)
{
	var tm=mat3.create();
	var index=0;
	for(var i=0;i<3;i++)
	{
		for(var j=0;j<2;j++){tm[i*3+j]= a[index];index++;}
	}
	tm[2]=0;tm[5]=0;tm[8]=1;
	return tm;
}

iv.material.prototype.loadChannelImp=function(v,name) {
	var c=this.newChannel(name);
	if(v.color!==undefined) c.setColor(v.color);
	if(v.amount!==undefined) c.amount=v.amount;
    if(v.blend) c.blend=v.blend;
	if(v.texture!==undefined) {
		var type=undefined;
		if(("type" in v)&&v.type=="cube") {
			if(this.gl) type=this.gl.TEXTURE_CUBE_MAP;
			else type=0x8513;// double check this
		}
		if(v.tm)
			c.tm=this.cnvTtxMatrix(v.tm);
		if(v.cmp) c.cmp=v.cmp;
		if(v.filter) c.filter=v.filter;		
		if(v.uvset)c.uv=v.uvset;else c.uv=0;
		if(v.wrapT) c.wrapT=v.wrapT;
		if(v.wrapS) c.wrapS=v.wrapS;
		this.newTexture(c,v.texture,type);
	}
}

iv.material.prototype.loadChannel=function(v,name) {
	var type=typeof v;
	if(type==="number") {
		var c=this.newChannel(name);
		if(name=='opacity') c.amount=v; else c.setColor(v);

	} else
		if(type==="object") {

			if(v instanceof Array) {
				var len=v.length;
				if((len==3)&&(typeof v[0]=='number')&&(typeof v[1]=='number')&&(typeof v[2]=='number')) {
					var c=this.newChannel(name);
					c.setColor(v);
				} else {
					for(var i=0;i<len;i++) this.loadChannelImp(v[i],name);
				}
			} else this.loadChannelImp(v,name);
		}
};

iv.material.prototype.load=function(d)
{
	for(var v in d)
	{
    var a=d[v];
    switch(v)
	{
    case "lightmap":
	case "diffuse":
	case "specular":
	case "emissive":
	case "reflection":
	case "opacity":
	case "bump":this.loadChannel(a,v);break;
    case "ambient":this.loadChannel(a,"emissive");break;
	case "name":
	case "phong":
    case "backSide":
	case "path":this[v]=a;break;
	}}
	return true;
}


iv.material.prototype.getShader = function(flags)
{
	flags&=~256;// remove selection
	if(!this.space.cfgTextures)flags&=~2;
	// we may need to remove bits from flags
	for(var i=0;i<this.shaders.length;i++)
	{
		var s=this.shaders[i];
		if(s.flags==flags)
		{
			if((s.loadedtextures!=s.textures.length) && s.bValid)
			{
				var c=s.readyTextures(false);
				if(c!=s.loadedtextures)s.bValid=false;
			}
			if(s.numLights!=this.space.lights.length)s.bValid=false;
			return s;
		}
	}
	var s=new iv.shader(this,flags);
	this.shaders.push(s);
	return s;
}


iv.shader.prototype.addVar = function(id,ord)
{
	var v=new iv.mtlvar(id,ord);
	this.vars.push(v);
	return v;
}

iv.shader.prototype.addAttr = function(id,shName,gl)
{
	var attr={};
	attr.id=id;
	attr.slot= gl.getAttribLocation(this.program, shName);
	gl.enableVertexAttribArray(attr.slot);// do we need this	
	this.attrs.push(attr);
}

iv.shader.prototype.addLightVar = function(id,name,light,ord)
{
	var v=this.addVar(id,ord);
	v.name=name;
	v.light=light;
	return v;
}

iv.shader.prototype.addChVar = function(id,name,ch,ord)
{
	var v=this.addVar(id,ord);
	v.name=name;
	v.channel=ch;
	return v;
}

iv.shader.prototype.compareTM3=function (a,b)
{
	if(a===undefined && b===undefined)return true;
	if(a===undefined || b===undefined)return false;
	for(var i=0;i<9;i++)
		if(Math.abs(a[i]-b[i])>1e-4)return false;
	return true;
}

iv.shader.prototype.getTexture=function(c)
{
	var items=this.textures;
	for(var j=0;j<items.length;j++)
	{
		var t=items[j];
		if(t.txt===c.texture && (t.wrapS==c.wrapS) && (t.wrapT==c.wrapT) && this.compareTM3(t.tm,c.tm) && c.uv==t.uv)
			return t;
	}
	return null;
}

iv.shader.prototype.preChannel=function(ch,ft)
{
	var text="";
	for(var i=0;i<ch.length;i++)
	{
		var c=ch[i];
		c._id=this.channelId;this.channelId++;
		if(c.color!=null)
		{
			var name="ch"+c._id+"clr";
			this.addChVar("color",name,c,4102);
			text+="uniform vec3 "+name+";\r\n";
		}
		if("amount" in c)
		{
			var name="ch"+c._id+"amount";
			this.addChVar("amount",name,c,4104);
			text+="uniform float "+name+";\r\n";
		}
	}
	ft.push(text);
};


iv.shader.prototype.handleChannel_=function(gl,ch,ft)
{
	var text="";
    var text2="";
	for(var i=0;i<ch.length;i++)
	{
		var c=ch[i];
		var cname=null;
		var tname=null;
		var aname=null;
		if(c.color!=null){cname="ch"+c._id+"clr";}
		if(c.texture!=null && c.texture.ivready)
		{
			var t=this.getTexture(c);
			if(t){
				if(c.texture.ivtype==gl.TEXTURE_CUBE_MAP)
				{
				text+="vec3 lup = reflect(eyeDirection,normal);lup.y*=-1.0;vec4 refColor="+"textureCube(txtUnit"+t.slot+",lup);";//sorry - only one reflection texture, remove lup.y-1 from here
				tname="refColor";
				}else{
				tname="txtColor"+t.slot;
				}
			}
		}
		if(tname && c.amount!=null){aname="ch"+c._id+"amount";}
        
		if(cname || tname)
		{
		var local=null;

		if(aname && tname)local="vec3("+aname+")*vec3("+tname +")";// color and amount
		else
		if(cname && tname)local=cname+"*vec3("+tname +")";// color by texture
		else
		if(cname)local=cname;
        else local="vec3("+tname+")";
        
        if(text2.length)
        {
            text2="("+text2+")"+this.getBlend(c)+local;
        }else text2=local;
	    }
    }
    if(text.length)ft.push(text+"\r\n");
    return text2;
}

iv.shader.prototype.handleChannel=function(gl,ch,cmp,ft)
{
    var text2=this.handleChannel_(gl,ch,ft);
    if(text2){
        if(cmp)text2=cmp+"*="+text2;
        else text2="color+="+text2;
        ft.push(text2+";");
    }
    if(cmp)ft.push("color+="+cmp+";");
};


iv.shader.prototype.getBlend=function(c) {
    var blend;
    switch(c.blend) {
        case "sub": blend="-"; break;
        case "mul": blend="*"; break;
        default: blend="+"; break;
    }
    return blend;
}

iv.shader.prototype.handleAlphaChannel=function(gl,ch,ft)
{
	if(ch && ch.length)
	{
        var txt=null;
        var tAlpha=false;
		for(var i=0;i<ch.length;i++)
		{
		var c=ch[i];
		var tname=null;
		var aname=null;

		if(c.texture && c.texture.ivready)
		{
			var t=this.getTexture(c);
			if(t)
				tname="txtColor"+t.slot;
		}
		if(c.amount!=null){aname="ch"+c._id+"amount";}

        
		if(tname)
		{
			
			if(aname)t=aname+"*";else t="";
			if(c.cmp && c.cmp=='a')
				t+=tname+".a";
			else
				t+="("+tname+".x+"+tname+".y+"+tname+".z)/3.0";
		}else
		if(aname)t= aname;
		if(t)
        {
            if(txt)
            {
                if(!tAlpha)
                {
                    txt="float alpha="+txt+";\n";
                    tAlpha=true;
                }
                txt+="alpha"+ this.getBlend(c)+'='+t+";\n";
            }else txt=t;
        }
        }
        if(txt)
        {
            if(tAlpha)
            {
                ft.push(txt);
                return "alpha";
            }else return txt;
        }
	}
	return "1.0";
}

iv.shader.prototype.handleBumpChannel=function(gl,ch)
{
	if(ch && ch.length)
	{
		var c=ch[0];
		if(c.texture && c.texture.ivready)
		{
			var t=this.getTexture(c);
			if(t){
					var tname="txtColor"+t.slot;
					var text="\r\nvec3 _n=vec3("+tname+");";
					text+="_n-=vec3(0.5,0.5,0);_n*=vec3(2.0,2.0,1.0);";
					if(c.amount!=null){var aname="ch"+c._id+"amount";text+="_n*=vec3("+aname+","+aname+",1.0);";}
					text+="_n=normalize(_n);";
					return text;
			}
		}
	}
	return null;	
}

iv.shader.prototype.collectTextures=function(ch,f)
{
	var rez=0;
	if(ch)
	{
		for(var i=0;i<ch.length;i++)
		{
			var c=ch[i];
			if(c.texture&& ( (f<0)|| (f&(1<<c.uv)  ) ) ){
                
				if(!this.getTexture(c))
				{
					var t={"txt":c.texture,"slot":0,"wrapS":c.wrapS,"wrapT":c.wrapT,uv:c.uv?c.uv:0};
					if(c.tm){t.tm=c.tm;
					t.ch=c;
					}
					this.textures.push(t);
				}
				if(c.texture.ivready)
					rez|=1<<c.uv;
			}
		}
	}
	return rez;
}

iv.shader.prototype.readyTextures = function(bSet)
{
	var c=0;
	for(var i=0;i<this.textures.length;i++)
	{
		var t=this.textures[i];
		if(t.txt.ivready)
		{
			if(bSet)t.slot=c;
			c++;
		}
	}
	return c;
}

iv.shader.prototype.compile=function(gl,i,type)
{
    var str=i.join('');
	var shader= gl.createShader(type);
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(str+"\r\n"+gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}


iv.shader.prototype.fetchTextures=function(gl,ft)
{
    var _i=this.textures;
    var a=0;
	for(i=0;i<_i.length;i++)
	{
		var t=_i[i];
		if(t.txt.ivready && t.txt.ivtype==gl.TEXTURE_2D){
			if(t.tm){
                var s="_uv=vec2(ch"+t.ch._id+"tm*vec3(vUV"+t.uv+",1.0));\n";
                ft.push((a?"":"vec2 ")+s);
                a++;//counter of textures
            }
			ft.push("vec4 txtColor"+t.slot+"= texture2D(txtUnit"+t.slot+","+ ((t.tm)?"_uv":"vUV"+t.uv)+");");
		}
	}
}

iv.shader.prototype.update = function(mtl)
{	
    mtl=this.mtl;
	if(this.program)this.detach(mtl.gl);// may be just update?
	this.numLights=mtl.space.lights.length;
	this.channelId=0;	
	var gl=mtl.gl,i;
	var _lights=null;
    var vt=[];
    var ft=[];
	if(this.flags&8)vt.push("uniform mat4 tmWorld;uniform mat4 tmModelView; uniform mat4 tmPrj;");
	if(this.flags&iv.R_Z_OFFSET)
		vt.push("uniform float zOffset;");
	var bNormals=(this.flags&1)!=0,bSpecular=false,bDiffuse=false,bLights=false,bReflection=false,bBump=false,bLightMap=false;
	var bEmissive=mtl.isChannel(mtl.emissive);	
    var bOpacity=mtl.isChannel(mtl.opacity) || (this.flags&1024);
	var lights=mtl.space.lights;
	vt.push("attribute vec3 inV;");
	if(this.flags&8)vt.push("varying vec4 wPosition;");

	if(this.flags&4)//diffuse colors
	  vt.push("varying vec3 vC;attribute vec3 inC;");
	 
	if(this.flags&64)// emissive colors
	  vt.push("varying vec3 vCE;attribute vec3 inCE;");
	var bUV=0;

	if(bNormals){
		vt.push("varying vec3 wNormal;attribute vec3 inN;");
		if(lights.length)
		{
			if(mtl.isChannel(mtl.diffuse))bDiffuse=true;
			if(mtl.isChannel(mtl.specular))bSpecular=true;
			bLights=bDiffuse||bSpecular;
		}
	if(mtl.space.cfgTextures)
		bReflection=this.collectTextures(mtl.reflection,-1);
	}
    var _uvflags=0;
    if(this.flags&2)_uvflags|=1;
    if(this.flags&32)_uvflags|=2;	
        if(_uvflags){
		if(bDiffuse)bUV|=this.collectTextures(mtl.diffuse,_uvflags);
		if(bSpecular)bUV|=this.collectTextures(mtl.specular,_uvflags);
		if(bEmissive)bUV|=this.collectTextures(mtl.emissive,_uvflags);
		if(bOpacity)bUV|=this.collectTextures(mtl.opacity,_uvflags);
		if(bNormals && bLights)bUV|=(bBump=this.collectTextures(mtl.bump,_uvflags));
        bUV|=  (bLightMap=this.collectTextures(mtl.lightmap,_uvflags));
	}
	if(bUV&1)vt.push("varying vec2 vUV0;attribute vec2 inUV0;");
    if(bUV&2)vt.push("varying vec2 vUV1;attribute vec2 inUV1;");

	if(bBump)
	{vt.push("varying vec3 vBN,vBT;attribute vec3 inBN,inBT;");}
	this.loadedtextures=this.readyTextures(true);
	
	vt.push("\r\nvoid main(void){\r\n");
	
	if(this.flags&8){
		vt.push("wPosition= tmWorld*vec4(inV,1.0);vec4 vPosition = tmModelView* wPosition; gl_Position = tmPrj* vPosition; ");
		this.addVar("tmWorld",4101);this.addVar("tmModelView",4114);this.addVar("tmPrj",4115);
	}
	else vt.push("gl_Position = vec4(inV,1.0);");

		
	// to do
	
	if(this.flags&iv.R_Z_OFFSET)// z offset
	{
		this.addVar("zOffset",4105);
		vt.push("gl_Position.z+=zOffset;");
	}
	
	if(bNormals){
		    vt.push("wNormal = ");
            if(mtl.backSide)vt.push("-");
            vt.push("normalize(vec3(tmWorld* vec4(inN,0.0)));");
        }
	if(bBump)vt.push("vBN=normalize(vec3(tmWorld*vec4(inBN,0.0)));vBT=normalize(vec3(tmWorld*vec4(inBT,0.0)));");
	if(bUV&1)vt.push("vUV0=inUV0;");
    if(bUV&2)vt.push("vUV1=inUV1;");

	if(this.flags&4)vt.push("vC = inC;");
	if(this.flags&64)vt.push("vCE = inCE;");

	vt.push("}");
	
	ft.push("precision mediump float;");
    if(this.flags&1024)ft.push("uniform float opacity;");
	if(bNormals )ft.push("varying vec4 wPosition;");
	if(this.flags&4)ft.push("varying vec3 vC;");
	if(this.flags&64)ft.push("varying vec3 vCE;");
	if(bUV&1)ft.push("varying vec2 vUV0;");
    if(bUV&2)ft.push("varying vec2 vUV1;");

	if(bBump)
		ft.push("varying vec3 vBN,vBT;");
	if(bDiffuse)this.preChannel(mtl.diffuse,ft);
	if(bSpecular)this.preChannel(mtl.specular,ft);
	if(bEmissive)this.preChannel(mtl.emissive,ft);
	if(bReflection)this.preChannel(mtl.reflection,ft);
	if(bOpacity&& mtl.opacity)this.preChannel(mtl.opacity,ft);
	if(bBump)this.preChannel(mtl.bump,ft);

	for(i=0;i<this.textures.length;i++)
	{
		var t=this.textures[i];
		if(t.txt.ivready){
			ft.push("uniform ");
			if(t.txt.ivtype==gl.TEXTURE_CUBE_MAP)
				ft.push("samplerCube");
			else
				ft.push("sampler2D");
			ft.push(" txtUnit"+ t.slot+";");
			if(t.tm){
				var v=this.addVar("tm",4103);
				v.channel=t.ch;
				ft.push("uniform mat3 ch"+t.ch._id+"tm;");
			}
		}
	}

	if(bNormals){
		ft.push("uniform vec3 eye;");
		this.addVar("eye",4113);
		if(bSpecular)
		{
			ft.push("uniform float mtlPhong;");
			this.addVar("mtlPhong",4116);
		}
		ft.push("varying vec3 wNormal;");
		ft.push("float k;");
		if(bLights)
		{
		ft.push("vec3 diffuse,specular,lightDir;");//lightDir - for point lights only
		_lights=[];
        var bAnySpot=false;
		for(i=0;i<lights.length;i++)
		{
			var ls=lights[i];
			var l={};
			l.light=ls;
			var colorname="light"+i+"Clr";
			ft.push("uniform vec3 "+colorname+";");
			l.colorname=colorname;
			this.addLightVar ("lightColor",colorname,ls,4110);

			if(ls.dir)
			{
				var dirname="light"+i+"Dir";
				l.dirname=dirname;
				ft.push("uniform vec3 "+dirname+";");
				this.addLightVar ("lightDir",dirname,ls,4112);
			}
            if(ls.spot)
            {
                bAnySpot=true;
                l.spotname="light"+i+"Spot";
				ft.push("uniform vec3 "+l.spotname+";");
				this.addLightVar ("lightSpot",l.spotname,ls,4117);
            }
			if(ls.org)
			{
				l.orgname="light"+i+"Org";
				ft.push("uniform vec3 "+l.orgname+";");
				this.addLightVar ("lightOrg",l.orgname,ls,4111);
			}
			_lights.push(l);
		}
        if(bAnySpot)ft.push("float angle;");
        }
	}

	ft.push("\nvoid main(void) {\r\n");
    this.fetchTextures(gl,ft);

	if(bNormals)
	{
		ft.push("vec3 normal = normalize(wNormal);");
		var normalSign="";
		if(this.flags&512){ft.push("vec3 normalSign=vec3(gl_FrontFacing?1.0:-1.0);");normalSign="normalSign*";}

		if(bBump)
		{
			var txt=this.handleBumpChannel(gl,mtl.bump);
			if(txt){
				ft.push(txt);
				ft.push("mat3 tsM = mat3(normalize("+normalSign+"vBN), normalize("+normalSign+"vBT), normal);");
				ft.push("normal =  normalize(tsM*_n);");
			}
		}
		if(this.flags&512)ft.push("normal="+normalSign+"normal;");
        
		
		ft.push("vec3 eyeDirection = normalize(wPosition.xyz-eye);vec3 reflDir;float specA;");
		if(_lights)
		for(i=0;i<_lights.length;i++)
		{
			var l=_lights[i];
			var dirName;
            var kstr="k*";
            switch(l.light.type)
            {
                case 0:ft.push("lightDir = normalize( wPosition.xyz-"+l.orgname+");");dirName="lightDir";break;
                case 1:dirName=l.dirname;break;
                case 2:
                        ft.push("lightDir = normalize( wPosition.xyz-"+l.orgname+");");
			            ft.push("angle= smoothstep("+l.spotname+"[1],"+l.spotname+"[0],dot( lightDir,"+l.dirname+"));");
                        kstr="k*angle*";
                        dirName="lightDir";
                       break;
            }
					
			if(bSpecular)
			{
			ft.push("reflDir = reflect(-"+dirName+", normal);");
			ft.push("specA=dot(reflDir, eyeDirection);");
			ft.push("k= pow(max(specA, 0.0), mtlPhong);");
			if(i)   ft.push("specular+=");else ft.push("specular=");
			ft.push(kstr+l.colorname+";");
			}
			if(bDiffuse)
			{
			ft.push("k = max(dot(normal, -"+dirName+"), 0.0);");
			if(i)   ft.push("diffuse+=");else ft.push("diffuse=");
			ft.push(kstr+l.colorname+";");
			}
		}
	}
	ft.push("vec3 color= vec3(0.0,0.0,0.0);\r\n");

	if(this.flags&4)
	{
		if(bDiffuse && (!(this.flags&64)))ft.push("diffuse=diffuse*vC;");
		else
		{
			ft.push("color+=vC;");
			bEmissive=false;
		}
	}
	if(this.flags&64)ft.push("color+=vCE;");
	if(bDiffuse)
		this.handleChannel(gl,mtl.diffuse,"diffuse",ft);
	
	if(bSpecular)
		this.handleChannel(gl,mtl.specular,"specular",ft);
	if(bLightMap)
    {
        var aoText=this.handleChannel_(gl,mtl.lightmap,ft);
        if(aoText)ft.push("color*="+aoText+";");
    }

	if(bEmissive)
        this.handleChannel(gl,mtl.emissive,null,ft);    
    var alpha="1.0";

	if(bOpacity)
	{
		var n;
        if(this.flags&1024)this.addVar("opacity",4106);
        if(mtl.opacity){
            n=this.handleAlphaChannel(gl,mtl.opacity,ft);
            if(this.flags&1024){ft.push("float _opacity=opacity*"+n+";");n="_opacity";}
        }else n="opacity";

        if(bReflection)
        {
            var text2=this.handleChannel_(gl,mtl.reflection,ft);
            ft.push("vec3 _refColor="+text2+";");
            ft.push("float _refA=(_refColor.x+_refColor.y+_refColor.z)/3.0;");
            ft.push("_refA=1.0-(1.0-_refA)*(1.0-"+n+");");
            n="_refA";
            ft.push("color+=_refColor;");
        }else   ft.push("if("+n+"<0.004)discard;");
		ft.push("gl_FragColor = vec4(color,"+n+");");
		
	}else {
        if(bReflection)this.handleChannel(gl,mtl.reflection,null,ft);
		ft.push("gl_FragColor = vec4(color,1.0);");
    }
	ft.push("}");

	this.vShader = this.compile(gl, vt,gl.VERTEX_SHADER);
	this.fShader = this.compile(gl,ft,gl.FRAGMENT_SHADER);

	var shPrg = gl.createProgram();
	this.program=shPrg;

	gl.attachShader(shPrg, this.vShader);
	gl.attachShader(shPrg, this.fShader);
	gl.linkProgram(shPrg);

	if (!gl.getProgramParameter(shPrg, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(shPrg);

	// addAttr after useProgram
	this.addAttr(4300,"inV",gl);
	if(bNormals)this.addAttr(4301,"inN",gl);
	if(bUV&1)this.addAttr(4302,"inUV0",gl);
    if(bUV&2)this.addAttr(4306,"inUV1",gl);    
	if(bBump){this.addAttr(4303,"inBN",gl);this.addAttr(4304,"inBT",gl);}
	

	if(this.flags&4)this.addAttr(4305,"inC",gl);
	if(this.flags&64)this.addAttr(4307,"inCE",gl);
    
	for(i=0;i<this.textures.length;i++)
	{
		var t=this.textures[i];
		if(t.txt.ivready)
		{
			t.uniform=gl.getUniformLocation(shPrg, "txtUnit"+t.slot);
		}
	}
	for(i=0;i<this.vars.length;i++)
	{
		var v=this.vars[i];
        var name=null;
		switch(v.id)
		{
		case "tm":name= "ch"+v.channel._id+"tm";break;
		case "color":name= "ch"+v.channel._id+"clr";break;
		case "amount":name= "ch"+v.channel._id+"amount";break;
        case "lightSpot":
		case "lightColor":
		case "lightDir":
		case "lightOrg":name= v.name;break;
		default:name= v.id;
		}
        v.slot=gl.getUniformLocation(shPrg, name);
        if(!v.slot)
            console.log("Slot '"+name+"' not found");
	}
	this.bValid=true;
	return true;
}

iv.shader.prototype.detach = function(gl)
{
	if(this.program!==null)
	{
		gl.detachShader(this.program,this.vShader);
		gl.detachShader(this.program,this.fShader);
		gl.deleteProgram(this.program);
		gl.deleteShader(this.vShader);
		gl.deleteShader(this.fShader);
		this.program=null;
		this.fShader=null;
		this.vShader=null;
	}
	this.attrs=[];
	this.vars=[]; 
	this.textures=[];
	this.loadedtextures=0;
}

// newObj means that we only updating shader
iv.shader.prototype.activate = function(space,info,flags,newObj)
{
    var mtl=this.mtl;
	var gl=mtl.gl,i;
	if(!newObj){
	gl.useProgram(this.program);
	for(i=0;i<this.textures.length;i++)
		{
			var t=this.textures[i];
			if(t.txt.ivready)
			{
				gl.activeTexture(gl.TEXTURE0+t.slot);
				var type=t.txt.ivtype;
				gl.bindTexture(type, t.txt);
				if(type==gl.TEXTURE_2D && space.e_ans && (t.txt.filter==iv.FILTER_MIPMAP) )
					gl.texParameterf(type, space.e_ans.TEXTURE_MAX_ANISOTROPY_EXT, space.e_ansMax);
				gl.texParameteri(type, gl.TEXTURE_WRAP_S, t.wrapS);//gl.REPEAT
				gl.texParameteri(type, gl.TEXTURE_WRAP_T, t.wrapT);
				gl.uniform1i(t.uniform,t.slot);
			}
		}
	}
    var _i=this.vars;
	for(i=0;i<_i.length;i++)
	{
		var a=_i[i],s=a.slot;
		switch(a.ord)
		{
			case 4101:gl.uniformMatrix4fv(s, false, info.tm);break;
			case 4102: {
				var c=a.channel.color;
				if(flags&256) c=vec3.lerp_r(c,space.clrSelection,0.5);
				gl.uniform3fv(s,c);
			} break;
			case 4103:gl.uniformMatrix3fv(s,false,a.channel.tm);break;
			case 4104:gl.uniform1f(s,a.channel.amount);break;
			case 4105:gl.uniform1f(s,-0.02);break;// positive - move backward
            case 4106:gl.uniform1f(s,info.opacity);break;

			default:
			if(!newObj)// update this only for fully new shader
			{
				switch(a.ord)
				{	
					case 4110:gl.uniform3fv(s,a.light.color);break;
					case 4111:gl.uniform3fv(s,a.light.org);break;
					case 4112:gl.uniform3fv(s,a.light.dir);break;
					case 4113:gl.uniform3fv(s,space.window.view.from);break;
					case 4114:gl.uniformMatrix4fv(s,false,space.modelviewTM);break;
					case 4115:gl.uniformMatrix4fv(s,false,space.projectionTM);break;
					case 4116:gl.uniform1f(s,mtl.phong);break;
                    case 4117:gl.uniform3fv(s,a.light.spot);break;

				}
			}
		}
	}
}


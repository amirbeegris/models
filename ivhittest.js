

iv.boxTriTest=function (_min,_max,org,d,t,x)
{
	var _min_x=_min[x];
	org=org[x];
	d=d[x];
	if(d)
	{
		var t1=(_min_x-org)/d,t2=(_max[x]-org)/d;
		if(t1<t2)t.push(t1,t2);else t.push(t2,t1);
	}else { if((org<_min_x) || (org>_max[x]))return false;}
	return true;
};

iv.hitBBox=function (_min,_max,org,dir)
{
	var t=[],i;
    for(i=0;i<3;i++){if(!iv.boxTriTest(_min,_max,org,dir,t,i))return null;}
    if(!t.length)return null;
	var maxnear=t[0],minfar=t[1];
	for(i=2;i<t.length;i+=2)
	{
        var a=t[i];
		if(a>maxnear)maxnear=a;
        a=t[i+1];
		if(a<minfar)minfar=a;
	}
	if(maxnear>minfar)return null;	
    var p=vec3.scale_r(dir,maxnear);
	vec3.add_ip(p,org);
	return p;
}


iv.hitTriangle=function(loc,side1,side2,org,dir,info)
{
	var vd,t,u,v;
	var s1_0=side1[0]-loc[0],s1_1=side1[1]-loc[1],s1_2=side1[2]-loc[2];
	var s2_0=side2[0]-loc[0],s2_1=side2[1]-loc[1],s2_2=side2[2]-loc[2];
	var dirX=dir[0],dirY=dir[1],dirZ=dir[2];
	var orgX=org[0],orgY=org[1],orgZ=org[2];
	var nX=s1_1*s2_2-s1_2*s2_1,nY=s1_2*s2_0-s1_0*s2_2,nZ=s1_0*s2_1-s1_1*s2_0;
	var d=Math.sqrt(nX*nX+nY*nY+nZ*nZ);
	if(!d)return false;
	nX/=d;nY/=d;nZ/=d;

	vd=nX*dirX+nY*dirY+nZ*dirZ;

	if(1)
	{
		if(vd==0.0)return false;
	}else{
		if(vd>=0.0)return false;
	}
	t=((loc[0]-orgX)*nX+(loc[1]-orgY)*nY+(loc[2]-orgZ)*nZ)/vd;
	if(t<1e-6)return false;
	
    // Precalcualte
	var s11=s1_0*s1_0+s1_1*s1_1+s1_2*s1_2;//vec3.dot(side1,side1);
	var s12= s1_0*s2_0+s1_1*s2_1+s1_2*s2_2;//vec3.dot(side1,side2);
	var s22=s2_0*s2_0+s2_1*s2_1+s2_2*s2_2;//vec3.dot(side2,side2);
	d=s11*s22-s12*s12;
	if(d<=1e-34)
		return false;

	var kuX=(s1_0*s22-s2_0*s12)/d,kuY=(s1_1*s22-s2_1*s12)/d,kuZ=(s1_2*s22-s2_2*s12)/d;
	var u0=-(loc[0]*kuX+loc[1]*kuY+loc[2]*kuZ);
	var pX=dirX*t+orgX,pY=dirY*t+orgY,pZ=dirZ*t+orgZ;
	u=u0+ pX*kuX+pY*kuY+pZ*kuZ;

	if((u<=0.0)||(u>=1.0))return false;
	var kvX=(s2_0*s11-s1_0*s12)/d,kvY=(s2_1*s11-s1_1*s12)/d,kvZ=(s2_2*s11-s1_2*s12)/d;
	var v0=-(loc[0]*kvX+loc[1]*kvY+loc[2]*kvZ);
	v=v0+pX*kvX+pY*kvY+pZ*kvZ;
	if(!((v>0.0)&&(u+v<1.0)))
		return false;
	
	if(t<info.lLength)
	{
	info.lHit=[pX,pY,pZ];
	info.lLength=t;
	return true;
	}
	return false;
}


iv.hitTestNode=function (node,tm,info)
{
	if(node.state&64)return 0;
	return node.hitTest(tm,info);
}

iv.getRayPoint=function(ray,i,p)
{
	if(i)i=3;
    if(!p)p=[];
    p[0]=ray[i];p[1]=ray[i+1];p[2]=ray[i+2];
	return p;
}

iv.node.prototype.hitTest = function(tm,info)
{
    var obj=this.object;
	if(obj && obj.preHitTest(tm,info))
	{
			if(obj.hitTest(tm,info,info.org,info.dir))
                info.nodes.push({node:this,length:info.length,pnt:info.pnt,lpnt:info.lHit,normal:info.normal,top:(this.stage==7)});
	}
    return 1;
}

iv.mesh.prototype.preHitTest=function(tm,i)
{
	if(this.boxMin && this.boxMax)
	{
		var itm=mat4.invert(i.itm, tm);
		i.org=mat4.mulPoint(itm,iv.getRayPoint(i.ray,0,i.org)),i.dir=mat4.mulPoint(itm,iv.getRayPoint(i.ray,1,i.dir));
		vec3.sub_ip(i.dir,i.org);
		vec3.normalize(i.dir);
		return iv.hitBBox(this.boxMin,this.boxMax,i.org,i.dir);
    }
    return null;
}

iv.mesh.prototype.hitTest=function(tm,info,org,dir) {
    var f=this.faces;
    var p=this.points;
    var bOk=false;
    if(f&&p) {
        {   
            var index=0;
            info.lLength=1e34;
            if(this.lineMode) { var j=0;/*$todo$*/ } else {
                var nt=f.length/3;
                var v0=[0,0,0],v1=[0,0,0],v2=[0,0,0];
                for(var i=0;i<nt;i++) {
                    var vi=f[index++]*3;
                    v0[0]=p[vi]; v0[1]=p[vi+1]; v0[2]=p[vi+2];
                    vi=f[index++]*3;
                    v1[0]=p[vi]; v1[1]=p[vi+1]; v1[2]=p[vi+2];
                    vi=f[index++]*3;
                    v2[0]=p[vi]; v2[1]=p[vi+1]; v2[2]=p[vi+2];
                    bOk|=iv.hitTriangle(v0,v1,v2,org,dir,info);
                }
            }
            if(bOk) {
                var hp=mat4.mulPoint(tm,info.lHit,[]);
                
                var l=vec3.distance(hp,info.ray);                
                info.length=l;
                info.pnt=hp;
                return true;   
                
            }
        }
    }
    return false;
}

iv.window.prototype.hitTestXY=function(x,y){return this.hitTest(this.getRay(x,y));}
iv.window.prototype.hitTest=function(ray) {
    if(this.space&&this.space.root) {
        var v=this;
        var h={ space: this.space,ray: ray,nodes: [],getWindow: function() { return v; } ,itm:[]},tm=[],i;
        mat4.identity(tm);        
        this.space.root.traverse(tm,iv.hitTestNode,h);
        if(h.nodes.length) {
            h.nodes.sort(function(a,b) {
                if(a.top!=b.top) { return (a.top)?-1:1; }
                return (a.length<b.length)?-1:1;
            });
            for(i=0;i<h.nodes.length;i++) {
                var hi=h.nodes[i];
                var n=hi.node0=hi.node;
                while(n)// handle closed nodes
                {
                    if(n.state&8)hi.node=n;
                    n=n.parent;
                }
            }
            var hi=h.nodes[0];
            h.node=hi.node;
            h.pnt=hi.pnt;
            h.length=hi.length;
            //h.normal=hi.normal;
            h.space=null;
            h.ray=null;
            return h;
        }
    }
    return null;
}

iv.node.prototype.select = function(n,s,k)
{
	var b=false;
	if(n==this)
	{
		b|=this.setState(s?4:0,4);
	}else
	if(!k)b|=this.setState(0,4);
	var c=this.firstChild;
	while(c)
	{
		b|=c.select(n,s,k);
		c=c.next;
	}
	return b;
}

iv.node.prototype.getSelection = function(a)
{
    if(this.state&4){if(!a)a=[];a.push(this);}
    var c=this.firstChild;
    while(c)
    {
        a=c.getSelection(a);c=c.next;
    }
    return a;
}
iv.space.prototype.select = function(n,s,k)
{
    var r=this.root,old=r.getSelection(null);
    if(r.select(n,s,k))this.invalidate();
    var i={old:old,current:r.getSelection(null),node:n};
    if(n) { if(s)this.selNode=n; }
    else this.selNode=null;
    this.window.notify("selection",i);
    return false;
}


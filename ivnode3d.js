/*
	node state
	1 - visible thsi
	2 - visible children
	4 - selection
	8 - closed
	16 - no z write
	32 - double sided - force double sided on/off - used in traverse only.
	64 - no hit testing
    128 - hide in tree view
    0xff00 - render moder
*/

iv.node=function ()
{
	this.object=null;
	this.tm=null;
	this.name="";
	this.material=null;
	this.state=3;
	this.ref=0;
}

iv.node.prototype.addRef = function(){this.ref++;}
iv.node.prototype.release = function()
{
	this.ref--;
	if(this.ref<1)this.clear();
}
iv.node.prototype.newNode = function(){return this.insert(new iv.node());}
iv.node.prototype.insert = function(n)
{	n.ref++;
	if(this.lastChild)this.lastChild.next=n;
	else
		this.firstChild=n;
	this.lastChild=n;
	n.parent=this;
	return n;
}
iv.node.prototype.clear = function()
{
	while(this.firstChild)this.remove(this.firstChild);
	this.setObject(null);
}
iv.node.prototype.remove = function(n)
{
	if(n.parent!=this)return false;
	var _n=null;
	if(this.firstChild==n)
	{
		this.firstChild=n.next;
	}else
	{
		_n=this.firstChild;
		while(_n)
		{
			if(_n.next==n)
			{
				_n.next=n.next;
				break;
			}
			_n=_n.next;
		}
	}
	if(this.lastChild==n)
			this.lastChild=_n;
	n.parent=null;
	n.next=null;
	n.release();
	return true;
}

iv.node.prototype.setState = function(s,mask)
{
	var _state=this.state& (~mask)| mask&s;
	if(_state!=this.state)
	{
		this.state=_state;
		return true;
	}
	return false;
}

iv.node.prototype.traverse = function(ptm,proc,param,astate,opacity) {
    var v=this.state;
    astate|=(v&4);//selection
    if(v&0xff00){astate&=~0xff00;astate|=v&0xff00;}//render mode    
    if(!(v&3))return;
    if(this.cull)
    {
        if(this.cull===1)astate|=32;
        else astate&=~32;
    }	
    if(this.tm)
    {
        if(ptm){
            if(!this.wtm )this.wtm=mat4.create();           
            ptm=mat4.m(this.tm,ptm,this.wtm);
        }else ptm=this.tm;
    };
    if(this.opacity!==undefined && opacity!==undefined)opacity*=this.opacity;

    if(v&1 && (!proc(this,ptm,param,astate,opacity)))return;

    if(v&2){
        var child=this.firstChild;
        while(child)
        {
            child.traverse(ptm,proc,param,astate,opacity);
            child=child.next;
        }
    }
};

iv.node.prototype.setObject = function(obj)
{
	if(this.object!=obj)
	{
		if(this.object)this.object.release();
		this.object=obj;
		if(obj)obj.ref++;
	}
}
iv.node.prototype.load = function(d,info)
{
var i,j,a,v;
    for(v in d)
    {
        a=d[v];
        switch(v)
        {
         case 'light':this.setObject(new iv.light(a));break;
         case 'camera':this.setObject(new iv.camera(a));break;
  
         case 'object':this.setObject(info.objects[a]);break;
         case 'mtl':a=info.materials[a];if(a){this.material=a;if(a.bump && this.object)this.object.bump=true;}break;// generate bump tangents
  
        case 's':this.state=a;break;
        case 'tm':
         		this.tm=mat4.create();
		        mat4.identity(this.tm);
		        var index=0; 
		        for(i=0;i<4;i++)
		        {
			        for(j=0;j<3;j++)
			        {
				        this.tm[i*4+j]= d.tm[index];
				        index++;
			        }
		        }
            break;
        case 'i':for(i=0;i<a.length;i++)this.newNode().load(a[i],info);break;
         default:this[v]=a;
        }    
    }
}

iv.nodeRender=function(node,tm,space,state,opacity){
    if(node.object)node.object.preRender(node,tm,space,state,opacity);
	return true;
};

iv.node.prototype.enableTM = function()
{
if(!this.tm)this.tm=mat4.identity(mat4.create());
return this.tm;
}

iv.node.prototype.getWTM=function(){
	var tm=null;
	var n=this;
	while(n)
	{
		if(n.tm)
		{
			if(tm)
			{
				mat4.m(tm,n.tm);
			}else tm=mat4.create(n.tm);
		}
		n=n.parent;
	}
	return tm;
};


iv.node.prototype.searchId = function(id)
{
  if(this.id==id)return this;
  var n=this.firstChild;
  while(n)
  {
    var _n=n.searchId(id);
    if(_n)return _n;
    n=n.next;
  }
  return null;
}

;var ZIP={MASK_BITS:[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],cplens:[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],cplext:[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,99,99],cpdist:[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],cpdext:[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],b:[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],inflateBin:function(c,b){var a=new zip(c);return a.inflateBin(b)},inflateStr:function(c,b){var a=new zip(c);return a.inflateStr(b)}};function zip(a){this.WSIZE=32768;this.LBITS=9;this.DBITS=6;this.slide=new Array(2*this.WSIZE);this.wp=0;this.bitBuf=0;this.bitLen=0;this.method=-1;this.eof=false;this.copyLen=this.zip_copy_dist=0;this.tl=null;this.pos=0;this.src=a;this.STORED_BLOCK=0;this.fixedTL=null}function zip_HuftList(){this.next=null;this.list=null}function zip_HuftNode(){this.e=0;this.b=0;this.n=0;this.t=null}function zip_HuftBuild(P,L,D,R,S,X){this.BMAX=16;this.N_MAX=288;this.status=0;this.root=null;this.m=0;var O;var Q=new Array(this.BMAX+1);var V;var T;var U;var H;var I;var J;var K;var A=new Array(this.BMAX+1);var N;var W;var B;var C=new zip_HuftNode();var E=new Array(this.BMAX);var F=new Array(this.N_MAX);var G;var l=new Array(this.BMAX+1);var Y;var m;var t;var M;var Z;Z=this.root=null;for(I=0;I<Q.length;I++){Q[I]=0}for(I=0;I<A.length;I++){A[I]=0}for(I=0;I<E.length;I++){E[I]=null}for(I=0;I<F.length;I++){F[I]=0}for(I=0;I<l.length;I++){l[I]=0}V=L>256?P[256]:this.BMAX;N=P;W=0;I=L;do{Q[N[W]]++;W++}while(--I>0);if(Q[0]==L){this.root=null;this.m=0;this.status=0;return}for(J=1;J<=this.BMAX;J++){if(Q[J]!=0){break}}K=J;if(X<J){X=J}for(I=this.BMAX;I!=0;I--){if(Q[I]!=0){break}}U=I;if(X>I){X=I}for(m=1<<J;J<I;J++,m<<=1){if((m-=Q[J])<0){this.status=2;this.m=X;return}}if((m-=Q[I])<0){this.status=2;this.m=X;return}Q[I]+=m;l[1]=J=0;N=Q;W=1;Y=2;while(--I>0){l[Y++]=(J+=N[W++])}N=P;W=0;I=0;do{if((J=N[W++])!=0){F[l[J]++]=I}}while(++I<L);L=l[U];l[0]=I=0;N=F;W=0;H=-1;G=A[0]=0;B=null;t=0;for(;K<=U;K++){O=Q[K];while(O-->0){while(K>G+A[1+H]){G+=A[1+H];H++;t=(t=U-G)>X?X:t;if((T=1<<(J=K-G))>O+1){T-=O+1;Y=K;while(++J<t){if((T<<=1)<=Q[++Y]){break}T-=Q[Y]}}if(G+J>V&&G<V){J=V-G}t=1<<J;A[1+H]=J;B=new Array(t);for(M=0;M<t;M++){B[M]=new zip_HuftNode()}if(Z==null){Z=this.root=new zip_HuftList()}else{Z=Z.next=new zip_HuftList()}Z.next=null;Z.list=B;E[H]=B;if(H>0){l[H]=I;C.b=A[H];C.e=16+J;C.t=B;J=(I&((1<<G)-1))>>(G-A[H]);E[H-1][J].e=C.e;E[H-1][J].b=C.b;E[H-1][J].n=C.n;E[H-1][J].t=C.t}}C.b=K-G;if(W>=L){C.e=99}else{if(N[W]<D){C.e=(N[W]<256?16:15);C.n=N[W++]}else{C.e=S[N[W]-D];C.n=R[N[W++]-D]}}T=1<<(K-G);for(J=I>>G;J<t;J+=T){B[J].e=C.e;B[J].b=C.b;B[J].n=C.n;B[J].t=C.t}for(J=1<<(K-1);(I&J)!=0;J>>=1){I^=J}I^=J;while((I&((1<<G)-1))!=l[H]){G-=A[H];H--}}}this.m=A[1];this.status=((m!=0&&U!=1)?1:0)}zip.prototype.getByte=function(){var a=this.src.byteLength;if(a==this.pos){return -1}return this.src.getUint8(this.pos++)};zip.prototype.needBits=function(a){while(this.bitLen<a){this.bitBuf|=this.getByte()<<this.bitLen;this.bitLen+=8}};zip.prototype.getBits=function(a){return this.bitBuf&ZIP.MASK_BITS[a]};zip.prototype.dumpBits=function(a){this.bitBuf>>=a;this.bitLen-=a};zip.prototype.inflateCodes=function(b,c,a){var g;var d;var f;if(a==0){return 0}f=0;for(;;){this.needBits(this.zip_bl);d=this.tl.list[this.getBits(this.zip_bl)];g=d.e;while(g>16){if(g==99){return -1}this.dumpBits(d.b);g-=16;this.needBits(g);d=d.t[this.getBits(g)];g=d.e}this.dumpBits(d.b);if(g==16){this.wp&=this.WSIZE-1;b[c+f++]=this.slide[this.wp++]=d.n;if(f==a){return a}continue}if(g==15){break}this.needBits(g);this.copyLen=d.n+this.getBits(g);this.dumpBits(g);this.needBits(this.zip_bd);d=this.zip_td.list[this.getBits(this.zip_bd)];g=d.e;while(g>16){if(g==99){return -1}this.dumpBits(d.b);g-=16;this.needBits(g);d=d.t[this.getBits(g)];g=d.e}this.dumpBits(d.b);this.needBits(g);this.zip_copy_dist=this.wp-d.n-this.getBits(g);this.dumpBits(g);while(this.copyLen>0&&f<a){this.copyLen--;this.zip_copy_dist&=this.WSIZE-1;this.wp&=this.WSIZE-1;b[c+f++]=this.slide[this.wp++]=this.slide[this.zip_copy_dist++]}if(f==a){return a}}this.method=-1;return f};zip.prototype.inflateStored=function(b,a,c){var d;d=this.bitLen&7;this.dumpBits(d);this.needBits(16);d=this.getBits(16);this.dumpBits(16);this.needBits(16);if(d!=((~this.bitBuf)&65535)){return -1}this.dumpBits(16);this.copyLen=d;d=0;while(this.copyLen>0&&d<c){this.copyLen--;this.wp&=this.WSIZE-1;this.needBits(8);b[a+d++]=this.slide[this.wp++]=this.getBits(8);this.dumpBits(8)}if(this.copyLen==0){this.method=-1}return d};zip.prototype.inflateFixed=function(b,c,a){if(this.fixedTL==null){var f;var d=new Array(288);var e;for(f=0;f<144;f++){d[f]=8}for(;f<256;f++){d[f]=9}for(;f<280;f++){d[f]=7}for(;f<288;f++){d[f]=8}this.zip_fixed_bl=7;e=new zip_HuftBuild(d,288,257,ZIP.cplens,ZIP.cplext,this.zip_fixed_bl);if(e.status!=0){alert("HufBuild error: "+e.status);return -1}this.fixedTL=e.root;this.zip_fixed_bl=e.m;for(f=0;f<30;f++){d[f]=5}this.zip_fixed_bd=5;e=new zip_HuftBuild(d,30,0,ZIP.cpdist,ZIP.cpdext,this.zip_fixed_bd);if(e.status>1){this.fixedTL=null;alert("HufBuild error: "+e.status);return -1}this.zip_fixed_td=e.root;this.zip_fixed_bd=e.m}this.tl=this.fixedTL;this.zip_td=this.zip_fixed_td;this.zip_bl=this.zip_fixed_bl;this.zip_bd=this.zip_fixed_bd;return this.inflateCodes(b,c,a)};zip.prototype.inflateDynamic=function(p,m,a){var f;var g;var k;var o;var d;var c;var r;var q;var b=new Array(286+30);var e;for(f=0;f<b.length;f++){b[f]=0}this.needBits(5);r=257+this.getBits(5);this.dumpBits(5);this.needBits(5);q=1+this.getBits(5);this.dumpBits(5);this.needBits(4);c=4+this.getBits(4);this.dumpBits(4);if(r>286||q>30){return -1}for(g=0;g<c;g++){this.needBits(3);b[ZIP.b[g]]=this.getBits(3);this.dumpBits(3)}for(;g<19;g++){b[ZIP.b[g]]=0}this.zip_bl=7;e=new zip_HuftBuild(b,19,19,null,null,this.zip_bl);if(e.status!=0){return -1}this.tl=e.root;this.zip_bl=e.m;o=r+q;f=k=0;while(f<o){this.needBits(this.zip_bl);d=this.tl.list[this.getBits(this.zip_bl)];g=d.b;this.dumpBits(g);g=d.n;if(g<16){b[f++]=k=g}else{if(g==16){this.needBits(2);g=3+this.getBits(2);this.dumpBits(2);if(f+g>o){return -1}while(g-->0){b[f++]=k}}else{if(g==17){this.needBits(3);g=3+this.getBits(3);this.dumpBits(3);if(f+g>o){return -1}while(g-->0){b[f++]=0}k=0}else{this.needBits(7);g=11+this.getBits(7);this.dumpBits(7);if(f+g>o){return -1}while(g-->0){b[f++]=0}k=0}}}}this.zip_bl=this.LBITS;e=new zip_HuftBuild(b,r,257,ZIP.cplens,ZIP.cplext,this.zip_bl);if(this.zip_bl==0){e.status=1}if(e.status!=0){if(e.status==1){}return -1}this.tl=e.root;this.zip_bl=e.m;for(f=0;f<q;f++){b[f]=b[f+r]}this.zip_bd=this.DBITS;e=new zip_HuftBuild(b,q,0,ZIP.cpdist,ZIP.cpdext,this.zip_bd);this.zip_td=e.root;this.zip_bd=e.m;if(this.zip_bd==0&&r>257){return -1}if(e.status==1){}if(e.status!=0){return -1}return this.inflateCodes(p,m,a)};zip.prototype.inflateInternal=function(c,a,d){var e,b;e=0;while(e<d){if(this.eof&&this.method==-1){return e}if(this.copyLen>0){if(this.method!=this.STORED_BLOCK){while(this.copyLen>0&&e<d){this.copyLen--;this.zip_copy_dist&=this.WSIZE-1;this.wp&=this.WSIZE-1;c[a+e++]=this.slide[this.wp++]=this.slide[this.zip_copy_dist++]}}else{while(this.copyLen>0&&e<d){this.copyLen--;this.wp&=this.WSIZE-1;this.needBits(8);c[a+e++]=this.slide[this.wp++]=this.getBits(8);this.dumpBits(8)}if(this.copyLen==0){this.method=-1}}if(e==d){return e}}if(this.method==-1){if(this.eof){break}this.needBits(1);if(this.getBits(1)!=0){this.eof=true}this.dumpBits(1);this.needBits(2);this.method=this.getBits(2);this.dumpBits(2);this.tl=null;this.copyLen=0}switch(this.method){case 0:b=this.inflateStored(c,a+e,d-e);break;case 1:if(this.tl!=null){b=this.inflateCodes(c,a+e,d-e)}else{b=this.inflateFixed(c,a+e,d-e)}break;case 2:if(this.tl!=null){b=this.inflateCodes(c,a+e,d-e)}else{b=this.inflateDynamic(c,a+e,d-e)}break;default:b=-1;break}if(b==-1){if(this.eof){return 0}return -1}e+=b}return e};zip.prototype.inflateStr=function(c){var k,e;var m=-1;var d=new Array(1024);var f="";var l=0,h=0;while((k=this.inflateInternal(d,0,d.length))>0&&m!=this.pos){m=this.pos;for(e=0;e<k;e++){var g=d[e];if(l){l--;h|=(g&63)<<(l*6);if(!l){f+=String.fromCharCode(h)}}else{if(g<128){f+=String.fromCharCode(g)}else{if(g<224){l=1;h=(g&65567)<<6}else{if(g<240){l=2;h=(g&65567)<<12}else{if(g<248){l=3;h=(g&65543)<<18}else{if(g<252){l=4;h=(g&65543)<<18}else{if(g<254){l=5;h=(g&65537)<<30}else{f+=String.fromCharCode(g)}}}}}}}}}return f};zip.prototype.inflateBin=function(a){var b,c=0;var f=-1;var d=new ArrayBuffer(a);var e=new Uint8Array(d);while((b=this.inflateInternal(e,c=0,e.length))>0&&f!=this.pos){f=this.pos;c+=b}return d};
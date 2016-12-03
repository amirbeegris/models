var iv={
INV_MTLS:2,
INV_VERSION:4,

VIEW_TRANSITION:1,
VIEW_UNDO:2,
VIEW_INVALIDATE:4,

VIEW_ANIM_SET:8,
VIEW_ANIM_PLAY:16,


R_SELECTION:4,
R_Z_NOWRITE:16,
R_Z_OFFSET:0x30000,
R_CLIP:    0xc0000,// number of clip planes

FILTER_LINEAR:1,
FILTER_MIPMAP:2,
FILTER_BOX:3,

createRequest:function (f,p){
	if(f==undefined)return null;
	var r = new XMLHttpRequest();
	r.open("GET", p?(p+f):f);
	return r;
},
anim:{},
indexOf:function (a,b)
{
	var c=a.length;
	for(var i=0;i<c;i++){if(a[i]==b)return i;}
	return -1;
},
any:function(a,b){return (a==undefined)?b:a;}
};


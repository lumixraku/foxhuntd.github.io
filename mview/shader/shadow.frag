precision highp float;
varying vec2 zw;
#ifdef ALPHA_TEST
varying mediump vec2 vUv;
uniform sampler2D tAlbedo;
#endif
vec3 encode(float floatValue)
{
	vec4 encode=vec4(1.0,255.0,65025.0,16581375.0)*floatValue;
	encode=fract(encode);
	encode.xyz-=encode.yzw*(1.0/255.0);
	return encode.xyz;
}

void main(void){
	#ifdef ALPHA_TEST
	float alpha=texture2D(tAlbedo,vUv).a;
	if(alpha<0.5)
	{
		discard;
	}
	#endif

	gl_FragColor.xyz=encode((zw.x/zw.y)*0.5+0.5);
	gl_FragColor.w=0.0;
}

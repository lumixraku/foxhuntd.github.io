precision highp float;
attribute vec3 vPosition;
attribute vec2 vTexCoord;
uniform mat4 uViewProjection;
varying vec2 zw;
#ifdef ALPHA_TEST
varying mediump vec2 vUv;
#endif

vec4 mul(mat4 m,vec3 v)
{
	return m[0]*v.x+m[1]*v.y+m[2]*v.z+m[3];
}

void main(void)
{
	gl_Position=mul(uViewProjection,vPosition);
	zw=gl_Position.zw;

	#ifdef ALPHA_TEST
	vUv=vTexCoord;
	#endif
}

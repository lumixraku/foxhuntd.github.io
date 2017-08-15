precision highp float;
uniform mat4 uInverseSkyMatrix;
uniform mat4 uViewProjection;
attribute vec3 vPosition;
attribute vec2 vTexCoord;
#if SKYMODE == 3
varying vec3 vPos;
#else
varying vec2 vUv;
#endif

vec4 mul(mat4 m,vec3 v)
{
	return m[0]*v.x+m[1]*v.y+m[2]*v.z+m[3];
}

vec4 mul3(mat4 m,vec3 v)
{
	return m[0]*v.x+m[1]*v.y+m[2]*v.z;
}

void main(void)
{
	vec3 p=mul(uInverseSkyMatrix,vPosition).xyz;
	gl_Position=mul3(uViewProjection,p);
	gl_Position.z-=(1.0/65535.0)*gl_Position.w;

	#if SKYMODE == 3
		vPos = vPosition;
		vPos.xy += 1e-20*vTexCoord;
	#else
		vUv = vTexCoord;
	#endif
}

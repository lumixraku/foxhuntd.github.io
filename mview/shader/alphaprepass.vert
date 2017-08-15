precision highp float;
uniform mat4 uModelViewProjectionMatrix;
attribute vec3 vPosition;
attribute vec2 vTexCoord;
varying mediump vec2 vUv;

vec4 mul(mat4 m,vec3 v)
{
	return m[0]*v.x+m[1]*v.y+m[2]*v.z+m[3];
}

void main(void)
{
	gl_Position=mul(uModelViewProjectionMatrix,vPosition.xyz);
	vUv=vTexCoord;
}

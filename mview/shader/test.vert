precision highp float;
uniform mat4 uModelViewProjectionMatrix;
attribute vec3 vPosition;
attribute vec3 vTexCoord;

varying mediump vec2 vUv;


void main(void)
{
	gl_Position = dot(uModelViewProjectionMatrix,vec4(vPosition,0.));
	gl_Position.z+=-0.00005*gl_Position.w;
}

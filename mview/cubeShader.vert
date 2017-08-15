attribute vec3 coordinate;
attribute vec2 uv;
uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;
varying vec2 vUv;
varying vec3 vPos;
void main(void) 
{
	gl_Position = mProj * mView * mWorld *vec4(coordinate, 1.0);
    vUv = uv;
	vPos = gl_Position.xyz;
}
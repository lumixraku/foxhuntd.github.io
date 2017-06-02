attribute vec3 coordinate;
attribute vec2 uv;
varying vec2 vUv;
void main(void) 
{
    vUv = uv;
	gl_Position = vec4(coordinate.zxy, 1.0);
}
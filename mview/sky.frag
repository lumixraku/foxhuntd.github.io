precision highp float;
uniform sampler2D tSkyTexture;
uniform float uAlpha;
varying vec2 vUv;
void main(void)
{
vec3 col=texture2D(tSkyTexture,vUv).xyz;
gl_FragColor.xyz=col*col;
gl_FragColor.w=uAlpha;
}
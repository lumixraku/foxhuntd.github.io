precision highp float;
uniform sampler2D tAlbedo;

varying mediump vec2 vUv;


void main(void)
{

	vec4 color = texture2D(tAlbedo,vUv);

	gl_FragColor=vec4(color);
}
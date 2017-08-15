precision mediump float;
#include <matdither.glsl>
uniform sampler2D tAlbedo;
varying mediump vec2 vUv;

void main()
{
	float albedo=texture2D(tAlbedo,vUv).a;
	if(albedo<=dither(vUv.x)){discard;}

	gl_FragColor=vec4(0.0);
}

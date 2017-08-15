precision mediump float;
uniform sampler2D tInput0;
uniform sampler2D tInput1;
uniform sampler2D tInput2;
#ifdef HIGHQ
uniform sampler2D tInput3;
#endif
uniform vec4 uSamplesValid;
varying highp vec2 vUv;

void main(void)
{
	vec4 input0=texture2D(tInput0,vUv);
	vec4 input1=texture2D(tInput1,vUv);
	vec4 input2=texture2D(tInput2,vUv);
	#ifdef HIGHQ
		vec4 input3=texture2D(tInput3,vUv);
		gl_FragColor=input0*uSamplesValid.x+input1*uSamplesValid.y+input2*uSamplesValid.z+input3*uSamplesValid.w;
	#else
		gl_FragColor=input0*uSamplesValid.x+input1*uSamplesValid.y+input2*uSamplesValid.z;
	#endif
}

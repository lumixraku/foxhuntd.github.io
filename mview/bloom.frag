precision mediump float;
uniform sampler2D tInput;
uniform vec4 uKernel[BLOOM_SAMPLES];
varying highp vec2 vUv;

void main(void)
{
	vec3 col=vec3(0.0,0.0,0.0);
	for(int i=0;i<BLOOM_SAMPLES;++i)
	{
		vec3 kernel=uKernel[i].xyz;
		col+=texture2D(tInput,vUv+kernel.xy).xyz*kernel.z;
	}
	gl_FragColor.xyz=col;
	gl_FragColor.w=0.0;
}

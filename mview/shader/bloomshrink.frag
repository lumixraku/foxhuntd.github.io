precision highp float;
uniform sampler2D tInput;
varying highp vec2 vUv;
void main(void)
{
	float epsilon=0.25/256.0;
	gl_FragColor=0.25*(
				texture2D(tInput,vUv+vec2(epsilon,epsilon))
	           +texture2D(tInput,vUv+vec2(epsilon,-epsilon))
	           +texture2D(tInput,vUv+vec2(-epsilon,epsilon))
	           +texture2D(tInput,vUv+vec2(-epsilon,-epsilon)));
}
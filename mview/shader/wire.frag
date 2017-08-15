precision highp float;
uniform vec4 uStripParams;

void main(void)
{
	vec2 uv=gl_FragCoord.xy*uStripParams.xy-vec2(1.0,1.0);
	uv.x+=0.25*uv.y;
	float alpha=uv.x<uStripParams.z?0.0:0.9;
	alpha=uv.x<uStripParams.w?alpha:0.0;
	gl_FragColor=vec4(0.0,0.0,0.0,alpha);
}
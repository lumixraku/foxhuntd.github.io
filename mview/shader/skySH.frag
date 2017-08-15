precision mediump float;
uniform vec4 uSkyCoefficients[9];
uniform float uAlpha;
varying vec3 vPos;

void main(void)
{
	vec3 dir = normalize(vPos);
	vec3 col = uSkyCoefficients[0].xyz;
	col += uSkyCoefficients[1].xyz*dir.y;
	col += uSkyCoefficients[2].xyz*dir.z;
	col += uSkyCoefficients[3].xyz*dir.x;
	vec3 dir2=dir.yyz*dir.xzx;
	col += uSkyCoefficients[4].xyz*dir2.x;
	col += uSkyCoefficients[5].xyz*dir2.y;
	col += uSkyCoefficients[7].xyz*dir2.z;
	vec3 dir3 = dir*dir;
	col += uSkyCoefficients[6].xyz*(3.0*dir3.z-1.0);
	col += uSkyCoefficients[8].xyz*(dir3.x-dir3.y);
	gl_FragColor.xyz = col;
	gl_FragColor.w = uAlpha;
}

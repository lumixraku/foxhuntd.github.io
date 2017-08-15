precision mediump float;
uniform sampler2D tInput;

#ifdef BLOOM
uniform sampler2D tBloom;
#endif

#ifdef GRAIN
uniform sampler2D tGrain;
#endif

#ifdef COLOR_LUT
uniform sampler2D tLUT;
#endif

uniform vec3 uScale;
uniform vec3 uBias;
uniform vec3 uSaturation;
uniform vec4 uSharpenKernel;
uniform vec3 uSharpness;
uniform vec3 uBloomColor;
uniform vec4 uVignetteAspect;
uniform vec4 uVignette;
uniform vec4 uGrainCoord;
uniform vec2 uGrainScaleBias;
varying vec2 vUv;

vec3 toneMap(vec3 col)
{
	vec3 sqrtc =sqrt(col);
	return(sqrtc -sqrtc *col)+col*(0.4672*col+vec3(0.5328));
}

void main(void)
{
	vec4 inputColor=texture2D(tInput,vUv);
	vec3 col=inputColor.xyz;

	#ifdef SHARPEN

	vec3
        samples	 = texture2D( tInput, vUv + uSharpenKernel.xy ).xyz;
        samples	+= texture2D( tInput, vUv - uSharpenKernel.xy ).xyz;
        samples	+= texture2D( tInput, vUv + uSharpenKernel.zw ).xyz;
        samples	+= texture2D( tInput, vUv - uSharpenKernel.zw ).xyz;
        
        vec3 delta = uSharpness.x*col.xyz - uSharpness.y*samples;
		col += clamp( delta, -uSharpness.z, uSharpness.z );

	#endif

	#ifdef BLOOM
		col+ = uBloomColor * texture2D( tBloom , vUv ).xyz;
	#endif

	#ifdef VIGNETTE
		vec2 vdist = vUv * uVignetteAspect.xy - uVignetteAspect.zw;
		vec3 vignette = clamp(vec3(1.0,1.0,1.0)-uVignette.xyz*dot(vdist,vdist),0.0,1.0);
		vec3 v3 = vignette*vignette*vignette;
		col *= mix( vignette , v3 , uVignette.w );
	#endif

	#ifdef SATURATION
		float gray = dot(col,vec3(0.3,0.59,0.11));
		col = mix(vec3(gray,gray,gray),col,uSaturation);
	#endif

	#ifdef CONTRAST
		col = col * uScale + uBias;
	#endif

	#ifdef GRAIN
		float grain = uGrainScaleBias.x * texture2D(tGrain,vUv*uGrainCoord.xy+uGrainCoord.zw).x+uGrainScaleBias.y;
		col+=col*grain;
	#endif

	#ifdef REINHARD
	{
		//Typical Reinhard tone mapping operator, applied to luminance.
		//I've bumped brightness a bit here so that the [0,1] range occupies
		//more space on the curve. -jdr
		col *= 1.8;
		float grayColor = dot(col,vec3(0.3333));
		col = clamp(col/(1.0+grayColor),0.0,1.0);
	}

	#elif defined(HEJL)
	{
		// Hejl / Burgess-Dawson tone mapping.
		// Thanks to John Hable and Chris Perrella for guidance.
		const highp float A=0.22,B=0.3,C=.1,D=0.2,E=.01,F=0.3;
		const highp float G=1.25;
		highp vec3 h = max(vec3(0.0),col-vec3(.004));
		col = (h*(A*h+C*B)+D*E)/(h*(A*h+B)+D*F)-E/F;
		col *=G;
	}
	#endif

	#ifdef COLOR_LUT
		col = clamp(col,0.0,1.0);
		col = (255.0/256.0)*col+vec3(0.5/256.0);
		col.x = texture2D(tLUT,col.xx).x;
		col.y = texture2D(tLUT,col.yy).y;
		col.z = texture2D(tLUT,col.zz).z;
		col*= col;
	#endif

	gl_FragColor.xyz=toneMap(col);
	gl_FragColor.w=inputColor.w;
}

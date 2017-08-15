precision highp float;
varying vec2 vUv;
uniform vec3 color;
uniform sampler2D mainColor;

const float exposure_adjustment = 2.0;

float A = 0.15;
float B = 0.50;
float C = 0.10;
float D = 0.20;
float E = 0.02;
float F = 0.30;
float W = 11.2;

vec3 tonemap_optimized(vec3 color)
{
    color *= exposure_adjustment;
    vec3 x = max(vec3(0.0), color - 0.004);
    return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
}

vec3 Uncharted2Tonemap(vec3 x)
{

   return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}

vec3 toneMap(vec3 col)
{
	vec3 sqrtc =sqrt(col);
	return(sqrtc -sqrtc *col)+col*(0.4672*col+vec3(0.5328));
}

void main(void) {
	vec4 col = texture2D(mainColor,vUv);

    float ExposureBias = 2.0;
   vec3 curr = Uncharted2Tonemap(ExposureBias*col.xyz);

   vec3 whiteScale = 1.0/Uncharted2Tonemap(vec3(W));
   vec3 rcolor = curr*whiteScale;
      
   vec3 retColor = pow(rcolor,vec3(1.0/2.2));
	gl_FragColor = vec4(col.xyz,0.0);
}


